import { describe, expect, it } from 'vitest';
import { highlightRanges, planName, planSignature } from '../src/state/selectors';
import { genTeam, lines } from './helpers';

describe('selectors', () => {
  const r = genTeam('hospitality');
  const plan = r.plan!;
  const billing = Object.values(plan.workers).find((w) => w.ident === 'billing_agent')!;

  it('highlights the code of the selected agent', () => {
    const ranges = highlightRanges({ type: 'sel' }, { k: 'node', id: billing.id }, r.marks);
    expect(lines(r.code, ranges[0])).toContain('def billing_agent(');
  });
  it('highlights a whole section when one is chosen, whatever is selected', () => {
    const ranges = highlightRanges({ type: 'section', key: 'state' }, { k: 'node', id: billing.id }, r.marks);
    expect(ranges).toHaveLength(1);
    expect(lines(r.code, ranges[0])).toContain('class AgentState');
  });
  it('highlights nothing when nothing is selected, or the section does not exist', () => {
    expect(highlightRanges({ type: 'sel' }, null, r.marks)).toEqual([]);
    expect(highlightRanges({ type: 'section', key: 'nope' }, null, r.marks)).toEqual([]);
  });
  it('plan signatures change when the graph changes and not otherwise', () => {
    expect(planSignature(plan)).toBe(planSignature(genTeam('hospitality').plan));
    expect(planSignature(plan)).not.toBe(planSignature(genTeam('education').plan));
    expect(planSignature(null)).toBe('');
  });
  it('looks up readable names', () => {
    expect(planName(plan, billing.id)).toBe('Billing Agent');
    expect(planName(plan, plan.sup!.id)).toBe('Supervisor');
    expect(planName(plan, 'END')).toBe('END');
    expect(planName(null, 'x')).toBe('x');
  });
});
