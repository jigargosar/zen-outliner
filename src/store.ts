import { signal, computed, batch } from '@preact/signals'

// ── Data ─────────────────────────────────────

export interface TreeNode {
  id: string
  text: string
  done: boolean
  collapsed: boolean
  children: TreeNode[]
}

let nextId = 1
export const mkNode = (text: string, children: TreeNode[] = []): TreeNode => ({
  id: String(nextId++),
  text,
  done: false,
  collapsed: false,
  children,
})

export const resetNextId = (n: number) => { nextId = n }
export const getNextId = () => nextId

// ── Persistence ─────────────────────────────

const STORAGE_KEY = 'zen-outliner'

interface SavedState {
  tree: TreeNode[]
  focusId: string
  nextId: number
}

export const defaultTree = (): TreeNode[] => [
  mkNode('Welcome to Zen Outliner', [
    mkNode('Navigate with Up/Down'),
    mkNode('Left/Right to collapse/expand'),
    mkNode('Enter to edit, Escape to cancel'),
    mkNode('Space to mark done'),
    mkNode('Enter to add sibling, Tab to indent'),
    mkNode('Backspace on empty to delete'),
  ]),
  mkNode('Getting Started', [
    mkNode('This is a tree'),
    mkNode('Each node can have children'),
    mkNode('Try collapsing the parent nodes'),
  ]),
]

const load = (): { tree: TreeNode[]; focusId: string } => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { tree: defaultTree(), focusId: '' }
    const saved: SavedState = JSON.parse(raw)
    nextId = saved.nextId
    if (!saved.tree || saved.tree.length === 0) return { tree: defaultTree(), focusId: '' }
    return { tree: saved.tree, focusId: saved.focusId }
  } catch {
    return { tree: defaultTree(), focusId: '' }
  }
}

