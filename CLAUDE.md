# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

zen-outliner — A keyboard-driven outliner. The goal: a fast, focused tool for thinking in trees.

## Commands

```
pnpm dev            # Start Vite dev server
pnpm build          # Production build → dist/
pnpm typecheck      # tsc --noEmit
pnpm typecheck:watch
pnpm vitest         # Run tests (vitest is installed, no config file yet)
```

Deployed to GitHub Pages on push to main (CI runs typecheck → build → deploy).
Base URL is `/zen-outliner/`.

## Architecture

**State: mobx-bonsai tree** (`src/store.ts`)
- `OutlineNode` — recursive tree node type with `id`, `text`, `children`, `collapsed`.
  Actions live on the node type: `setText`, `toggleCollapse`, `addChild`, `removeChild`.
- `OutlineStore` — root container holding top-level `children`. Has its own `addChild`/`removeChild`.
- `getSiblings(node)` — helper that walks up via `getParent` to get a node's sibling list.
- Actions are called via `TOutlineNode.actionName(node, ...)` (mobx-bonsai pattern).

**View: React + mobx-react-lite** (`src/App.tsx`)
- `NodeView` — recursive observer component rendering a single node and its children.
- `App` — top-level observer rendering the root's children.

**Styling:** Tailwind v4 (CSS-first config in `src/global.css`), JetBrains Mono font, dark zinc palette.

## Conventions

- Never hack TypeScript — no `!`, `as`, `any` to silence type errors.
- Prettier: 4-space indent, single quotes, no semicolons, trailing commas, 120 char width.
- Package manager: pnpm.
