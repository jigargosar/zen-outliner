# Spike 05a — VanJS Outliner (Session A)

## Approach
- VanJS with fully reactive nodes (each property is van.state())
- Flat list rendering with CSS padding-left for indentation
- No nested ul/li DOM — all rows are siblings in a flat container
- Snapshot-based undo/redo
- Navigation history stack (back/forward)
- Search with match highlighting

## Architecture Decisions
1. Reactive nodes: text, collapsed, done, children are all van.state()
2. Flat rendering via flatVisible() — walks tree, returns [{node, depth}]
3. Each row rendered with padding-left: depth * 24px
4. VanJS binding functions (() => expr) for per-element auto-subscriptions
5. Undo: JSON.stringify full tree before each action, push to stack
6. Nav history: separate stack from undo — tracks focus positions
7. Search: filters by text match, highlights matches with bg-yellow

## Features Implemented
1. Hierarchical list — indent, outdent, reorder, collapse/expand
2. Keyboard-first — nav mode + edit mode
3. Undo/redo — multi-level snapshot-based (Ctrl+Z / Ctrl+Shift+Z)
4. Zoom — focus on subtree, breadcrumb trail (z / Escape)
5. Navigation history — back/forward (Alt+Left / Alt+Right)
6. Persistence — localStorage auto-save
7. Mark done — Space to toggle strikethrough
8. Search — Ctrl+F, Enter/Shift+Enter to cycle matches
9. Help overlay — ? key

## Open Questions
1. Does flat rendering feel right UX-wise? No nested visual cues.
2. Undo snapshots the entire tree — OK for hundreds of nodes, what about thousands?
3. VanJS binding functions in renderRow create new closures on every derive — memory concern?
4. oncreate on input for focus — does VanJS support this lifecycle hook?
5. Search doesn't auto-expand collapsed parents containing matches.
