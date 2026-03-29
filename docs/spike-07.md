Spike 07

# Inputs

1. docs/specs-v1.md — behaviors, gotchas, invariants
2. docs/ux.md — UX principles, visual direction
3. VanJS documentation

# Scope

Build all spec behaviors EXCEPT search (items 59-65).
Search UX needs investigation first — see docs/issues.md.

# Must Address (from spike 06 findings)

1. Dark theme by default
2. High contrast selection highlight
3. DBC invariants baked in from the start
4. Collapsing a parent must handle focused/edited child
5. No layout shifts — reserve space for breadcrumbs, etc.
6. Flex/grid layout, no ad-hoc positioning

# Agent Rules

1. Can read: docs/specs-v1.md, docs/ux.md
2. Cannot read: any spike code (spikes/*)
3. Cannot read: docs/issues.md, docs/spike-06-issues.md
4. Must read VanJS documentation
5. Spike independence per CLAUDE.md rule
