A keyboard-driven outliner for thinking in trees.
Multi-level undo. Full change history. Every edit recoverable.

# Design Philosophy

- Simple, small, robust. Easy to read, easy to maintain.
- Performance does not matter. Optimize for clarity and simplicity.
- Dependency count and bundle size are non-issues for decisions.
- Use libraries for more robust code — less hand-written, less to maintain.
- Fancy is the enemy of done. Pick the boring approach.
- Small codebase over clever codebase.
- This applies everywhere, tests, any other code that we must maintain.
- DX (Developer Experience) is very important.
- All data is recoverable — saved state, in-flight edits,
  and full change history. Nothing is silently lost.

# Tech Stack

1. VanJS
2. Tailwind 4
3. vite
4. typescript

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

# Visual Direction

1. Dark theme
2. Bottom mode indicator (NAV/EDIT/SEARCH) — keep
