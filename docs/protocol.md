# Shipping Protocol

Follow this checklist before every push. No steps skipped.

## Before Writing Code

1. Read latest status report in docs/status/
2. Read docs/bugs.md for open bugs
3. Decide what to work on — bugs first, features second

## Before Pushing

1. Run pnpm test — all pass
2. Run pnpm typecheck — clean
3. Run pnpm build — clean
4. Browser test changed features (dev server + Chrome DevTools)
5. Update docs/bugs.md — mark resolved, add new bugs found
6. Write new status report in docs/status/ (complete snapshot, no silent drops)
7. Commit with clear message
8. Push

## Bug Tracking (docs/bugs.md)

- Every bug reported goes in immediately
- Bugs are never deleted — resolved bugs move to Resolved section
- Each resolved bug gets a commit reference and explanation
- Prioritize: blocking ship > visual violations > design decisions

## Status Reports (docs/status/)

- Each report is a COMPLETE snapshot
- Diff against previous report — nothing silently dropped
- Include: working features, known issues, resolved items, visual rules
