import { useState } from 'react';
import { DEFAULT_REQUEST } from '../../logic/constants';
import { simAuto } from '../../logic/simulate';
import type { Token } from '../../logic/highlight';
import { useApp } from '../../state/AppContext';
import { planName, planSignature } from '../../state/selectors';
import type { Marks, Range, SimAction } from '../../types';
import { Rich } from '../ui/Rich';
import { TokenLine } from '../ui/TokenLine';

/** A few lines of the generated code, with their real line numbers. */
function Snippet({ title, range, pad, cap, tokens }: { title: string; range: Range; pad: number; cap: number; tokens: Token[][] }) {
  let a = Math.max(1, range[0] - pad);
  let b = Math.min(tokens.length, range[1] + pad);
  let cut = false;
  if (b - a + 1 > cap) {
    b = a + cap - 1;
    cut = true;
  }
  const rows = [];
  for (let i = a; i <= b; i++)
    rows.push(
      <div key={i}>
        <i>{i}</i>
        <TokenLine tokens={tokens[i - 1]} />
      </div>,
    );
  return (
    <div className="snip">
      <div className="snip-t">{title}</div>
      <div className="snip-c">
        {rows}
        {cut && (
          <div>
            <i />
            &hellip;
          </div>
        )}
      </div>
    </div>
  );
}

function Snippets({ nodes, edges, marks, tokens, nameOf }: { nodes: string[]; edges: string[]; marks: Marks; tokens: Token[][]; nameOf(id: string): string }) {
  const out = [];
  for (const id of nodes) {
    const rs = marks.nodes[id];
    if (rs && rs[0]) out.push(<Snippet key={'n' + id} title={'Function that runs: ' + nameOf(id)} range={rs[0]} pad={0} cap={40} tokens={tokens} />);
  }
  for (const k of edges) {
    const rs = marks.edges[k];
    if (rs && rs.length) out.push(<Snippet key={'e' + k} title="The edge followed" range={rs[rs.length - 1]} pad={2} cap={12} tokens={tokens} />);
  }
  return out.length ? <>{out}</> : <p className="muted">No code lines belong to this step.</p>;
}

/** Step-by-step replay of a run. You play the model and choose what it would answer. */
export function SimulateTab() {
  const { state, dispatch, gen, simView, tokens } = useApp();
  const [request, setRequest] = useState(DEFAULT_REQUEST);
  const plan = gen.plan;

  if (!plan || (!plan.sup && !Object.keys(plan.workers).length)) {
    return (
      <>
        <div className="p-title" style={{ marginBottom: 8 }}>
          Watch your graph run
        </div>
        <p className="sim-text">Add some agents to the canvas first (or load an example from the Learn tab), then come back here.</p>
      </>
    );
  }

  const start = (req: string) => dispatch({ type: 'sim-start', request: req, sig: planSignature(plan) });

  if (!state.sim || !simView) {
    return (
      <>
        <div className="p-title" style={{ marginBottom: 8 }}>
          Watch your graph run
        </div>
        <p className="sim-text">
          This replays exactly what LangGraph would do with your graph, one step at a time. No API key is needed: <b>you play the model</b> and choose what it would answer at each decision.
        </p>
        <label className="f">
          Your request
          <input
            id="sim-req"
            maxLength={200}
            spellCheck={false}
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') start(request.trim() || DEFAULT_REQUEST);
            }}
          />
        </label>
        <button className="btn primary" id="sim-start" onClick={() => start(request.trim() || DEFAULT_REQUEST)}>
          Start simulation
        </button>
        <p className="muted" style={{ marginTop: 14 }}>
          Watch the canvas while you step. The active agent glows green, and the arrows already used turn solid green.
        </p>
      </>
    );
  }

  const v = simView;
  const p = v.pending;
  const nm = (id: string) => planName(plan, id);
  const act = (action: SimAction) => dispatch({ type: 'sim-act', action });

  return (
    <>
      <div className="sim-head">
        <b>{v.title}</b>
        <span className="meta">
          node runs {v.runs} &middot; model calls about {v.calls}
        </span>
      </div>
      <p className="sim-text">
        <Rich text={v.text} />
      </p>

      {v.done && <div className={'sim-end' + (v.error ? ' err' : '')}>{v.error ? 'Stopped by the safety limit' : 'Run finished'}</div>}
      {!v.done && p && p.kind === 'go' && (
        <button className="btn primary" id="sim-next" onClick={() => act('next')}>
          Next: {p.to === 'END' ? 'finish the run (END)' : 'go to ' + nm(p.to)} &rarr;
        </button>
      )}
      {!v.done && p && p.kind === 'choose' && (
        <>
          <div className="sect" style={{ marginTop: 0 }}>
            {p.who === 'supervisor' ? "What does the Supervisor's model answer?" : 'Which path does the model choose?'}
          </div>
          {p.options.map((o) => (
            <button key={o.value} className="opt" onClick={() => act({ choose: o.value })}>
              <b>{o.label}</b>
              {o.hint && <small>{o.hint}</small>}
            </button>
          ))}
          <button
            className="btn mini"
            id="sim-pick"
            onClick={() => {
              const a = simAuto(v);
              if (a) act(a);
            }}
          >
            Let the simulator pick
          </button>
        </>
      )}

      <div className="sim-ctl">
        <button className="btn mini" id="sim-back" disabled={!state.sim.actions.length} onClick={() => dispatch({ type: 'sim-back' })}>
          &larr; Back
        </button>
        <button className="btn mini" id="sim-auto" disabled={v.done} onClick={() => dispatch({ type: 'sim-play', on: !state.simPlaying })}>
          {state.simPlaying ? 'Pause' : 'Auto-play'}
        </button>
        <button className="btn mini" id="sim-restart" onClick={() => start(state.sim ? state.sim.request : DEFAULT_REQUEST)}>
          Restart
        </button>
        <button className="btn mini" id="sim-reset" onClick={() => dispatch({ type: 'sim-reset' })}>
          Change request
        </button>
      </div>

      <div className="sect">Path so far</div>
      <div className="chips">
        {v.trace.flatMap((id, i) => {
          const chip = (
            <span key={'c' + i} className={'chip' + (i === v.trace.length - 1 ? ' cur' : '')}>
              {nm(id)}
            </span>
          );
          return i === 0 ? [chip] : [
            <span key={'s' + i} className="muted" style={{ margin: 0 }}>
              &rsaquo;
            </span>,
            chip,
          ];
        })}
      </div>

      <div className="sect">Shared state</div>
      {plan.sup && (
        <div className="muted">
          next = {v.next ? <code>"{v.next}"</code> : 'not set yet'}
        </div>
      )}
      {v.messages.map((m, i) => (
        <div className="msg" key={i}>
          <b>{m.role === 'human' ? 'human' : 'ai \u00b7 ' + m.name}</b>
          {m.text}
        </div>
      ))}

      <div className="sect">Code involved in this step</div>
      <Snippets nodes={v.focus.nodes} edges={v.focus.edges} marks={gen.marks} tokens={tokens} nameOf={nm} />
    </>
  );
}
