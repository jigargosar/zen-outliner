# mobx-bonsai Online Research

Comprehensive research on the mobx-bonsai library, compiled from official docs, GitHub repo, npm, and type definitions.

**Library**: mobx-bonsai v2.3.0
**Author**: Javier Gonzalez Garces (@xaviergonz) -- same author as mobx-keystone
**License**: MIT
**GitHub**: https://github.com/xaviergonz/mobx-bonsai (17 stars, 252 commits, TypeScript 83.4%)
**Docs**: https://mobx-bonsai.js.org
**npm**: https://www.npmjs.com/package/mobx-bonsai
**Tagline**: "A fast lightweight alternative to MobX-State-Tree + Y.js two-way binding"

---

## 1. What Is mobx-bonsai

mobx-bonsai is a state management library built on top of MobX. Its core philosophy:

- **Nodes are always plain data objects** -- no embedded methods, getters, or setters on the data itself.
- **All interactions via external functions** -- actions, getters, computeds are defined externally and called with the node as the first argument. This is a functional approach, not OOP.
- **Optimized for performance** -- significantly lower memory footprint than mobx-state-tree.
- **TypeScript-first** -- uses plain TypeScript types (no separate Instance/Snapshot types like MST).
- **Optional Y.js binding** -- real-time collaboration via `mobx-bonsai-yjs` package.

### Lineage

Same author created three MobX state management libraries, each an evolution:
1. **mobx-state-tree (MST)** -- original (community project under mobxjs org)
2. **mobx-keystone** -- class-based alternative to MST with better TypeScript support
3. **mobx-bonsai** -- functional, lightweight alternative with plain data objects

---

## 2. Installation

```bash
pnpm add mobx-bonsai
# For Y.js integration:
pnpm add mobx-bonsai-yjs yjs
```

Peer dependency: `mobx` (uses MobX observables, actions, computeds under the hood).

---

## 3. Core Concepts

### 3.1 `node(data)` -- Creating Nodes

Converts a plain/observable object or array into a mobx-bonsai node. If the data is already a node, it is returned as-is.

```ts
import { node } from 'mobx-bonsai'

const todoAppState = node({
    todoList: [
        { text: 'Buy groceries', done: false },
        { text: 'Write code', done: true },
    ],
})
```

**Signature:**
```ts
function node<T extends object>(struct: T, options?: { skipInit?: boolean }): T
```

**Key behaviors:**
- Any plain structure (object/array) added to an existing node is automatically transformed into a node.
- A node already in a tree cannot be directly re-added elsewhere without cloning first.
- Returns the same type `T` -- no wrapper types.
- Sub-objects are recursively turned into nodes.

### 3.2 `nodeType()` -- Defining Node Types

Creates reusable node type definitions with defaults, actions, getters, computeds, and volatile state. This is the main API for structuring your state.

**Two forms:**

```ts
// Typed node type (has a $$type discriminant in data):
const TTodo = nodeType<Todo>('todo')

// Untyped node type (no $$type property):
const TTodo = nodeType<Todo>()
```

**Signature:**
```ts
function nodeType<TNode extends NodeWithAnyType>(type: TNode[NodeTypeKey]): TypedNodeType<TNode>
function nodeType<TNode extends object>(): UntypedNodeType<TNode>
```

Typed nodes have a `$$type` property that enables:
- Runtime type discrimination
- Lifecycle hooks (onInit)
- `findNodeTypeById()` lookups
- `withKey()` for unique node registration

### 3.3 `TNode<TType, TData>` -- Type Utility

Combines a type identifier with data properties:

```ts
type TNode<TType extends NodeTypeValue, TData> = {
    readonly $$type: TType
} & TData
```

Example:
```ts
type Todo = TNode<'todo', {
    id: string
    text: string
    done: boolean
}>
// Resulting type: { readonly $$type: 'todo'; id: string; text: string; done: boolean }
```

### 3.4 `NodeTypeValue`

The type of a node's type identifier: `string | number`.

### 3.5 `NodeKeyValue`

The type of a node's unique instance key: `string | number`.

---

## 4. Node Type Chainable Methods

All methods on a nodeType return the same type (chainable/fluent API):

### 4.1 `.defaults(generators)`

Defines default value generators for properties that can be omitted when creating nodes.

```ts
const TTodo = nodeType<Todo>('todo')
    .defaults({
        done: () => false,
        text: () => '',
    })

// Now you can omit `done` and `text`:
const todo = TTodo({ id: '1' })
// todo.done === false, todo.text === ''
```

