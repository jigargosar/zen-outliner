# mobx-keystone Reference Guide

Comprehensive do's, don'ts, and patterns for mobx-keystone — compiled for the zen-outliner project.

---

## Table of Contents

1. [Model Definitions](#1-model-definitions)
2. [Properties and Collections](#2-properties-and-collections)
3. [Actions and Async Flows](#3-actions-and-async-flows)
4. [Snapshots and Serialization](#4-snapshots-and-serialization)
5. [Tree Structure](#5-tree-structure)
6. [References](#6-references)
7. [Undo/Redo](#7-undoredo)
8. [Action Middleware and Audit](#8-action-middleware-and-audit)
9. [React Integration](#9-react-integration)
10. [TypeScript Patterns](#10-typescript-patterns)
11. [Pitfalls and Anti-Patterns](#11-pitfalls-and-anti-patterns)
12. [Comparison: Plain MobX vs MST vs mobx-keystone](#12-comparison-plain-mobx-vs-mst-vs-mobx-keystone)

---

## 1. Model Definitions

Every model needs two things: a globally unique `@model("namespace/Name")` decorator, and extending `Model({...props})`.

```typescript
import { model, Model, prop, modelAction } from 'mobx-keystone'

@model("zenOutliner/Todo")
class Todo extends Model({
    text: prop<string>(),       // required string
    done: prop(false),          // optional, defaults to false
}) {
    @modelAction
    setDone(done: boolean) {
        this.done = done
    }
}
```

The `Model({...})` call defines the observable, snapshotable property schema. The class body holds actions, computed properties, and lifecycle hooks.

### Lifecycle Hooks

Two hooks exist as methods on the model class:

```typescript
@model("zenOutliner/Item")
class Item extends Model({ text: prop<string>() }) {
    // Called once when model is created
    onInit() {
        // setup contexts, initial state
    }

    // Called when model enters a registered root store tree
    // Return a disposer for cleanup on detach
    onAttachedToRootStore() {
        const disposer = reaction(
            () => getSnapshot(this),
            (sn) => localStorage.setItem("item", JSON.stringify(sn)),
            { fireImmediately: true }
        )
        return () => { disposer() }
    }
}
```

### Model IDs

Auto-generated ID accessible via `this.$modelId`. For custom IDs, use `idProp`:

```typescript
@model("zenOutliner/Node")
class OutlineNode extends Model({
    id: idProp,       // custom ID field
    text: prop<string>(),
}) {}
```

### DO

- Use globally unique strings for `@model("...")` — namespace them (e.g., `"zenOutliner/Node"`)
- Use `onAttachedToRootStore` for side effects (reactions, persistence) — it provides automatic cleanup via the returned disposer
- Use `idProp` when you need a stable, user-controlled ID

### DON'T

- Reuse `@model` strings across different classes — causes silent collisions
- Perform side effects in `onInit` that need cleanup — use `onAttachedToRootStore` instead (it supports disposers)

---

## 2. Properties and Collections

### Property Variants

```typescript
prop<string>()                    // required
prop(false)                       // optional, default value
prop<string | undefined>()        // truly optional
prop<string>().withSetter()       // auto-generates a setter action
tProp(types.string)               // same as prop but with runtime type checking
```

### Collections

mobx-keystone provides dedicated collection models instead of raw Maps/Sets:

```typescript
import { objectMap, arraySet } from 'mobx-keystone'

@model("zenOutliner/Store")
class Store extends Model({
    nodes: prop(() => objectMap<OutlineNode>()),   // Map-like, snapshots as plain object
    tags:  prop(() => arraySet<string>()),          // Set-like, snapshots as array
}) {}
```

### DO

- Use `prop(defaultValue)` for optional props — cleaner than `prop<T | undefined>()`
- Use `objectMap` / `arraySet` for collections — they serialize cleanly
- Use `.withSetter()` for simple single-field updates to avoid boilerplate actions

### DON'T

- Mix `prop` and `tProp` without reason — `tProp` adds runtime overhead; use `prop` unless you need runtime validation
- Store `undefined` in arrays — mobx-keystone arrays cannot hold `undefined` values

---

## 3. Actions and Async Flows

### Synchronous Actions

Only code inside `@modelAction` can mutate observable state:

```typescript
@model("zenOutliner/Counter")
class Counter extends Model({ count: prop(0) }) {
    @modelAction
    increment() {
        this.count++
    }
}
```

### Async Flows

Async actions use `@modelFlow` with generators — not `async/await`:

```typescript
import { model, Model, prop, modelAction, modelFlow, _async, _await } from 'mobx-keystone'

@model("zenOutliner/BookStore")
class BookStore extends Model({
    books: prop<string[]>(() => []),
}) {
    @modelFlow
    fetchBooks = _async(function* (this: BookStore, token: string) {
        const books = yield* _await(myBackendClient.getBooks(token))
        this.books = books
    })
}

// Usage: await store.fetchBooks("token")
```

### DO

- Always mutate state inside `@modelAction`
- Use `@modelFlow` + `_async` + `yield* _await()` for async operations (note the `*` in `yield*`)
- Type `this` explicitly in flow generators: `function* (this: MyModel, ...)`

### DON'T

- Use `async/await` inside model methods for state mutations — the middleware can't track them
- Forget the `*` in `yield* _await()` — `yield _await()` silently breaks
- Destructure methods from models: `const { doSomething } = myModel` loses `this` context

---

## 4. Snapshots and Serialization

Snapshots are immutable, structurally shared plain-object representations of the tree.

### Core API

```typescript
import { getSnapshot, fromSnapshot, applySnapshot, onSnapshot, clone } from 'mobx-keystone'

// Extract snapshot
const snap = getSnapshot(todo)
// => { done: false, text: "buy milk", $modelType: "zenOutliner/Todo" }

// Reconstruct from snapshot
const todo = fromSnapshot(Todo, snap)

// Clone with fresh IDs (generateNewIds is a clone option, not fromSnapshot)
const copy = clone(todo)  // generates new IDs by default

// Reconcile existing instance with new data
applySnapshot(todo, newSnap)

// Listen for changes
const disposer = onSnapshot(todo, (newSnap, prevSnap) => {
    console.log("changed:", newSnap)
})

// Clone (generates new IDs by default)
const cloned = clone(todo)
```

### Snapshot Processors

Transform data at the serialization boundary:

```typescript
@model("zenOutliner/Settings")
class Settings extends Model({
    names: prop<string[]>(() => []).withSnapshotProcessor({
        fromSnapshot: (sn: string) => sn.split(","),
        toSnapshot: (sn) => sn.join(","),
    }),
}) {}
```

### DO

- Use `onSnapshot` or `reaction(() => getSnapshot(node), ...)` for persistence
- Use `applySnapshot` for reconciliation — it reuses instances when model IDs match
- Ensure all model classes are imported/registered before calling `fromSnapshot`

### DON'T

- Call `getSnapshot()` inside React render — it creates a new object every time, defeating memoization
- Forget `$modelType` in manually constructed snapshots — `fromSnapshot` silently returns a plain observable instead of a model instance (TypeScript won't catch this)

---

## 5. Tree Structure

All state is organized as a tree. A non-primitive node can have at most one parent.

### Root Store Registration

```typescript
import { registerRootStore } from 'mobx-keystone'

const rootStore = new RootStore({})
registerRootStore(rootStore)  // activates lifecycle hooks for the entire subtree
```

### Traversal API

```typescript
import {
    getParent, getParentPath, getRoot, getRootStore,
    isRoot, findParent, walkTree, detach, onChildAttachedTo
} from 'mobx-keystone'

getParent(node)              // direct parent, or undefined
getRoot(node)                // tree root
getRootStore(node)           // registered root store, or undefined
findParent(child, predicate) // walk up until predicate matches

// Walk all nodes
walkTree(root, (node) => {
    // return non-undefined to stop early
}, WalkTreeMode.ParentFirst)

// Detach from parent
detach(node)

// Listen for child attach/detach
const dispose = onChildAttachedTo(
    () => parentNode,
    (child) => {
        console.log('attached:', child)
        return () => console.log('detached:', child)
    },
    { deep: true, fireForCurrentChildren: true }
)
```

### DO

- Call `registerRootStore()` on your top-level store — it activates `onAttachedToRootStore` hooks throughout the tree
- Use `findParent` for walking up the tree instead of manual traversal
- Use `detach(node)` to remove nodes from their parent

### DON'T

- Attach the same node instance to two parents — it violates the single-parent rule and throws
- Reuse detached instances as prop defaults — generate fresh instances instead
- Forget to call `registerRootStore` — lifecycle hooks won't fire

---

## 6. References

References are "fake" nodes that point to other objects using IDs, solving the single-parent constraint.

### `rootRef` — Tree-Wide ID Lookup

Simplest option. Resolves automatically when both the ref and target share a common root:

```typescript
import { rootRef, detach } from 'mobx-keystone'

const todoRef = rootRef<Todo>("zenOutliner/TodoRef", {
    onResolvedValueChange(ref, newTodo, oldTodo) {
        if (oldTodo && !newTodo) {
            detach(ref)  // auto-cleanup when target is removed
        }
    },
})
```

### `customRef` — Manual Resolution

For cases where target is not at root level:

```typescript
import { customRef, findParent } from 'mobx-keystone'

const todoRef = customRef<Todo>("zenOutliner/TodoRef", {
    resolve(ref) {
        const list = findParent<TodoList>(ref, (n) => n instanceof TodoList)
        return list?.list.find((t) => t.id === ref.id)
    },
    onResolvedValueChange(ref, newTodo, oldTodo) {
        if (oldTodo && !newTodo) detach(ref)
    },
})
```

### Ref API

```typescript
ref.current       // resolves target or throws
ref.maybeCurrent  // resolves or returns undefined
ref.isValid       // boolean
ref.id            // stored ID string
```

### Back-References

```typescript
import { getRefsResolvingTo } from 'mobx-keystone'

// Returns observable set of all refs pointing to this node
const refs = getRefsResolvingTo(targetNode, todoRef)
```

### Target Model Convention

Models should declare `getRefId()` for automatic ref resolution:

```typescript
@model("zenOutliner/Todo")
class Todo extends Model({ id: prop<string>() }) {
    getRefId() { return this.id }
}
```

### DO

- Use `rootRef` for flat-map architectures where all nodes share a common root
- Use `onResolvedValueChange` to clean up dangling refs when targets are deleted
- Declare `getRefId()` on models that will be referenced

### DON'T

- Use `customRef` when `rootRef` suffices — it's more code for no benefit
- Access `ref.current` without checking `ref.isValid` first if deletion is possible

---

## 7. Undo/Redo

Built-in undo middleware — directly relevant to zen-outliner's core USP.

### Setup

```typescript
import { undoMiddleware, UndoStore } from 'mobx-keystone'

// In-memory undo (simplest)
const undoManager = undoMiddleware(myModel)

// Persistent undo (store embedded in model tree, survives snapshots)
@model("zenOutliner/Root")
class Root extends Model({
    undoData: prop<UndoStore>(() => new UndoStore({})),
    outline: prop<OutlineStore>(() => new OutlineStore({})),
}) {}

const root = new Root({})
const undoManager = undoMiddleware(root, root.undoData)

// With limits (important — no default limit!)
const undoManager = undoMiddleware(root, undefined, {
    maxUndoLevels: 100,
    maxRedoLevels: 100,
})
```

### Core API

| Member | Type | Description |
|---|---|---|
| `canUndo` / `canRedo` | `boolean` | Observable — bind directly to UI |
| `undoLevels` / `redoLevels` | `number` | Queue depths |
| `undoQueue` / `redoQueue` | `readonly UndoEvent[]` | Full event stacks |
| `undo()` / `redo()` | method | Apply inverse/forward patches |
| `clearUndo()` / `clearRedo()` | method | Flush queues |
| `dispose()` | method | Detach middleware |

### Event Structure

Each undo event records patches and their inverses. The event contains an array of `PatchRecorderEvent` objects:

```typescript
// PatchRecorderEvent (each recording within an undo event)
{
    target: object,                        // the model that was patched
    patches: Patch[],                      // forward patches (for redo)
    inversePatches: Patch[],               // inverse patches (for undo)
}
```

Note: the exact `UndoEvent` shape may include additional metadata (action name, grouping info). Consult the TypeScript types in the installed package for the full interface.

### Grouping Multiple Actions

Three mechanisms for combining multiple actions into a single undo step:

```typescript
// Synchronous grouping
undoManager.withGroup("batch edit", () => {
    model.actionA()
    model.actionB()
})

// Async grouping via generator
undoManager.withGroupFlow("async batch", function* () {
    yield* _await(model.asyncAction())
})

// Manual grouping across async boundaries
const group = undoManager.createGroup("manual batch")
group.continue(() => model.syncAction1())
const val = await fetchSomething()
group.continue(() => model.syncAction2(val))
group.end()  // single undo event created
```

### Excluding from Undo

```typescript
@modelAction
internalBookkeeping() {
    this.tracked++
    undoManager.withoutUndo(() => { this.notTracked++ })  // skip for this manager
    withoutUndo(() => { this.alsoSkipped++ })               // skip for ALL managers
}
```

### Attached State (e.g., Cursor Position)

Save/restore non-model state alongside undo/redo:

```typescript
const undoManager = undoMiddleware(root, undefined, {
    attachedState: {
        save: () => ({ cursorPosition: getCursor(), selectedId: getSelectedId() }),
        restore: (state) => {
            setCursor(state.cursorPosition)
            setSelectedId(state.selectedId)
        },
    },
})
```

### DO

- Always set `maxUndoLevels` / `maxRedoLevels` — there is no default limit, memory will grow unbounded
- Guard `undo()` / `redo()` calls with `canUndo` / `canRedo` — they throw on empty queues
- Use `withGroup` to batch related actions (e.g., "indent node" = reparent + reorder)
- Use `attachedState` to preserve UI state like selection and cursor across undo/redo
- Embed `UndoStore` in the model tree if you want undo history to survive serialization

### DON'T

- Expect per-subtree selective undo — granularity is the entire subtree passed to `undoMiddleware`
- Assume grouping batches React renders — `withGroup` only affects the undo queue, each inner action still triggers MobX reactions
- Use `async/await` in `withGroupFlow` — must use generator syntax with `yield* _await()`

---

## 8. Action Middleware and Audit

Three tiers of middleware for tracking and intercepting mutations — the foundation for zen-outliner's audit journal.

### `onActionMiddleware` — Simple Top-Level Tracking

Tracks only top-level actions (ignores nested sub-actions):

```typescript
import { onActionMiddleware, serializeActionCall } from 'mobx-keystone'

const disposer = onActionMiddleware(rootStore, {
    onStart(actionCall, ctx) {
        const serialized = serializeActionCall(rootStore, actionCall)
        auditLog.push({ ...serialized, timestamp: Date.now() })

        // Optionally cancel or override:
        // return { result: ActionTrackingResult.Throw, value: new Error("blocked") }
    },
    onFinish(actionCall, ctx, ret) {
        // ret.result === ActionTrackingResult.Return or .Throw
        // ret.value has the return/thrown value
    },
})
```

### `actionTrackingMiddleware` — Granular (Async-Aware)

Tracks async flow lifecycle with suspend/resume hooks:

```typescript
import { actionTrackingMiddleware } from 'mobx-keystone'

const disposer = actionTrackingMiddleware(rootStore, {
    filter(ctx) { return true },     // which actions to track
    onStart(ctx) { },                // action begins
    onResume(ctx) { },               // async flow resumes after yield
    onSuspend(ctx) { },              // async flow suspends at yield
    onFinish(ctx, ret) { },          // action completes
})
```

### Serialization and Replay

```typescript
import { serializeActionCall, applyAction } from 'mobx-keystone'

// Capture
const serialized = serializeActionCall(rootStore, actionCall)

// Replay on another store (e.g., for client/server sync)
applyAction(remoteStore, serialized)
```

### Action Context

Every middleware hook receives a context with:

- `actionName` — the method name
- `target` — the model instance
- `args` — the action arguments (read-only)
- `parentContext` / `rootContext` — for nested action tracking
- `data` — mutable object for custom middleware data (use Symbols as keys)

### DO

- Use `onActionMiddleware` for the audit journal — it gives you serializable action records with one simple API
- Use `serializeActionCall` to produce wire-safe, storable audit entries
- Register middleware on the root store to capture all mutations in the tree

### DON'T

- Enable middleware you don't need — one report showed a simple set operation going from 29ms to 187ms with unnecessary middleware active
- Use `actionTrackingMiddleware` when `onActionMiddleware` suffices — the granular version adds complexity

---

## 9. React Integration

mobx-keystone uses `mobx-react-lite` directly — no special bindings needed.

### Observer Components

```tsx
import { observer } from 'mobx-react-lite'

const TodoList = observer(({ store }: { store: TodoStore }) => (
    <ul>
        {store.todos.map((todo) => (
            <li key={todo.$modelId}>{todo.text}</li>
        ))}
    </ul>
))
```

### Root Store Context

```tsx
import { createContext, useContext } from 'react'
import { registerRootStore } from 'mobx-keystone'

const StoreContext = createContext<RootStore | null>(null)

export const useStore = () => {
    const store = useContext(StoreContext)
    if (!store) throw new Error('Store not found')
    return store
}

// In app entry:
const rootStore = new RootStore({})
registerRootStore(rootStore)

function App() {
    return (
        <StoreContext.Provider value={rootStore}>
            <TodoList />
        </StoreContext.Provider>
    )
}
```

### DO

- Use `observer()` from `mobx-react-lite` — it works identically to plain MobX
- Use `$modelId` as React keys — it's stable across re-renders
- Keep observer components small and focused for fine-grained re-renders
- Use `@computed` getters for derived data — they're cached by MobX

### DON'T

- Call `getSnapshot()` inside render — creates a new object every time, defeats memoization
- Import a special mobx-keystone React package — it doesn't exist, use `mobx-react-lite`

---

## 10. TypeScript Patterns

mobx-keystone is TypeScript-first. Types are inferred from `prop<T>()` — no parallel type system.

### Basic Typing

```typescript
@model("zenOutliner/Todo")
class Todo extends Model({
    text: prop<string>(),
    done: prop(false),          // inferred as boolean
}) {
    @modelAction
    setText(t: string) { this.text = t }  // 'this' is fully typed
}

// ModelData<Todo> = { text: string; done: boolean }
```

### Typed Snapshots

```typescript
const snap = getSnapshot(todo)
// Type: { done: boolean; text: string; $modelType: "zenOutliner/Todo" }

// Typed patches
onPatches(todo, (patches, inversePatches) => {
    // patches: Patch[] — { path, op, value }
})
```

### Generic Models

```typescript
// Direct generic
@model("zenOutliner/GenericPoint")
class GenericPoint<T> extends Model(<T>() => ({
    x: prop<T>(),
    y: prop<T>(),
}))<T> {}

// Factory pattern
function createModel<TX, TY>(name: string, ix: TX, iy: TY) {
    @model(`zenOutliner/${name}`)
    class M extends DataModel({ x: prop<TX>(() => ix), y: prop<TY>(() => iy) }) {}
    return M
}
```

### Polymorphic Type Narrowing

```typescript
const shapeType = types.or(
    (sn) => (sn.kind === "circle" ? Circle : Rectangle),
    Circle,
    Rectangle
)
```

### DO

- Use standard TypeScript annotations — `prop<T>()` infers everything
- Use `instanceof` for type narrowing — models are real classes
- Use `@computed` with standard MobX — no special `views()` blocks needed

### DON'T

- Use `as`, `any`, or `!` to work around types — if the types don't work, the model definition is wrong
- Assume generics work identically to plain TS classes — while generic model syntax (`Model(<T>() => ({...}))<T>`) is supported, serialization may still require concrete classes per type combination

---

## 11. Pitfalls and Anti-Patterns

### Silent Failures

1. **Missing `$modelType` in snapshots** — `fromSnapshot` silently returns a plain observable object instead of a model instance. TypeScript won't catch it. Always include `$modelType` in manually constructed snapshots.
2. **Unregistered model classes** — if a model class isn't imported/loaded at runtime, `fromSnapshot` can't resolve `$modelType` and fails silently.

### Performance

3. **Large tree instantiation** — creating big trees from API data can take >1 second. Mitigations:
   - Use `DataModel` for read-only data (~25% faster)
   - Use `frozen()` for immutable blobs
   - Avoid `tProp` runtime checking on hot paths
4. **Middleware overhead** — one report showed `onActionMiddleware` ballooning a set operation from 29ms to 187ms. Only enable middleware you actually need.
5. **Store size degrades action speed** — simple primitive assignments slow from ~5ms to ~25ms as the store grows.

### Async Pitfalls

6. **`yield*` vs `yield`** — `yield* _await(promise)` is correct. `yield _await(promise)` silently breaks. The `*` is mandatory.
7. **`withGroupFlow` requires generator syntax** — cannot use `async/await`.

### General

8. **Method destructuring** — `const { action } = model` loses `this` context. Always call `model.action()`.
9. **Runtime validation is fail-fast** — throws on first error, no way to collect all validation errors (GitHub issue #160).
10. **No default undo queue limit** — must set `maxUndoLevels` explicitly or memory grows unbounded.
11. **Computed properties can't return new model instances** without storing them as class fields.
12. **`maybe` types from MST** become `prop<T | undefined>()` — arrays cannot hold `undefined`.

### Relevant GitHub Issues

- [#432 — Slowness with big model](https://github.com/xaviergonz/mobx-keystone/issues/432)
- [#308 — Deprecating prop in favor of tProp](https://github.com/xaviergonz/mobx-keystone/issues/308)
- [#239 — Generic models](https://github.com/xaviergonz/mobx-keystone/issues/239)
- [#160 — Runtime validation limitations](https://github.com/xaviergonz/mobx-keystone/issues/160)
- [#285 — No snapshotProcessor replacement](https://github.com/xaviergonz/mobx-keystone/issues/285)
- [Discussion #303 — MST migration pain points](https://github.com/xaviergonz/mobx-keystone/discussions/303)

---

## 12. Comparison: Plain MobX vs MST vs mobx-keystone

### Feature Matrix

| Feature | Plain MobX | MST | mobx-keystone |
|---|---|---|---|
| Model definition | `makeAutoObservable` | `types.model({...})` chain | `@model` + `extends Model({...})` |
| TypeScript | Native | Weak inference, `self`/`this` confusion | First-class, `this` everywhere |
| Self-recursive models | Manual | Requires `types.late` hacks | Native support |
| Snapshots | Manual `toJSON` | Built-in | Built-in |
| Undo/redo | Hand-roll | Separate first-party package (`mst-middlewares`) | `undoMiddleware` included in core |
| Action middleware | `spy()` / `intercept()` | MST middleware | `onActionMiddleware` with serialization |
| Tree structure | Manual | Built-in | Built-in |
| `instanceof` | Works | Does not work (opaque wrappers) | Works |
| Runtime types | None | Always on (`types.*` DSL) | Optional (`tProp`) |
| React binding | `mobx-react-lite` | `mobx-react-lite` | `mobx-react-lite` |

### Bundle Size (minified + gzip, approximate)

| Package | Size |
|---|---|
| mobx | ~16 KB |
| mobx-state-tree (on top of mobx) | ~17 KB |
| mobx-keystone (on top of mobx) | ~22 KB |

### Ecosystem Size

| Package | Weekly Downloads | GitHub Stars |
|---|---|---|
| mobx-state-tree | ~101K | ~7K |
| mobx-keystone | ~6K | ~600 |

### When to Choose Each

| Choose... | When... |
|---|---|
| **Plain MobX** | Reactive state without tree structure, snapshots, or patches. Simplest option. |
| **MST** | Batteries-included tree management with runtime validation. Models are not deeply recursive. You value ecosystem size. |
| **mobx-keystone** | Strong TypeScript ergonomics, self-recursive trees, snapshot/patch support, undo management. Can tolerate smaller community. |

### Why mobx-keystone for zen-outliner

1. **Undo/redo** — `undoMiddleware` provides multi-level undo out of the box, with grouping and attached state (cursor, selection). This is a core USP.
2. **Audit journal** — `onActionMiddleware` + `serializeActionCall` captures every mutation as a serializable record. This is a core USP.
3. **TypeScript-first** — no `as`, `any`, or `!` needed, aligning with the project convention.
4. **React layer unchanged** — `observer()` from `mobx-react-lite` works identically; no component changes needed.
5. **Tree-aware** — `getParent`, `findParent`, `walkTree` are useful for outliner node traversal, though the flat-map approach can coexist.

---

## Sources

- [mobx-keystone Official Docs](https://mobx-keystone.js.org/)
- [MST Comparison](https://mobx-keystone.js.org/mst-comparison/)
- [Undo Middleware](https://mobx-keystone.js.org/action-middlewares/undo-middleware/)
- [Action Middleware](https://mobx-keystone.js.org/action-middlewares/on-action-middleware/)
- [Snapshots](https://mobx-keystone.js.org/snapshots/)
- [References](https://mobx-keystone.js.org/references/)
- [Tree-Like Structure](https://mobx-keystone.js.org/tree-like-structure/)
- [GitHub: xaviergonz/mobx-keystone](https://github.com/xaviergonz/mobx-keystone)
- [Introduction Blog Post](https://medium.com/@xaviergonz/mobx-keystone-an-alternative-to-mobx-state-tree-without-some-of-its-pains-8140767a3aa1)
