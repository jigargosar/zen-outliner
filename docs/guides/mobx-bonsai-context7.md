# mobx-bonsai -- Context7 Documentation & API Reference

> Source: Context7 MCP lookups + installed package type definitions (v2.3.0)
>
> Note: Context7 does not index mobx-bonsai directly. The closest indexed library
> is **mobx-keystone** (`/xaviergonz/mobx-keystone`), which is the predecessor by
> the same author (Javier Gonzalez Garces). mobx-bonsai is a ground-up rewrite
> with a functional-first API -- nodes are plain observable objects, not class
> instances. The sections below combine Context7 docs from mobx-keystone with the
> actual mobx-bonsai v2.3.0 type definitions and source code.

---

## Overview

mobx-bonsai is a fast, lightweight alternative to mobx-state-tree that combines
the simplicity of plain data with the power of MobX reactivity.

Key differences from mobx-state-tree and mobx-keystone:

- **Nodes are always plain data objects** -- no embedded methods, getters, or
  setters on the data itself.
- **All interactions are via external functions** -- getters and MobX actions
  follow a functional approach.
- **Performance and memory** -- optimized to be lighter than class-based
  alternatives.
- **Immutable snapshots** -- capture a stable state of your tree at any point.
- **MobX integration** -- uses MobX observables under the hood, works with
  `mobx-react-lite`.
- **Optional Y.js binding** -- two-way binding via the `mobx-bonsai-yjs`
  package.

### Installation

```bash
npm install mobx-bonsai
# or
pnpm add mobx-bonsai
# or
yarn add mobx-bonsai
```

Peer dependency: `mobx` (v4, v5, or v6).

For Y.js integration (optional):

```bash
npm install mobx-bonsai-yjs yjs
```

---

## Core Concepts

### `node(struct)` -- Creating Nodes

Converts a plain/observable object or array into a mobx-bonsai node. If the
data is already a node it is returned as-is. If the data contains a type and
key matching an already-existing node, that node is reconciled with the new
data and the existing node is returned.

```ts
import { node } from 'mobx-bonsai'

const myObj = node({ x: 1, y: 2, children: [{ label: 'child1' }] })
// myObj is now a reactive node; nested objects/arrays become nodes too
```

Signature:

```ts
function node<T extends object>(
    struct: T,
    options?: { skipInit?: boolean }
): T
```

### `isNode(struct)` / `assertIsNode(node, argName)`

```ts
function isNode(struct: unknown): boolean
function assertIsNode(node: object, argName: string): void // throws if not a node
```

### `isFrozenNode(node)`

Returns `true` if the node is frozen (immutable).

```ts
function isFrozenNode(node: object): boolean
```

---

## Node Types

Node types define the shape, behavior, and identity of nodes. There are two
flavors:

### Typed Node Types

Typed nodes have a `$$type` discriminator field and are registered globally.

```ts
import { nodeType, TNode } from 'mobx-bonsai'

// 1. Define the node shape using TNode
type Todo = TNode<'app/Todo', {
    id: string
    text: string
    done: boolean
}>

// 2. Create the node type (registers it globally)
const TTodo = nodeType<Todo>('app/Todo')

// 3. Create instances
const todo = TTodo({ text: 'Buy milk', done: false })
// todo.$$type === 'app/Todo'
```

### Untyped Node Types

Untyped nodes have no `$$type` field. Useful for ad-hoc structures or
base types for extension.

```ts
const TPoint = nodeType<{ x: number; y: number }>()

const p = TPoint({ x: 0, y: 0 })
```

### `nodeTypeKey`

The property key constant used to identify a node's type: `"$$type"`.

```ts
import { nodeTypeKey } from 'mobx-bonsai'
// nodeTypeKey === "$$type"
```

### `TNode<TType, TData>`

A utility type combining the type discriminator with data properties:

```ts
type TNode<TType extends string | number, TData> = {
    readonly [nodeTypeKey]: TType
} & TData
```

---

## Node Type Methods (Chainable)

All of these methods are chainable and return the same node type object.

### `.actions(actionsObj)`

Registers MobX action methods. Inside the action body, `this` refers to the
node. When calling the action externally, the node is passed as the first
argument.

