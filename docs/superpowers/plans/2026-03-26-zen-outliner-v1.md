# zen-outliner v1 Implementation Plan (v3 — final model)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working Workflowy clone — infinite-nesting outliner with keyboard navigation, dark mode only, localStorage persistence.

**Architecture:** Flat array of OutlineItems in a mobx-bonsai store. Computed indexes for O(1) lookups. Fractional indexing for ordering. observer() components from mobx-react-lite. onSnapshot for auto-save to localStorage.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, pnpm, mobx, mobx-bonsai, mobx-react-lite, fractional-indexing

---

## File Structure

```
src/
  main.tsx                  — Entry point, renders App
  App.tsx                   — Top-level: creates store, renders Breadcrumb + OutlineTree
  models/
    OutlineStore.ts         — Store: nodeType with items, collapsedIds, zoomId, all actions, computed indexes
    OutlineStore.test.ts    — Tests for all store operations
  components/
    OutlineTree.tsx          — Recursive tree renderer (observer)
    OutlineNode.tsx          — Single node: bullet, text input, hover triangle (observer)
    Breadcrumb.tsx           — Zoom breadcrumb navigation (observer)
  index.css                 — Tailwind imports + custom dark theme
index.html                  — Vite entry HTML
```

---

## Completed

### Task 0: Scaffold ✅
Vite + React 19 + TypeScript + Tailwind v4 done.

---

### Task 1: Install dependencies + clean up old code

**Files:**
- Modify: `package.json`
- Delete: `src/store.ts`, `src/store.test.ts`, `src/types.ts`

- [ ] **Step 1: Install dependencies**

```bash
pnpm add mobx mobx-bonsai mobx-react-lite fractional-indexing
```

- [ ] **Step 2: Install fractional-indexing types if available, otherwise create declaration**

```bash
pnpm add -D @types/fractional-indexing 2>/dev/null || true
```

If no types exist, create `src/fractional-indexing.d.ts`:

```ts
declare module "fractional-indexing" {
  export function generateKeyBetween(
    a: string | null,
    b: string | null
  ): string;
  export function generateNKeysBetween(
    a: string | null,
    b: string | null,
    n: number
  ): string[];
}
```

- [ ] **Step 3: Remove old files**

```bash
rm -f src/store.ts src/store.test.ts src/types.ts
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "chore: add mobx-bonsai, fractional-indexing; remove old store"
```

---

### Task 2: OutlineStore — model, actions, computed indexes

