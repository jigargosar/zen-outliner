# mobx-bonsai Comprehensive Guide

Research based on `mobx-bonsai@2.3.0` source code and documentation.

---

## 1. What mobx-bonsai Is and What Problem It Solves

mobx-bonsai is a lightweight, fast alternative to `mobx-state-tree` (MST). It provides structured, type-safe state trees on top of MobX, but with a fundamentally different design philosophy:

- **Nodes are always plain observable objects/arrays.** There are no embedded methods, getters, or setters on the data itself. This contrasts with MST where nodes have views, actions, etc. baked in.
- **Functional access pattern.** All interactions (reading derived values, mutating state) go through external functions attached to a "node type" object. The node type object (e.g. `TMyNode`) acts as the namespace for actions/getters on nodes of that type.
- **Lower overhead.** No snapshot proxies, no hidden properties on nodes, no patches middleware by default. Nodes are shallow MobX observables with parent-tracking metadata stored in a WeakMap.

**Problems it solves:**
- MST's memory overhead and performance cost (every MST node wraps data in a proxy with snapshot tracking).
- MST's verbose model definition syntax.
- Wanting tree-structured state (parent tracking, snapshots, undo) without the weight of MST.
- Y.js two-way binding for real-time collaboration (via `mobx-bonsai-yjs`).

---

## 2. Core Concepts

### The `node()` Function

`node(data)` is the foundational primitive. It converts a plain object or array into a mobx-bonsai node. Internally it:

1. Makes the data shallowly observable (`observable.object(data, undefined, { deep: false })` or `observable.array(data, { deep: false })`).
2. Recursively converts child objects/arrays into nodes too.
3. Registers parent-child relationships in an internal `WeakMap<object, NodeData>`.
4. Sets up MobX `intercept` hooks to track future mutations (add/remove/update children).

```typescript
import { node } from 'mobx-bonsai'

// Turn a plain object into a node:
const root = node({
    name: 'Root',
    children: [
        { name: 'Child 1' },
        { name: 'Child 2' },
    ],
})
// root is now an observable object.
// root.children[0] is also a node with parent tracking.
```

You rarely call `node()` directly. Instead, you use a node type (see below), which calls `node()` internally.

### The `nodeType()` Function

`nodeType()` creates a "node type" -- an object that serves as both a factory and a namespace for actions, getters, computeds, etc. There are two forms:

**Typed node type** -- has a `$$type` discriminant stored on each node:
```typescript
import { nodeType, TNode } from 'mobx-bonsai'

type Todo = TNode<'Todo', {
    id: string
    text: string
    done: boolean
}>

const TTodo = nodeType<Todo>('Todo')
```

**Untyped node type** -- no `$$type` on the data:
```typescript
type Point = { x: number; y: number }

const TPoint = nodeType<Point>()
```

The convention is to prefix the type variable with `T` (e.g. `TTodo`, `TPoint`).

### `TNode<TypeId, Data>`

A type helper that adds the `$$type` discriminant to your data shape:

```typescript
type Todo = TNode<'Todo', {
    id: string
    text: string
    done: boolean
}>
// Equivalent to:
// { readonly $$type: 'Todo'; id: string; text: string; done: boolean }
```

### Tree Structure and `getParent`

Every node tracks its parent via a `WeakMap`. When you nest objects inside a node, mobx-bonsai automatically:

- Converts child objects to nodes.
- Records `{ parent: parentObject, path: propertyName }` for each child.
- Updates parent references when children are added, removed, or moved.

**Critical rule: a node can only have one parent.** If you try to attach a node that is already in a tree, mobx-bonsai throws an error. You must remove it from the old location first, or use `clone()`.

```typescript
import { getParent, getRoot, getParentPath } from 'mobx-bonsai'

const parent = getParent(childNode)
// Returns the parent object, or undefined if root.

const root = getRoot(childNode)
// Walks up the tree and returns the root.

const parentPath = getParentPath(childNode)
// Returns { parent: parentObject, path: 'propertyName' } or undefined.
```

---

## 3. Defining Node Types: The Chaining API

