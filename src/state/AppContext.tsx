import { createContext, useContext, useEffect, useMemo, useReducer, useRef, type Dispatch, type ReactNode } from 'react';
import { generate } from '../logic/generate';
import { tokenizeCode, type Token } from '../logic/highlight';
import { simAuto, simCompute } from '../logic/simulate';
import type { GenResult, SimState } from '../types';
import { initialState, reducer, type Action, type AppState } from './reducer';
import { planSignature } from './selectors';
import { useToast } from './ToastContext';

interface AppValue {
  state: AppState;
  dispatch: Dispatch<Action>;
  /** the generated code, line map and plan for the current graph */
  gen: GenResult;
  /** the generated code split into highlighted tokens, one list per line */
  tokens: Token[][];
  /** where the running simulation currently is (null when none is running) */
  simView: SimState | null;
}

const AppContext = createContext<AppValue | null>(null);

export function AppProvider({ children, initial }: { children: ReactNode; initial?: AppState }) {
  const [state, dispatch] = useReducer(reducer, initial, (i) => i ?? initialState());
  const toast = useToast();

  // Regenerate the code only when the graph's content changes, not when an agent is merely dragged.
  const contentKey = useMemo(
    () => JSON.stringify([state.nodes.map(({ x: _x, y: _y, ...rest }) => rest), state.edges]),
    [state.nodes, state.edges],
  );
  const gen = useMemo(
    () => generate({ nodes: state.nodes, edges: state.edges }, { provider: state.provider, models: state.models, explain: state.explain }),
    // keyed on the content, not on `state.nodes`, so merely dragging an agent does not regenerate the code
    [contentKey, state.provider, state.models, state.explain],
  );
  const tokens = useMemo(() => tokenizeCode(gen.code), [gen.code]);
  const simView = useMemo(() => (state.sim && gen.plan ? simCompute(gen.plan, state.sim.request, state.sim.actions) : null), [state.sim, gen.plan]);

  // If the learner edits the graph during a simulation, the simulation no longer matches it: reset.
  const sig = useMemo(() => planSignature(gen.plan), [gen.plan]);
  useEffect(() => {
    if (state.sim && state.sim.sig !== sig) {
      dispatch({ type: 'sim-reset' });
      toast('The graph changed, so the simulation was reset.');
    }
  }, [sig, state.sim, toast]);

  // Auto-play: take one step every second until the run is finished.
  const simRef = useRef<SimState | null>(simView);
  useEffect(() => {
    simRef.current = simView;
  }, [simView]);
  useEffect(() => {
    if (state.simPlaying && (!simView || simView.done)) dispatch({ type: 'sim-play', on: false });
  }, [state.simPlaying, simView]);
  useEffect(() => {
    if (!state.simPlaying) return;
    const id = setInterval(() => {
      const v = simRef.current;
      if (!v || v.done) return dispatch({ type: 'sim-play', on: false });
      const action = simAuto(v);
      if (action) dispatch({ type: 'sim-act', action });
    }, 1000);
    return () => clearInterval(id);
  }, [state.simPlaying]);

  // Remind the learner once how to edit (shown the first time they click an agent on the Code tab).
  useEffect(() => {
    if (state.tipShown) toast('Tip: double-click an agent or arrow to edit it.');
  }, [state.tipShown, toast]);

  const value = useMemo(() => ({ state, dispatch, gen, tokens, simView }), [state, gen, tokens, simView]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppValue {
  const v = useContext(AppContext);
  if (!v) throw new Error('useApp must be used inside <AppProvider>');
  return v;
}
