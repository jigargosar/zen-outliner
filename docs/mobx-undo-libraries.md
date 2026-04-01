# MobX Undo/Redo Libraries Research

Research date: 2026-03-31

Scope: libraries that add undo/redo, patch tracking, change journaling, or snapshot support to **plain MobX** (not MST, not Keystone, not Bonsai).

---

## Libraries That Work With Plain MobX

### 1. mobx-shallow-undo

- **npm:** https://www.npmjs.com/package/mobx-shallow-undo
- **GitHub:** https://github.com/httptoolkit/mobx-shallow-undo
- **Stars:** ~18
- **Last published:** ~3 years ago (v1.1.0)
- **License:** Apache-2.0
- **TypeScript:** Yes (written in 96% TypeScript)
- **Dependencies:** Zero

**How it works:** You provide a getter and a setter. The library wraps the getter in a MobX reaction to detect changes, pushes snapshots onto an undo stack, and calls the setter to restore them. Shallow only -- it tracks the top-level value, not mutations inside nested objects.

**API surface:**

```ts
import { trackUndo } from 'mobx-shallow-undo'

const tracker = trackUndo(
    () => store.someValue,       // getter
    (v) => { store.someValue = v } // setter
)

tracker.undo()
tracker.redo()
tracker.dispose()
```

**Workaround for deep tracking:** Use `toJS()` in the getter to snapshot the entire nested structure as a plain object. This makes every change produce a full deep clone, which is fine for small trees but scales poorly.

**Verdict:** Tiny, zero-config, works with plain MobX. Good for single-property undo. For a tree outliner with nested nodes, the `toJS()` workaround is the only path, and it means full-tree snapshots on every keystroke.

---

### 2. travels (mutativejs)

- **npm:** https://www.npmjs.com/package/travels
- **GitHub:** https://github.com/mutativejs/travels
- **Stars:** ~840
- **Last release:** v1.0.0 (production-ready)
- **License:** MIT
- **TypeScript:** Yes
- **Dependencies:** `mutative` (peer dep)

**How it works:** Framework-agnostic undo/redo core powered by Mutative JSON Patches (RFC 6902). Instead of storing full snapshots, it stores only the forward/reverse patches for each change. Claims 10x faster than Immer-based approaches and far more memory-efficient.

Has explicit MobX support via a "mutable mode" that mutates the same object reference in place -- crucial for MobX since it relies on identity stability to trigger reactions.

**API surface:**

```ts
import { create } from 'travels'

const [store, controls] = create(initialState, {
    maxHistory: 100,
    mutable: true  // required for MobX
})

controls.setState((draft) => { draft.text = 'hello' })
controls.back()     // undo
controls.forward()  // redo
controls.getState()
controls.subscribe(listener)
```

**Constraint:** State must be JSON-serializable (plain objects, arrays, primitives). No class instances, no Date objects.

**Verdict:** Most modern and well-maintained option. Patch-based (memory efficient). But it introduces its own state container (`create()`) which means you'd need to reconcile it with your existing MobX observables. The "mutable mode" helps but the integration pattern isn't trivial -- you'd essentially be wrapping your MobX store in a travels container.

---

### 3. mobx-time-traveler

- **npm:** https://www.npmjs.com/package/mobx-time-traveler
- **GitHub:** https://github.com/Aedron/mobx-time-traveler
- **Stars:** ~1
- **License:** MIT
- **TypeScript:** Yes (100% TypeScript)

**How it works:** Decorator-based. You mark store classes with `@withTimeTravel` and action methods with `@actionWithSnapshot`. A global `timeTraveler` singleton records snapshots when decorated actions fire.

**API surface:**

```ts
import { withTimeTravel, actionWithSnapshot, timeTraveler } from 'mobx-time-traveler'

@withTimeTravel
class MyStore {
    @observable text = ''

    @actionWithSnapshot
    setText(v: string) { this.text = v }
}

const store = new MyStore()
timeTraveler.initSnapshots()

timeTraveler.undo()
timeTraveler.redo()
timeTraveler.canUndo // boolean
timeTraveler.canRedo // boolean
```

**Constraints:** Each store class name must be unique. Single instantiation per store. Uses legacy decorators.

**Verdict:** Nearly zero adoption (1 star). Decorator API is clean but the library is unmaintained and uses legacy decorator syntax that won't work with modern TypeScript without config changes. Not recommended.

---

### 4. json-mobx

