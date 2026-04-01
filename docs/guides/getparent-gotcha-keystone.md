# getParent() in mobx-keystone: The Same Array Gotcha as MST

Research based on mobx-keystone docs, source code, and official examples.

---

## The Question

When a node lives inside an array prop (e.g. `children: prop<ChildModel[]>`),
does `getParent(node)` return the **array** or the **parent model** that owns
the array?

## Answer: It Returns the Array (Same Gotcha as MST)

`getParent(node)` returns the **immediate structural parent**, which is the
**array object itself** -- not the model that holds the array property.

This is the **same behavior as MST** and **the same behavior as mobx-bonsai**.
All three libraries treat arrays as real nodes in the tree with their own parent
tracking.

---

## Proof from Official Code Examples

The mobx-keystone docs contain this example in the sandboxes section for an
`ItemA` model that validates uniqueness within its parent array:

```ts
@model("MyApp/ItemA")
class ItemA extends Model({}) implements Item {
    @computed
    get error(): string | undefined {
        // getParent returns the array, NOT the Store
        return getParent<Item[]>(this)?.some(
            (item) => item !== this && item instanceof ItemA
        )
            ? "only 1 instance of ItemA allowed"
            : undefined
    }
}
```

Note the generic: `getParent<Item[]>(this)` -- the library authors themselves
type the parent as the **array** (`Item[]`), not as a model. This is the
canonical proof that `getParent` returns the array.

---

## Proof from Source Code

From `packages/lib/src/parent/path.ts`:

```ts
export function getParent<T extends object = any>(value: object): T | undefined {
    assertTweakedObject(value, "value")
    return fastGetParent(value, true)
}
```

`fastGetParent` reads from an internal `objectParents` WeakMap that stores the
immediate structural parent. For array elements, the stored parent is the array
itself, because the array is the object that "owns" the element in the tree.

---

## Internal Tree Structure

Given this definition:

```ts
@model("myApp/TreeNode")
class TreeNode extends Model({
    children: prop<TreeNode[]>(() => []),
}) {}

@model("myApp/TreeStore")
class TreeStore extends Model({
    roots: prop<TreeNode[]>(() => []),
}) {}
```

The actual tree looks like:

```
TreeStore                  <- getParent(rootsArray)
  └─ roots (array)         <- getParent(nodeA)  *** THIS IS THE GOTCHA ***
       └─ TreeNode "A"
            └─ children (array)   <- getParent(nodeA1)
                 └─ TreeNode "A.1"
```

The parent chain for node "A.1" is:

```
getParent(nodeA1)         -> array (nodeA.children)
getParent(that array)     -> nodeA (the TreeNode model)
getParent(nodeA)          -> array (store.roots)
getParent(that array)     -> store (the TreeStore)
getParent(store)          -> undefined (root)
```

The chain alternates: `child -> array -> model -> array -> model -> ...`

---

## Key Difference from MST: No Depth Parameter

MST's `getParent` has a `depth` parameter to skip levels:

```ts
// MST -- skip the array, get the model
const store = getParent(self, 2)
```

**mobx-keystone does NOT have a depth parameter.** The signature is:

```ts
function getParent<T extends object = any>(value: object): T | undefined
```

To reach the model parent, you must call `getParent` twice or use `findParent`.

---

## How to Get the Actual Model Parent

### Option A: Call getParent twice

```ts
// node is inside parentModel.children[]
const array = getParent(node)              // the children array
const modelParent = getParent(array)       // the model that owns .children
```

### Option B: Use findParent with instanceof (Preferred)

```ts
import { findParent } from 'mobx-keystone'

const parent = findParent<TreeNode>(
    node,
    (p) => p instanceof TreeNode
)
```

`findParent` walks up the parent chain testing each node against the predicate.
Since arrays fail the `instanceof TreeNode` check, they are automatically
skipped. This is analogous to MST's `getParentOfType`.

### Option C: Use findParent with !Array.isArray (generic)

```ts
const modelParent = findParent(node, (p) => !Array.isArray(p))
```

Skips all array parents and returns the first non-array ancestor.

---

## mobx-keystone's Extra Wrinkle: Model Data Objects (`$`)

mobx-keystone class models store their prop data in an internal `$` sub-object
(`ModelData<Model>`). The library has internal machinery
(`fastGetParentPathIncludingDataObjects`, `dataObjectParent` WeakMap) to handle
this transparently -- `getParent` on a model skips the `$` wrapper and gives you
the real structural parent.

This is **not** the same issue as the array gotcha. It is a separate
implementation detail that the library handles for you. You do not need to
worry about `$` objects appearing in the parent chain.

---

## Comparison Table

| Aspect | MST | mobx-keystone | mobx-bonsai |
|---|---|---|---|
| `getParent()` for array element | Returns the **array** | Returns the **array** | Returns the **array** |
| Skip-depth parameter | Yes: `getParent(node, 2)` | **No** | **No** |
| Built-in type-safe parent lookup | `getParentOfType(node, Type)` | `findParent(node, predicate)` | `findParent(node, predicate)` |
| Arrays are real tree nodes | Yes | Yes | Yes |
| Parent chain shape | model -> array -> child | model -> array -> child | model -> array -> child |
| Model data sub-object (`$`) | N/A | Exists but auto-skipped by `getParent` | N/A |

---

## Practical Advice

1. **Never assume `getParent(node)` returns a model** when the node is inside
   an array prop. It returns the array.

2. **Use `findParent` with `instanceof`** to walk up to a specific model type.
   This is the safest pattern because it does not depend on tree depth.

3. **Avoid hard-coding `getParent(getParent(node))`** unless the structure is
   trivial and guaranteed not to change. `findParent` is more resilient.

4. **Getting siblings is easy** -- `getParent(node)` gives you the array, which
   IS the sibling list:

   ```ts
   function getSiblings(node: TreeNode): TreeNode[] {
       const parentArray = getParent<TreeNode[]>(node)
       if (!parentArray) return [node]
       return [...parentArray]
   }
   ```

---

## References

- [mobx-keystone -- Tree-Like Structure docs](https://mobx-keystone.js.org/tree-like-structure/)
- [mobx-keystone -- getParent API](https://mobx-keystone.js.org/api/functions/getparent)
- [mobx-keystone -- findParent API](https://mobx-keystone.js.org/api/functions/findparent)
- [mobx-keystone -- Comparison with MST](https://mobx-keystone.js.org/mst-comparison/)
- [mobx-keystone -- Class Models ($ accessor)](https://mobx-keystone.js.org/class-models/)
- [mobx-keystone source -- parent/path.ts](https://github.com/xaviergonz/mobx-keystone/blob/master/packages/lib/src/parent/path.ts)
- [mobx-keystone -- Discussion #303: MST to keystone pain points](https://github.com/xaviergonz/mobx-keystone/discussions/303)
- [mobx-keystone intro article by creator](https://medium.com/@xaviergonz/mobx-keystone-an-alternative-to-mobx-state-tree-without-some-of-its-pains-8140767a3aa1)
