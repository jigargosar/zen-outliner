# mobx-utils Audit

**Package:** `mobx-utils` v6.1.1 (latest)
**License:** MIT
**Peer dependency:** `mobx ^6.0.0`
**Production dependencies:** none
**Weekly downloads:** ~200k (npm)
**Repository:** https://github.com/mobxjs/mobx-utils
**Maintainers:** mweststrate, xaviergonz, fredyc, narida

**Installed in zen-outliner:** No. The project uses `mobx-bonsai` (which has its own utilities).

---

## TypeScript Support

- Ships its own declarations via `"typings": "lib/mobx-utils.d.ts"`.
- Source is written in TypeScript (compiled with tsc).
- Generics used throughout; type inference works well.
- Quality: good. Types are first-party, not DefinitelyTyped.

---

## Module Formats

| Field          | Value                  |
| -------------- | ---------------------- |
| `main`         | `mobx-utils.umd.js`   |
| `module`       | `mobx-utils.module.js` |
| `typings`      | `lib/mobx-utils.d.ts`  |
| `react-native` | `mobx-utils.module.js` |

---

## Complete Export Inventory

The package has 16 source modules. Every public export is listed below.

### 1. fromPromise (Promise tracking)

```ts
function fromPromise<T>(
    origPromise: PromiseLike<T>,
    oldPromise?: IPromiseBasedObservable<T>
): IPromiseBasedObservable<T>

namespace fromPromise {
    const resolve: <T>(value?: T) => IFulfilledPromise<T> & IBasePromiseBasedObservable<T>
    const reject: <T>(reason: any) => IRejectedPromise & IBasePromiseBasedObservable<T>
}

function isPromiseBasedObservable(value: any): value is IPromiseBasedObservable<any>
```

Wraps a native Promise with observable `state` (`"pending" | "fulfilled" | "rejected"`) and `value` properties. The `.case({ pending, fulfilled, rejected })` method provides pattern-matching over promise state. The object is also thenable (supports `await`).

**Exported types:**

| Type                         | Description                                          |
| ---------------------------- | ---------------------------------------------------- |
| `IPromiseBasedObservable<T>` | Union of pending/fulfilled/rejected + base interface |
| `IBasePromiseBasedObservable<T>` | PromiseLike with `.case()` and branding          |
| `IPendingPromise<T>`         | `{ state: "pending"; value: T \| undefined }`       |
| `IFulfilledPromise<T>`       | `{ state: "fulfilled"; value: T }`                   |
| `IRejectedPromise`           | `{ state: "rejected"; value: unknown }`              |
| `CaseHandlers<U, T>`        | Handler map for `.case()`                            |

**Exported constants:** `PENDING`, `FULFILLED`, `REJECTED`

---

### 2. lazyObservable (Lazy loading)

```ts
function lazyObservable<T>(
    fetch: (sink: (newValue: T) => void) => void,
    initialValue?: T
): ILazyObservable<T>
```

Creates an observable that does not invoke `fetch` until something reads `.current()`. The `sink` callback can be called multiple times (sync or async) to push new values.

**Returned interface:**

| Member      | Type                  | Description                         |
| ----------- | --------------------- | ----------------------------------- |
| `current()` | `T`                   | Reads value (triggers fetch on first call) |
| `refresh()` | `T`                   | Re-invokes the fetch                |
| `reset()`   | `T`                   | Restores initial value              |
| `pending`   | `boolean`             | True while a fetch is in flight     |

---

### 3. fromResource (External data source bridge)

```ts
function fromResource<T>(
    subscriber: (sink: (newValue: T) => void) => void,
    unsubscriber?: IDisposer,
    initialValue?: T
): IResource<T>
```

Creates an observable that auto-subscribes/unsubscribes to an external data source based on whether anything is observing it. The `sink` pushes new values; `.current()` reads them reactively.

**Returned interface:**

| Member      | Type      | Description                        |
| ----------- | --------- | ---------------------------------- |
| `current()` | `T`       | Read current value (tracked)       |
| `dispose()` | `void`    | Force unsubscribe                  |
| `isAlive()` | `boolean` | Whether the resource is subscribed |

---

### 4. toStream / fromStream (Observable <-> Stream bridge)

```ts
function toStream<T>(
    expression: () => T,
    fireImmediately?: boolean
): IObservableStream<T>

function fromStream<T>(
    observable: IObservableStream<T>,
    initialValue?: T
): IStreamListener<T>
```

`toStream` converts a MobX reactive expression into a TC39 Observable / RxJS-compatible stream.
`fromStream` converts a stream back into a MobX observable holder.

**Exported interfaces:**

