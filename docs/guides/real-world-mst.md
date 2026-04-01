# Real-World MST Projects & Patterns for Tree-Structured Data

Research into how production projects and the community use MobX-State-Tree
(MST) for outliners, note apps, nested lists, and hierarchical UIs.

---

## 1. Notable Open-Source Projects Using MST

### fluid-outliner (archived)

**Repo:** <https://github.com/fluid-notion/fluid-outliner>
**Stars:** ~47 | **License:** GPL-3.0 | **Archived:** Feb 2022

The closest direct analog to zen-outliner. A progressive web app outliner
("for thoughts, ideas and daily tidbits") built with TypeScript, React,
and MST. Multi-shell: PWA, Electron, Cordova.

**Architecture -- flat map + reference children (normalized):**

The key insight is that fluid-outliner does NOT use deeply nested
`types.late` recursion. Instead it uses a **flat map of all nodes** at
the Outline level, with `types.reference` for parent and children:

```ts
// Outline.ts (simplified)
export const Outline = t.model("Outline", {
    id: t.optional(t.identifier(t.string), () => uuid()),
    title: t.optional(t.string, "Untitled"),
    allNodes: t.optional(t.map(Node), { /* default root node */ }),
    children: t.optional(t.array(t.reference(Node)), [defaultRootNodeId()]),
})
```

```ts
// Node.ts (simplified)
export const Node = t.model("Node", {
    id: t.optional(t.identifier(t.string), () => uuid()),
    content: t.optional(t.string, ""),
    outline: t.reference(t.late(() => Outline)),
    parent: t.late(() => t.maybe(t.reference(Node))),
    children: t.late(() => t.optional(t.array(t.reference(Node)), [])),
    notes: t.optional(t.array(Note), () => []),
    markers: t.optional(t.array(Marker), () => []),
})
```