Node types use a builder/chaining pattern. Each method returns the same node type object with additional capabilities.

### `.withKey(propertyName)`

Designates a property as the unique key for this node type. Nodes with the same type + key are treated as the same identity (reconciliation/deduplication).

```typescript
type Todo = TNode<'Todo', {
    id: string
    text: string
    done: boolean
}>

const TTodo = nodeType<Todo>('Todo')
    .withKey('id')
```

When `withKey` is used:
- A default generator is automatically added for the key property (using nanoid).
- `TTodo.findByKey(keyValue)` becomes available to look up live nodes by key.
- `TTodo.getKey(node)` returns the key value.
- If you pass a snapshot with the same type+key as an existing live node, mobx-bonsai reconciles (merges the data) instead of creating a duplicate.

### `.defaults(generators)`

Provides default value generators for optional properties. Properties with defaults become optional in the constructor.

```typescript
type Todo = TNode<'Todo', {
    id: string
    text: string
    done: boolean
    createdAt: number
}>

const TTodo = nodeType<Todo>('Todo')
    .withKey('id')
    .defaults({
        done: () => false,
        createdAt: () => Date.now(),
    })

// Now you can create a todo without 'done' or 'createdAt':
const todo = TTodo({ text: 'Buy milk' })
// todo.done === false, todo.createdAt is set, todo.id is auto-generated
```

### `.actions(actionMethods)`

Defines MobX actions that mutate node state. Each method uses `this` to refer to the node. At the call site, the node is passed as the first argument.

```typescript
const TTodo = nodeType<Todo>('Todo')
    .withKey('id')
    .defaults({ done: () => false })
    .actions({
        setText(text: string) {
            this.text = text
        },
        toggle() {
            this.done = !this.done
        },
    })

// Usage (node is the first argument):
TTodo.setText(myTodo, 'New text')
TTodo.toggle(myTodo)
```

**How it works internally:** Each action is wrapped with MobX `action()`. The `this` inside the function body is bound to the node argument. The method signature is transformed via `PrependArgument<F, TNode>` so `toggle()` becomes `toggle(node: Todo)`.

### `.getters(getterMethods)`

Defines non-action read functions. Same pattern as actions (use `this` in definition, pass node as first arg at call site), but NOT wrapped in MobX `action()`.

```typescript
const TTodo = nodeType<Todo>('Todo')
    .getters({
        getDisplayText() {
            return `${this.done ? '[x]' : '[ ]'} ${this.text}`
        },
    })

// Usage:
const display = TTodo.getDisplayText(myTodo)
```

### `.computeds(computedMethods)`

Defines MobX `computed` values. These are automatically memoized per node instance (cached in a `WeakMap<node, Map<key, IComputedValue>>`).

```typescript
const TTodo = nodeType<Todo>('Todo')
    .computeds({
        formattedText() {
            return `${this.done ? '[x]' : '[ ]'} ${this.text}`
        },
    })

// Usage -- automatically memoized:
const text = TTodo.formattedText(myTodo)
```

You can also pass computed options (like `equals`):

```typescript
.computeds({
    expensiveValue: {
        get() {
            return heavyComputation(this.data)
        },
        equals: (a, b) => deepEquals(a, b),
    },
})
```

### `.settersFor(...propertyNames)`

Auto-generates setter actions for specified properties. Less boilerplate than defining actions manually.

```typescript
const TTodo = nodeType<Todo>('Todo')
    .settersFor('text', 'done')

// Generates:
// TTodo.setText(node, value)
// TTodo.setDone(node, value)
```

### `.volatile(volatileProps)`

Defines volatile (non-serialized) state attached to node instances. Stored in a `WeakMap`, not on the node object itself. Not included in snapshots.

```typescript
const TTodo = nodeType<Todo>('Todo')
    .volatile({
        editing: () => false,
        editText: () => '',
    })

// Generates three methods per volatile property:
// TTodo.getEditing(node)     -- getter
// TTodo.setEditing(node, v)  -- setter (MobX action)
// TTodo.resetEditing(node)   -- reset to default (MobX action)
```

### `.extends(otherUntypedNodeType)`

