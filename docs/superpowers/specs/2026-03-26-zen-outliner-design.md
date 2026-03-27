# zen-outliner — Design Spec (v1)

## What

An outliner inspired by Workflowy and Checkvist. Dark mode only.
Checkvist interaction model with Workflowy visual design (minimal, dark,
content is the interface). Flowing text while editing. Plain text only,
no rich text in v1. Multiple root-level items. No multiple lists in v1.


## Interaction Model

A node can be selected, and separately, edited.

Selected state:
  One node is "selected" at a time. Visually highlighted.
  Keyboard commands act on the selected node: indent, outdent,
  delete, move up/down, collapse. Single-key shortcuts work here.

Editing state:
  The selected node's text is being edited. Activated by shortcut
  or clicking the node text. The text input area is visually
  prominent. contentEditable receives keystrokes. Enter splits
  node at cursor. Backspace at start merges with previous node.
  Arrow keys at boundaries flow to adjacent nodes seamlessly.
  Esc stops editing, node stays selected.

Multi-select (future, not v1):
  Item-level selection of multiple nodes. Triggered by selection
  gesture. Batch operations (move, delete, indent group).

Technical approach:
  contentEditable attribute is on every node div, always.
  Editing flag controls keyboard handler behavior.
  When not editing: preventDefault() on text keys, process
  structural commands.
  When editing: let keys through to contentEditable.
  No rich text library needed. Content stored as plain strings.
  Rich text (WYSIWYG or markdown) is a v2 component-level change
  that does not affect store, model, or architecture.


## Stack

1. React + TypeScript + Vite
2. Tailwind CSS (dark mode only)
3. mobx-bonsai + mobx-react-lite (state, snapshots, future undo)
4. fractional-indexing (string-based ordering)
5. localStorage (JSON) for persistence
6. No auth, no backend, no Supabase (for now)
7. SPA — single page application


## Core Features (v1)

1. Infinite nesting — nodes can nest arbitrarily deep
2. Expand / collapse any node with children
3. Keyboard-driven — shortcuts revisited per-feature during implementation
4. localStorage persistence — auto-save on every change


## Focus Behavior

General principle: focus stays on the node you acted on.
If that node no longer exists, focus goes to the nearest
logical neighbor (previous sibling, or parent).

Defaults (refined during implementation):
  Collapse        stay on collapsed node
  Expand          stay on expanded node
  Indent (Tab)    stay on indented node (now nested)
  Outdent         stay on outdented node (now promoted)
  Delete          previous sibling, or parent if none
  Add sibling     focus new node
  Move up/down    stay on moved node
  Split (Enter)   focus new node (text after cursor)
  Merge (Bksp)    focus merged node, cursor at join point


## Delete Behavior

1. Delete a node deletes the node AND all its children
2. Last remaining item cannot be deleted
3. No promote-children variant in v1
4. No undo in v1 — accepted risk


## Visual Design

