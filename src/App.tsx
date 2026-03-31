import { observer } from 'mobx-react-lite'
import { ChevronRight } from 'lucide-react'
import { store, TOutlineNode, type OutlineNode } from './store'

const NodeView = observer(({ node }: { node: OutlineNode }) => {
    const hasChildren = node.children.length > 0

    return (
        <div>
            <div className="flex items-center gap-2 py-1">
                <button
                    className={`w-5 h-5 flex items-center justify-center text-zinc-600 hover:text-zinc-400 transition-transform duration-150 ${
                        hasChildren ? 'cursor-pointer' : 'invisible'
                    } ${!node.collapsed ? 'rotate-90' : ''}`}
                    onClick={() => TOutlineNode.toggleCollapse(node)}
                    tabIndex={-1}
                >
                    <ChevronRight size={16} strokeWidth={2} />
                </button>
                <span className="text-zinc-200 text-base select-none">{node.text}</span>
            </div>
            {hasChildren && !node.collapsed && (
                <div className="ml-7">
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