**Key detail:** Defaults apply only during node/snapshot creation, not when updating existing nodes.

**Type effect:** Properties with defaults become optional in the constructor.

### 4.2 `.withKey(keyProperty)` (typed nodes only)

Designates a property as the unique identifier. Same type + same key = single reconciled instance.

```ts
const TTodo = nodeType<Todo>('todo')
    .withKey('id')
    .defaults({ done: () => false })
```

Enables:
- `TTodo.findByKey(keyValue)` -- lookup by key
- `TTodo.getKey(node)` -- get key from node
- Auto-generates missing keys if not provided
- Reconciliation: if a node with the same type+key already exists, the existing node is updated rather than creating a duplicate

### 4.3 `.actions(actionDefs)`

Registers mutation functions. Actions use `this` to refer to the node but are called externally with the node as the first argument.

```ts
const TTodo = nodeType<Todo>('todo')
    .actions({
        setText(this: Todo, newText: string) {
            this.text = newText
        },
        toggleDone(this: Todo) {
            this.done = !this.done
        },
    })

// Calling an action:
TTodo.setText(someTodo, 'New text')
TTodo.toggleDone(someTodo)
```

**Important pattern**: Actions are defined with `this: TNode` but called as `NodeType.actionName(node, ...args)`. The `this` binding is handled internally. Actions are automatically wrapped in MobX actions.

### 4.4 `.getters(getterDefs)`

Adds parameterized getter functions. Like actions, they use `this` context but are called with node as first arg.

```ts
const TTodoList = nodeType<TodoList>('todoList')
    .getters({
        getPending(this: TodoList) {
            return this.items.filter((t) => !t.done)
        },
        getDone(this: TodoList) {
            return this.items.filter((t) => t.done)
        },
    })

// Usage:
const pending = TTodoList.getPending(myTodoList)
```

### 4.5 `.computeds(computedDefs)`

Adds cached computed properties (MobX computeds). Can be a simple function or `{ get(), equals? }` object.

```ts
const TTodo = nodeType<Todo>('todo')
    .computeds({
        formattedText(this: Todo) {
            return `${this.done ? '[x]' : '[ ]'} ${this.text}`
        },
        // Or with options:
        summary: {
            get(this: Todo) {
                return this.text.substring(0, 20)
            },
            equals: comparer.structural,
        },
    })

// Usage (returns cached value):
TTodo.formattedText(someTodo)
```

### 4.6 `.settersFor(...properties)`

Auto-generates setter actions for specified properties:

```ts
const TTodo = nodeType<Todo>('todo')
    .settersFor('done', 'text')

// Generates:
// TTodo.setDone(node, value)
// TTodo.setText(node, value)
```

Naming convention: `set${Capitalize<PropertyName>}`.

### 4.7 `.volatile(volatileProps)`

Adds non-serialized transient state. Not included in snapshots. Auto-generates getter, setter, and reset functions.

```ts
const TTodo = nodeType<Todo>('todo')
    .volatile({
        editing: () => false,
        lastSeen: () => new Date(),
    })

// Auto-generated methods:
TTodo.getEditing(node)        // getter
TTodo.setEditing(node, true)  // setter
TTodo.resetEditing(node)      // reset to default
TTodo.getLastSeen(node)
TTodo.setLastSeen(node, new Date())
TTodo.resetLastSeen(node)
```

Naming convention: `get/set/reset${Capitalize<Name>}`.

**Key detail:** Volatile state persists only during node instance lifetime. For unique nodes (same type+key), volatile state is shared since they are always the same instance.

### 4.8 `.onInit(callback)`

Registers initialization callback executed when a node of this type is created.

```ts
const TTodo = nodeType<Todo>('todo')
    .onInit((todo) => {
        console.log('New todo created:', todo.text)
    })
```

### 4.9 `.extends(baseNodeType)` (untyped only)

Inherits all functionality from a base node type. Cannot override existing keys.

```ts
const TBase = nodeType<Base>()
    .defaults({ name: () => '' })
    .actions({ setName(this: Base, n: string) { this.name = n } })

const TExtended = nodeType<Extended>()
    .extends(TBase)
    .defaults({ age: () => 0 })
```

### 4.10 `.frozen()`

Makes the node type immutable:
- Properties become read-only (enforced in dev mode)
- No MobX observability (kept as plain JS value)
- Snapshots are the same object reference as the node
- Sub-objects are NOT converted into nodes

