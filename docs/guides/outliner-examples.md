# Outliner & Tree Editor Research

Research into open source outliners, tree editors, and nested-list apps. Focus areas: data modeling
(nested vs flat), state management, keyboard navigation, and persistence/sync.

---

## 1. Production Outliners (Closed Source) -- Architectural Insights

### Notion

- **URL:** https://notion.com
- **Tech:** React frontend, PostgreSQL backend, custom sync engine
- **Blog post:** https://www.notion.com/blog/data-model-behind-notion

**Data model -- "Everything is a block":**
Every piece of content (text, image, heading, list item, page, database row) is stored as a single
`block` entity with a consistent schema. Blocks hold a `content` array of child block IDs -- these
are "downward pointers" forming a **render tree**. Indentation is structural: indenting a bullet
literally re-parents a block.

**Loading:** The API method `loadPageChunk` recursively descends the content tree from a starting
block ID, returning blocks + dependent records. Multiple DB round-trips may be needed in the worst
case.

**Key takeaway:** A flat table of blocks keyed by ID, with parent-child relationships expressed via
`content` arrays. The tree is **normalized** -- blocks reference children by ID, not by nesting
objects.

---

### WorkFlowy

- **URL:** https://workflowy.com
- **Tech:** React frontend (previously Backbone), custom backend

**Data model:** "Everything is in a tree." Any sublist can be viewed as a top-level list (zoom).
The bullet item is the atomic unit. WorkFlowy pioneered the infinite-zoom outliner pattern where the
same node can simultaneously be a to-do in a task list and the container for an entire working
document.

**Sync:** Uses operational transforms (OT) for real-time collaboration. Each operation describes a
tree mutation (insert, delete, move, edit text). The server serializes operations to resolve
conflicts.

**Key takeaway:** Flat list of nodes with parent pointers + ordering. OT for sync.

---

### Dynalist

- **URL:** https://dynalist.io
- **Tech:** Similar to WorkFlowy architecture

Very similar to WorkFlowy but with more features (dates, tags, bookmarks, cross-document links).
Updated more frequently than WorkFlowy. Uses a document-per-list model rather than WorkFlowy's
single-tree model.

---

### Roam Research

- **URL:** https://roamresearch.com
- **Tech:** ClojureScript frontend, Datomic backend (Datalog query engine)

**Data model:** Tree-based outliner at core, but extends with a **graph layer** -- bidirectional
links between blocks create a knowledge graph on top of the tree. Every block has a unique ID and
can be referenced/transcluded from any other block.

**Key takeaway:** Tree + graph hybrid. Datalog queries over the block graph.

---

### Tana

- **URL:** https://tana.inc
- **Tech:** TypeScript, online-only

**Data model:** Outliner nodes are "supertags" -- typed nodes with fields/attributes. The outliner
tree is also a structured database. Tana's model is the most schema-rich of the outliners: nodes
can have typed fields, and views can query/filter over them.

**Key takeaway:** Outliner meets structured data. Nodes are typed and queryable.

---

## 2. Open Source Outliners

### Logseq

- **URL:** https://github.com/logseq/logseq
- **Stars:** 35k+
- **Tech:** ClojureScript, Rum (React wrapper), DataScript (in-memory Datalog DB), Electron/Capacitor
- **DeepWiki:** https://deepwiki.com/logseq/logseq

**Data model:** Blocks are the atomic unit, each with a UUID. Hierarchical parent-child
relationships form the outline tree. Two storage backends:

1. **File-based:** Markdown/Org-mode files on disk, parsed into blocks via `mldoc` (AST parser).
2. **Database-backed (newer):** SQLite for persistent storage.

Application state is split: document state (pages, blocks, content) lives in **DataScript**
(in-memory immutable DB with Datalog queries); UI state (current editing block, sidebar) lives in
Clojure atoms.

**Block processing pipeline:**
Markdown text -> AST (via mldoc) -> reference extraction (page refs `[[page]]`, block refs
`((uuid))`, hashtags) -> DataScript entities.

