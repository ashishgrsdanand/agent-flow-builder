import { Header } from './components/layout/Header';
import { Canvas } from './components/canvas/Canvas';
import { SidePanel } from './components/panel/SidePanel';
import { Palette } from './components/palette/Palette';
import { useDeleteKey } from './hooks/useDeleteKey';
import { AppProvider, useApp } from './state/AppContext';
import { CanvasApiProvider } from './state/CanvasApi';
import type { AppState } from './state/reducer';
import { ToastProvider } from './state/ToastContext';

function Shell() {
  const { state } = useApp();
  useDeleteKey();
  return (
    <div className="app">
      <Header />
      <main id="main" className={state.wide ? 'wide' : ''}>
        <Palette />
        <Canvas />
        <SidePanel />
      </main>
    </div>
  );
}

/** The whole app. `initial` lets tests start from a particular state. */
export default function App({ initial }: { initial?: AppState }) {
  return (
    <ToastProvider>
      <CanvasApiProvider>
        <AppProvider initial={initial}>
          <Shell />
        </AppProvider>
      </CanvasApiProvider>
    </ToastProvider>
  );
}
