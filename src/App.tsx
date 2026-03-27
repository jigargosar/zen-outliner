import { useState, useCallback, useEffect } from "react";
import { observer } from "mobx-react-lite";
import { loadOrCreateStore, startAutoSave } from "./lib/persistence";
import { TOutlineStore } from "./models/OutlineStore";
import OutlineTree from "./components/OutlineTree";

const store = loadOrCreateStore();
startAutoSave(store);

const App = observer(function App() {
  const [selectedId, setSelectedId] = useState<string | null>(store.items[0]?.id ?? null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSelect = useCallback((id: string) => setSelectedId(id), []);
  const handleStartEditing = useCallback((id: string) => {
    setSelectedId(id);
    setEditingId(id);
  }, []);
  const handleStopEditing = useCallback(() => setEditingId(null), []);
  const handleRequestFocus = useCallback((id: string, _cursorPos?: number) => {
    setSelectedId(id);
    setEditingId(id);
  }, []);

  // Selected state keyboard handler (when not editing)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingId) return;
      if (!selectedId) return;

      const visible = TOutlineStore.getVisibleNodes(store);
      const idx = visible.findIndex((n) => n.id === selectedId);

      switch (e.key) {
        case "ArrowUp":
        case "k":
          e.preventDefault();
          if (idx > 0) setSelectedId(visible[idx - 1].id);
          break;
        case "ArrowDown":
        case "j":
          e.preventDefault();
          if (idx < visible.length - 1) setSelectedId(visible[idx + 1].id);
          break;
        case "i":
        case "Enter":
          e.preventDefault();
          handleStartEditing(selectedId);
          break;
        case "Tab":
          e.preventDefault();
          if (e.shiftKey) {
            TOutlineStore.outdentItem(store, selectedId);
          } else {
            TOutlineStore.indentItem(store, selectedId);
          }
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (TOutlineStore.hasChildren(store, selectedId) && !TOutlineStore.isCollapsed(store, selectedId)) {
            TOutlineStore.toggleCollapse(store, selectedId);
          }
          break;
        case "ArrowRight":
          e.preventDefault();
          if (TOutlineStore.hasChildren(store, selectedId) && TOutlineStore.isCollapsed(store, selectedId)) {
            TOutlineStore.toggleCollapse(store, selectedId);
          }
          break;
        case "Backspace":
        case "Delete":
          if (e.ctrlKey && e.shiftKey) {
            e.preventDefault();
            if (TOutlineStore.canDelete(store, selectedId)) {
              const focusTarget = TOutlineStore.removeItem(store, selectedId);
              if (focusTarget) setSelectedId(focusTarget);
            }
          }
          break;
      }

      if (e.altKey && e.shiftKey) {
        if (e.key === "ArrowUp") {
          e.preventDefault();
          TOutlineStore.moveItemUp(store, selectedId);
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          TOutlineStore.moveItemDown(store, selectedId);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, editingId, handleStartEditing]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg-primary)" }}>
      <div className="max-w-[700px] mx-auto px-8 pl-[52px] pt-12 pb-12">
        <OutlineTree
          store={store}
          selectedId={selectedId}
          editingId={editingId}
          onSelect={handleSelect}
          onStartEditing={handleStartEditing}
          onStopEditing={handleStopEditing}
          onRequestFocus={handleRequestFocus}
        />
      </div>
    </div>
  );
});

export default App;
