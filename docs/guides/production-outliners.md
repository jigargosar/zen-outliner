# How Production Outliners Are Built

Research into the architecture, data models, and sync strategies of WorkFlowy, Roam Research, Logseq, and Tana -- and what zen-outliner can learn from them.

---

## 1. WorkFlowy

### Philosophy

WorkFlowy is the purest outliner. One infinite nested document. No pages, no databases, no graph views. The entire product is a single recursive bulleted list that you can zoom into any node of. Founded in 2010 by Jesse Patel and Mike Turitzin at Y Combinator.

The core insight: the most powerful systems use minimal primitives to achieve maximal leverage. WorkFlowy structures thought with indentation alone -- similar to how TCP/IP governs the internet or Unix pipelines chain commands with pipes.

### Data Model

- **Everything is a node.** Each bullet is a node with an ID, text content, and an ordered list of children.
- **Single tree.** The entire user workspace is one tree. "Pages" are just zoomed-in views of subtrees.
- **No type system.** Nodes are untyped. Tags (`#tag` and `@mention`) are parsed from text content, not stored as structured metadata.

### Tech Stack (from job postings and StackShare)

- **Frontend:** JavaScript + jQuery (legacy), React + Babel + Browserify (new code), Electron (desktop), WebView transitioning to React Native (mobile).
- **Backend:** AWS infrastructure, server-side MVC, database sharding.
- **Collaboration:** Near-real-time sync with 2-3 second latency. Shared sublists update live. The specific sync mechanism (OT vs CRDT) is not publicly documented, but the latency and architecture suggest server-mediated OT or a custom diff/patch protocol.

### Key Lessons

1. **Radical simplicity works.** Users complete recurring planning tasks 41% faster than in Notion and 58% faster than in Todoist, primarily due to consistent keyboard navigation and zero UI chrome.
2. **Zoom is the killer feature.** Any node can become the "root" of your view. This eliminates context switching.
3. **No schema upfront.** Structure emerges from use. Tags and search provide enough retrieval without formal typing.

---

## 2. Roam Research

### Philosophy

Roam introduced bidirectional linking to the outliner. Every block gets a unique ID that can be referenced from anywhere, turning the tree into a graph. Founded on the idea that thought is networked, not hierarchical.

### Data Model

Roam is built on **Datomic** (server) and **DataScript** (client), both Datalog databases created by Rich Hickey. Data is stored as immutable **datoms**: `[entity-id, attribute, value, transaction-id]`.

**Core block attributes:**

| Attribute | Description |
|---|---|
| `:block/uid` | Nine-character unique ID (the block reference) |
| `:block/string` | Text content of the block |
| `:block/order` | Integer position among siblings |
| `:block/children` | Entity-IDs of direct children |
| `:block/parents` | Entity-IDs of ALL ancestors (not just parent) |
| `:block/page` | Entity-ID of the containing page |
| `:block/refs` | Entity-IDs of pages/blocks this block references |
| `:create/time` | Creation timestamp |
| `:edit/time` | Last edit timestamp |

**Pages** are just blocks with an additional `:node/title` attribute.

**Parent-child is stored bidirectionally:** children reference parents via `:block/parents`, and parents reference children via `:block/children`. This redundancy enables fast traversal in both directions.

### Tech Stack

- **Language:** ClojureScript, compiled to JavaScript.
- **UI framework:** Reagent (ClojureScript wrapper around React).
- **Client DB:** DataScript -- an in-memory Datalog database that runs in the browser. Cheap to create, quick to query, ephemeral.
- **Server DB:** Datomic -- an immutable, append-only database. Each transaction is a permanent fact, enabling time-travel queries and robust undo.
- **Sync:** The transaction-based approach (append-only log of datoms) enables syncing content to different devices and managing complex undo operations.

### Key Lessons