```ts
type FrozenPerson = TNode<'FrozenPerson', { name: string; hobbies: string[] }>

const TFrozenPerson = nodeType<FrozenPerson>('FrozenPerson').frozen()

const person = TFrozenPerson({ name: 'Alice', hobbies: ['cycling'] })
getSnapshot(person) === person // true (same reference)
```

### 4.11 `.snapshot(data)`

Returns a snapshot based on the provided data (applies defaults) without creating a live node.

```ts
const snap = TTodo.snapshot({ id: '1' })
// snap has defaults applied but is not a live observable node
```

### 4.12 Other Properties

- `TTodo.typeId` -- the type identifier string/number (or `undefined` for untyped)
- `TTodo.nodeIsOfType(obj)` -- type guard: returns `true` if node matches this type
- `TTodo.isFrozen` -- whether the type is frozen
- `TTodo.unregister()` -- unregisters this type from the global registry
- `TTodo.defaultGenerators` -- the defaults defined so far

---

## 5. Standalone Functions (Outside nodeType)

### 5.1 `computedProp(fn, options?)`

Creates a standalone computed property as a function. Works on nodes or plain observables.

```ts
import { computedProp } from 'mobx-bonsai'

type Point = { x: number; y: number }

const getDistance = computedProp<Point, number>(
    ({ x, y }) => Math.sqrt(x ** 2 + y ** 2)
)

// Usage: cached computed value
getDistance(somePoint) // returns number, cached by MobX

// Access the underlying MobX computed:
getDistance.getComputedFor(somePoint)
```

### 5.2 `volatileProp(defaultValueGen)`

Creates a standalone volatile property (not on a nodeType). Returns a `[getter, setter, reset]` tuple.

```ts
import { volatileProp, node } from 'mobx-bonsai'

const [getVolatile, setVolatile, resetVolatile] = volatileProp(() => 0)

const obj = node({})
getVolatile(obj)       // 0
setVolatile(obj, 42)
getVolatile(obj)       // 42
resetVolatile(obj)
getVolatile(obj)       // 0
```

Not part of snapshots. Useful for UI state like "is editing", "is selected", etc.

### 5.3 `onInit(nodeType, callback)`

Standalone alternative to `nodeType.onInit()`. Returns a disposer.

```ts
import { onInit } from 'mobx-bonsai'

const dispose = onInit(TTodo, (todo) => {
    console.log('Todo created:', todo.text)
})

dispose() // stop listening
```

---

## 6. Tree Navigation Functions

All tree navigation functions throw if passed a non-node object.

### 6.1 `getParent(node)`

Returns the parent object, or `undefined` if root.

```ts
import { getParent } from 'mobx-bonsai'

const parent = getParent<TodoList>(someTodo) // TodoList | undefined
```

**Note**: The immediate parent can be an object, an array, or a map -- it is the direct container, not necessarily the "model parent". For example, if a Todo is in a `TodoList.items` array, `getParent(todo)` returns the array, and `getParent(array)` returns the TodoList.

### 6.2 `getRoot(node)`

Returns the root node (follows parents up to the node with no parent).

```ts
import { getRoot } from 'mobx-bonsai'

const root = getRoot<AppState>(someTodo)
```

### 6.3 `getParentPath(node)`

Returns `{ parent, path }` or `undefined` if root. The `path` is the property name or array index.

```ts
import { getParentPath } from 'mobx-bonsai'

const pp = getParentPath<TodoList>(someTodo)
// pp?.parent -- the parent object
// pp?.path   -- the property name (string) or array index (string)
```

### 6.4 `getRootPath(node)`

Returns `{ root, path, pathObjects }` -- the full path from root to the node.

```ts
import { getRootPath } from 'mobx-bonsai'

const rp = getRootPath<AppState>(someTodo)
// rp.root        -- the root object
// rp.path        -- ReadonlyArray<string> from root to node
// rp.pathObjects -- array of all objects in the path
```

### 6.5 `findParent(child, predicate, maxDepth?)`

Walks up from child to root, returns first parent matching predicate.

```ts
import { findParent } from 'mobx-bonsai'

const todoList = findParent<TodoList>(someTodo, (parent) =>
    TTodoList.nodeIsOfType(parent)
)
```

### 6.6 `findParentPath(child, predicate, maxDepth?)`

Like `findParent` but also returns the path from the found parent to the child.

