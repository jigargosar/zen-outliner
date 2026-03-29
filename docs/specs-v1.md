Zen Outliner — Specification

This spec captures known behaviors, not all possible behaviors.
It is not exhaustive. New items should be added retroactively
as behaviors are discovered, decided, or clarified.

# Tech Stack

1. VanJS 1.6.0 — use van.state() for all mutable node properties
   and app state. Use van.derive() for reactive rendering.
   No manual render triggers or bump() patterns.
2. Tailwind CSS 4.2.2 via @tailwindcss/vite plugin
3. Vite 8 dev server
4. All dependencies come from the root project's package.json.
   Spikes must not create their own package.json.
5. Plain JavaScript, not TypeScript

# Modes

1. The app starts in nav mode
2. Nav mode is for navigating and operating on nodes
3. Edit mode is for changing a node's text
4. Search mode is for filtering and jumping to nodes
5. The current mode is always visible in the UI

# Navigation

6. Focus moves to the sensible default position after every action
7. The focused node is always visible in the current view, unless the view is empty
8. Up moves focus to the previous visible node
9. Down moves focus to the next visible node
10. Collapsed children are not visible and are skipped
11. Collapsing a node that contains the focused node moves focus to the collapsed parent
12. Left collapses the focused node if it has children and is expanded
13. Left moves focus to the parent if the node is collapsed or has no children
14. Left does nothing if the node is at the zoom boundary root
15. Right expands the focused node if it is collapsed
16. Right moves focus to the first child if the node is expanded
17. Right does nothing if the node has no children
18. Click focuses the clicked node and switches to nav mode
19. Double-click focuses the clicked node and enters edit mode
20. Clicking a bullet toggles collapse on nodes with children

# Indent and Outdent

21. Tab indents the focused node under the sibling above it
22. Tab does nothing if the node is the first sibling
23. Tab auto-expands the target parent if it was collapsed
24. Tab preserves all children — they move with the node
25. Shift+Tab outdents the focused node, placing it after its former parent
26. Shift+Tab does nothing if the node is at root level
27. Shift+Tab does nothing if the node is at the zoom boundary
28. Shift+Tab preserves all children — they move with the node
29. Tab and Shift+Tab also work in edit mode

# Reorder

30. Alt+Up swaps the focused node with the sibling above it
31. Alt+Up does nothing if the node is the first sibling
32. Alt+Down swaps the focused node with the sibling below it
33. Alt+Down does nothing if the node is the last sibling
34. Reordering preserves all children — they move with the node

# Editing

35. Enter enters edit mode on the focused node
36. Enter in edit mode saves the text and creates a new empty sibling below
37. Enter on empty text in edit mode deletes the node and returns to nav mode
38. Enter on an empty list creates a new node and enters edit mode
39. Escape in edit mode discards changes and returns to nav mode
40. Editing only triggers undo if the text actually changed

# Delete

41. Backspace or Delete removes the focused node and all its descendants

# Mark Done

42. Space toggles done on the focused node
43. Done nodes show strikethrough and dimmed text

# Zoom

44. z zooms into the focused node, making it the view root
45. z does nothing if the focused node has no children
46. Escape zooms out to the parent of the current zoom root
47. Escape does nothing if already at the document root
48. A breadcrumb trail shows the path from Home to the current zoom root
49. Clicking a breadcrumb zooms to that level
50. Outdent cannot escape the zoom boundary

# Navigation History

51. Navigation history tracks focus changes and other sensible events, and does not capture bursts
52. Alt+Left goes back in history
53. Alt+Right goes forward in history

# Undo and Redo

54. Ctrl+Z undoes the last mutation, restoring tree state and focus position
55. Ctrl+Shift+Z redoes the last undone mutation
56. Any new mutation after undo clears the redo stack
57. Ctrl+Z and Ctrl+Shift+Z work in all modes

# Search

58. / opens the search input
59. Typing filters visible nodes to those matching the query
60. Matching text is highlighted in the results
61. Ancestors of matching nodes stay visible to preserve tree context
62. Enter jumps to the first match and closes search
63. Escape closes search, clears the filter, and restores the full view
64. Search covers the entire document, not just the zoom scope

# Persistence

65. The tree auto-saves to localStorage on every mutation
66. The tree loads from localStorage on startup
67. If storage is empty, corrupt, or contains no nodes, default data is loaded
68. Loading errors are surfaced to the user
69. First launch shows a welcome list that documents the keyboard shortcuts

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

These are not spec items. They are implementation pitfalls
discovered during spike development that repeatedly cause bugs.
When a bug is found during spike testing, add a one-line gotcha
here describing the trap, not the fix.

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
