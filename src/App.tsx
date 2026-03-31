import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { ChevronRight } from 'lucide-react'
import { store, TOutlineNode, selectedId, type OutlineNode } from './store'

function getVisibleNodes(nodes: OutlineNode[]): OutlineNode[] {
    const result: OutlineNode[] = []
    for (const node of nodes) {
        result.push(node)
        if (node.children.length > 0 && !node.collapsed) {
            result.push(...getVisibleNodes(node.children))
        }
    }
    return result
}

const NodeView = observer(({ node }: { node: OutlineNode }) => {
    const hasChildren = node.children.length > 0
    const isSelected = selectedId.get() === node.id

    return (
        <div>
            <div className="flex items-center gap-1 py-0.5">
                <button
                    className={`w-8 h-8 flex-none flex items-center justify-center text-zinc-600 ${
                        hasChildren ? 'cursor-pointer' : 'invisible'
                    }`}
                    onClick={(e) => { e.stopPropagation(); TOutlineNode.toggleCollapse(node) }}
                    tabIndex={-1}
                >
                    <ChevronRight
                        size={14}
                        strokeWidth={2}
                        className={`transition-transform duration-150 ${!node.collapsed ? 'rotate-90' : ''}`}
                    />
                </button>
                <span
                    className={`flex-1 text-zinc-400 text-base select-none py-1 px-2 rounded cursor-pointer ${
                        isSelected ? 'bg-zinc-800' : ''
                    }`}
                    onClick={() => selectedId.set(node.id)}
                >
                    {node.text}
                </span>
            </div>
            {hasChildren && !node.collapsed && (
                <div className="ml-9">
                    {node.children.map((child) => (
                        <NodeView key={child.id} node={child} />
                    ))}
                </div>
            )}
        </div>
    )
})

export const App = observer(() => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const visible = getVisibleNodes(store.children)
            if (visible.length === 0) return

            const currentId = selectedId.get()
            const currentIndex = currentId ? visible.findIndex((n) => n.id === currentId) : -1
            const currentNode = currentIndex >= 0 ? visible[currentIndex] : null

            if (e.key === 'j') {
                const next = currentIndex < visible.length - 1 ? currentIndex + 1 : 0
                selectedId.set(visible[next].id)
            } else if (e.key === 'k') {
                const prev = currentIndex > 0 ? currentIndex - 1 : visible.length - 1
                selectedId.set(visible[prev].id)
            } else if (e.key === 'l' && currentNode && currentNode.children.length > 0 && currentNode.collapsed) {
                TOutlineNode.toggleCollapse(currentNode)
            } else if (e.key === 'h' && currentNode && currentNode.children.length > 0 && !currentNode.collapsed) {
                TOutlineNode.toggleCollapse(currentNode)
            } else {
                return
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [])

    return (
        <div id="zen-outliner" className="max-w-2xl mx-auto px-8 py-12">
            {store.children.map((child) => (
                <NodeView key={child.id} node={child} />
            ))}
        </div>
    )
})