**Files:**
- Create: `src/models/OutlineStore.ts`
- Create: `src/models/OutlineStore.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/models/OutlineStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { createStore } from "./OutlineStore";
import { TOutlineStore } from "./OutlineStore";
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
  it("itemsById returns map of all items", () => {
    const map = TOutlineStore.itemsById(store);
    expect(map.size).toBe(1);
    expect(map.get(store.items[0].id)).toBe(store.items[0]);
  });

  it("childrenByParentId groups items by parentId sorted by order", () => {
    const firstId = store.items[0].id;
    TOutlineStore.addAfter(store, firstId);
    TOutlineStore.addAfter(store, firstId);
    const map = TOutlineStore.childrenByParentId(store);
    const roots = map.get(null)!;
    expect(roots.length).toBe(3);
    // verify sorted
    for (let i = 1; i < roots.length; i++) {
      expect(roots[i].order > roots[i - 1].order).toBe(true);
    }
  });
});

describe("addAfter", () => {
  it("adds a sibling after the target item", () => {
    const firstId = store.items[0].id;
    const newId = TOutlineStore.addAfter(store, firstId);
    expect(store.items.length).toBe(2);
    expect(newId).toBeTruthy();
    const map = TOutlineStore.childrenByParentId(store);
    const roots = map.get(null)!;
    expect(roots[0].id).toBe(firstId);
    expect(roots[1].id).toBe(newId);
  });

  it("generates order between target and next sibling", () => {
    const firstId = store.items[0].id;
    const secondId = TOutlineStore.addAfter(store, firstId);
    const thirdId = TOutlineStore.addAfter(store, firstId);
    // third should be between first and second
    const map = TOutlineStore.childrenByParentId(store);
    const roots = map.get(null)!;
    expect(roots[0].id).toBe(firstId);
    expect(roots[1].id).toBe(thirdId);
    expect(roots[2].id).toBe(secondId);
  });
});

describe("removeItem", () => {
  it("removes an item and its descendants", () => {
    const firstId = store.items[0].id;
    const secondId = TOutlineStore.addAfter(store, firstId);
    TOutlineStore.indentItem(store, secondId);
    TOutlineStore.removeItem(store, firstId);
    expect(store.items.length).toBe(0);
  });

  it("returns previous sibling id for focus", () => {
    const firstId = store.items[0].id;
    const secondId = TOutlineStore.addAfter(store, firstId);
    const focusId = TOutlineStore.removeItem(store, secondId);
    expect(focusId).toBe(firstId);
  });
});

describe("indentItem", () => {
  it("makes item a child of its previous sibling", () => {
    const firstId = store.items[0].id;
    const secondId = TOutlineStore.addAfter(store, firstId);
    TOutlineStore.indentItem(store, secondId);
    const item = TOutlineStore.itemsById(store).get(secondId)!;
    expect(item.parentId).toBe(firstId);
  });

  it("does nothing if item is first sibling", () => {
    const firstId = store.items[0].id;
    TOutlineStore.indentItem(store, firstId);
    expect(store.items[0].parentId).toBe(null);
  });
});

describe("outdentItem", () => {
  it("moves item to parent's level after parent", () => {
    const firstId = store.items[0].id;
    const secondId = TOutlineStore.addAfter(store, firstId);
    TOutlineStore.indentItem(store, secondId);
    TOutlineStore.outdentItem(store, secondId);
    const item = TOutlineStore.itemsById(store).get(secondId)!;
    expect(item.parentId).toBe(null);
  });

  it("does nothing if item is at root", () => {
    const firstId = store.items[0].id;
    TOutlineStore.outdentItem(store, firstId);
    expect(store.items[0].parentId).toBe(null);
  });
});

describe("moveItemUp / moveItemDown", () => {
  it("moveItemUp swaps with previous sibling", () => {
    const firstId = store.items[0].id;
    const secondId = TOutlineStore.addAfter(store, firstId);
    TOutlineStore.moveItemUp(store, secondId);
    const roots = TOutlineStore.childrenByParentId(store).get(null)!;
    expect(roots[0].id).toBe(secondId);
    expect(roots[1].id).toBe(firstId);
  });

  it("moveItemDown swaps with next sibling", () => {
    const firstId = store.items[0].id;
    const secondId = TOutlineStore.addAfter(store, firstId);
    TOutlineStore.moveItemDown(store, firstId);
    const roots = TOutlineStore.childrenByParentId(store).get(null)!;
    expect(roots[0].id).toBe(secondId);
    expect(roots[1].id).toBe(firstId);
  });
});

describe("toggleCollapse", () => {
  it("adds and removes from collapsedIds", () => {
    const firstId = store.items[0].id;
    expect(store.collapsedIds.length).toBe(0);
    TOutlineStore.toggleCollapse(store, firstId);
    expect(store.collapsedIds).toContain(firstId);
    TOutlineStore.toggleCollapse(store, firstId);
    expect(store.collapsedIds).not.toContain(firstId);
  });
});

describe("isCollapsed", () => {
  it("returns true if item is in collapsedIds", () => {
    const firstId = store.items[0].id;
    expect(TOutlineStore.isCollapsed(store, firstId)).toBe(false);
    TOutlineStore.toggleCollapse(store, firstId);
    expect(TOutlineStore.isCollapsed(store, firstId)).toBe(true);
  });
});

describe("zoom", () => {
  it("sets and clears zoomId", () => {
    const firstId = store.items[0].id;
    TOutlineStore.zoom(store, firstId);
    expect(store.zoomId).toBe(firstId);
    TOutlineStore.zoom(store, null);
    expect(store.zoomId).toBe(null);
  });
});

describe("setContent", () => {
  it("updates item content", () => {
    const firstId = store.items[0].id;
    TOutlineStore.setContent(store, firstId, "hello");
    expect(store.items[0].content).toBe("hello");
  });
});

describe("getBreadcrumbs", () => {
  it("returns Home when not zoomed", () => {
    const crumbs = TOutlineStore.getBreadcrumbs(store);
    expect(crumbs).toEqual([{ id: null, label: "Home" }]);
  });

  it("returns path when zoomed", () => {
    const firstId = store.items[0].id;
    TOutlineStore.setContent(store, firstId, "Projects");
    TOutlineStore.zoom(store, firstId);
    const crumbs = TOutlineStore.getBreadcrumbs(store);
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

Expected: All tests FAIL

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
      return this.childrenByParentId.get(parentId) ?? [];
    },

    getSiblings(itemId: string): OutlineItem[] {
      const item = this.itemsById.get(itemId);
      if (!item) return [];
      return this.childrenByParentId.get(item.parentId) ?? [];
    },

    isCollapsed(itemId: string): boolean {
      return this.collapsedIds.includes(itemId);
    },

    getBreadcrumbs(): { id: string | null; label: string }[] {
      const crumbs: { id: string | null; label: string }[] = [
        { id: null, label: "Home" },
      ];
      if (!this.zoomId) return crumbs;

      const path: OutlineItem[] = [];
      let current = this.itemsById.get(this.zoomId);
      while (current) {
        path.unshift(current);
        current = current.parentId
          ? this.itemsById.get(current.parentId)
          : undefined;
      }
      for (const item of path) {
        crumbs.push({ id: item.id, label: item.content || "(empty)" });
      }
      return crumbs;
    },

    getZoomTitle(): string {
      if (!this.zoomId) return "Home";
      const item = this.itemsById.get(this.zoomId);
      return item?.content || "(empty)";
    },
  })
  .actions({
    setContent(itemId: string, content: string) {
      const item = this.itemsById.get(itemId);
      if (item) item.content = content;
    },

    addAfter(afterId: string): string {
      const target = this.itemsById.get(afterId);
      if (!target) return "";

      const siblings = this.getChildren(target.parentId);
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
      const item = this.itemsById.get(itemId);
      if (!item) return null;

      // Determine focus target before removal
      const siblings = this.getChildren(item.parentId);
      const idx = siblings.findIndex((s) => s.id === itemId);
      const focusTarget = idx > 0 ? siblings[idx - 1].id : item.parentId;

      // Collect all descendant IDs
      const idsToRemove = new Set<string>();
      const collectIds = (id: string) => {
        idsToRemove.add(id);
        const children = this.getChildren(id);
        for (const child of children) {
          collectIds(child.id);
        }
      };
      collectIds(itemId);

      // Remove from end to avoid index shifting
      for (let i = this.items.length - 1; i >= 0; i--) {
        if (idsToRemove.has(this.items[i].id)) {
          this.items.splice(i, 1);
        }
      }

      // Clean up collapsedIds
      for (let i = this.collapsedIds.length - 1; i >= 0; i--) {
        if (idsToRemove.has(this.collapsedIds[i])) {
          this.collapsedIds.splice(i, 1);
        }
      }

      return focusTarget;
    },

    indentItem(itemId: string) {
      const item = this.itemsById.get(itemId);
      if (!item) return;

      const siblings = this.getChildren(item.parentId);
      const idx = siblings.findIndex((s) => s.id === itemId);
      if (idx === 0) return;

      const newParentId = siblings[idx - 1].id;
      const newSiblings = this.getChildren(newParentId);
      const lastChild = newSiblings[newSiblings.length - 1];

      item.parentId = newParentId;
      item.order = generateKeyBetween(lastChild?.order ?? null, null);
    },

    outdentItem(itemId: string) {
      const item = this.itemsById.get(itemId);
      if (!item || item.parentId === null) return;

      const parent = this.itemsById.get(item.parentId);
      if (!parent) return;

      const parentSiblings = this.getChildren(parent.parentId);
      const parentIdx = parentSiblings.findIndex((s) => s.id === parent.id);
      const nextAfterParent = parentSiblings[parentIdx + 1];

      item.parentId = parent.parentId;
      item.order = generateKeyBetween(
        parent.order,
        nextAfterParent?.order ?? null
      );
    },

    moveItemUp(itemId: string) {
      const item = this.itemsById.get(itemId);
      if (!item) return;

      const siblings = this.getChildren(item.parentId);
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
      const item = this.itemsById.get(itemId);
      if (!item) return;

      const siblings = this.getChildren(item.parentId);
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
    zoomId: null,
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test
```

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/models/ && git commit -m "feat: add OutlineStore with mobx-bonsai + fractional indexing"
```

---

### Task 3: OutlineNode component (observer)

**Files:**
- Create: `src/components/OutlineNode.tsx`

- [ ] **Step 1: Create the node component**

Create `src/components/OutlineNode.tsx`:

```tsx
import { useRef, useEffect, KeyboardEvent } from "react";
import { observer } from "mobx-react-lite";
import type { OutlineItem, OutlineStore } from "../models/OutlineStore";
import { TOutlineStore } from "../models/OutlineStore";

