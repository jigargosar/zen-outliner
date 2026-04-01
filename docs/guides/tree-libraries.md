# React Tree/Outliner Library Research

Researched 2026-03-31. Focused on libraries suitable for a keyboard-driven outliner app.

---

## Top Contenders

### 1. headless-tree (@headless-tree/react)

The official successor to react-complex-tree, by the same author (Lukas Bach).

| Attribute | Details |
|---|---|
| GitHub | [lukasbach/headless-tree](https://github.com/lukasbach/headless-tree) |
| Stars | ~793 |
| Downloads | ~239k/month |
| Bundle | 9.5 kB + 0.4 kB React bindings (tree-shakeable) |
| Last release | v1.6.3 (Jan 2026) |
| Data model | **Flat** -- renders a flat list of nodes, maintains nested semantics via ARIA |
| Keyboard nav | Yes -- extensive, fully customizable hotkeys + typeahead search |
| Drag & drop | Yes -- ordered DnD, can interact with external drag events |
| Dependencies | Zero |

**Architecture:** Headless (logic + state only, you write your own JSX/CSS). Provides hooks and prop-getters. Supports multi-select, inline renaming, virtualization (100k+ items), and async data sources. Individual features are tree-shakeable.

**Verdict:** Best fit for a custom outliner. Headless means full control over rendering and styling. Active development, modern API, tiny bundle. The flat data model may require adapting the existing mobx-bonsai nested store, or writing a thin adapter layer.

---

### 2. react-arborist

The most popular dedicated React tree library by download count.

| Attribute | Details |
|---|---|
| GitHub | [brimdata/react-arborist](https://github.com/brimdata/react-arborist) |
| Stars | ~3,600 |
| Downloads | ~115k--286k/week (varies by source) |
| Last release | v3.4.3 (Jan 2025) |
| Data model | **Nested** -- objects with `id` + `children[]`, custom accessors supported |
| Keyboard nav | Yes -- built-in keyboard navigation + ARIA attributes |
| Drag & drop | Yes -- full DnD sorting with custom drag previews and drop indicators |
| Dependencies | react-dnd, react-window (virtualization) |

**Architecture:** Component-based (not headless). You pass data + render functions; it owns the tree container, virtualization, and interaction layer. Supports controlled and uncontrolled modes. Inline renaming, filtering, multi-select, open/close folders.

**Verdict:** Batteries-included. Nested data model maps directly to mobx-bonsai's `OutlineNode` shape. However, it is opinionated about layout (uses react-window for virtualization), which may conflict with custom styling needs. Last release is over a year old; 114 open issues suggest slowing maintenance.

---

### 3. react-complex-tree

Predecessor to headless-tree. Still functional, but officially superseded.

| Attribute | Details |
|---|---|
| GitHub | [lukasbach/react-complex-tree](https://github.com/lukasbach/react-complex-tree) |
| Stars | ~1,300 |
| Downloads | ~30k--46k/week |
| Last release | v2.6.1 (Oct 2025) |
| Data model | **Flexible** -- uses a data provider pattern (`StaticTreeDataProvider`) |
| Keyboard nav | Yes -- full W3C WAI-ARIA tree pattern implementation |
| Drag & drop | Yes -- multi-select DnD across multiple tree instances |
| Dependencies | Zero |

**Architecture:** Renders its own tree structure but allows custom renderers. Strong accessibility story (screen reader, keyboard-only). Supports multi-tree environments with shared state.

**Verdict:** Solid and well-tested, but the author explicitly recommends migrating to headless-tree. Not worth adopting for a new project.

---

## Other Libraries Reviewed

### @minoru/react-dnd-treeview

| Attribute | Details |
|---|---|
| GitHub | [minop1205/react-dnd-treeview](https://github.com/minop1205/react-dnd-treeview) |
| Stars | ~610 |
| Downloads | ~23k/week |
| Data model | **Flat** -- array of `{ id, parent, text }` objects |
| Keyboard nav | Not documented |
| Drag & drop | Yes -- built on react-dnd, supports touch via MultiBackend |

Render-prop based. Good DnD but no apparent keyboard navigation support, which is a dealbreaker for a keyboard-driven outliner.

---

### react-accessible-treeview

| Attribute | Details |
|---|---|
| GitHub | [dgreene1/react-accessible-treeview](https://github.com/dgreene1/react-accessible-treeview) |
| Stars | ~321 |
| Data model | **Flat** -- array with `id`, `parent`, `children` (IDs), includes `flattenTree` helper |
| Keyboard nav | Yes -- full WAI-ARIA pattern (arrow keys, Home/End, Enter/Space) |
| Drag & drop | **No** |

Best-in-class accessibility, but no drag-and-drop. Marked "SEEKING NEW MAINTAINERS" -- maintenance risk.

---

### lazy-tree-view

| Attribute | Details |
|---|---|
| GitHub | [javierOrtega95/lazy-tree-view](https://github.com/javierOrtega95/lazy-tree-view) |
| Stars | ~13 |
| Bundle | ~7.5 kB gzipped |
| Data model | **Nested** with lazy-loaded children |
| Keyboard nav | Yes -- WAI-ARIA TreeView pattern |
| Drag & drop | Yes -- three drop positions (before, inside, after) |
| Dependencies | Zero |

New, small, zero-dependency. Features look good on paper (imperative API, animations, TypeScript generics). Too early-stage and low-adoption for a production bet.

---

### dnd-kit-sortable-tree

| Attribute | Details |
|---|---|
| GitHub | [Shaddix/dnd-kit-sortable-tree](https://github.com/Shaddix/dnd-kit-sortable-tree) |
| Data model | **Flat** (flattened for single SortableContext) |
| Keyboard nav | Inherits from dnd-kit (limited tree-specific support) |
| Drag & drop | Yes -- built on @dnd-kit/sortable |

Wraps the official dnd-kit tree example into a reusable component. Last published ~2 years ago. Requires @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities as peer deps.

---

### @bartaxyz/react-tree-list

| Attribute | Details |
|---|---|
| GitHub | [bartaxyz/react-tree-list](https://github.com/bartaxyz/react-tree-list) |
| Data model | **Nested** -- `{ id, label, children }` |
| Keyboard nav | Not documented |
| Drag & drop | Yes |

Last published 3 years ago. Appears unmaintained.

---

### react-sortable-tree (legacy)

**Not recommended.** Last release (v2.8.0) was 6+ years ago. Officially unmaintained. Does not support React 18+.

---

### react-outliner

| Attribute | Details |
|---|---|
| GitHub | [ashleydavis/react-outliner](https://github.com/ashleydavis/react-outliner) |
| Stars | ~20 |
| Data model | **Nested** -- `{ id, text, children }` |
| Keyboard nav | Not documented |
| Drag & drop | Not documented |

Workflowy-style outliner component. Archived April 2025. Not usable.

---

## Comparison Matrix

| Library | Data Model | Keyboard | DnD | Headless | Active | Bundle |
|---|---|---|---|---|---|---|
| **headless-tree** | Flat | Full | Full | Yes | Yes (Jan 2026) | 9.9 kB |
| **react-arborist** | Nested | Yes | Full | No | Slowing (Jan 2025) | Medium (+ react-dnd, react-window) |
| react-complex-tree | Provider | Full | Full | No | Superseded | Small |
| @minoru/react-dnd-treeview | Flat | No | Full | Partial | Yes | Medium (+ react-dnd) |
| react-accessible-treeview | Flat | Full | No | Partial | Seeking maintainer | Small |
| lazy-tree-view | Nested | Yes | Yes | No | Yes | 7.5 kB |
| dnd-kit-sortable-tree | Flat | Limited | Yes | No | Stale | Medium (+ dnd-kit) |

---

## Recommendation for zen-outliner

**Two viable paths:**

1. **headless-tree** -- Best long-term choice. Headless architecture gives full control over the outliner UX. Excellent keyboard support out of the box. Tiny bundle. Actively maintained. The flat data model means you would need to either flatten the mobx-bonsai tree for rendering or write adapter functions. This is the approach the library is designed for.

2. **react-arborist** -- Fastest integration path. Its nested data model (`id` + `children[]`) maps directly to the existing `OutlineNode` shape. Batteries-included (virtualization, DnD, keyboard nav, inline rename). The tradeoff is less control over rendering and a heavier dependency footprint.

3. **Build it yourself with dnd-kit** -- dnd-kit provides low-level drag-and-drop primitives with good accessibility. The official repo includes a [tree example](https://github.com/clauderic/dnd-kit/blob/master/stories/3%20-%20Examples/Tree/SortableTree.tsx). This gives maximum control but requires implementing keyboard navigation, virtualization, and tree state management from scratch. Only consider this if the above libraries prove too constraining.

For a keyboard-driven outliner where custom UX is paramount, **headless-tree is the strongest option**.
