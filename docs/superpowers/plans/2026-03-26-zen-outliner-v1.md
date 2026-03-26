# zen-outliner v1 Implementation Plan (final — mobx-bonsai + flat list)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working Workflowy clone — infinite-nesting outliner with keyboard navigation, dark mode only, localStorage persistence.

**Architecture:** Flat array of items with parentId references. mobx-bonsai for observable state, snapshots, and persistence. Computed indexes (childrenByParentId, itemsById) for O(1) lookups. Fractional indexing (fractional-indexing library) for ordering. React components wrapped with observer() from mobx-react-lite. Collapse and zoom are view state on the store, not on items.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, pnpm, mobx, mobx-bonsai, mobx-react-lite, fractional-indexing

---

## Data Model

```ts
// Persisted
interface OutlineItem {
  id: string;
  parentId: string | null;
  content: string;
  order: string; // fractional index
}

interface OutlineStore {
  items: OutlineItem[];
  collapsedIds: string[];
  zoomId: string | null;
}

// Computed (derived, not stored)
// childrenByParentId: Map<string | null, OutlineItem[]>
// itemsById: Map<string, OutlineItem>
```

## File Structure

```
src/
  main.tsx                  — Entry point, renders App
  App.tsx                   — Creates store, renders Breadcrumb + OutlineTree
  models/
    OutlineStore.ts         — nodeType with items, computed indexes, all actions
    OutlineStore.test.ts    — Tests for all store operations
  components/
    OutlineTree.tsx          — Recursive tree renderer (observer)
    OutlineNode.tsx          — Single node: bullet, text, keyboard (observer)
    Breadcrumb.tsx           — Zoom breadcrumb navigation (observer)
  index.css                 — Tailwind imports + custom dark theme
index.html                  — Vite entry HTML
```

---

## Completed Tasks

### Task 0: Scaffold ✅
Vite + React 19 + TypeScript + Tailwind v4 scaffolded and running.

---

### Task 1: Install dependencies and remove old files

**Files:**
- Delete: `src/store.ts`, `src/store.test.ts`, `src/types.ts`
- Modify: `package.json`

- [ ] **Step 1: Install dependencies**

```bash
pnpm add mobx mobx-bonsai mobx-react-lite fractional-indexing
```

- [ ] **Step 2: Remove old files**

```bash
rm -f src/store.ts src/store.test.ts src/types.ts
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: add mobx-bonsai + fractional-indexing, remove old store"
```

---

### Task 2: OutlineStore — model, computed indexes, actions, tests