- **npm:** https://www.npmjs.com/package/json-mobx
- **GitHub:** https://github.com/danielearwicker/json-mobx
- **Stars:** ~85
- **Last published:** ~8 years ago (v0.7.0)
- **Last commit:** February 2017
- **TypeScript:** Yes (98% TypeScript)

**How it works:** Objects maintain a mutable `json` property representing their serialized state. Uses a `@json` decorator on observable properties. An `Undo` class wraps a target and captures JSON snapshots on each change via `autorun`.

**API surface:**

```ts
import { json, Undo } from 'json-mobx'

class MyStore {
    @json @observable name = ''
}

const store = new MyStore()
const undoer = new Undo(store)

undoer.undo()
undoer.redo()
undoer.canUndo // boolean
undoer.canRedo // boolean
```

**Verdict:** Clever concept but completely dead. Last updated 2017, targets MobX 3.x era, uses legacy decorators. Would not work with MobX 6 without significant patching.

---

### 5. mobx-store

- **npm:** https://www.npmjs.com/package/mobx-store
- **GitHub:** https://github.com/AriaFallah/mobx-store
- **Stars:** ~280
- **Status:** **Archived** (December 2017, read-only)
- **TypeScript:** No (uses Flow)

**How it works:** A data store with declarative querying (lodash-based), observable state, and undo/redo. Stores only change deltas, not full copies.

**API surface:**

```js
store.undo('users')
store.redo('users')
store.canUndo('users')
store.canRedo('users')
```

**Verdict:** Archived and dead. No TypeScript. It's an entire alternative store system, not a composable undo layer. Irrelevant for modern use.

---

### 6. mobx-delorean

- **npm:** https://www.npmjs.com/package/mobx-delorean
- **GitHub:** https://github.com/BrascoJS/delorean
- **Stars:** ~250
- **TypeScript:** No (78% JavaScript)

**How it works:** A **developer debugging tool**, not a production undo/redo library. Wraps MobX stores with `delorean()`, renders a `<DeloreanTools />` React component with a time-travel slider UI. Logs all observable actions and state modifications. Supports stepping forward/backward and branching into alternate timelines.

**Verdict:** Dev tool only, not for end-user undo/redo. No TypeScript. Interesting for debugging but not what we need.

---

## MobX Built-in APIs for DIY Undo

### observe() and intercept()

**Docs:** https://mobx.js.org/intercept-and-observe.html

- `intercept(target, callback)` -- fires **before** a mutation is applied. Callback can modify, cancel, or allow the change.
- `observe(target, callback)` -- fires **after** a mutation with a change object describing what happened.

**Change object properties:**
- Object: `name`, `newValue`, `oldValue`
- Array: `index`, `removedCount`, `added`, `removed`
- Map: `name`, `newValue`, `oldValue`

**Critical limitations (from MobX docs):**
- "intercept and observe are low level utilities, and should not be needed in practice"
- "Using these utilities is an anti-pattern"
- **Does not track nested observables** -- only the direct properties of the target
- **Does not respect transactions** -- fires per-mutation, not per-action
- MobX recommends using `reaction` instead

**Can they be used for undo/redo?** In theory, yes -- `observe` gives you `oldValue` on each change, which you could push to a stack. In practice, the lack of nested tracking and transaction awareness makes them useless for anything beyond trivial single-property undo.

---

### deepObserve() from mobx-utils

**Package:** https://www.npmjs.com/package/mobx-utils
**Source:** https://github.com/mobxjs/mobx-utils/blob/master/src/deepObserve.ts

`deepObserve` is like `observe` but applied recursively to all current and future children. Signature: `(target, (change, path, root) => void) => disposer`.

**Key constraint:** The target cannot contain cycles -- must be a tree (which an outliner is).

**The transaction problem:** Like `observe`, `deepObserve` does not respect MobX transactions/actions. A single `runInAction` that modifies 3 properties will fire the callback 3 times, producing 3 separate undo entries instead of 1. Workarounds:

1. **Debounce** the listener -- groups rapid changes but makes undo async (laggy)
2. **Buffer changes within `queueMicrotask`** -- groups changes from the same synchronous action, but fragile

A community member (steveruizok) built several iterations of a deepObserve-based undo manager: https://github.com/mobxjs/mobx/discussions/3281. After 4 versions, he got a working synchronous solution, but it was never published as a library.

---

### reaction() + toJS() (DIY snapshot approach)

The simplest DIY pattern:

