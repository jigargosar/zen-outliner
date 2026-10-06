import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { ChevronRight } from 'lucide-react'
import { store, type OutlineNode } from './store'

function getVisibleNodes(nodes: OutlineNode[]): OutlineNode[] {
    const result: OutlineNode[] = []
    for (const node of nodes) {
        result.push(node)
        const children = store.getChildren(node.id)
        if (children.length > 0 && !node.collapsed) {
            result.push(...getVisibleNodes(children))
        }
    }
    return result
}

const NodeView = observer(({ node }: { node: OutlineNode }) => {
    const children = store.getChildren(node.id)
    const hasChildren = children.length > 0
    const isSelected = store.selectedId === node.id

    return (
        <div>
            <div className="flex items-center gap-1 py-0.5">
                <button
                    className={`w-8 h-8 flex-none flex items-center justify-center text-zinc-600 ${
                        hasChildren ? 'cursor-pointer' : 'invisible'
                    }`}
                    onClick={(e) => { e.stopPropagation(); store.toggleCollapse(node.id) }}
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
                    onClick={() => store.setSelectedId(node.id)}
                >
                    {node.text}
                </span>
            </div>
            {hasChildren && !node.collapsed && (
                <div className="ml-9">
                    {children.map((child) => (
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
            const visible = getVisibleNodes(store.getChildren(null))
            if (visible.length === 0) return

            const currentId = store.selectedId
            const currentIndex = currentId ? visible.findIndex((n) => n.id === currentId) : -1
            const currentNode = currentIndex >= 0 ? visible[currentIndex] : null

            if (e.key === 'j') {
                const next = currentIndex < visible.length - 1 ? currentIndex + 1 : 0
                store.setSelectedId(visible[next].id)
            } else if (e.key === 'k') {
                const prev = currentIndex > 0 ? currentIndex - 1 : visible.length - 1
                store.setSelectedId(visible[prev].id)
            } else if (e.key === 'l' && currentNode) {
                const children = store.getChildren(currentNode.id)
                if (children.length > 0 && currentNode.collapsed) store.toggleCollapse(currentNode.id)
            } else if (e.key === 'h' && currentNode) {
                const children = store.getChildren(currentNode.id)
                if (children.length > 0 && !currentNode.collapsed) store.toggleCollapse(currentNode.id)
            } else {
                return
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [])

    return (
        <div id="zen-outliner" className="max-w-2xl mx-auto px-8 py-12">
            {store.getChildren(null).map((child) => (
                <NodeView key={child.id} node={child} />
            ))}
        </div>
    )
})
