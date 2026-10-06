import { makeAutoObservable, observable } from 'mobx'
import { generateKeyBetween } from 'fractional-indexing'

// --- Node record ---

export interface OutlineNode {
    id: string
    text: string
    parentId: string | null
    order: string
    collapsed: boolean
}

// --- Store ---

export class OutlineStore {
    nodes = observable.map<string, OutlineNode>()
    selectedId: string | null = null

    constructor() {
        makeAutoObservable(this)
    }

    getChildren(parentId: string | null): OutlineNode[] {
        return [...this.nodes.values()]
            .filter((n) => n.parentId === parentId)
            .sort((a, b) => (a.order < b.order ? -1 : 1))
    }

    addNode(parentId: string | null, at?: number): OutlineNode {
        const siblings = this.getChildren(parentId)
        const before = at !== undefined ? (siblings[at - 1]?.order ?? null) : (siblings[siblings.length - 1]?.order ?? null)
        const after = at !== undefined ? (siblings[at]?.order ?? null) : null

        const node: OutlineNode = {
            id: crypto.randomUUID(),
            text: '',
            parentId,
            order: generateKeyBetween(before, after),
            collapsed: false,
        }
        this.nodes.set(node.id, node)
        return node
    }

    removeNode(id: string) {
        for (const child of this.getChildren(id)) {
            this.removeNode(child.id)
        }
        this.nodes.delete(id)
    }

    setText(id: string, text: string) {
        const node = this.nodes.get(id)
        if (node) node.text = text
    }

    toggleCollapse(id: string) {
        const node = this.nodes.get(id)
        if (node) node.collapsed = !node.collapsed
    }

    setSelectedId(id: string | null) {
        this.selectedId = id
    }
}

// --- Singleton ---

export const store = new OutlineStore()

// Seed data
const seed = [
    {
        text: 'Getting started',
        children: [
            { text: 'Install dependencies' },
            { text: 'Run the dev server' },
        ],
    },
    {
        text: 'Features',
        children: [
            {
                text: 'Tree editing',
                children: [
                    { text: 'Expand and collapse' },
                    { text: 'Inline text editing' },
                ],
            },
            { text: 'Keyboard shortcuts' },
        ],
    },
    { text: 'Notes' },
]

type SeedNode = { text: string; children?: SeedNode[] }

function loadSeed(items: SeedNode[], parentId: string | null) {
    for (const item of items) {
        const node = store.addNode(parentId)
        store.setText(node.id, item.text)
        if (item.children) loadSeed(item.children, node.id)
    }
}

loadSeed(seed, null)
