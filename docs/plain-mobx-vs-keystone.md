# Plain MobX vs mobx-keystone for zen-outliner

Research date: 2026-03-31

zen-outliner needs four capabilities beyond basic state management:
multi-level undo/redo, an audit journal, snapshots for persistence,
and a path toward Y.js/CRDT collaboration. This document compares
building those on plain MobX (with helper libraries) against adopting
mobx-keystone.

The project currently uses **mobx-bonsai** (same author as
mobx-keystone, lighter weight, built on plain MobX). Where
mobx-bonsai already covers a capability, that is noted.

---

## 1. Multi-level undo/redo

This is the app's core USP. The undo system must handle tree
operations (indent, outdent, move, delete subtree, split/merge nodes)
as atomic units.

### mobx-keystone

`undoMiddleware` is a first-class feature. It intercepts actions,
records JSON patches (forward) and inverse patches (backward), and
groups everything inside a single `@modelAction` into one undoable
step. Additional features:

- `withGroup` / `withGroupFlow` to combine multiple actions into one
  undo step (e.g., "move node" = remove + insert).
- `withoutUndo` to exclude bookkeeping changes (e.g., updating a
  "last modified" timestamp).
- `attachedState` to save/restore external state alongside each step
  (e.g., cursor position, scroll offset).
- The `UndoStore` can live inside a model, so undo history itself is
  serializable and persistable.
- Patches are RFC 6902-style, memory-efficient (stores diffs, not
  full snapshots).

### Plain MobX

No built-in undo. Options:

1. **mobx-bonsai UndoManager** (already in the project's dependency
   tree). Monitors changes via MobX's `onDeepChange`, groups changes
   within a single MobX action into one undoable event. Supports
   selective recording disable and attached state. However, it stores
   *snapshot copies of changed values* per step rather than minimal
   patches, which can be expensive for large trees with frequent edits.
   It also has a Y.js binding (`mobx-bonsai-yjs`).

2. **mobx-shallow-undo** -- tracks undo/redo for a single observable
   value. Far too limited for a tree.

3. **Travels** (by Mutative) -- framework-agnostic undo/redo powered
   by Mutative JSON Patches. Has a `mutable: true` mode designed for
   observable stores (MobX, Vue). Stores only RFC 6902 diffs, claims
   10x less memory than snapshot-based approaches. Works, but you must
   wire it up yourself: call `createTravels()`, feed it your state,
   manually invoke `setState` inside every MobX action. No awareness
   of MobX action boundaries for automatic grouping.

4. **Immer `produceWithPatches`** -- returns `[nextState, patches,
   inversePatches]`. You could build an undo stack from these. But
   Immer produces *new* frozen objects, which conflicts with MobX's
   mutable observable model. You would need to `applyPatches` back
   onto the MobX store manually. This is a fundamental impedance
   mismatch: Immer wants immutability, MobX wants mutability.

5. **DIY with `spy()` or `observe()`** -- MobX's `spy()` fires on
   every action, reaction, and observable change globally. You could
   record action names and arguments, then replay inverses. This is
   the command pattern. It works but requires you to write an inverse
   for every action (e.g., `addNode` -> `removeNode`, `setText` ->
   `setText` with old value). Scales poorly as action count grows
   and is error-prone.

### Verdict

**mobx-keystone wins clearly.** Its undo middleware is
production-ready, patch-based, handles grouping/exclusion/attached
state, and is the most battle-tested option in the MobX ecosystem.
mobx-bonsai's UndoManager is a reasonable second choice (and is
already available) but uses snapshot copies instead of patches,
costing more memory on large trees. The DIY options require
significant custom code -- exactly what the project's design
philosophy says to avoid.

---

## 2. Audit journal (who, what, when)

Every change tracked with metadata: which user made it, what changed,
timestamp.

### mobx-keystone

`onPatches(subtreeRoot, (patches, inversePatches) => { ... })` fires
after every action with the exact JSON patches. You can stamp each
entry with `Date.now()` and a user ID to build a complete audit log.
The patches are structured (path, op, value), so "what changed" is
machine-readable without custom parsing.

The `undoMiddleware` events also contain the action name
(`actionName`), which gives you human-readable labels for free.

