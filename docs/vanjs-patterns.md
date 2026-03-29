VanJS Patterns

How VanJS reactivity works, learned from documentation.

# State Binding

1. van.state(value) creates a reactive state object
2. Read with state.val, write with state.val = newValue
3. State as child of element → creates Text node, auto-syncs
4. State in property → auto-syncs (e.g. class: () => ...)

# Binding Functions

1. () => expression as child → REPLACES the DOM node when
   dependencies change
2. The function receives the previous DOM node as parameter
3. Return new node to replace, return existing dom to keep,
   return null to remove
4. Removed nodes never come back
5. Use state.oldVal to compare and skip unnecessary rebuilds

# Input Elements

1. One-way binding: state → input via value prop
2. Input → state via oninput: e => state.val = e.target.value
3. CRITICAL: if the input is inside a binding function,
   it gets destroyed and recreated on every state change.
   The input must NOT be inside () => ... that depends on
   changing state.

# Dynamic Lists

1. For adding/removing items: use binding functions returning
   null for deleted items
2. For full tree rebuild (reorder, indent): use
   container.replaceChildren(...newNodes)
3. Do NOT rebuild during edit mode — it destroys the input

# Avoiding Re-renders

1. Use state.rawVal to peek without registering dependency
2. Use state.oldVal inside binding functions to compare
3. Keep binding functions granular — bind individual properties,
   not entire subtrees
4. No bump() pattern needed — van.state auto-triggers updates