```ts
import { findParentPath } from 'mobx-bonsai'

const result = findParentPath<TodoList>(someTodo, (p) => TTodoList.nodeIsOfType(p))
// result?.parent -- the found parent
// result?.path   -- Path from parent to child
```

### 6.7 `findChildren(root, predicate, options?)`

Finds children matching a predicate. Returns a `ReadonlySet<T>`.

```ts
import { findChildren } from 'mobx-bonsai'

const allTodos = findChildren<Todo>(
    root,
    (node) => TTodo.nodeIsOfType(node),
    { deep: true }
)
```

Options: `{ deep?: boolean }` -- default `false` (shallow). Set `true` for recursive.

### 6.8 `getChildrenNodes(node, options?)`

Returns all children nodes (excluding primitives).

```ts
import { getChildrenNodes } from 'mobx-bonsai'

const children = getChildrenNodes(someNode, { deep: true })
```

### 6.9 `walkTree(root, visit, mode)`

Walks the entire tree. If visit returns non-undefined, walk stops and returns that value.

```ts
import { walkTree, WalkTreeMode } from 'mobx-bonsai'

walkTree(root, (node) => {
    console.log(node)
    return undefined // continue walking
}, WalkTreeMode.ParentFirst)

// WalkTreeMode.ParentFirst  -- roots first, then children
// WalkTreeMode.ChildrenFirst -- leaves first, then parents
```

### 6.10 Other Tree Functions

```ts
isRoot(node): boolean
isNode(struct): boolean
isFrozenNode(node): boolean
assertIsNode(node, argName): void
isChildOfParent(child, parent): boolean
isParentOfChild(parent, child): boolean
getParentToChildPath(fromParent, toChild): Path | undefined
resolvePath<T>(pathRootNode, path: (string|number)[]): { resolved: true, value: T } | { resolved: false }
```

---

## 7. Snapshots

Snapshots are immutable, structurally shared copies of the node tree. In mobx-bonsai, **snapshots are the same TypeScript type as nodes** (unlike MST which has separate Instance/Snapshot types).

### 7.1 `getSnapshot(node)`

Returns a stable, cached, immutable snapshot. Uses structural sharing for unchanged sub-parts.

```ts
import { getSnapshot } from 'mobx-bonsai'

const snap = getSnapshot(todoAppState)
// snap is deeply frozen, same type as todoAppState
```

### 7.2 `applySnapshot(node, snapshot)`

Applies a snapshot over a node, reconciling with current contents.

```ts
import { applySnapshot } from 'mobx-bonsai'

applySnapshot(todoAppState, savedSnapshot)
```

### 7.3 `onSnapshot(nodeOrFn, listener)`

Fires whenever the snapshot changes (once per MobX transaction).

```ts
import { onSnapshot } from 'mobx-bonsai'

const dispose = onSnapshot(todoAppState, (newSnapshot, prevSnapshot) => {
    console.log('State changed:', newSnapshot)
})
```

---

## 8. Deep Change Listeners

### 8.1 `onDeepChange(node, listener)`

Listens for any change in the node's subtree (after the change is applied).

```ts
import { onDeepChange } from 'mobx-bonsai'

const dispose = onDeepChange(root, (change) => {
    console.log('Something changed:', change)
})
```

### 8.2 `onDeepInterceptedChange(node, listener)`

Intercepts changes BEFORE they are applied. The listener must return:
- The change object (possibly modified) to accept
- `null` to cancel the change

```ts
import { onDeepInterceptedChange } from 'mobx-bonsai'

const dispose = onDeepInterceptedChange(root, (change) => {
    // Validate, modify, or cancel
    if (someCondition) return null // cancel
    return change // accept
})
```

### 8.3 `onChildAttachedTo(params)`

Watches for child nodes being attached/detached from a target.

```ts
import { onChildAttachedTo } from 'mobx-bonsai'

const dispose = onChildAttachedTo({
    target: () => todoList,
    childNodeType: TTodo,
    onChildAttached: (child) => {
        console.log('Todo attached:', child.text)
        return () => {
            console.log('Todo detached:', child.text)
        }
    },
    deep: false,
    fireForCurrentChildren: false,
})
```

---

## 9. Contexts (Dependency Injection Through the Tree)

Contexts provide a way to share data down through the tree without prop drilling.

