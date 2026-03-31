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

const Chevron = ({ collapsed }: { collapsed: boolean }) => (
  <svg
    viewBox="0 0 10 10"
    className={`w-4 h-4 fill-zinc-400 transition-transform ${collapsed ? '' : 'rotate-90'}`}
  >
    <path d="M2 1l6 4-6 4z" />
  </svg>
)

const NodeView = observer(({ n }: { n: OutlineNode }) => (
  <div>
    <div className="flex items-center gap-4 h-11 px-2 -mx-2">
      <span className="w-6 shrink-0 flex items-center justify-center">
        {n.children.length > 0 ? (
          <button onClick={() => TOutlineNode.toggleCollapse(n)}>
            <Chevron collapsed={n.collapsed} />
          </button>
        ) : (
          <span className="block w-2 h-2 rounded-full bg-zinc-500" />
        )}
      </span>
      <span className="text-zinc-200">
        {n.text || <span className="text-zinc-600 italic">empty</span>}
      </span>
    </div>
    {!n.collapsed && n.children.length > 0 && (
      <div className="pl-8">
        {n.children.map(child => (
          <NodeView key={child.id} n={child} />
        ))}
      </div>
    )}
  </div>
))

export const App = observer(() => (
  <div className="max-w-3xl mx-auto px-12 py-16 text-lg">
    {demo.children.map(child => (
      <NodeView key={child.id} n={child} />
    ))}
  </div>
))
