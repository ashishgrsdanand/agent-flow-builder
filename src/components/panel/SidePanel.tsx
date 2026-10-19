import { useEffect, useState } from 'react';
import { useApp } from '../../state/AppContext';
import type { TabName } from '../../types';
import { AgentTab } from './AgentTab';
import { CodeTab } from './CodeTab';
import { LearnTab } from './LearnTab';
import { SimulateTab } from './SimulateTab';

const TABS: { id: TabName; label: string }[] = [
  { id: 'learn', label: 'Learn' },
  { id: 'code', label: 'Code' },
  { id: 'sim', label: 'Simulate' },
  { id: 'agent', label: 'Agent' },
];

/** The right-hand panel. All four tabs stay mounted (hidden when not showing), so scroll positions are kept. */
export function SidePanel() {
  const { state, dispatch, gen } = useApp();

  // Flash the Code tab when the code changes while you are looking at another tab.
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    if (state.tab !== 'code') setPulse((p) => p + 1);
    // only the code text matters here, not which tab is open
  }, [gen.code]);

  return (
    <aside className="side">
      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id === 'code' ? 'code-' + pulse : t.id}
            className={'tab' + (state.tab === t.id ? ' on' : '') + (t.id === 'code' && pulse > 0 && state.tab !== 'code' ? ' pulse' : '')}
            id={'tab-' + t.id}
            data-tab={t.id}
            onClick={() => dispatch({ type: 'set-tab', tab: t.id })}
          >
            {t.label}
            {t.id === 'code' && gen.warnings.length > 0 && (
              <>
                {' '}
                <span className="count" id="wcount">
                  {gen.warnings.length}
                </span>
              </>
            )}
          </button>
        ))}
        <span className="spacer" />
        <button className="btn mini" id="b-wide" onClick={() => dispatch({ type: 'toggle-wide' })}>
          {state.wide ? 'Narrower' : 'Wider'}
        </button>
      </div>
      <div className="pane" id="pane-agent" hidden={state.tab !== 'agent'}>
        <AgentTab />
      </div>
      <div className="pane" id="pane-sim" hidden={state.tab !== 'sim'}>
        <SimulateTab />
      </div>
      <div className="pane" id="pane-learn" hidden={state.tab !== 'learn'}>
        <LearnTab />
      </div>
      <div className="pane codepane" id="pane-code" hidden={state.tab !== 'code'}>
        <CodeTab />
      </div>
    </aside>
  );
}