Inherits actions, getters, computeds, volatile, and defaults from another **untyped** node type. You cannot extend from a typed node type.

```typescript
type HasTimestamps = {
    createdAt: number
    updatedAt: number
}

const TTimestamped = nodeType<HasTimestamps>()
    .defaults({
        createdAt: () => Date.now(),
        updatedAt: () => Date.now(),
    })
    .actions({
        touch() {
            this.updatedAt = Date.now()
        },
    })

type Todo = TNode<'Todo', HasTimestamps & {
    text: string
    done: boolean
}>

const TTodo = nodeType<Todo>('Todo')
    .extends(TTimestamped)
    .actions({
        toggle() {
            this.done = !this.done
            this.updatedAt = Date.now()
        },
    })
```

### `.frozen()`

Marks a node type as immutable. Frozen nodes:
- Are deep-frozen (`Object.freeze`) in dev mode.
- Are NOT made observable (stored as plain objects).
- Child objects are NOT converted to nodes.
- Cannot be modified after creation.
- Their snapshot is the node itself (no conversion needed).

Useful for large read-only data blobs where you don't need fine-grained reactivity.

```typescript
const TConfig = nodeType<Config>('Config').frozen()
```

### `.onInit(callback)`

Registers a callback that runs every time a node of this type is initialized.

```typescript
const TTodo = nodeType<Todo>('Todo')
    .withKey('id')
    .onInit((todo) => {
        console.log('New todo created:', todo.text)
    })
```

You can also use the standalone `onInit(nodeType, callback)` function which returns a disposer.

### `.nodeIsOfType(obj)`

Type guard that checks if an object is a node of this specific type.

```typescript
if (TTodo.nodeIsOfType(someNode)) {
    // someNode is narrowed to Todo type
}
```

---

## 4. How Tree / Parent Tracking Works

### Internal Mechanism

mobx-bonsai maintains a `WeakMap<object, NodeData>` called `nodes`. Each entry stores:

```typescript
type NodeData = {
    parent: { object: parentNode, path: string } | undefined
    parentAtom: IAtom | undefined          // for reactive parent tracking
    childrenObjects: ObservableSet<object>  // set of direct child nodes
    onChangeListeners: ...                  // deep change listeners
    frozen: boolean
    observeDisposer: ...                   // lazy MobX observe hook
    ancestorChangeListenerRefCount: number  // optimization for change propagation
}
```

### When Children Change

The `intercept` hook on each node monitors all mutations. When a property is set:

1. If the old value was a node, it is **detached** (parent set to `undefined`, removed from `childrenObjects`).
2. If the new value is a plain object, it is converted to a node via `node()`.
3. The new node is **attached** (parent set to `{ object, path }`, added to `childrenObjects`).
4. Circular reference detection runs if enabled via `setGlobalConfig({ checkCircularReferences: true })`.

### Single-Parent Rule

A node **cannot appear in two places** in the same or different trees. Attempting to do so throws:

```
The same node cannot appear twice in the same or different trees,
trying to assign it to ..., but it already exists at ...
```

To move a node: remove it from the old location first, then add it to the new location.
To copy a node: use `clone()`.

### Reactive Parent Tracking

`getParent()` and `getParentPath()` use a MobX atom (`parentAtom`) to report observation. This means MobX reactions and `observer` components will re-render when a node's parent changes.

---

## 5. Creating and Managing a Store

### Basic Store Pattern

There is no special "store" concept in mobx-bonsai. Your root node IS your store. Just create a root node and export it.

```typescript
import { nodeType, TNode } from 'mobx-bonsai'

// --- Define node types ---

type Todo = TNode<'Todo', {
    id: string
    text: string
    done: boolean
}>

const TTodo = nodeType<Todo>('Todo')
    .withKey('id')
    .defaults({ done: () => false })
    .actions({
        setText(text: string) { this.text = text },
        toggle() { this.done = !this.done },
    })

type TodoStore = TNode<'TodoStore', {
    todos: Todo[]
}>

const TTodoStore = nodeType<TodoStore>('TodoStore')
    .defaults({ todos: () => [] })
    .actions({
        addTodo(text: string) {
            this.todos.push(TTodo({ text }))
        },
        removeTodo(todo: Todo) {
            const idx = this.todos.indexOf(todo)
            if (idx >= 0) this.todos.splice(idx, 1)
        },
    })

// --- Create the store ---
export const store = TTodoStore({})
```

