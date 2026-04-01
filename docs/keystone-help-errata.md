# keystone-help.md — Errata

Issues found by verifying against current mobx-keystone v1.21.0 docs and type definitions (2026-04-01).

---

## Significant

### 1. Section 1, line 26 — `@model` presented as the only way to define models

The guide says "Every model needs two things: a globally unique `@model("namespace/Name")` decorator..." This is incorrect. Model **registration** is required, but `@model` is just one mechanism. The official `decoratedModel()` function is the alternative for non-decorator environments:

```typescript
class _Todo extends Model({ text: prop<string>(), done: prop(false) }) {
    setDone(done: boolean) { this.done = done }
}

const Todo = decoratedModel("myCoolApp/Todo", _Todo, undefined, {
    setDone: modelAction,
})
```

The guide should say models need a unique type string registered via either `@model("id")` or `decoratedModel("id", ...)`.

### 2. Section 7, lines 422-435 — `UndoEvent` structure is materially wrong

The guide claims events contain `PatchRecorderEvent` objects with a `target` field. The actual type is a discriminated union:

```typescript
type UndoEvent = (UndoSingleEvent | UndoEventGroup) & {
    attachedState: { beforeEvent: any; afterEvent: any }
}

// UndoSingleEvent has:
//   targetPath: Path
//   actionName: string
//   patches: ReadonlyArray<Patch>
//   inversePatches: ReadonlyArray<Patch>

// UndoEventGroup has:
//   events: UndoEventWithoutAttachedState[]
```

`PatchRecorderEvent` is from a completely different subsystem and is not part of the undo event structure at all.

### 3. Section 11, lines 739-746 — Three closed GitHub issues listed as active

| Issue | Guide implies | Actual status |
|---|---|---|
| #308 (Deprecating prop in favor of tProp) | Open concern | Closed, resolved in v0.64.0 |
| #239 (Generic models) | Open limitation | Closed, factory patterns released |
| #285 (No snapshotProcessor replacement) | Open gap | Closed, resolved in v0.61.0 with `withSnapshotProcessor` |

Only #160 (runtime validation) and Discussion #303 (MST migration) are still open.

### 4. Section 4, line 238 — `getSnapshot()` "creates a new object every time" is incorrect

Structural sharing means `getSnapshot` returns the **same reference** when data is unchanged. It only returns a new object when the underlying data has actually mutated. The real concern in React render is:
- The returned plain object is not observable, so MobX cannot track it for reactivity.
- If the node *has* changed, the new reference breaks shallow equality checks in `React.memo`.

---

## Medium

### 5. Section 10, lines 689-697 — `types.or` with discriminator callback unverifiable

```typescript
const shapeType = types.or(
    (sn) => (sn.kind === "circle" ? Circle : Rectangle),
    Circle,
    Rectangle
)
```

This API signature (discriminator function as first argument to `types.or`) does not appear in current mobx-keystone documentation. Verify against source code or remove.

### 6. Section 4, line 239 — `$modelType` warning is too broad

The silent failure when `$modelType` is missing applies specifically to `fromSnapshot<T>(snapshot)` (generic overload, no runtime type info). When using `fromSnapshot(ModelClass, snapshot)` (model class as first arg), the class IS provided at runtime, so the `$modelType` field is less critical. The warning should clarify which overload is affected.

### 7. Section 8, lines 548-556 — Standalone `serializeActionCall` misleading

The code block:

```typescript
const serialized = serializeActionCall(rootStore, actionCall)
```

presents `actionCall` as a freely available variable. In reality, `actionCall` only exists inside `onActionMiddleware` callbacks (`onStart`/`onFinish` first parameter). The example should show it being used within an `onStart` handler.

### 8. Section 4, lines 216-228 — Snapshot Processors section is incomplete

Only covers per-property `withSnapshotProcessor`. Omits model-level snapshot processing:

```typescript
@model("name")
class Name extends Model(modelProps, {
    fromSnapshotProcessor(sn) { /* transform incoming snapshot */ },
    toSnapshotProcessor(sn, modelInstance) { /* transform outgoing snapshot */ },
}) {}
```

These are the primary mechanism for snapshot versioning and migration.

---

## Minor

### 9. Section 5, line 284 — `fireForCurrentChildren: true` is the default

Showing it explicitly implies the reader must opt in. Either omit it or change to `fireForCurrentChildren: false` to demonstrate suppression.

### 10. Section 7 — `withGroup` name parameter is optional

The guide only shows `withGroup("name", fn)`. There is also an overload `withGroup(fn)` without the name.

### 11. Section 7 — Missing `isUndoRecordingDisabled` from API table

`UndoManager` exposes `get isUndoRecordingDisabled(): boolean`. There is also a standalone `isGlobalUndoRecordingDisabled()` function.

### 12. Section 8, lines 560-566 — Missing `type` field from action context

The `SimpleActionContext` interface includes a `type: ActionContextActionType` field that distinguishes sync actions from async flow stages. Omitted from the guide's property list.

### 13. Section 11, pitfall #9 — Mischaracterizes issue #160

Framed as a limitation ("throws on first error, no way to collect all validation errors") when the issue is actually a feature request for comprehensive validation. The existing `tProp` checks do fail fast, but the issue is about wanting a richer validation system.

### 14. Section 12, line 765 — "opaque wrappers" is not standard MST terminology

MST uses Proxy-based tree nodes, not ES6 classes. `instanceof` doesn't work because models aren't class instances. Suggested fix: "(not class instances; use `Type.is()` instead)".

### 15. Section 12, lines 770-783 — Bundle sizes and download numbers are undated

Point-in-time snapshots with no date of measurement. Current star counts are still close (~7.1K MST, ~606 keystone), but download numbers will drift.

### 16. Section 1, line 47 — `onLazyInit` not mentioned

`onLazyInit` exists as a third lifecycle hook for class models. The guide says "Two hooks exist" which is technically incomplete.
