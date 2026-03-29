# Holding Area: Permissions & Skills Cleanup

## Problem

Chezmoi status commands pile up in the global allow list because Claude
invokes the status command in slightly different forms across sessions.
Each variation gets approved and added as a new exact-match entry.

Current state — 6 chezmoi Bash entries in global settings.json:

```
a. Bash(chezmoi status && chezmoi git -- status)
b. Bash(chezmoi status && chezmoi git -- status -s)
c. Bash(chezmoi status && echo "==GIT==" && chezmoi git -- status -s)
d. Bash(chezmoi source-path:*)
e. Bash(chezmoi managed:*)
f. Bash(chezmoi add ~/.claude/skills/ ~/.claude/commands/ ~/.claude/agents/ ~/.claude/rules/ ~/.claude/output-styles/)
```

Only (c) is the form the skill actually prescribes. (a) and (b) are
earlier drafts that accumulated over time.

## Why wildcards are not the answer

A wildcard like `Bash(chezmoi:*)` would allow ANY command starting with
`chezmoi`. That includes destructive commands:

```
1. chezmoi apply          — DESTRUCTIVE: overwrites target files with source state
2. chezmoi destroy        — removes chezmoi source entirely
3. chezmoi purge          — removes chezmoi config + source
4. chezmoi remove/forget  — without --force, triggers interactive prompt (harmless, would hang)
5. chezmoi execute-template — could run arbitrary Go templates
6. chezmoi init --apply   — re-applies from remote, could overwrite local changes
```

Even scoped wildcards like `Bash(chezmoi status:*)` are unsafe because
the suffix is uncontrolled — `chezmoi status && rm -rf ~` would match.

The chained (&&) command shape is a FEATURE — it constrains the full
command to a known shape.

## What the chezmoi-sync skill actually executes

FIXED commands (identical every run):

```
1. chezmoi status && echo "==GIT==" && chezmoi git -- status -s
2. chezmoi add ~/.claude/skills/ ~/.claude/commands/ ~/.claude/agents/ ~/.claude/rules/ ~/.claude/output-styles/
```

VARIABLE commands (file names / messages change every run):

```
3. chezmoi diff <files> > /dev/null 2>&1
4. chezmoi add <files> && chezmoi git -- add <files> && chezmoi git -- commit -m "<msg>" && chezmoi git -- push --follow-tags
5. chezmoi forget --force <target-path>
```

## Skills cannot declare permissions

Skills don't have a `permissions` field in their frontmatter. The
SKILL.md format only supports `name`, `description`,
`disable-model-invocation`, and `user-invokable`. Permissions live
exclusively in `settings.json` (global or local).

## Chosen plan: clean permissions + harden skill

### Part 1: Clean permissions

- Remove (a) and (b) — stale status variations
- Keep (c) — exact match for the skill's fixed status command
- Keep (d) `chezmoi source-path:*` and (e) `chezmoi managed:*` — read-only, wildcard is fine
- Keep (f) — exact match for the skill's fixed re-add command
- Commands 3-5 (variable) prompt every run — that's GOOD:
  they include git commit, git push, and file modifications

Net result: 4 allow entries instead of 6, no mystery accumulation.

### Part 2: Harden the skill

Add a line to chezmoi-sync SKILL.md:

> "These are the ONLY chezmoi commands you may run. Do not improvise
> variations."

The pile-up happened because Claude invoked the status command in
slightly different forms. With exact permissions + this instruction,
mismatches get denied instead of approved-and-piled-up.

## Other cleanup found in same audit

### Dead Context7 plugin entries (global allow list)

```
mcp__plugin_context7_context7__query-docs
mcp__plugin_context7_context7__resolve-library-id
```

The old `context7@claude-plugins-official` plugin is DISABLED.
The new ones are already allowed: `mcp__claude_ai_Context7__*`.
These two entries are dead weight.

### ~95+ stale todo files in ~/.claude/todos/

Leftover agent session artifacts. Just clutter. Safe to delete.
