import { observer } from 'mobx-react-lite'
import { ChevronRight } from 'lucide-react'
import { store, TOutlineNode, selectedId, type OutlineNode } from './store'

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

export const App = observer(() => (
    <div id="zen-outliner" className="max-w-2xl mx-auto px-8 py-12">
        {store.children.map((child) => (
            <NodeView key={child.id} node={child} />
        ))}
    </div>
))
