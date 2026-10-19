import { describe, expect, it } from 'vitest';
import { CANVAS_H, NODE_H, NODE_W } from '../src/logic/constants';
import { buildTeam, createNode } from '../src/logic/graph';
import { findFreeSpot } from '../src/logic/placement';
import type { AgentNode, NodeType } from '../src/types';

/** Adds agents one after another, the way clicking in the palette does. */
function addMany(types: NodeType[], base = { x: 50, y: 50 }): AgentNode[] {
  const nodes: AgentNode[] = [];
  types.forEach((t, i) => {
    const p = findFreeSpot(nodes, t, base);
    nodes.push(createNode(nodes, 'n' + (i + 1), t, p.x, p.y, { name: t + i }));
  });
  return nodes;
}
const overlap = (a: AgentNode, b: AgentNode) => Math.abs(a.x - b.x) < NODE_W && Math.abs(a.y - b.y) < NODE_H;

describe('findFreeSpot', () => {
  it('puts the first agent where you are looking', () => {
    expect(findFreeSpot([], 'supervisor', { x: 70, y: 90 })).toEqual({ x: 70, y: 90 });
  });
  it('lines agents up in a column to the right of the Supervisor', () => {
    const [sup, a, b, c] = addMany(['supervisor', 'agent', 'agent', 'agent']);
    expect(a.x).toBe(sup.x + 260);
    expect(a.y).toBe(sup.y);
    expect([b.x, c.x]).toEqual([a.x, a.x]);
    expect(b.y).toBe(a.y + NODE_H + 28);
    expect(c.y).toBe(b.y + NODE_H + 28);
  });
  it('follows the Supervisor if it has been moved', () => {
    const sup = createNode([], 'n1', 'supervisor', 500, 300, {});
    const p = findFreeSpot([sup], 'agent', { x: 50, y: 50 });
    expect(p).toEqual({ x: 760, y: 300 });
  });
  it('never overlaps, even with many agents (it starts a second column)', () => {
    const nodes = addMany(['supervisor', ...Array<NodeType>(20).fill('agent')]);
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) expect(overlap(nodes[i], nodes[j])).toBe(false);
    expect(new Set(nodes.filter((n) => n.type === 'agent').map((n) => n.x)).size).toBeGreaterThan(1);
    expect(nodes.every((n) => n.y <= CANVAS_H - NODE_H - 8)).toBe(true);
  });
  it('without a Supervisor, agents stack in a column from the visible corner', () => {
    const [a, b] = addMany(['agent', 'agent'], { x: 120, y: 80 });
    expect(a).toMatchObject({ x: 120, y: 80 });
    expect(b.x).toBe(120);
    expect(b.y).toBe(80 + NODE_H + 28);
  });
  it('steps around the agents of a loaded team', () => {
    const t = buildTeam('hospitality', {}, 1);
    const p = findFreeSpot(t.nodes, 'agent', { x: 50, y: 50 });
    expect(t.nodes.some((n) => Math.abs(n.x - p.x) < NODE_W + 12 && Math.abs(n.y - p.y) < NODE_H + 12)).toBe(false);
  });
});