interface OutlineNodeProps {
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
}: OutlineNodeProps) {
  const inputRef = useRef<HTMLDivElement>(null);
  const children = TOutlineStore.getChildren(store, item.id);
  const hasChildren = children.length > 0;
  const isCollapsed = TOutlineStore.isCollapsed(store, item.id);

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
      const newId = TOutlineStore.addAfter(store, item.id);
      if (newId) onRequestFocus(newId);
    } else if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      TOutlineStore.indentItem(store, item.id);
      onRequestFocus(item.id);
    } else if (e.key === "Tab" && e.shiftKey) {
      e.preventDefault();
      TOutlineStore.outdentItem(store, item.id);
      onRequestFocus(item.id);
    } else if (e.key === "Backspace" && item.content === "") {
      e.preventDefault();
      const focusTarget = TOutlineStore.removeItem(store, item.id);
      if (focusTarget) onRequestFocus(focusTarget);
    } else if (e.key === "ArrowUp" && e.ctrlKey) {
      e.preventDefault();
      TOutlineStore.moveItemUp(store, item.id);
      onRequestFocus(item.id);
    } else if (e.key === "ArrowDown" && e.ctrlKey) {
      e.preventDefault();
      TOutlineStore.moveItemDown(store, item.id);
      onRequestFocus(item.id);
    } else if (e.key === "ArrowUp" && !e.ctrlKey) {
      e.preventDefault();
      const all = document.querySelectorAll<HTMLDivElement>("[contenteditable]");
      const idx = Array.from(all).indexOf(inputRef.current!);
      if (idx > 0) (all[idx - 1] as HTMLDivElement).focus();
    } else if (e.key === "ArrowDown" && !e.ctrlKey) {
      e.preventDefault();
      const all = document.querySelectorAll<HTMLDivElement>("[contenteditable]");
      const idx = Array.from(all).indexOf(inputRef.current!);
      if (idx < all.length - 1) (all[idx + 1] as HTMLDivElement).focus();
    }
  };

  const handleInput = () => {
    if (inputRef.current) {
      TOutlineStore.setContent(store, item.id, inputRef.current.textContent || "");
    }
  };

  const handleBulletClick = () => {
    if (hasChildren) TOutlineStore.zoom(store, item.id);
  };

  const handleTriangleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) TOutlineStore.toggleCollapse(store, item.id);
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
git add src/components/OutlineNode.tsx && git commit -m "feat: add OutlineNode component with observer + keyboard handling"
```

---

### Task 4: OutlineTree + Breadcrumb + App wiring

**Files:**
- Create: `src/components/OutlineTree.tsx`
- Create: `src/components/Breadcrumb.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create OutlineTree**

