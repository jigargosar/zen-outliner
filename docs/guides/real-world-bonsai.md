# Real-World mobx-bonsai Usage Research

Research date: 2026-03-31

## TL;DR

mobx-bonsai has **zero known third-party adopters** in public codebases. It is a very new,
niche library (~17 GitHub stars, 0 npm dependents, 0 forks). The only code using it is
the official repo itself and zen-outliner. This is not unusual for a brand-new library
from a solo author, but it means you are an early adopter with no community patterns to
draw from beyond the official docs and examples.

---

## 1. Search Results Summary

| Search Strategy | Result |
|---|---|
| GitHub code search: `"from 'mobx-bonsai'"` excluding xaviergonz | **0 results** |
| GitHub code search: `"mobx-bonsai"` in package.json excluding xaviergonz | **0 results** |
| npm dependents for mobx-bonsai | **0 dependents** |
| Web search: `site:github.com "mobx-bonsai" -xaviergonz` | **0 results** |
| Web search: blog posts on dev.to / Medium / Hashnode | **0 results** |
| Web search: Reddit / Hacker News / Discord threads | **0 results** |
| CodeSandbox / StackBlitz examples | **0 results** (only generic MobX ones) |
| awesome-mobx list | **Not listed** |
| mobx-ecosystem list (xgrommx) | **Not listed** |
| npm trends comparison page | **mobx-bonsai not indexed** (too few downloads) |

### Repository Stats

