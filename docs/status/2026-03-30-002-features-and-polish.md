# Features + Visual Polish — 2026-03-30

Live URL: https://jigargosar.github.io/zen-outliner/
Build: passes | Typecheck: passes | Codebase: ~400 lines, single file

## What Changed Since 001

Added: add/delete nodes, indent/outdent, localStorage persistence, visual polish, keyboard shortcuts help panel.

## Working Features

### Tree Operations
- Tree display with nested nodes
- Arrow key navigation (up/down/left/right)
- Collapse/expand parent nodes (click bullet or left/right keys)
- Focus follows scroll (auto scroll-into-view)

### Editing
- Enter: add new sibling below, enters edit mode
- Double-click: edit node text inline
- Escape: cancel edit
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
- Amber accent border-left on focused node in EDIT mode
- Spacing for hierarchy (24px indent per level)
- text-base (16px) for node text
- min-h-9 (36px) row height for click targets
- No hover highlights
- Transparent borders always reserved (no layout shifts)
- Mode indicator (NAV/EDIT) in status bar at bottom

### Help
- Keyboard shortcuts panel toggled via button or ? key
- Lists all navigation and editing shortcuts
- Two-column layout: Navigation | Editing

## Resolved From Previous

- nextId counter sync — FIXED: load() restores nextId from saved state
- Hardcoded seed data — RESOLVED: seed data only shows on first visit, persistence takes over after first edit

## Known Issues

- HMR listener leak (dev-only, keyboard handler at module scope)
- Status bar and help panel use text-xs — violates "no tiny elements" rule
- Shortcuts button click target is small
- ? key toggle may not work on all keyboard layouts
- Bullet characters (▶ ▼ •) are visually small

## Visual Rules (from user, must be followed)

1. Dark theme only
2. Tailwind 4, no custom CSS unless strongly justified
3. No hover highlights
4. Accent colors for mode (NAV=blue, EDIT=amber)
5. Spacing for hierarchy, not lines or borders
6. Large, readable font sizes — no tiny elements
7. All interactive areas get comfortable click targets
8. No layout shifts from any state change
9. No extraneous elements — only what features need

## Next

- Fix size violations (text-xs → text-sm minimum everywhere)
- Get user visual review and capture specific issues
- Blog post