**Parent traversal:** Uses explicit `parent` reference stored on each
node (not MST's `getParent`). Derives an `antecedent` view that returns
`self.parent || self.outline` -- so top-level nodes fall through to the
Outline itself.

**Sibling index:** Computed view: `self.antecedent.children.indexOf(self)`

**Reparenting (indent/outdent):** Directly splices children arrays and
reassigns the `parent` reference:

```ts
indentForward() {
    const newParent = self.antecedent.children[self.siblingIdx - 1]
    self.antecedent.spliceChildren(self.siblingIdx, 1)
    newParent.spliceChildren(newParent.children.length, 0, self)
    self.parent = newParent
}
```

**Undo/redo:** Built on MST's `onPatch` -- records forward/backward
JSON patches, coalesces rapid edits within 1-second windows, caps
history at 1000 entries.

**Takeaway:** The normalized (flat map + references) approach avoids
`getParent` entirely and makes node lookups O(1). The cost is explicit
`parent` bookkeeping on every move operation.

---

### Label Studio (HumanSignal)

**Repo:** <https://github.com/HumanSignal/label-studio>
**Frontend:** `web/libs/editor` (formerly `label-studio-frontend`)
**License:** Apache-2.0

A major data-labeling platform. The frontend editor is built with React
and MST. Uses `types.compose` extensively to mix base region models
(PolygonRegionModel, BrushRegionModel, RectRegionModel, etc.) with
shared behaviors. Stores are organized as `CompletionStore`,
`RegionStore`, etc.

**Relevant patterns:**
- Heavy use of `types.compose` for model mixins
- Region collections managed via MST arrays with references
- Known production issues with reference resolution when deleting
  nodes from regionStore (#131, #637, #649)
- Uses MST's environment injection (`getEnv`) for service access

**Link:** <https://github.com/HumanSignal/label-studio-frontend>

---

### Ignite (Infinite Red)

**Repo:** <https://github.com/infinitered/ignite>
**Type:** React Native boilerplate/CLI

The most popular React Native boilerplate. Uses MST as its default state
management. Each model lives in its own directory under `app/models/`.

**Why they chose MST over Redux:**
<https://shift.infinite.red/why-infinite-red-uses-mobx-state-tree-instead-of-redux-d6c1407dead>

Not tree-structured data per se, but a well-documented production
pattern for MST model organization, testing, and React integration.

---

### Builder.io (MST Fork)

**NPM:** `@builder.io/mobx-state-tree`

Builder.io maintains a fork of MST used in their visual page editor.
The fork adds Redux store compatibility. Their editor manages a tree
of page components/blocks.

---

## 2. Recursive Tree Model Patterns in MST

### Pattern A: `types.late` for self-referencing children (nested)

The "obvious" approach. Children are inline, nested within their parent.

```ts
// Basic recursive node
const Node = types.model("Node", {
    id: types.identifier,
    text: types.string,
    children: types.optional(
        types.array(types.late((): IAnyModelType => Node)),
        []
    ),
})
```

**TypeScript gotcha:** TS cannot infer self-referencing types. You must
either:

1. Annotate the model variable with `IModelType<Snapshot, Instance>`:
   ```ts
   const Node: IModelType<Partial<INode>, INode> = types.model(...)
   ```
2. Or use `types.late((): IAnyModelType => Node)` and accept weaker
   typing on the recursive property.

**Sources:**
- <https://github.com/mobxjs/mobx-state-tree/issues/417>
- <https://github.com/mobxjs/mobx-state-tree/issues/572>
- <https://github.com/mobxjs/mobx-state-tree/issues/554>

**CodeSandbox demo -- recursive deep menu:**
<https://codesandbox.io/s/mobx-state-tree-recursive-deep-menu-p7eqj>

---

### Pattern B: Flat map + references (normalized)

Used by fluid-outliner (see above). All nodes live in a flat
`types.map(Node)`, and parent/children relationships use
`types.reference`. This is MST's recommended approach for data that
needs efficient lookup or cross-referencing.

**Pros:**
- O(1) node lookup by ID
- No `getParent` depth confusion
- Easier serialization/deserialization
- Works well with undo (patches reference paths in the flat map)

**Cons:**
- Must manually maintain parent references on every reparent
- More boilerplate for insert/remove operations
- Reference resolution errors if nodes are deleted in wrong order

**Official docs on references:**
<https://mobx-state-tree.js.org/concepts/references>

---

### Pattern C: Derived parent via `getParent(self, 2)` (MST's own tree)

Instead of storing a parent reference, derive it from MST's tree
structure. The MST maintainer (Michel Weststrate) recommended this in
issue #489:

```ts
const Org = types.model("Org", {
    id: types.string,
    name: types.string,
    children: types.optional(types.array(types.late(() => Org)), []),
})
.views(self => ({
    get parent() { return getParent(self, 2) },
    get parent_id() { return self.parent.id },
}))
```

This avoids "double bookkeeping" -- the nested structure already
encodes the relationship, so there is no need to store an explicit
parent reference.

**Source:** <https://github.com/mobxjs/mobx-state-tree/issues/489>

---

## 3. The `getParent` Array Gotcha

### The problem

`getParent(node)` returns the **immediate** parent in the MST tree.
When a node lives inside `types.array(...)`, the immediate parent is
the **array itself**, not the model that contains the array.

```
Store
  └── children (array)      <-- getParent(node) returns THIS
        └── node             <-- you are here
```

So `getParent(node, 1)` returns the array, and
`getParent(node, 2)` returns the model holding the array.

### Solutions

1. **`getParent(self, 2)`** -- Skip the array. Simple, but brittle
   if the nesting structure changes.

2. **`getParentOfType(self, ParentModel)`** -- The robust solution.
   Walks up the tree until it finds a parent matching the given MST
   type. Automatically skips arrays, maps, and intermediate models.

   ```ts
   import { getParentOfType } from "mobx-state-tree"

   .views(self => ({
       get store() {
           return getParentOfType(self, RootStore)
       },
   }))
   ```

   **Source:** <https://github.com/mobxjs/mobx-state-tree/issues/477>

3. **`hasParentOfType(self, ParentModel)`** -- Safe check before
   accessing. Returns `boolean`.

4. **Explicit parent reference** -- Store the parent as a
   `types.reference` (fluid-outliner approach). Avoids `getParent`
   entirely.

5. **`getRoot(self)`** -- If you only need the root store, skip
   the whole parent chain. Works but couples the node to the root
   shape.

6. **Environment injection via `getEnv(self)`** -- For cross-cutting
   concerns (services, config), avoids tree traversal altogether.

**Key API docs:**
- `getParent(node, depth?)` -- <https://mobx-state-tree.js.org/API/>
- `getParentOfType(node, type)` -- same page
- `hasParent(node, depth?)` -- returns `true` if node has a parent
- `isRoot(node)` -- returns `true` if node has no parents
- `isAlive(node)` -- returns `true` if node is still in the tree

---

## 4. Moving / Reparenting Nodes

MST enforces that a node can only exist in **one place** in the tree.
You cannot push a node into a new array if it is still attached
elsewhere.

### Using `detach()`

The recommended pattern from MST issue #142:

```ts
import { detach } from "mobx-state-tree"

// Move dragTask from one lane to another
hoverLane.pushTask(detach(dragTask))
```

`detach()` removes the node from its current parent while keeping it
alive, so it can be inserted elsewhere.

**Source:** <https://github.com/mobxjs/mobx-state-tree/issues/142>

### Using `clone()` + remove

Alternative: take a snapshot, create a new node, remove the old one.
Useful when you need to change the ID or other identifier during the
move.

### Known issues

- Detaching an entire array does not properly mark children as
  detached (issue #1173). Workaround: detach elements individually.
- Reusing a shifted array element can fail (issue #1436).
- `clone()` preserves identifiers, which can cause conflicts if the
  original is not removed first.

---

## 5. Undo/Redo for Tree Editors

MST has first-class support for undo/redo via patches:

- **`onPatch(model, listener)`** -- Fires for every mutation on the
  model or its descendants. Returns both forward and reverse patches.
- **`UndoManager` middleware** (from `mst-middlewares`) -- Records
  patches, provides `canUndo`, `canRedo`, `undo()`, `redo()`.
  Better than snapshot-based time travel for concurrent/async edits.
- **Attached state** -- For editors, you can save/restore "attached
  state" (e.g., cursor position) alongside undo steps, so undo also
  restores the cursor.

fluid-outliner rolls its own patch history (see section 1) with
1-second coalescing and a 1000-entry cap.

**Docs:** <https://mobx-state-tree.js.org/concepts/patches>
**Issue:** <https://github.com/mobxjs/mobx-state-tree/issues/1076>

---

## 6. MST vs mobx-bonsai for Tree Data

Since zen-outliner uses mobx-bonsai, here is how MST's patterns
translate:

| Concern | MST | mobx-bonsai |
|---|---|---|
| **Recursive types** | `types.late(() => Node)` + manual TS annotation | Plain TS interfaces -- no special syntax needed |
| **Parent access** | `getParent(self, 2)` or `getParentOfType` | `getParent(node)` -- same concept, but nodes are plain data |
| **Array gotcha** | Yes -- arrays are intermediate tree nodes | Same issue exists; `getParent` skips or does not skip arrays depending on version |
| **Node identity** | `types.identifier` + `types.reference` | Plain `id` field + `getParent`/`getRoot` helpers |
| **Reparenting** | `detach()` then re-insert | Simpler -- nodes are plain objects, but same single-tree constraint applies |
| **TS ergonomics** | Weak for recursive types; needs `IModelType` annotations | Strong -- just regular TS types |
| **Performance** | Baseline | 3-6x faster in benchmarks |

**Comparison page:** <https://mobx-bonsai.js.org/comparison/>

---

## 7. Summary of Patterns for zen-outliner

Based on this research, the approaches used in production MST outliner
projects break down into:

1. **Nested recursion** (`types.late`) -- simplest model, but
   `getParent` requires depth awareness, and TypeScript types are
   painful.

2. **Flat map + references** (fluid-outliner) -- normalized store
   with O(1) lookup. Most robust for complex operations (search,
   cross-references, undo). More boilerplate.

3. **Derived parent views** (Michel Weststrate's recommendation) --
   use `getParent(self, 2)` or `getParentOfType` to avoid storing
   parent references. Clean, but couples the node to its position
   in the tree.

Since zen-outliner uses **mobx-bonsai** (not MST), the recursive
TypeScript pain point is eliminated. The `getParent` array gotcha
still applies and should be handled with care -- see
`docs/getparent-gotcha-bonsai.md` in this repo.

---

## Sources

- [fluid-outliner (GitHub)](https://github.com/fluid-notion/fluid-outliner)
- [Label Studio Frontend (GitHub)](https://github.com/HumanSignal/label-studio-frontend)
- [Ignite by Infinite Red (GitHub)](https://github.com/infinitered/ignite)
- [Why Infinite Red uses MST](https://shift.infinite.red/why-infinite-red-uses-mobx-state-tree-instead-of-redux-d6c1407dead)
- [MST Recursive Types + TS (Issue #417)](https://github.com/mobxjs/mobx-state-tree/issues/417)
- [Self-Reference Model (Issue #489)](https://github.com/mobxjs/mobx-state-tree/issues/489)
- [Tree-Like Model (Issue #572)](https://github.com/mobxjs/mobx-state-tree/issues/572)
- [Recursive Data Types (Issue #554)](https://github.com/mobxjs/mobx-state-tree/issues/554)
- [Moving Nodes Between Branches (Issue #142)](https://github.com/mobxjs/mobx-state-tree/issues/142)
- [getParentOfType Proposal (Issue #477)](https://github.com/mobxjs/mobx-state-tree/issues/477)
- [MST Official Docs -- Trees](https://mobx-state-tree.js.org/concepts/trees)
- [MST Official Docs -- References](https://mobx-state-tree.js.org/concepts/references)
- [MST Official Docs -- Patches](https://mobx-state-tree.js.org/concepts/patches)
- [MST Official Docs -- API](https://mobx-state-tree.js.org/API/)
- [MST Official Docs -- Circular Deps](https://mobx-state-tree.js.org/tips/circular-deps)
- [MST Recursive Deep Menu (CodeSandbox)](https://codesandbox.io/s/mobx-state-tree-recursive-deep-menu-p7eqj)
- [mobx-bonsai vs MST Comparison](https://mobx-bonsai.js.org/comparison/)
- [MST on Open Source Agenda](https://www.opensourceagenda.com/tags/mobx-state-tree)
- [Builder.io MST Fork (npm)](https://www.npmjs.com/package/@builder.io/mobx-state-tree)
- [MST + React + TypeScript Guide (DEV)](https://dev.to/margaretkrutikova/how-to-mobx-state-tree-react-typescript-3d5j)
- [Self-Reference Model Blog (Pietrzak)](https://pietrzakadrian.com/blog/self-reference-mode-in-react-native-using-mobx-state-tree/)