- GitHub stars: ~17
- Forks: 0
- npm weekly downloads: Not enough to appear on npm trends (mobx-keystone has ~6k/week, mobx-state-tree has ~101k/week)
- Created by: [xaviergonz](https://github.com/xaviergonz) (same author as mobx-keystone)
- License: MIT
- Monorepo packages: `mobx-bonsai`, `mobx-bonsai-yjs`
- Latest version at time of research: 14.2.0

---

## 2. Relationship to mobx-keystone

mobx-bonsai is by the same author as [mobx-keystone](https://github.com/xaviergonz/mobx-keystone) (597 stars, ~6k weekly downloads). It is **not** a rename or fork -- it is a ground-up rewrite with a different philosophy:

- **mobx-keystone**: Class-based models with decorators, methods live on instances
- **mobx-bonsai**: Functional approach -- nodes are plain observable objects, actions/getters/computeds are external functions called as `TNodeType.actionName(node, ...args)`

The mobx-keystone repo has a [discussion thread](https://github.com/xaviergonz/mobx-keystone/discussions/321) where users share what they build. Projects mentioned there (Polyhedz Studio, Reflect.app, Harika) all use mobx-keystone, not mobx-bonsai. None of those discussions mention mobx-bonsai.

---

## 3. Official Examples in the mobx-bonsai Repo

The repo at [github.com/xaviergonz/mobx-bonsai](https://github.com/xaviergonz/mobx-bonsai) is a monorepo with:

```
packages/
  mobx-bonsai/          # Core library
  mobx-bonsai-yjs/      # Y.js two-way binding
apps/
  site/                 # Docusaurus docs site
  benchmark/            # Performance benchmarks
  profiling/            # Profiling tools
```

### 3.1 Todo List Example (the only full example)

Source: https://mobx-bonsai.js.org/examples/todo-list/

This is the canonical example showing the entire pattern. Three files:

**store.ts** -- Defines node types with the builder API:

```typescript
import { nodeType, TNode } from "mobx-bonsai"

// Typed node with a discriminator string and a key field
type Todo = TNode<"todoSample/Todo", {
    id: string
    text: string
    done: boolean
}>

export const TTodo = nodeType<Todo>("todoSample/Todo")
    .withKey("id")            // enables identity-by-key
    .defaults({ done: () => false })
    .settersFor("done", "text")  // generates TTodo.setDone(), TTodo.setText()

type TodoList = TNode<"todoSample/TodoList", { todos: Todo[] }>

export const TTodoList = nodeType<TodoList>("todoSample/TodoList")
    .defaults({ todos: () => [] })
    .getters({
        getPending() { return this.todos.filter((t) => !t.done) },
        getDone() { return this.todos.filter((t) => t.done) },
    })
    .actions({
        add(todo: Todo) { this.todos.push(todo) },
        remove(todo: Todo) {
            const index = this.todos.indexOf(todo)
            if (index >= 0) this.todos.splice(index, 1)
        },
    })
```

**app.tsx** -- React components using the functional call pattern:

```typescript
// Actions are called as static functions on the node type:
TTodo.setDone(todo, !todo.done)
TTodoList.remove(list, todo)
TTodoList.add(list, TTodo({ text: newTodo, done: false }))

// Getters too:
const pendingTodos = TTodoList.getPending(list)
```

**logs.tsx** -- Demonstrates snapshots:

```typescript
import { getSnapshot } from "mobx-bonsai"
const rootStoreSnapshot = getSnapshot(props.rootStore)
// Returns a plain immutable JS object for serialization
```

---

## 4. Key API Patterns (from the docs)

These are the patterns you can learn from since there are no third-party codebases to study.

### 4.1 Plain nodes (no type tag)

```typescript
import { node } from 'mobx-bonsai'
const state = node<{ count: number }>({ count: 0 })
// state is a plain MobX observable with tree superpowers
```

### 4.2 Typed nodes with builder chain

```typescript
const TMyNode = nodeType<MyType>("myType")
    .withKey("id")
    .defaults({ field: () => defaultValue })
    .settersFor("field1", "field2")
    .getters({ getName() { return this.name } })
    .computeds({ fullName() { return `${this.first} ${this.last}` } })
    .actions({ doThing(arg: string) { this.field = arg } })
    .volatile({ tempState() { return false } })
    .onInit(node => { /* runs when node enters tree */ })
```

### 4.3 Tree traversal

```typescript
import { getParent, getRoot, walkTree, WalkTreeMode } from 'mobx-bonsai'

const parent = getParent(childNode)
const root = getRoot(anyNode)

walkTree(root, (node) => {
    // visit every node
}, WalkTreeMode.ParentFirst)
```

### 4.4 Snapshots

```typescript
import { getSnapshot, applySnapshot, onSnapshot } from 'mobx-bonsai'

const snap = getSnapshot(node)           // immutable copy
applySnapshot(node, savedSnap)           // restore from snapshot
const disposer = onSnapshot(node, (newSnap, oldSnap) => { /* react */ })
```

### 4.5 Undo/Redo

```typescript
import { UndoManager } from 'mobx-bonsai'

const undoManager = new UndoManager({
    rootNode: myRoot,
    maxUndoLevels: 50,
    groupingDebounceMs: 500,  // merge rapid changes
})

undoManager.undo()
undoManager.redo()
undoManager.withoutUndo(() => { /* changes not tracked */ })
undoManager.dispose()
```

### 4.6 Contexts (dependency injection across tree)

```typescript
import { createContext } from 'mobx-bonsai'

const usernameCtx = createContext<string>()

// Set in parent
TParent.onInit((node) => {
    usernameCtx.setComputed(() => node.username)
})

// Read in any descendant
const username = usernameCtx.get(childNode)
```

### 4.7 Y.js real-time collaboration

```typescript
import { bindYjsToNode } from 'mobx-bonsai-yjs'

const { mobxNode, dispose } = bindYjsToNode<AppState>({
    yjsDoc,
    yjsObject: yjsDoc.getMap("appState"),
})
// mobxNode stays in sync with Y.js state bidirectionally
```

---

## 5. Performance Claims

From the official comparison page (https://mobx-bonsai.js.org/comparison/):

- 3.27x faster node creation vs mobx-state-tree
- 5.94x faster creation with property access
- 9.08x faster property modifications
- Significantly lower memory footprint

The `apps/benchmark/` directory in the repo contains the benchmark code but specifics of what it tests were not visible from the directory listing.

---

## 6. What This Means for zen-outliner

You are among the very first users of mobx-bonsai outside the author's own examples. Implications:

1. **No community patterns to copy.** You will need to derive store architecture from first principles + the official docs.
2. **The todo list example is your closest reference.** It shows the full pattern: typed nodes with keys, builder chain for getters/actions/setters, functional call syntax in React.
3. **The API is stable-ish** (version 14.x) but could change. The author is active (recent CI runs, recent npm publishes).
4. **Y.js integration is a unique selling point.** If you ever want real-time collaboration in the outliner, `mobx-bonsai-yjs` provides that out of the box.
5. **UndoManager is built in.** Useful for an outliner -- just `new UndoManager({ rootNode })`.
6. **Contexts solve cross-tree dependency injection** without prop drilling.

---

## 7. Sources

- [mobx-bonsai GitHub repo](https://github.com/xaviergonz/mobx-bonsai)
- [mobx-bonsai docs](https://mobx-bonsai.js.org/)
- [Nodes documentation](https://mobx-bonsai.js.org/nodes/)
- [Todo List example](https://mobx-bonsai.js.org/examples/todo-list/)
- [Comparison page](https://mobx-bonsai.js.org/comparison/)
- [Tree-Like Structure docs](https://mobx-bonsai.js.org/tree-like-structure/)
- [Snapshots docs](https://mobx-bonsai.js.org/snapshots/)
- [Undo/Redo Manager docs](https://mobx-bonsai.js.org/undomanager/)
- [Contexts docs](https://mobx-bonsai.js.org/contexts/)
- [Y.js Binding docs](https://mobx-bonsai.js.org/integrations/yjs-binding/)
- [mobx-keystone "What are you building?" discussion](https://github.com/xaviergonz/mobx-keystone/discussions/321)
- [mobx-bonsai npm package](https://www.npmjs.com/package/mobx-bonsai)
- [Bundlephobia: mobx-bonsai](https://bundlephobia.com/package/mobx-bonsai)
