import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { useActions } from '../../hooks/useActions';
import { useLatest } from '../../hooks/useLatest';
import { CANVAS_H, CANVAS_W, NODE_H, NODE_W } from '../../logic/constants';
import { nodeSubtitle } from '../../logic/graph';
import { useApp } from '../../state/AppContext';
import { useCanvasApi } from '../../state/CanvasApi';
import { bez, edgeGeometry } from './geometry';
import { NodeView } from './NodeView';
import { ZoomBar } from './ZoomBar';

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 1.3;
const clampZoom = (z: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
const clampX = (x: number) => Math.max(8, Math.min(CANVAS_W - NODE_W - 8, x));
const clampY = (y: number) => Math.max(8, Math.min(CANVAS_H - NODE_H - 8, y));

/** A small arrowhead for each arrow style. */
function Marker({ id, cls, size }: { id: string; cls: string; size: number }) {
  return (
    <marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth={size} markerHeight={size} orient="auto">
      <path className={cls} d="M1 1.5L9 5L1 8.5z" />
    </marker>
  );
}

/**
 * The drawing area: agents you can drag, arrows you can draw, zoom and fit.
 * Dragging only changes local state until you let go, so the code does not regenerate on every pixel.
 */
export function Canvas() {
  const { state, dispatch, simView } = useApp();
  const actions = useActions();
  const actionsRef = useLatest(actions);
  const stateRef = useLatest(state);
  const apiRef = useCanvasApi();

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const zoomRef = useLatest(zoom);
  const [dropHot, setDropHot] = useState(false);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);
  const [tempPath, setTempPath] = useState('');
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [fitStamp, setFitStamp] = useState(0);
  const pendingScroll = useRef<{ x: number; y: number } | null>(null);

  /** screen position -> canvas position */
  const toCanvas = useCallback((clientX: number, clientY: number) => {
    const el = canvasRef.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    const s = r.width / CANVAS_W;
    return { x: (clientX - r.left) / s, y: (clientY - r.top) / s };
  }, []);

  /* ---------- zoom and fit ---------- */
  const fit = useCallback(() => {
    const wrap = wrapRef.current;
    const nodes = stateRef.current.nodes;
    if (!wrap) return;
    if (!nodes.length) {
      pendingScroll.current = { x: 0, y: 0 };
      setZoom(1);
      setFitStamp((n) => n + 1);
      return;
    }
    const xs = nodes.map((n) => n.x);
    const ys = nodes.map((n) => n.y);
    const x0 = Math.min(...xs) - 30, x1 = Math.max(...xs) + NODE_W + 30;
    const y0 = Math.min(...ys) - 30, y1 = Math.max(...ys) + NODE_H + 30;
    const z = clampZoom(Math.min(1, wrap.clientWidth / (x1 - x0), wrap.clientHeight / (y1 - y0)));
    pendingScroll.current = { x: Math.max(0, x0 * z), y: Math.max(0, y0 * z) };
    setZoom(z);
    setFitStamp((n) => n + 1);
  }, [stateRef]);

  // Fit whenever a team is loaded, a file is opened, or the canvas is cleared.
  useEffect(() => {
    fit();
  }, [state.fitTick, fit]);
  // Scroll only after the new zoom has been applied to the page.
  useLayoutEffect(() => {
    const p = pendingScroll.current;
    if (p && wrapRef.current) {
      wrapRef.current.scrollTo(p.x, p.y);
      pendingScroll.current = null;
    }
  }, [fitStamp, zoom]);

  /* ---------- what the palette may ask of the canvas ---------- */
  useEffect(() => {
    apiRef.current = {
      toCanvas,
      contains: (cx, cy) => {
        const w = wrapRef.current;
        if (!w) return false;
        const r = w.getBoundingClientRect();
        return cx > r.left && cx < r.right && cy > r.top && cy < r.bottom;
      },
      spot: () => {
        const w = wrapRef.current;
        return { x: (w ? w.scrollLeft : 0) / zoomRef.current + 50, y: (w ? w.scrollTop : 0) / zoomRef.current + 50 };
      },
      setDropHot,
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, toCanvas, zoomRef]);

  /* ---------- dragging an agent ---------- */
  const startDrag = (ev: PointerEvent, id: string) => {
    const n = stateRef.current.nodes.find((x) => x.id === id);
    if (!n) return;
    const c0 = toCanvas(ev.clientX, ev.clientY);
    const ox = c0.x - n.x, oy = c0.y - n.y;
    const sx = ev.clientX, sy = ev.clientY;
    let moved = false;
    let last: { x: number; y: number } | null = null;
    dispatch({ type: 'select', sel: { k: 'node', id } });
    const move = (e: PointerEvent) => {
      if (!moved && Math.hypot(e.clientX - sx, e.clientY - sy) < 4) return;
      moved = true;
      const c = toCanvas(e.clientX, e.clientY);
      last = { x: clampX(c.x - ox), y: clampY(c.y - oy) };
      setDrag({ id, ...last });
    };
    const up = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', up);
      if (last) dispatch({ type: 'move-node', id, x: last.x, y: last.y });
      setDrag(null);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
  };

  /* ---------- drawing an arrow from an agent's right dot ---------- */
  const startConnect = (ev: PointerEvent, fromId: string) => {
    const a = stateRef.current.nodes.find((x) => x.id === fromId);
    if (!a) return;
    const x1 = a.x + NODE_W, y1 = a.y + NODE_H / 2;
    const hover = (e: PointerEvent): string | null => {
      const t = document.elementFromPoint(e.clientX, e.clientY);
      const el = t && t.closest ? t.closest<HTMLElement>('.node') : null;
      return el && el.dataset.id && el.dataset.id !== fromId ? el.dataset.id : null;
    };
    const move = (e: PointerEvent) => {
      const c = toCanvas(e.clientX, e.clientY);
      setTempPath(bez(x1, y1, c.x, c.y));
      setDropTarget(hover(e));
    };
    const up = (e: PointerEvent) => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', up);
      setTempPath('');
      setDropTarget(null);
      const target = hover(e);
      if (target) actionsRef.current.connect(fromId, target);
    };
    move(ev);
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
  };

  /* ---------- events on the canvas ---------- */
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const t = e.target as Element;
    const port = t.closest('.port.out');
    const nodeEl = t.closest<HTMLElement>('.node');
    const edgeEl = t.closest<SVGGElement>('.edge');
    const labEl = t.closest<SVGGElement>('.lab');
    if (port && nodeEl && nodeEl.dataset.id) {
      e.preventDefault();
      startConnect(e.nativeEvent, nodeEl.dataset.id);
    } else if (nodeEl && nodeEl.dataset.id) {
      e.preventDefault();
      startDrag(e.nativeEvent, nodeEl.dataset.id);
    } else if (edgeEl && edgeEl.dataset.id) {
      dispatch({ type: 'select', sel: { k: 'edge', id: edgeEl.dataset.id } });
    } else if (labEl && labEl.dataset.id) {
      dispatch({ type: 'select', sel: { k: 'edge', id: labEl.dataset.id } });
    } else {
      dispatch({ type: 'select', sel: null });
    }
  };
  const onDoubleClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    const t = e.target as Element;
    const nodeEl = t.closest<HTMLElement>('.node');
    if (nodeEl && nodeEl.dataset.id) {
      dispatch({ type: 'edit', sel: { k: 'node', id: nodeEl.dataset.id }, field: 'name' });
      return;
    }
    const g = t.closest<SVGGElement>('.edge, .lab');
    if (g && g.dataset.id) dispatch({ type: 'edit', sel: { k: 'edge', id: g.dataset.id }, field: 'when' });
  };

  /* ---------- what to draw ---------- */
  const pos = (n: { id: string; x: number; y: number }) => (drag && drag.id === n.id ? { x: drag.x, y: drag.y } : { x: n.x, y: n.y });
  const geoms = edgeGeometry(state.nodes, state.edges, pos, state.sel, simView);
  const labelled = geoms.filter((g) => g.label);

  return (
    <section className="stage">
      <div className={'canvas-wrap' + (dropHot ? ' drop-hot' : '')} id="wrap" ref={wrapRef} style={{ '--z': zoom } as CSSProperties}>
        <div className="zoomwrap" id="zoomwrap">
          <div className="canvas" id="canvas" ref={canvasRef} onPointerDown={onPointerDown} onDoubleClick={onDoubleClick}>
            <svg id="edges">
              <defs>
                <Marker id="arr-route" cls="mk-route" size={7} />
                <Marker id="arr-handoff" cls="mk-handoff" size={6.5} />
                <Marker id="arr-live" cls="mk-live" size={6.5} />
                <Marker id="arr-cond" cls="mk-cond" size={6.5} />
              </defs>
              <g id="edgeLayer">
                {geoms.map((g) => (
                  <g key={g.id} className={['edge', g.kind, g.sel ? 'sel' : '', g.walked ? 'walked' : '', g.now ? 'now' : ''].filter(Boolean).join(' ')} data-id={g.id}>
                    <path className="hit" d={g.d} />
                    <path className="vis" d={g.d} markerEnd={`url(#arr-${g.walked || g.now ? 'live' : g.kind})`} />
                  </g>
                ))}
              </g>
            </svg>

            <div id="nodes">
              {state.nodes.map((n) => {
                const p = pos(n);
                const live = simView && simView.cur === n.id && !simView.done ? 'active' : simView && simView.visited.includes(n.id) ? 'seen' : '';
                return (
                  <NodeView
                    key={n.id}
                    node={n}
                    x={p.x}
                    y={p.y}
                    subtitle={nodeSubtitle(n, state.nodes, state.edges)}
                    selected={!!state.sel && state.sel.k === 'node' && state.sel.id === n.id}
                    live={live}
                    dragging={!!drag && drag.id === n.id}
                    dropTarget={dropTarget === n.id}
                  />
                );
              })}
            </div>

            <svg id="labels">
              <g id="labelLayer">
                {labelled.map((g) => {
                  const l = g.label!;
                  return (
                    <g key={g.id} className={['lab', g.kind === 'cond' ? 'cond' : '', g.sel ? 'sel' : '', g.walked ? 'walked' : ''].filter(Boolean).join(' ')} data-id={g.id}>
                      <title>{l.text}</title>
                      <rect x={l.x - l.w / 2} y={l.y - 10} width={l.w} height={20} rx={10} />
                      <text x={l.x} y={l.y + 4} textAnchor="middle">
                        {l.short}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>

            <svg id="temp">
              <path id="tempPath" d={tempPath} />
            </svg>

            {state.nodes.length === 0 && (
              <div className="empty" id="empty">
                <b>Your canvas is empty</b>
                Choose a domain on the left and press Load full team, or drag agents here one by one.
              </div>
            )}
          </div>
        </div>
      </div>
      <ZoomBar zoom={zoom} onZoomIn={() => setZoom((z) => clampZoom(z + 0.1))} onZoomOut={() => setZoom((z) => clampZoom(z - 0.1))} onFit={fit} />
    </section>
  );
}
