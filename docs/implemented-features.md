# zen-outliner — Feature Inventory

Live: https://jigargosar.github.io/zen-outliner/

## Navigation (NAV mode)

1. ↑/↓ — Move focus up/down through visible nodes
2. ← — Collapse expanded parent, or jump to parent
3. → — Expand collapsed parent, or jump to first child
4. Click — Focus a node
5. Dbl-click — Focus + enter edit mode

## Editing

6. F2 — Enter edit mode on focused node
7. Enter — Add empty sibling below + enter edit mode
8. Escape — Cancel edit (auto-deletes if text is empty)
9. Enter (in edit mode) — Commit text change
10. Backspace (in edit mode, empty text) — Delete node

## Tree Operations

11. Space — Toggle done (strikethrough)
12. Tab — Indent (become child of previous sibling)
13. Shift+Tab — Outdent (move to parent's level)
14. Backspace (NAV mode) — Delete focused node
15. Delete (NAV mode) — Delete focused node

## Data Safety

16. Ctrl+Z — Undo last structural change (50 deep)
17. Ctrl+E — Export tree as JSON file
18. Auto-save — localStorage on every change
19. Auto-load — Restore tree + focus on page load

## UI

20. Status bar — NAV (blue) / EDIT (amber) mode indicator
21. ? key — Toggle keyboard shortcuts help panel
22. Shortcuts btn — Same as ? key, in status bar
23. Blue left border — Focus indicator in NAV mode
24. Amber left border — Focus indicator in EDIT mode
25. Bullet icons — ▶ collapsed, ▼ expanded, • leaf

## Infrastructure

26. 38 unit tests (store.test.ts)
27. 45 e2e tests (Playwright)
28. GitHub Pages auto-deploy on push
29. TypeScript strict mode, zero errors
