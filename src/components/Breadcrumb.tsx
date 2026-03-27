import { observer } from "mobx-react-lite";
import type { OutlineStore } from "../models/OutlineStore";
import { TStore } from "../models/OutlineStore";

interface Props {
  store: OutlineStore;
}

const Breadcrumb = observer(function Breadcrumb({ store }: Props) {
  const items = TStore.getBreadcrumbs(store);

  return (
    <div className="flex items-center gap-2 px-8 py-3.5 border-b border-[var(--border-color)]">
      {items.map((item: { id: string | null; label: string }, i: number) => (
        <span key={item.id ?? "home"} className="flex items-center gap-2">
          {i > 0 && (
            <span className="text-[var(--line-color)] text-sm">&rsaquo;</span>
          )}
          {i < items.length - 1 ? (
            <button
              onClick={() => TStore.zoom(store, item.id)}
              className="text-[var(--text-muted)] text-sm hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
            >
              {item.label}
            </button>
          ) : (
            <span className="text-[var(--text-dim)] text-sm">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </div>
  );
});

export default Breadcrumb;
