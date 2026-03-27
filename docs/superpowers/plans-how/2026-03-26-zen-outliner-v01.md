# zen-outliner v01 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working outliner with Checkvist interaction (selected + editing states), Workflowy visual design, dark mode only, localStorage persistence.

**Spec:** docs/superpowers/specs-what/2026-03-26-zen-outliner-v01.md

**Architecture:** Flat array of OutlineItems in a mobx-bonsai store. Computed indexes for O(1) lookups. Fractional indexing for ordering. observer() components from mobx-react-lite. Debounced onSnapshot for auto-save. Selected/editing state flag controls keyboard handler.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, pnpm, mobx, mobx-bonsai, mobx-react-lite, fractional-indexing, vitest

**Existing:** Vite + React + TS + Tailwind scaffold is done (main.tsx, index.css with dark theme). Everything else in src/ is stale from a previous plan and must be replaced.

---

## File Structure

```
src/
  main.tsx                    — Entry point (exists, keep as-is)
  App.tsx                     — Creates store, renders OutlineTree
  index.css                   — Tailwind + dark theme (exists, keep as-is)
  models/
    types.ts                  — OutlineItem interface
    OutlineStore.ts           — mobx-bonsai nodeType: items, collapsedIds, computed indexes, all actions
    OutlineStore.test.ts      — Tests for all store operations
  components/
    OutlineTree.tsx            — Renders root-level items, delegates to OutlineNode
    OutlineNode.tsx            — Single node: bullet, contentEditable, children recursion
  lib/
    persistence.ts             — Debounced localStorage save/load
```

---

### Task 1: Cleanup stale code + install dependencies

**Files:**
- Delete: all files in `src/components/`, `src/models/`
- Delete: `src/store.ts`, `src/store.test.ts`, `src/types.ts` (if they exist)
- Modify: `src/App.tsx` (reset to placeholder)
- Modify: `package.json`

- [ ] **Step 1: Delete all stale src files**

```bash
rm -rf src/components src/models
rm -f src/store.ts src/store.test.ts src/types.ts
mkdir -p src/components src/models src/lib
```

- [ ] **Step 2: Reset App.tsx to placeholder**

Replace `src/App.tsx`:

```tsx
export default function App() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg-primary)" }}>
      <p style={{ color: "var(--text-primary)", padding: "2rem" }}>zen-outliner</p>
    </div>
  );
}
```

- [ ] **Step 3: Install dependencies**

```bash
pnpm add mobx mobx-bonsai mobx-react-lite fractional-indexing
```

- [ ] **Step 4: Add fractional-indexing type declaration if needed**

Check if types exist. If not, create `src/fractional-indexing.d.ts`:

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

- [ ] **Step 5: Verify app still runs**

```bash
pnpm dev
```

Expected: Dark page with "zen-outliner" text.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "chore: clean stale code, install mobx-bonsai + fractional-indexing"
```

---

### Task 2: Types + OutlineStore with tests

**Files:**
- Create: `src/models/types.ts`
- Create: `src/models/OutlineStore.ts`
- Create: `src/models/OutlineStore.test.ts`

- [ ] **Step 1: Create types**

Create `src/models/types.ts`:

```ts
export interface OutlineItem {
  id: string;
  parentId: string | null;
  content: string;
  order: string;
}
```

- [ ] **Step 2: Write failing tests**

Create `src/models/OutlineStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { createStore, TOutlineStore } from "./OutlineStore";
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

  it("initializes with empty collapsedIds", () => {
    expect(store.collapsedIds).toEqual([]);
  });
});

describe("computed: itemsById", () => {
  it("returns map of all items by id", () => {
    const map = TOutlineStore.itemsById(store);
    expect(map.size).toBe(1);
    expect(map.get(store.items[0].id)).toBe(store.items[0]);
  });
});

