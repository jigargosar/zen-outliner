# zen-outliner v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working Workflowy clone — infinite-nesting outliner with keyboard navigation, dark mode only, localStorage persistence.

**Architecture:** Flat array data model with pure-function tree operations. React renders the tree recursively. All keyboard shortcuts handled in a single keydown handler per node. localStorage auto-saves on every state change.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, pnpm

---

## File Structure

```
src/
  main.tsx                  — Entry point, renders App
  App.tsx                   — Top-level: state, persistence, zoom context
  types.ts                  — OutlineNode type, tree types
  store.ts                  — All tree operations (pure functions on flat array)
  hooks/
    useOutliner.ts          — React hook: wraps store + localStorage + state
  components/
    OutlineTree.tsx          — Recursive tree renderer
    OutlineNode.tsx          — Single node: bullet, text input, hover triangle
    Breadcrumb.tsx           — Zoom breadcrumb navigation
  index.css                 — Tailwind imports + custom dark theme
index.html                  — Vite entry HTML
```

**Responsibilities:**
- `types.ts` — Single source of truth for data shapes
- `store.ts` — Pure functions: addNode, deleteNode, indentNode, outdentNode, moveNode, toggleCollapse, getChildren, buildTree. Zero React dependency. Fully testable.
- `useOutliner.ts` — Connects store to React state + localStorage. The only place state lives.
- `OutlineNode.tsx` — Handles its own keydown events, delegates to useOutliner actions. Manages its own contentEditable ref.
- `OutlineTree.tsx` — Recursion only. Takes nodes + depth, renders OutlineNode for each, recurses for children.
- `App.tsx` — Zoom state (which node is "root"), passes context down. Minimal.

---

### Task 0: Scaffold project with Vite + React + TS + Tailwind

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`

- [ ] **Step 1: Scaffold with pnpm + Vite**

```bash
pnpm create vite . --template react-ts
```

Select React + TypeScript when prompted. Since the directory has files already, confirm overwrite if asked.

- [ ] **Step 2: Install Tailwind CSS v4**

```bash
pnpm add -D tailwindcss @tailwindcss/vite
```

- [ ] **Step 3: Configure Vite with Tailwind plugin**

Replace `vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

- [ ] **Step 4: Set up CSS with dark theme**

Replace `src/index.css`:

```css
@import "tailwindcss";

:root {
  --bg-primary: #1a1a1a;
  --bg-hover: rgba(255, 255, 255, 0.02);
  --text-primary: #e0e0e0;
  --text-secondary: #c8c8c8;
  --text-dim: #b0b0b0;
  --text-muted: #666;
  --bullet-color: #666;
  --bullet-leaf: #4a4a4a;
  --line-color: #2e2e2e;
  --border-color: #252525;
}

body {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
```

- [ ] **Step 5: Minimal App.tsx**

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

- [ ] **Step 6: Clean up main.tsx**

Replace `src/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 7: Update index.html title**

In `index.html`, change `<title>` to `zen-outliner`.

- [ ] **Step 8: Delete boilerplate files**

```bash
rm -f src/App.css src/assets/react.svg public/vite.svg
```

- [ ] **Step 9: Verify it runs**

```bash
pnpm dev
```

Expected: Dark page with "zen-outliner" text at http://localhost:5173

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite + React + TS + Tailwind dark mode"
```

---

### Task 1: Types and data model

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Define the node type**

Create `src/types.ts`:

```ts
export interface OutlineNode {
  id: string;
  parentId: string | null;
  content: string;
  order: number;
  collapsed: boolean;
}

export interface TreeNode {
  node: OutlineNode;
  children: TreeNode[];
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types.ts
git commit -m "feat: add OutlineNode and TreeNode types"
```

---

### Task 2: Store — pure tree operations

**Files:**
- Create: `src/store.ts`
- Create: `src/store.test.ts`

- [ ] **Step 1: Install vitest**

```bash
pnpm add -D vitest
```

Add to `package.json` scripts: `"test": "vitest run", "test:watch": "vitest"`

- [ ] **Step 2: Write failing tests for core operations**

