# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

zen-outliner — A keyboard-driven outliner. The goal: a fast, focused tool for thinking in trees.

## Core USP

- **Data safety** — audit journal tracking every change (who, what, when)
- **Multi-level undo** — full undo/redo history, deeper than typical outliners
- These are not future features — they are the product's differentiators.

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

**State: plain MobX flat map** (`src/store.ts`)
- `OutlineNode` — flat record with `id`, `text`, `parentId`, `order`, `collapsed`.
- `OutlineStore` — class with `observable.map<string, OutlineNode>`, actions, and derived queries.
- Sibling ordering via `fractional-indexing`.
- UI state (`selectedId`) lives on the store class.

**View: React + mobx-react-lite** (`src/App.tsx`)
- `NodeView` — recursive observer component rendering a single node and its children.
- `App` — top-level observer rendering the root's children.

**Styling:** Tailwind v4 (CSS-first config in `src/global.css`), JetBrains Mono font, dark zinc palette.

## Conventions

- Never hack TypeScript — no `!`, `as`, `any` to silence type errors.
- Prettier: 4-space indent, single quotes, no semicolons, trailing commas, 120 char width.
- Package manager: pnpm.
