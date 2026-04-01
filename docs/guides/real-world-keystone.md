# Real-World mobx-keystone Projects and Examples

Research conducted 2026-03-31. mobx-keystone has ~606 GitHub stars, ~25k weekly npm downloads, and 6 npm dependents.

---

## Open Source Applications

### 1. Harika -- Offline-First Note-Taking App

- **Repo:** <https://github.com/quolpr/harika>
- **Status:** Development paused (creator joined RemNote), but code is available under AGPL-3.0
- **What it is:** An offline-first, performance-focused note-taking app with a graph-structured knowledge base. Closest to an outliner among all mobx-keystone projects found.
- **How it uses mobx-keystone:**
    - Uses mobx-keystone as the state manager with SQL.js (SQLite in the browser) as the persistence layer
    - Partially loads note data from SQL.js on demand -- notes load selectively regardless of database size
    - Tracks fine-grained data changes for efficient database synchronization
    - Implements LWW CRDT synchronization on top of SQLite for offline-first sync
    - Has a `NotesTreeRegistry` that manages the tree of notes
- **Tree handling:** Hierarchical note organization with sidebar navigation, reference/back-reference linking, daily notes
- **Tech:** TypeScript (96%), monorepo with Yarn, Docker for dev, PEG.js parser for markdown-like syntax
- **Relevance to zen-outliner:** High. This is the most relevant project -- a note-taking app with tree-structured data, offline-first, using mobx-keystone for state. The performance optimization issue (<https://lightrun.com/answers/xaviergonz-mobx-keystone-how-mobx-keystone-could-be-optimized>) discusses scaling challenges with large trees.

### 2. Polyhedz Studio (svg-widgets-monorepo)

- **Repo:** <https://github.com/justin-hackin/polyhedz-studio>
- **Live:** <https://polyhedz-studio.vercel.app>
- **What it is:** SVG scripting app for creating geometric polyhedra visualizations. Users fabricate interlocking pyramid nets that form stellations.
- **How it uses mobx-keystone:**
    - Ported from mobx-state-tree to mobx-keystone
    - Features a "tweakable nodes" concept -- nodes with configurable parameters
    - Extracting UI/state code into a reusable `svg-widget-studio` library
- **Tree handling:** Node hierarchy for geometric structures with tweakable parameters
- **Tech:** TypeScript (99%), Lerna monorepo, Vercel deployment, 1,116 commits, 12 stars

### 3. Consento Mobile App

- **Repo:** <https://github.com/consento-org/mobile>
- **What it is:** Security-focused mobile app for managing confidential data through trusted contacts. Funded by EU Horizon 2020.
- **How it uses mobx-keystone:**
    - Uses `registerRootStore`, `ArraySet`, `ObjectMap` from mobx-keystone
    - Custom persistence layer using `getSnapshot`, `applySnapshot`, `onPatches`, `patchToJsonPatch` with secure storage
- **Tech:** TypeScript (96.6%), React Native via Expo, 15 stars
- **Status:** Alpha

### 4. TodoMVC with Web Components

- **Repo:** <https://github.com/hcschuetz/todomvc-mobx-jsx>
- **What it is:** Classical TodoMVC using plain web components (no React), with mobx-keystone for reactive state
- **How it uses mobx-keystone:** Demonstrates reactive state management without a framework. Migrated from MST for better TypeScript integration.
- **Relevance:** Shows mobx-keystone works outside React

### 5. Unnamed B2B Web Service (from Discussion #321)

- **Source:** <https://github.com/xaviergonz/mobx-keystone/discussions/321>
- **What it is:** Production B2B service with PowerPoint-like drawing manipulation and admin panels
- **How it uses mobx-keystone:**
    - Handles complex SPA logic
    - Leverages TypeScript-native types
    - Uses contexts for inter-node value referencing
- **Why they chose it:** TypeScript types, fast compile time, context feature

### 6. Reflect.app (Unconfirmed)

- **URL:** <https://reflect.app>
- **What it is:** A commercial networked note-taking tool with end-to-end encryption, backlinks, daily notes
- **Status:** Mentioned in Discussion #321 as using mobx-keystone, but no public confirmation of the tech stack. The app is closed-source.

---

## Ecosystem Libraries (npm Dependents)

### mobx-keystone-persist

- **Repo:** <https://github.com/Phault/mobx-keystone-persist> (also forked at <https://github.com/fchastanet/mobx-keystone-persist>)
- **npm:** `mobx-keystone-persist`
- **What it does:** Persist and hydrate mobx-keystone stores to localStorage, localForage, or AsyncStorage
- **How it works:** Wraps `getSnapshot`/`applySnapshot`. Supports whitelist, blacklist, migrations, throttling.
- **Status:** Last published ~4 years ago, not actively maintained

### mobx-keystone-asyncstore

- **Repo:** <https://github.com/mekwall/mobx-keystone-asyncstore>
- **npm:** `mobx-keystone-asyncstore`
- **What it does:** Opinionated async store with fetch queues, fail states, TTL
- **How it works:** HOC pattern -- extend `AsyncStore` with your model type, provide `fetchOne`/`fetchMany`/`fetchAll` callbacks
- **Stars:** 4

### @hawkingnetwork/reactotron-mobx-keystone

- **npm:** `@hawkingnetwork/reactotron-mobx-keystone`
- **What it does:** Reactotron debugging plugin for mobx-keystone
- **Status:** v0.1.0, published ~6 years ago, no dependents

### mobx-keystone-yjs (Official)

- **Repo:** <https://github.com/xaviergonz/mobx-keystone/tree/master/packages/mobx-keystone-yjs>
- **npm:** `mobx-keystone-yjs`
- **What it does:** Two-way binding between mobx-keystone stores and Y.js documents for real-time collaboration
- **How it works:** Converts mobx-keystone state to Y.js documents (Y.Map, Y.Array, Y.Text), syncs bidirectionally. Uses WebRTC for P2P or any Y.js provider.
- **Key feature:** CRDT-based conflict-free sync, optimistic updates, offline support
- **Relevance to zen-outliner:** If you ever want collaborative editing, this is the path

---

## Official Examples (in the mobx-keystone repo)

The repo at `packages/site/src/examples/` contains:

### Todo List Example

- **Docs:** <https://mobx-keystone.js.org/examples/todo-list/>
- **What it shows:**
    - Model definition with `@model`, `@modelAction`, `@computed`
    - `Todo` model with id, text, done; `TodoList` with array of todos
    - Computed filtered views (pending/completed)
    - React integration with `mobx-react-lite` observer
    - Redux DevTools integration
    - Action/patch logging middleware
    - Immutable snapshot generation

### Client-Server Example

- **Files:** `clientServer/server.ts`, `clientServer/appInstance.tsx`
- **What it shows:** Synchronizing state between client and server using patches

### Y.js Binding Example

- **Docs:** <https://mobx-keystone.js.org/examples/yjs-binding/>
- **What it shows:** Two root stores kept in sync via WebRTC using Y.js. Demonstrates online/offline toggling.

### Sandboxes Example

- **Docs:** <https://mobx-keystone.js.org/sandboxes/>
- **What it shows:** Store of polymorphic items with validation rules that depend on other items. Tests whether new items can be added without validation errors.

---

## Tree Structure Patterns in mobx-keystone

### Self-Recursive Tree Node (the key pattern for outliners)

```typescript
@model("myApp/TreeNode")
class TreeNode extends Model({
    children: prop<TreeNode[]>(() => []),
}) {}
```

This is trivial in mobx-keystone but was "impossible (or at least very hard) to properly type" in mobx-state-tree.

### Tree Navigation API

- `getParent(node)` -- immediate parent
- `findParent(node, predicate)` -- walk up to matching ancestor
- `getRoot(node)` -- root of the tree
- `getRootPath(node)` -- full path from root
- `walkTree(node, predicate, mode)` -- traverse children (ParentFirst or ChildrenFirst)
- `findChildren(node, predicate)` -- collect matching descendants
- `isChildOfParent(node, parent)` / `isParentOfChild(parent, node)` -- relationship checks
- `detach(node)` -- remove from parent (splices array or deletes property)

### Tree Rules

1. Non-primitive nodes have at most one parent (single-tree constraint)
2. Same object instance cannot exist in two places (use references for aliases)
3. Models with `valueType: true` auto-clone on insertion

### Contexts (dependency injection through the tree)

```typescript
const settingsCtx = createContext<Settings>()

// Parent sets:
settingsCtx.setComputed(parentNode, () => computedSettings)

// Any descendant reads:
settingsCtx.get(childNode)
```

### References (pointing across the tree)

```typescript
const nodeRef = rootRef<TreeNode>("myApp/NodeRef", {
    onResolvedValueChange(ref, newValue, oldValue) {
        if (oldValue && !newValue) detach(ref)
    },
})
```

### Computed Trees (derived views)

```typescript
@computedTree
get filteredView() {
    return new FilteredNode({ ... })
}
```

Eagerly evaluated, cached, read-only. Supports full tree traversal, contexts, and references. Excluded from snapshots.

---

## Blog Posts and Articles

### "Tinkering with MobX Keystone" -- Mike Cann (2020)

- **URL:** <https://mikecann.blog/posts/tinkering-with-mobx-keystone>
- **Summary:** Compares mobx-keystone to MST. Key takeaway: models are classes (better TypeScript support for recursive/circular scenarios), runtime type checking is optional. Mike used MST extensively for BattleTabs and Markd before evaluating keystone.

### "mobx-keystone, an alternative to mobx-state-tree without some of its pains" -- Javier Gonzalez (creator)

- **URL:** <https://medium.com/@xaviergonz/mobx-keystone-an-alternative-to-mobx-state-tree-without-some-of-its-pains-8140767a3aa1>
- **Summary:** The creator's introduction. Key advantages: proper self-recursive model typing, cleaner instance/snapshot separation, consistent `this` usage, simpler lifecycle hooks (`onInit` + `onAttachedToRootStore` only).

### "Mobx-keystone: Road to domain-driven design" -- Kanade Hoshino

- **URL:** <https://medium.com/@hoshinokanade0/mobx-keystone-road-to-domain-driven-design-f0b84fb8983>
- **Summary:** Maps DDD concepts onto mobx-keystone. A node = an entity. Multiple roots = multiple bounded contexts. Argues the same DDD ideas from backend microservices apply to frontend state trees.

---

## MST-to-Keystone Migration Notes (from Discussion #303)

Source: <https://github.com/xaviergonz/mobx-keystone/discussions/303>

### What people liked after migrating

- `instanceof` checks instead of MST's `getParentOfType`
- Optional runtime type checking (`tProp` only where needed)
- Contexts feature ("THE reason I switched from MST" -- enables clean DI for Three.js orchestration)
- Path as array of strings instead of JSONPath string wrangling
- `onAttachedToRootStore` cleanup pattern similar to React's `useEffect` return

### Pain points

- `$modelType` must be present in every nested snapshot for `fromSnapshot` to work; silently returns plain object if missing
- Cannot use `getModelRefId` without instances -- manual ID management in snapshots
- Complex union type deserialization requires manual model instantiation
- Lifecycle methods require attachment to root store
- Destructuring model methods loses `this` context (use arrow functions)

---

## Key Takeaways for zen-outliner

1. **Self-recursive tree models are a first-class feature** -- the `TreeNode` with `children: prop<TreeNode[]>` pattern is exactly what an outliner needs, and it's trivially typed in mobx-keystone (unlike MST).

2. **Harika is the closest prior art** -- an offline-first note app with hierarchical notes, SQL.js persistence, and CRDT sync, all built on mobx-keystone. Worth studying its `NotesTreeRegistry` pattern.

3. **Tree navigation is built in** -- `getParent`, `findParent`, `walkTree`, `detach` etc. map directly to outliner operations (indent, outdent, move nodes, delete).

4. **Undo/redo comes free** -- built-in `undoMiddleware` with grouping support, plus "attached state" for things like cursor position that shouldn't pollute the undo stack.

5. **Y.js binding exists** -- if collaborative editing is ever needed, `mobx-keystone-yjs` provides the bridge.

6. **The ecosystem is small but focused** -- ~606 stars, ~6 npm dependents. This is a niche library. Most users migrated from MST for better TypeScript support.

7. **Note:** zen-outliner currently uses mobx-bonsai (by the same author), which is a lighter alternative. mobx-keystone is the heavier, more feature-rich sibling.
