import { node, nodeType, TNode, getParent } from 'mobx-bonsai'

// --- Node type ---

type OutlineNode = TNode<'OutlineNode', {
  id: string
  text: string
  children: OutlineNode[]
  collapsed: boolean
}>

export const TOutlineNode = nodeType<OutlineNode>('OutlineNode')
  .withKey('id')
  .defaults({
    children: () => [],
    collapsed: () => false,
  })
  .actions({
    setText(text: string) { this.text = text },
    toggleCollapse() { this.collapsed = !this.collapsed },
    addChild(at?: number) {
      const child = TOutlineNode({ id: crypto.randomUUID(), text: '' })
      if (at !== undefined) this.children.splice(at, 0, child)
      else this.children.push(child)
      return child
    },
    removeChild(index: number) { this.children.splice(index, 1) },
  })

// --- Root store ---

type OutlineStore = {
  children: OutlineNode[]
}

export const TOutlineStore = nodeType<OutlineStore>()
  .actions({
    addChild(at?: number) {
      const child = TOutlineNode({ id: crypto.randomUUID(), text: '' })
      if (at !== undefined) this.children.splice(at, 0, child)
      else this.children.push(child)
      return child
    },
    removeChild(index: number) { this.children.splice(index, 1) },
  })

// --- Helpers ---

export function getSiblings(n: OutlineNode): OutlineNode[] {
  const parent = getParent(n) as OutlineStore | OutlineNode | undefined
  return parent?.children ?? []
}

// --- Singleton ---

export const store = node<OutlineStore>({
  children: [
    TOutlineNode({ id: crypto.randomUUID(), text: '' }),
  ],
})

export type { OutlineNode, OutlineStore }