### Plain MobX

1. **`spy()`** -- fires globally on every action, computation, and
   reaction. Events include `type` (action/reaction/etc.), `name`
   (action name), and `arguments`. You can filter for
   `event.type === 'action'` and log action name + args + timestamp +
   user. However, `spy()` does not give you the *data diff* -- only
   action invocation info. To know *what changed*, you also need
   `observe()` or `reaction()`.

2. **`observe(target, callback)`** -- fires per-property with
   `{ type, name, oldValue, newValue }`. For deep observation on an
   `observable.map` you would need to observe the map itself plus
   recursively observe each value's properties. There is no built-in
   `deepObserve` in MobX core (it existed in `mobx-utils` but was
   removed). mobx-bonsai's `onDeepChange` fills this gap.

3. **Combining `spy()` + `observe()`** -- you can correlate action
   events (from spy) with property change events (from observe) to
   build journal entries with both "who did what" and "what changed."
   This is doable but requires careful bookkeeping and is fragile --
   you are essentially reimplementing what keystone's patch system
   does out of the box.

### Verdict

**mobx-keystone is significantly easier.** `onPatches` gives you
structured diffs per action with zero custom code. Plain MobX can
do it by combining `spy()` + deep observation, but you are writing
and maintaining a non-trivial correlation layer. If your audit
requirements are simple (just log action names, no diffs), plain
MobX's `spy()` is fine.

---

## 3. Snapshots for persistence

Save/load the entire tree to localStorage, IndexedDB, or a server.

### mobx-keystone

- `getSnapshot(root)` returns a plain JS object with `$modelType`
  metadata for lossless round-tripping.
- `applySnapshot(root, snapshot)` reconciles the live tree with a
  snapshot, triggering minimal MobX updates (only changed properties
  fire reactions).
- `onSnapshot(root, (newSnap, prevSnap) => { ... })` for reactive
  persistence (e.g., debounce + save on every change).
- Snapshots are JSON-serializable by design. No special handling
  needed for Maps, Sets, or circular references (keystone uses refs).

### Plain MobX

1. **`toJS()` + `JSON.stringify()`** -- `toJS()` converts observable
   objects to plain JS. Works for simple cases, but: does not handle
   `observable.map` correctly (serializes as `{}` instead of entries),
   drops computed properties, ignores non-enumerable properties.
   `observable.map` must be manually converted via
   `Object.fromEntries(store.nodes)` or `[...store.nodes.entries()]`.

2. **Rehydration** -- no built-in `applySnapshot`. You must manually
   clear the map, iterate the saved data, and re-populate. No
   reconciliation (everything is replaced, all reactions fire).

3. **mobx-persist-store / mobx-persist / mobx-sync** -- third-party
   libraries that auto-persist observable properties to
   localStorage/AsyncStorage. They handle `ObservableMap` and
   `ObservableSet` serialization. However, they are config-driven
   decorators tied to specific storage backends, not a general
   snapshot system.

4. **mobx-bonsai** -- provides `getSnapshot` and `applySnapshot` for
   bonsai node trees, similar to keystone's API. If you stay within
   bonsai's node system, this works well.

### Verdict

**For the current flat-map store shape, plain MobX + manual
serialization is honestly fine.** The store is a single
`observable.map<string, OutlineNode>` with plain-object values.
`[...store.nodes.entries()]` serializes cleanly and rehydration is
a simple loop. You do not need keystone's snapshot system for this.

However, if the store grows to include refs, model types, or nested
observables, manual serialization becomes increasingly painful.
keystone's snapshot system scales effortlessly because it is built
into the type system.

---

## 4. Y.js / CRDT collaboration potential

### mobx-keystone

**mobx-keystone-yjs** is an official companion package (same author).
It two-way syncs a keystone model tree with a Y.js document:

- Local keystone actions produce patches that are applied to the Y.js
  doc.
- Remote Y.js updates are applied back to the keystone tree.
- Conflict resolution is handled by Y.js's CRDT algorithm.
- Includes `YjsTextModel` for collaborative text editing within
  nodes.
