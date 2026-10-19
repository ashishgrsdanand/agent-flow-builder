import type { Marks, Plan, Range, Selection } from '../types';
import type { HlSpec } from './reducer';

/** The lines of code to highlight: a whole section, or whatever is selected on the canvas. */
export function highlightRanges(hl: HlSpec, sel: Selection, marks: Marks): Range[] {
  if (hl.type === 'section') return marks.sections[hl.key] ? [marks.sections[hl.key]] : [];
  if (!sel) return [];
  return (sel.k === 'node' ? marks.nodes[sel.id] : marks.edges[sel.id]) || [];
}

/** A string that changes whenever the structure of the graph changes (used to reset a running simulation). */
export const planSignature = (plan: Plan | null): string => (plan ? JSON.stringify(plan) : '');

/** Names of things for display, looked up from the plan. */
export function planName(plan: Plan | null, id: string): string {
  if (id === 'END' || id === 'START') return id;
  if (!plan) return id;
  if (plan.sup && plan.sup.id === id) return plan.sup.name;
  return plan.workers[id] ? plan.workers[id].name : id;
}
