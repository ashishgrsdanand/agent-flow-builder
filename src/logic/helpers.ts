import type { AgentNode } from '../types';
import { KCOUNT } from './constants';

/** "search_rooms, create_booking" -> ['search_rooms', 'create_booking'] */
export const toolList = (s: string | undefined): string[] =>
  (s || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

/** Turns any name into a safe Python identifier: "Head Cook!" -> "head_cook". */
export function slug(name: string): string {
  let s = String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!s) s = 'agent';
  if (/^[0-9]/.test(s)) s = 'agent_' + s;
  return s;
}

/** A one-line Python string literal. */
export const pyDesc = (s: string | undefined): string => JSON.stringify(s || '');

/** A triple-quoted Python string literal that is safe for any prompt text. */
export function pyTriple(s: string | undefined): string {
  const t = (s || 'You are a helpful assistant.').trim().replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return '"""' + t + '"""';
}

/** CSS class that gives a node its colour. */
export const colorClass = (n: Pick<AgentNode, 'type' | 'color'>): string =>
  n.type === 'supervisor' ? 't-supervisor' : 'k' + ((n.color || 0) % KCOUNT);

/** The name to show for a node, even when the learner has cleared the field. */
export const displayName = (n: { name: string }): string => (n.name.trim() ? n.name : 'Unnamed');