describe("computed: childrenByParentId", () => {
  it("groups and sorts items by parentId", () => {
    const firstId = store.items[0].id;
    TOutlineStore.addAfter(store, firstId);
    TOutlineStore.addAfter(store, firstId);
    const map = TOutlineStore.childrenByParentId(store);
    const roots = map.get(null)!;
    expect(roots.length).toBe(3);
    for (let i = 1; i < roots.length; i++) {
      expect(roots[i].order > roots[i - 1].order).toBe(true);
    }
  });
});

describe("addAfter", () => {
  it("adds empty sibling after target", () => {
    const firstId = store.items[0].id;
    const newId = TOutlineStore.addAfter(store, firstId);
    expect(store.items.length).toBe(2);
    const map = TOutlineStore.childrenByParentId(store);
    const roots = map.get(null)!;
    expect(roots[0].id).toBe(firstId);
    expect(roots[1].id).toBe(newId);
  });

  it("inserts between target and next sibling", () => {
    const firstId = store.items[0].id;
    const secondId = TOutlineStore.addAfter(store, firstId);
    const middleId = TOutlineStore.addAfter(store, firstId);
    const roots = TOutlineStore.childrenByParentId(store).get(null)!;
    expect(roots[0].id).toBe(firstId);
    expect(roots[1].id).toBe(middleId);
    expect(roots[2].id).toBe(secondId);
  });
});

describe("setContent", () => {
  it("updates item content", () => {
    TOutlineStore.setContent(store, store.items[0].id, "hello");
    expect(store.items[0].content).toBe("hello");
  });
});

describe("removeItem", () => {
  it("removes item and descendants", () => {
    const firstId = store.items[0].id;
    const childId = TOutlineStore.addAfter(store, firstId);
    TOutlineStore.indentItem(store, childId);
    TOutlineStore.removeItem(store, firstId);
    expect(store.items.length).toBe(0);
  });

  it("returns focus target (previous sibling)", () => {
    const firstId = store.items[0].id;
    const secondId = TOutlineStore.addAfter(store, firstId);
    const focusTarget = TOutlineStore.removeItem(store, secondId);
    expect(focusTarget).toBe(firstId);
  });

  it("returns parent as focus target when no previous sibling", () => {
    const firstId = store.items[0].id;
    const childId = TOutlineStore.addAfter(store, firstId);
    TOutlineStore.indentItem(store, childId);
    const focusTarget = TOutlineStore.removeItem(store, childId);
    expect(focusTarget).toBe(firstId);
  });

  it("cleans up collapsedIds for removed items", () => {
    const firstId = store.items[0].id;
    const childId = TOutlineStore.addAfter(store, firstId);
    TOutlineStore.indentItem(store, childId);
    TOutlineStore.toggleCollapse(store, firstId);
    expect(store.collapsedIds).toContain(firstId);
    TOutlineStore.removeItem(store, firstId);
    expect(store.collapsedIds).not.toContain(firstId);
  });
});