**Keyboard navigation:** Full keyboard-driven editing. Enter creates siblings, Tab/Shift+Tab
indents/outdents, arrow keys navigate blocks.

**Persistence:** Local-first. Files on disk or SQLite DB. Sync via Git or Logseq Sync (proprietary).

**Key takeaway:** Blocks stored in an in-memory Datalog DB (DataScript) for powerful querying.
File-based persistence parsed to/from blocks. Most architecturally ambitious open source outliner.

---

### AppFlowy

- **URL:** https://github.com/AppFlowy-IO/AppFlowy
- **Stars:** 60k+
- **Tech:** Flutter (Dart) frontend, Rust backend/infrastructure layer

**Architecture:** Domain-Driven Design with four layers: presentation, application, domain,
infrastructure. Event-dispatch architecture with independent feature modules. The Rust infrastructure
layer provides performance, memory safety, and portability.

**Data model:** Block-based, similar to Notion. Modular architecture means changing one module
doesn't impact others.

**Key takeaway:** DDD + event-dispatch. Rust for the heavy lifting, Flutter for cross-platform UI.
Not a pure web app but architecturally interesting.

---

### Treehouse (by Progrium)

- **URL:** https://github.com/treehousedev/treehouse
- **Blog:** https://dev.to/progrium/pulling-from-the-best-tools-for-thought-5eap
- **Tech:** TypeScript, Mithril.js, Deno toolchain (zero Node.js policy)

**Data model:** At the core is **Manifold** -- a graph-like system that maps to the outliner model.
Certain nodes can be promoted to Markdown pages, creating a hybrid outliner+document model. Minimal
dependencies, small codebase.

**Key takeaway:** Graph-based core (Manifold) rather than a pure tree. Interesting hybrid approach.
Very hackable / extensible by design.

---

### Flowy

- **URL:** https://github.com/suyash/flowy
- **Tech:** TypeScript, Rollup, CSS

**Data model:** Hierarchical task tree (WorkFlowy clone).

**Persistence -- three-tier progressive strategy:**
1. **Browser cache:** IndexedDB as offline-first cache. Works immediately, no sign-in needed.
2. **Signed-out operation:** Full functionality with just the browser cache.
3. **Custom backend:** Pluggable storage servers (see `flowy-servers` repo) with verification keys
   for multi-device sync.

**Key takeaway:** Progressive persistence pattern: local-only -> IndexedDB -> optional remote sync.
Excellent model for a local-first outliner.

---

### react-outliner (SSShooter) -- "React Outliner Neo"

- **URL:** https://github.com/SSShooter/react-outliner
- **Tech:** React 18, TypeScript, Vite, Tailwind CSS, Lucide React

**Data model -- nested tree:**
```typescript
interface OutlineData {
    id?: string           // auto-generated
    topic: string         // item content
    children?: OutlineData[]  // nested items
    expanded?: boolean    // collapse/expand state
}
```

**State management:** React local state with callback propagation. `onChange` callback passes the
entire modified data structure upward. No Redux, no complex state management.

**Keyboard navigation:**
- Enter: create sibling
- Tab / Shift+Tab: indent / outdent
- Alt+Arrow: reorder vertically
- Arrow keys: navigate between items

**Key takeaway:** Simple, props-based architecture. Nested tree model. Good reference for a minimal
outliner component.

---

## 3. React Tree View Libraries

### react-arborist

- **URL:** https://github.com/brimdata/react-arborist
- **Stars:** 3.6k
- **Tech:** React, TypeScript, react-window (virtualization)

**Data model:** Nested hierarchical structure. Expects `id` and `children` fields (customizable via
accessor props). Supports both **uncontrolled** (`initialData`) and **controlled** (`data` + callback
props) modes.

**Key features:** Virtualized rendering for large trees, drag-and-drop, multi-select, inline editing,
search/filter, keyboard navigation, ref-based Tree API for programmatic control.