| Interface              | Key Members                               |
| ---------------------- | ----------------------------------------- |
| `IObservableStream<T>` | `subscribe(observer)` with overloads      |
| `IStreamListener<T>`   | `current: T`, `dispose(): void`           |
| `IStreamObserver<T>`   | `next?`, `error?`, `complete?` callbacks  |
| `ISubscription`        | `unsubscribe(): void`                     |

---

### 5. createViewModel (Dirty-tracking form model)

```ts
function createViewModel<T>(model: T): T & IViewModel<T>
```

Wraps an observable object with a proxy that tracks local edits without mutating the original until `.submit()`. Useful for edit forms with cancel/save semantics.

**IViewModel interface:**

| Member                       | Type                        | Description                                |
| ---------------------------- | --------------------------- | ------------------------------------------ |
| `model`                      | `T`                         | Reference to the original model            |
| `isDirty`                    | `boolean` (computed)        | True if any property has local changes     |
| `changedValues`              | `Map<keyof T, T[keyof T]>` | Map of dirty property names to new values  |
| `isPropertyDirty(key)`       | `boolean`                   | Check a single property                    |
| `submit()`                   | `void` (action)             | Copy local values to model, clear dirty    |
| `reset()`                    | `void` (action)             | Discard all local changes                  |
| `resetProperty(key)`         | `void` (action)             | Discard a single property's local change   |

**ViewModel class** is also exported (can be extended, but `createViewModel` is the recommended entry point).

---

### 6. keepAlive (Prevent computed suspension)

```ts
function keepAlive(target: Object, property: string): IDisposer
function keepAlive(computedValue: IComputedValue<any>): IDisposer
```

Prevents MobX from suspending a computed value when nothing observes it. Returns a disposer to restore normal behavior. Useful when a computed has side-effects or expensive re-computation costs.

---

### 7. queueProcessor (Observe-and-drain queue)

```ts
function queueProcessor<T>(
    observableArray: T[],
    processor: (item: T) => void,
    debounce?: number  // default 0 (sync)
): IDisposer
```

Watches an observable array and calls `processor` once per item added. Items are removed after processing. With `debounce > 0`, batches additions over the debounce window.

---

### 8. chunkProcessor (Batch queue processing)

```ts
function chunkProcessor<T>(
    observableArray: T[],
    processor: (items: T[]) => void,
    debounce?: number,       // default 0
    maxChunkSize?: number    // default 0 (unlimited)
): IDisposer
```

Like `queueProcessor` but passes chunks (arrays of items) to the processor. Supports max chunk size to limit batch size.

---

### 9. now (Observable clock)

```ts
function now(interval?: number | "frame"): number    // default 1000ms

function resetNowInternalState(): void
```

Returns the current epoch timestamp as an observable number, updating at the specified interval. Pass `"frame"` for `requestAnimationFrame` timing. Multiple consumers sharing the same interval share one timer.

`resetNowInternalState` tears down all internal timers -- intended for test cleanup only.

---

### 10. expr (Inline computed)

```ts
function expr<T>(expr: () => T): T
```

Shorthand for `computed(expr).get()`. Creates a temporary computed value inside another computed/reaction to prevent unnecessary re-evaluations. Useful for conditional sub-expressions.

---

### 11. createTransformer (Memoized reactive mapping)

```ts
function createTransformer<A, B>(
    transformer: ITransformer<A, B>,
    onCleanup?: ITransformerCleanup<A, B>
): ITransformer<A, B>

function createTransformer<A, B>(
    transformer: ITransformer<A, B>,
    options?: ITransformerParams<A, B>
): ITransformer<A, B>
```

Creates a memoized, reactive transformation function. Results are cached per input identity and automatically kept in sync. When the transformation is no longer observed, the cache entry is cleaned up (unless `keepAlive: true`).

**Exported types:**

| Type                       | Definition                                           |
| -------------------------- | ---------------------------------------------------- |
| `ITransformer<A, B>`       | `(object: A) => B`                                  |
| `ITransformerCleanup<A,B>` | `(result: B \| undefined, source?: A) => void`      |
| `ITransformerParams<A, B>` | `{ onCleanup?, debugNameGenerator?, keepAlive? }` + `IComputedValueOptions` |

---

### 12. computedFn (Memoized computed function)

```ts
function computedFn<T extends (...args: any[]) => any>(
    fn: T,
    keepAliveOrOptions?: boolean | IComputedFnOptions<T>  // default false
): T
```

Wraps a pure function so that each unique argument combination produces a MobX computed value. Results are cached only while observed (unless `keepAlive: true`).

**Options:**

| Field       | Type                                                         | Description                              |
| ----------- | ------------------------------------------------------------ | ---------------------------------------- |
| `onCleanup` | `(result: ReturnType<T> \| undefined, ...args: Parameters<T>) => void` | Called when a cached entry is evicted |
| (inherits)  | `IComputedValueOptions<ReturnType<T>>`                       | Standard MobX computed options           |