describe("indentItem", () => {
  it("makes item child of previous sibling", () => {
    const firstId = store.items[0].id;
    const secondId = TOutlineStore.addAfter(store, firstId);
    TOutlineStore.indentItem(store, secondId);
    const item = TOutlineStore.itemsById(store).get(secondId)!;
    expect(item.parentId).toBe(firstId);
  });

  it("does nothing for first sibling", () => {
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

  it("does nothing for root items", () => {
    TOutlineStore.outdentItem(store, store.items[0].id);
    expect(store.items[0].parentId).toBe(null);
  });
});

describe("moveItemUp", () => {
  it("moves item before previous sibling", () => {
    const firstId = store.items[0].id;
    const secondId = TOutlineStore.addAfter(store, firstId);
    TOutlineStore.moveItemUp(store, secondId);
    const roots = TOutlineStore.childrenByParentId(store).get(null)!;
    expect(roots[0].id).toBe(secondId);
    expect(roots[1].id).toBe(firstId);
  });

  it("does nothing for first sibling", () => {
    const firstId = store.items[0].id;
    TOutlineStore.addAfter(store, firstId);
    TOutlineStore.moveItemUp(store, firstId);
    const roots = TOutlineStore.childrenByParentId(store).get(null)!;
    expect(roots[0].id).toBe(firstId);
  });
});

describe("moveItemDown", () => {
  it("moves item after next sibling", () => {
    const firstId = store.items[0].id;
    const secondId = TOutlineStore.addAfter(store, firstId);
    TOutlineStore.moveItemDown(store, firstId);
    const roots = TOutlineStore.childrenByParentId(store).get(null)!;
    expect(roots[0].id).toBe(secondId);
    expect(roots[1].id).toBe(firstId);
  });
});

describe("toggleCollapse", () => {
  it("adds id to collapsedIds", () => {
    const id = store.items[0].id;
    TOutlineStore.toggleCollapse(store, id);
    expect(store.collapsedIds).toContain(id);
  });

  it("removes id on second toggle", () => {
    const id = store.items[0].id;
    TOutlineStore.toggleCollapse(store, id);
    TOutlineStore.toggleCollapse(store, id);
    expect(store.collapsedIds).not.toContain(id);
  });
});

describe("isCollapsed", () => {
  it("returns collapse state", () => {
    const id = store.items[0].id;
    expect(TOutlineStore.isCollapsed(store, id)).toBe(false);
    TOutlineStore.toggleCollapse(store, id);
    expect(TOutlineStore.isCollapsed(store, id)).toBe(true);
  });
});

describe("splitNode", () => {
  it("splits content at cursor position", () => {
    const id = store.items[0].id;
    TOutlineStore.setContent(store, id, "hello world");
    const newId = TOutlineStore.splitNode(store, id, 5);
    const original = TOutlineStore.itemsById(store).get(id)!;
    const newItem = TOutlineStore.itemsById(store).get(newId)!;
    expect(original.content).toBe("hello");
    expect(newItem.content).toBe(" world");
    expect(newItem.parentId).toBe(original.parentId);
  });
});

describe("mergeWithPrevious", () => {
  it("merges content into previous sibling", () => {
    const firstId = store.items[0].id;
    TOutlineStore.setContent(store, firstId, "hello");
    const secondId = TOutlineStore.addAfter(store, firstId);
    TOutlineStore.setContent(store, secondId, " world");
    const result = TOutlineStore.mergeWithPrevious(store, secondId);
    expect(result).toEqual({ targetId: firstId, cursorPos: 5 });
    expect(store.items.length).toBe(1);
    expect(store.items[0].content).toBe("hello world");
  });

  it("returns null for first sibling (no previous)", () => {
    const result = TOutlineStore.mergeWithPrevious(store, store.items[0].id);
    expect(result).toBe(null);
  });
});

describe("getVisibleNodes", () => {
  it("returns root items when nothing collapsed", () => {
    const firstId = store.items[0].id;
    TOutlineStore.addAfter(store, firstId);
    const visible = TOutlineStore.getVisibleNodes(store);
    expect(visible.length).toBe(2);
  });

  it("hides children of collapsed nodes", () => {
    const firstId = store.items[0].id;
    const childId = TOutlineStore.addAfter(store, firstId);
    TOutlineStore.indentItem(store, childId);
    TOutlineStore.toggleCollapse(store, firstId);
    const visible = TOutlineStore.getVisibleNodes(store);
    expect(visible.length).toBe(1);
    expect(visible[0].id).toBe(firstId);
  });
});

describe("canDelete", () => {
  it("returns false for last remaining item", () => {
    expect(TOutlineStore.canDelete(store, store.items[0].id)).toBe(false);
  });

  it("returns true when more than one item", () => {
    const firstId = store.items[0].id;
    TOutlineStore.addAfter(store, firstId);
    expect(TOutlineStore.canDelete(store, firstId)).toBe(true);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
pnpm test
```

Expected: All fail.

- [ ] **Step 4: Implement OutlineStore**

Create `src/models/OutlineStore.ts`:

```ts
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
```

- [ ] **Step 5: Run tests**

```bash
pnpm test
```

Expected: All pass.

- [ ] **Step 6: Commit**

```bash
git add src/models/ && git commit -m "feat: OutlineStore with mobx-bonsai, fractional indexing, full test coverage"
```

---

### Task 3: Persistence (debounced localStorage)

**Files:**
- Create: `src/lib/persistence.ts`

- [ ] **Step 1: Implement persistence**

Create `src/lib/persistence.ts`:

```ts
import { node, onSnapshot } from "mobx-bonsai";
import { createStore } from "../models/OutlineStore";
import type { OutlineStore } from "../models/OutlineStore";

const STORAGE_KEY = "zen-outliner-data";
const DEBOUNCE_MS = 500;

export function loadOrCreateStore(): OutlineStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && Array.isArray(data.items) && data.items.length > 0) {
        return node(data);
      }
    }
  } catch {
    // Corrupt data — fall through to fresh store
  }
  return createStore();
}

export function startAutoSave(store: OutlineStore): () => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const dispose = onSnapshot(store, (snapshot) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    }, DEBOUNCE_MS);
  });

  return () => {
    if (timeoutId) clearTimeout(timeoutId);
    dispose();
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/ && git commit -m "feat: debounced localStorage persistence"
```

---

### Task 4: OutlineNode component

**Files:**
- Create: `src/components/OutlineNode.tsx`

- [ ] **Step 1: Implement OutlineNode**

Create `src/components/OutlineNode.tsx`:

```tsx
import { useRef, useEffect } from "react";
import { observer } from "mobx-react-lite";
import type { OutlineItem, OutlineStore } from "../models/OutlineStore";
import { TOutlineStore } from "../models/OutlineStore";

interface Props {
  item: OutlineItem;
  store: OutlineStore;
  selectedId: string | null;
  editingId: string | null;
  onSelect: (id: string) => void;
  onStartEditing: (id: string) => void;
  onStopEditing: () => void;
  onRequestFocus: (id: string, cursorPos?: number) => void;
}

const OutlineNode = observer(function OutlineNode({
  item,
  store,
  selectedId,
  editingId,
  onSelect,
  onStartEditing,
  onStopEditing,
  onRequestFocus,
}: Props) {
  const inputRef = useRef<HTMLDivElement>(null);
  const children = TOutlineStore.getChildren(store, item.id);
  const hasChildren = children.length > 0;
  const isCollapsed = TOutlineStore.isCollapsed(store, item.id);
  const isSelected = selectedId === item.id;
  const isEditing = editingId === item.id;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleClick = () => {
    onSelect(item.id);
    onStartEditing(item.id);
  };

  const handleBulletClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(item.id);
    if (hasChildren) {
      TOutlineStore.toggleCollapse(store, item.id);
    }
  };

  const handleTriangleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      TOutlineStore.toggleCollapse(store, item.id);
    }
  };

  const handleInput = () => {
    if (inputRef.current) {
      TOutlineStore.setContent(store, item.id, inputRef.current.textContent || "");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isEditing) return;

    if (e.key === "Escape") {
      e.preventDefault();
      onStopEditing();
      return;
    }

    if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      const sel = window.getSelection();
      const cursorPos = sel?.focusOffset ?? item.content.length;
      if (cursorPos === item.content.length) {
        const newId = TOutlineStore.addAfter(store, item.id);
        if (newId) {
          onSelect(newId);
          onStartEditing(newId);
          onRequestFocus(newId);
        }
      } else {
        const newId = TOutlineStore.splitNode(store, item.id, cursorPos);
        if (newId) {
          onSelect(newId);
          onStartEditing(newId);
          onRequestFocus(newId);
        }
      }
      return;
    }

    if (e.key === "Backspace") {
      if (item.content === "") {
        e.preventDefault();
        if (TOutlineStore.canDelete(store, item.id)) {
          const focusTarget = TOutlineStore.removeItem(store, item.id);
          if (focusTarget) {
            onSelect(focusTarget);
            onStartEditing(focusTarget);
            onRequestFocus(focusTarget);
          }
        }
        return;
      }
      const sel = window.getSelection();
      if (sel && sel.focusOffset === 0 && sel.isCollapsed) {
        e.preventDefault();
        const result = TOutlineStore.mergeWithPrevious(store, item.id);
        if (result) {
          onSelect(result.targetId);
          onStartEditing(result.targetId);
          onRequestFocus(result.targetId, result.cursorPos);
        }
        return;
      }
    }

    if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      TOutlineStore.indentItem(store, item.id);
      onRequestFocus(item.id);
      return;
    }

    if (e.key === "Tab" && e.shiftKey) {
      e.preventDefault();
      TOutlineStore.outdentItem(store, item.id);
      onRequestFocus(item.id);
      return;
    }

    if (e.altKey && e.shiftKey && e.key === "ArrowUp") {
      e.preventDefault();
      TOutlineStore.moveItemUp(store, item.id);
      onRequestFocus(item.id);
      return;
    }
    if (e.altKey && e.shiftKey && e.key === "ArrowDown") {
      e.preventDefault();
      TOutlineStore.moveItemDown(store, item.id);
      onRequestFocus(item.id);
      return;
    }

    if (e.altKey && e.shiftKey && e.key === "ArrowRight") {
      e.preventDefault();
      TOutlineStore.indentItem(store, item.id);
      onRequestFocus(item.id);
      return;
    }
    if (e.altKey && e.shiftKey && e.key === "ArrowLeft") {
      e.preventDefault();
      TOutlineStore.outdentItem(store, item.id);
      onRequestFocus(item.id);
      return;
    }

    if (e.ctrlKey && e.key === "ArrowUp") {
      e.preventDefault();
      if (hasChildren) TOutlineStore.toggleCollapse(store, item.id);
      return;
    }
    if (e.ctrlKey && e.key === "ArrowDown") {
      e.preventDefault();
      if (hasChildren) TOutlineStore.toggleCollapse(store, item.id);
      return;
    }

    if (e.ctrlKey && e.shiftKey && e.key === "Backspace") {
      e.preventDefault();
      if (TOutlineStore.canDelete(store, item.id)) {
        const focusTarget = TOutlineStore.removeItem(store, item.id);
        if (focusTarget) {
          onSelect(focusTarget);
          onStartEditing(focusTarget);
          onRequestFocus(focusTarget);
        }
      }
      return;
    }

    if (e.key === "ArrowUp" && !e.ctrlKey && !e.altKey) {
      const sel = window.getSelection();
      if (sel && sel.focusOffset === 0 && sel.isCollapsed) {
        e.preventDefault();
        const visible = TOutlineStore.getVisibleNodes(store);
        const idx = visible.findIndex((n) => n.id === item.id);
        if (idx > 0) {
          const prevId = visible[idx - 1].id;
          onSelect(prevId);
          onStartEditing(prevId);
          onRequestFocus(prevId);
        }
      }
    }

    if (e.key === "ArrowDown" && !e.ctrlKey && !e.altKey) {
      const sel = window.getSelection();
      const atEnd = sel && sel.focusOffset === (inputRef.current?.textContent?.length ?? 0) && sel.isCollapsed;
      if (atEnd) {
        e.preventDefault();
        const visible = TOutlineStore.getVisibleNodes(store);
        const idx = visible.findIndex((n) => n.id === item.id);
        if (idx < visible.length - 1) {
          const nextId = visible[idx + 1].id;
          onSelect(nextId);
          onStartEditing(nextId);
          onRequestFocus(nextId);
        }
      }
    }
  };

  return (
    <div>
      <div
        className={`group flex items-center py-1.5 relative cursor-pointer ${
          isSelected ? "bg-[var(--bg-hover)]" : ""
        }`}
        onClick={handleClick}
      >
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
          onFocus={() => { onSelect(item.id); onStartEditing(item.id); }}
          className={`flex-1 ml-2.5 text-base leading-relaxed outline-none text-[var(--text-secondary)] ${
            isEditing ? "bg-[rgba(255,255,255,0.03)]" : ""
          }`}
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
              selectedId={selectedId}
              editingId={editingId}
              onSelect={onSelect}
              onStartEditing={onStartEditing}
              onStopEditing={onStopEditing}
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
git add src/components/OutlineNode.tsx && git commit -m "feat: OutlineNode with selected/editing states, all keyboard shortcuts"
```

---

### Task 5: OutlineTree + App wiring

**Files:**
- Create: `src/components/OutlineTree.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create OutlineTree**

Create `src/components/OutlineTree.tsx`:

```tsx
import { observer } from "mobx-react-lite";
import type { OutlineStore } from "../models/OutlineStore";
import { TOutlineStore } from "../models/OutlineStore";
import OutlineNode from "./OutlineNode";

interface Props {
  store: OutlineStore;
  selectedId: string | null;
  editingId: string | null;
  onSelect: (id: string) => void;
  onStartEditing: (id: string) => void;
  onStopEditing: () => void;
  onRequestFocus: (id: string, cursorPos?: number) => void;
}

const OutlineTree = observer(function OutlineTree({
  store,
  selectedId,
  editingId,
  onSelect,
  onStartEditing,
  onStopEditing,
  onRequestFocus,
}: Props) {
  const roots = TOutlineStore.getChildren(store, null);

  if (roots.length === 0) {
    return (
      <p className="text-[var(--text-muted)] italic text-base">
        No items.
      </p>
    );
  }

  return (
    <div>
      {roots.map((item) => (
        <OutlineNode
          key={item.id}
          item={item}
          store={store}
          selectedId={selectedId}
          editingId={editingId}
          onSelect={onSelect}
          onStartEditing={onStartEditing}
          onStopEditing={onStopEditing}
          onRequestFocus={onRequestFocus}
        />
      ))}
    </div>
  );
});

export default OutlineTree;
```

- [ ] **Step 2: Wire App.tsx**

Replace `src/App.tsx`:

```tsx
import { useState, useCallback, useEffect } from "react";
import { observer } from "mobx-react-lite";
import { loadOrCreateStore, startAutoSave } from "./lib/persistence";
import { TOutlineStore } from "./models/OutlineStore";
import OutlineTree from "./components/OutlineTree";

const store = loadOrCreateStore();
startAutoSave(store);

const App = observer(function App() {
  const [selectedId, setSelectedId] = useState<string | null>(store.items[0]?.id ?? null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSelect = useCallback((id: string) => setSelectedId(id), []);
  const handleStartEditing = useCallback((id: string) => {
    setSelectedId(id);
    setEditingId(id);
  }, []);
  const handleStopEditing = useCallback(() => setEditingId(null), []);
  const handleRequestFocus = useCallback((id: string, _cursorPos?: number) => {
    setSelectedId(id);
    setEditingId(id);
  }, []);

  // Selected state keyboard handler (when not editing)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingId) return;
      if (!selectedId) return;

      const visible = TOutlineStore.getVisibleNodes(store);
      const idx = visible.findIndex((n) => n.id === selectedId);

      switch (e.key) {
        case "ArrowUp":
        case "k":
          e.preventDefault();
          if (idx > 0) setSelectedId(visible[idx - 1].id);
          break;
        case "ArrowDown":
        case "j":
          e.preventDefault();
          if (idx < visible.length - 1) setSelectedId(visible[idx + 1].id);
          break;
        case "i":
        case "Enter":
          e.preventDefault();
          handleStartEditing(selectedId);
          break;
        case "Tab":
          e.preventDefault();
          if (e.shiftKey) {
            TOutlineStore.outdentItem(store, selectedId);
          } else {
            TOutlineStore.indentItem(store, selectedId);
          }
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (TOutlineStore.hasChildren(store, selectedId) && !TOutlineStore.isCollapsed(store, selectedId)) {
            TOutlineStore.toggleCollapse(store, selectedId);
          }
          break;
        case "ArrowRight":
          e.preventDefault();
          if (TOutlineStore.hasChildren(store, selectedId) && TOutlineStore.isCollapsed(store, selectedId)) {
            TOutlineStore.toggleCollapse(store, selectedId);
          }
          break;
        case "Backspace":
        case "Delete":
          if (e.ctrlKey && e.shiftKey) {
            e.preventDefault();
            if (TOutlineStore.canDelete(store, selectedId)) {
              const focusTarget = TOutlineStore.removeItem(store, selectedId);
              if (focusTarget) setSelectedId(focusTarget);
            }
          }
          break;
      }

      if (e.altKey && e.shiftKey) {
        if (e.key === "ArrowUp") {
          e.preventDefault();
          TOutlineStore.moveItemUp(store, selectedId);
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          TOutlineStore.moveItemDown(store, selectedId);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, editingId, handleStartEditing]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg-primary)" }}>
      <div className="max-w-[700px] mx-auto px-8 pl-[52px] pt-12 pb-12">
        <OutlineTree
          store={store}
          selectedId={selectedId}
          editingId={editingId}
          onSelect={handleSelect}
          onStartEditing={handleStartEditing}
          onStopEditing={handleStopEditing}
          onRequestFocus={handleRequestFocus}
        />
      </div>
    </div>
  );
});

export default App;
```

- [ ] **Step 3: Run the app**

```bash
pnpm dev
```

Expected: Dark page, one empty node selected (highlighted). Press i to edit, type text, Enter for new node, Esc to stop editing, j/k to navigate, Tab to indent.

- [ ] **Step 4: Run tests**

```bash
pnpm test
```

Expected: All pass.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: wire OutlineTree + App with selected/editing states and persistence"
```

---

### Task 6: Smoke test

- [ ] **Step 1: Run all tests**

```bash
pnpm test
```

Expected: All pass.

- [ ] **Step 2: Manual smoke test**

Open http://localhost:5173 and verify:

Selected state:
  1. Page loads, first node selected (highlighted)
  2. j/k or arrows navigate between nodes
  3. Tab indents selected node
  4. Shift+Tab outdents
  5. Alt+Shift+Up/Down reorders
  6. ArrowLeft collapses, ArrowRight expands
  7. Ctrl+Shift+Backspace force-deletes
  8. i or Enter enters editing

Editing state:
  9. Cursor appears in text, type freely
  10. Enter at end creates new sibling
  11. Enter mid-text splits node
  12. Backspace on empty deletes node
  13. Backspace at start merges with previous
  14. Tab/Shift+Tab indent/outdent while editing
  15. Alt+Shift+Up/Down reorder while editing
  16. Ctrl+Up/Down collapse/expand while editing
  17. Esc stops editing, node stays selected
  18. Arrow up/down at text boundary flows to adjacent node

Visual:
  19. Dark background
  20. Bullet dots on every node
  21. Collapsed nodes have ring around bullet
  22. Hover shows triangle on parent nodes
  23. Vertical connector lines
  24. Selected node highlighted
  25. Editing node visually distinct

Persistence:
  26. Refresh page — data persists
  27. Last item cannot be deleted

- [ ] **Step 3: Final commit**

```bash
git add -A && git commit -m "feat: zen-outliner v01 complete"
```
