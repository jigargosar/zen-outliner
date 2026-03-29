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

# Bugs

1. Search input recreates on every keystroke causing lag —
   the search bar derive rebuilds the input element when
   searchQuery changes, destroying and refocusing it each time.

# Visual Issues

1. Selection highlight has extremely low contrast — hard to spot
2. App should default to dark theme — light theme hurts eyes
3. Left border highlight and bottom mode indicator are good — keep

# Needs Investigation

1. Search UX needs thorough investigation:
   a. Layout shift on open
   b. Navigation during search — how do Up/Down work on filtered results
   c. Enter behavior — first match? Current selection?
   d. Where does focus land after search closes
   e. How are parent/ancestor nodes displayed in filtered view
   f. Hidden vs dimmed for non-matching nodes
   g. Result count display
   h. Live filtering vs debounced