**Key takeaway:** The gold standard React tree component. Virtualization via react-window is critical
for performance at scale. Nested data model but flattened internally for virtual scrolling.

---

### react-complex-tree

- **URL:** https://github.com/lukasbach/react-complex-tree
- **Stars:** 1.3k
- **Tech:** TypeScript, zero external dependencies beyond React

**Data model:** Uses a **data provider pattern** (`StaticTreeDataProvider`) to abstract tree data.
Supports both flat and hierarchical structures via the provider abstraction. Multiple trees can share
state via a `TreeEnvironment` provider.

**Keyboard navigation:** Full W3C WAI-ARIA TreeView compliance:
- Arrow keys for focus movement
- Ctrl/Cmd+Click for multi-select
- F2 for inline renaming
- Type-to-search
- Full drag-and-drop via keyboard

**Key takeaway:** Most accessibility-focused tree component. Data provider pattern decouples the tree
UI from the data shape. W3C-compliant keyboard navigation.

---

### dnd-kit Sortable Tree

- **URL:** https://github.com/clauderic/dnd-kit (official example in `stories/3 - Examples/Tree/`)
- **Wrapper lib:** https://github.com/Shaddix/dnd-kit-sortable-tree

**Architecture -- dual representation:**
- **Source of truth:** Nested tree structure (`TreeItems`)
- **Render structure:** `flattenTree()` produces `FlattenedItem[]` (memoized)

During drag operations, the flattened array is cloned and manipulated. Utilities:
`buildTree`, `flattenTree`, `getProjection`, `getChildCount`, `removeItem`, `setProperty`.

Keyboard sensor uses `sortableTreeKeyboardCoordinates` for accessible drag-and-drop.

**Key takeaway:** The canonical pattern for drag-and-drop trees in React. Store nested, render flat.
The `flattenTree`/`buildTree` round-trip is widely adopted.

---

## 4. Rich Text Editors as Outliner Foundations

### ProseMirror / Tiptap

- **ProseMirror:** https://prosemirror.net
- **Tiptap:** https://tiptap.dev (headless wrapper around ProseMirror)

**Document model:** A ProseMirror document is a tree of block nodes. Most leaf nodes are textblocks.
The document is stored in an immutable **state**, changes are applied as **transactions**.

**Outliner relevance:** Nested bullet lists in ProseMirror are tree structures. `BulletList` contains
`ListItem` nodes, each of which can contain another `BulletList`. Tab/Shift+Tab map to
`sinkListItem`/`liftListItem` commands. The strict schema enforces valid tree structure.

**Key takeaway:** If your outliner needs rich text within nodes, ProseMirror/Tiptap gives you the
editing engine for free. Trade-off: the document model is ProseMirror's, not yours.

---

### Slate

- **URL:** https://docs.slatejs.org
- **Tech:** React, TypeScript

**Document model:** Nested, recursive tree (mirrors the DOM). Schema-less core with plugin-first
architecture. Borrowed concepts from ProseMirror (nested tree, transform model) but more flexible.

**Key takeaway:** More control than ProseMirror but more work. Good if you want a custom outliner
with rich text editing and don't want ProseMirror's opinionated schema.

---

## 5. Data Modeling Patterns

### Nested Tree (recursive objects)

```typescript
type Node = {
    id: string
    text: string
    children: Node[]
    collapsed: boolean
}
```

**Pros:** Intuitive, mirrors the visual structure, easy to render recursively.
**Cons:** O(n) to find a node by ID. Moving nodes between subtrees requires deep cloning.
Re-renders can cascade (changing a deep node re-renders all ancestors in naive implementations).

**Used by:** react-outliner, react-arborist (public API), zen-outliner (current), most small
outliners.

---

### Flat Map (normalized)

```typescript
type NodeMap = Record<string, {
    id: string
    text: string
    parentId: string | null
    childIds: string[]
    collapsed: boolean
}>
```

