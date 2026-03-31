import { observer } from 'mobx-react-lite'
import { node } from 'mobx-bonsai'
import { TOutlineNode, type OutlineNode, type OutlineStore } from './store'

const demo = node<OutlineStore>({
  children: [
    TOutlineNode.snapshot({
      id: '1', text: 'First node', children: [
        TOutlineNode.snapshot({ id: '1a', text: 'Child one' }),
        TOutlineNode.snapshot({ id: '1b', text: 'Child two', children: [
          TOutlineNode.snapshot({ id: '1b1', text: 'Grandchild' }),
        ]}),
      ],
    }),
    TOutlineNode.snapshot({ id: '2', text: 'Second node' }),
    TOutlineNode.snapshot({ id: '3', text: 'Third node' }),
  ],
})

const Bullet = ({ hasChildren, collapsed, onToggle }: {
  hasChildren: boolean
  collapsed: boolean
  onToggle: () => void
}) => (
  <span className="w-6 shrink-0 flex items-center justify-center text-zinc-400">
    {hasChildren ? (
      <button onClick={onToggle} className="hover:text-zinc-200">
        {collapsed ? '▶' : '▼'}
      </button>
    ) : (
      <span className="block w-1.5 h-1.5 rounded-full bg-zinc-500" />
    )}
  </span>
)

const NodeView = observer(({ n, depth = 0 }: { n: OutlineNode; depth?: number }) => (
  <div style={{ paddingLeft: depth * 24 }}>
    <div className="flex items-center gap-2 h-9">
      <Bullet
        hasChildren={n.children.length > 0}
        collapsed={n.collapsed}
        onToggle={() => TOutlineNode.toggleCollapse(n)}
      />
      <span className="text-zinc-200">
        {n.text || <span className="text-zinc-500 italic">empty</span>}
      </span>
    </div>
    {!n.collapsed && n.children.map(child => (
      <NodeView key={child.id} n={child} depth={depth + 1} />
    ))}
  </div>
))

export const App = observer(() => (
  <div className="max-w-3xl mx-auto p-10 text-lg">
    {demo.children.map(child => (
      <NodeView key={child.id} n={child} />
    ))}
  </div>
))
