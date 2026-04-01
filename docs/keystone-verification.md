# mobx-keystone Verification: Undo, Patches, and Snapshots

Verified against mobx-keystone v1.21.0 source code, not docs or summaries.

## 1. Undo/Redo: How It Actually Works

**Source:** `node_modules/mobx-keystone/src/actionMiddlewares/undoMiddleware.ts`

The undo system is **patch-based**, not snapshot-based. Here is the mechanism:

1. `undoMiddleware(subtreeRoot)` attaches an `actionTrackingMiddleware` to the given subtree.
2. When an action starts, a `patchRecorder` begins recording all patches emitted during that action.
3. When the action finishes, the recorder's collected `patches` and `inversePatches` are bundled into an `UndoSingleEvent` and pushed onto the undo stack.
4. **Undo** applies `inversePatches` in reverse order via `applyPatches(root, event.inversePatches, true)`.
5. **Redo** applies `patches` in forward order via `applyPatches(root, event.patches)`.

This means undo/redo is incremental -- it replays the minimal set of changes, not full snapshots. Memory usage scales with the number of changes, not the size of the tree.

### Undo Event Structure

Each event records:

```ts
interface UndoSingleEvent {
    type: "single"
    targetPath: Path           // e.g. ["children", 0]
    actionName: string         // e.g. "setText"
    patches: Patch[]           // forward patches (for redo)
    inversePatches: Patch[]    // reverse patches (for undo)
}
```

### Grouping

Multiple actions can be grouped into a single undo step via `undoManager.withGroup("name", fn)` or the async `withGroupFlow`. Nested groups are supported. This is useful for compound operations (e.g., "indent node" = remove + insert).

### Attached State

The `attachedState` option lets you save/restore non-model state (cursor position, scroll, selection) alongside each undo step. The undo manager calls `save()` before and after each action, and `restore()` on undo/redo. This is directly useful for outliner focus management.

### Limits

`maxUndoLevels` and `maxRedoLevels` options cap the stack size. Oldest events are shifted off when the limit is exceeded.

## 2. Patches: Format and Audit Logging

**Source:** `node_modules/mobx-keystone/src/patch/Patch.ts`, `emitPatch.ts`

### Patch Format

Patches follow JSON Patch semantics (RFC 6902 style) with an array path instead of a string:

```ts
type Patch =
    | { op: "add";     path: (string | number)[];  value: any }
    | { op: "remove";  path: (string | number)[] }
    | { op: "replace"; path: (string | number)[];  value: any }
```

The `path` is relative to the object that emitted the patch. When listening via `onPatches(subtreeRoot, ...)`, paths are prefixed to be relative to that subtree root.

Values in patches are **snapshot values** (plain JSON), not model instances. The source (`emitPatch.ts:166-176`) explicitly calls `getInternalSnapshot` on non-primitive values before storing them in patches.

### Listening to Patches

```ts
onPatches(root, (patches, inversePatches) => {
    // patches: what changed (forward)
    // inversePatches: how to reverse it
    auditLog.push({ timestamp: Date.now(), patches, inversePatches })
})
```

There is also `onGlobalPatches(listener)` which fires for all objects, not just a specific subtree.

### Audit Log Viability

Patches are plain JSON-serializable objects. They can be:

- Stored in localStorage, IndexedDB, or sent to a server
- Replayed in order via `applyPatches(root, patches)` to reconstruct state
- Reversed via `applyPatches(root, inversePatches, true)` to roll back
- Used to build a full change history with timestamps, user info, etc.

Each patch carries the exact path and value, making it suitable for fine-grained audit trails.

## 3. Snapshots: Format and Persistence

**Source:** `node_modules/mobx-keystone/src/snapshot/getSnapshot.ts`, `applySnapshot.ts`, `node_modules/mobx-keystone/src/model/metadata.ts`

### Snapshot Format

`getSnapshot(node)` returns plain JSON. For models, it includes a `$modelType` discriminator and a `$modelId` for identity:

```json
{
    "$modelType": "zen/RootStore",
    "$modelId": "uuid-here",
    "children": [
        {
            "$modelType": "zen/OutlineNode",
            "$modelId": "uuid-here",
            "text": "Chapter 1",
            "collapsed": false,
            "children": []
        }
    ]
}
```

- `$modelType` is the string passed to `@model("zen/RootStore")`. It is the only reserved key (`metadata.ts:18`).
- `$modelId` is the value of `idProp`. It maps to a model property, not a reserved key.
- All values are plain JSON -- no classes, no observables, no symbols.

### localStorage Persistence

```ts
// Save
localStorage.setItem('outline', JSON.stringify(getSnapshot(root)))

// Load
const data = JSON.parse(localStorage.getItem('outline'))
const root = new RootStore(data)        // create from snapshot
// or
applySnapshot(existingRoot, data)       // reconcile in place
```

`applySnapshot` reconciles intelligently -- it reuses existing model instances where IDs match (`applySnapshot.ts:122-133`), which preserves MobX observer subscriptions.

### Snapshot Immutability

Snapshots are frozen (`Object.freeze`) internally. They use shallow equality -- if nothing changed, `getSnapshot` returns the same reference. This makes `onSnapshot` reactions efficient.

## 4. Proof of Concept

See `src/poc-keystone.ts`. It compiles cleanly (`pnpm typecheck` passes) and demonstrates:

- Model definition with `idProp`, `prop`, `@modelAction`
- Root store with `registerRootStore`
- `undoMiddleware` wiring -- undo/redo of text edits, toggles, and node moves
- `onPatches` for audit logging
- `getSnapshot` producing plain JSON
- `applySnapshot` for restoring from serialized state
- Creating a new store from a parsed snapshot

## 5. Key Findings for the Outliner

| Concern | Verdict |
|---|---|
| Undo/redo | Patch-based, incremental, works out of the box. Supports grouping for compound operations. |
| Audit log | `onPatches` emits JSON-serializable patches with path + op + value. Directly usable as a change log. |
| Persistence | `getSnapshot` returns plain JSON with `$modelType` and `$modelId`. Round-trips through `JSON.parse`/`JSON.stringify`. |
| Focus/selection restore on undo | Supported via `attachedState` option on `undoMiddleware`. |
| Memory | Scales with number of changes (patches), not tree size. Configurable max levels. |
| Decorators | Works with TC39 standard decorators (TS 5+). No `experimentalDecorators` needed. Verified in source: `modelDecorator.ts` checks for `ClassDecoratorContext` and uses `addInitializer`. |
| Move/reparent | `detach(node)` removes from current parent, then insert at new position. Undo reverses both steps. |