**Pros:** O(1) lookup by ID. Moving nodes is pointer surgery (update `parentId` + `childIds`).
Fine-grained updates -- only the changed node re-renders. Plays well with Redux, Zustand, Jotai.
**Cons:** Harder to reason about. Rendering requires traversal from root. Serialization requires
`buildTree()` reconstruction.

**Used by:** Notion (backend), WorkFlowy (backend), Retool (internal component tree),
Redux normalized patterns, dnd-kit tree example (internal representation).

**Reference:** Mark Erikson's "Practical Redux, Part 11: Nested Data and Trees" --
https://blog.isquaredsoftware.com/2018/01/practical-redux-part-11-nested-data-trees/

**Reference:** React docs on flattening state --
https://react.dev/learn/choosing-the-state-structure

---

### Hybrid (nested source of truth, flattened for rendering)

Store the tree nested. Derive a flat array for rendering (with depth/index metadata). This is the
dnd-kit pattern: `flattenTree()` for interaction, `buildTree()` to persist.

**Pros:** Best of both worlds -- intuitive storage, performant rendering.
**Cons:** Two representations to keep in sync. Memoization required.

---

## 6. Keyboard Navigation Patterns

### Roving Tabindex (W3C WAI-ARIA TreeView)

- Only one node in the tree has `tabIndex={0}` (the "active" node).
- All other nodes have `tabIndex={-1}`.
- Arrow keys move focus and update which node is tabbable.
- Enter/Space activate the node. F2 enters edit mode.

**Used by:** react-complex-tree, KendoReact TreeView, most accessible tree implementations.

### Outliner-Specific Keys

| Key                | Action              |
|--------------------|----------------------|
| Enter              | Create sibling below |
| Tab                | Indent (make child)  |
| Shift+Tab          | Outdent (make sibling of parent) |
| Arrow Up/Down      | Move focus           |
| Alt+Arrow Up/Down  | Reorder node         |
| Backspace (empty)  | Delete node, focus previous |
| Ctrl/Cmd+Enter     | Create child         |

This pattern is consistent across WorkFlowy, Dynalist, Logseq, and most outliner clones.

---

## 7. Persistence & Sync Patterns

| Pattern | Used by | Notes |
|---------|---------|-------|
| Local files (Markdown) | Logseq, Obsidian | Parse on load, serialize on save. Git for sync. |
| IndexedDB (offline-first) | Flowy | Progressive: works immediately, optional remote sync later. |
| SQLite (local DB) | Logseq (new), AppFlowy | Structured queries, better performance than files. |
| PostgreSQL + OT | Notion, WorkFlowy | Server-authoritative, operational transforms for collaboration. |
| CRDTs | Emerging pattern | Conflict-free replication. Flat lists are a natural fit (e.g., Yjs, Automerge). |
| DataScript (in-memory Datalog) | Logseq | Immutable DB with query engine. Powerful but niche. |

---

## 8. Summary: What Matters for zen-outliner

1. **Data model:** The nested tree model (like zen-outliner currently uses with mobx-bonsai) is the
   simplest and works fine for small-to-medium outlines. If performance becomes an issue, the flat
   map (normalized) approach is the proven scale-up path. The hybrid approach (nested storage,
   flattened for rendering) is a middle ground used by dnd-kit.

2. **State management:** mobx-bonsai is a fine choice. Logseq uses DataScript, most React outliners
   use local state or context, and libraries like react-arborist support both controlled and
   uncontrolled modes. Zustand or Jotai are popular alternatives if you want to move away from MobX.

3. **Keyboard navigation:** The outliner keyboard pattern (Enter=sibling, Tab=indent,
   Shift+Tab=outdent, arrows=navigate) is universal. Implementing the WAI-ARIA roving tabindex
   pattern ensures accessibility.

4. **Persistence:** IndexedDB is the simplest starting point for local-first persistence.
   Progressive enhancement to remote sync (like Flowy's approach) is a clean pattern.