Create `src/store.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  createNode,
  getChildren,
  buildTree,
  addNodeAfter,
  deleteNode,
  indentNode,
  outdentNode,
  moveNodeUp,
  moveNodeDown,
  toggleCollapse,
} from "./store";
import type { OutlineNode } from "./types";

function makeNodes(): OutlineNode[] {
  return [
    { id: "1", parentId: null, content: "First", order: 0, collapsed: false },
    { id: "2", parentId: null, content: "Second", order: 1, collapsed: false },
    { id: "3", parentId: null, content: "Third", order: 2, collapsed: false },
    { id: "2a", parentId: "2", content: "Child of Second", order: 0, collapsed: false },
    { id: "2b", parentId: "2", content: "Another child", order: 1, collapsed: false },
  ];
}

describe("createNode", () => {
  it("creates a node with given parentId and order", () => {
    const node = createNode("hello", null, 0);
    expect(node.content).toBe("hello");
    expect(node.parentId).toBe(null);
    expect(node.order).toBe(0);
    expect(node.collapsed).toBe(false);
    expect(node.id).toBeTruthy();
  });
});

describe("getChildren", () => {
  it("returns direct children sorted by order", () => {
    const nodes = makeNodes();
    const children = getChildren(nodes, "2");
    expect(children.map((n) => n.id)).toEqual(["2a", "2b"]);
  });

  it("returns root nodes when parentId is null", () => {
    const nodes = makeNodes();
    const roots = getChildren(nodes, null);
    expect(roots.map((n) => n.id)).toEqual(["1", "2", "3"]);
  });
});

describe("buildTree", () => {
  it("builds nested tree from flat array", () => {
    const nodes = makeNodes();
    const tree = buildTree(nodes, null);
    expect(tree).toHaveLength(3);
    expect(tree[1].children).toHaveLength(2);
    expect(tree[1].children[0].node.content).toBe("Child of Second");
  });
});

describe("addNodeAfter", () => {
  it("adds a sibling after the target node", () => {
    const nodes = makeNodes();
    const [updated, newId] = addNodeAfter(nodes, "1");
    const roots = getChildren(updated, null);
    expect(roots).toHaveLength(4);
    expect(roots[1].id).toBe(newId);
    expect(roots[1].content).toBe("");
  });
});

describe("deleteNode", () => {
  it("removes node and its children", () => {
    const nodes = makeNodes();
    const updated = deleteNode(nodes, "2");
    expect(updated).toHaveLength(2);
    expect(updated.find((n) => n.id === "2a")).toBeUndefined();
  });

  it("reorders remaining siblings", () => {
    const nodes = makeNodes();
    const updated = deleteNode(nodes, "2");
    const roots = getChildren(updated, null);
    expect(roots[0].order).toBe(0);
    expect(roots[1].order).toBe(1);
  });
});

describe("indentNode", () => {
  it("makes node a child of its previous sibling", () => {
    const nodes = makeNodes();
    const updated = indentNode(nodes, "2");
    const node2 = updated.find((n) => n.id === "2")!;
    expect(node2.parentId).toBe("1");
  });

  it("returns unchanged if node is first sibling", () => {
    const nodes = makeNodes();
    const updated = indentNode(nodes, "1");
    expect(updated).toEqual(nodes);
  });
});

describe("outdentNode", () => {
  it("moves node to parent's level after parent", () => {
    const nodes = makeNodes();
    const updated = outdentNode(nodes, "2a");
    const node2a = updated.find((n) => n.id === "2a")!;
    expect(node2a.parentId).toBe(null);
  });

  it("returns unchanged if node is at root", () => {
    const nodes = makeNodes();
    const updated = outdentNode(nodes, "1");
    expect(updated).toEqual(nodes);
  });
});

describe("moveNodeUp", () => {
  it("swaps order with previous sibling", () => {
    const nodes = makeNodes();
    const updated = moveNodeUp(nodes, "2");
    const roots = getChildren(updated, null);
    expect(roots[0].id).toBe("2");
    expect(roots[1].id).toBe("1");
  });

  it("returns unchanged if already first", () => {
    const nodes = makeNodes();
    const updated = moveNodeUp(nodes, "1");
    expect(getChildren(updated, null).map((n) => n.id)).toEqual(["1", "2", "3"]);
  });
});

describe("moveNodeDown", () => {
  it("swaps order with next sibling", () => {
    const nodes = makeNodes();
    const updated = moveNodeDown(nodes, "2");
    const roots = getChildren(updated, null);
    expect(roots[1].id).toBe("3");
    expect(roots[2].id).toBe("2");
  });
});

describe("toggleCollapse", () => {
  it("toggles collapsed state", () => {
    const nodes = makeNodes();
    const updated = toggleCollapse(nodes, "2");
    expect(updated.find((n) => n.id === "2")!.collapsed).toBe(true);
    const again = toggleCollapse(updated, "2");
    expect(again.find((n) => n.id === "2")!.collapsed).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
pnpm test
```