### Using the Store in React

```typescript
import { observer } from 'mobx-react-lite'

const TodoItem = observer(({ todo }: { todo: Todo }) => (
    <li onClick={() => TTodo.toggle(todo)}>
        {todo.done ? '[x]' : '[ ]'} {todo.text}
    </li>
))

const App = observer(() => (
    <ul>
        {store.todos.map((todo) => (
            <TodoItem key={TTodo.getKey(todo)} todo={todo} />
        ))}
    </ul>
))
```

### Creating Nodes

When you call a node type as a function, it:
1. Applies default generators for missing properties.
2. Sets the `$$type` property (for typed node types).
3. Generates a key if `.withKey()` was used and no key was provided.
4. Calls `node()` to make it observable and register it.

```typescript
const todo = TTodo({ text: 'Buy milk' })
// todo is now: { $$type: 'Todo', id: '<generated>', text: 'Buy milk', done: false }
```

### Snapshots

You can get/apply plain data snapshots:

```typescript
import { getSnapshot, applySnapshot, onSnapshot } from 'mobx-bonsai'

// Get a plain object snapshot (deeply):
const snapshot = getSnapshot(store)

// Apply a snapshot (reconciles with existing data):
applySnapshot(store, newSnapshotData)

// Listen for snapshot changes:
const dispose = onSnapshot(store, (newSnapshot, prevSnapshot) => {
    localStorage.setItem('store', JSON.stringify(newSnapshot))
})
```

Snapshots are cached and use MobX atoms for reactive tracking. Unchanged subtrees share the same snapshot reference (structural sharing).

### Cloning

```typescript
import { clone } from 'mobx-bonsai'

const todoCopy = clone(myTodo)
// Deep copy with all new keys (for keyed node types).
```

---

## 6. Best Practices and Common Patterns

### Naming Convention

- Node data types: `Todo`, `OutlineNode`, `AppStore`
- Node type objects: `TTodo`, `TOutlineNode`, `TAppStore` (prefixed with `T`)

### Action Pattern

Define mutations as `.actions()` on the node type. Use `this` to refer to the node. Call with node as first arg:

```typescript
// Definition:
.actions({
    addChild(child: ChildNode) {
        this.children.push(child)
    },
})

// Call site:
TParent.addChild(parentNode, newChild)
```

### Getting Siblings via Parent

Use `getParent()` + `getParentPath()` to navigate the tree:

```typescript
import { getParent, getParentPath } from 'mobx-bonsai'

function getSiblings(node: OutlineNode): OutlineNode[] {
    const parent = getParent<{ children: OutlineNode[] }>(node)
    if (!parent) return [node]
    return parent.children
}
```

### Tree Traversal

```typescript
import { walkTree, WalkTreeMode, findParent, findChildren } from 'mobx-bonsai'

// Walk entire tree (parent-first or children-first):
walkTree(root, (node) => {
    console.log(node)
    return undefined // return a value to stop early
}, WalkTreeMode.ParentFirst)

// Find an ancestor matching a predicate:
const ancestor = findParent(childNode, (parent) => {
    return TTodoStore.nodeIsOfType(parent)
})

// Find children matching a predicate (shallow or deep):
const doneTodos = findChildren(store, (node) => {
    return TTodo.nodeIsOfType(node) && node.done
}, { deep: true })
```

### Context (Like React Context, But for the Tree)

```typescript
import { createContext } from 'mobx-bonsai'

const ThemeContext = createContext<'light' | 'dark'>('light')

// Set on a node (makes it a provider):
ThemeContext.set(rootNode, 'dark')

// Get from any descendant (walks up the tree):
const theme = ThemeContext.get(childNode) // 'dark'
```

### `computedProp` (Standalone Computed)

For computed values outside of a node type definition:

