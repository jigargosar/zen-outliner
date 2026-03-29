Foundations

Project-level decisions and principles that apply regardless
of implementation approach.

# Tech Stack

1. VanJS 1.6.0 — use van.state() for all mutable node properties
   and app state. Use van.derive() for reactive rendering.
   No manual render triggers or bump() patterns.
2. Tailwind CSS 4.2.2 via @tailwindcss/vite plugin
3. Vite 8 dev server
4. All dependencies come from the root project's package.json.
5. Plain JavaScript, not TypeScript

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

1. Dark theme by default — light theme hurts eyes
2. Selection highlight needs high contrast — easy to spot
3. Left border highlight on focused node — keep
4. Bottom mode indicator (NAV/EDIT/SEARCH) — keep

# Gotchas

Implementation pitfalls discovered during spike development
that repeatedly cause bugs. Add new gotchas as they are found.

1. Undo/redo with serialization can silently break focus if
   node identity is lost during the round-trip.

2. Deleting a parent also removes its descendants — guards
   based on visible node count will undercount.

3. Keyboard events from focused input elements bubble to
   global handlers, causing actions to fire twice.

4. Search scoped to the current zoom root will miss matches
   in the rest of the document.

# Invariants

Assert after every state-mutating action. Throw on violation.

1. items.length === 0 || find(focusId.val) !== null — focus points to real node or document is empty
2. zoomStack.every(id => find(id) !== null) — no stale zoom refs
3. ['nav', 'edit'].includes(mode.val) — valid mode
4. No duplicate IDs in tree — tree integrity