Expected: All tests FAIL (functions don't exist yet)

- [ ] **Step 4: Implement store.ts**

Create `src/store.ts`:

```ts
import type { OutlineNode, TreeNode } from "./types";

let counter = 0;
function genId(): string {
  return `${Date.now()}-${counter++}`;
}

export function createNode(
  content: string,
  parentId: string | null,
  order: number
): OutlineNode {
  return { id: genId(), content, parentId, order, collapsed: false };
}

export function getChildren(
  nodes: OutlineNode[],
  parentId: string | null
): OutlineNode[] {
  return nodes
    .filter((n) => n.parentId === parentId)
    .sort((a, b) => a.order - b.order);
}

export function buildTree(
  nodes: OutlineNode[],
  parentId: string | null
): TreeNode[] {
  return getChildren(nodes, parentId).map((node) => ({
    node,
    children: buildTree(nodes, node.id),
  }));
}

export function addNodeAfter(
  nodes: OutlineNode[],
  afterId: string
): [OutlineNode[], string] {
  const target = nodes.find((n) => n.id === afterId)!;
  const siblings = getChildren(nodes, target.parentId);
  const newOrder = target.order + 1;
  const newNode = createNode("", target.parentId, newOrder);

  const updated = nodes.map((n) => {
    if (n.parentId === target.parentId && n.order >= newOrder) {
      return { ...n, order: n.order + 1 };
    }
    return n;
  });

  return [[...updated, newNode], newNode.id];
}

export function deleteNode(
  nodes: OutlineNode[],
  nodeId: string
): OutlineNode[] {
  const idsToDelete = new Set<string>();

  function collectIds(id: string) {
    idsToDelete.add(id);
    nodes.filter((n) => n.parentId === id).forEach((n) => collectIds(n.id));
  }
  collectIds(nodeId);

  const target = nodes.find((n) => n.id === nodeId)!;
  const remaining = nodes.filter((n) => !idsToDelete.has(n.id));

  // Reorder siblings
  const siblings = getChildren(remaining, target.parentId);
  return remaining.map((n) => {
    if (n.parentId === target.parentId) {
      const idx = siblings.findIndex((s) => s.id === n.id);
      return idx >= 0 ? { ...n, order: idx } : n;
    }
    return n;
  });
}

export function indentNode(
  nodes: OutlineNode[],
  nodeId: string
): OutlineNode[] {
  const target = nodes.find((n) => n.id === nodeId)!;
  const siblings = getChildren(nodes, target.parentId);
  const idx = siblings.findIndex((s) => s.id === nodeId);

  if (idx === 0) return nodes; // Can't indent first sibling

  const newParentId = siblings[idx - 1].id;
  const newSiblings = getChildren(nodes, newParentId);
  const newOrder = newSiblings.length;

  // Remove from old siblings, reorder them
  const withoutTarget = nodes.map((n) => {
    if (n.id === nodeId) {
      return { ...n, parentId: newParentId, order: newOrder };
    }
    return n;
  });

  // Reorder old siblings
  const oldSiblings = getChildren(withoutTarget, target.parentId);
  return withoutTarget.map((n) => {
    if (n.parentId === target.parentId && n.id !== nodeId) {
      const i = oldSiblings.findIndex((s) => s.id === n.id);
      return i >= 0 ? { ...n, order: i } : n;
    }
    return n;
  });
}

export function outdentNode(
  nodes: OutlineNode[],
  nodeId: string
): OutlineNode[] {
  const target = nodes.find((n) => n.id === nodeId)!;
  if (target.parentId === null) return nodes; // Already root

  const parent = nodes.find((n) => n.id === target.parentId)!;
  const parentSiblings = getChildren(nodes, parent.parentId);
  const parentIdx = parentSiblings.findIndex((s) => s.id === parent.id);
  const newOrder = parentIdx + 1;

  // Bump orders of parent's siblings after parent
  let updated = nodes.map((n) => {
    if (n.parentId === parent.parentId && n.order > parent.order) {
      return { ...n, order: n.order + 1 };
    }
    return n;
  });

  // Move target to parent's level
  updated = updated.map((n) => {
    if (n.id === nodeId) {
      return { ...n, parentId: parent.parentId, order: newOrder };
    }
    return n;
  });

  // Reorder old siblings
  const oldSiblings = getChildren(updated, parent.id);
  return updated.map((n) => {
    if (n.parentId === parent.id) {
      const i = oldSiblings.findIndex((s) => s.id === n.id);
      return i >= 0 ? { ...n, order: i } : n;
    }
    return n;
  });
}

export function moveNodeUp(
  nodes: OutlineNode[],
  nodeId: string
): OutlineNode[] {
  const target = nodes.find((n) => n.id === nodeId)!;
  const siblings = getChildren(nodes, target.parentId);
  const idx = siblings.findIndex((s) => s.id === nodeId);

  if (idx === 0) return nodes;

  const prevSibling = siblings[idx - 1];
  return nodes.map((n) => {
    if (n.id === nodeId) return { ...n, order: prevSibling.order };
    if (n.id === prevSibling.id) return { ...n, order: target.order };
    return n;
  });
}

export function moveNodeDown(
  nodes: OutlineNode[],
  nodeId: string
): OutlineNode[] {
  const target = nodes.find((n) => n.id === nodeId)!;
  const siblings = getChildren(nodes, target.parentId);
  const idx = siblings.findIndex((s) => s.id === nodeId);

  if (idx === siblings.length - 1) return nodes;

  const nextSibling = siblings[idx + 1];
  return nodes.map((n) => {
    if (n.id === nodeId) return { ...n, order: nextSibling.order };
    if (n.id === nextSibling.id) return { ...n, order: target.order };
    return n;
  });
}

export function toggleCollapse(
  nodes: OutlineNode[],
  nodeId: string
): OutlineNode[] {
  return nodes.map((n) => {
    if (n.id === nodeId) return { ...n, collapsed: !n.collapsed };
    return n;
  });
}

export function updateContent(
  nodes: OutlineNode[],
  nodeId: string,
  content: string
): OutlineNode[] {
  return nodes.map((n) => {
    if (n.id === nodeId) return { ...n, content };
    return n;
  });
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pnpm test
```

Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/store.ts src/store.test.ts package.json
git commit -m "feat: implement tree operations with full test coverage"
```

---

### Task 3: useOutliner hook — state + localStorage

**Files:**
- Create: `src/hooks/useOutliner.ts`

- [ ] **Step 1: Create the hook**

Create `src/hooks/useOutliner.ts`:

```ts
import { useState, useEffect, useCallback } from "react";
import type { OutlineNode } from "../types";
import {
  createNode,
  addNodeAfter,
  deleteNode,
  indentNode,
  outdentNode,
  moveNodeUp,
  moveNodeDown,
  toggleCollapse,
  updateContent,
  getChildren,
  buildTree,
} from "../store";

const STORAGE_KEY = "zen-outliner-nodes";

function loadNodes(): OutlineNode[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Corrupted data, start fresh
  }
  const initial = createNode("", null, 0);
  return [initial];
}