```ts
type Todo = TNode<'app/Todo', {
    id: string
    text: string
    done: boolean
}>

const TTodo = nodeType<Todo>('app/Todo')
    .withKey('id')
    .actions({
        setText(text: string) {
            this.text = text
        },
        toggleDone() {
            this.done = !this.done
        },
    })

// Usage:
const todo = TTodo({ text: 'Hello' })
TTodo.setText(todo, 'World')    // node is the first argument
TTodo.toggleDone(todo)
```

### `.getters(gettersObj)`

Registers getter methods (non-action, non-cached). Same calling convention
as actions (node as first argument).

```ts
const TTodo = nodeType<Todo>('app/Todo')
    .getters({
        asString() {
            return `${this.done ? 'DONE' : 'TODO'} ${this.text}`
        },
    })

TTodo.asString(todo) // "TODO Hello"
```

### `.computeds(computedsObj)`

Registers MobX computed methods (cached/memoized). Each computed is a
function where `this` is the node. Results are cached per-node.

```ts
const TTodo = nodeType<Todo>('app/Todo')
    .computeds({
        asString() {
            return `${this.done ? 'DONE' : 'TODO'} ${this.text}`
        },
    })

TTodo.asString(todo) // cached MobX computed
```

You can also pass options (same as MobX `computed` options):

```ts
.computeds({
    asString: {
        get() {
            return `${this.done ? 'DONE' : 'TODO'} ${this.text}`
        },
        equals: comparer.structural,
    },
})
```

### `.settersFor(...propertyNames)`

Auto-generates setter actions for the listed properties. Setter names follow
the pattern `set<PropertyName>`.

```ts
const TTodo = nodeType<Todo>('app/Todo')
    .settersFor('text', 'done')

// Generates:
//   TTodo.setText(node, value)
//   TTodo.setDone(node, value)
```

### `.volatile(volatilesObj)`

Adds volatile (non-snapshotted) state to nodes. Each key maps to a default
value factory. Generates `get<Key>`, `set<Key>`, and `reset<Key>` methods.

```ts
const TTodo = nodeType<Todo>('app/Todo')
    .volatile({
        editing: () => false,
        editText: () => '',
    })

// Generates:
//   TTodo.getEditing(node): boolean
//   TTodo.setEditing(node, value: boolean): void
//   TTodo.resetEditing(node): void
//   TTodo.getEditText(node): string
//   TTodo.setEditText(node, value: string): void
//   TTodo.resetEditText(node): void
```

### `.defaults(defaultGenerators)`

Defines default value generators for optional properties. When a property is
`undefined` at construction time, its generator runs to fill the default.

```ts
const TTodo = nodeType<Todo>('app/Todo')
    .defaults({
        done: () => false,
    })

const todo = TTodo({ text: 'Hello' }) // done defaults to false
```

### `.withKey(keyProperty)`

Designates a property as the unique key for this node type. Enables:
- `TTodo.key` -- the property name
- `TTodo.getKey(node)` -- get the key value
- `TTodo.findByKey(keyValue)` -- look up a live node by key

Keyed nodes are auto-tracked by type+key for reconciliation.

```ts
const TTodo = nodeType<Todo>('app/Todo')
    .withKey('id')

const todo = TTodo({ text: 'Hello' })  // id auto-generated
TTodo.getKey(todo)                      // the generated id
TTodo.findByKey(someId)                 // find by key
```

### `.frozen()`

Makes the node type immutable. Frozen nodes cannot be modified after
creation, and sub-objects are not turned into nodes.

```ts
const TConfig = nodeType<Config>('app/Config').frozen()
```

### `.onInit(callback)`

Registers a callback to run when a node of this type is initialized.

```ts
const TTodo = nodeType<Todo>('app/Todo')
    .onInit((todo) => {
        console.log('New todo created:', todo.text)
    })
```

### `.extends(otherNodeType)`

Extends from an untyped node type, inheriting its actions, getters, computeds,
volatile, and defaults.

```ts
const TBase = nodeType<{ text: string }>()
    .settersFor('text')

const TTodo = nodeType<Todo>('app/Todo')
    .extends(TBase) // inherits setText from TBase
```

### `.nodeIsOfType(obj)`

Type guard: checks if an object is a node of this specific type.

```ts
if (TTodo.nodeIsOfType(someNode)) {
    // someNode is narrowed to Todo
}
```

### `.snapshot(data)`

Returns a plain snapshot object (with `$$type` and key filled in) without
creating a live node.