1. **Block-level identity is transformative.** By giving every paragraph a UID, Roam enabled block references, block embeds, and graph queries -- turning notes into a database.
2. **Append-only storage enables powerful features.** Immutable transactions give you undo, sync, and audit trails nearly for free.
3. **Datalog queries are expressive but niche.** Power users love them; most users never touch them. The advanced query capability adds significant complexity to the codebase.
4. **Storing all ancestors in `:block/parents` is a denormalization trade-off.** Enables fast "find all blocks under page X" queries, but requires careful maintenance on structural changes.

---

## 3. Logseq

### Philosophy

Logseq started as an open-source Roam alternative with a critical difference: **local-first**. Your data lives on your device as plain Markdown/Org-mode files. No vendor lock-in. The newer "DB version" moves to SQLite while preserving the local-first principle.

### Data Model

Logseq's data model has evolved through two phases:

**Phase 1: File-based graphs (Markdown/Org-mode)**
- Pages are files on disk.
- Blocks are parsed from Markdown bullet points by the `graph-parser`.
- Parsed data is loaded into **DataScript** (in-memory Datalog), same as Roam.
- UI state (current editing block, sidebar state) lives in Clojure atoms, separate from document state.

**Phase 2: DB graphs (v0.11.x+, current)**
- **DataScript** still serves as the in-memory query layer.
- **SQLite** provides persistent storage via a forked DataScript with storage support.
- Pages and blocks are unified into **nodes** (similar to Tana's approach).
- **Built-in properties and classes** form a typed data model, validated at runtime with **Malli schemas**.
- A **migration system** handles schema versioning and automated upgrades.

**Database schema layers:**

1. DataScript Schema -- low-level database attributes (`:db/valueType`, `:db/cardinality`)
2. Built-in Properties & Classes -- predefined semantic entities
3. Property Type System -- type definitions and validation rules
4. Malli Validation Schemas -- runtime validation of all entity shapes
5. Migration System -- schema versioning and automated upgrades

### Architecture

- **Language:** ClojureScript (compiles to JavaScript).
- **UI:** React via Rum (ClojureScript React wrapper).
- **Desktop:** Electron.
- **Mobile:** Capacitor.
- **Component library:** Based on shadcn.

**Database Worker architecture (DB version):**

The entire database runs in a **dedicated Web Worker** thread, isolated from the main UI thread. This is a significant architectural decision:

- All database operations go through **Comlink RPC** to the worker.
- The worker coordinates **SQLite-wasm** persistence with **OPFS** (Origin Private File System).
- **Multi-tab safety** via master/slave election: only the master client directly accesses the database; slave tabs proxy through the master.
- Each database file uses SQLite's **Write-Ahead Logging (WAL)** mode with exclusive locking.
- The `new-sqlite-storage` function implements DataScript's `IStorage` protocol, bridging in-memory DataScript with persistent SQLite through a KVS (key-value store) table.

**Real-Time Collaboration (RTC):**

- New sync approach for DB graphs.
- Runs as a loop within the database worker.
- Used for both multi-device sync and collaborative editing.
- Specific CRDT details are not fully public yet.

**Unidirectional data flow:**

1. Components subscribe reactively to state and database changes.
2. User interactions publish events to a `core.async` channel.
3. Event handlers coordinate business logic that updates state or transacts to the database.
4. On edit: persist to disk/cloud, update UI state atoms, run DataScript transactions and rebuild query caches, then React re-renders.

### Codebase Structure

```
src/main/frontend/          # Main app code (ClojureScript)
    components/             # UI components (Rum)
    handler/                # Event handlers and business logic
    worker/                 # DB worker thread code
    db/                     # Database model and queries
    common/                 # Shared worker/frontend code
    state.cljs              # Global state management
src/main/logseq/            # Plugin APIs
deps/graph-parser/          # Parses markdown/org graphs to database
packages/ui/                # Component system (shadcn-based)
```

### Key Lessons

1. **Web Worker for DB operations is smart.** Keeps the UI thread free even during heavy queries or writes. This is directly relevant for zen-outliner if we ever add complex queries.
2. **The markdown-to-DB migration is painful.** Logseq's biggest challenge has been moving from file-based to database-based storage while keeping existing users happy. Starting with a structured model (like zen-outliner already has) avoids this.
3. **DataScript + SQLite is a powerful combo.** In-memory Datalog for fast querying, SQLite for durability. The bridge between them is the key piece of infrastructure.
4. **Master/slave tab coordination is necessary.** Any browser-based app with IndexedDB or OPFS storage needs to handle multiple tabs safely.

---

## 4. Tana

### Philosophy

Tana blends an outliner with a graph database, where every bullet can be transformed into structured data on demand. Write first in freeform, then layer on metadata when it matters. Founded by people who built Google Wave.

### Data Model

**Everything is a node.** This is even more radical than WorkFlowy's "everything is a bullet":

- Fields are nodes.
- Views are nodes.
- Commands are nodes.
- Settings, layouts, workspaces -- all nodes.

Nodes are primitives designed to contain single pieces of information and to exist as parts of a living information system.

**Supertags** define what a node IS (an "is-a" relationship):

- All nodes with a certain supertag inherit the fields and content defined in that supertag's configuration.
- Think of it as a lightweight class system: a supertag is a type definition, a tagged node is an instance.
- Supertags compose: a node can have multiple supertags simultaneously.

**Fields** define what a node HAS (a "has-a" relationship):

- Fields are like database columns, but attached to supertags rather than tables.
- Field types include text, number, date, reference to other nodes, etc.

**The graph:** Tana's architecture is a knowledge graph where nodes connect through references, supertags, and field values. Unlike Roam's block-centric graph, Tana's graph is typed and queryable by structure.

### Tech Stack

- **Leadership:** CEO Tarjei Vassbotn, CPO Grim Iversen (who helped build Google Wave).
- **Architecture:** Cloud-based, graph data structure at the core.
- **AI integration:** Partnering with OpenAI, Anthropic, and using local models for NLP.
- Specific frontend/backend stack details are not publicly documented.

### Key Lessons

1. **"Everything is a node" is elegant but complex.** When fields, views, and commands are all nodes, the data model is beautifully uniform but requires careful UI to avoid overwhelming users.
2. **Progressive structuring is the right UX.** Start as a plain outliner, add types and fields only when needed. This is more approachable than "database-first" tools like Notion.
3. **Supertags are a lightweight type system.** For zen-outliner, this suggests that if we ever add node types, they should be composable tags rather than rigid categories.
4. **Google Wave DNA shows.** Real-time collaboration and rich data modeling were Wave's strengths too.

---

## 5. Cross-Cutting Themes

### Data Modeling Decisions

| Tool | Primitive | Identity | Typing | Storage |
|---|---|---|---|---|
| WorkFlowy | Bullet node | Server-generated ID | Untyped (tags in text) | Server DB |
| Roam | Block | 9-char UID | Untyped (page refs as types) | Datomic + DataScript |
| Logseq | Block/Node | DataScript entity-ID | Typed (built-in properties, Malli) | DataScript + SQLite |
| Tana | Node | Internal ID | Typed (supertags + fields) | Cloud graph DB |

**Common pattern:** Every production outliner treats the **block/node as the atomic unit**, not the page. Pages are either just special nodes (Tana, Logseq DB) or zoom targets in a single tree (WorkFlowy).

### Sync Architecture

**Three approaches in the wild:**

1. **Server-mediated (WorkFlowy, Roam):** Client sends changes to server, server resolves conflicts, broadcasts to other clients. Simpler to implement, but requires connectivity.

2. **Local-first with cloud sync (Logseq):** Data lives on the client. SQLite + OPFS for storage, Web Worker for isolation, RTC protocol for sync. More complex, but works offline.

3. **Event sourcing / append-only log (Roam's Datomic model):** Every change is an immutable fact `[entity, attribute, value, transaction]`. Sync becomes "send me all transactions I haven't seen." Undo is "replay without transaction X." This is the most powerful model for audit trails and time travel.

### CRDTs and Tree Operations

The hardest problem in collaborative outliners is **concurrent tree moves**. Martin Kleppmann's 2021 paper "A highly-available move operation for replicated trees" formalized the solution:

- Each node stores metadata about its parent.
- Move operations include a unique operation ID and timestamp.
- Concurrent moves to different parents are resolved deterministically (last-writer-wins with stable ordering).
- Cycles are prevented by the algorithm itself.
- The algorithm is formally verified using Isabelle/HOL.

**Loro** (Rust CRDT library) implements this algorithm and adds **fractional indexing** for sibling ordering:

- Fractional indices let you insert between existing items by computing a midpoint value.
- Reordering a node only updates that one node's index, never touching siblings.
- Provides `moveAfter()` and `moveBefore()` APIs.
- Trade-off: fractional indices can grow in length over time with many insertions at the same position.

### Ordering Siblings

Three approaches to ordering children within a parent:

1. **Integer index (Roam's `:block/order`):** Simple, but moving a node requires re-indexing all siblings after it. O(n) writes for a single move.

2. **Fractional indexing (Loro, many modern systems):** Each node has a sortable string/number key. Inserting between two nodes computes a midpoint. O(1) writes for a move. Keys can grow long over time but can be rebalanced periodically.

3. **Linked list (prev/next pointers):** Each node points to its predecessor. Insertion is O(1) but finding position N requires O(n) traversal. Used less often in practice.

**For zen-outliner:** Fractional indexing is the modern consensus for ordered lists in collaborative/syncable systems. For a single-user local app, integer ordering with gap-based allocation (e.g., order values of 100, 200, 300 to leave room for insertions) is simpler and sufficient.

---

## 6. What This Means for zen-outliner

### Our current model (mobx-bonsai)

zen-outliner uses `OutlineNode` with `id`, `text`, `children` (ordered array), and `collapsed`. Actions live on the node type. Parent access via `getParent()`. This is closest to WorkFlowy's model -- simple, tree-only, untyped.

### Recommendations

**Keep now:**

- **Block as atomic unit** -- we already have this. Every outliner confirms it's the right primitive.
- **Children as ordered array** -- for a single-user local app, this is simpler than fractional indexing or integer ordering. mobx-bonsai handles the reactivity.
- **No type system yet** -- WorkFlowy proves you can go very far with untyped nodes. Add types only when there's a real need.
- **Zoom/focus** -- WorkFlowy's signature feature. If not already implemented, this should be high priority. It's the single biggest usability win.

**Consider for the future:**

- **Block-level identity (UIDs)** -- if we ever want references, embeds, or deep linking, each node needs a stable, unique ID that survives moves and copy/paste. Our current `id` field may already serve this purpose.
- **Fractional indexing for ordering** -- becomes important if we add sync or collaboration. Not needed for single-user local use.
- **Web Worker for heavy operations** -- Logseq's pattern of isolating DB work in a Web Worker is worth adopting if we add search indexing or large-tree operations.
- **Event sourcing for undo** -- instead of snapshot-based undo, store operations as an append-only log. This gives us undo/redo, and later enables sync almost for free.
- **Loro for collaboration** -- if real-time collaboration becomes a goal, Loro is the most mature CRDT library with tree move support. It has Rust core with JavaScript bindings.

**Avoid:**

- **Datalog/DataScript** -- powerful but niche. The ClojureScript dependency and learning curve are not justified unless we're building a Roam-like query system.
- **Premature typing** -- Tana's supertag system is elegant but adds significant complexity. Wait for the use case.
- **Graph features before the outliner is solid** -- Roam and Logseq both struggled with basic editor reliability while building graph features. Get the core outliner right first.

---

## Sources

### WorkFlowy
- [WorkFlowy on StackShare](https://stackshare.io/workflowy/workflowy)
- [WorkFlowy hiring post (tech stack details)](https://blog.workflowy.com/workflowy-is-hiring-senior-full-stack-software-engineer/)
- [Interview with Jesse Patel and Mike Turitzin](https://blog.workflowy.com/interview-jesse-mike-part-1/)
- [Indie Hackers podcast with Jesse Patel](https://www.indiehackers.com/podcast/037-jesse-patel-of-workflowy)
- [WorkFlowy collaboration blog](https://blog.workflowy.com/workflowy-collaboration/)

### Roam Research
- [Deep Dive Into Roam's Data Structure (Zsolt)](https://www.zsolt.blog/2021/01/Roam-Data-Structure-Query.html)
- [Graph Databases and Roam (Louis Shulman)](https://louisshulman.medium.com/graph-databases-roamresearch-and-personal-knowledge-management-61fe5c3eac4b)
- [Roam Datalog Cheatsheet](https://gist.github.com/2b3pro/231e4f230ed41e3f52e8a89ebf49848b)
- [DataScript GitHub](https://github.com/tonsky/datascript)
- [Datalog Queries for Roam (David Bieber)](https://davidbieber.com/snippets/2020-12-22-datalog-queries-for-roam-research/)
- [JavaScript Functions for Inserting Blocks in Roam (David Bieber)](https://davidbieber.com/snippets/2021-02-12-javascript-functions-for-inserting-blocks-in-roam/)

### Logseq
- [Logseq DeepWiki - Architecture Overview](https://deepwiki.com/logseq/logseq)
- [Logseq DeepWiki - Database Worker and RTC Sync](https://deepwiki.com/logseq/logseq/4.1-layout-and-theming)
- [Logseq DeepWiki - Database Schema and Validation](https://deepwiki.com/logseq/logseq/4.2-database-schema-and-validation)
- [Logseq CODEBASE_OVERVIEW.md](https://github.com/logseq/logseq/blob/master/CODEBASE_OVERVIEW.md)
- [Logseq GitHub](https://github.com/logseq/logseq)
- [Logseq DB version docs](https://github.com/logseq/docs/blob/master/db-version.md)

### Tana
- [Intro to nodes, fields and supertags](https://outliner.tana.inc/articles/intro-to-nodes-fields-and-supertags)
- [Tana Supertags documentation](https://tana.inc/docs/supertags)
- [Everything is a Node (Cortex Futura)](https://www.cortexfutura.com/everything-is-a-node-tana-fundamentals/)
- [Tana the company](https://tana.inc/company)
- [Tana TechCrunch funding article](https://techcrunch.com/2025/02/03/tana-snaps-up-25m-with-its-ai-powered-knowledge-graph-for-work-racking-up-a-160k-waitlist/)
- [Tana knowledge graph](https://tana.inc/outliner/knowledge-graph)

### CRDTs and Sync
- [Kleppmann: A highly-available move operation for replicated trees](https://martin.kleppmann.com/2021/10/07/crdt-tree-move-operation.html)
- [Kleppmann: CRDTs: The Hard Parts (talk)](https://martin.kleppmann.com/2020/07/06/crdt-hard-parts-hydra.html)
- [Loro: Movable tree CRDTs and Loro's implementation](https://loro.dev/blog/movable-tree)
- [Loro Tree documentation](https://www.loro.dev/docs/tutorial/tree)
- [CRDT Fractional Indexing (Made by Evan)](https://madebyevan.com/algos/crdt-fractional-indexing/)
- [Position Strings for Collaborative Lists (Matthew Weidner)](https://mattweidner.com/2023/04/13/position-strings.html)
- [Peritext: A CRDT for Rich Text (Ink & Switch)](https://www.inkandswitch.com/peritext/static/cscw-publication.pdf)
- [CRDT implementations directory](https://crdt.tech/implementations)

### General Architecture
- [Building offline-first apps with event sourcing](https://flpvsk.com/blog/2019-07-20-offline-first-apps-event-sourcing/)
- [Fractional Indexing (vlcn.io)](https://vlcn.io/blog/fractional-indexing)
- [SQLite-sync CRDT (sqliteai)](https://github.com/sqliteai/sqlite-sync)
- [Bike outliner (Hog Bay Software)](https://apps.apple.com/us/app/bike-outliner-writing-app/id1588292384?mt=12)