```typescript
import { computedProp } from 'mobx-bonsai'

const getTodoCount = computedProp((store: TodoStore) =>
    store.todos.filter((t) => !t.done).length
)

// Usage (auto-memoized per node):
const count = getTodoCount(store)
```

### `volatileProp` (Standalone Volatile)

For volatile state outside of a node type definition:

```typescript
import { volatileProp } from 'mobx-bonsai'

const [getIsEditing, setIsEditing, resetIsEditing] = volatileProp<Todo, boolean>(() => false)

// Usage:
setIsEditing(myTodo, true)
const editing = getIsEditing(myTodo)
resetIsEditing(myTodo)
```

### `onChildAttachedTo`

React to children being added/removed from a node:

```typescript
import { onChildAttachedTo } from 'mobx-bonsai'

const dispose = onChildAttachedTo({
    target: () => store,
    childNodeType: TTodo,
    onChildAttached: (child) => {
        console.log('Todo added:', child.text)
        // Return a cleanup function (called when child is detached):
        return () => {
            console.log('Todo removed:', child.text)
        }
    },
    deep: true,                   // watch deeply (default: false)
    fireForCurrentChildren: true, // fire for already-attached children (default: true)
})
```

### UndoManager

```typescript
import { UndoManager } from 'mobx-bonsai'

const undoManager = new UndoManager({
    rootNode: store,
    maxUndoLevels: 50,
    maxRedoLevels: 50,
    groupingDebounceMs: 300, // group changes within 300ms into one undo step
})

// Undo/redo (must NOT be called inside a MobX action):
undoManager.undo()
undoManager.redo()

// Check state:
undoManager.canUndo // boolean
undoManager.canRedo // boolean
undoManager.undoLevels // number

// Perform changes without recording them:
undoManager.withoutUndo(() => {
    TTodo.setText(myTodo, 'silent change')
})

// Cleanup:
undoManager.dispose()
```

### Redux DevTools

```typescript
import { asReduxStore, connectReduxDevTools } from 'mobx-bonsai'

const reduxStore = asReduxStore(store)
// connectReduxDevTools(remotedev, connection, store)
```

---

## 7. How mobx-bonsai Differs from Plain MobX

| Aspect | Plain MobX | mobx-bonsai |
|--------|-----------|-------------|
| **State shape** | Any observable | Must be plain objects/arrays (no Maps/Sets as primary data) |
| **Parent tracking** | None | Automatic: every node knows its parent |
| **Tree constraint** | None | Single-parent rule: a node can only be in one place |
| **Snapshots** | DIY with `toJS()` | Built-in `getSnapshot`/`applySnapshot` with structural sharing |
| **Node identity** | None | `withKey()` gives unique identity, `findByKey()` lookup |
| **Undo/Redo** | DIY | Built-in `UndoManager` |
| **Reconciliation** | None | Automatic via type+key matching |
| **Actions** | `action()`, `makeAutoObservable()` | Defined on node types, called as `TNodeType.actionName(node, ...)` |
| **Computed** | `computed()`, `get` in classes | `.computeds()` on node types, auto-memoized per node |
| **Y.js binding** | None | `mobx-bonsai-yjs` package |

### When to Use mobx-bonsai vs Plain MobX

**Use mobx-bonsai when:**
- Your state is naturally tree-shaped (outliners, document editors, nested forms).
- You need snapshots, undo/redo, or serialization.
- You want parent-child navigation (`getParent`, `getRoot`, `findParent`).
- You want identity-based reconciliation (same type+key = same node).
- You need Y.js real-time collaboration.

**Use plain MobX when:**
- Your state is flat or doesn't have a natural tree shape.
- You don't need snapshots, undo, or parent tracking.
- You want maximum flexibility (Maps, Sets, classes, etc.).
- You have a simple store that doesn't benefit from tree structure.

---

## 8. Flat-Map Patterns vs Nested Trees

### Nested Trees: The Primary Design

mobx-bonsai is fundamentally designed around **nested tree structures**. The entire parent-tracking system, snapshot mechanism, and reconciliation engine assume nodes are nested inside each other:

