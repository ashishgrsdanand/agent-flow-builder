import type { AgentNode, Edge } from '../types';

export type ConnectCheck = { ok: true } | { ok: false; message: string | null };

/**
 * Decides whether an arrow from one agent to another is allowed.
 * `message` is what to tell the learner; null means "ignore silently".
 */
export function checkConnection(nodes: AgentNode[], edges: Edge[], fromId: string, toId: string): ConnectCheck {
  const a = nodes.find((n) => n.id === fromId);
  const b = nodes.find((n) => n.id === toId);
  if (!a || !b || a === b) return { ok: false, message: null };
  if (b.type === 'supervisor') return { ok: false, message: 'No arrow needed. Agents report back to the Supervisor automatically.' };
  if (edges.some((e) => e.from === fromId && e.to === toId)) return { ok: false, message: 'Those two are already connected.' };
  return { ok: true };
}

/** The toast shown after an arrow is added. */
export function connectedMessage(a: AgentNode, b: AgentNode): string {
  return a.type === 'supervisor'
    ? `Supervisor can now route to ${b.name}`
    : `${a.name} now hands off to ${b.name}. Double-click the arrow to add a condition.`;
}
