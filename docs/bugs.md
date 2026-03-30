# Bugs

All known bugs. Nothing gets removed — resolved bugs move to Resolved section with explanation.

## Open

### Design Decisions (need user input)

3. **Enter key behavior unclear** — Enter always adds a new sibling. No way to edit the currently selected node via keyboard without double-clicking. (F2 now added for edit, but Enter behavior may need revisiting.)

8. **Last item deleted leaves empty node** — when all items are deleted, an empty node is auto-created. Intended to prevent dead app state. Keep or change?

9. **Help panel has scrollbar** — help content overflows its max-h-64 container. Content should fit without scrolling or container should be larger.

### Remaining Visual Issues

14. **Input field styling** — edit input now uses transparent bg with bottom border. May still feel different from text span. Needs user verification.

## Resolved

### Fixed in visual polish pass (pending commit)

1. **Layout shift when editing** — changed input from bg-zinc-700 with padding/rounded to bg-transparent with bottom border only. Same height as text span.
2. **No keyboard shortcut for editing existing node** — F2 now enters edit mode on focused node.
4. **Empty node left after Escape** — Escape now auto-deletes the node if text is empty.
10. **? key shortcut rendering too tiny** — all status bar text bumped from text-xs to text-sm.
11. **Hide/Show shortcuts button has no visual affordance** — added border border-zinc-700 and rounded styling.
12. **Status bar and help panel use text-xs** — all bumped to text-sm.
13. **Bullet characters visually small** — bumped from text-sm to text-base.

### Re-verified fixed (immutable updates, commit 8b6f6f9)

5. **Icon/state not reflecting after outdent** — verified in browser: parent icon updates correctly when children are outdented.
6. **Done/undone state not visually reflecting** — verified in browser: strikethrough appears/disappears immediately.
7. **Focus lost on delete** — verified: deleting first node moves focus to next non-descendant. Other scenarios covered by unit tests.

### Fixed in store refactor (commit 8b6f6f9)

- **Delete first node loses focus** — focus now skips descendants of deleted node when finding next target.
- **Empty tree crash** — load() falls back to defaults if stored tree is empty.
- **Icon not updating after mutations** — switched from in-place mutation to immutable updates.
- **Done state not reflecting** — immutable updates ensure new tree reference triggers re-render.