```typescript
type OutlineNode = TNode<'OutlineNode', {
    id: string
    text: string
    collapsed: boolean
    children: OutlineNode[]
}>

const TOutlineNode = nodeType<OutlineNode>('OutlineNode')
    .withKey('id')
    .defaults({
        collapsed: () => false,
        children: () => [],
    })
```

This is the **intended** and **best-supported** pattern. Parent tracking, `getParent()`, `walkTree()`, `findChildren()`, snapshots, and `UndoManager` all work naturally with nested trees.

### Flat-Map Pattern: Possible but Against the Grain

You CAN use a flat map pattern where nodes reference each other by ID instead of nesting, but this **fights against** mobx-bonsai's core design:

```typescript
// Flat pattern -- POSSIBLE but not idiomatic
type FlatNode = TNode<'FlatNode', {
    id: string
    text: string
    parentId: string | null
    collapsed: boolean
}>

type FlatStore = TNode<'FlatStore', {
    nodes: Record<string, FlatNode>  // flat map of id -> node
}>
```

**What you LOSE with flat maps:**
- `getParent()` returns the store's `nodes` object, not the logical parent node.
- `findParent()`, `walkTree()`, and `findChildren()` traverse the *structural* tree (store -> nodes map -> individual nodes), not your *logical* tree.
- Snapshots still work, but there's no structural sharing benefit from the logical tree hierarchy.
- The `UndoManager` works (it tracks changes on the structural tree).

**What still works with flat maps:**
- `getSnapshot()` / `applySnapshot()` -- serialization works fine.
- Node identity via `withKey()` -- reconciliation still works.
- MobX reactivity -- all observability works.
- `UndoManager` -- undo/redo tracks structural changes.
- `asMap()` -- you can wrap the `Record<string, FlatNode>` as a `Map<string, FlatNode>`.

### The `asMap()` Transform

mobx-bonsai provides `asMap()` to treat a plain object as a `Map<string, V>`. This is useful for flat-map patterns where you store nodes in a record:

```typescript
import { asMap } from 'mobx-bonsai'

type Store = TNode<'Store', {
    nodesById: Record<string, MyNode>
}>

const TStore = nodeType<Store>('Store')
    .defaults({ nodesById: () => ({}) })
    .getters({
        getNodesMap() {
            return asMap(this.nodesById)
        },
    })
    .actions({
        addNode(node: MyNode) {
            this.nodesById[node.id] = node
        },
        removeNode(id: string) {
            delete this.nodesById[id]
        },
    })

// Usage:
const map = TStore.getNodesMap(store) // Map<string, MyNode>
map.get('some-id')
map.has('some-id')
map.size
```

The `asMap()` wrapper is reactive (it uses MobX observable object operations underneath) and cached (same input returns the same Map instance).

### The `asSet()` Transform

Similarly, `asSet()` wraps an array as a `Set`:

```typescript
import { asSet } from 'mobx-bonsai'

type TagStore = TNode<'TagStore', {
    tags: string[]
}>

const TTagStore = nodeType<TagStore>('TagStore')
    .getters({
        getTagSet() {
            return asSet(this.tags)
        },
    })
```

### Using `objectToMapTransform` and `arrayToSetTransform` in Computeds

These are convenience functions for use inside `.computeds()`:

```typescript
import { objectToMapTransform, arrayToSetTransform } from 'mobx-bonsai'

const TStore = nodeType<Store>('Store')
    .computeds({
        nodesMap: objectToMapTransform('nodesById'),
        tagSet: arrayToSetTransform('tags'),
    })

// Usage:
const map = TStore.nodesMap(store) // Map<string, MyNode>
const set = TStore.tagSet(store)   // Set<string>
```

### Recommendation: Nested Trees Are the Way

For an outliner app, the nested tree pattern is **strongly recommended**:

