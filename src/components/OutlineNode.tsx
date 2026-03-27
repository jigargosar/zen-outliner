import { useRef, useEffect, type KeyboardEvent } from "react";
import { observer } from "mobx-react-lite";
import type { OutlineItem, OutlineStore } from "../models/OutlineStore";
import { TStore } from "../models/OutlineStore";

interface Props {
  item: OutlineItem;
  store: OutlineStore;
  focusId: string | null;
  onFocused: () => void;
  onRequestFocus: (id: string) => void;
}

const OutlineNode = observer(function OutlineNode({
  item,
  store,
  focusId,
  onFocused,
  onRequestFocus,
}: Props) {
  const inputRef = useRef<HTMLDivElement>(null);
  const children = TStore.getChildren(store, item.id);
  const hasChildren = children.length > 0;
  const isCollapsed = TStore.isCollapsed(store, item.id) && hasChildren;

  useEffect(() => {
    if (focusId === item.id && inputRef.current) {
      inputRef.current.focus();
      const range = document.createRange();
      const sel = window.getSelection();
      if (inputRef.current.childNodes.length > 0) {
        range.selectNodeContents(inputRef.current);
        range.collapse(false);
      }
      sel?.removeAllRanges();
      sel?.addRange(range);
      onFocused();
    }
  }, [focusId, item.id, onFocused]);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const newId = TStore.addAfter(store, item.id);
      if (newId) onRequestFocus(newId);
    } else if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      TStore.indentItem(store, item.id);
      onRequestFocus(item.id);
    } else if (e.key === "Tab" && e.shiftKey) {
      e.preventDefault();
      TStore.outdentItem(store, item.id);
      onRequestFocus(item.id);
    } else if (e.key === "Backspace" && item.content === "") {
      e.preventDefault();
      const siblings = TStore.getChildren(store, item.parentId) as OutlineItem[];
      const idx = siblings.findIndex((s: OutlineItem) => s.id === item.id);
      const focusTarget = idx > 0 ? siblings[idx - 1].id : item.parentId;
      TStore.removeItem(store, item.id);
      if (focusTarget) onRequestFocus(focusTarget);
    } else if (e.key === "ArrowUp" && e.ctrlKey) {
      e.preventDefault();
      TStore.moveItemUp(store, item.id);
      onRequestFocus(item.id);
    } else if (e.key === "ArrowDown" && e.ctrlKey) {
      e.preventDefault();
      TStore.moveItemDown(store, item.id);
      onRequestFocus(item.id);
    } else if (e.key === "ArrowUp" && !e.ctrlKey) {
      e.preventDefault();
      const all = document.querySelectorAll<HTMLDivElement>("[contenteditable]");
      const arr = Array.from(all);
      const idx = arr.indexOf(inputRef.current!);
      if (idx > 0) arr[idx - 1].focus();
    } else if (e.key === "ArrowDown" && !e.ctrlKey) {
      e.preventDefault();
      const all = document.querySelectorAll<HTMLDivElement>("[contenteditable]");
      const arr = Array.from(all);
      const idx = arr.indexOf(inputRef.current!);
      if (idx < arr.length - 1) arr[idx + 1].focus();
    }
  };

  const handleInput = () => {
    if (inputRef.current) {
      TStore.setContent(store, item.id, inputRef.current.textContent || "");
    }
  };

  const handleBulletClick = () => {
    if (hasChildren) TStore.zoom(store, item.id);
  };

  const handleTriangleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) TStore.toggleCollapse(store, item.id);
  };

  return (
    <div>
      <div className="group flex items-center py-1.5 relative">
        {hasChildren && (
          <button
            onClick={handleTriangleClick}
            className="absolute -left-5 w-5 h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text-muted)] text-[8px] cursor-pointer"
          >
            {isCollapsed ? "\u25BA" : "\u25BC"}
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

        <div
          ref={inputRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          data-placeholder="Start typing..."
          className="flex-1 ml-2.5 text-base leading-relaxed outline-none text-[var(--text-secondary)] empty:before:content-[attr(data-placeholder)] empty:before:text-[var(--text-muted)] empty:before:italic"
        >
          {item.content}
        </div>
      </div>

      {hasChildren && !isCollapsed && (
        <div className="ml-[11px] pl-[21px] relative before:content-[''] before:absolute before:left-[11px] before:top-0 before:bottom-3 before:w-px before:bg-[var(--line-color)]">
          {children.map((child: OutlineItem) => (
            <OutlineNode
              key={child.id}
              item={child}
              store={store}
              focusId={focusId}
              onFocused={onFocused}
              onRequestFocus={onRequestFocus}
            />
          ))}
        </div>
      )}
    </div>
  );
});

export default OutlineNode;