**Constraints:** argument count must be constant; no default arguments; function must be pure; must not be an action.

---

### 13. deepObserve (Recursive observer)

```ts
function deepObserve<T = any>(
    target: T,
    listener: (change: IChange, path: string, root: T) => void
): IDisposer
```

Recursively observes all current and future properties/elements of an observable tree. The listener receives change events with a dot-separated path string. The target must be a tree (no cycles).

`IChange` = `IObjectDidChange | IArrayDidChange | IMapDidChange` (MobX core types).

---

### 14. ObservableGroupMap (Reactive groupBy)

```ts
class ObservableGroupMap<G, T> extends ObservableMap<G, IObservableArray<T>> {
    constructor(
        base: IObservableArray<T>,
        groupBy: (x: T) => G,
        options?: { name?: string; keyToName?: (group: G) => string }
    )
    dispose(): void
}
```

Maintains a live `Map<GroupKey, Array<Item>>` that stays in sync with a source observable array. When items are added/removed/changed, group membership updates automatically. Mutating the map directly (`set`, `delete`, `clear`) throws.

---

### 15. moveItem (Array reorder)

```ts
function moveItem<T>(
    target: IObservableArray<T>,
    fromIndex: number,
    toIndex: number
): IObservableArray<T>
```

Moves an element within an observable array, validating bounds. Returns the array.

---

### 16. DeepMap / DeepMapEntry (Internal multi-key map)

```ts
class DeepMap<T> {
    entry(args: any[]): DeepMapEntry<T>
}

class DeepMapEntry<T> {
    exists(): boolean
    get(): T
    set(value: T): void
    delete(): void
}
```

A nested `Map<any, Map<any, ...>>` keyed by an argument array, with version checking for concurrent modification detection. Used internally by `computedFn` to cache results by argument tuple. Exported but primarily an implementation detail.

---

### 17. Utility exports

| Export                        | Signature                                              | Description                                         |
| ----------------------------- | ------------------------------------------------------ | --------------------------------------------------- |
| `IDisposer`                   | `() => void`                                           | Disposer function type                              |
| `NOOP`                        | `() => {}`                                             | No-op function                                      |
| `IDENTITY`                    | `(_: any) => _`                                        | Identity function                                   |
| `addHiddenProp`               | `(obj, propName, value) => void`                       | Adds non-enumerable property via defineProperty     |
| `getAllMethodsAndProperties`  | `(x: any) => any`                                      | Walks prototype chain for all members               |
| `fail`                        | `(message: string) => never`                           | Throws `[mobx-utils]` prefixed error                |
| `invariant`                   | `(cond: boolean, message?) => void`                    | Assertion helper                                    |

---

### 18. Decorator utilities (internal)

Not re-exported from the barrel file, but present in source:

- `decorateMethodOrField`
- `decorateMethod`
- `decorateField`

These are internal helpers for legacy decorator support. Not part of the public API.

---

## What mobx-utils Does NOT Provide

These features are commonly searched for but live in other packages:

| Feature                  | Where it lives                                                        |
| ------------------------ | --------------------------------------------------------------------- |
| **UndoManager / Undo-Redo** | `mobx-bonsai` (UndoManager), `mst-middlewares` (UndoManager), `mobx-keystone` (undoMiddleware) |
| **Patch tracking**       | `mobx-bonsai` (onDeepChange), `mobx-state-tree` (onPatch/applyPatch)  |
| **Snapshots**            | `mobx-bonsai` (getSnapshot/applySnapshot), `mobx-state-tree` (getSnapshot) |
| **Action middleware**    | `mobx-state-tree`, `mobx-keystone`                                    |
| **Type-safe models**     | `mobx-state-tree`, `mobx-keystone`, `mobx-bonsai`                     |
| **JSON serialization**   | `mobx-state-tree`, `mobx-bonsai`                                      |

---

## Relevance to zen-outliner

The project already uses **mobx-bonsai**, which provides its own UndoManager, snapshots, patches, and deep change tracking. Most of the utilities in mobx-utils are either:

1. **Redundant** -- `deepObserve` overlaps with mobx-bonsai's `onDeepChange`; `createViewModel` overlaps with bonsai's snapshot/apply pattern.
2. **Potentially useful** -- `computedFn` (memoized derived data), `fromPromise` (if async loading is needed), `now` (if time-based reactivity is needed).
3. **Irrelevant** -- `toStream`/`fromStream` (no RxJS in the project), `queueProcessor`/`chunkProcessor` (no queue processing needed), `ObservableGroupMap` (no grouping use case).

The package does NOT contain UndoManager, patch tracking, or snapshot utilities. For those, the project should continue using mobx-bonsai's built-in facilities.
