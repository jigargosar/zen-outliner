UX

# Principles

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

# Visual Direction

1. Dark theme by default — light theme hurts eyes
2. Selection highlight needs high contrast — easy to spot
3. Left border highlight on focused node — keep
4. Bottom mode indicator (NAV/EDIT/SEARCH) — keep
