# Preact Signals -- A Practical Guide

You know JavaScript. This teaches Preact Signals through real code.
All examples use exact imports from `@preact/signals`.

---

## 1. What Signals Are and Why They Replace useState

With `useState`, calling the setter re-renders the entire component.
Signals are reactive containers that track their readers and update
only those subscribers -- no component re-render needed.

```tsx
// React: component re-renders on every count change
const [count, setCount] = useState(0);

// Signals: only subscribers update
import { signal } from "@preact/signals";
const count = signal(0);
```

A signal holds `.value`. Read it, write it, done.

---

## 2. signal() -- Creating and Reading/Writing State

```tsx
import { signal } from "@preact/signals";

const count = signal(0);        // create with initial value
console.log(count.value);       // read: 0
count.value = 5;                // write: subscribers update
count.value++;                  // write: now 6
```

Works with any type: `signal("Jane")`, `signal(false)`, `signal<string[]>([])`.

## 3. computed() -- Derived State That Auto-Updates

A computed derives its value from other signals. It recalculates
only when dependencies change, and only if something reads it (lazy).

```tsx
import { signal, computed } from "@preact/signals";

const price = signal(100);
const quantity = signal(3);
const total = computed(() => price.value * quantity.value);

console.log(total.value);  // 300
quantity.value = 5;
console.log(total.value);  // 500 -- auto-updated
```

You cannot write to a computed. `total.value = 99` throws.
Computeds can chain: `const tax = computed(() => total.value * 0.1)`.

## 4. effect() -- Side Effects When Signals Change

Runs immediately, then re-runs whenever any signal it reads changes.

```tsx
import { signal, effect } from "@preact/signals";

const count = signal(0);

const dispose = effect(() => {
  console.log("Count is now:", count.value);
});
// Logs immediately: "Count is now: 0"

count.value = 1;   // Logs: "Count is now: 1"
dispose();          // stop listening
count.value = 2;    // nothing logs
```

Inside components, use `useSignalEffect` instead -- it auto-disposes
on unmount:

```tsx
import { useSignalEffect } from "@preact/signals";

function Logger() {
  useSignalEffect(() => console.log("Count:", count.value));
  return <p>{count}</p>;
}
```

## 5. batch() -- Grouping Multiple Updates

Without batch, each `.value =` triggers subscribers immediately.
`batch` defers all notifications until the callback finishes:

```tsx
import { signal, computed, effect, batch } from "@preact/signals";

const first = signal("Jane");
const last = signal("Doe");
const full = computed(() => first.value + " " + last.value);

effect(() => console.log(full.value));  // "Jane Doe"

batch(() => {
  first.value = "John";
  last.value = "Smith";
});
// Logs once: "John Smith" (without batch: "John Doe" then "John Smith")
```

## 6. The KEY Insight: Pass Signals in JSX, Not .value

```tsx
const count = signal(0);

// SLOW: .value subscribes the component -- full re-render on change
function CounterSlow() {
  return <p>Value: {count.value}</p>;
}

// FAST: signal object binds directly to the DOM text node
function CounterFast() {
  return <p>Value: {count}</p>;
}
```

**`{count.value}`** reads during render, subscribing the component.
When count changes, Preact re-runs the entire function and diffs.

**`{count}`** creates a direct DOM text node binding. When count
changes, the text updates in-place. No re-render, no diff.

You must still use `.value` for event handlers (`count.value++`),
conditionals (`count.value > 0 && ...`), and string interpolation.
The optimization only works when the signal is the entire content
of a JSX expression slot.

---

## 7. Arrays and Objects -- ALWAYS Assign New References

Signals detect changes by reference (`===`). Mutating in place
does not change the reference.

```tsx
const todos = signal<string[]>(["buy milk"]);

todos.value.push("walk dog");                    // WRONG: no update
todos.value = [...todos.value, "walk dog"];      // RIGHT: new array
todos.value = todos.value.filter(t => t !== x);  // RIGHT: remove
```

```tsx
const user = signal({ name: "Jane", age: 30 });

user.value.age = 31;                             // WRONG: mutation
user.value = { ...user.value, age: 31 };         // RIGHT: spread
```

Update one item in an array of objects:

```tsx
items.value = items.value.map(item =>
  item.id === targetId ? { ...item, done: !item.done } : item
);
```

---

## 8. Module-Level Signals vs useSignal

**Module-level** -- shared global state, the primary pattern:

```tsx
// store.ts
import { signal } from "@preact/signals";
export const count = signal(0);  // same instance everywhere
```

**useSignal** -- component-local, one per instance:

```tsx
import { useSignal } from "@preact/signals";

function Counter() {
  const count = useSignal(0);
  return <button onClick={() => count.value++}>{count}</button>;
}
```

| Use case | Choice |
|---|---|
| App state (user, theme, tree data) | Module-level `signal()` |
| Shared between components | Module-level `signal()` |
| Local to one component instance | `useSignal()` |
| Derived from module signals | Module-level `computed()` |
| Derived from local signals | `useComputed()` |

---

## 9. Common Mistakes

**Destructuring kills reactivity:**
```tsx
const { value } = count;  // captures 0, not the signal -- never updates
```
Fix: access `.value` at the point of use.

**Mutating in place:**
```tsx
todos.value.push("x");  // signal sees same reference -- no update
```
Fix: assign a new reference (section 7).

**Using .value in JSX unnecessarily:**
```tsx
<p>{count.value}</p>   // re-renders component
<p>{count}</p>          // updates text node only
```

**Creating signals inside render:**
```tsx
function Bad() {
  const count = signal(0);    // new signal every render
  return <p>{count}</p>;
}
function Good() {
  const count = useSignal(0); // stable across renders
  return <p>{count}</p>;
}
```

**Forgetting to dispose effects:** use `useSignalEffect` in
components; it auto-cleans on unmount.

---

## 10. How zen-outliner's store.ts Uses Signals

`src/store.ts` demonstrates all the patterns above in a real app.

**Module-level signals** hold all app state:

```ts
export const items = signal<TreeNode[]>(loaded.tree);
export const focusId = signal(loaded.focusId || items.value[0]?.id || "");
export const mode = signal<"nav" | "edit">("nav");
```

**computed** for derived state -- `flatVisible` flattens the tree
for rendering, recalculating automatically when `items` changes:

```ts
export const flatVisible = computed(() => {
  const result: { node: TreeNode; depth: number }[] = [];
  const walk = (nodes: TreeNode[], depth: number) => {
    for (const n of nodes) {
      result.push({ node: n, depth });
      if (!n.collapsed) walk(n.children, depth + 1);
    }
  };
  walk(items.value, 0);
  return result;
});
```

**Immutable updates** -- the store never mutates in place.
Every change assigns a new tree to `items.value`:

```ts
const commit = (newTree: TreeNode[]) => {
  items.value = newTree;  // new reference triggers subscribers
  save();
};
```

**batch** prevents intermediate states when updating multiple
signals together:

```ts
export const toggleCollapse = (id: string) => {
  batch(() => {
    if (!node.collapsed && isDescendant(focusId.value, node))
      setFocus(node.id);
    commit(updateNode(items.value, id, n => ({ ...n, collapsed: !n.collapsed })));
  });
};
```

| Pattern | Where in store.ts |
|---|---|
| Module-level signals | `items`, `focusId`, `mode`, `showHelp` |
| Computed for derived data | `flatVisible` |
| Immutable updates (new refs) | `commit()`, `updateNode()`, `cloneTree()` |
| batch for atomic writes | `toggleCollapse`, `commitEdit`, `addSibling`, `deleteNode` |
