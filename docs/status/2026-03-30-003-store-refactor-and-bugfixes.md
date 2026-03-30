# Store Refactor + Bug Fixes — 2026-03-30

Live URL: https://jigargosar.github.io/zen-outliner/
Build: passes | Typecheck: passes | Tests: 29 passing
Codebase: ~420 lines across src/store.ts + src/main.tsx

## What Changed Since 002

- Extracted all logic into src/store.ts (testable, no render side effects)
- Switched from in-place mutation to immutable updates (root cause of most visual bugs)
- Fixed delete focus (skips descendants), empty tree crash, icon/done not reflecting
- Added 29 unit tests covering nav, collapse, edit, add, delete, indent, outdent
- Fixed layout shift on edit (transparent bg, bottom border only)
- Added F2 shortcut for editing focused node
- Escape on empty node auto-deletes it
- Bumped all text-xs to text-sm, bullets to text-base
- Shortcuts button has visible border affordance
- Added docs: bugs.md, protocol.md, learn-preact-signals.md, discuss-later.md

## Working Features

### Tree Operations
- Tree display with nested nodes
- Arrow key navigation (up/down/left/right)
- Collapse/expand parent nodes (click bullet or left/right keys)
- Focus follows scroll (auto scroll-into-view)

### Editing
- F2: edit focused node text
- Enter: add new sibling below, enters edit mode
- Double-click: edit node text inline
- Escape: cancel edit (auto-deletes if text is empty)
- Space: toggle done (strikethrough)
- Backspace/Delete in NAV mode: delete focused node
- Backspace on empty text in EDIT mode: delete node

### Tree Restructuring
- Tab: indent node (becomes child of previous sibling)
- Shift+Tab: outdent node (moves to parent's level)

### Persistence
- localStorage saves tree, focus position, collapsed state, nextId
- Restores full state on page reload
- Falls back to seed data if storage is empty or corrupt

### Visual
- Dark theme (zinc-900 background)
- Blue accent border-left on focused node in NAV mode
- Amber accent border-left + bottom border on edit input in EDIT mode
- Spacing for hierarchy (24px indent per level)
- text-base for node text and bullets
- text-sm for status bar, help panel
- min-h-9 row height for click targets
- No hover highlights
- Transparent borders always reserved (no layout shifts)
- Mode indicator (NAV/EDIT) in status bar at bottom

### Help
- Keyboard shortcuts panel toggled via button or ? key
- Lists all navigation and editing shortcuts
- Button has visible border affordance

## Open Bugs (3 — all design decisions)

3. Enter key behavior — always adds sibling. May want Enter on existing node to edit instead.
8. Last item deleted creates empty node — prevents dead app, but may confuse user.
9. Help panel has scrollbar — content overflows max-h-64 container.

See docs/bugs.md for full history including all resolved bugs.

## Resolved Since 002

- Layout shift when editing (#1) — transparent bg input
- No keyboard shortcut for edit (#2) — F2 added
- Empty node left after Escape (#4) — auto-deletes
- Icon after outdent (#5) — verified fixed by immutable updates
- Done state not reflecting (#6) — verified fixed by immutable updates
- Focus lost on delete (#7) — verified fixed, unit tested
- text-xs violations (#10, #12) — bumped to text-sm
- Shortcuts button no affordance (#11) — border added
- Bullet chars small (#13) — bumped to text-base
- Input bg too heavy (#14) — transparent bg

## Known Issues (not blocking)

- HMR listener leak (dev-only, keyboard handler at module scope)
- No undo — destructive actions are permanent
- No export — data only in localStorage, browser clear = data lost
- No e2e tests — visual bugs only caught by manual testing
- Footer items spacing may feel too tight
- Help panel scroll also scrolls main view

## Visual Rules (from user, must be followed)

1. Dark theme only
2. Tailwind 4, no custom CSS unless strongly justified
3. No hover highlights
4. Accent colors for mode (NAV=blue, EDIT=amber)
5. Spacing for hierarchy, not lines or borders
6. Large, readable font sizes — no tiny elements (text-sm minimum)
7. All interactive areas get comfortable click targets
8. No layout shifts from any state change
9. No extraneous elements — only what features need

## Next Session Priority

1. Data safety: undo (Ctrl+Z) + JSON export — makes app trustworthy for daily use
2. e2e tests (Preact Testing Library) — catches visual bugs
3. Everything else deferred

## Project Docs

- docs/bugs.md — all bugs tracked, resolved history
- docs/protocol.md — shipping checklist
- docs/discuss-later.md — deferred architecture topics
- docs/learn-preact-signals.md — Preact Signals learning guide
- docs/foundations.md — design philosophy, tech stack, UX principles
