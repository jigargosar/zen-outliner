import { describe, it, expect } from "vitest";
import {
  createNode,
  getChildren,
  buildTree,
  addNodeAfter,
  deleteNode,
  indentNode,
  outdentNode,
  moveNodeUp,
  moveNodeDown,
  toggleCollapse,
} from "./store";
import type { OutlineNode } from "./types";

function makeNodes(): OutlineNode[] {
  return [
    { id: "1", parentId: null, content: "First", order: 0, collapsed: false },
    { id: "2", parentId: null, content: "Second", order: 1, collapsed: false },
    { id: "3", parentId: null, content: "Third", order: 2, collapsed: false },
    { id: "2a", parentId: "2", content: "Child of Second", order: 0, collapsed: false },
    { id: "2b", parentId: "2", content: "Another child", order: 1, collapsed: false },
  ];
}

describe("createNode", () => {
  it("creates a node with given parentId and order", () => {
    const node = createNode("hello", null, 0);
    expect(node.content).toBe("hello");
    expect(node.parentId).toBe(null);
    expect(node.order).toBe(0);
    expect(node.collapsed).toBe(false);
    expect(node.id).toBeTruthy();
  });
});

describe("getChildren", () => {
  it("returns direct children sorted by order", () => {
    const nodes = makeNodes();
    const children = getChildren(nodes, "2");
    expect(children.map((n) => n.id)).toEqual(["2a", "2b"]);
  });

  it("returns root nodes when parentId is null", () => {
    const nodes = makeNodes();
    const roots = getChildren(nodes, null);
    expect(roots.map((n) => n.id)).toEqual(["1", "2", "3"]);
  });
});

describe("buildTree", () => {
  it("builds nested tree from flat array", () => {
    const nodes = makeNodes();
    const tree = buildTree(nodes, null);
    expect(tree).toHaveLength(3);
    expect(tree[1].children).toHaveLength(2);
    expect(tree[1].children[0].node.content).toBe("Child of Second");
  });
});

describe("addNodeAfter", () => {
  it("adds a sibling after the target node", () => {
    const nodes = makeNodes();
    const [updated, newId] = addNodeAfter(nodes, "1");
    const roots = getChildren(updated, null);
    expect(roots).toHaveLength(4);
    expect(roots[1].id).toBe(newId);
    expect(roots[1].content).toBe("");
  });
});

describe("deleteNode", () => {
  it("removes node and its children", () => {
    const nodes = makeNodes();
    const updated = deleteNode(nodes, "2");
    expect(updated).toHaveLength(2);
    expect(updated.find((n) => n.id === "2a")).toBeUndefined();
  });

  it("reorders remaining siblings", () => {
    const nodes = makeNodes();
    const updated = deleteNode(nodes, "2");
    const roots = getChildren(updated, null);
    expect(roots[0].order).toBe(0);
    expect(roots[1].order).toBe(1);
  });
});

describe("indentNode", () => {
  it("makes node a child of its previous sibling", () => {
    const nodes = makeNodes();
    const updated = indentNode(nodes, "2");
    const node2 = updated.find((n) => n.id === "2")!;
    expect(node2.parentId).toBe("1");
  });

  it("returns unchanged if node is first sibling", () => {
    const nodes = makeNodes();
    const updated = indentNode(nodes, "1");
    expect(updated).toEqual(nodes);
  });
});

describe("outdentNode", () => {
  it("moves node to parent's level after parent", () => {
    const nodes = makeNodes();
    const updated = outdentNode(nodes, "2a");
    const node2a = updated.find((n) => n.id === "2a")!;
    expect(node2a.parentId).toBe(null);
  });

  it("returns unchanged if node is at root", () => {
    const nodes = makeNodes();
    const updated = outdentNode(nodes, "1");
    expect(updated).toEqual(nodes);
  });
});

describe("moveNodeUp", () => {
  it("swaps order with previous sibling", () => {
    const nodes = makeNodes();
    const updated = moveNodeUp(nodes, "2");
    const roots = getChildren(updated, null);
    expect(roots[0].id).toBe("2");
    expect(roots[1].id).toBe("1");
  });

  it("returns unchanged if already first", () => {
    const nodes = makeNodes();
    const updated = moveNodeUp(nodes, "1");
    expect(getChildren(updated, null).map((n) => n.id)).toEqual(["1", "2", "3"]);
  });
});

describe("moveNodeDown", () => {
  it("swaps order with next sibling", () => {
    const nodes = makeNodes();
    const updated = moveNodeDown(nodes, "2");
    const roots = getChildren(updated, null);
    expect(roots[1].id).toBe("3");
    expect(roots[2].id).toBe("2");
  });
});

describe("toggleCollapse", () => {
  it("toggles collapsed state", () => {
    const nodes = makeNodes();
    const updated = toggleCollapse(nodes, "2");
    expect(updated.find((n) => n.id === "2")!.collapsed).toBe(true);
    const again = toggleCollapse(updated, "2");
    expect(again.find((n) => n.id === "2")!.collapsed).toBe(false);
  });
});