export function useOutliner() {
  const [nodes, setNodes] = useState<OutlineNode[]>(loadNodes);
  const [zoomId, setZoomId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);

  // Auto-save to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nodes));
  }, [nodes]);

  const actions = {
    addAfter: useCallback(
      (afterId: string) => {
        let newId: string;
        setNodes((prev) => {
          const [updated, id] = addNodeAfter(prev, afterId);
          newId = id;
          return updated;
        });
        // Focus the new node after render
        setTimeout(() => setFocusId(newId!), 0);
      },
      []
    ),

    remove: useCallback(
      (nodeId: string) => {
        setNodes((prev) => {
          const target = prev.find((n) => n.id === nodeId);
          if (!target) return prev;

          // Find previous sibling or parent to focus
          const siblings = getChildren(prev, target.parentId);
          const idx = siblings.findIndex((s) => s.id === nodeId);
          const focusTarget =
            idx > 0 ? siblings[idx - 1].id : target.parentId;

          setTimeout(() => setFocusId(focusTarget), 0);
          return deleteNode(prev, nodeId);
        });
      },
      []
    ),

    indent: useCallback(
      (nodeId: string) => {
        setNodes((prev) => indentNode(prev, nodeId));
      },
      []
    ),

    outdent: useCallback(
      (nodeId: string) => {
        setNodes((prev) => outdentNode(prev, nodeId));
      },
      []
    ),

    moveUp: useCallback(
      (nodeId: string) => {
        setNodes((prev) => moveNodeUp(prev, nodeId));
      },
      []
    ),

    moveDown: useCallback(
      (nodeId: string) => {
        setNodes((prev) => moveNodeDown(prev, nodeId));
      },
      []
    ),

    collapse: useCallback(
      (nodeId: string) => {
        setNodes((prev) => toggleCollapse(prev, nodeId));
      },
      []
    ),

    setContent: useCallback(
      (nodeId: string, content: string) => {
        setNodes((prev) => updateContent(prev, nodeId, content));
      },
      []
    ),

    zoom: useCallback((nodeId: string | null) => {
      setZoomId(nodeId);
    }, []),
  };

  const tree = buildTree(nodes, zoomId);

  // Build breadcrumb path
  const breadcrumbs: { id: string | null; label: string }[] = [
    { id: null, label: "Home" },
  ];
  if (zoomId) {
    const path: OutlineNode[] = [];
    let current = nodes.find((n) => n.id === zoomId);
    while (current) {
      path.unshift(current);
      current = current.parentId
        ? nodes.find((n) => n.id === current!.parentId)
        : undefined;
    }
    for (const node of path) {
      breadcrumbs.push({ id: node.id, label: node.content || "(empty)" });
    }
  }

  // Get the title for the current zoom level
  const zoomTitle = zoomId
    ? nodes.find((n) => n.id === zoomId)?.content || "(empty)"
    : "Home";

  return {
    nodes,
    tree,
    zoomId,
    zoomTitle,
    breadcrumbs,
    focusId,
    clearFocus: () => setFocusId(null),
    actions,
  };
}
```

- [ ] **Step 2: Verify it compiles**

```bash
pnpm exec tsc --noEmit
```

Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useOutliner.ts
git commit -m "feat: add useOutliner hook with localStorage persistence"
```

