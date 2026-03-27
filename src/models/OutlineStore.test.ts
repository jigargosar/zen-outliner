import { describe, it, expect, beforeEach } from "vitest";
import { createStore, TStore } from "./OutlineStore";
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
});

describe("computed indexes", () => {
  it("itemsById returns map of id to item", () => {
    const map = TStore.itemsById(store);
    expect(map.get(store.items[0].id)).toBe(store.items[0]);
  });

  it("childrenByParentId groups items by parentId sorted by order", () => {
    const firstId = store.items[0].id;
    TStore.addAfter(store, firstId);
    TStore.addAfter(store, firstId);
    const children = TStore.childrenByParentId(store);
    const roots = children.get(null) ?? [];
    expect(roots.length).toBe(3);
    for (let i = 1; i < roots.length; i++) {
      expect(roots[i].order > roots[i - 1].order).toBe(true);
    }
  });
});

describe("addAfter", () => {
  it("adds a sibling after the target item", () => {
    const firstId = store.items[0].id;
    const newId = TStore.addAfter(store, firstId);
    expect(store.items.length).toBe(2);
    expect(typeof newId).toBe("string");
    const roots = TStore.childrenByParentId(store).get(null) ?? [];
    expect(roots[0].id).toBe(firstId);
    expect(roots[1].id).toBe(newId);
  });

  it("inserts between two items with correct order", () => {
    const firstId = store.items[0].id;
    const secondId = TStore.addAfter(store, firstId);
    const middleId = TStore.addAfter(store, firstId);
    const roots = TStore.childrenByParentId(store).get(null) ?? [];
    expect(roots.map((r) => r.id)).toEqual([firstId, middleId, secondId]);
  });
});

describe("removeItem", () => {
  it("removes an item", () => {
    const firstId = store.items[0].id;
    const secondId = TStore.addAfter(store, firstId);
    TStore.removeItem(store, secondId);
    expect(store.items.length).toBe(1);
  });

  it("removes descendants", () => {
    const firstId = store.items[0].id;
    TStore.addAfter(store, firstId);
    const secondId = (TStore.childrenByParentId(store).get(null) ?? [])[1].id;
    TStore.indentItem(store, secondId);
    TStore.removeItem(store, firstId);
    expect(store.items.length).toBe(0);
  });
});

describe("indentItem", () => {
  it("makes item a child of its previous sibling", () => {
    const firstId = store.items[0].id;
    const secondId = TStore.addAfter(store, firstId);
    TStore.indentItem(store, secondId);
    const item = TStore.itemsById(store).get(secondId)!;
    expect(item.parentId).toBe(firstId);
  });

  it("does nothing if item is first sibling", () => {
    const firstId = store.items[0].id;
    TStore.indentItem(store, firstId);
    expect(store.items[0].parentId).toBe(null);
  });
});

describe("outdentItem", () => {
  it("moves item to parent's level after parent", () => {
    const firstId = store.items[0].id;
    const secondId = TStore.addAfter(store, firstId);
    TStore.indentItem(store, secondId);
    TStore.outdentItem(store, secondId);
    const item = TStore.itemsById(store).get(secondId)!;
    expect(item.parentId).toBe(null);
    const roots = TStore.childrenByParentId(store).get(null) ?? [];
    expect(roots[1].id).toBe(secondId);
  });
});

describe("moveItemUp / moveItemDown", () => {
  it("reorders siblings", () => {
    const firstId = store.items[0].id;
    TStore.addAfter(store, firstId);
    TStore.addAfter(store, firstId);
    const roots = TStore.childrenByParentId(store).get(null) ?? [];
    const thirdId = roots[2].id;

    TStore.moveItemUp(store, thirdId);
    const newRoots = TStore.childrenByParentId(store).get(null) ?? [];
    expect(newRoots[1].id).toBe(thirdId);
  });
});

describe("toggleCollapse", () => {
  it("toggles item in collapsedIds", () => {
    const firstId = store.items[0].id;
    expect(store.collapsedIds.includes(firstId)).toBe(false);
    TStore.toggleCollapse(store, firstId);
    expect(store.collapsedIds.includes(firstId)).toBe(true);
    TStore.toggleCollapse(store, firstId);
    expect(store.collapsedIds.includes(firstId)).toBe(false);
  });
});

describe("zoom", () => {
  it("sets and clears zoomId", () => {
    const firstId = store.items[0].id;
    TStore.zoom(store, firstId);
    expect(store.zoomId).toBe(firstId);
    TStore.zoom(store, null);
    expect(store.zoomId).toBe(null);
  });
});

describe("setContent", () => {
  it("updates item content", () => {
    const firstId = store.items[0].id;
    TStore.setContent(store, firstId, "hello");
    expect(store.items[0].content).toBe("hello");
  });
});

describe("getBreadcrumbs", () => {
  it("returns Home when not zoomed", () => {
    const crumbs = TStore.getBreadcrumbs(store);
    expect(crumbs).toEqual([{ id: null, label: "Home" }]);
  });

  it("returns path when zoomed", () => {
    const firstId = store.items[0].id;
    TStore.setContent(store, firstId, "Projects");
    TStore.zoom(store, firstId);
    const crumbs = TStore.getBreadcrumbs(store);
    expect(crumbs.length).toBe(2);
    expect(crumbs[0]).toEqual({ id: null, label: "Home" });
    expect(crumbs[1]).toEqual({ id: firstId, label: "Projects" });
  });
});