Create `src/components/OutlineTree.tsx`:

```tsx
import { observer } from "mobx-react-lite";
import type { OutlineStore } from "../models/OutlineStore";
import { TOutlineStore } from "../models/OutlineStore";
import OutlineNode from "./OutlineNode";

interface OutlineTreeProps {
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
}: OutlineTreeProps) {
  const parentId = store.zoomId;
  const items = TOutlineStore.getChildren(store, parentId);

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
import { TOutlineStore } from "../models/OutlineStore";

interface BreadcrumbProps {
  store: OutlineStore;
}

const Breadcrumb = observer(function Breadcrumb({ store }: BreadcrumbProps) {
  const items = TOutlineStore.getBreadcrumbs(store);

  return (
    <div className="flex items-center gap-2 px-8 py-3.5 border-b border-[var(--border-color)]">
      {items.map((item, i) => (
        <span key={item.id ?? "home"} className="flex items-center gap-2">
          {i > 0 && (
            <span className="text-[var(--line-color)] text-sm">›</span>
          )}
          {i < items.length - 1 ? (
            <button
              onClick={() => TOutlineStore.zoom(store, item.id)}
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

- [ ] **Step 3: Wire App.tsx**

Replace `src/App.tsx`:

```tsx
import { useState, useCallback } from "react";
import { observer } from "mobx-react-lite";
import { getSnapshot, onSnapshot } from "mobx-bonsai";
import { createStore, TOutlineStore } from "./models/OutlineStore";
import type { OutlineStore } from "./models/OutlineStore";
import Breadcrumb from "./components/Breadcrumb";
import OutlineTree from "./components/OutlineTree";

const STORAGE_KEY = "zen-outliner-data";

function loadStore(): OutlineStore {
  // TODO: load from localStorage when persistence is wired
  return createStore();
}

const store = loadStore();

// Auto-save to localStorage
onSnapshot(store, (snapshot) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
});

const App = observer(function App() {
  const [focusId, setFocusId] = useState<string | null>(null);
  const clearFocus = useCallback(() => setFocusId(null), []);
  const zoomTitle = TOutlineStore.getZoomTitle(store);

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

- [ ] **Step 4: Run the app**

```bash
pnpm dev
```

Expected: Dark page, one empty node, keyboard shortcuts work.

- [ ] **Step 5: Run tests**

```bash
pnpm test
```

Expected: All store tests pass.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: wire up full outliner with mobx-bonsai store"
```

---

### Task 5: Smoke test and verify

- [ ] **Step 1: Manual smoke test**

Open http://localhost:5173 and verify:
1. Empty state shows placeholder
2. Type text → content saves
3. Enter → new node below
4. Tab → indents under previous sibling
5. Shift+Tab → outdents
6. Backspace on empty → deletes node
7. Ctrl+↑/↓ → reorders
8. ↑/↓ → moves focus
9. Click bullet → zooms into node
10. Breadcrumb → zooms out
11. Collapsed ring on nodes with hidden children
12. Hover triangle on parent nodes
13. Refresh page → check if data shows (persistence not loaded yet, just saved)

- [ ] **Step 2: Final commit**

```bash
git add -A && git commit -m "feat: zen-outliner v1 — working Workflowy clone"
```
