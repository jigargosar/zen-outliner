import { describe, it, expect, beforeEach } from "vitest";
import { createStore, TOutlineStore } from "./OutlineStore";
import type { OutlineStore } from "./OutlineStore";

let store: OutlineStore;

beforeEach(() => {
  store = createStore();
});

describe("createStore", () => {
  it("initializes with one empty root item", () => {
    expect(store.items.length).toBe(1);
    expect(store.items[0].content).toBe("");
    expect(store.items[0].parentId).toBe(null);
    expect(typeof store.items[0].order).toBe("string");
  });

  it("initializes with empty collapsedIds", () => {
    expect(store.collapsedIds).toEqual([]);
  });
});

describe("computed: itemsById", () => {
  it("returns map of all items by id", () => {
    const map = TOutlineStore.itemsById(store);
    expect(map.size).toBe(1);
    expect(map.get(store.items[0].id)).toBe(store.items[0]);
  });
});

describe("computed: childrenByParentId", () => {
  it("groups and sorts items by parentId", () => {
    const firstId = store.items[0].id;
    TOutlineStore.addAfter(store, firstId);
    TOutlineStore.addAfter(store, firstId);
    const map = TOutlineStore.childrenByParentId(store);
    const roots = map.get(null)!;
    expect(roots.length).toBe(3);
    for (let i = 1; i < roots.length; i++) {
      expect(roots[i].order > roots[i - 1].order).toBe(true);
    }
  });
});

describe("addAfter", () => {
  it("adds empty sibling after target", () => {
    const firstId = store.items[0].id;
    const newId = TOutlineStore.addAfter(store, firstId);
    expect(store.items.length).toBe(2);
    const map = TOutlineStore.childrenByParentId(store);
    const roots = map.get(null)!;
    expect(roots[0].id).toBe(firstId);
    expect(roots[1].id).toBe(newId);
  });

  it("inserts between target and next sibling", () => {
    const firstId = store.items[0].id;
    const secondId = TOutlineStore.addAfter(store, firstId);
    const middleId = TOutlineStore.addAfter(store, firstId);
    const roots = TOutlineStore.childrenByParentId(store).get(null)!;
    expect(roots[0].id).toBe(firstId);
    expect(roots[1].id).toBe(middleId);
    expect(roots[2].id).toBe(secondId);
  });
});

describe("setContent", () => {
  it("updates item content", () => {
    TOutlineStore.setContent(store, store.items[0].id, "hello");
    expect(store.items[0].content).toBe("hello");
  });
});

describe("removeItem", () => {
  it("removes item and descendants", () => {
    const firstId = store.items[0].id;
    const childId = TOutlineStore.addAfter(store, firstId);
    TOutlineStore.indentItem(store, childId);
    TOutlineStore.removeItem(store, firstId);
    expect(store.items.length).toBe(0);
  });

  it("returns focus target (previous sibling)", () => {
    const firstId = store.items[0].id;
    const secondId = TOutlineStore.addAfter(store, firstId);
    const focusTarget = TOutlineStore.removeItem(store, secondId);
    expect(focusTarget).toBe(firstId);
  });

  it("returns parent as focus target when no previous sibling", () => {
    const firstId = store.items[0].id;
    const childId = TOutlineStore.addAfter(store, firstId);
    TOutlineStore.indentItem(store, childId);
    const focusTarget = TOutlineStore.removeItem(store, childId);
    expect(focusTarget).toBe(firstId);
  });

  it("cleans up collapsedIds for removed items", () => {
    const firstId = store.items[0].id;
    const childId = TOutlineStore.addAfter(store, firstId);
    TOutlineStore.indentItem(store, childId);
    TOutlineStore.toggleCollapse(store, firstId);
    expect(store.collapsedIds).toContain(firstId);
    TOutlineStore.removeItem(store, firstId);
    expect(store.collapsedIds).not.toContain(firstId);
  });
});

describe("indentItem", () => {
  it("makes item child of previous sibling", () => {
    const firstId = store.items[0].id;
    const secondId = TOutlineStore.addAfter(store, firstId);
    TOutlineStore.indentItem(store, secondId);
    const item = TOutlineStore.itemsById(store).get(secondId)!;
    expect(item.parentId).toBe(firstId);
  });

  it("does nothing for first sibling", () => {
    const firstId = store.items[0].id;
    TOutlineStore.indentItem(store, firstId);
    expect(store.items[0].parentId).toBe(null);
  });
});

