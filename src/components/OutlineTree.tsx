import { observer } from "mobx-react-lite";
import type { OutlineStore } from "../models/OutlineStore";
import { TOutlineStore } from "../models/OutlineStore";
import OutlineNode from "./OutlineNode";

interface Props {
  store: OutlineStore;
  selectedId: string | null;
  editingId: string | null;
  onSelect: (id: string) => void;
  onStartEditing: (id: string) => void;
  onStopEditing: () => void;
  onRequestFocus: (id: string, cursorPos?: number) => void;
}

const OutlineTree = observer(function OutlineTree({
  store,
  selectedId,
  editingId,
  onSelect,
  onStartEditing,
  onStopEditing,
  onRequestFocus,
}: Props) {
  const roots = TOutlineStore.getChildren(store, null);

  if (roots.length === 0) {
    return (
      <p className="text-[var(--text-muted)] italic text-base">
        No items.
      </p>
    );
  }

  return (
    <div>
      {roots.map((item) => (
        <OutlineNode
          key={item.id}
          item={item}
          store={store}
          selectedId={selectedId}
          editingId={editingId}
          onSelect={onSelect}
          onStartEditing={onStartEditing}
          onStopEditing={onStopEditing}
          onRequestFocus={onRequestFocus}
        />
      ))}
    </div>
  );
});

export default OutlineTree;
