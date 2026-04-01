/**
 * Proof-of-concept: mobx-keystone undo/redo + patch-based audit log
 *
 * Run: pnpm typecheck to verify this compiles.
 * This file is not imported by the app — it exists purely for verification.
 */
import {
    Model,
    model,
    modelAction,
    prop,
    idProp,
    getSnapshot,
    applySnapshot,
    onPatches,
    undoMiddleware,
    type Patch,
    registerRootStore,
    detach,
} from 'mobx-keystone'

// ─── Models ──────────────────────────────────────────────────────────────────

@model('zen/OutlineNode')
class OutlineNode extends Model({
    id: idProp,
    text: prop<string>(''),
    children: prop<OutlineNode[]>(() => []),
    collapsed: prop<boolean>(false),
}) {
    @modelAction
    setText(text: string) {
        this.text = text
    }

    @modelAction
    toggleCollapse() {
        this.collapsed = !this.collapsed
    }

    @modelAction
    addChild(text: string): OutlineNode {
        const child = new OutlineNode({ text })
        this.children.push(child)
        return child
    }

    @modelAction
    removeChild(child: OutlineNode) {
        const idx = this.children.indexOf(child)
        if (idx >= 0) this.children.splice(idx, 1)
    }

    @modelAction
    insertChildAt(index: number, child: OutlineNode) {
        this.children.splice(index, 0, child)
    }
}

@model('zen/RootStore')
class RootStore extends Model({
    children: prop<OutlineNode[]>(() => []),
}) {
    @modelAction
    addChild(text: string): OutlineNode {
        const child = new OutlineNode({ text })
        this.children.push(child)
        return child
    }

    @modelAction
    removeChild(child: OutlineNode) {
        const idx = this.children.indexOf(child)
        if (idx >= 0) this.children.splice(idx, 1)
    }

    @modelAction
    moveNode(node: OutlineNode, toParent: OutlineNode | RootStore, toIndex: number) {
        detach(node)
        if (toParent instanceof RootStore) {
            toParent.children.splice(toIndex, 0, node)
        } else {
            toParent.children.splice(toIndex, 0, node)
        }
    }
}

// ─── Demo ────────────────────────────────────────────────────────────────────

export function runKeystoneDemo() {
    // 1. Create root store and register it
    const root = new RootStore({})
    registerRootStore(root)

    // 2. Wire up undo middleware
    const undoManager = undoMiddleware(root)

    // 3. Set up audit log via onPatches
    const auditLog: Array<{ patches: Patch[]; inversePatches: Patch[] }> = []
    onPatches(root, (patches, inversePatches) => {
        auditLog.push({ patches, inversePatches })
    })

    // 4. Perform actions
    const nodeA = root.addChild('Chapter 1')
    const nodeB = root.addChild('Chapter 2')
    const childA1 = nodeA.addChild('Section 1.1')
    childA1.setText('Section 1.1 — Introduction')
    nodeB.toggleCollapse()

    // 5. Verify undo/redo
    console.log('--- After actions ---')
    console.log('canUndo:', undoManager.canUndo) // true
    console.log('undoLevels:', undoManager.undoLevels) // 5

    // Undo the toggleCollapse
    undoManager.undo()
    console.log('After undo toggleCollapse, collapsed:', nodeB.collapsed) // false

    // Undo the setText
    undoManager.undo()
    console.log('After undo setText, text:', childA1.text) // "Section 1.1"  (original)

    // Redo the setText
    undoManager.redo()
    console.log('After redo setText, text:', childA1.text) // "Section 1.1 — Introduction"

    // 6. Move node (reparent): move childA1 to be a child of nodeB
    root.moveNode(childA1, nodeB, 0)
    console.log('After move, nodeA children:', nodeA.children.length) // 0
    console.log('After move, nodeB children:', nodeB.children.length) // 1

    // Undo the move
    undoManager.undo()
    console.log('After undo move, nodeA children:', nodeA.children.length) // 1
    console.log('After undo move, nodeB children:', nodeB.children.length) // 0

    // 7. Snapshot format — plain JSON
    const snapshot = getSnapshot(root)
    console.log('\n--- Snapshot (plain JSON) ---')
    console.log(JSON.stringify(snapshot, null, 2))

    // 8. Restore from snapshot (e.g., from localStorage)
    const json = JSON.stringify(snapshot)
    const restored = JSON.parse(json)
    // applySnapshot reconciles an existing tree in-place:
    applySnapshot(root, restored)
    console.log('After applySnapshot, root children:', root.children.length)

    // Or create a fresh store from a snapshot:
    const root2 = new RootStore(restored)
    registerRootStore(root2)
    console.log('Restored root children:', root2.children.length)

    // 9. Audit log
    console.log('\n--- Audit log entries ---')
    console.log('Total patch events:', auditLog.length)
    for (const entry of auditLog) {
        for (const p of entry.patches) {
            console.log(`  ${p.op} [${p.path.join('/')}]`, 'value' in p ? p.value : '')
        }
    }

    // 10. Undo event inspection
    console.log('\n--- Undo queue ---')
    for (const event of undoManager.undoQueue) {
        if (event.type === 'single') {
            console.log(`  action: ${event.actionName}, patches: ${event.patches.length}`)
        }
    }

    // Cleanup
    undoManager.dispose()
}