```ts
const sn = TTodo.snapshot({ text: 'Hello' })
// { $$type: 'app/Todo', id: '<generated>', text: 'Hello', done: false }
```

---

## `onInit(nodeType, callback)`

Standalone function (alternative to the chainable `.onInit`). Returns a
disposer.

```ts
import { onInit } from 'mobx-bonsai'

const dispose = onInit(TTodo, (todo) => {
    console.log('Initialized:', todo.text)
})

dispose() // unregister
```

---

## Tree Traversal

### `getParent(node)`

Returns the direct parent object of the target node, or `undefined` if it is
a root.

```ts
import { getParent } from 'mobx-bonsai'

const parent = getParent<ParentType>(childNode)
```

### `getParentPath(node)`

Returns `{ parent, path }` or `undefined` if root.

```ts
import { getParentPath } from 'mobx-bonsai'

const pp = getParentPath(childNode)
// pp?.parent -- the parent object
// pp?.path   -- the property name (string) on the parent
```

### `getRoot(node)`

Returns the root node of the tree (follows parents up).

```ts
import { getRoot } from 'mobx-bonsai'

const root = getRoot<RootType>(someNode)
```

### `getRootPath(node)`

Returns the root plus the full path from root to the target node.

```ts
import { getRootPath } from 'mobx-bonsai'

const { root, path } = getRootPath<RootType>(someNode)
```

### `isRoot(node)`

Returns `true` if the node has no parent.

```ts
import { isRoot } from 'mobx-bonsai'

isRoot(someNode) // true or false
```

### `isChildOfParent(child, parent)`

Returns `true` if `child` is anywhere in the subtree of `parent`.

```ts
import { isChildOfParent } from 'mobx-bonsai'

isChildOfParent(child, parent) // boolean
```

### `isParentOfChild(parent, child)`

Inverse of `isChildOfParent`.

### `getParentToChildPath(fromParent, toChild)`

Gets the path segments from parent to child. Returns `undefined` if the child
is not under the parent. Returns `[]` if they are the same node.

```ts
import { getParentToChildPath } from 'mobx-bonsai'

const path = getParentToChildPath(parent, child)
// e.g. ["children", "0", "subChildren", "1"]
```

### `getChildrenNodes(node, options?)`

Returns all children nodes (excluding primitives).

```ts
import { getChildrenNodes } from 'mobx-bonsai'

const shallow = getChildrenNodes(myNode)               // ReadonlySet<object>
const deep = getChildrenNodes(myNode, { deep: true })  // all descendants
```

### `findParent(child, predicate, maxDepth?)`

Walks up the parent chain until the predicate matches.

```ts
import { findParent } from 'mobx-bonsai'

const store = findParent<StoreType>(node, (parent) =>
    TStore.nodeIsOfType(parent)
)
```

### `findParentPath(child, predicate, maxDepth?)`

Like `findParent` but also returns the path from the found parent to the
child.

```ts
import { findParentPath } from 'mobx-bonsai'

const result = findParentPath<StoreType>(node, (parent) =>
    TStore.nodeIsOfType(parent)
)
// result?.parentNode, result?.path
```

### `findChildren(root, predicate, options?)`

Collects all children matching the predicate.

```ts
import { findChildren } from 'mobx-bonsai'

const todos = findChildren<Todo>(root, (n) => TTodo.nodeIsOfType(n), {
    deep: true,
})
```

### `walkTree(root, visit, mode)`

Walks the entire subtree. The visit function can return a value to stop the
walk early.

```ts
import { walkTree, WalkTreeMode } from 'mobx-bonsai'

walkTree(root, (node) => {
    console.log(node)
    return undefined // continue walking
}, WalkTreeMode.ParentFirst)

// WalkTreeMode.ParentFirst  -- parents before children
// WalkTreeMode.ChildrenFirst -- children (leaves) before parents
```

### `resolvePath(pathRootNode, path)`

Resolves a path (array of string/number segments) from a root node.

```ts
import { resolvePath } from 'mobx-bonsai'

const result = resolvePath<Todo>(root, ['children', '0'])
if (result.resolved) {
    console.log(result.value)
}
```

---

## `onChildAttachedTo(params)`

Watches for children being attached to a target node. Can filter by node
type.

