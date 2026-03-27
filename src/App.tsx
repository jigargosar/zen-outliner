import { useState, useCallback } from "react";
import { observer } from "mobx-react-lite";
import { onSnapshot } from "mobx-bonsai";
import { createStore, TStore } from "./models/OutlineStore";
import Breadcrumb from "./components/Breadcrumb";
import OutlineTree from "./components/OutlineTree";

const STORAGE_KEY = "zen-outliner-data";

const store = createStore(true);

onSnapshot(store, (snapshot) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
});

const App = observer(function App() {
  const [focusId, setFocusId] = useState<string | null>(null);
  const clearFocus = useCallback(() => setFocusId(null), []);
  const zoomTitle = TStore.getZoomTitle(store);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg-primary)" }}>
      <Breadcrumb store={store} />
      <div className="max-w-[700px] mx-auto px-8 pl-[52px] pt-12 pb-12">
        <h1 className="text-[26px] text-[var(--text-primary)] font-medium mb-10">
          {zoomTitle}
        </h1>
        <OutlineTree
          store={store}
          focusId={focusId}
          onFocused={clearFocus}
          onRequestFocus={setFocusId}
        />
      </div>
    </div>
  );
});

export default App;
