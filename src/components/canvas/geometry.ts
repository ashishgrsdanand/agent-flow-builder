import { isRouterNode } from '../../logic/graph';
import { NODE_H, NODE_W } from '../../logic/constants';
import type { AgentNode, Edge, Selection, SimState } from '../../types';

/** A smooth curve from (x1, y1) to (x2, y2). */
export const bez = (x1: number, y1: number, x2: number, y2: number): string => {
  const dx = Math.max(50, Math.abs(x2 - x1) / 2);
  return `M${x1} ${y1} C${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
};

export type EdgeKind = 'route' | 'handoff' | 'cond';

export interface EdgeLabel {
  text: string;
  short: string;
  x: number;
  y: number;
  w: number;
}

export interface EdgeGeom {
  id: string;
  d: string;
  kind: EdgeKind;
  sel: boolean;
  /** already followed in the running simulation */
  walked: boolean;
  /** about to be followed in the running simulation */
  now: boolean;
  label: EdgeLabel | null;
}

/** Everything needed to draw the arrows: curve, style, label and simulation state. */
export function edgeGeometry(
  nodes: AgentNode[],
  edges: Edge[],
  pos: (n: AgentNode) => { x: number; y: number },
  sel: Selection,
  simView: SimState | null,
): EdgeGeom[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const out: EdgeGeom[] = [];
  for (const e of edges) {
    const a = byId.get(e.from);
    const b = byId.get(e.to);
    if (!a || !b) continue;
    const pa = pos(a);
    const pb = pos(b);
    const x1 = pa.x + NODE_W, y1 = pa.y + NODE_H / 2, x2 = pb.x - 10, y2 = pb.y + NODE_H / 2;
    const router = a.type !== 'supervisor' && isRouterNode(nodes, edges, a.id);
    const kind: EdgeKind = a.type === 'supervisor' ? 'route' : router ? 'cond' : 'handoff';
    const walked = !!simView && simView.walked.includes(e.id);
    const now = !!simView && !simView.done && !walked && simView.focus.edges.includes(e.id);
    let text = (e.when || '').trim();
    if (!text && router) text = 'otherwise';
    let label: EdgeLabel | null = null;
    if (text) {
      const short = text.length > 26 ? text.slice(0, 25) + '\u2026' : text;
      label = { text, short, x: (x1 + x2) / 2, y: (y1 + y2) / 2, w: Math.max(46, short.length * 6.1 + 18) };
    }
    out.push({ id: e.id, d: bez(x1, y1, x2, y2), kind, sel: !!sel && sel.k === 'edge' && sel.id === e.id, walked, now, label });
  }
  return out;
}