**Files:**
- Create: `src/models/OutlineStore.ts`
- Create: `src/models/OutlineStore.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/models/OutlineStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { createStore, TStore } from "./OutlineStore";
import type { OutlineStore } from "./OutlineStore";

let store: OutlineStore;

beforeEach(() => {
  store = createStore();
});

describe("createStore", () => {
  it("initializes with one empty root item", () => {
    expect(store.items.length).toBe(1);
    expect(store.items[0].content).toBe("");
    expect(store.items[0].parentId).toBe(null);
    expect(typeof store.items[0].order).toBe("string");
  });
});

describe("computed indexes", () => {
  it("itemsById returns map of id to item", () => {
    const map = TStore.itemsById(store);
    expect(map.get(store.items[0].id)).toBe(store.items[0]);
  });

  it("childrenByParentId groups items by parentId sorted by order", () => {
    const firstId = store.items[0].id;
    TStore.addAfter(store, firstId);
    TStore.addAfter(store, firstId);
    const children = TStore.childrenByParentId(store);
    const roots = children.get(null) ?? [];
    expect(roots.length).toBe(3);
    // Verify sorted by order
    for (let i = 1; i < roots.length; i++) {
      expect(roots[i].order > roots[i - 1].order).toBe(true);
    }
  });
});

describe("addAfter", () => {
  it("adds a sibling after the target item", () => {
    const firstId = store.items[0].id;
    const newId = TStore.addAfter(store, firstId);
    expect(store.items.length).toBe(2);
    expect(typeof newId).toBe("string");
    const roots = TStore.childrenByParentId(store).get(null) ?? [];
    expect(roots[0].id).toBe(firstId);
    expect(roots[1].id).toBe(newId);
  });

  it("inserts between two items with correct order", () => {
    const firstId = store.items[0].id;
    const secondId = TStore.addAfter(store, firstId);
    const middleId = TStore.addAfter(store, firstId);
    const roots = TStore.childrenByParentId(store).get(null) ?? [];
    expect(roots.map((r) => r.id)).toEqual([firstId, middleId, secondId]);
  });
});

describe("removeItem", () => {
  it("removes an item", () => {
    const firstId = store.items[0].id;
    const secondId = TStore.addAfter(store, firstId);
    TStore.removeItem(store, secondId);
    expect(store.items.length).toBe(1);
  });

  it("removes descendants", () => {
    const firstId = store.items[0].id;
    TStore.addAfter(store, firstId);
    const secondId = (TStore.childrenByParentId(store).get(null) ?? [])[1].id;
    TStore.indentItem(store, secondId);
    TStore.removeItem(store, firstId);
    expect(store.items.length).toBe(0);
  });
});

describe("indentItem", () => {
  it("makes item a child of its previous sibling", () => {
    const firstId = store.items[0].id;
    const secondId = TStore.addAfter(store, firstId);
    TStore.indentItem(store, secondId);
    const item = TStore.itemsById(store).get(secondId)!;
    expect(item.parentId).toBe(firstId);
  });

  it("does nothing if item is first sibling", () => {
    const firstId = store.items[0].id;
    TStore.indentItem(store, firstId);
    expect(store.items[0].parentId).toBe(null);
  });
});

describe("outdentItem", () => {
  it("moves item to parent's level after parent", () => {
    const firstId = store.items[0].id;
    const secondId = TStore.addAfter(store, firstId);
    TStore.indentItem(store, secondId);
    TStore.outdentItem(store, secondId);
    const item = TStore.itemsById(store).get(secondId)!;
    expect(item.parentId).toBe(null);
    const roots = TStore.childrenByParentId(store).get(null) ?? [];
    expect(roots[1].id).toBe(secondId);
  });
});

describe("moveItemUp / moveItemDown", () => {
  it("reorders siblings", () => {
    const firstId = store.items[0].id;
    TStore.addAfter(store, firstId);
    TStore.addAfter(store, firstId);
    const roots = TStore.childrenByParentId(store).get(null) ?? [];
    const thirdId = roots[2].id;

    TStore.moveItemUp(store, thirdId);
    const newRoots = TStore.childrenByParentId(store).get(null) ?? [];
    expect(newRoots[1].id).toBe(thirdId);
  });
});

describe("toggleCollapse", () => {
  it("toggles item in collapsedIds", () => {
    const firstId = store.items[0].id;
    expect(store.collapsedIds.includes(firstId)).toBe(false);
    TStore.toggleCollapse(store, firstId);
    expect(store.collapsedIds.includes(firstId)).toBe(true);
    TStore.toggleCollapse(store, firstId);
    expect(store.collapsedIds.includes(firstId)).toBe(false);
  });
});

describe("zoom", () => {
  it("sets and clears zoomId", () => {
    const firstId = store.items[0].id;
    TStore.zoom(store, firstId);
    expect(store.zoomId).toBe(firstId);
    TStore.zoom(store, null);
    expect(store.zoomId).toBe(null);
  });
});

describe("setContent", () => {
  it("updates item content", () => {
    const firstId = store.items[0].id;
    TStore.setContent(store, firstId, "hello");
    expect(store.items[0].content).toBe("hello");
  });
});

describe("getBreadcrumbs", () => {
  it("returns Home when not zoomed", () => {
    const crumbs = TStore.getBreadcrumbs(store);
    expect(crumbs).toEqual([{ id: null, label: "Home" }]);
  });

  it("returns path when zoomed", () => {
    const firstId = store.items[0].id;
    TStore.setContent(store, firstId, "Projects");
    TStore.zoom(store, firstId);
    const crumbs = TStore.getBreadcrumbs(store);
    expect(crumbs.length).toBe(2);
    expect(crumbs[0]).toEqual({ id: null, label: "Home" });
    expect(crumbs[1]).toEqual({ id: firstId, label: "Projects" });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test
```