---

### Task 4: OutlineNode component

**Files:**
- Create: `src/components/OutlineNode.tsx`

- [ ] **Step 1: Create the node component**

Create `src/components/OutlineNode.tsx`:

```tsx
import { useRef, useEffect, KeyboardEvent } from "react";
import type { TreeNode } from "../types";

interface OutlineNodeProps {
  treeNode: TreeNode;
  depth: number;
  focusId: string | null;
  clearFocus: () => void;
  actions: {
    addAfter: (id: string) => void;
    remove: (id: string) => void;
    indent: (id: string) => void;
    outdent: (id: string) => void;
    moveUp: (id: string) => void;
    moveDown: (id: string) => void;
    collapse: (id: string) => void;
    setContent: (id: string, content: string) => void;
    zoom: (id: string | null) => void;
  };
}

export default function OutlineNode({
  treeNode,
  depth,
  focusId,
  clearFocus,
  actions,
}: OutlineNodeProps) {
  const { node, children } = treeNode;
  const inputRef = useRef<HTMLDivElement>(null);
  const hasChildren = children.length > 0;
  const isCollapsed = node.collapsed && hasChildren;

  // Focus management
  useEffect(() => {
    if (focusId === node.id && inputRef.current) {
      inputRef.current.focus();
      // Move cursor to end
      const range = document.createRange();
      const sel = window.getSelection();
      if (inputRef.current.childNodes.length > 0) {
        range.selectNodeContents(inputRef.current);
        range.collapse(false);
      }
      sel?.removeAllRanges();
      sel?.addRange(range);
      clearFocus();
    }
  }, [focusId, node.id, clearFocus]);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      actions.addAfter(node.id);
    } else if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      actions.indent(node.id);
    } else if (e.key === "Tab" && e.shiftKey) {
      e.preventDefault();
      actions.outdent(node.id);
    } else if (e.key === "Backspace" && node.content === "") {
      e.preventDefault();
      actions.remove(node.id);
    } else if (e.key === "ArrowUp" && e.ctrlKey) {
      e.preventDefault();
      actions.moveUp(node.id);
    } else if (e.key === "ArrowDown" && e.ctrlKey) {
      e.preventDefault();
      actions.moveDown(node.id);
    }
  };

  const handleInput = () => {
    if (inputRef.current) {
      actions.setContent(node.id, inputRef.current.textContent || "");
    }
  };

  const handleBulletClick = () => {
    if (hasChildren) {
      actions.zoom(node.id);
    }
  };

  const handleTriangleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      actions.collapse(node.id);
    }
  };

  return (
    <div>
      {/* Node row */}
      <div className="group flex items-center py-1.5 relative">
        {/* Hover triangle — to the left of bullet */}
        {hasChildren && (
          <button
            onClick={handleTriangleClick}
            className="absolute -left-5 w-5 h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text-muted)] text-[8px] cursor-pointer"
          >
            {isCollapsed ? "►" : "▼"}
          </button>
        )}

        {/* Bullet */}
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

        {/* Content — contentEditable div */}
        <div
          ref={inputRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          data-placeholder="Start typing..."
          className="flex-1 ml-2.5 text-base leading-relaxed outline-none text-[var(--text-secondary)] empty:before:content-[attr(data-placeholder)] empty:before:text-[var(--text-muted)] empty:before:italic"
        >
          {node.content}
        </div>
      </div>

      {/* Children */}
      {hasChildren && !isCollapsed && (
        <div className="ml-[11px] pl-[21px] relative before:content-[''] before:absolute before:left-[11px] before:top-0 before:bottom-3 before:w-px before:bg-[var(--line-color)]">
          {children.map((child) => (
            <OutlineNode
              key={child.node.id}
              treeNode={child}
              depth={depth + 1}
              focusId={focusId}
              clearFocus={clearFocus}
              actions={actions}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

```bash
pnpm exec tsc --noEmit
```

Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/components/OutlineNode.tsx
git commit -m "feat: add OutlineNode component with keyboard handling"
```

