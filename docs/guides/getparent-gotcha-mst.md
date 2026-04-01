# getParent() Gotcha in mobx-state-tree (MST)

## The Problem

In MST, the tree has exactly three kinds of nodes: **model**, **array**, and **map**.
When you store a model instance inside a `types.array()` or `types.map()`, MST
inserts an invisible intermediate collection node between the parent model and
the child. `getParent(node)` returns the *immediate* parent -- which is this
collection node, not the model you actually want.

## MST's Internal Tree Structure

Given this definition:

```ts
import { types, getParent } from 'mobx-state-tree'

const Todo = types
    .model('Todo', {
        title: types.string,
    })
    .actions((self) => ({
        remove() {
            // BUG: this returns the array node, not TodoStore
            const parent = getParent(self)
            //    ^? IMSTArray<...>  (the observable array wrapper)
        },
    }))

const TodoStore = types.model('TodoStore', {
    todos: types.array(Todo),
})
```

The actual tree looks like this:

```
TodoStore          ← depth 2 from a Todo
  └─ todos         ← depth 1 (the array node -- this is what getParent returns!)
       ├─ Todo[0]
       ├─ Todo[1]
       └─ Todo[2]
```

Calling `getParent(self)` from inside a `Todo` action returns the **array node**
(`todos`), not the `TodoStore`. This is the gotcha.

## The Same Thing Happens with types.map()

```ts
const UserStore = types.model('UserStore', {
    users: types.map(User),
})
```

```
UserStore          ← depth 2 from a User
  └─ users         ← depth 1 (the map node)
       ├─ "alice" → User
       └─ "bob"   → User
```

`getParent(someUser)` returns the map wrapper, not `UserStore`.

## Solution 1: Use the `depth` Parameter

`getParent` accepts a second argument: `depth` (default `1`). Setting it to `2`
skips the intermediate array/map node.

```ts
const Todo = types
    .model('Todo', {
        title: types.string,
    })
    .actions((self) => ({
        remove() {
            // depth=2: skip the array node, reach TodoStore
            const store = getParent<typeof TodoStore>(self, 2)
            store.removeTodo(self)
        },
    }))
```

### Depth cheat sheet

| Depth | What you get (from a Todo inside `types.array`) |
|-------|------------------------------------------------|
| 1     | The `todos` array node (default)               |
| 2     | The `TodoStore` model that owns the array       |
| 3     | Whatever is above `TodoStore` in the tree       |

## Solution 2: Use `getParentOfType` (Preferred)

MST provides `getParentOfType(node, type)` which walks up the tree until it
finds a parent matching the given type. This is more robust than hard-coding a
depth value, because it does not break if you restructure the tree.

```ts
import { getParentOfType } from 'mobx-state-tree'

const Todo = types
    .model('Todo', {
        title: types.string,
    })
    .actions((self) => ({
        remove() {
            const store = getParentOfType(self, TodoStore)
            store.removeTodo(self)
        },
    }))
```

There is a companion `hasParentOfType(node, type)` that returns `boolean`
instead of throwing, useful for conditional checks.

## Solution 3: Use `getRoot`

If the parent you want is the root of the tree, `getRoot(self)` is simpler than
counting depths.

```ts
import { getRoot } from 'mobx-state-tree'

const Todo = types
    .model('Todo', {
        title: types.string,
    })
    .actions((self) => ({
        remove() {
            const root = getRoot<typeof RootStore>(self)
            root.removeTodo(self)
        },
    }))
```

## Full Working Example

```ts
import { types, getParent, getParentOfType, destroy } from 'mobx-state-tree'

const Task = types
    .model('Task', {
        title: types.string,
        done: false,
    })
    .actions((self) => ({
        toggle() {
            self.done = !self.done
        },
        remove() {
            // WRONG -- returns the array, not the store:
            // const store = getParent(self)
            // store.removeTask(self)  // TypeError: store.removeTask is not a function

            // RIGHT -- depth=2 skips the array wrapper:
            const store = getParent(self, 2) as Instance<typeof TaskStore>
            store.removeTask(self)

            // ALSO RIGHT -- and more robust:
            // const store = getParentOfType(self, TaskStore)
            // store.removeTask(self)
        },
    }))

const TaskStore = types
    .model('TaskStore', {
        tasks: types.array(Task),
    })
    .actions((self) => ({
        addTask(title: string) {
            self.tasks.push({ title })
        },
        removeTask(task: Instance<typeof Task>) {
            destroy(task)
        },
    }))

const store = TaskStore.create({
    tasks: [{ title: 'Buy milk' }, { title: 'Write docs' }],
})

// Demonstrating the gotcha:
const firstTask = store.tasks[0]

console.log(getParent(firstTask))
// => the observable array (tasks), NOT the TaskStore

console.log(getParent(firstTask, 2))
// => the TaskStore instance

console.log(getParentOfType(firstTask, TaskStore))
// => the TaskStore instance (same result, more resilient)
```

## Why This Happens

MST models its state as a strict tree of nodes. Every `types.array()` and
`types.map()` creates a real, addressable node in that tree -- it is not just a
property on the parent model. The parent-child chain goes:

    model -> array/map -> item

This is by design: it lets MST track changes, apply patches, and produce
snapshots at any level. But it means `getParent` follows the *structural* tree,
not the *conceptual* model hierarchy you might have in your head.

## Caveats

1. **Timing**: `getParent` (and related functions) are only available after the
   node is attached to a tree. Inside model creation or `afterCreate`, the
   parent may not yet be set. Use `afterAttach` if you need parent access during
   initialization.

2. **Fragile depths**: Hard-coded depth values (`getParent(self, 2)`) break if
   you add or remove nesting levels. Prefer `getParentOfType` when possible.

3. **Nested arrays**: If you have `types.array(types.array(Item))`, each array
   is a separate node, so `getParent(item)` returns the inner array,
   `getParent(item, 2)` returns the outer array, and `getParent(item, 3)`
   returns the model.

## Related GitHub Issues

- [#477 -- getParentOfType(node, parentType)](https://github.com/mobxjs/mobx-state-tree/issues/477):
  The feature request that led to `getParentOfType` being added. The core
  motivation was exactly this gotcha -- users kept writing fragile
  `getParent(self, N)` calls and wanted a type-safe alternative.

- [#1408 -- Failed to find the parent at depth 2](https://github.com/mobxjs/mobx-state-tree/issues/1408):
  A user hit a runtime error when the tree structure did not match the assumed
  depth. Demonstrates why hard-coded depths are brittle.

- [#1491 -- getParent returns undefined](https://github.com/mobxjs/mobx-state-tree/issues/1491):
  Timing issue where `getParent` was called before the node was attached.

## References

- [MST API docs -- getParent](https://mobx-state-tree.js.org/API/)
- [MST API overview](https://mobx-state-tree.js.org/overview/api)
- [MST concepts -- Trees](https://mobx-state-tree.js.org/concepts/trees)
- [Theodo blog -- Manage your state with Mobx State Tree](https://blog.theodo.ma/mobx-state-tree/)
- [DEV Community -- Beginners guide to MST](https://dev.to/mattruby/beginners-guide-to-mobx-state-tree-in-5-minutes-or-less-2pli)