Expected: FAIL (module doesn't exist)

- [ ] **Step 3: Implement OutlineStore**

Create `src/models/OutlineStore.ts`:

```ts
import { node, nodeType } from "mobx-bonsai";
import { generateKeyBetween } from "fractional-indexing";

// --- Types ---

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

// --- ID generation ---

let counter = 0;
function genId(): string {
  return `${Date.now()}-${++counter}`;
}

// --- Node type ---

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

      // Remove from collapsedIds too
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

// --- Factory ---

const STORAGE_KEY = "zen-outliner-data";

export function createStore(loadFromStorage = false): OutlineStore {
  let data: OutlineStore;

  if (loadFromStorage) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        data = JSON.parse(raw);
        return node(data);
      }
    } catch {
      // fall through to default
    }
  }

  data = {
    items: [{
      id: genId(),
      parentId: null,
      content: "",
      order: generateKeyBetween(null, null),
    }],
    collapsedIds: [],
    zoomId: null,
  };

  return node(data);
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test
```

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/models/
git commit -m "feat: add OutlineStore with mobx-bonsai, fractional indexing, computed indexes"
```

---

### Task 3: OutlineNode component

**Files:**
- Create: `src/components/OutlineNode.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/OutlineNode.tsx`:

```tsx
import { useRef, useEffect, KeyboardEvent } from "react";
import { observer } from "mobx-react-lite";
import type { OutlineItem, OutlineStore } from "../models/OutlineStore";
import { TStore } from "../models/OutlineStore";

interface Props {
  item: OutlineItem;
  store: OutlineStore;
  focusId: string | null;
  onFocused: () => void;
  onRequestFocus: (id: string) => void;
}

const OutlineNode = observer(function OutlineNode({
  item,
  store,
  focusId,
  onFocused,
  onRequestFocus,
}: Props) {
  const inputRef = useRef<HTMLDivElement>(null);
  const children = TStore.getChildren(store, item.id);
  const hasChildren = children.length > 0;
  const isCollapsed = TStore.isCollapsed(store, item.id) && hasChildren;

  useEffect(() => {
    if (focusId === item.id && inputRef.current) {
      inputRef.current.focus();
      const range = document.createRange();
      const sel = window.getSelection();
      if (inputRef.current.childNodes.length > 0) {
        range.selectNodeContents(inputRef.current);
        range.collapse(false);
      }
      sel?.removeAllRanges();
      sel?.addRange(range);
      onFocused();
    }
  }, [focusId, item.id, onFocused]);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const newId = TStore.addAfter(store, item.id);
      if (newId) onRequestFocus(newId);
    } else if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      TStore.indentItem(store, item.id);
      onRequestFocus(item.id);
    } else if (e.key === "Tab" && e.shiftKey) {
      e.preventDefault();
      TStore.outdentItem(store, item.id);
      onRequestFocus(item.id);
    } else if (e.key === "Backspace" && item.content === "") {
      e.preventDefault();
      const siblings = TStore.getChildren(store, item.parentId);
      const idx = siblings.findIndex((s) => s.id === item.id);
      const focusTarget = idx > 0 ? siblings[idx - 1].id : item.parentId;
      TStore.removeItem(store, item.id);
      if (focusTarget) onRequestFocus(focusTarget);
    } else if (e.key === "ArrowUp" && e.ctrlKey) {
      e.preventDefault();
      TStore.moveItemUp(store, item.id);
      onRequestFocus(item.id);
    } else if (e.key === "ArrowDown" && e.ctrlKey) {
      e.preventDefault();
      TStore.moveItemDown(store, item.id);
      onRequestFocus(item.id);
    } else if (e.key === "ArrowUp" && !e.ctrlKey) {
      e.preventDefault();
      const all = document.querySelectorAll<HTMLDivElement>("[contenteditable]");
      const arr = Array.from(all);
      const idx = arr.indexOf(inputRef.current!);
      if (idx > 0) arr[idx - 1].focus();
    } else if (e.key === "ArrowDown" && !e.ctrlKey) {
      e.preventDefault();
      const all = document.querySelectorAll<HTMLDivElement>("[contenteditable]");
      const arr = Array.from(all);
      const idx = arr.indexOf(inputRef.current!);
      if (idx < arr.length - 1) arr[idx + 1].focus();
    }
  };

  const handleInput = () => {
    if (inputRef.current) {
      TStore.setContent(store, item.id, inputRef.current.textContent || "");
    }
  };

  const handleBulletClick = () => {
    if (hasChildren) TStore.zoom(store, item.id);
  };

  const handleTriangleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) TStore.toggleCollapse(store, item.id);
  };

  return (
    <div>
      <div className="group flex items-center py-1.5 relative">
        {hasChildren && (
          <button
            onClick={handleTriangleClick}
            className="absolute -left-5 w-5 h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text-muted)] text-[8px] cursor-pointer"
          >
            {isCollapsed ? "►" : "▼"}
          </button>
        )}

        <button
          onClick={handleBulletClick}
          className="w-[22px] h-[22px] flex items-center justify-center shrink-0 cursor-pointer relative z-10"
        >
          <div
            className={`rounded-full ${
              hasChildren
                ? `w-[7px] h-[7px] bg-[var(--bullet-color)] ${
                    isCollapsed
                      ? "ring-[1.5px] ring-[var(--bullet-color)] ring-offset-[3px] ring-offset-[var(--bg-primary)]"
                      : ""
                  }`
                : "w-[6px] h-[6px] bg-[var(--bullet-leaf)]"
            }`}
          />
        </button>

        <div
          ref={inputRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          data-placeholder="Start typing..."
          className="flex-1 ml-2.5 text-base leading-relaxed outline-none text-[var(--text-secondary)] empty:before:content-[attr(data-placeholder)] empty:before:text-[var(--text-muted)] empty:before:italic"
        >
          {item.content}
        </div>
      </div>

      {hasChildren && !isCollapsed && (
        <div className="ml-[11px] pl-[21px] relative before:content-[''] before:absolute before:left-[11px] before:top-0 before:bottom-3 before:w-px before:bg-[var(--line-color)]">
          {children.map((child) => (
            <OutlineNode
              key={child.id}
              item={child}
              store={store}
              focusId={focusId}
              onFocused={onFocused}
              onRequestFocus={onRequestFocus}
            />
          ))}
        </div>
      )}
    </div>
  );
});

