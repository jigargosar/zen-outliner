# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

zen-outliner — A keyboard-driven outliner in the spirit of Checkvist.
The goal: a fast, focused tool for thinking in trees.

# Design Philosophy

- Simple, small, robust. Easy to read, easy to maintain.
- Performance does not matter. Optimize for clarity and simplicity.
- Dependencies and bundle size do not matter — less code is better code.
- In fact library usage is promoted - more libraries means more robust code.
- Fancy is the enemy of done. Pick the boring approach.
- Small codebase over clever codebase.
- This applies everywhere, spikes, tests, any other code that we must maintain.
- DX (Developer Experience) is is very important.

# Key Documents

- docs/foundations.md — tech stack, UX principles, visual direction, gotchas, invariants

# Legacy

NEVER read legacy/ — it contains old spike code and outdated specs.
Do not pattern-match from legacy code. Build from foundations and
library documentation only.
