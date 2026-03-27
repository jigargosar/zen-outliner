Undo/Redo Design Notes

Captured from v1 brainstorming session. Not in v1 scope, but design
decisions were made during v1 that affect undo/redo when it's built.


# Decisions already made

1. collapsedIds lives on the store, NOT on items
   a. Reason: if collapsed were a boolean on each item, toggling
      collapse would create undo history
   b. Ctrl+Z might just toggle a collapse instead of undoing a
      real content edit — broken UX
   c. Same reasoning applies to zoomId — view state, not data

2. OutlineItem has only 4 fields: id, parentId, content, order
   a. Pure data, no view state mixed in
   b. The undo surface is clean — every change to an item IS
      a content/structure change worth undoing


# Open questions for undo/redo design

1. What counts as one undo step?
   a. Typing "hello" — is that 1 undo or 5 keystrokes?
   b. Needs debouncing or grouping (e.g., group rapid typing
      into one step, split on pause)

2. What is excluded from undo tracking?
   a. collapsedIds — view state, not undoable
   b. zoomId — navigation state, not undoable
   c. UndoManager needs explicit configuration for this

3. Compound operations
   a. Indent changes both parentId and order in one action
   b. Should undo restore both atomically (one undo = one indent)
   c. Need to verify mobx-bonsai UndoManager groups these

4. Undo a delete
   a. Re-creates the node and all descendants
   b. Where does focus go after undo?
   c. What if the parent was also deleted?

5. Undo grouping for rapid actions
   a. User types Enter Enter Enter (3 new nodes fast)
   b. Is that 3 undos or 1?


# mobx-bonsai UndoManager

The library provides UndoManager which tracks observable changes
and supports undo/redo. Key things to investigate when building:

1. How to exclude specific observable properties from tracking
2. How to group multiple mutations into one undo step
3. How debouncing works (if built in, or needs custom logic)
4. Memory limits — how many undo steps before it drops old ones


# Keyboard shortcuts (reserved)

  Undo:     Ctrl+Z / Cmd+Z
  Redo:     Ctrl+Shift+Z / Cmd+Shift+Z
  Redo alt: Ctrl+Y / Cmd+Y
