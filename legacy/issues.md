Issues

# State Issues

1. Undo/redo stacks lost on page reload — in-memory only,
   user expects undo to survive since tree auto-saves
2. Collapsing a parent while its child is focused or being
   edited makes the focused node invisible
3. Concurrent tabs overwrite each other's localStorage
4. Undo stack memory — 200 snapshots of large trees could
   consume significant memory

# Accessibility

1. Tab key trap — Tab always indents, no way to Tab out of
   the app for keyboard navigation to other page elements

# Data Loss

1. localStorage quota exceeded fails silently — user thinks
   data is saved but it isn't

# Performance

1. Large list testing — scrolling, undo/redo with 5000+ nodes.
   Don't assume it works, verify.

# Needs Spec — Editing Behavior

1. Enter in edit mode creates new sibling — is this always
   the right behavior? What about Enter to just confirm edit?
2. Escape on empty node leaves the empty node in the tree —
   should it delete the empty node instead?
3. Empty document state — Enter creates a node, but what
   should the UX feel like? Cursor placement, mode transitions?
4. Tab works in edit mode (indent/outdent) but other nav keys
   don't — should arrow keys, Space, Delete work during edit?
   Decide which keys are editing keys vs action keys in edit mode.
5. Remap primary controls to vim-like bindings (j/k/h/l)
6. How is focus restored on reload? Should focusId be persisted
   and restored from localStorage?

# Needs Investigation — Search UX

Search needs thorough rethink. Known issues:

1. Search input recreates on every keystroke causing lag
2. Large list search performance — untested with 5000+ nodes
3. Layout shift on open
4. Navigation during search — how do Up/Down work on filtered results
5. Enter behavior — first match? Current selection?
6. Where does focus land after search closes
7. How are parent/ancestor nodes displayed in filtered view
8. Hidden vs dimmed for non-matching nodes
9. Result count display
10. Live filtering vs debounced
