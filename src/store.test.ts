import { describe, it, expect } from 'vitest'
import {
  mkNode, resetNextId, initForTest,
  items, focusId, mode, find, flatVisible,
  moveFocus, collapseOrParent, expandOrChild,
  toggleDone, enterEdit, cancelEdit, commitEdit,
  addSibling, deleteNode, indent, outdent, moveUp, moveDown, undo, canUndo,
} from './store'

// Helper: build a simple test tree with predictable IDs
//   A (id=1)
//     A1 (id=2)
//     A2 (id=3)
//   B (id=4)
//   C (id=5)
const setup = () => {
  resetNextId(1)
  const a1 = mkNode('A1')
  const a2 = mkNode('A2')
  const a = mkNode('A', [a1, a2])
  const b = mkNode('B')
  const c = mkNode('C')
  initForTest([a, b, c], a.id)
  return { a, a1, a2, b, c }
}

describe('navigation', () => {
  it('moves focus down through visible nodes', () => {
    const { a1 } = setup()
    moveFocus(1)
    expect(focusId.value).toBe(a1.id)
  })

  it('moves focus up', () => {
    const { a, a1 } = setup()
    focusId.value = a1.id
    moveFocus(-1)
    expect(focusId.value).toBe(a.id)
  })

  it('does not move past first node', () => {
    const { a } = setup()
    moveFocus(-1)
    expect(focusId.value).toBe(a.id)
  })

  it('does not move past last node', () => {
    const { c } = setup()
    focusId.value = c.id
    moveFocus(1)
    expect(focusId.value).toBe(c.id)
  })
})

describe('collapse/expand', () => {
  it('collapses a node with children', () => {
    const { a } = setup()
    collapseOrParent()
    const node = find(a.id)!
    expect(node.collapsed).toBe(true)
  })

  it('hides children from flatVisible when collapsed', () => {
    const { a1, a2, b } = setup()
    collapseOrParent()
    const ids = flatVisible.value.map(v => v.node.id)
    expect(ids).not.toContain(a1.id)
    expect(ids).not.toContain(a2.id)
    expect(ids).toContain(b.id)
  })

  it('expands a collapsed node', () => {
    const { a } = setup()
    collapseOrParent() // collapse
    expandOrChild() // expand
    const node = find(a.id)!
    expect(node.collapsed).toBe(false)
  })

  it('moves focus to parent when collapsing a leaf', () => {
    const { a, a1 } = setup()
    focusId.value = a1.id
    collapseOrParent()
    expect(focusId.value).toBe(a.id)
  })
})

describe('toggleDone', () => {
  it('toggles done state', () => {
    const { a } = setup()
    toggleDone()
    expect(find(a.id)!.done).toBe(true)
  })

  it('produces a new tree reference (immutable)', () => {
    setup()
    const before = items.value
    toggleDone()
    expect(items.value).not.toBe(before)
  })

  it('untoggle works', () => {
    const { a } = setup()
    toggleDone()
    toggleDone()
    expect(find(a.id)!.done).toBe(false)
  })
})

describe('edit', () => {
  it('enters and exits edit mode', () => {
    setup()
    enterEdit()
    expect(mode.value).toBe('edit')
    cancelEdit()
    expect(mode.value).toBe('nav')
  })

  it('commits text change', () => {
    const { a } = setup()
    enterEdit()
    commitEdit('New Text')
    expect(find(a.id)!.text).toBe('New Text')
    expect(mode.value).toBe('nav')
  })

  it('does not enter edit if no focused node', () => {
    setup()
    focusId.value = 'nonexistent'
    enterEdit()
    expect(mode.value).toBe('nav')
  })
})

describe('addSibling', () => {
  it('adds sibling after focused node', () => {
    const { b } = setup()
    focusId.value = b.id
    addSibling()
    const root = items.value
    const bIdx = root.findIndex(n => n.id === b.id)
    expect(root[bIdx + 1].text).toBe('')
  })

  it('focuses new node and enters edit mode', () => {
    const { b } = setup()
    focusId.value = b.id
    addSibling()
    expect(mode.value).toBe('edit')
    expect(focusId.value).not.toBe(b.id)
  })

  it('works when tree is empty', () => {
    resetNextId(100)
    initForTest([], '')
    addSibling()
    expect(items.value.length).toBe(1)
    expect(mode.value).toBe('edit')
  })
})

describe('deleteNode', () => {
  it('deletes a node and focuses next', () => {
    const { b } = setup()
    focusId.value = b.id
    deleteNode()
    expect(find(b.id)).toBeNull()
    expect(find(focusId.value)).not.toBeNull()
  })

  it('focuses previous when deleting last visible', () => {
    const { c } = setup()
    focusId.value = c.id
    deleteNode()
    expect(find(c.id)).toBeNull()
    expect(find(focusId.value)).not.toBeNull()
  })

  it('focuses parent when deleting only child', () => {
    resetNextId(100)
    const child = mkNode('child')
    const parent = mkNode('parent', [child])
    initForTest([parent], child.id)
    deleteNode()
    expect(focusId.value).toBe(parent.id)
  })

  it('creates new node when tree becomes empty', () => {
    resetNextId(200)
    const only = mkNode('only')
    initForTest([only], only.id)
    deleteNode()
    expect(items.value.length).toBe(1)
    expect(focusId.value).toBe(items.value[0].id)
  })

  it('deleting first node keeps focus on a valid node', () => {
    setup()
    deleteNode() // delete A (first)
    expect(find(focusId.value)).not.toBeNull()
  })

  it('produces a new tree reference (immutable)', () => {
    const { b } = setup()
    focusId.value = b.id
    const before = items.value
    deleteNode()
    expect(items.value).not.toBe(before)
  })
})

