Spike 06 Issues

# UX Principles

1. No layout shifts. Elements must not move other elements when
   state changes. Exception: only with explicit justification.

   Common violations:
   a. Search bar appearing inline pushes tree content down
   b. Breadcrumbs appearing on zoom push tree content down
   c. Borders on selection changing element size
   d. Hover effects adding padding or borders
   e. Inset borders shifting content inside the element

   Fix: reserve space always (e.g. Home icon always visible,
   transparent borders that change color on selection).

2. Use flex/grid layouts for complete control over positioning.
   No inline overlays. Layout should be predictable and
   structured, not ad-hoc positioned elements.

3. Avoid hover states when selection exists. Selection is the
   primary indicator — hover adds noise.

4. All selections must be tracked — the selected item must
   always be visible in the current view, never scrolled out
   of sight.

# Visual Issues

1. Selection highlight has extremely low contrast — hard to spot
2. App should default to dark theme — light theme hurts eyes
3. Left border highlight and bottom mode indicator are good — keep

# DBC Invariants (pending — for next spike and spec)

Assert after every state-mutating action. Throw on violation.

1. items.length > 0 — document never empty
2. find(focusId.val) !== null — focus points to real node
3. zoomStack.every(id => find(id) !== null) — no stale zoom refs
4. ['nav', 'edit'].includes(mode.val) — valid mode
5. No duplicate IDs in tree — tree integrity

# Performance

1. Large list testing — scrolling, undo/redo with 5000+ nodes.
   Don't assume it works, verify. (Search perf merged into
   Search UX investigation below.)

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

# Next Spike Setup

1. Create a project-local agent for building spikes that:
   a. Can read: docs/specs-v1.md (spec + gotchas + invariants)
   b. Can read: docs/spike-06-issues.md (UX principles only)
   c. Cannot read: any spike code (spikes/*)
   d. Cannot read: issues/bugs sections
   e. Must read VanJS documentation (or relevant lib docs)
   f. Ensures spike independence per CLAUDE.md rule

# Needs Investigation — Search UX

Search needs thorough rethink. Known issues merged here:

1. Search input recreates on every keystroke causing lag —
   the search bar derive rebuilds the input element when
   searchQuery changes, destroying and refocusing it each time.
2. Large list search performance — untested with 5000+ nodes
3. Layout shift on open
4. Navigation during search — how do Up/Down work on filtered results
5. Enter behavior — first match? Current selection?
6. Where does focus land after search closes
7. How are parent/ancestor nodes displayed in filtered view
8. Hidden vs dimmed for non-matching nodes
9. Result count display
10. Live filtering vs debounced
