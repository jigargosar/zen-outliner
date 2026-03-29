Zen Outliner — Specification

This spec captures known behaviors, not all possible behaviors.
It is not exhaustive. New items should be added retroactively
as behaviors are discovered, decided, or clarified.

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
11. Left collapses the focused node if it has children and is expanded
12. Left moves focus to the parent if the node is collapsed or has no children
13. Left does nothing if the node is at the zoom boundary root
14. Right expands the focused node if it is collapsed
15. Right moves focus to the first child if the node is expanded
16. Right does nothing if the node has no children
17. Click focuses the clicked node and switches to nav mode
18. Double-click focuses the clicked node and enters edit mode
19. Clicking a bullet toggles collapse on nodes with children

# Indent and Outdent

20. Tab indents the focused node under the sibling above it
21. Tab does nothing if the node is the first sibling
22. Tab auto-expands the target parent if it was collapsed
23. Tab preserves all children — they move with the node
24. Shift+Tab outdents the focused node, placing it after its former parent
25. Shift+Tab does nothing if the node is at root level
26. Shift+Tab does nothing if the node is at the zoom boundary
27. Shift+Tab preserves all children — they move with the node
28. Tab and Shift+Tab also work in edit mode

# Reorder

29. Alt+Up swaps the focused node with the sibling above it
30. Alt+Up does nothing if the node is the first sibling
31. Alt+Down swaps the focused node with the sibling below it
32. Alt+Down does nothing if the node is the last sibling
33. Reordering preserves all children — they move with the node

# Editing

34. Enter enters edit mode on the focused node
35. Enter in edit mode saves the text and creates a new empty sibling below
36. Enter on empty text in edit mode deletes the node and returns to nav mode
37. Enter on an empty list creates a new node and enters edit mode
38. Escape in edit mode discards changes and returns to nav mode
39. Editing only triggers undo if the text actually changed

# Delete

40. The document must always contain at least one node
41. Backspace or Delete removes the focused node and all its descendants
42. Delete does nothing if it is the last remaining node

# Mark Done

43. Space toggles done on the focused node
44. Done nodes show strikethrough and dimmed text

# Zoom

45. z zooms into the focused node, making it the view root
46. z does nothing if the focused node has no children
47. Escape zooms out to the parent of the current zoom root
48. Escape does nothing if already at the document root
49. A breadcrumb trail shows the path from Home to the current zoom root
50. Clicking a breadcrumb zooms to that level
51. Outdent cannot escape the zoom boundary

# Navigation History

52. Navigation history tracks focus changes and other sensible events, and does not capture bursts
53. Alt+Left goes back in history
54. Alt+Right goes forward in history

# Undo and Redo

55. Ctrl+Z undoes the last mutation, restoring tree state and focus position
56. Ctrl+Shift+Z redoes the last undone mutation
57. Any new mutation after undo clears the redo stack
58. Ctrl+Z and Ctrl+Shift+Z work in all modes

# Search

59. / opens the search input
60. Typing filters visible nodes to those matching the query
61. Matching text is highlighted in the results
62. Ancestors of matching nodes stay visible to preserve tree context
63. Enter jumps to the first match and closes search
64. Escape closes search, clears the filter, and restores the full view
65. Search covers the entire document, not just the zoom scope

# Persistence

66. The tree auto-saves to localStorage on every state change
67. The tree loads from localStorage on startup
68. If storage is empty, corrupt, or contains no nodes, default data is loaded
69. Loading errors are surfaced to the user
70. First launch shows a welcome list that documents the keyboard shortcuts

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

1. items.length > 0 — document never empty
2. find(focusId.val) !== null — focus points to real node
3. zoomStack.every(id => find(id) !== null) — no stale zoom refs
4. ['nav', 'edit'].includes(mode.val) — valid mode
5. No duplicate IDs in tree — tree integrity
