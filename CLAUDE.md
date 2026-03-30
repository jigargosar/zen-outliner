zen-outliner — A keyboard-driven outliner in the spirit of Checkvist.
The goal: a fast, focused tool for thinking in trees.

Read docs/foundations.md before writing any code — it has the
design philosophy, tech stack, UX principles, and visual direction.

# Status Reports

Status reports live in docs/status/ with timestamped filenames.
The latest report is the single source of truth for any agent
picking up this project.

Rules for status reports:
1. Each report is a COMPLETE snapshot — never reference previous reports
2. Every feature listed explicitly — working or not
3. Every known issue carried forward until explicitly resolved
4. Resolved items marked as resolved with explanation — never silently dropped
5. Visual rules included — the spec, so anyone can audit against it
6. Before writing a new report, diff against the current one to ensure
   nothing disappeared without explanation

If you are a new agent: read these in order:
1. Latest file in docs/status/ — current state and priorities
2. docs/bugs.md — all known bugs, what's resolved, what's open
3. docs/protocol.md — shipping checklist, follow before every push
4. docs/discuss-later.md — deferred architectural topics

# Legacy

NEVER read legacy/ — old spike code and outdated specs.
Do not pattern-match from legacy code.