```ts
import { onChildAttachedTo } from 'mobx-bonsai'

const disposer = onChildAttachedTo({
    target: () => root,
    childNodeType: TTodo,
    deep: true,
    fireForCurrentChildren: true,
    onChildAttached(child) {
        console.log('Attached:', child.text)
        // optionally return a cleanup function
        return () => console.log('Detached:', child.text)
    },
})

// disposer(true)  -- run detach disposers
// disposer(false) -- skip detach disposers
```

---

## Snapshots

### `getSnapshot(node)`

Returns a stable, immutable snapshot of a node. Preserves referential
integrity by reusing snapshots for unchanged sub-parts.

```ts
import { getSnapshot } from 'mobx-bonsai'

const sn = getSnapshot(todo)
// Plain object, deeply frozen, no MobX observability
```

### `applySnapshot(node, snapshot)`

Applies a full snapshot over a node, reconciling it with the current contents.
Keyed nodes are matched by type+key during reconciliation.

```ts
import { applySnapshot } from 'mobx-bonsai'

applySnapshot(todo, { $$type: 'app/Todo', id: todo.id, text: 'Updated', done: true })
```

### `onSnapshot(nodeOrFn, listener)`

Registers a MobX reaction that fires whenever the snapshot changes.

```ts
import { onSnapshot } from 'mobx-bonsai'

const dispose = onSnapshot(todo, (newSnapshot, prevSnapshot) => {
    console.log('Changed:', newSnapshot)
})
```

### `clone(node)`

Deep-clones a node, generating new keys for all keyed nodes.

```ts
import { clone } from 'mobx-bonsai'

const todoCopy = clone(todo)
// todoCopy has new key, is detached from any tree
```

### `substituteNodeKeys(value, newKeyGenerator?)`

Deeply substitutes all node keys in a data structure. Used internally by
`clone`.

```ts
import { substituteNodeKeys } from 'mobx-bonsai'

const newData = substituteNodeKeys(snapshotData)
```

---

## Change Listeners

### `onDeepChange(node, listener)`

Registers a listener called AFTER observable changes occur on the node or any
descendant.

```ts
import { onDeepChange } from 'mobx-bonsai'

const dispose = onDeepChange(root, (change) => {
    // change: IObjectDidChange | IArrayDidChange
    console.log('Something changed:', change)
})
```

### `onDeepInterceptedChange(node, listener)`

Registers a listener called BEFORE changes are committed (intercept phase).
The listener must return the change to accept it, or `null` to cancel it.

```ts
import { onDeepInterceptedChange } from 'mobx-bonsai'

const dispose = onDeepInterceptedChange(root, (change) => {
    // Validate the change
    if (shouldReject(change)) return null  // cancel
    return change  // accept
})
```

---

## Computed Properties (Standalone)

### `computedProp(fn, options?)`

Creates a MobX computed value scoped to a specific object. Works outside of
node types.

```ts
import { computedProp } from 'mobx-bonsai'

type Point = { x: number; y: number }

const getDistance = computedProp<Point, number>(
    ({ x, y }) => Math.sqrt(x ** 2 + y ** 2)
)

const point = node({ x: 3, y: 4 })
getDistance(point) // 5  (cached MobX computed)

// Access the underlying MobX computed:
getDistance.getComputedFor(point) // IComputedValue<number> | undefined
```

---

## Volatile Properties (Standalone)

### `volatileProp(defaultValueGen)`

Creates a volatile (non-snapshotted) property accessor as a `[getter, setter,
reset]` tuple.

```ts
import { volatileProp } from 'mobx-bonsai'

const [getEditing, setEditing, resetEditing] = volatileProp<MyNode, boolean>(() => false)

const myNode = node({ text: 'hello' })
getEditing(myNode)         // false
setEditing(myNode, true)   // now true
resetEditing(myNode)       // back to false
```

---

## Contexts

### `createContext(defaultValue?)`

Creates a context that propagates values down the tree (similar to React
Context). Nodes can be providers, and any descendant can read the value.

```ts
import { createContext } from 'mobx-bonsai'

const themeCtx = createContext<'light' | 'dark'>('light')

// Set default
themeCtx.setDefault('dark')

// Make a node a provider
themeCtx.set(rootNode, 'dark')

// Read from any descendant
themeCtx.get(childNode) // 'dark'

// Find the provider node
themeCtx.getProviderNode(childNode) // rootNode

// Computed value providers
themeCtx.setComputed(rootNode, () => someObservable.theme)

// Unset provider
themeCtx.unset(rootNode)

// Apply temporarily during a function call
themeCtx.apply(() => {
    const n = TTodo({ text: 'themed' })
    return n
}, 'light')
```

