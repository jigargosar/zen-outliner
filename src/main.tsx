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
    if (!saved.tree || saved.tree.length === 0) return { tree: defaultTree(), focusId: '' }
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
  const newNode = mkNode('')
  const siblings = siblingList(focusId.value)
  const idx = siblings.findIndex(n => n.id === focusId.value)
  if (idx === -1) {
    // No focused node or empty tree — add to root
    items.value.push(newNode)
  } else {
    siblings.splice(idx + 1, 0, newNode)
  }
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

  // Find next focus target: previous visible, next visible, parent, or create new
  const vis = flatVisible.value
  const visIdx = vis.findIndex(v => v.node.id === focusId.value)
  const parent = parentOf(focusId.value)

  siblings.splice(idx, 1)

  // Determine where focus goes
  let nextFocus = ''
  if (vis.length > 1) {
    // Try next visible node (excluding the one we just deleted)
    if (visIdx < vis.length - 1) nextFocus = vis[visIdx + 1].node.id
    else if (visIdx > 0) nextFocus = vis[visIdx - 1].node.id
  }
  // If siblings list is now empty and we have a parent, focus parent
  if (!nextFocus && parent) nextFocus = parent.id

  // If tree is completely empty, create a new root node
  if (items.value.length === 0) {
    const newNode = mkNode('')
    items.value.push(newNode)
    nextFocus = newNode.id
  }

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

const showHelp = signal(false)

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

  // Accent: blue for NAV focus, amber for EDIT focus. Transparent border always reserved (no layout shift).
  const focusClass = isFocused
    ? isEditing ? 'border-l-amber-500 bg-zinc-800/80' : 'border-l-blue-500 bg-zinc-800/40'
    : 'border-l-transparent'

  return (
    <div
      class={`flex items-center border-l-2 ${focusClass} min-h-9 cursor-default select-none`}
      style={{ paddingLeft: `${depth * 24 + 12}px` }}
      data-id={node.id}
      onClick={() => { setFocus(node.id); if (mode.value === 'edit') cancelEdit() }}
      onDblClick={() => { setFocus(node.id); enterEdit() }}
    >
      <span
        class={`w-7 h-7 flex items-center justify-center cursor-pointer text-sm shrink-0 ${
          hasKids ? 'text-zinc-400' : 'text-zinc-600'
        }`}
        onClick={e => { e.stopPropagation(); toggleCollapse(node.id) }}
      >
        {bullet}
      </span>
      {isEditing
        ? <input
            ref={inputRef}
            class="flex-1 bg-zinc-700 text-zinc-100 px-3 py-1.5 rounded outline-none border border-transparent focus:border-amber-500 text-base ml-1"
            value={node.text}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); commitEdit((e.target as HTMLInputElement).value) }
              if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
              if (e.key === 'Backspace' && (e.target as HTMLInputElement).value === '') {
                e.preventDefault(); cancelEdit(); deleteNode()
              }
            }}
          />
        : <span class={`flex-1 text-base ml-1 py-1.5 ${node.done ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>
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

function ShortcutRow({ keys, action }: { keys: string; action: string }) {
  return (
    <div class="flex items-center gap-4 py-1">
      <span class="w-32 text-right text-zinc-400 font-mono text-sm shrink-0">{keys}</span>
      <span class="text-zinc-300 text-sm">{action}</span>
    </div>
  )
}

function HelpPanel() {
  if (!showHelp.value) return null
  return (
    <div class="border-t border-zinc-800 bg-zinc-900 px-6 py-4 max-h-64 overflow-auto">
      <div class="text-xs text-zinc-500 uppercase tracking-wide mb-3">Keyboard Shortcuts</div>
      <div class="grid grid-cols-2 gap-x-8">
        <div>
          <div class="text-xs text-zinc-500 uppercase tracking-wide mb-1">Navigation</div>
          <ShortcutRow keys={'↑ / ↓'} action="Move up / down" />
          <ShortcutRow keys={'←'} action="Collapse or go to parent" />
          <ShortcutRow keys={'→'} action="Expand or go to child" />
        </div>
        <div>
          <div class="text-xs text-zinc-500 uppercase tracking-wide mb-1">Editing</div>
          <ShortcutRow keys="Enter" action="Add sibling below" />
          <ShortcutRow keys="Tab" action="Indent node" />
          <ShortcutRow keys="Shift+Tab" action="Outdent node" />
          <ShortcutRow keys="Backspace" action="Delete node" />
          <ShortcutRow keys="Space" action="Toggle done" />
          <ShortcutRow keys="Dbl-click" action="Edit node text" />
          <ShortcutRow keys="Escape" action="Cancel edit" />
        </div>
      </div>
    </div>
  )
}

function StatusBar() {
  const modeColor = mode.value === 'edit' ? 'bg-amber-600' : 'bg-blue-600'
  return (
    <div class="h-9 flex items-center justify-between px-4 border-t border-zinc-800 bg-zinc-900 text-sm shrink-0">
      <span class={`px-2.5 py-0.5 rounded text-white font-medium text-xs ${modeColor}`}>
        {mode.value.toUpperCase()}
      </span>
      <button
        class="text-zinc-500 text-xs px-2 py-1"
        onClick={() => { showHelp.value = !showHelp.value }}
      >
        {showHelp.value ? 'Hide shortcuts' : 'Shortcuts — ?'}
      </button>
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
      <div class="flex-1 overflow-auto py-3 pb-12">
        <TreeView nodes={items.value} />
      </div>
      <HelpPanel />
      <StatusBar />
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
    case '?':
      e.preventDefault(); showHelp.value = !showHelp.value; break
  }
})

// ── Mount ────────────────────────────────────

render(<App />, document.getElementById('app')!)
