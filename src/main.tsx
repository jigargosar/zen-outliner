import { render } from 'preact'
import { signal, computed, batch } from '@preact/signals'
import { useRef, useEffect } from 'preact/hooks'

// ── Data ─────────────────────────────────────

interface TreeNode {
  id: string
  text: string
  done: boolean
  collapsed: boolean
  children: TreeNode[]
}

let nextId = 1
const mkNode = (text: string, children: TreeNode[] = []): TreeNode => ({
  id: String(nextId++),
  text,
  done: false,
  collapsed: false,
  children,
})

// ── Persistence ─────────────────────────────

const STORAGE_KEY = 'zen-outliner'

interface SavedState {
  tree: TreeNode[]
  focusId: string
  nextId: number
}

const defaultTree = (): TreeNode[] => [
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
    return { tree: saved.tree, focusId: saved.focusId }
  } catch {
    return { tree: defaultTree(), focusId: '' }
  }
}

const save = () => {
  const state: SavedState = {
    tree: items.value,
    focusId: focusId.value,
    nextId,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

// ── State ────────────────────────────────────

const loaded = load()
const items = signal<TreeNode[]>(loaded.tree)
const focusId = signal(loaded.focusId || items.value[0]?.id || '')
const mode = signal<'nav' | 'edit'>('nav')

// ── Helpers ──────────────────────────────────

const find = (id: string, nodes: TreeNode[] = items.value): TreeNode | null => {
  for (const n of nodes) {
    if (n.id === id) return n
    const f = find(id, n.children)
    if (f) return f
  }
  return null
}

const parentOf = (id: string, nodes: TreeNode[] = items.value, par: TreeNode | null = null): TreeNode | null => {
  for (const n of nodes) {
    if (n.id === id) return par
    const f = parentOf(id, n.children, n)
    if (f !== null) return f
  }
  return null
}

const flatVisible = computed(() => {
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

const isDescendant = (childId: string, ancestor: TreeNode): boolean => {
  for (const c of ancestor.children) {
    if (c.id === childId || isDescendant(childId, c)) return true
  }
  return false
}

const mutate = () => { items.value = [...items.value]; save() }

// ── Actions ──────────────────────────────────

const setFocus = (id: string) => { focusId.value = id; save() }

const moveFocus = (delta: number) => {
  const vis = flatVisible.value
  const idx = vis.findIndex(v => v.node.id === focusId.value)
  const next = idx + delta
  if (next >= 0 && next < vis.length) setFocus(vis[next].node.id)
}

const collapseOrParent = () => {
  const node = find(focusId.value)
  if (!node) return
  if (node.children.length > 0 && !node.collapsed) {
    node.collapsed = true
    mutate()
    return
  }
  const p = parentOf(focusId.value)
  if (p) setFocus(p.id)
}

const expandOrChild = () => {
  const node = find(focusId.value)
  if (!node || node.children.length === 0) return
  if (node.collapsed) {
    node.collapsed = false
    mutate()
    return
  }
  setFocus(node.children[0].id)
}

const toggleDone = () => {
  const node = find(focusId.value)
  if (!node) return
  node.done = !node.done
  mutate()
}

const toggleCollapse = (id: string) => {
  const node = find(id)
  if (!node || node.children.length === 0) return
  batch(() => {
    if (!node.collapsed && isDescendant(focusId.value, node)) setFocus(node.id)
    node.collapsed = !node.collapsed
    mutate()
  })
}

const enterEdit = () => { mode.value = 'edit' }
const cancelEdit = () => { mode.value = 'nav' }

const commitEdit = (text: string) => {
  const node = find(focusId.value)
  if (!node) return
  batch(() => {
    node.text = text
    mode.value = 'nav'
    mutate()
  })
}

// ── Tree Manipulation ───────────────────────

const siblingList = (id: string): TreeNode[] => {
  const parent = parentOf(id)
  return parent ? parent.children : items.value
}

const addSibling = () => {
  const siblings = siblingList(focusId.value)
  const idx = siblings.findIndex(n => n.id === focusId.value)
  if (idx === -1) return
  const newNode = mkNode('')
  siblings.splice(idx + 1, 0, newNode)
  batch(() => {
    setFocus(newNode.id)
    mode.value = 'edit'
    mutate()
  })
}

const deleteNode = () => {
  const node = find(focusId.value)
  if (!node) return
  const siblings = siblingList(focusId.value)
  const idx = siblings.findIndex(n => n.id === focusId.value)
  if (idx === -1) return

  // Find next focus target: previous sibling, next sibling, or parent
  const vis = flatVisible.value
  const visIdx = vis.findIndex(v => v.node.id === focusId.value)
  const nextFocus =
    visIdx > 0 ? vis[visIdx - 1].node.id :
    visIdx < vis.length - 1 ? vis[visIdx + 1].node.id : ''

  siblings.splice(idx, 1)
  batch(() => {
    if (nextFocus) setFocus(nextFocus)
    mutate()
  })
}

const indent = () => {
  const siblings = siblingList(focusId.value)
  const idx = siblings.findIndex(n => n.id === focusId.value)
  if (idx <= 0) return // Can't indent first child — no previous sibling to become parent
  const node = siblings[idx]
  const newParent = siblings[idx - 1]
  siblings.splice(idx, 1)
  newParent.children.push(node)
  newParent.collapsed = false
  mutate()
}

const outdent = () => {
  const parent = parentOf(focusId.value)
  if (!parent) return // Already at root level
  const grandparentList = siblingList(parent.id)
  const parentIdx = grandparentList.findIndex(n => n.id === parent.id)
  const childIdx = parent.children.findIndex(n => n.id === focusId.value)
  if (childIdx === -1 || parentIdx === -1) return
  const node = parent.children[childIdx]
  parent.children.splice(childIdx, 1)
  grandparentList.splice(parentIdx + 1, 0, node)
  mutate()
}

// ── Components ───────────────────────────────

function NodeRow({ node, depth }: { node: TreeNode; depth: number }) {
  const isFocused = focusId.value === node.id
  const isEditing = isFocused && mode.value === 'edit'
  const hasKids = node.children.length > 0
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.setSelectionRange(
        inputRef.current.value.length,
        inputRef.current.value.length,
      )
    }
  }, [isEditing])

  const bullet = hasKids ? (node.collapsed ? '\u25B6' : '\u25BC') : '\u2022'

  return (
    <div
      class={`flex items-center py-0.5 border-l-2 ${
        isFocused
          ? isEditing ? 'border-amber-500 bg-zinc-800' : 'border-blue-500 bg-zinc-800/50'
          : 'border-transparent'
      }`}
      style={{ paddingLeft: `${depth * 20 + 8}px` }}
      data-id={node.id}
      onClick={() => { setFocus(node.id); if (mode.value === 'edit') cancelEdit() }}
      onDblClick={() => { setFocus(node.id); enterEdit() }}
    >
      <span
        class={`w-5 h-5 flex items-center justify-center cursor-pointer text-xs shrink-0 ${
          hasKids ? 'text-zinc-400' : 'text-zinc-600'
        }`}
        onClick={e => { e.stopPropagation(); toggleCollapse(node.id) }}
      >
        {bullet}
      </span>
      {isEditing
        ? <input
            ref={inputRef}
            class="flex-1 bg-zinc-700 text-zinc-100 px-2 py-0.5 rounded outline-none border border-zinc-600 focus:border-blue-500 text-sm ml-1"
            value={node.text}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); commitEdit((e.target as HTMLInputElement).value) }
              if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
              if (e.key === 'Backspace' && (e.target as HTMLInputElement).value === '') {
                e.preventDefault(); cancelEdit(); deleteNode()
              }
            }}
          />
        : <span class={`flex-1 text-sm ml-1 py-0.5 ${node.done ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>
            {node.text || '\u00A0'}
          </span>
      }
    </div>
  )
}

function TreeView({ nodes, depth = 0 }: { nodes: TreeNode[]; depth?: number }) {
  return (
    <div>
      {nodes.flatMap(n => [
        <NodeRow key={n.id} node={n} depth={depth} />,
        ...(!n.collapsed && n.children.length > 0
          ? [<TreeView key={`${n.id}-c`} nodes={n.children} depth={depth + 1} />]
          : []),
      ])}
    </div>
  )
}

function ModeIndicator() {
  return (
    <div class="fixed bottom-0 left-0 right-0 h-7 flex items-center px-3 border-t border-zinc-800 bg-zinc-900 text-xs">
      <span class={`px-2 py-0.5 rounded text-white font-medium ${mode.value === 'edit' ? 'bg-amber-600' : 'bg-blue-600'}`}>
        {mode.value.toUpperCase()}
      </span>
    </div>
  )
}

function App() {
  useEffect(() => {
    const el = document.querySelector(`[data-id="${focusId.value}"]`)
    if (el) el.scrollIntoView({ block: 'nearest' })
  }, [focusId.value])

  return (
    <div class="h-screen flex flex-col bg-zinc-900 text-zinc-200">
      <div class="flex-1 overflow-auto py-2 pb-10">
        <TreeView nodes={items.value} />
      </div>
      <ModeIndicator />
    </div>
  )
}

// ── Keyboard ─────────────────────────────────

document.addEventListener('keydown', e => {
  if (mode.value === 'edit') return

  switch (e.key) {
    case 'ArrowUp': e.preventDefault(); moveFocus(-1); break
    case 'ArrowDown': e.preventDefault(); moveFocus(1); break
    case 'ArrowLeft': e.preventDefault(); collapseOrParent(); break
    case 'ArrowRight': e.preventDefault(); expandOrChild(); break
    case 'Enter': e.preventDefault(); addSibling(); break
    case ' ': e.preventDefault(); toggleDone(); break
    case 'Tab':
      e.preventDefault()
      if (e.shiftKey) outdent(); else indent()
      break
    case 'Backspace': case 'Delete':
      e.preventDefault(); deleteNode(); break
  }
})

// ── Mount ────────────────────────────────────

render(<App />, document.getElementById('app')!)