const save = () => {
  try {
    const state: SavedState = {
      tree: items.value,
      focusId: focusId.value,
      nextId,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch { /* no localStorage in test env */ }
}

// ── Deep Clone Helper ───────────────────────

const cloneNode = (n: TreeNode): TreeNode => ({
  ...n,
  children: n.children.map(cloneNode),
})

const cloneTree = (tree: TreeNode[]): TreeNode[] => tree.map(cloneNode)

// ── State ────────────────────────────────────

const loaded = load()
export const items = signal<TreeNode[]>(loaded.tree)
export const focusId = signal(loaded.focusId || items.value[0]?.id || '')
export const mode = signal<'nav' | 'edit'>('nav')
export const showHelp = signal(false)

// ── Helpers ──────────────────────────────────

export const find = (id: string, nodes: TreeNode[] = items.value): TreeNode | null => {
  for (const n of nodes) {
    if (n.id === id) return n
    const f = find(id, n.children)
    if (f) return f
  }
  return null
}

export const parentOf = (id: string, nodes: TreeNode[] = items.value, par: TreeNode | null = null): TreeNode | null => {
  for (const n of nodes) {
    if (n.id === id) return par
    const f = parentOf(id, n.children, n)
    if (f !== null) return f
  }
  return null
}

export const flatVisible = computed(() => {
  const result: { node: TreeNode; depth: number }[] = []
  const walk = (nodes: TreeNode[], depth: number) => {
    for (const n of nodes) {
      result.push({ node: n, depth })
      if (!n.collapsed) walk(n.children, depth + 1)
    }
  }
  walk(items.value, 0)
  return result
})

export const isDescendant = (childId: string, ancestor: TreeNode): boolean => {
  for (const c of ancestor.children) {
    if (c.id === childId || isDescendant(childId, c)) return true
  }
  return false
}

// ── Undo Stack ──────────────────────────────

interface Snapshot {
  tree: TreeNode[]
  focusId: string
}

const undoStack: Snapshot[] = []
const MAX_UNDO = 50

const pushUndo = () => {
  undoStack.push({ tree: items.value, focusId: focusId.value })
  if (undoStack.length > MAX_UNDO) undoStack.shift()
}

export const undo = () => {
  const snapshot = undoStack.pop()
  if (!snapshot) return
  batch(() => {
    items.value = snapshot.tree
    focusId.value = snapshot.focusId
    mode.value = 'nav'
    save()
  })
}

export const canUndo = () => undoStack.length > 0

// ── Immutable Update ────────────────────────

const commit = (newTree: TreeNode[]) => {
  pushUndo()
  items.value = newTree
  save()
}

// Produce a new tree with a node replaced by a modified copy
const updateNode = (tree: TreeNode[], id: string, fn: (n: TreeNode) => TreeNode): TreeNode[] =>
  tree.map(n => {
    if (n.id === id) return fn(n)
    if (n.children.length > 0) {
      const updatedChildren = updateNode(n.children, id, fn)
      if (updatedChildren !== n.children) return { ...n, children: updatedChildren }
    }
    return n
  })

// ── Actions ──────────────────────────────────

export const setFocus = (id: string) => { focusId.value = id; save() }

export const moveFocus = (delta: number) => {
  const vis = flatVisible.value
  const idx = vis.findIndex(v => v.node.id === focusId.value)
  const next = idx + delta
  if (next >= 0 && next < vis.length) setFocus(vis[next].node.id)
}

export const collapseOrParent = () => {
  const node = find(focusId.value)
  if (!node) return
  if (node.children.length > 0 && !node.collapsed) {
    commit(updateNode(items.value, focusId.value, n => ({ ...n, collapsed: true })))
    return
  }
  const p = parentOf(focusId.value)
  if (p) setFocus(p.id)
}

export const expandOrChild = () => {
  const node = find(focusId.value)
  if (!node || node.children.length === 0) return
  if (node.collapsed) {
    commit(updateNode(items.value, focusId.value, n => ({ ...n, collapsed: false })))
    return
  }
  setFocus(node.children[0].id)
}

export const toggleDone = () => {
  const node = find(focusId.value)
  if (!node) return
  commit(updateNode(items.value, focusId.value, n => ({ ...n, done: !n.done })))
}

export const toggleCollapse = (id: string) => {
  const node = find(id)
  if (!node || node.children.length === 0) return
  batch(() => {
    if (!node.collapsed && isDescendant(focusId.value, node)) setFocus(node.id)
    commit(updateNode(items.value, id, n => ({ ...n, collapsed: !n.collapsed })))
  })
}

export const enterEdit = () => {
  if (!find(focusId.value)) return
  mode.value = 'edit'
}
export const cancelEdit = () => { mode.value = 'nav' }

export const commitEdit = (text: string) => {
  const node = find(focusId.value)
  if (!node) return
  batch(() => {
    commit(updateNode(items.value, focusId.value, n => ({ ...n, text })))
    mode.value = 'nav'
  })
}

// ── Tree Manipulation ───────────────────────

export const addSibling = () => {
  const newNode = mkNode('')
  const tree = cloneTree(items.value)
  const parent = parentOf(focusId.value)

  // Find the right list in the cloned tree
  let siblings: TreeNode[]
  if (parent) {
    const clonedParent = find(parent.id, tree)
    siblings = clonedParent ? clonedParent.children : tree
  } else {
    siblings = tree
  }

  const idx = siblings.findIndex(n => n.id === focusId.value)
  if (idx === -1) {
    tree.push(newNode)
  } else {
    siblings.splice(idx + 1, 0, newNode)
  }

  batch(() => {
    commit(tree)
    setFocus(newNode.id)
    mode.value = 'edit'
  })
}

export const deleteNode = () => {
  const node = find(focusId.value)
  if (!node) return

  const vis = flatVisible.value
  const visIdx = vis.findIndex(v => v.node.id === focusId.value)
  const parent = parentOf(focusId.value)

  // Determine focus target — must not be a descendant of the deleted node
  let nextFocus = ''
  // Look forward for a non-descendant
  for (let i = visIdx + 1; i < vis.length; i++) {
    if (!isDescendant(vis[i].node.id, node)) {
      nextFocus = vis[i].node.id
      break
    }
  }
  // If nothing forward, look backward
  if (!nextFocus && visIdx > 0) nextFocus = vis[visIdx - 1].node.id
  // Last resort: parent
  if (!nextFocus && parent) nextFocus = parent.id

  // Build new tree without the deleted node
  const removeFromList = (list: TreeNode[]): TreeNode[] =>
    list.filter(n => n.id !== focusId.value).map(n => ({
      ...n,
      children: removeFromList(n.children),
    }))

  let newTree = removeFromList(items.value)

  // If tree is empty, create a new root node
  if (newTree.length === 0) {
    const newNode = mkNode('')
    newTree = [newNode]
    nextFocus = newNode.id
  }

  batch(() => {
    commit(newTree)
    if (nextFocus) setFocus(nextFocus)
  })
}

export const indent = () => {
  const parent = parentOf(focusId.value)
  const currentId = focusId.value

  // Work on cloned tree
  const tree = cloneTree(items.value)
  const clonedParent = parent ? find(parent.id, tree) : null
  const siblings = clonedParent ? clonedParent.children : tree

  const idx = siblings.findIndex(n => n.id === currentId)
  if (idx <= 0) return

  const node = siblings[idx]
  const newParent = siblings[idx - 1]
  siblings.splice(idx, 1)
  newParent.children.push(node)
  newParent.collapsed = false

  commit(tree)
}

export const outdent = () => {
  const parent = parentOf(focusId.value)
  if (!parent) return
  const currentId = focusId.value

  // Work on cloned tree
  const tree = cloneTree(items.value)
  const clonedParent = find(parent.id, tree)
  if (!clonedParent) return

  const grandparent = parentOf(parent.id, tree)
  const grandparentList = grandparent ? grandparent.children : tree

  const parentIdx = grandparentList.findIndex(n => n.id === parent.id)
  const childIdx = clonedParent.children.findIndex(n => n.id === currentId)
  if (childIdx === -1 || parentIdx === -1) return

  const node = clonedParent.children[childIdx]
  clonedParent.children.splice(childIdx, 1)
  grandparentList.splice(parentIdx + 1, 0, node)

  commit(tree)
}

// ── Export ───────────────────────────────────

export const exportJSON = () => {
  const data = JSON.stringify({ tree: items.value, focusId: focusId.value, nextId }, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `zen-outliner-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Test Helpers ─────────────────────────────

export const initForTest = (tree: TreeNode[], focus?: string) => {
  items.value = tree
  focusId.value = focus || tree[0]?.id || ''
  mode.value = 'nav'
  undoStack.length = 0
}
