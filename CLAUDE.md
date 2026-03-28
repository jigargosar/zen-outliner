zen-outliner — A keyboard-driven outliner in the spirit of Checkvist.
The goal: a fast, focused tool for thinking in trees.

# Spikes

The `spikes/` folder contains throwaway prototypes — each one tests
a specific technical approach in a single `index.html` file.

1. `01-contenteditable-tree` — contentEditable for inline editing
2. `02-input-nav-edit` — input elements with nav/edit modal switching
3. `03-morphdom-tailwind` — morphdom for DOM diffing + Tailwind
4. `04-vanjs-outliner` — VanJS as DOM builder + replaceChildren()

Spikes are numbered, self-contained, and disposable. They inform
the real implementation but are not part of it.

# Design Philosophy

- Simple, small, robust. Easy to read, easy to maintain.
- Performance does not matter. Optimize for clarity and simplicity.
- Dependencies and bundle size do not matter — don't reinvent wheels.
- Fancy is the enemy of done. Pick the boring approach.
- Small codebase over clever codebase.
