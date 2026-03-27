import { node, nodeType } from "mobx-bonsai";
import { generateKeyBetween } from "fractional-indexing";

export interface OutlineItem {
  id: string;
  parentId: string | null;
  content: string;
  order: string;
}

export interface OutlineStore {
  items: OutlineItem[];
  collapsedIds: string[];
  zoomId: string | null;
}

let counter = 0;
function genId(): string {
  return `${Date.now()}-${++counter}`;
}

export const TStore = nodeType<OutlineStore>()
  .getters({
    itemsById(): Map<string, OutlineItem> {
      const map = new Map<string, OutlineItem>();
      for (const item of this.items) {
        map.set(item.id, item);
      }
      return map;
    },

    childrenByParentId(): Map<string | null, OutlineItem[]> {
      const map = new Map<string | null, OutlineItem[]>();
      for (const item of this.items) {
        const key = item.parentId;
        let group = map.get(key);
        if (!group) {
          group = [];
          map.set(key, group);
        }
        group.push(item);
      }
      for (const group of map.values()) {
        group.sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0));
      }
      return map;
    },

    getChildren(parentId: string | null): OutlineItem[] {
      return this.items
        .filter((i) => i.parentId === parentId)
        .sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0));
    },

    getBreadcrumbs(): { id: string | null; label: string }[] {
      const crumbs: { id: string | null; label: string }[] = [
        { id: null, label: "Home" },
      ];
      if (!this.zoomId) return crumbs;

      const path: OutlineItem[] = [];
      let current = this.items.find((i) => i.id === this.zoomId);
      while (current) {
        path.unshift(current);
        current = current.parentId
          ? this.items.find((i) => i.id === current!.parentId)
          : undefined;
      }
      for (const item of path) {
        crumbs.push({ id: item.id, label: item.content || "(empty)" });
      }
      return crumbs;
    },

    getZoomTitle(): string {
      if (!this.zoomId) return "Home";
      const item = this.items.find((i) => i.id === this.zoomId);
      return item?.content || "(empty)";
    },

    isCollapsed(itemId: string): boolean {
      return this.collapsedIds.includes(itemId);
    },
  })
  .actions({
    setContent(itemId: string, content: string) {
      const item = this.items.find((i) => i.id === itemId);
      if (item) item.content = content;
    },

    addAfter(afterId: string): string {
      const target = this.items.find((i) => i.id === afterId);
      if (!target) return "";

      const siblings = this.items
        .filter((i) => i.parentId === target.parentId)
        .sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0));
      const idx = siblings.findIndex((s) => s.id === afterId);
      const nextSibling = siblings[idx + 1];

      const newOrder = generateKeyBetween(
        target.order,
        nextSibling?.order ?? null
      );

      const newItem: OutlineItem = {
        id: genId(),
        parentId: target.parentId,
        content: "",
        order: newOrder,
      };
      this.items.push(newItem);
      return newItem.id;
    },

    removeItem(itemId: string) {
      const idsToRemove = new Set<string>();
      const collectIds = (id: string) => {
        idsToRemove.add(id);
        this.items
          .filter((i) => i.parentId === id)
          .forEach((i) => collectIds(i.id));
      };
      collectIds(itemId);

      for (let i = this.items.length - 1; i >= 0; i--) {
        if (idsToRemove.has(this.items[i].id)) {
          this.items.splice(i, 1);
        }
      }

      for (const id of idsToRemove) {
        const idx = this.collapsedIds.indexOf(id);
        if (idx >= 0) this.collapsedIds.splice(idx, 1);
      }
    },

    indentItem(itemId: string) {
      const item = this.items.find((i) => i.id === itemId);
      if (!item) return;

      const siblings = this.items
        .filter((i) => i.parentId === item.parentId)
        .sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0));
      const idx = siblings.findIndex((s) => s.id === itemId);
      if (idx === 0) return;

      const newParentId = siblings[idx - 1].id;
      const newSiblings = this.items
        .filter((i) => i.parentId === newParentId)
        .sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0));
      const lastChild = newSiblings[newSiblings.length - 1];

      item.parentId = newParentId;
      item.order = generateKeyBetween(lastChild?.order ?? null, null);
    },

    outdentItem(itemId: string) {
      const item = this.items.find((i) => i.id === itemId);
      if (!item || item.parentId === null) return;

      const parent = this.items.find((i) => i.id === item.parentId);
      if (!parent) return;

      const parentSiblings = this.items
        .filter((i) => i.parentId === parent.parentId)
        .sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0));
      const parentIdx = parentSiblings.findIndex((s) => s.id === parent.id);
      const nextUncle = parentSiblings[parentIdx + 1];

      item.parentId = parent.parentId;
      item.order = generateKeyBetween(
        parent.order,
        nextUncle?.order ?? null
      );
    },

    moveItemUp(itemId: string) {
      const item = this.items.find((i) => i.id === itemId);
      if (!item) return;

      const siblings = this.items
        .filter((i) => i.parentId === item.parentId)
        .sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0));
      const idx = siblings.findIndex((s) => s.id === itemId);
      if (idx === 0) return;

      const prev = siblings[idx - 1];
      const beforePrev = siblings[idx - 2];

      item.order = generateKeyBetween(
        beforePrev?.order ?? null,
        prev.order
      );
    },

    moveItemDown(itemId: string) {
      const item = this.items.find((i) => i.id === itemId);
      if (!item) return;

      const siblings = this.items
        .filter((i) => i.parentId === item.parentId)
        .sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0));
      const idx = siblings.findIndex((s) => s.id === itemId);
      if (idx === siblings.length - 1) return;

      const next = siblings[idx + 1];
      const afterNext = siblings[idx + 2];

      item.order = generateKeyBetween(
        next.order,
        afterNext?.order ?? null
      );
    },

    toggleCollapse(itemId: string) {
      const idx = this.collapsedIds.indexOf(itemId);
      if (idx >= 0) {
        this.collapsedIds.splice(idx, 1);
      } else {
        this.collapsedIds.push(itemId);
      }
    },

    zoom(itemId: string | null) {
      this.zoomId = itemId;
    },
  });

const STORAGE_KEY = "zen-outliner-data";

export function createStore(loadFromStorage = false): OutlineStore {
  if (loadFromStorage) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return node(JSON.parse(raw));
      }
    } catch {
      // fall through
    }
  }

  return node<OutlineStore>({
    items: [{
      id: genId(),
      parentId: null,
      content: "",
      order: generateKeyBetween(null, null),
    }],
    collapsedIds: [],
    zoomId: null,
  });
}
