# Spike 05b — VanJS Outliner (Session B)

## Must-Haves Implemented

1. Hierarchical list — indent, outdent, reorder, collapse/expand
2. Keyboard-first — nav/edit modes, all operations via keys
3. Undo/redo — snapshot-based, Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y
4. Zoom — focus on subtree, breadcrumb trail back
5. Navigation history — Alt+Left / Alt+Right (ephemeral, not persisted)
6. Persistence — localStorage (auto-save on every state change)
7. Mark done — Space to toggle, strikethrough + dimmed
8. Search/filter — / to open, filters non-matches, highlights matches, Escape to clear

## Architecture

### Flat List Rendering
Every node renders as a div at the same DOM level. Depth is expressed
via `padding-left: depth * 24px`. No nested ul/li.

Why: indent/outdent changes a depth number, not DOM structure. No
reparenting. Focus survives structural changes.

### Reactive Nodes
Each node property is van.state():
```
{ id, text: van.state(''), collapsed: van.state(false), done: van.state(false), children: van.state([]) }
```
Toggling done or editing text is a .val write — no render trigger needed.

### Immutable Array Updates
van.state() only fires on .val reassignment. Array mutations like splice
are invisible. All children updates use:
```
parent.children.val = parent.children.val.filter(...)  // reassignment triggers derive
```

### bump() — Still Present
The root `items` array is a plain variable, not van.state(). Structural
changes (indent, delete, reorder) call bump() to trigger the tree derive.
Node property changes (text, done, collapsed) do NOT need bump().

Eliminating bump() would require making `items` a van.state. Tradeoff:
every `items = ...` becomes `items.val = ...`. Chose not to this pass.

### Snapshot Undo/Redo
Each mutating action calls pushUndo() which serializes the full tree to
JSON. Undo deserializes the snapshot and replaces all nodes. Redo is the
inverse stack. Cap: 100 undo entries.

Simple and correct. Cost is O(n) serialize per action — fine per design
philosophy (performance does not matter).

### Navigation History
Browser-style back/forward stack for focus positions. pushNav() records
each focus change. Alt+Left/Right traverses. Ephemeral — resets on page
load. Cap: 200 entries.

## Keyboard Shortcuts

| Key | Mode | Action |
|-----|------|--------|
| ↑ / ↓ | nav | Move focus |
| ← | nav | Collapse or move to parent |
| → | nav | Expand or move to first child |
| Enter | nav | Start editing |
| Enter | edit | Save + create new sibling (or delete if empty) |
| Escape | edit | Save and return to nav |
| Escape | nav | Zoom out (or clear search) |
| Tab | both | Indent |
| Shift+Tab | both | Outdent |
| Alt+↑/↓ | nav | Reorder among siblings |
| Space | nav | Toggle done |
| Backspace/Delete | nav | Delete focused node |
| z | nav | Zoom into focused node |
| / | nav | Open search |
| Ctrl+Z | any | Undo |
| Ctrl+Shift+Z | any | Redo |
| Ctrl+Y | any | Redo |
| Alt+← | nav | Navigation history back |
| Alt+→ | nav | Navigation history forward |
| Double-click | any | Edit clicked node |

## Known Limitations

1. bump() still required for root array mutations
2. No export/import UI (data is in localStorage only)
3. Search highlights first match per node only
4. No drag and drop
5. No large list virtualization (not needed per philosophy)
6. Undo captures full snapshot — memory grows with deep undo on large trees