```ts
import { createContext } from 'mobx-bonsai'

// Create with default value:
const ThemeContext = createContext<'light' | 'dark'>('light')

// Create without default (value is T | undefined):
const UserContext = createContext<User>()

// Set on a node (makes it a "provider"):
ThemeContext.set(rootNode, 'dark')

// Get from any descendant (walks up until a provider is found):
const theme = ThemeContext.get(someChildNode) // 'dark'

// Computed values:
ThemeContext.setComputed(rootNode, () => userPreferences.theme)

// Provider node lookup:
const provider = ThemeContext.getProviderNode(someChild)

// Unset (stop being a provider):
ThemeContext.unset(rootNode)

// Apply temporarily during a function:
ThemeContext.apply(() => {
    const newNode = TTodo({ text: 'test' })
    return newNode
}, 'dark')
```

**Context interface:**
```ts
interface Context<T> {
    getDefault(): T
    setDefault(value: T): void
    setDefaultComputed(valueFn: () => T): void
    get(node: object): T
    getProviderNode(node: object): object | undefined
    set(node: object, value: T): void
    setComputed(node: object, valueFn: () => T): void
    unset(node: object): void
    apply<R>(fn: () => R, value: T): R
    applyComputed<R>(fn: () => R, valueFn: () => T): R
}
```

---

## 10. Collections: `asMap` and `asSet`

Wrappers to manipulate plain objects as Maps and arrays as Sets.

### 10.1 `asMap(obj)`

Returns a reactive `Map<string, V>` view backed by a plain object.

```ts
import { asMap } from 'mobx-bonsai'

const data = node({ users: { alice: { name: 'Alice' }, bob: { name: 'Bob' } } })
const usersMap = asMap(data.users)
usersMap.get('alice')  // { name: 'Alice' }
usersMap.set('charlie', { name: 'Charlie' })
usersMap.delete('bob')
```

### 10.2 `asSet(arr)`

Returns a reactive `Set<T>` view backed by an array.

```ts
import { asSet } from 'mobx-bonsai'

const data = node({ tags: ['red', 'blue'] })
const tagSet = asSet(data.tags)
tagSet.has('red')  // true
tagSet.add('green')
tagSet.delete('red')
```

---

## 11. Transforms

Transform functions for use inside `.getters()` or `.computeds()` to present data as different types.

### 11.1 `objectToMapTransform(propName)`

For use in getters -- transforms a Record property into a Map view:

```ts
const TMyNode = nodeType<MyNode>('myNode')
    .getters({
        getUsersAsMap: objectToMapTransform('users'),
    })

// Usage:
const map = TMyNode.getUsersAsMap(myNode) // Map<string, User>
```

### 11.2 `arrayToSetTransform(propName)`

Transforms an array property into a Set view:

```ts
const TMyNode = nodeType<MyNode>('myNode')
    .getters({
        getTagsAsSet: arrayToSetTransform('tags'),
    })

// Usage:
const set = TMyNode.getTagsAsSet(myNode) // Set<string>
```

### 11.3 Date/BigInt Transforms

Utility transforms for computed properties:

```ts
timestampToDateTransform(propName)   // number timestamp -> ImmutableDate
dateToTimestampTransform(propName)   // ImmutableDate -> number
isoStringToDateTransform(propName)   // ISO string -> ImmutableDate
dateToIsoStringTransform(propName)   // ImmutableDate -> string
stringToBigIntTransform(propName)    // string -> BigInt
bigIntToStringTransform(propName)    // BigInt -> string
```

`ImmutableDate` is a frozen Date provided by the library (cannot be mutated).

---

## 12. Cloning and Key Management

### 12.1 `clone(node)`

Deep-clones a node with newly generated unique keys.

```ts
import { clone } from 'mobx-bonsai'

const cloned = clone(originalTodo) // new node with new keys
```

### 12.2 `substituteNodeKeys(value, generator?)`

Recursively traverses a data structure replacing all node keys.

```ts
import { substituteNodeKeys } from 'mobx-bonsai'

const data = substituteNodeKeys(someData, (oldKey) => `new-${oldKey}`)
```

### 12.3 `getNodeTypeAndKey(node)`

Returns `{ type, key }` for a node. Type is the `AnyTypedNodeType` object; key is the unique identifier.

```ts
import { getNodeTypeAndKey } from 'mobx-bonsai'

const { type, key } = getNodeTypeAndKey(someTodo)
```

### 12.4 `getNodeTypeId(node)`

Returns the `$$type` value of a typed node, or `undefined` for untyped.

### 12.5 `findNodeTypeById(typeId)`

Retrieves a registered node type by its ID string/number.

