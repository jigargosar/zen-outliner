import type { OutlineNode, TreeNode } from "./types";

let counter = 0;
function genId(): string {
  return `${Date.now()}-${counter++}`;
}

export function createNode(
  content: string,
  parentId: string | null,
  order: number
): OutlineNode {
  return { id: genId(), content, parentId, order, collapsed: false };
}

export function getChildren(
  nodes: OutlineNode[],
  parentId: string | null
): OutlineNode[] {
  return nodes
    .filter((n) => n.parentId === parentId)
    .sort((a, b) => a.order - b.order);
}

export function buildTree(
  nodes: OutlineNode[],
  parentId: string | null
): TreeNode[] {
  return getChildren(nodes, parentId).map((node) => ({
    node,
    children: buildTree(nodes, node.id),
  }));
}

export function addNodeAfter(
  nodes: OutlineNode[],
  afterId: string
): [OutlineNode[], string] {
  const target = nodes.find((n) => n.id === afterId)!;
  const newOrder = target.order + 1;
  const newNode = createNode("", target.parentId, newOrder);

  const updated = nodes.map((n) => {
    if (n.parentId === target.parentId && n.order >= newOrder) {
      return { ...n, order: n.order + 1 };
    }
    return n;
  });

  return [[...updated, newNode], newNode.id];
}

export function deleteNode(
  nodes: OutlineNode[],
  nodeId: string
): OutlineNode[] {
  const idsToDelete = new Set<string>();

  function collectIds(id: string) {
    idsToDelete.add(id);
    nodes.filter((n) => n.parentId === id).forEach((n) => collectIds(n.id));
  }
  collectIds(nodeId);

  const target = nodes.find((n) => n.id === nodeId)!;
  const remaining = nodes.filter((n) => !idsToDelete.has(n.id));

  const siblings = getChildren(remaining, target.parentId);
  return remaining.map((n) => {
    if (n.parentId === target.parentId) {
      const idx = siblings.findIndex((s) => s.id === n.id);
      return idx >= 0 ? { ...n, order: idx } : n;
    }
    return n;
  });
}

export function indentNode(
  nodes: OutlineNode[],
  nodeId: string
): OutlineNode[] {
  const target = nodes.find((n) => n.id === nodeId)!;
  const siblings = getChildren(nodes, target.parentId);
  const idx = siblings.findIndex((s) => s.id === nodeId);

  if (idx === 0) return nodes;

  const newParentId = siblings[idx - 1].id;
  const newSiblings = getChildren(nodes, newParentId);
  const newOrder = newSiblings.length;

  const withoutTarget = nodes.map((n) => {
    if (n.id === nodeId) {
      return { ...n, parentId: newParentId, order: newOrder };
    }
    return n;
  });

  const oldSiblings = getChildren(withoutTarget, target.parentId);
  return withoutTarget.map((n) => {
    if (n.parentId === target.parentId && n.id !== nodeId) {
      const i = oldSiblings.findIndex((s) => s.id === n.id);
      return i >= 0 ? { ...n, order: i } : n;
    }
    return n;
  });
}

export function outdentNode(
  nodes: OutlineNode[],
  nodeId: string
): OutlineNode[] {
  const target = nodes.find((n) => n.id === nodeId)!;
  if (target.parentId === null) return nodes;

  const parent = nodes.find((n) => n.id === target.parentId)!;
  const parentSiblings = getChildren(nodes, parent.parentId);
  const parentIdx = parentSiblings.findIndex((s) => s.id === parent.id);
  const newOrder = parentIdx + 1;

  let updated = nodes.map((n) => {
    if (n.parentId === parent.parentId && n.order > parent.order) {
      return { ...n, order: n.order + 1 };
    }
    return n;
  });

  updated = updated.map((n) => {
    if (n.id === nodeId) {
      return { ...n, parentId: parent.parentId, order: newOrder };
    }
    return n;
  });

  const oldSiblings = getChildren(updated, parent.id);
  return updated.map((n) => {
    if (n.parentId === parent.id) {
      const i = oldSiblings.findIndex((s) => s.id === n.id);
      return i >= 0 ? { ...n, order: i } : n;
    }
    return n;
  });
}

export function moveNodeUp(
  nodes: OutlineNode[],
  nodeId: string
): OutlineNode[] {
  const target = nodes.find((n) => n.id === nodeId)!;
  const siblings = getChildren(nodes, target.parentId);
  const idx = siblings.findIndex((s) => s.id === nodeId);

  if (idx === 0) return nodes;

  const prevSibling = siblings[idx - 1];
  return nodes.map((n) => {
    if (n.id === nodeId) return { ...n, order: prevSibling.order };
    if (n.id === prevSibling.id) return { ...n, order: target.order };
    return n;
  });
}

export function moveNodeDown(
  nodes: OutlineNode[],
  nodeId: string
): OutlineNode[] {
  const target = nodes.find((n) => n.id === nodeId)!;
  const siblings = getChildren(nodes, target.parentId);
  const idx = siblings.findIndex((s) => s.id === nodeId);

  if (idx === siblings.length - 1) return nodes;

  const nextSibling = siblings[idx + 1];
  return nodes.map((n) => {
    if (n.id === nodeId) return { ...n, order: nextSibling.order };
    if (n.id === nextSibling.id) return { ...n, order: target.order };
    return n;
  });
}

export function toggleCollapse(
  nodes: OutlineNode[],
  nodeId: string
): OutlineNode[] {
  return nodes.map((n) => {
    if (n.id === nodeId) return { ...n, collapsed: !n.collapsed };
    return n;
  });
}

export function updateContent(
  nodes: OutlineNode[],
  nodeId: string,
  content: string
): OutlineNode[] {
  return nodes.map((n) => {
    if (n.id === nodeId) return { ...n, content };
    return n;
  });
}