```ts
import { reaction, toJS } from 'mobx'

const history: Snapshot[] = []
let pointer = -1

reaction(
    () => toJS(store),  // deep-clone entire store each time anything changes
    (snapshot) => {
        history.splice(pointer + 1)  // discard redo future
        history.push(snapshot)
        pointer++
    }
)

function undo() {
    if (pointer > 0) {
        pointer--
        Object.assign(store, history[pointer])  // restore -- needs care
    }
}
```

**Advantages:** Simple, uses only MobX core APIs, respects transactions (reaction fires after the action completes).

**Problems:**
- `toJS()` deep-clones the entire tree on every change -- O(n) per keystroke
- Restoring requires careful deserialization back into observables
- No JSON patch trail, just full snapshots
- Memory grows linearly with history depth

Michel Weststrate (MobX creator) has consistently recommended MST for this use case, noting that plain MobX was never designed for serialization/deserialization workflows.

---

## Summary Table

| Library | Plain MobX? | TypeScript | Stars | Last Update | Approach | Production-Ready? |
|---|---|---|---|---|---|---|
| **mobx-shallow-undo** | Yes | Yes | 18 | ~2023 | Shallow snapshots via getter/setter | Yes, for shallow use |
| **travels** | Yes (with mutable mode) | Yes | 840 | Active | JSON Patches (RFC 6902) | Yes |
| **mobx-time-traveler** | Yes | Yes | 1 | Dead | Decorator + snapshots | No |
| **json-mobx** | Yes (MobX 3 era) | Yes | 85 | 2017 | JSON serialization + autorun | No |
| **mobx-store** | Yes | No (Flow) | 280 | Archived 2017 | Deltas | No |
| **mobx-delorean** | Yes | No | 250 | Stale | Dev tool, snapshots | Dev-only |
| **mobx-utils deepObserve** | Yes | Yes | (part of mobx-utils) | Maintained | Recursive observe | DIY building block |
| **DIY reaction+toJS** | Yes | Yes | N/A | N/A | Full snapshots | DIY |

---

## Conclusions

There is no well-maintained, widely-adopted library for undo/redo with plain MobX. The ecosystem settled on MST/Keystone/Bonsai for this problem because plain MobX lacks the serialization primitives (snapshots, patches) needed to do it well.

**Viable options for zen-outliner:**

1. **travels** -- The most modern and actively maintained option. Patch-based, memory-efficient, TypeScript. But it introduces its own state container, so integrating with existing MobX observables requires wrapping your store.

2. **mobx-shallow-undo with toJS()** -- Simplest drop-in. Works but means full-tree deep clones on every change. Fine if the tree stays small (hundreds of nodes).

3. **DIY with reaction + toJS** -- Same tradeoffs as #2 but without a dependency. You write ~30 lines of code.

4. **DIY with deepObserve** -- Most granular (change-level tracking), but the transaction problem makes it tricky to get right. The steveruizok prototype shows it's possible but requires careful buffering.

5. **Use mobx-bonsai's built-in UndoManager** -- Not "plain MobX" but zen-outliner already uses mobx-bonsai. This is the path of least resistance. It uses `onDeepChange` internally and groups changes within MobX actions into logical undo events. This is what the library was designed for.

---

## Key MobX GitHub Issues on This Topic

- [Issue #88: Undo/redo pattern?](https://github.com/mobxjs/mobx/issues/88) (2016) -- Original discussion
- [Issue #260: Performant undo/time travel in mobx?](https://github.com/mobxjs/mobx/issues/260) (2016) -- Performance approaches, led to `spy()` API
- [Issue #1630: Building undo/redo with MobX 5](https://github.com/mobxjs/mobx/issues/1630) (2018) -- Weststrate recommends MST or deepObserve
- [Issue #1764: Performant undo without spies in MobX 4+](https://github.com/mobxjs/mobx/issues/1764)
- [Discussion #3281: Undo/Redo with deepObserve](https://github.com/mobxjs/mobx/discussions/3281) (2022) -- steveruizok's iterative implementation

## Blog Posts

- [Implement Undo/Redo With MobX](http://magicbell.beanstu.io/front-end/2018/10/07/undo-redo-with-mobx.html) -- MagicBell blog, uses json-mobx approach
- [Turn On Time-Travelling Engine For MobX](https://itnext.io/turn-on-time-travelling-for-mobx-c3f267a46f10) -- kuitos on ITNEXT, decorator-based approach