1. Dark mode only (#1a1a1a background)
2. Workflowy-style — content IS the interface
3. Every node has a bullet dot (small filled circle)
4. Collapsed nodes: ring/circle around the bullet
5. Leaf nodes: slightly smaller, dimmer dot
6. Hover a parent node: collapse/expand triangle fades in to the LEFT of the bullet
7. Vertical connector lines run from parent through child bullets (same x-axis)
8. Centered content area (~700px max-width)
9. Spacious line height, generous padding
10. No sidebar in v1 (toggleable sidebar is a future feature)
11. No toolbar, no chrome — just the outline
12. Selected node: visually highlighted
13. Editing node: text input visually prominent


## Empty State

Single empty node with placeholder text.


## Data Model

### OutlineItem (pure data — 4 fields)
```
id:       string        — unique ID (generated client-side)
parentId: string | null — parent reference (null = root)
content:  string        — the text
order:    string        — fractional index for sorting (string-based)
```

### OutlineStore (root state)
```
items:        OutlineItem[]  — flat array, source of truth
collapsedIds: string[]       — which items are collapsed (view state, NOT on items)
```

### Computed indexes (derived, not stored)
```
itemsById:          Map<string, OutlineItem>           — O(1) ID lookup
childrenByParentId: Map<string | null, OutlineItem[]>  — O(1) children lookup, sorted by order
```

### Key decisions
1. Flat array — mutations are single-field changes (parentId for indent/outdent, order for reorder)
2. No collapsed field on items — collapse is view state, not data. Keeps undo/redo clean, keeps Supabase schema clean.
3. Fractional indexing — insert between any two items without reindexing siblings
4. Computed indexes — MobX recalculates on mutation, caches until next change
5. Maps directly to Supabase rows when backend is added later


## Future / v2+

Captured from brainstorming discussions. Not in v1 scope.

1. Zoom into node — complex, intertwined with delete, navigation, undo. Collapse/expand sufficient for v1. Discussed during spec, deliberately deferred.
2. Breadcrumb navigation — depends on zoom
3. Undo / redo — needs own design cycle. Design notes captured at docs/reference/undo-redo-design-notes.md. collapsedIds separated from items specifically to keep undo surface clean.
4. Persistence — auto-save via onSnapshot discussed but behavior not fully specified. Needs discussion: when saves fire, error handling, corrupt data recovery.
5. Rich text / markdown — v2 component-level change in OutlineNode. Does not affect store, model, or architecture. Decision between WYSIWYG (TipTap/ProseMirror) and visible markdown (Checkvist-style) deferred.
6. Vim-like modal editing — reserved for v2. Architecture supports it (editing flag + keyboard handler). Not a retrofit.
7. Authentication / user accounts
8. Supabase backend / sync
9. Search / filter
10. Sharing / collaboration
11. Sidebar navigation (toggleable)
12. Drag and drop reordering
13. Notes on nodes (Shift+Enter) — adds model field
14. Mark complete / strikethrough — adds model field
15. Duplicate node
16. Multi-select — item-level selection, batch operations, visual mode
17. Multiple lists (Checkvist-style)


# Reference — Keyboard Shortcuts

Full Workflowy reference: docs/reference/workflowy-shortcuts.md (49 shortcuts)

Shortcuts below are the v1 candidates. Exact bindings will be revisited
per-feature during implementation.

## v1 — include

Core Editing:
  Enter               new sibling below
  Enter (mid-text)    split node at cursor — text after cursor becomes new sibling
  Backspace (empty)   delete empty node, focus previous sibling
  Backspace (start)   merge current node's text into previous sibling
  Ctrl+Shift+Bksp     force-delete node + all children regardless of content

Indentation:
  Tab                 indent — make child of previous sibling
  Alt+Shift+Right     indent (alternative binding)
  Shift+Tab           outdent — move to parent's level after parent
  Alt+Shift+Left      outdent (alternative binding)

Reordering (within siblings only):
  Alt+Shift+Up        move node up among siblings
  Alt+Shift+Down      move node down among siblings

Navigation:
  Up arrow            move focus to previous visible node
  Down arrow          move focus to next visible node

Expand / Collapse:
  Ctrl+Down           expand focused node
  Ctrl+Up             collapse focused node

## v1 — deprioritized (implement if time allows)

Expand / Collapse:
  Ctrl+Space           expand/collapse all siblings at same level
  Ctrl+Space+Space     expand/collapse ALL children recursively

System:
  Ctrl+?               show keyboard shortcuts help panel

## skip (not v1)

  Zoom shortcuts       zoom feature skipped for v1
  Undo/redo            needs own design cycle (see docs/reference/undo-redo-design-notes.md)
  Rich text formatting no rich text in v1
  Notes (Shift+Enter)  adds model field
  Complete (Ctrl+Enter) adds model field
  Duplicate            new feature
  Search / Jump-to     new subsystem
  Multi-select         new subsystem
  Copy link / Mirror   new features
  Move To dialog       new feature
  Sidebar toggle       no sidebar in v1
  Star page            new feature
  Print                browser handles natively
