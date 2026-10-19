import { useState, type PointerEvent as ReactPointerEvent } from 'react';
import { DOMAINS } from '../../data/domains';
import { useActions } from '../../hooks/useActions';
import { useLatest } from '../../hooks/useLatest';
import { NODE_H, NODE_W } from '../../logic/constants';
import { customAgentOpts, customTeam, domItems, itemOpts, teamPhrase } from '../../logic/graph';
import { useApp } from '../../state/AppContext';
import { useCanvasApi } from '../../state/CanvasApi';
import type { MyAgent, NodeOpts, NodeType } from '../../types';
import { CustomAgents } from './CustomAgents';
import { Legend } from './Legend';
import { LoadTeamButton } from './LoadTeamButton';
import { PaletteRow } from './PaletteRow';

/** What is being dragged out of the palette. */
interface DragSpec {
  type: NodeType;
  opts: NodeOpts;
  label: string;
  /** colour class for the floating label */
  cls: string;
}

/** The left panel: pick a domain, then drag (or click) agents onto the canvas. */
export function Palette() {
  const { state, dispatch } = useApp();
  const actions = useActions();
  const actionsRef = useLatest(actions);
  const canvas = useCanvasApi();
  const [ghost, setGhost] = useState<{ x: number; y: number; spec: DragSpec } | null>(null);

  const domain = DOMAINS[state.domain];
  const items = domItems(state.domain, state.overrides);

  /** Press on an agent: a short press adds it, a drag drops it where you release. */
  const startDrag = (e: ReactPointerEvent<HTMLDivElement>, spec: DragSpec) => {
    e.preventDefault();
    const sx = e.clientX, sy = e.clientY;
    let moved = false;
    const move = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 6) moved = true;
      if (moved) {
        setGhost({ x: ev.clientX, y: ev.clientY, spec });
        const api = canvas.current;
        if (api) api.setDropHot(api.contains(ev.clientX, ev.clientY));
      }
    };
    const up = (ev: PointerEvent) => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', up);
      setGhost(null);
      const api = canvas.current;
      if (api) api.setDropHot(false);
      if (!moved) {
        actionsRef.current.addNode(spec.type, null, spec.opts);
      } else if (api && api.contains(ev.clientX, ev.clientY)) {
        const c = api.toCanvas(ev.clientX, ev.clientY);
        actionsRef.current.addNode(spec.type, { x: c.x - NODE_W / 2, y: c.y - NODE_H / 2 }, spec.opts);
      }
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
  };

  const dragCustom = (e: ReactPointerEvent<HTMLDivElement>, a: MyAgent) =>
    startDrag(e, { type: 'agent', opts: customAgentOpts(a, customTeam(state.domain, state.teamName)), label: a.name, cls: 'k4' });

  return (
    <aside className="palette" id="palette">
      <h3>Domain</h3>
      <select id="domain" aria-label="Choose a domain" value={state.domain} onChange={(e) => dispatch({ type: 'set-domain', domain: e.target.value })}>
        {Object.keys(DOMAINS).map((k) => (
          <option key={k} value={k}>
            {DOMAINS[k].label}
          </option>
        ))}
      </select>
      {domain.agents.length > 0 && <LoadTeamButton />}
      <p className="sub" id="dnote">
        {domain.agents.length ? 'Drag an agent onto the canvas, or click to add. Use the pencil to rename it.' : 'Start blank: add a Supervisor, then create your own agents below.'}
      </p>

      {state.domain === 'custom' && (
        <div className="teambox">
          <label htmlFor="team-name">What is your team for?</label>
          <input id="team-name" placeholder="e.g. cooking class" maxLength={40} spellCheck={false} value={state.teamName} onChange={(e) => dispatch({ type: 'set-team-name', value: e.target.value })} />
          <p className="sub">Used in the starting instructions of the Supervisor and your agents. Fill it in before you add them.</p>
        </div>
      )}

      <div id="plist">
        {items.map((it) => {
          const cls = it.kind === 'supervisor' ? 't-supervisor' : 'k' + it.color;
          return (
            <PaletteRow
              key={it.key}
              name={it.name}
              desc={it.desc}
              cls={cls}
              onRename={(name) => dispatch({ type: 'rename-override', key: it.key, name })}
              onDragStart={(e) => startDrag(e, { type: it.kind, opts: itemOpts(state.domain, it, teamPhrase(state.domain, state.teamName)), label: it.name, cls })}
            />
          );
        })}
      </div>

      <CustomAgents onDragStart={dragCustom} />
      <Legend />

      {ghost && (
        <div className={'ghost ' + ghost.spec.cls} style={{ left: ghost.x, top: ghost.y }}>
          <span className="dot" />
          <span>{ghost.spec.label}</span>
        </div>
      )}
    </aside>
  );
}
