import { useRef, useEffect } from "react";
import { observer } from "mobx-react-lite";
import type { OutlineItem, OutlineStore } from "../models/OutlineStore";
import { TOutlineStore } from "../models/OutlineStore";

interface Props {
  item: OutlineItem;
  store: OutlineStore;
  selectedId: string | null;
  editingId: string | null;
  onSelect: (id: string) => void;
  onStartEditing: (id: string) => void;
  onStopEditing: () => void;
  onRequestFocus: (id: string, cursorPos?: number) => void;
}

const OutlineNode = observer(function OutlineNode({
  item,
  store,
  selectedId,
  editingId,
  onSelect,
  onStartEditing,
  onStopEditing,
  onRequestFocus,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const children = TOutlineStore.getChildren(store, item.id);
  const hasChildren = children.length > 0;
  const isCollapsed = TOutlineStore.isCollapsed(store, item.id);
  const isSelected = selectedId === item.id;
  const isEditing = editingId === item.id;

  // Focus and cursor positioning when entering editing state
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleRowClick = () => {
    onSelect(item.id);
    onStartEditing(item.id);
  };

  const handleBulletClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(item.id);
    if (hasChildren) {
      TOutlineStore.toggleCollapse(store, item.id);
    }
  };

  const handleTriangleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      TOutlineStore.toggleCollapse(store, item.id);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    TOutlineStore.setContent(store, item.id, e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onStopEditing();
      return;
    }

    if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      const cursorPos = inputRef.current?.selectionStart ?? item.content.length;
      if (cursorPos === item.content.length) {
        const newId = TOutlineStore.addAfter(store, item.id);
        if (newId) {
          onSelect(newId);
          onStartEditing(newId);
          onRequestFocus(newId);
        }
      } else {
        const newId = TOutlineStore.splitNode(store, item.id, cursorPos);
        if (newId) {
          onSelect(newId);
          onStartEditing(newId);
          onRequestFocus(newId);
        }
      }
      return;
    }

    if (e.key === "Backspace") {
      if (item.content === "") {
        e.preventDefault();
        if (TOutlineStore.canDelete(store, item.id)) {
          const focusTarget = TOutlineStore.removeItem(store, item.id);
          if (focusTarget) {
            onSelect(focusTarget);
            onStartEditing(focusTarget);
            onRequestFocus(focusTarget);
          }
        }
        return;
      }
      const cursorPos = inputRef.current?.selectionStart ?? 1;
      if (cursorPos === 0) {
        e.preventDefault();
        const result = TOutlineStore.mergeWithPrevious(store, item.id);
        if (result) {
          onSelect(result.targetId);
          onStartEditing(result.targetId);
          onRequestFocus(result.targetId, result.cursorPos);
        }
        return;
      }
    }

    if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      TOutlineStore.indentItem(store, item.id);
      onRequestFocus(item.id);
      return;
    }

    if (e.key === "Tab" && e.shiftKey) {
      e.preventDefault();
      TOutlineStore.outdentItem(store, item.id);
      onRequestFocus(item.id);
      return;
    }

    if (e.altKey && e.shiftKey && e.key === "ArrowUp") {
      e.preventDefault();
      TOutlineStore.moveItemUp(store, item.id);
      onRequestFocus(item.id);
      return;
    }
    if (e.altKey && e.shiftKey && e.key === "ArrowDown") {
      e.preventDefault();
      TOutlineStore.moveItemDown(store, item.id);
      onRequestFocus(item.id);
      return;
    }

    if (e.altKey && e.shiftKey && e.key === "ArrowRight") {
      e.preventDefault();
      TOutlineStore.indentItem(store, item.id);
      onRequestFocus(item.id);
      return;
    }
    if (e.altKey && e.shiftKey && e.key === "ArrowLeft") {
      e.preventDefault();
      TOutlineStore.outdentItem(store, item.id);
      onRequestFocus(item.id);
      return;
    }

    if (e.ctrlKey && e.key === "ArrowUp") {
      e.preventDefault();
      if (hasChildren) TOutlineStore.toggleCollapse(store, item.id);
      return;
    }
    if (e.ctrlKey && e.key === "ArrowDown") {
      e.preventDefault();
      if (hasChildren) TOutlineStore.toggleCollapse(store, item.id);
      return;
    }

    if (e.ctrlKey && e.shiftKey && e.key === "Backspace") {
      e.preventDefault();
      if (TOutlineStore.canDelete(store, item.id)) {
        const focusTarget = TOutlineStore.removeItem(store, item.id);
        if (focusTarget) {
          onSelect(focusTarget);
          onStartEditing(focusTarget);
          onRequestFocus(focusTarget);
        }
      }
      return;
    }

    // Arrow up at start of input → flow to previous node
    if (e.key === "ArrowUp" && !e.ctrlKey && !e.altKey) {
      const cursorPos = inputRef.current?.selectionStart ?? 1;
      if (cursorPos === 0) {
        e.preventDefault();
        const visible = TOutlineStore.getVisibleNodes(store);
        const idx = visible.findIndex((n) => n.id === item.id);
        if (idx > 0) {
          const prevId = visible[idx - 1].id;
          onSelect(prevId);
          onStartEditing(prevId);
          onRequestFocus(prevId);
        }
      }
    }

    // Arrow down at end of input → flow to next node
    if (e.key === "ArrowDown" && !e.ctrlKey && !e.altKey) {
      const cursorPos = inputRef.current?.selectionStart ?? 0;
      if (cursorPos === item.content.length) {
        e.preventDefault();
        const visible = TOutlineStore.getVisibleNodes(store);
        const idx = visible.findIndex((n) => n.id === item.id);
        if (idx < visible.length - 1) {
          const nextId = visible[idx + 1].id;
          onSelect(nextId);
          onStartEditing(nextId);
          onRequestFocus(nextId);
        }
      }
    }
  };

  return (
    <div>
      <div
        className={`group flex items-center py-1.5 relative cursor-pointer ${
          isSelected ? "bg-[var(--bg-hover)]" : ""
        }`}
        onClick={handleRowClick}
      >
        {hasChildren && (
          <button
            onClick={handleTriangleClick}
            className="absolute -left-5 w-5 h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text-muted)] text-[8px] cursor-pointer"
          >
            {isCollapsed ? "►" : "▼"}
          </button>
        )}

        <button
          onClick={handleBulletClick}
          className="w-[22px] h-[22px] flex items-center justify-center shrink-0 cursor-pointer relative z-10"
        >
          <div
            className={`rounded-full ${
              hasChildren
                ? `w-[7px] h-[7px] bg-[var(--bullet-color)] ${
                    isCollapsed
                      ? "ring-[1.5px] ring-[var(--bullet-color)] ring-offset-[3px] ring-offset-[var(--bg-primary)]"
                      : ""
                  }`
                : "w-[6px] h-[6px] bg-[var(--bullet-leaf)]"
            }`}
          />
        </button>

        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={item.content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className="flex-1 ml-2.5 text-base leading-relaxed outline-none bg-[rgba(255,255,255,0.03)] text-[var(--text-secondary)] border-none px-1 py-0"
          />
        ) : (
          <span
            className="flex-1 ml-2.5 text-base leading-relaxed text-[var(--text-secondary)]"
            onClick={handleRowClick}
          >
            {item.content || "\u00A0"}
          </span>
        )}
      </div>

      {hasChildren && !isCollapsed && (
        <div className="ml-[11px] pl-[21px] relative before:content-[''] before:absolute before:left-[11px] before:top-0 before:bottom-3 before:w-px before:bg-[var(--line-color)]">
          {children.map((child) => (
            <OutlineNode
              key={child.id}
              item={child}
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
      )}
    </div>
  );
});

export default OutlineNode;