- When using Y.js collab, keystone docs recommend switching to Y.js's
  built-in `UndoManager` instead of keystone's `undoMiddleware`, since
  Y.js UndoManager properly handles collaborative undo semantics
  (only undo *your* changes, not others').

This is the most complete MobX + Y.js integration available.

### Plain MobX

1. **mobx-bonsai-yjs** -- provides a Y.js binding for bonsai node
   trees. Two-way sync, same author as keystone-yjs. Documentation
   recommends using Y.js's UndoManager when using this binding. This
   is a viable option if you stay on mobx-bonsai.

2. **SyncedStore** -- a standalone library that wraps Y.js shared
   types in plain JS objects/arrays. Has `enableMobxBindings(mobx)` to
   make SyncedStore reactive with MobX. You work with normal-looking
   objects that secretly back onto Y.js types. However, SyncedStore
   imposes its own data model -- your MobX store structure must
   conform to SyncedStore's schema, which may conflict with your
   existing flat-map design.

3. **MobY** -- was a MobX-Yjs bridge, now **deprecated** and moved
   to `@reactivedata/yjs-reactive-bindings`. Not recommended.

4. **DIY** -- observe MobX changes (via `observe()` or `reaction()`),
   translate to Y.js operations, and listen to Y.js events to update
   MobX state. This is a significant engineering effort with subtle
   pitfalls around avoiding infinite update loops, batching, and
   conflict resolution. Not recommended unless you have very unusual
   requirements.

### Verdict

**mobx-keystone-yjs is the gold standard** for this integration.
mobx-bonsai-yjs is a close second and works for the project's current
stack. Both are maintained by the same author (xaviergonz). Going
fully DIY is inadvisable -- the bidirectional sync problem is
deceptively hard.

---

## 5. Immer + MobX: a viable combination?

Immer's `produceWithPatches` generates forward and inverse patches,
which is exactly what undo/redo and audit logging need. Can we use
Immer on top of MobX?

**No, not naturally.** The fundamental problem:

- Immer works by creating a *draft proxy* of your state, recording
  mutations to the draft, then producing a *new frozen object* plus
  patches.
- MobX works by making your state *mutable and observable*, tracking
  reads to know what to re-render.

These are opposed models. To use Immer with MobX you would need to:

1. Take a snapshot of the MobX state (plain JS).
2. Run it through `produceWithPatches` to get patches.
3. Apply the result back to the MobX observables.

This is possible but defeats the purpose of both libraries. You lose
MobX's fine-grained reactivity during the produce step, and you add
the overhead of snapshotting + freezing + re-applying on every action.

**Mutative** (the library behind Travels) is faster than Immer and
has a `mutable: true` mode that skips the freeze step, making it
friendlier to observable stores. But it still requires manual wiring.

**Bottom line:** Immer's patch system is excellent in an immutable
world (Redux, Zustand). In the MobX world, the framework's own change
tracking should be used instead.

---

## 6. Standalone event sourcing / operation log libraries

For a complete audit journal, you might consider dedicated event
sourcing libraries:

- **Emmett** -- Node.js event sourcing framework. Overkill for a
  frontend outliner; designed for backend CQRS systems with event
  stores, projections, and process managers.

- **EventSourcing.NodeJS** (Oskar Dudycz) -- tutorials and examples,
  not a library. Backend-focused.

These are server-side tools. For a client-side outliner, rolling a
simple append-only log from MobX action events or keystone patches
is far more appropriate than pulling in a CQRS framework.

A pragmatic approach: capture keystone's `onPatches` output (or
MobX `spy()` events) into an array, stamp with `{ userId, timestamp,
actionName }`, and periodically flush to IndexedDB or a server. This
is 20-30 lines of code, not a framework.

---

## Summary comparison table

