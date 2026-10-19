import { describe, expect, it } from 'vitest';
import { generate } from '../src/logic/generate';
import { buildExample } from '../src/logic/graph';
import { explainGraph } from '../src/logic/explain';
import { simAuto, simCompute } from '../src/logic/simulate';
import type { Plan, SimAction, SimState } from '../src/types';
import { config, genTeam } from './helpers';

/** The agent function names in the order they ran (what the real graph would print). */
const path = (plan: Plan, s: SimState) => s.trace.filter((x) => x !== 'START').map((x) => (x === 'END' ? 'END' : plan.workers[x] ? plan.workers[x].ident : 'supervisor'));

/** Plays a run: "next" for automatic steps, and the given answers at each decision. */
function play(plan: Plan, answers: string[]): SimState {
  const acts: SimAction[] = [];
  let s = simCompute(plan, 'hi', acts);
  let i = 0;
  for (let guard = 0; !s.done && guard < 300; guard++) {
    acts.push(s.pending!.kind === 'go' ? 'next' : { choose: answers[i++] });
    s = simCompute(plan, 'hi', acts);
  }
  return s;
}

describe('simulate', () => {
  const plan = genTeam('hospitality').plan!;

  it('follows a conditional path', () => {
    expect(path(plan, play(plan, ['billing_agent', 'check_in_agent', 'FINISH']))).toEqual(['supervisor', 'billing_agent', 'check_in_agent', 'supervisor', 'END']);
  });
  it('DONE sends control back to the supervisor', () => {
    expect(path(plan, play(plan, ['billing_agent', 'DONE', 'FINISH']))).toEqual(['supervisor', 'billing_agent', 'supervisor', 'END']);
  });
  it('a plain agent reports straight back', () => {
    expect(path(plan, play(plan, ['reservation_agent', 'FINISH']))).toEqual(['supervisor', 'reservation_agent', 'supervisor', 'END']);
  });
  it('counts node runs and model calls', () => {
    const s = play(plan, ['billing_agent', 'check_in_agent', 'FINISH']);
    expect(s.runs).toBe(4);
    expect(s.calls).toBeGreaterThanOrEqual(4);
    expect(s.messages[0].role).toBe('human');
    expect(s.messages.filter((m) => m.role === 'ai')).toHaveLength(2);
  });
  it('stops at the recursion limit when two agents keep sending work back', () => {
    const p = generate(buildExample('loop', 1), config()).plan!;
    const acts: SimAction[] = [];
    let s = simCompute(p, 'hi', acts);
    for (let guard = 0; !s.done && guard < 500; guard++) {
      const pend = s.pending!;
      acts.push(pend.kind === 'go' ? 'next' : { choose: (pend.options.find((o) => o.label === 'Writer Agent') ?? pend.options[0]).value });
      s = simCompute(p, 'hi', acts);
    }
    expect(s.error).toBe('GraphRecursionError');
    expect(s.runs).toBe(26);
  });
  it('ignores actions that do not fit the current step', () => {
    const base = simCompute(plan, 'x', ['next']);
    expect(simCompute(plan, 'x', ['next', 'next']).trace).toEqual(base.trace);
    expect(simCompute(plan, 'x', [{ choose: 'billing_agent' }]).trace).toEqual(['START']);
  });
  it('replaying fewer actions gives the earlier step (this is how Back works)', () => {
    const acts: SimAction[] = ['next', { choose: 'billing_agent' }, 'next'];
    expect(simCompute(plan, 'x', acts).trace.length).toBe(simCompute(plan, 'x', acts.slice(0, -1)).trace.length + 1);
  });
  it('auto-play visits new agents first, then finishes', () => {
    const acts: SimAction[] = [];
    let s = simCompute(plan, 'hi', acts);
    for (let guard = 0; !s.done && guard < 300; guard++) { acts.push(simAuto(s)!); s = simCompute(plan, 'hi', acts); }
    expect(s.done).toBe(true);
    expect(s.error).toBeNull();
    expect(new Set(s.visited.filter((v) => v !== plan.sup!.id)).size).toBe(Object.keys(plan.workers).length);
  });
});

describe('explainGraph', () => {
  it('describes the supervisor flow in plain English', () => {
    const text = explainGraph(genTeam('hospitality').plan).join(' ');
    expect(text).toContain('A run starts at START and goes straight to the Supervisor');
    expect(text).toContain('After Billing Agent finishes, the model picks one path');
    expect(text).toContain('Cost tip');
  });
  it('asks for agents when the canvas is empty', () => {
    expect(explainGraph(null)[0]).toContain('Add some agents');
  });
});
