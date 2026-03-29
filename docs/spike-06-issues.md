Spike 06 Issues

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

# Next Spike Setup

1. Create a project-local agent for building spikes that:
   a. Can read: docs/specs-v1.md (spec + gotchas + invariants)
   b. Can read: docs/ux.md (UX principles + visual direction)
   c. Cannot read: any spike code (spikes/*)
   d. Cannot read: issues/bugs sections
   e. Must read VanJS documentation (or relevant lib docs)
   f. Ensures spike independence per CLAUDE.md rule
   g. Build without search — search UX needs investigation first

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
