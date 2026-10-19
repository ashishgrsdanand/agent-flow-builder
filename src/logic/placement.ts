import type { AgentNode, NodeType } from '../types';
import { CANVAS_H, CANVAS_W, NODE_H, NODE_W } from './constants';

/** Same spacing a ready-made team uses, so hand-built teams look the same. */
const STEP = NODE_H + 28;
const MARGIN = 12;

/**
 * Where to put a new agent that was added by clicking.
 * Agents line up in a column to the right of the Supervisor, each one below the last.
 * When a column is full the next one starts to its right. `base` is the top-left of what you can see.
 */
export function findFreeSpot(nodes: AgentNode[], type: NodeType, base: { x: number; y: number }): { x: number; y: number } {
  const sup = nodes.find((n) => n.type === 'supervisor');
  const besideSupervisor = type === 'agent' && !!sup;
  const startX = besideSupervisor && sup ? sup.x + 260 : base.x;
  const startY = besideSupervisor && sup ? sup.y : base.y;
  const maxX = CANVAS_W - NODE_W - 8;
  const maxY = CANVAS_H - NODE_H - 8;
  const free = (x: number, y: number) => nodes.every((n) => Math.abs(n.x - x) >= NODE_W + MARGIN || Math.abs(n.y - y) >= NODE_H + MARGIN);
  for (let x = startX; x <= maxX; x += NODE_W + 60) {
    for (let y = startY; y <= maxY; y += STEP) if (free(x, y)) return { x, y };
  }
  return { x: base.x, y: base.y }; // the canvas is full: let it overlap rather than fail
}