```ts
import { findNodeTypeById } from 'mobx-bonsai'

const todoType = findNodeTypeById('todo') // AnyTypedNodeType | undefined
```

---

## 13. Undo/Redo Manager

The `UndoManager` tracks changes to a node subtree and provides undo/redo capabilities.

### Basic Usage

```ts
import { UndoManager } from 'mobx-bonsai'
import { runInAction } from 'mobx'

const undoManager = new UndoManager({ rootNode: todoList })

runInAction(() => {
    todoList.items[0].completed = true
})

undoManager.undo()  // reverts
undoManager.redo()  // re-applies

undoManager.dispose()  // cleanup
```

### Action Grouping

Changes within a single `runInAction()` become one undo event:

```ts
runInAction(() => {
    todo.text = 'Updated'
    todo.done = true
    // Both changes = one undo event
})
```

### Time-Based Grouping (Debounce)

```ts
const undoManager = new UndoManager({
    rootNode: todoList,
    groupingDebounceMs: 500, // merge changes within 500ms
})
```

### Selective Recording

```ts
undoManager.withoutUndo(() => {
    runInAction(() => {
        todoList.lastSyncedAt = Date.now() // not tracked
    })
})
```

### Constructor Options

```ts
interface UndoManagerOptions<S = unknown> {
    rootNode: object              // subtree root to track
    store?: UndoStore             // optional shared store
    maxUndoLevels?: number        // default: Infinity
    maxRedoLevels?: number        // default: Infinity
    groupingDebounceMs?: number   // merge changes within time window
    attachedState?: {
        save(): S
        restore(state: S): void
    }
}
```

### API

**Properties:**
- `canUndo: boolean`
- `canRedo: boolean`
- `undoLevels: number`
- `redoLevels: number`
- `undoQueue: ReadonlyArray<UndoEvent>`
- `redoQueue: ReadonlyArray<UndoEvent>`
- `isUndoRecordingDisabled: boolean`
- `rootNode: object`
- `store: UndoStore`

**Methods:**
- `undo(): void` -- throws if called inside an action or if empty
- `redo(): void` -- throws if called inside an action or if empty
- `clearUndo(): void`
- `clearRedo(): void`
- `withoutUndo<T>(fn: () => T): T`
- `dispose(): void`

**Important:** Never call undo/redo inside a MobX action. The manager throws to prevent inconsistent state.

---

## 14. Redux DevTools Integration

```ts
import { asReduxStore, connectReduxDevTools } from 'mobx-bonsai'

const store = asReduxStore(rootNode)
connectReduxDevTools(remotedev, remotedev.connectViaExtension(...), rootNode)
```

`asReduxStore(target)` wraps a node as a Redux-compatible store with `getState()` and `subscribe()`.

---

## 15. Global Configuration

```ts
import { setGlobalConfig, getGlobalConfig } from 'mobx-bonsai'

setGlobalConfig({
    keyGenerator: () => crypto.randomUUID(),  // custom key generator
    checkCircularReferences: true,            // default: false (for performance)
})
```

---

## 16. Y.js Integration (mobx-bonsai-yjs)

Separate package since v2.0.0. Creates bidirectional sync between mobx-bonsai nodes and Y.js state.

```ts
import { bindYjsToNode, applyPlainObjectToYMap } from 'mobx-bonsai-yjs'

// Initialize Y.js state:
applyPlainObjectToYMap(yjsDoc.getMap('state'), { todoList: [] })

// Bind:
const { mobxNode, dispose } = bindYjsToNode<TodoAppState>({
    yjsDoc,
    yjsObject: yjsDoc.getMap('state'),
    yjsOrigin: Symbol('my-binding'),  // optional, to distinguish local vs remote
})

// Read/write as normal MobX:
mobxNode.todoList[0].text = 'Updated'

// Cleanup:
dispose()
```

**Constraints:**
- MobX changes replicate to Y.js only after outermost action completes
- Y.js changes merge into MobX only after all transactions conclude
- Do not execute Y.js transactions during MobX actions and vice versa
- For undo/redo with Y.js, use Y.js's built-in UndoManager (not mobx-bonsai's)

---

## 17. Performance Benchmarks (vs mobx-state-tree)

From official comparison page:

| Operation                    | mobx-bonsai speedup |
|------------------------------|---------------------|
| Empty creation               | 3.27x faster        |
| Creation + property access   | 5.94x faster        |
| Already-created prop access  | 1.24x faster        |
| Snapshot creation            | 3.10x faster        |
| Changing properties          | 9.08x faster        |
| Change + getSnapshot         | 2.73x faster        |