export default OutlineNode;
```

- [ ] **Step 2: Verify it compiles**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/OutlineNode.tsx
git commit -m "feat: add OutlineNode component with observer + keyboard handling"
```

---

### Task 4: OutlineTree + Breadcrumb components

**Files:**
- Create: `src/components/OutlineTree.tsx`
- Create: `src/components/Breadcrumb.tsx`

- [ ] **Step 1: Create OutlineTree**

Create `src/components/OutlineTree.tsx`:

```tsx
import { observer } from "mobx-react-lite";
import type { OutlineStore } from "../models/OutlineStore";
import { TStore } from "../models/OutlineStore";
import OutlineNode from "./OutlineNode";

interface Props {
  store: OutlineStore;
  focusId: string | null;
  onFocused: () => void;
  onRequestFocus: (id: string) => void;
}

const OutlineTree = observer(function OutlineTree({
  store,
  focusId,
  onFocused,
  onRequestFocus,
}: Props) {
  const parentId = store.zoomId;
  const items = TStore.getChildren(store, parentId);

  if (items.length === 0) {
    return (
      <p className="text-[var(--text-muted)] italic text-base">
        No items yet.
      </p>
    );
  }

  return (
    <div>
      {items.map((item) => (
        <OutlineNode
          key={item.id}
          item={item}
          store={store}
          focusId={focusId}
          onFocused={onFocused}
          onRequestFocus={onRequestFocus}
        />
      ))}
    </div>
  );
});

export default OutlineTree;
```

