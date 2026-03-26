# zen-outliner — Design Spec (v1)

## What

A Workflowy clone. Infinite-nesting outliner. Dark mode only. Get to working state, then refine.

## Stack

- React + TypeScript + Vite
- Tailwind CSS (dark mode only)
- localStorage (JSON) for persistence
- No auth, no backend, no Supabase (for now)
- SPA — single page application

## Core Features (v1)

1. Infinite nesting — nodes can nest arbitrarily deep
2. Expand / collapse any node with children
3. Zoom into any node (click bullet → that node becomes the "page")
4. Breadcrumb navigation to zoom back out
5. Keyboard-driven:
   - Enter → new sibling below
   - Tab → indent (make child of previous sibling)
   - Shift+Tab → outdent (move up a level)
   - ↑ / ↓ → move focus between nodes
   - Backspace on empty → delete node, merge up
   - Ctrl+↑ / Ctrl+↓ → reorder node among siblings
6. localStorage persistence — auto-save on every change

## Visual Design

- Dark mode only (#1a1a1a background)
- Workflowy-exact visual style — content IS the interface
- Every node has a bullet dot (small filled circle)
- Collapsed nodes: ring/circle around the bullet
- Leaf nodes: slightly smaller, dimmer dot
- Hover a parent node: collapse/expand triangle (▼/►) fades in to the LEFT of the bullet
- Vertical connector lines run from parent through child bullets (same x-axis)
- Centered content area (~700px max-width)
- Spacious line height, generous padding
- No sidebar in v1 (toggleable sidebar is a future feature)
- No toolbar, no chrome — just the outline

## Empty State

- Single empty node with blinking cursor and "Start typing..." placeholder

## Data Model

- Flat array with parentId (decided during brainstorm)
- Each node: `{ id, parentId, content, order, collapsed }`
- Tree reconstructed from flat list for rendering
- Maps directly to Supabase rows when backend is added later

## Out of Scope (v1)

- Authentication / user accounts
- Supabase backend / sync
- Search / filter
- Sharing / collaboration
- Sidebar navigation
- Rich text / markdown in nodes
- Drag and drop reordering