---

## 18. Comparison with MST and mobx-keystone

### What mobx-bonsai has that MST/keystone do NOT:
- Plain data objects (no classes, no embedded methods)
- Single type for nodes and snapshots (no Instance vs Snapshot confusion)
- No metadata required inside snapshots
- Y.js binding
- `asMap`/`asSet` wrappers
- Significantly better performance

### What MST/keystone have that mobx-bonsai does NOT:
- Runtime type validation
- Patch generation
- Action serialization/replaying
- Flow action support (async action tracking)
- References support
- Model lifecycle hooks (MST has afterCreate, afterAttach, etc.; bonsai has onInit and onChildAttachedTo instead)
- Redux compatibility layer (MST)
- Frozen data (keystone -- though bonsai has `.frozen()` nodes)

### TypeScript Improvements

**No Instance/Snapshot confusion:**
In MST: `SnapshotIn<typeof Todo> | Instance<typeof Todo>` + `cast()`.
In mobx-bonsai: a single type works everywhere.

**No this/self confusion:**
MST requires `self` for previous model chunks, `this` for current ones.
mobx-bonsai uses functional approach -- no `this`/`self` confusion.

---

## 19. Complete API Export List

From the package's `index.d.ts`:

### Core
- `node`, `nodeType`, `nodeTypeKey`
- `TNode`, `NodeTypeValue`, `NodeKeyValue`, `NodeWithAnyType`
- `AnyNodeType`, `AnyTypedNodeType`, `AnyUntypedNodeType`
- `TypedNodeType`, `UntypedNodeType`, `BaseNodeType`
- `NodeForNodeType`

### Node Inspection
- `isNode`, `isFrozenNode`, `assertIsNode`
- `getNodeTypeAndKey`, `getNodeTypeId`, `findNodeTypeById`
- `onInit`

### Tree Navigation
- `getParent`, `getParentPath`, `getRoot`, `getRootPath`
- `findParent`, `findParentPath`, `findChildren`, `getChildrenNodes`
- `getParentToChildPath`, `isChildOfParent`, `isParentOfChild`, `isRoot`
- `onChildAttachedTo`
- `walkTree`, `WalkTreeMode`
- `resolvePath`

### Snapshots
- `getSnapshot`, `applySnapshot`, `onSnapshot`

### Change Listeners
- `onDeepChange`, `onDeepInterceptedChange`
- `NodeChange`, `NodeChangeListener`
- `NodeInterceptedChange`, `NodeInterceptedChangeListener`

### Contexts
- `createContext`, `Context`

### Volatile/Computed
- `volatileProp`, `VolatileProp`
- `computedProp`

### Cloning/Keys
- `clone`, `substituteNodeKeys`
- `NodeKeyGenerator`

### Collections/Transforms
- `asMap`, `asSet`
- `objectToMapTransform`, `arrayToSetTransform`
- `timestampToDateTransform`, `dateToTimestampTransform`
- `isoStringToDateTransform`, `dateToIsoStringTransform`
- `stringToBigIntTransform`, `bigIntToStringTransform`
- `ImmutableDate`

### Undo/Redo
- `UndoManager`, `UndoManagerOptions`, `AttachedStateHandler`
- `createUndoStore`, `TUndoEvent`, `TUndoStore`
- `UndoEvent`, `UndoStore`
- `UndoableChange`, `UndoableChangeBase`
- `UndoableObjectAddChange`, `UndoableObjectUpdateChange`, `UndoableObjectRemoveChange`
- `UndoableArraySpliceChange`

### Redux
- `asReduxStore`, `ReduxStore`
- `connectReduxDevTools`

### Global Config
- `setGlobalConfig`, `getGlobalConfig` (via `globalConfig.d.ts`)
- `GlobalConfig`

### Path Types
- `Path`, `PathElement`, `WritablePath`
- `ParentPath`, `RootPath`, `FoundParentPath`

### Utilities
- `deepEquals`
- `MobxBonsaiError`
- `Primitive`

---

## 20. Real-World Usage Patterns

### Pattern: Todo List (from official example)