```typescript
type OutlineNode = TNode<'OutlineNode', {
    id: string
    text: string
    collapsed: boolean
    children: OutlineNode[]
}>

const TOutlineNode = nodeType<OutlineNode>('OutlineNode')
    .withKey('id')
    .defaults({
        collapsed: () => false,
        children: () => [],
    })
    .actions({
        setText(text: string) {
            this.text = text
        },
        toggleCollapse() {
            this.collapsed = !this.collapsed
        },
        addChild(text: string) {
            this.children.push(TOutlineNode({ text }))
        },
        removeChild(child: OutlineNode) {
            const idx = this.children.indexOf(child)
            if (idx >= 0) this.children.splice(idx, 1)
        },
    })

type OutlineStore = TNode<'OutlineStore', {
    children: OutlineNode[]
}>

const TOutlineStore = nodeType<OutlineStore>('OutlineStore')
    .defaults({ children: () => [] })
    .actions({
        addChild(text: string) {
            this.children.push(TOutlineNode({ text }))
        },
        removeChild(child: OutlineNode) {
            const idx = this.children.indexOf(child)
            if (idx >= 0) this.children.splice(idx, 1)
        },
    })
```

This way `getParent(node)` returns the actual parent outline node, `walkTree()` traverses the outline, and snapshots capture the full nested structure naturally.

**A flat-map store is a valid choice if** you have other architectural reasons (e.g., you need O(1) node lookup by ID for large trees, or the same node needs to appear in multiple views). But you lose the tree-navigation ergonomics that make mobx-bonsai worth using over plain MobX. For a flat-map store, plain MobX with `observable.map` is simpler and more appropriate.

---

## Summary of Key API

| Function / Method | Purpose |
|---|---|
| `nodeType<T>(typeId)` | Create a typed node type (has `$$type`) |
| `nodeType<T>()` | Create an untyped node type (no `$$type`) |
| `TNode<TypeId, Data>` | Type helper adding `$$type` to data shape |
| `.withKey(prop)` | Designate a unique key property |
| `.defaults({...})` | Default value generators (makes props optional) |
| `.actions({...})` | MobX actions (mutate state via `this`) |
| `.getters({...})` | Read-only functions (via `this`) |
| `.computeds({...})` | Memoized MobX computeds (via `this`) |
| `.settersFor(...)` | Auto-generate setter actions |
| `.volatile({...})` | Non-serialized reactive state (WeakMap-backed) |
| `.extends(type)` | Inherit from an untyped node type |
| `.frozen()` | Make nodes immutable |
| `.onInit(cb)` | Run callback when node is created |
| `.nodeIsOfType(obj)` | Type guard |
| `.findByKey(key)` | Look up live node by key (requires `.withKey`) |
| `node(data)` | Low-level: convert plain data to a node |
| `getParent(node)` | Get parent node |
| `getParentPath(node)` | Get `{ parent, path }` |
| `getRoot(node)` | Get root of the tree |
| `getRootPath(node)` | Get root + full path from root |
| `findParent(node, pred)` | Find ancestor matching predicate |
| `findChildren(root, pred)` | Find children matching predicate |
| `getChildrenNodes(node)` | Get all child nodes (shallow or deep) |
| `walkTree(root, visit, mode)` | Walk tree (ParentFirst or ChildrenFirst) |
| `isRoot(node)` | Check if node has no parent |
| `isChildOfParent(child, parent)` | Check ancestor relationship |
| `onChildAttachedTo({...})` | React to children added/removed |
| `getSnapshot(node)` | Get immutable plain-data snapshot |
| `applySnapshot(node, data)` | Apply snapshot with reconciliation |
| `onSnapshot(node, listener)` | Listen for snapshot changes |
| `clone(node)` | Deep clone with new keys |
| `createContext(default)` | Create tree context (like React context) |
| `computedProp(fn)` | Standalone computed per node |
| `volatileProp(defaultFn)` | Standalone volatile per node |
| `asMap(record)` | Wrap `Record<string, V>` as `Map<string, V>` |
| `asSet(array)` | Wrap `T[]` as `Set<T>` |
| `UndoManager` | Undo/redo for a node tree |
| `asReduxStore(node)` | Redux-compatible store wrapper |
| `connectReduxDevTools(...)` | Redux DevTools integration |
| `deepEquals(a, b)` | Deep equality check (fast-deep-equal) |
