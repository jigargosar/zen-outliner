import { observer } from "mobx-react-lite";
import type { OutlineItem, OutlineStore } from "../models/OutlineStore";
import { TStore } from "../models/OutlineStore";
import OutlineNode from "./OutlineNode";

interface Props {
  store: OutlineStore;
  focusId: string | null;
  onFocused: () => void;
  onRequestFocus: (id: string) => void;
}

const OutlineTree = observer(function OutlineTree({
  store,
  focusId,
  onFocused,
  onRequestFocus,
}: Props) {
  const parentId = store.zoomId;
  const items = TStore.getChildren(store, parentId);

  if (items.length === 0) {
    return (
      <p className="text-[var(--text-muted)] italic text-base">
        No items yet.
      </p>
    );
  }

  return (
    <div>
      {items.map((item: OutlineItem) => (
        <OutlineNode
          key={item.id}
          item={item}
          store={store}
          focusId={focusId}
          onFocused={onFocused}
          onRequestFocus={onRequestFocus}
        />
      ))}
    </div>
  );
});

export default OutlineTree;