```ts
// store.ts
import { nodeType, node, TNode } from 'mobx-bonsai'

type Todo = TNode<'todoSample/Todo', {
    id: string
    text: string
    done: boolean
}>

type TodoList = TNode<'todoSample/TodoList', {
    items: Todo[]
}>

const TTodo = nodeType<Todo>('todoSample/Todo')
    .withKey('id')
    .defaults({ done: () => false })
    .settersFor('done', 'text')

const TTodoList = nodeType<TodoList>('todoSample/TodoList')
    .defaults({ items: () => [] })
    .getters({
        getPending(this: TodoList) {
            return this.items.filter(t => !t.done)
        },
        getDone(this: TodoList) {
            return this.items.filter(t => t.done)
        },
    })
    .actions({
        add(this: TodoList, todo: Todo) {
            this.items.push(todo)
        },
        remove(this: TodoList, todo: Todo) {
            const idx = this.items.indexOf(todo)
            if (idx >= 0) this.items.splice(idx, 1)
        },
    })

function createDefaultTodoList() {
    return TTodoList({
        items: [
            TTodo({ id: '1', text: 'Buy groceries' }),
            TTodo({ id: '2', text: 'Write code' }),
            TTodo({ id: '3', text: 'Learn mobx-bonsai' }),
        ],
    })
}
```

### Pattern: React Component with observer

```tsx
// app.tsx
import { observer } from 'mobx-react-lite'
import { getSnapshot } from 'mobx-bonsai'

const TodoView = observer(({ todo }: { todo: Todo }) => (
    <li onClick={() => TTodo.setDone(todo, !todo.done)}>
        {todo.done ? '✔️' : '👀'} {todo.text}
    </li>
))

const TodoListView = observer(({ todoList }: { todoList: TodoList }) => {
    const pending = TTodoList.getPending(todoList)
    const done = TTodoList.getDone(todoList)

    return (
        <div>
            <h2>Pending ({pending.length})</h2>
            <ul>{pending.map(t => <TodoView key={t.id} todo={t} />)}</ul>
            <h2>Done ({done.length})</h2>
            <ul>{done.map(t => <TodoView key={t.id} todo={t} />)}</ul>
        </div>
    )
})
```

### Pattern: Navigating Up the Tree

```ts
import { getParent, findParent } from 'mobx-bonsai'

// Get direct parent (might be an array):
const parentArray = getParent(someTodo)

// Find a specific ancestor by type:
const todoList = findParent<TodoList>(
    someTodo,
    (p) => TTodoList.nodeIsOfType(p)
)
```

### Pattern: Using Undo in React

```tsx
useEffect(() => {
    const manager = new UndoManager({ rootNode: document })
    return () => manager.dispose()
}, [document])
```

---

## 21. Tree vs Flat Structures

mobx-bonsai is fundamentally a **tree-based** library. Every node has at most one parent. The library provides tree navigation (getParent, getRoot, etc.) and structural constraints (a node can only exist in one place in the tree).

However, there is nothing preventing you from using a flat observable map as your data structure on top of mobx-bonsai. The current zen-outliner store.ts uses a flat `observable.map<string, OutlineNode>` with `parentId` references -- this is a valid pattern with plain MobX. If you want to use mobx-bonsai's tree features (getParent, snapshots, undo), you would structure the data as an actual nested tree (children arrays inside parent nodes).

**Trade-offs:**
- **Nested tree (mobx-bonsai native):** getParent/getRoot work automatically, snapshots capture the whole subtree, undo/redo tracks the subtree. Moving nodes requires removing from one parent and adding to another.
- **Flat map with parentId references:** O(1) lookup by id, easy to move nodes (just change parentId), but you lose mobx-bonsai's tree navigation and must manually implement parent lookups.

---

## 22. Sources

- [Official Documentation](https://mobx-bonsai.js.org/)
- [GitHub Repository](https://github.com/xaviergonz/mobx-bonsai)
- [Nodes Documentation](https://mobx-bonsai.js.org/nodes/)
- [Comparison Page](https://mobx-bonsai.js.org/comparison/)
- [Todo List Example](https://mobx-bonsai.js.org/examples/todo-list/)
- [Undo/Redo Manager](https://mobx-bonsai.js.org/undomanager/)
- [Frozen Nodes](https://mobx-bonsai.js.org/frozen-nodes/)
- [Y.js Binding](https://mobx-bonsai.js.org/integrations/yjs-binding/)
- [API Reference](https://mobx-bonsai.js.org/api/)
- [TNode Type](https://mobx-bonsai.js.org/api/types/tnode)
- [NodeTypeValue Type](https://mobx-bonsai.js.org/api/types/nodetypevalue)
- Installed package type definitions (`node_modules/mobx-bonsai/dist/types/`)