describe("outdentItem", () => {
  it("moves item to parent's level after parent", () => {
    const firstId = store.items[0].id;
    const secondId = TOutlineStore.addAfter(store, firstId);
    TOutlineStore.indentItem(store, secondId);
    TOutlineStore.outdentItem(store, secondId);
    const item = TOutlineStore.itemsById(store).get(secondId)!;
    expect(item.parentId).toBe(null);
  });

  it("does nothing for root items", () => {
    TOutlineStore.outdentItem(store, store.items[0].id);
    expect(store.items[0].parentId).toBe(null);
  });
});

describe("moveItemUp", () => {
  it("moves item before previous sibling", () => {
    const firstId = store.items[0].id;
    const secondId = TOutlineStore.addAfter(store, firstId);
    TOutlineStore.moveItemUp(store, secondId);
    const roots = TOutlineStore.childrenByParentId(store).get(null)!;
    expect(roots[0].id).toBe(secondId);
    expect(roots[1].id).toBe(firstId);
  });

  it("does nothing for first sibling", () => {
    const firstId = store.items[0].id;
    TOutlineStore.addAfter(store, firstId);
    TOutlineStore.moveItemUp(store, firstId);
    const roots = TOutlineStore.childrenByParentId(store).get(null)!;
    expect(roots[0].id).toBe(firstId);
  });
});

describe("moveItemDown", () => {
  it("moves item after next sibling", () => {
    const firstId = store.items[0].id;
    const secondId = TOutlineStore.addAfter(store, firstId);
    TOutlineStore.moveItemDown(store, firstId);
    const roots = TOutlineStore.childrenByParentId(store).get(null)!;
    expect(roots[0].id).toBe(secondId);
    expect(roots[1].id).toBe(firstId);
  });
});

describe("toggleCollapse", () => {
  it("adds id to collapsedIds", () => {
    const id = store.items[0].id;
    TOutlineStore.toggleCollapse(store, id);
    expect(store.collapsedIds).toContain(id);
  });

  it("removes id on second toggle", () => {
    const id = store.items[0].id;
    TOutlineStore.toggleCollapse(store, id);
    TOutlineStore.toggleCollapse(store, id);
    expect(store.collapsedIds).not.toContain(id);
  });
});

describe("isCollapsed", () => {
  it("returns collapse state", () => {
    const id = store.items[0].id;
    expect(TOutlineStore.isCollapsed(store, id)).toBe(false);
    TOutlineStore.toggleCollapse(store, id);
    expect(TOutlineStore.isCollapsed(store, id)).toBe(true);
  });
});

describe("splitNode", () => {
  it("splits content at cursor position", () => {
    const id = store.items[0].id;
    TOutlineStore.setContent(store, id, "hello world");
    const newId = TOutlineStore.splitNode(store, id, 5);
    const original = TOutlineStore.itemsById(store).get(id)!;
    const newItem = TOutlineStore.itemsById(store).get(newId)!;
    expect(original.content).toBe("hello");
    expect(newItem.content).toBe(" world");
    expect(newItem.parentId).toBe(original.parentId);
  });
});

describe("mergeWithPrevious", () => {
  it("merges content into previous sibling", () => {
    const firstId = store.items[0].id;
    TOutlineStore.setContent(store, firstId, "hello");
    const secondId = TOutlineStore.addAfter(store, firstId);
    TOutlineStore.setContent(store, secondId, " world");
    const result = TOutlineStore.mergeWithPrevious(store, secondId);
    expect(result).toEqual({ targetId: firstId, cursorPos: 5 });
    expect(store.items.length).toBe(1);
    expect(store.items[0].content).toBe("hello world");
  });

  it("returns null for first sibling (no previous)", () => {
    const result = TOutlineStore.mergeWithPrevious(store, store.items[0].id);
    expect(result).toBe(null);
  });
});

describe("getVisibleNodes", () => {
  it("returns root items when nothing collapsed", () => {
    const firstId = store.items[0].id;
    TOutlineStore.addAfter(store, firstId);
    const visible = TOutlineStore.getVisibleNodes(store);
    expect(visible.length).toBe(2);
  });

  it("hides children of collapsed nodes", () => {
    const firstId = store.items[0].id;
    const childId = TOutlineStore.addAfter(store, firstId);
    TOutlineStore.indentItem(store, childId);
    TOutlineStore.toggleCollapse(store, firstId);
    const visible = TOutlineStore.getVisibleNodes(store);
    expect(visible.length).toBe(1);
    expect(visible[0].id).toBe(firstId);
  });
});

describe("canDelete", () => {
  it("returns false for last remaining item", () => {
    expect(TOutlineStore.canDelete(store, store.items[0].id)).toBe(false);
  });

  it("returns true when more than one item", () => {
    const firstId = store.items[0].id;
    TOutlineStore.addAfter(store, firstId);
    expect(TOutlineStore.canDelete(store, firstId)).toBe(true);
  });
});