---

### Task 5: OutlineTree component

**Files:**
- Create: `src/components/OutlineTree.tsx`

- [ ] **Step 1: Create the tree renderer**

Create `src/components/OutlineTree.tsx`:

```tsx
import type { TreeNode } from "../types";
import OutlineNode from "./OutlineNode";

interface OutlineTreeProps {
  tree: TreeNode[];
  focusId: string | null;
  clearFocus: () => void;
  actions: {
    addAfter: (id: string) => void;
    remove: (id: string) => void;
    indent: (id: string) => void;
    outdent: (id: string) => void;
    moveUp: (id: string) => void;
    moveDown: (id: string) => void;
    collapse: (id: string) => void;
    setContent: (id: string, content: string) => void;
    zoom: (id: string | null) => void;
  };
}

export default function OutlineTree({
  tree,
  focusId,
  clearFocus,
  actions,
}: OutlineTreeProps) {
  if (tree.length === 0) {
    return (
      <p className="text-[var(--text-muted)] italic text-base">
        No items yet. Press Enter to add one.
      </p>
    );
  }

  return (
    <div>
      {tree.map((treeNode) => (
        <OutlineNode
          key={treeNode.node.id}
          treeNode={treeNode}
          depth={0}
          focusId={focusId}
          clearFocus={clearFocus}
          actions={actions}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/OutlineTree.tsx
git commit -m "feat: add OutlineTree recursive renderer"
```

