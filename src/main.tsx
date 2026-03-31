import { render } from 'preact'
import { useRef, useEffect } from 'preact/hooks'
import {
  type TreeNode,
  items, focusId, mode, showHelp,
  setFocus, moveFocus, collapseOrParent, expandOrChild,
  toggleDone, toggleCollapse, enterEdit, cancelEdit, commitEdit,
  addSibling, deleteNode, indent, outdent, undo, exportJSON,
} from './store'

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
        class={`w-7 h-7 flex items-center justify-center cursor-pointer text-base shrink-0 ${
          hasKids ? 'text-zinc-400' : 'text-zinc-600'
        }`}
        onClick={e => { e.stopPropagation(); toggleCollapse(node.id) }}
      >
        {bullet}
      </span>
      {isEditing
        ? <input
            ref={inputRef}
            class="flex-1 bg-transparent text-zinc-100 px-0 py-0 outline-none border-b border-amber-500 text-base ml-1"
            value={node.text}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); commitEdit((e.target as HTMLInputElement).value) }
              if (e.key === 'Escape') {
                e.preventDefault()
                const text = (e.target as HTMLInputElement).value
                if (text === '') { cancelEdit(); deleteNode() } else { cancelEdit() }
              }
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
      <div class="text-sm text-zinc-500 uppercase tracking-wide mb-3">Keyboard Shortcuts</div>
      <div class="grid grid-cols-2 gap-x-8">
        <div>
          <div class="text-sm text-zinc-500 uppercase tracking-wide mb-1">Navigation</div>
          <ShortcutRow keys={'↑ / ↓'} action="Move up / down" />
          <ShortcutRow keys={'←'} action="Collapse or go to parent" />
          <ShortcutRow keys={'→'} action="Expand or go to child" />
        </div>
        <div>
          <div class="text-sm text-zinc-500 uppercase tracking-wide mb-1">Editing</div>
          <ShortcutRow keys="Enter" action="Add sibling below" />
          <ShortcutRow keys="Tab" action="Indent node" />
          <ShortcutRow keys="Shift+Tab" action="Outdent node" />
          <ShortcutRow keys="Backspace" action="Delete node" />
          <ShortcutRow keys="Space" action="Toggle done" />
          <ShortcutRow keys="F2" action="Edit node text" />
          <ShortcutRow keys="Escape" action="Cancel / delete empty" />
          <ShortcutRow keys="Ctrl+Z" action="Undo" />
          <ShortcutRow keys="Ctrl+E" action="Export JSON backup" />
        </div>
      </div>
    </div>
  )
}

function StatusBar() {
  const modeColor = mode.value === 'edit' ? 'bg-amber-600' : 'bg-blue-600'
  return (
    <div class="h-9 flex items-center justify-between px-4 border-t border-zinc-800 bg-zinc-900 text-sm shrink-0">
      <span class={`px-2.5 py-0.5 rounded text-white font-medium text-sm ${modeColor}`}>
        {mode.value.toUpperCase()}
      </span>
      <button
        class="text-zinc-400 text-sm px-3 py-1 rounded border border-zinc-700"
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
    case 'F2': e.preventDefault(); enterEdit(); break
    case 'Tab':
      e.preventDefault()
      if (e.shiftKey) outdent(); else indent()
      break
    case 'Backspace': case 'Delete':
      e.preventDefault(); deleteNode(); break
    case 'z':
      if (e.ctrlKey || e.metaKey) { e.preventDefault(); undo(); break }
      break
    case 'e':
      if (e.ctrlKey || e.metaKey) { e.preventDefault(); exportJSON(); break }
      break
    case '?':
      e.preventDefault(); showHelp.value = !showHelp.value; break
  }
})

// ── Mount ────────────────────────────────────

render(<App />, document.getElementById('app')!)