- [ ] **Step 2: Create Breadcrumb**

Create `src/components/Breadcrumb.tsx`:

```tsx
import { observer } from "mobx-react-lite";
import type { OutlineStore } from "../models/OutlineStore";
import { TStore } from "../models/OutlineStore";

interface Props {
  store: OutlineStore;
}

const Breadcrumb = observer(function Breadcrumb({ store }: Props) {
  const items = TStore.getBreadcrumbs(store);

  return (
    <div className="flex items-center gap-2 px-8 py-3.5 border-b border-[var(--border-color)]">
      {items.map((item, i) => (
        <span key={item.id ?? "home"} className="flex items-center gap-2">
          {i > 0 && (
            <span className="text-[var(--line-color)] text-sm">›</span>
          )}
          {i < items.length - 1 ? (
            <button
              onClick={() => TStore.zoom(store, item.id)}
              className="text-[var(--text-muted)] text-sm hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
            >
              {item.label}
            </button>
          ) : (
            <span className="text-[var(--text-dim)] text-sm">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </div>
  );
});

export default Breadcrumb;
```

- [ ] **Step 3: Commit**

```bash
git add src/components/OutlineTree.tsx src/components/Breadcrumb.tsx
git commit -m "feat: add OutlineTree and Breadcrumb components"
```

---

### Task 5: Wire everything in App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Replace App.tsx**

Replace `src/App.tsx`:

```tsx
import { useState, useCallback } from "react";
import { observer } from "mobx-react-lite";
import { onSnapshot } from "mobx-bonsai";
import { createStore, TStore } from "./models/OutlineStore";
import Breadcrumb from "./components/Breadcrumb";
import OutlineTree from "./components/OutlineTree";

const STORAGE_KEY = "zen-outliner-data";

const store = createStore(true);

onSnapshot(store, (snapshot) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
});

const App = observer(function App() {
  const [focusId, setFocusId] = useState<string | null>(null);
  const clearFocus = useCallback(() => setFocusId(null), []);
  const zoomTitle = TStore.getZoomTitle(store);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg-primary)" }}>
      <Breadcrumb store={store} />
      <div className="max-w-[700px] mx-auto px-8 pl-[52px] pt-12 pb-12">
        <h1 className="text-[26px] text-[var(--text-primary)] font-medium mb-10">
          {zoomTitle}
        </h1>
        <OutlineTree
          store={store}
          focusId={focusId}
          onFocused={clearFocus}
          onRequestFocus={setFocusId}
        />
      </div>
    </div>
  );
});

export default App;
```

- [ ] **Step 2: Verify it runs**

```bash
pnpm dev
```

Expected: Working outliner at http://localhost:5173

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire up outliner with mobx-bonsai store and persistence"
```

---

### Task 6: Smoke test

- [ ] **Step 1: Run all tests**

```bash
pnpm test
```

Expected: All store tests pass.

- [ ] **Step 2: Manual smoke test**

1. Empty state shows placeholder
2. Type text → content saves
3. Enter → new node below
4. Tab → indent
5. Shift+Tab → outdent
6. Backspace on empty → delete
7. Ctrl+↑/↓ → reorder
8. ↑/↓ → move focus
9. Click bullet → zoom in
10. Breadcrumb → zoom out
11. Collapsed ring on collapsed parent nodes
12. Hover triangle on parent nodes
13. Refresh → data persists

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: zen-outliner v1 complete"
```