---

## Undo / Redo

### `UndoManager`

Manages undo/redo for a node tree. Automatically groups changes within a
single MobX action into one undo event.

```ts
import { UndoManager } from 'mobx-bonsai'

const undoManager = new UndoManager({
    rootNode: root,
    maxUndoLevels: 50,
    maxRedoLevels: 50,
    groupingDebounceMs: 300, // optional: merge changes within 300ms
})

// Properties
undoManager.canUndo        // boolean
undoManager.canRedo        // boolean
undoManager.undoLevels     // number
undoManager.redoLevels     // number
undoManager.undoQueue      // ReadonlyArray<UndoEvent>
undoManager.redoQueue      // ReadonlyArray<UndoEvent>

// Actions
undoManager.undo()         // undo last event
undoManager.redo()         // redo last undone event
undoManager.clearUndo()    // clear undo queue
undoManager.clearRedo()    // clear redo queue

// Run changes without recording them
undoManager.withoutUndo(() => {
    TTodo.setText(todo, 'not undoable')
})

// Clean up
undoManager.dispose()
```

### `UndoManagerOptions`

```ts
interface UndoManagerOptions<TAttachedState = unknown> {
    rootNode: object
    store?: UndoStore            // optional, auto-created if omitted
    maxUndoLevels?: number       // default: Infinity
    maxRedoLevels?: number       // default: Infinity
    attachedState?: AttachedStateHandler<TAttachedState>
    groupingDebounceMs?: number  // default: undefined (group by action only)
}
```

### `createUndoStore()` / `TUndoStore` / `TUndoEvent`

```ts
import { createUndoStore, TUndoStore, TUndoEvent } from 'mobx-bonsai'

const store = createUndoStore()
// store.undoEvents: UndoEvent[]
// store.redoEvents: UndoEvent[]
```

### Attached State

Save and restore extra state alongside undo events (e.g., cursor position):

```ts
const undoManager = new UndoManager({
    rootNode: root,
    attachedState: {
        save() {
            return { cursorPosition: getCursorPosition() }
        },
        restore(state) {
            setCursorPosition(state.cursorPosition)
        },
    },
})
```

---

## Transforms

Transforms convert between serialized formats and runtime types.

### `arrayToSetTransform` / `asSet`

Convert arrays to/from Sets.

```ts
import { asSet } from 'mobx-bonsai'

// asSet wraps an observable array as a Set-like interface
const mySet = asSet(someNode.tags) // Set<string> backed by tags array
```

### `objectToMapTransform` / `asMap`

Convert objects to/from Maps.

```ts
import { asMap } from 'mobx-bonsai'

const myMap = asMap(someNode.metadata) // Map<string, V> backed by object
```

### Date Transforms

```ts
import {
    timestampToDateTransform,
    dateToTimestampTransform,
    isoStringToDateTransform,
    dateToIsoStringTransform,
} from 'mobx-bonsai'
```

### BigInt Transforms

```ts
import {
    stringToBigIntTransform,
    bigIntToStringTransform,
} from 'mobx-bonsai'
```

### `ImmutableDate`

A `Date` subclass that throws on mutation attempts. Used internally for
date transforms.

---

## Redux DevTools Integration

### `asReduxStore(target)`

Wraps a mobx-bonsai node as a Redux-compatible store (for DevTools).

```ts
import { asReduxStore, connectReduxDevTools } from 'mobx-bonsai'

const reduxStore = asReduxStore(root)

// Connect to Redux DevTools browser extension
connectReduxDevTools(reduxStore)
```

---

## Utility Functions

### `deepEquals(a, b)`

Deep comparison supporting primitives, observables, tree nodes (optimized via
snapshot comparison), Maps, Sets, typed arrays, etc.

```ts
import { deepEquals } from 'mobx-bonsai'

deepEquals(nodeA, nodeB) // boolean
```

### `findNodeTypeById(typeId)`

Look up a registered typed node type by its type identifier.

```ts
import { findNodeTypeById } from 'mobx-bonsai'

const type = findNodeTypeById('app/Todo')
```

