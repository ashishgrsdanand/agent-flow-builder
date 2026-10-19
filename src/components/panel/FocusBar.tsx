import { SECTION_INFO } from '../../data/learn';
import { displayName } from '../../logic/helpers';
import { useApp } from '../../state/AppContext';
import type { Range } from '../../types';

/** The strip above the code that says what is highlighted and offers a way to edit it. */
export function FocusBar({ ranges }: { ranges: Range[] }) {
  const { state, dispatch } = useApp();
  const { sel, hl } = state;
  const nameOf = (id: string) => {
    const n = state.nodes.find((x) => x.id === id);
    return n ? displayName(n) : '';
  };
  const edit = (label: string) => (
    <button className="btn mini" onClick={() => dispatch({ type: 'set-tab', tab: 'agent' })}>
      {label}
    </button>
  );

  let content;
  if (hl.type === 'section') {
    const info = SECTION_INFO[hl.key];
    content = (
      <>
        Showing the <b>{info ? info.title : hl.key}</b> part of the code.{' '}
        <button className="btn mini" onClick={() => dispatch({ type: 'clear-hl' })}>
          Clear
        </button>
      </>
    );
  } else if (!sel) {
    content = 'Tip: click an agent or an arrow on the canvas to jump to the code that creates it. Double-click to edit it.';
  } else if (sel.k === 'node') {
    content = (
      <>
        {ranges.length ? (
          <>
            Highlighted: the code for <b>{nameOf(sel.id)}</b>.
          </>
        ) : (
          <>
            <b>{nameOf(sel.id)}</b> is not in the code yet. Connect it to the Supervisor with an arrow.
          </>
        )}{' '}
        {edit('Edit agent')}
      </>
    );
  } else {
    const e = state.edges.find((x) => x.id === sel.id);
    content = e ? (
      <>
        Highlighted: the code for the arrow{' '}
        <b>
          {nameOf(e.from)} to {nameOf(e.to)}
        </b>
        . {edit('Edit condition')}
      </>
    ) : null;
  }
  return <div id="focusbar">{content}</div>;
}