| Capability | mobx-keystone | Plain MobX | mobx-bonsai (current) |
|---|---|---|---|
| **Undo/redo** | Built-in, patch-based, grouping, exclusion, attached state | DIY or Travels (manual wiring) | Built-in UndoManager, snapshot-based (heavier memory) |
| **Audit journal** | `onPatches` gives structured diffs per action | `spy()` + deep observe (custom correlation layer) | `onDeepChange` (no structured patch format) |
| **Snapshots** | `getSnapshot`/`applySnapshot` with reconciliation | `toJS()` + manual rehydration (fine for flat maps) | `getSnapshot`/`applySnapshot` available |
| **Y.js collab** | Official `mobx-keystone-yjs` package | SyncedStore (different data model) or DIY | `mobx-bonsai-yjs` package available |
| **Bundle size** | ~30 KB min+gz (on top of MobX) | 0 extra (just MobX ~16 KB) | ~8 KB min+gz (on top of MobX) |
| **TypeScript** | First-class, runtime type checking | Whatever you build | Good, no runtime type layer |
| **Migration effort** | Rewrite store to keystone models | N/A (already there) | Minor (already in use) |

---

## Honest assessment

### Where plain MobX is actually fine

- **Simple persistence.** The current store is a flat
  `observable.map`. Serializing it is trivial. You do not need
  keystone's snapshot system for this.
- **Basic reactivity.** `observer` + `makeAutoObservable` is all you
  need for rendering. keystone adds nothing here.
- **Small-to-medium apps without collab.** If undo/redo were not a
  core feature, plain MobX would be perfectly adequate.

### Where plain MobX falls short

- **Undo/redo at scale.** The moment you need grouping, exclusion,
  attached state, and memory-efficient patch storage, you are
  rebuilding keystone's undo middleware. This is the single biggest
  gap.
- **Structured change tracking.** Plain MobX gives you property-level
  change events via `observe()` and action-level events via `spy()`,
  but correlating them into "here is exactly what action X changed"
  requires custom infrastructure that keystone provides via
  `onPatches`.
- **Y.js integration.** mobx-keystone-yjs and mobx-bonsai-yjs are
  the only production-ready options. Going DIY is a multi-week
  project with subtle bugs.

### Recommendation for zen-outliner

Given that multi-level undo/redo is the app's *core USP*, the
pragmatic path depends on migration appetite:

1. **Stay on mobx-bonsai** (least effort). Its UndoManager and
   Y.js binding cover the basics. The snapshot-based undo is a
   known tradeoff for memory. For the audit journal, wrap
   `onDeepChange` to log changes with timestamps. This is "good
   enough" if undo history stays reasonably bounded (e.g., cap at
   100-200 steps).

2. **Move to mobx-keystone** (best capabilities, most migration
   work). Rewrite the store to use keystone's `Model` / `prop`
   system. Gain patch-based undo, `onPatches` for auditing,
   robust snapshots, and the best Y.js integration. The store is
   small enough today that migration is a day of work, not a week.

3. **Plain MobX + Travels** (middle ground, more custom code).
   Drop bonsai, use Travels for patch-based undo, wire `spy()` for
   audit logging, handle serialization manually. More code to own
   and maintain, violating the "use libraries" principle.

Option 2 is the strongest fit for the stated requirements. Option 1
is reasonable if you want to defer the migration and validate the
product first.

---

## Sources

- [mobx-keystone undoMiddleware](https://mobx-keystone.js.org/action-middlewares/undo-middleware/)
- [mobx-keystone snapshots](https://mobx-keystone.js.org/snapshots/)
- [mobx-keystone patches](https://mobx-keystone.js.org/patches/)
- [mobx-keystone-yjs binding](https://mobx-keystone.js.org/integrations/yjs-binding/)
- [mobx-bonsai UndoManager](https://mobx-bonsai.js.org/undomanager/)
- [mobx-bonsai Y.js binding](https://mobx-bonsai.js.org/integrations/yjs-binding/)
- [mobx-bonsai comparison with keystone](https://mobx-bonsai.js.org/comparison/)
- [MobX spy and observe](https://mobx.js.org/api.html)
- [MobX intercept and observe](https://mobx.js.org/intercept-and-observe.html)
- [Travels (Mutative undo/redo)](https://github.com/mutativejs/travels)
- [Immer patches](https://immerjs.github.io/immer/patches/)
- [SyncedStore MobX integration](https://syncedstore.org/docs/advanced/mobx/)
- [mobx-shallow-undo](https://github.com/httptoolkit/mobx-shallow-undo)
- [mobx-persist-store](https://github.com/quarrant/mobx-persist-store)
- [Emmett event sourcing](https://github.com/event-driven-io/emmett)
