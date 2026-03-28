# Zen Outliner — Specification

## Modes

1. The app starts in nav mode
2. Nav mode is for navigating and operating on nodes
3. Edit mode is for changing a node's text
4. Search mode is for filtering and jumping to nodes
5. The current mode is always visible in the UI

## Navigation

6. Up moves focus to the previous visible node
7. Down moves focus to the next visible node
8. Collapsed children are not visible and are skipped
9. Left collapses the focused node if it has children and is expanded
10. Left moves focus to the parent if the node is collapsed or has no children
11. Left does nothing if the node is at the zoom boundary root
12. Right expands the focused node if it is collapsed
13. Right moves focus to the first child if the node is expanded
14. Right does nothing if the node has no children
15. Click focuses the clicked node and switches to nav mode
16. Double-click focuses the clicked node and enters edit mode
17. Clicking a bullet toggles collapse on nodes with children

## Indent and Outdent

18. Tab indents the focused node under the sibling above it
19. Tab does nothing if the node is the first sibling
20. Tab auto-expands the target parent if it was collapsed
21. Tab preserves all children — they move with the node
22. Shift+Tab outdents the focused node, placing it after its former parent
23. Shift+Tab does nothing if the node is at root level
24. Shift+Tab does nothing if the node is at the zoom boundary
25. Shift+Tab preserves all children — they move with the node
26. Tab and Shift+Tab also work in edit mode

## Reorder

27. Alt+Up swaps the focused node with the sibling above it
28. Alt+Up does nothing if the node is the first sibling
29. Alt+Down swaps the focused node with the sibling below it
30. Alt+Down does nothing if the node is the last sibling
31. Reordering preserves all children — they move with the node

## Editing

32. Enter enters edit mode on the focused node
33. Enter in edit mode saves the text and creates a new empty sibling below
34. Enter on empty text in edit mode deletes the node and returns to nav mode
35. Escape in edit mode discards changes and returns to nav mode
36. Editing only triggers undo if the text actually changed

## Delete

37. Backspace or Delete removes the focused node and all its descendants
38. Focus moves to the node above after deletion
39. Delete does nothing if it is the last remaining node

## Mark Done

40. Space toggles done on the focused node
41. Done nodes show strikethrough and dimmed text

## Zoom

42. z zooms into the focused node, making it the view root
43. z does nothing if the focused node has no children
44. Escape zooms out to the parent of the current zoom root
45. Escape does nothing if already at the document root
46. A breadcrumb trail shows the path from Home to the current zoom root
47. Clicking a breadcrumb zooms to that level
48. Outdent cannot escape the zoom boundary

## Navigation History

49. Navigation history tracks focus changes and other sensible events, and does not capture bursts
50. Alt+Left goes back in history
51. Alt+Right goes forward in history

## Undo and Redo

52. Ctrl+Z undoes the last mutation, restoring tree state and focus position
53. Ctrl+Shift+Z redoes the last undone mutation
54. Any new mutation after undo clears the redo stack
55. Ctrl+Z and Ctrl+Shift+Z work in all modes

## Search

56. / opens the search input
57. Typing filters visible nodes to those matching the query
58. Matching text is highlighted in the results
59. Ancestors of matching nodes stay visible to preserve tree context
60. Enter jumps to the first match and closes search
61. Escape closes search, clears the filter, and restores the full view
62. Search covers the entire document, not just the zoom scope

## Persistence

63. The tree auto-saves to localStorage on every state change
64. The tree loads from localStorage on startup
65. If storage is empty, corrupt, or contains no nodes, default data is loaded
66. First launch shows a welcome list that documents the keyboard shortcuts
