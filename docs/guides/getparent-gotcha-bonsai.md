# getParent() in mobx-bonsai: How It Really Works

Research based on `mobx-bonsai@2.3.0` source code (`node_modules/.pnpm/mobx-bonsai@2.3.0_mobx@6.15.0/`).

---

## The Question

When a node lives inside a `children[]` array, does `getParent(node)` return the
**array itself** or the **parent model node** that owns the array?

## Answer: It Returns the Array

`getParent(node)` returns the **immediate structural parent**, which is the
**array object itself** -- not the model node that owns the `children` property.

This is different from MST, where `getParent()` skips over arrays and returns
the containing model.

---

## Proof from Source Code

### 1. How parent is stored (`src/node/node.ts`)

When a child object is attached to a node, `attachAsChildNode` runs and calls:

```ts
setParentNode(n, { object: observableStruct, path })
```

The `observableStruct` is whichever node is being initialized/intercepted.

For an **array node**, the intercept hook runs on the array itself:

```ts
// Line ~600: intercept hook is attached to the array
const array = observableStruct  // this IS the array
intercept(array, (change) => {
    // ...
    attachAsChildNode(change.newValue, "" + change.index, (n) => {
        change.newValue = n
    })
    // ...
})
```

Inside `attachAsChildNode` the call is:

```ts
setParentNode(n, { object: observableStruct, path })
//                         ^^^^^^^^^^^^^^^^
//                         the array itself, NOT the object owning the array
```

So when you push a child into `parentNode.children`, the stored parent is
`parentNode.children` (the array), with `path` being the stringified index
(e.g. `"0"`, `"1"`, etc.).

### 2. How getParent reads it (`src/node/tree/getParent.ts`)

```ts
export function getParent<TParent extends object>(node: object): TParent | undefined {
    return getParentPath(node)?.parent as TParent | undefined
}
```

`getParentPath` (`src/node/tree/getParentPath.ts`) returns:

```ts
return nodeData.parent
    ? { parent: nodeData.parent.object, path: nodeData.parent.path }
    : undefined
```

It returns whatever `object` was stored by `setParentNode` -- which, for array
elements, is the array.

### 3. The full parent chain

For a structure like:

```
OutlineStore
  .children (array)
    [0] OutlineNode "A"
      .children (array)
        [0] OutlineNode "A.1"
```

The parent chain for node "A.1" is:

```
getParent("A.1")        -> array (nodeA.children)
getParent(that array)   -> nodeA (the OutlineNode)
getParent(nodeA)        -> array (store.children)
getParent(that array)   -> store (the OutlineStore)
getParent(store)        -> undefined (root)
```

Every array in the tree is itself a node with parent tracking. The chain
alternates: `child -> array -> parent model -> array -> grandparent model -> ...`

---

## No Depth Parameter

Unlike MST's `getParent(node, depth)` overload, **mobx-bonsai's `getParent` has
no depth parameter**. The signature is simply:

```ts
function getParent<TParent extends object>(node: object): TParent | undefined
```

To go up multiple levels, call `getParent` repeatedly or use `findParent`.

---

## getParentPath Returns Path Info

`getParentPath(node)` returns a `ParentPath` object:

```ts
interface ParentPath<T extends object> {
    readonly parent: T   // the immediate parent object
    readonly path: string // property name or array index (as string)
}
```

For array elements, `path` is the **stringified index** (`"0"`, `"1"`, etc.).
For object properties, `path` is the **property name** (`"children"`, `"text"`,
etc.).

---

## How to Get the Actual Model Parent

### Option A: Call getParent twice

```ts
// node is inside parent.children[]
const array = getParent(node)           // the children array
const modelParent = getParent(array)    // the model that owns .children
```

### Option B: Use findParent with a predicate

```ts
import { findParent } from 'mobx-bonsai'

const modelParent = findParent<OutlineNode>(node, (p) =>
    TOutlineNode.nodeIsOfType(p) || TOutlineStore.nodeIsOfType(p)
)
```

`findParent` walks up the chain calling `getParentPath` in a loop. It tests
every parent (including arrays) against the predicate, so if your predicate
checks for a specific node type, it naturally skips arrays.

### Option C: Use findParent with isArray (generic)

```ts
const modelParent = findParent(node, (p) => !Array.isArray(p))
```

This skips all array parents and returns the first non-array ancestor.

---

## How getRootPath Exposes the Full Chain

`getRootPath(node)` returns `{ root, path, pathObjects }` where `path` includes
every segment through arrays:

```ts
const { root, path, pathObjects } = getRootPath(deepNode)
// path might be: ["children", "0", "children", "2"]
// pathObjects:   [store, store.children, nodeA, nodeA.children, deepNode]
```

Note how `pathObjects` includes both the arrays and the model nodes.

---

## Impact on the getSiblings Helper

The existing `getSiblings` pattern in the codebase:

```ts
function getSiblings(node: OutlineNode): OutlineNode[] {
    const parent = getParent<{ children: OutlineNode[] }>(node)
    if (!parent) return [node]
    return parent.children
}
```

This is **correct** only because `getParent(node)` returns the `children[]`
array, and then `.children` would fail -- UNLESS the generic type assertion
`<{ children: OutlineNode[] }>` happens to map correctly. In practice:

- `getParent(node)` returns the **array** `children[]`
- Accessing `.children` on an array would give `undefined`

The **correct** way to get siblings:

```ts
function getSiblings(node: OutlineNode): OutlineNode[] {
    const parentArray = getParent<OutlineNode[]>(node)
    if (!parentArray) return [node]
    return [...parentArray]  // the array IS the sibling list
}
```

Or equivalently:

```ts
function getSiblings(node: OutlineNode): OutlineNode[] {
    const pp = getParentPath(node)
    if (!pp) return [node]
    // pp.parent is the array containing node
    return [...(pp.parent as OutlineNode[])]
}
```

---

## Summary

| Aspect | mobx-bonsai | MST |
|---|---|---|
| `getParent()` for array element | Returns the **array** | Returns the **model** (skips arrays) |
| Depth parameter | No | Yes: `getParent(node, depth)` |
| Array is a node | Yes, arrays are full nodes with parent tracking | Arrays are transparent |
| Parent chain | Alternates model/array/model/array | Model/model/model |
| Skip arrays | Use `findParent` with predicate | Built-in via `getParent(node, 2)` |