### `getNodeTypeId(node)`

Get the `$$type` value from a node (or `undefined` if untyped).

### `getNodeTypeAndKey(node)`

Get both the type object and key value for a node.

```ts
import { getNodeTypeAndKey } from 'mobx-bonsai'

const { type, key } = getNodeTypeAndKey(someNode)
```

---

## Complete Example: Outliner with mobx-bonsai

```ts
import { node, nodeType, TNode, getParent } from 'mobx-bonsai'

// -- Define node types --

type OutlineNode = TNode<'app/OutlineNode', {
    id: string
    text: string
    children: OutlineNode[]
    collapsed: boolean
}>

const TOutlineNode = nodeType<OutlineNode>('app/OutlineNode')
    .withKey('id')
    .defaults({
        children: () => [],
        collapsed: () => false,
    })
    .actions({
        setText(text: string) {
            this.text = text
        },
        toggleCollapse() {
            this.collapsed = !this.collapsed
        },
        addChild(text: string) {
            this.children.push(
                TOutlineNode.snapshot({ text, children: [], collapsed: false })
            )
        },
        removeChild(index: number) {
            this.children.splice(index, 1)
        },
    })

type OutlineStore = TNode<'app/OutlineStore', {
    children: OutlineNode[]
}>

const TOutlineStore = nodeType<OutlineStore>('app/OutlineStore')
    .defaults({
        children: () => [],
    })
    .actions({
        addChild(text: string) {
            this.children.push(
                TOutlineNode.snapshot({ text, children: [], collapsed: false })
            )
        },
        removeChild(index: number) {
            this.children.splice(index, 1)
        },
    })

// -- Create the store --

const store = TOutlineStore({ children: [] })

// -- Use it --

TOutlineStore.addChild(store, 'Getting started')
TOutlineNode.setText(store.children[0], 'Updated text')
TOutlineNode.toggleCollapse(store.children[0])

// Navigate the tree
const parent = getParent<OutlineStore>(store.children[0])
```

---

## Comparison with mobx-keystone (from Context7)

The Context7 docs for mobx-keystone show the class-based approach that
mobx-bonsai replaces:

**mobx-keystone (class-based):**

```ts
@model("myApp/TreeNode")
class TreeNode extends Model({ children: prop<TreeNode[]>(() => []) }) {
    @modelAction
    addChild(child: TreeNode) {
        this.children.push(child)
    }
}
```

**mobx-bonsai (functional):**

```ts
type TreeNode = TNode<'myApp/TreeNode', { children: TreeNode[] }>

const TTreeNode = nodeType<TreeNode>('myApp/TreeNode')
    .defaults({ children: () => [] })
    .actions({
        addChild(child: TreeNode) {
            this.children.push(TTreeNode.snapshot(child))
        },
    })
```

Key differences:
- No decorators (`@model`, `@modelAction`, `@computed`) needed
- No class inheritance (`extends Model(...)`)
- Nodes are plain objects, not class instances
- Actions called as `TTreeNode.addChild(node, child)` not `node.addChild(child)`
- `this` inside action bodies refers to the node (bound automatically)

---

## Changelog (v1.0.0 - v2.3.0)

### 2.3.0
- Data reconciliation optimizations (e.g. `applySnapshot`): if a snapshot of a
  sub-object is passed to reconcile with such sub-object then reconciliation
  will be skipped for that sub-tree.
- If an object is not updated after a reconciliation then the snapshot will be
  kept stable.

### 2.2.2
- Fixed undo manager not working with certain decorator modes.

### 2.2.0
- `observer` is no longer used for nodes not under `onDeepChange` detection.
- Added `setGlobalConfig({ checkCircularReferences: boolean })`.
- Optimized snapshot invalidation.

### 2.1.0
- Reduced memory usage per node.
- Added `onDeepInterceptedChange`.
- Added `UndoManager`.

### 2.0.0
- Y.js bindings moved to separate `mobx-bonsai-yjs` package.

### 1.1.0
- Added `extends` method to node types.

### 1.0.0
- Initial public release.

---

## References

- npm: https://www.npmjs.com/package/mobx-bonsai
- GitHub: https://github.com/xaviergonz/mobx-bonsai
- Docs site: https://mobx-bonsai.js.org
- Context7 indexed ancestor: `/xaviergonz/mobx-keystone`
