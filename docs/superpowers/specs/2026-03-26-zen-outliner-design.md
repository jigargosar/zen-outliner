# zen-outliner — Design Spec (v1)

## What

A Workflowy clone. Infinite-nesting outliner. Dark mode only. Get to working state, then refine.

## Stack

- React + TypeScript + Vite
- Tailwind CSS (dark mode only)
- mobx-bonsai + mobx-react-lite (state, snapshots, future undo)
- fractional-indexing (string-based ordering)
- localStorage (JSON) for persistence
- No auth, no backend, no Supabase (for now)
- SPA — single page application

## Core Features (v1)

1. Infinite nesting — nodes can nest arbitrarily deep
2. Expand / collapse any node with children
3. Zoom into any node (click bullet or keyboard shortcut)
4. Breadcrumb navigation to zoom back out
5. Keyboard-driven (see Keyboard Shortcuts section below)
6. localStorage persistence — auto-save on every change


## Keyboard Shortcuts

Full reference: docs/reference/workflowy-shortcuts.md (49 total Workflowy shortcuts)

Win keybindings shown. Mac substitutes Cmd for Ctrl, Alt for Cmd where noted.

### v1 — include

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

Reordering:
  Alt+Shift+Up        move node up among siblings
  Alt+Shift+Down      move node down among siblings

Navigation:
  Up arrow            move focus to previous visible node
  Down arrow          move focus to next visible node
  Alt+.               zoom into focused node (Alt+Right also works)
  Alt+,               zoom out one level (Alt+Left also works)
  Ctrl+'              zoom to home (root)

Expand / Collapse:
  Ctrl+Down           expand focused node
  Ctrl+Up             collapse focused node

### v1 — deprioritized (implement if time allows)

Expand / Collapse:
  Ctrl+Space           expand/collapse all siblings at same level
  Ctrl+Space+Space     expand/collapse ALL children recursively

Navigation:
  Alt+Shift+9          jump to previous sibling's zoomed view
  Alt+Shift+0          jump to next sibling's zoomed view

System:
  Ctrl+?               show keyboard shortcuts help panel

### skip (not v1)

  Undo/redo            needs own design cycle (see docs/reference/undo-redo-design-notes.md)
  Rich text formatting no rich text in v1 (bold, italic, underline, strikethrough, code, highlight)
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

## Visual Design

- Dark mode only (#1a1a1a background)
- Workflowy-exact visual style — content IS the interface
- Every node has a bullet dot (small filled circle)
- Collapsed nodes: ring/circle around the bullet
- Leaf nodes: slightly smaller, dimmer dot
- Hover a parent node: collapse/expand triangle (▼/►) fades in to the LEFT of the bullet
- Vertical connector lines run from parent through child bullets (same x-axis)
- Centered content area (~700px max-width)
- Spacious line height, generous padding
- No sidebar in v1 (toggleable sidebar is a future feature)
- No toolbar, no chrome — just the outline

## Empty State

- Single empty node with blinking cursor and "Start typing..." placeholder

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
zoomId:       string | null  — which item is zoomed into (view state)
```

### Computed indexes (derived, not stored)
```
itemsById:          Map<string, OutlineItem>           — O(1) ID lookup
childrenByParentId: Map<string | null, OutlineItem[]>  — O(1) children lookup, sorted by order
```

### Key decisions
- Flat array — mutations are single-field changes (parentId for indent/outdent, order for reorder)
- No collapsed field on items — collapse is view state, not data. Keeps undo/redo clean, keeps Supabase schema clean.
- Fractional indexing — insert between any two items without reindexing siblings
- Computed indexes — MobX recalculates on mutation, caches until next change
- Maps directly to Supabase rows when backend is added later

## Out of Scope (v1)

1. Authentication / user accounts
2. Supabase backend / sync
3. Search / filter
4. Sharing / collaboration
5. Sidebar navigation
6. Rich text / markdown in nodes
7. Drag and drop reordering
8. Undo / redo (needs own design cycle — see docs/reference/undo-redo-design-notes.md)
9. Notes on nodes (Shift+Enter)
10. Mark complete / strikethrough
11. Duplicate node
12. Multi-select
13. Vim-like modal editing (reserved for v2)
