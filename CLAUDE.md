zen-outliner — A keyboard-driven outliner in the spirit of Checkvist.
The goal: a fast, focused tool for thinking in trees.

# Spikes

The `spikes/` folder contains throwaway prototypes — each one tests
a specific technical approach in a single `index.html` file.

1. `01-contenteditable-tree` — contentEditable for inline editing
2. `02-input-nav-edit` — input elements with nav/edit modal switching
3. `03-morphdom-tailwind` — morphdom for DOM diffing + Tailwind
4. `04-vanjs-outliner` — VanJS as DOM builder + replaceChildren()

Spikes are numbered, self-contained, and disposable. They inform
the real implementation but are not part of it.

# Design Philosophy

- Simple, small, robust. Easy to read, easy to maintain.
- Performance does not matter. Optimize for clarity and simplicity.
- Dependencies and bundle size do not matter — don't reinvent wheels.
- Fancy is the enemy of done. Pick the boring approach.
- Small codebase over clever codebase.

# Must-Haves

Not an outliner without these. Spikes implement all of these.
Partial implementations are OK where the goal is proving the
architecture handles it without spaghetti — not skipping it.

1. Hierarchical list — indent, outdent, reorder, collapse/expand
2. Keyboard-first — nav mode + edit mode, all operations via keys
3. Undo/redo — multi-level, snapshot-based minimum
4. Zoom — focus on a subtree, breadcrumb trail back
5. Navigation history — back/forward through focus positions
6. Persistence — localStorage, export/import
7. Mark done — strikethrough/dimmed
8. Search/filter

# Infrastructure

Must be architecturally possible — no spaghetti if added later.

1. Large lists — 500+ visible nodes without jank
2. Multiple lists/documents
3. Drag and drop
4. Collaboration-ready data model

# Tech Direction

VanJS is the chosen rendering/reactivity layer. Key decisions:
- Each tree node's properties are van.state() — fully reactive, zero manual render triggers
- Flat list rendering with CSS indent — avoids DOM reparenting issues
- Undo via snapshot-based approach — serialize state, push to stack

# Parallel Sessions

Two sessions implement all must-haves independently with VanJS.
Two full implementations, not a split. Merge point: compare
both, learn from differences, decide what graduates to src/.

- Session A: spike 05a-vanjs-outliner
- Session B: spike 05b-vanjs-outliner

Shared approach:
- VanJS with reactive nodes (each property as van.state())
- Flat list rendering with CSS indent
- Snapshot-based undo/redo (Ctrl+Z / Ctrl+Shift+Z)
- Zoom with breadcrumb trail
- Navigation history — back/forward (Alt+Left / Alt+Right)
- Search/filter with highlight
- localStorage persistence
