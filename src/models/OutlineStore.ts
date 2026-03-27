import { node, nodeType } from "mobx-bonsai";
import { generateKeyBetween } from "fractional-indexing";
import type { OutlineItem } from "./types";

export type { OutlineItem } from "./types";

export interface OutlineStore {
  items: OutlineItem[];
  collapsedIds: string[];
}

let counter = 0;
function genId(): string {
  return `${Date.now()}-${++counter}`;
}

export const TOutlineStore = nodeType<OutlineStore>()
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
        let list = map.get(key);
        if (!list) {
          list = [];
          map.set(key, list);
        }
        list.push(item);
      }
      for (const list of map.values()) {
        list.sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0));
      }
      return map;
    },

    getChildren(parentId: string | null): OutlineItem[] {
      return TOutlineStore.childrenByParentId(this).get(parentId) ?? [];
    },

    getSiblings(itemId: string): OutlineItem[] {
      const item = TOutlineStore.itemsById(this).get(itemId);
      if (!item) return [];
      return TOutlineStore.getChildren(this, item.parentId);
    },

    isCollapsed(itemId: string): boolean {
      return this.collapsedIds.includes(itemId);
    },

    hasChildren(itemId: string): boolean {
      return TOutlineStore.getChildren(this, itemId).length > 0;
    },

    canDelete(itemId: string): boolean {
      return this.items.length > 1;
    },

    getVisibleNodes(): OutlineItem[] {
      const result: OutlineItem[] = [];
      const walk = (parentId: string | null) => {
        const children = TOutlineStore.getChildren(this, parentId);
        for (const child of children) {
          result.push(child);
          if (!TOutlineStore.isCollapsed(this, child.id)) {
            walk(child.id);
          }
        }
      };
      walk(null);
      return result;
    },
  })
  .actions({
    setContent(itemId: string, content: string) {
      const item = TOutlineStore.itemsById(this).get(itemId);
      if (item) item.content = content;
    },

    addAfter(afterId: string): string {
      const target = TOutlineStore.itemsById(this).get(afterId);
      if (!target) return "";

      const siblings = TOutlineStore.getChildren(this, target.parentId);
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

    removeItem(itemId: string): string | null {
      if (!TOutlineStore.canDelete(this, itemId)) return null;

      const item = TOutlineStore.itemsById(this).get(itemId);
      if (!item) return null;

      const siblings = TOutlineStore.getChildren(this, item.parentId);
      const idx = siblings.findIndex((s) => s.id === itemId);
      const focusTarget = idx > 0 ? siblings[idx - 1].id : item.parentId;

      const idsToRemove = new Set<string>();
      const collectIds = (id: string) => {
        idsToRemove.add(id);
        const children = TOutlineStore.getChildren(this, id);
        for (const child of children) {
          collectIds(child.id);
        }
      };
      collectIds(itemId);

      for (let i = this.items.length - 1; i >= 0; i--) {
        if (idsToRemove.has(this.items[i].id)) {
          this.items.splice(i, 1);
        }
      }

      for (let i = this.collapsedIds.length - 1; i >= 0; i--) {
        if (idsToRemove.has(this.collapsedIds[i])) {
          this.collapsedIds.splice(i, 1);
        }
      }

      return focusTarget;
    },

    indentItem(itemId: string) {
      const item = TOutlineStore.itemsById(this).get(itemId);
      if (!item) return;

      const siblings = TOutlineStore.getChildren(this, item.parentId);
      const idx = siblings.findIndex((s) => s.id === itemId);
      if (idx === 0) return;

      const newParentId = siblings[idx - 1].id;
      const newSiblings = TOutlineStore.getChildren(this, newParentId);
      const lastChild = newSiblings[newSiblings.length - 1];

      item.parentId = newParentId;
      item.order = generateKeyBetween(lastChild?.order ?? null, null);
    },

    outdentItem(itemId: string) {
      const item = TOutlineStore.itemsById(this).get(itemId);
      if (!item || item.parentId === null) return;

      const parent = TOutlineStore.itemsById(this).get(item.parentId);
      if (!parent) return;

      const parentSiblings = TOutlineStore.getChildren(this, parent.parentId);
      const parentIdx = parentSiblings.findIndex((s) => s.id === parent.id);
      const nextAfterParent = parentSiblings[parentIdx + 1];

      item.parentId = parent.parentId;
      item.order = generateKeyBetween(
        parent.order,
        nextAfterParent?.order ?? null
      );
    },

    moveItemUp(itemId: string) {
      const item = TOutlineStore.itemsById(this).get(itemId);
      if (!item) return;

      const siblings = TOutlineStore.getChildren(this, item.parentId);
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
      const item = TOutlineStore.itemsById(this).get(itemId);
      if (!item) return;

      const siblings = TOutlineStore.getChildren(this, item.parentId);
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

    splitNode(itemId: string, cursorPos: number): string {
      const item = TOutlineStore.itemsById(this).get(itemId);
      if (!item) return "";

      const beforeText = item.content.slice(0, cursorPos);
      const afterText = item.content.slice(cursorPos);

      item.content = beforeText;

      const siblings = TOutlineStore.getChildren(this, item.parentId);
      const idx = siblings.findIndex((s) => s.id === itemId);
      const nextSibling = siblings[idx + 1];
      const newOrder = generateKeyBetween(
        item.order,
        nextSibling?.order ?? null
      );

      const newItem: OutlineItem = {
        id: genId(),
        parentId: item.parentId,
        content: afterText,
        order: newOrder,
      };
      this.items.push(newItem);
      return newItem.id;
    },

    mergeWithPrevious(itemId: string): { targetId: string; cursorPos: number } | null {
      const item = TOutlineStore.itemsById(this).get(itemId);
      if (!item) return null;

      const siblings = TOutlineStore.getChildren(this, item.parentId);
      const idx = siblings.findIndex((s) => s.id === itemId);
      if (idx === 0) return null;

      const prev = siblings[idx - 1];
      const cursorPos = prev.content.length;
      prev.content += item.content;

      const itemIdx = this.items.findIndex((i) => i.id === itemId);
      if (itemIdx >= 0) this.items.splice(itemIdx, 1);

      return { targetId: prev.id, cursorPos };
    },
  });

export function createStore(): OutlineStore {
  return node<OutlineStore>({
    items: [
      {
        id: genId(),
        parentId: null,
        content: "",
        order: generateKeyBetween(null, null),
      },
    ],
    collapsedIds: [],
  });
}
