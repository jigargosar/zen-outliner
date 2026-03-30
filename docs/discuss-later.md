# Discussion Items

Topics to address after the current milestone (visual polish + blog post).

## Data Model

1. **Flat map vs nested tree** — current nested TreeNode requires O(n) walks for find/parentOf. Flat map with parent pointers would be O(1) lookup. Trade-off: simplicity vs performance (performance doesn't matter per foundations.md, but API clarity does).

2. **fractional-indexing** — already in dependencies, unused. Intended for ordered sibling storage. Discuss whether to adopt for node ordering when persistence is more mature.

3. **Signals usage** — are we using Preact Signals idiomatically? Currently reading .value inside component bodies opts out of fine-grained reactivity. May not matter at current scale. Discuss when/if it becomes a problem.

4. **Immutable updates vs in-place mutation** — current pattern mutates nodes then shallow-copies the root array. Type analyzer recommended readonly TreeNode fields. This becomes important if/when undo is added.
