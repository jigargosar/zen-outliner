Holding Area

Unapproved proposals. Once approved, items move to their final homes.

# Spec Amendments — Removing Ambiguity From Bugs Found

Amend spec 54 (undo):
  BEFORE: Ctrl+Z undoes the last mutation, restoring tree state
          and focus position
  AFTER:  Ctrl+Z undoes the last mutation, restoring tree state
          and focus position. Node identity is preserved across
          undo and redo — the same node retains focus after restore.

Amend spec 40 (delete):
  BEFORE: Backspace or Delete removes the focused node and all
          its descendants
  AFTER:  Backspace or Delete removes the focused node and all
          its descendants. The tree must always have at least
          one node.

Drop spec 41:
  "Delete does nothing if it is the last remaining node"
  — now redundant with amended spec 40

# Testing Recommendation: Runtime Invariants, Not Separate Tests

After every action that mutates state, assert:

1. items has at least one node
2. focusId points to a node that exists in the tree
3. No duplicate IDs in the tree
4. mode is 'nav' or 'edit'

Implementation: one function, ~10 lines, called after
every action. Throws immediately on violation. Runs in
microseconds. Always on — not a separate test you run.

Why this beats every other option:

1. No test files to maintain — invariants live in the app
2. No test runner to configure — always running
3. Can't be stale — if the app works, invariants passed
4. Catches bugs at the moment they happen, not later
5. Fast — microseconds, not seconds
6. "Who tests the tests?" — invariants are trivially correct.
   assert(find(focusId.val) !== null) can't be wrong.
7. Zero DX friction — no command to run, no output to read.
   You just use the app. If it breaks, you see it instantly.

What it doesn't cover: it won't tell you "Tab should indent" — that's behavioral. But the bugs we found (B1, B3, B5) were all state corruption bugs, not behavioral bugs. Invariants catch exactly that class.

Behavioral correctness comes from the spec being clear and the implementation following it. State corruption comes from code bugs. Different problems, different solutions.
