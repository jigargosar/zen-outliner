import { node, onSnapshot } from "mobx-bonsai";
import { createStore } from "../models/OutlineStore";
import type { OutlineStore } from "../models/OutlineStore";

const STORAGE_KEY = "zen-outliner-data";
const DEBOUNCE_MS = 500;

export function loadOrCreateStore(): OutlineStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && Array.isArray(data.items) && data.items.length > 0) {
        return node(data);
      }
    }
  } catch {
    // Corrupt data — fall through to fresh store
  }
  return createStore();
}

export function startAutoSave(store: OutlineStore): () => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const dispose = onSnapshot(store, (snapshot) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    }, DEBOUNCE_MS);
  });

  return () => {
    if (timeoutId) clearTimeout(timeoutId);
    dispose();
  };
}