describe('indent', () => {
  it('makes node a child of previous sibling', () => {
    const { a, b } = setup()
    focusId.value = b.id
    indent()
    const aNode = find(a.id)!
    expect(aNode.children.some(c => c.id === b.id)).toBe(true)
    expect(items.value.some(n => n.id === b.id)).toBe(false)
  })

  it('does not indent the first sibling', () => {
    const { a } = setup()
    const rootCount = items.value.length
    indent() // A is first, should be no-op
    expect(items.value.length).toBe(rootCount)
    expect(items.value[0].id).toBe(a.id)
  })

  it('expands new parent if collapsed', () => {
    const { a, b } = setup()
    collapseOrParent() // collapse A
    focusId.value = b.id
    indent()
    const aNode = find(a.id)!
    expect(aNode.collapsed).toBe(false)
  })
})

describe('outdent', () => {
  it('moves child to parent level', () => {
    const { a, a1 } = setup()
    focusId.value = a1.id
    outdent()
    const aIdx = items.value.findIndex(n => n.id === a.id)
    expect(items.value[aIdx + 1].id).toBe(a1.id)
  })

  it('does not outdent root nodes', () => {
    const { b } = setup()
    focusId.value = b.id
    const before = items.value.length
    outdent()
    expect(items.value.length).toBe(before)
  })

  it('parent has no children after last child outdented', () => {
    resetNextId(300)
    const child = mkNode('child')
    const parent = mkNode('parent', [child])
    const sibling = mkNode('sibling')
    initForTest([parent, sibling], child.id)
    outdent()
    const p = find(parent.id)!
    expect(p.children.length).toBe(0)
  })
})

describe('undo', () => {
  it('undoes toggleDone', () => {
    const { a } = setup()
    expect(find(a.id)!.done).toBe(false)
    toggleDone()
    expect(find(a.id)!.done).toBe(true)
    undo()
    expect(find(a.id)!.done).toBe(false)
  })

  it('undoes delete and restores focus', () => {
    const { b } = setup()
    focusId.value = b.id
    deleteNode()
    expect(find(b.id)).toBeNull()
    undo()
    expect(find(b.id)).not.toBeNull()
    expect(focusId.value).toBe(b.id)
  })

  it('undoes addSibling', () => {
    const { b } = setup()
    focusId.value = b.id
    const countBefore = flatVisible.value.length
    addSibling()
    expect(flatVisible.value.length).toBeGreaterThan(countBefore)
    undo()
    expect(flatVisible.value.length).toBe(countBefore)
  })

  it('undoes indent', () => {
    const { a, b } = setup()
    focusId.value = b.id
    indent()
    expect(find(a.id)!.children.some(c => c.id === b.id)).toBe(true)
    undo()
    expect(items.value.some(n => n.id === b.id)).toBe(true)
  })

  it('undoes commitEdit', () => {
    const { a } = setup()
    enterEdit()
    commitEdit('Changed')
    expect(find(a.id)!.text).toBe('Changed')
    undo()
    expect(find(a.id)!.text).toBe('A')
  })

  it('canUndo returns false initially', () => {
    setup()
    expect(canUndo()).toBe(false)
  })

  it('canUndo returns true after a mutation', () => {
    setup()
    toggleDone()
    expect(canUndo()).toBe(true)
  })

  it('does nothing when stack is empty', () => {
    const { a } = setup()
    const treeBefore = items.value
    undo()
    expect(items.value).toBe(treeBefore)
    expect(focusId.value).toBe(a.id)
  })

  it('sets mode to nav on undo', () => {
    setup()
    enterEdit()
    commitEdit('test')
    mode.value = 'edit'
    undo()
    expect(mode.value).toBe('nav')
  })
})

describe('moveUp / moveDown', () => {
  it('moves node up among root siblings', () => {
    const { b } = setup()
    focusId.value = b.id
    moveUp()
    expect(items.value[0].id).toBe(b.id)
    expect(items.value[1].text).toBe('A')
  })

  it('moves node down among root siblings', () => {
    const { a, b } = setup()
    moveDown()
    expect(items.value[0].id).toBe(b.id)
    expect(items.value[1].id).toBe(a.id)
  })

  it('moves child node up within parent', () => {
    const { a, a1, a2 } = setup()
    focusId.value = a2.id
    moveUp()
    const parent = find(a.id)!
    expect(parent.children[0].id).toBe(a2.id)
    expect(parent.children[1].id).toBe(a1.id)
  })

  it('moves child node down within parent', () => {
    const { a, a1, a2 } = setup()
    focusId.value = a1.id
    moveDown()
    const parent = find(a.id)!
    expect(parent.children[0].id).toBe(a2.id)
    expect(parent.children[1].id).toBe(a1.id)
  })

  it('does nothing when node is first sibling and moveUp', () => {
    const { a } = setup()
    moveUp()
    expect(items.value[0].id).toBe(a.id)
  })

  it('does nothing when node is last sibling and moveDown', () => {
    const { c } = setup()
    focusId.value = c.id
    moveDown()
    expect(items.value[2].id).toBe(c.id)
  })

  it('preserves focus after move', () => {
    const { b } = setup()
    focusId.value = b.id
    moveUp()
    expect(focusId.value).toBe(b.id)
  })

  it('is undoable', () => {
    const { a, b } = setup()
    focusId.value = b.id
    moveUp()
    expect(items.value[0].id).toBe(b.id)
    undo()
    expect(items.value[0].id).toBe(a.id)
  })
})
