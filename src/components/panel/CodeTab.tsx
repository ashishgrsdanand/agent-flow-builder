import { useMemo } from 'react';
import { PROVIDERS, PROVIDER_KEYS } from '../../data/providers';
import { useActions } from '../../hooks/useActions';
import { useApp } from '../../state/AppContext';
import { highlightRanges } from '../../state/selectors';
import { useToast } from '../../state/ToastContext';
import type { ProviderKey } from '../../types';
import { CodeView } from './CodeView';
import { FocusBar } from './FocusBar';

/** The generated Python, with provider and model settings, a comments switch and click-to-see-code highlighting. */
export function CodeTab() {
  const { state, dispatch, gen, tokens } = useApp();
  const actions = useActions();
  const toast = useToast();
  const ranges = useMemo(() => highlightRanges(state.hl, state.sel, gen.marks), [state.hl, state.sel, gen.marks]);

  return (
    <>
      <div className="ctools">
        <label>
          Provider{' '}
          <select
            id="provider"
            aria-label="LLM provider"
            value={state.provider}
            onChange={(e) => {
              const provider = e.target.value as ProviderKey;
              dispatch({ type: 'set-provider', provider });
              toast('Code now targets ' + PROVIDERS[provider].label + '. Check the model name.');
            }}
          >
            {PROVIDER_KEYS.map((k) => (
              <option key={k} value={k}>
                {PROVIDERS[k].label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Model{' '}
          <input id="model" spellCheck={false} value={state.models[state.provider]} placeholder={PROVIDERS[state.provider].model} onChange={(e) => dispatch({ type: 'set-model', value: e.target.value })} />
        </label>
        <span className="spacer" />
        <span className="meta" id="meta">
          {gen.meta}
        </span>
        <button className="btn mini" id="b-copy" onClick={() => void actions.copyCode()}>
          Copy
        </button>
        <button className="btn mini" id="b-dl" onClick={actions.downloadCode}>
          Download .py
        </button>
      </div>
      <div className="ctools2">
        <label className="chk">
          <input type="checkbox" id="explain" checked={state.explain} onChange={(e) => dispatch({ type: 'set-explain', value: e.target.checked })} /> Explain in comments
        </label>
        <span className="spacer" />
        <button className="btn mini" id="b-howrun" onClick={() => dispatch({ type: 'show-howto' })}>
          How do I run this?
        </button>
      </div>
      <FocusBar ranges={ranges} />
      <div id="warns">
        {gen.warnings.map((w, i) => (
          <div key={'w' + i} className="warn">
            {w}
          </div>
        ))}
        {gen.notes.map((w, i) => (
          <div key={'n' + i} className="warn note">
            {w}
          </div>
        ))}
      </div>
      <CodeView tokens={tokens} ranges={ranges} active={state.tab === 'code'} scrollTick={state.scrollTick} />
    </>
  );
}