---

### Task 6: Breadcrumb component

**Files:**
- Create: `src/components/Breadcrumb.tsx`

- [ ] **Step 1: Create the breadcrumb**

Create `src/components/Breadcrumb.tsx`:

```tsx
interface BreadcrumbProps {
  items: { id: string | null; label: string }[];
  onNavigate: (id: string | null) => void;
}

export default function Breadcrumb({ items, onNavigate }: BreadcrumbProps) {
  return (
    <div className="flex items-center gap-2 px-8 py-3.5 border-b border-[var(--border-color)]">
      {items.map((item, i) => (
        <span key={item.id ?? "home"} className="flex items-center gap-2">
          {i > 0 && (
            <span className="text-[var(--line-color)] text-sm">›</span>
          )}
          {i < items.length - 1 ? (
            <button
              onClick={() => onNavigate(item.id)}
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
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Breadcrumb.tsx
git commit -m "feat: add Breadcrumb component for zoom navigation"
```

---

### Task 7: Wire everything in App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Replace App.tsx with the full outline app**

Replace `src/App.tsx`:

```tsx
import { useOutliner } from "./hooks/useOutliner";
import Breadcrumb from "./components/Breadcrumb";
import OutlineTree from "./components/OutlineTree";

export default function App() {
  const {
    tree,
    zoomTitle,
    breadcrumbs,
    focusId,
    clearFocus,
    actions,
  } = useOutliner();

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg-primary)" }}>
      <Breadcrumb items={breadcrumbs} onNavigate={actions.zoom} />

      <div className="max-w-[700px] mx-auto px-8 pl-[52px] pt-12 pb-12">
        {/* Page title */}
        <h1 className="text-[26px] text-[var(--text-primary)] font-medium mb-10">
          {zoomTitle}
        </h1>

        {/* Outline */}
        <OutlineTree
          tree={tree}
          focusId={focusId}
          clearFocus={clearFocus}
          actions={actions}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run the app and verify**

```bash
pnpm dev
```

Expected at http://localhost:5173:
1. Dark background with "Home" title
2. One empty node with blinking cursor placeholder
3. Type text, press Enter to add nodes
4. Tab to indent, Shift+Tab to outdent
5. Click a bullet to zoom in, breadcrumb to zoom out

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire up full outliner in App.tsx"
```

---

### Task 8: Arrow key navigation between nodes

**Files:**
- Modify: `src/components/OutlineNode.tsx`

- [ ] **Step 1: Add up/down arrow navigation**

In `src/components/OutlineNode.tsx`, add these cases inside `handleKeyDown`, before the closing brace:

```ts
    } else if (e.key === "ArrowUp" && !e.ctrlKey) {
      e.preventDefault();
      // Find the previous visible node's contentEditable and focus it
      const allEditable = document.querySelectorAll<HTMLDivElement>("[contenteditable]");
      const arr = Array.from(allEditable);
      const idx = arr.indexOf(inputRef.current!);
      if (idx > 0) arr[idx - 1].focus();
    } else if (e.key === "ArrowDown" && !e.ctrlKey) {
      e.preventDefault();
      const allEditable = document.querySelectorAll<HTMLDivElement>("[contenteditable]");
      const arr = Array.from(allEditable);
      const idx = arr.indexOf(inputRef.current!);
      if (idx < arr.length - 1) arr[idx + 1].focus();
    }
```

- [ ] **Step 2: Verify arrow navigation works**

```bash
pnpm dev
```

Create 3+ nodes, use ↑/↓ to move between them.

- [ ] **Step 3: Commit**

```bash
git add src/components/OutlineNode.tsx
git commit -m "feat: add arrow key navigation between nodes"
```

---

### Task 9: Smoke test and final verification

- [ ] **Step 1: Run all tests**

```bash
pnpm test
```

Expected: All store tests pass.

- [ ] **Step 2: Manual smoke test checklist**

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
11. Collapsed ring appears when node has hidden children
12. Hover triangle appears on parent nodes
13. Refresh page → data persists from localStorage

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: zen-outliner v1 — working Workflowy clone"
```
