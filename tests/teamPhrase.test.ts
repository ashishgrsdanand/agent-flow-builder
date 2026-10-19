import { describe, expect, it } from 'vitest';
import { customAgentOpts, customTeam, domItems, itemOpts, teamPhrase } from '../src/logic/graph';

describe('team phrase', () => {
  it('turns what you typed into a team description', () => {
    expect(teamPhrase('custom', 'cooking class')).toBe('cooking class team');
    expect(teamPhrase('custom', '  Kitchen team ')).toBe('Kitchen team');
  });
  it('falls back to the standard wording when empty', () => expect(teamPhrase('custom', '   ')).toBe('team of specialist agents'));
  it('is ignored outside the Custom domain', () => expect(teamPhrase('hospitality', 'cooking class')).toBe('hotel guest-services team'));
  it('customTeam is empty unless you are in Custom and have typed something', () => {
    expect(customTeam('custom', '')).toBeUndefined();
    expect(customTeam('hospitality', 'x')).toBeUndefined();
    expect(customTeam('custom', 'x')).toBe('x team');
  });
  it('the Supervisor starts with your team name', () => {
    const sup = domItems('custom', {})[0];
    expect(itemOpts('custom', sup, teamPhrase('custom', 'cooking class')).prompt).toContain('You are the supervisor of a cooking class team.');
  });
  it('default prompts are unchanged when no team is given', () => {
    const sup = domItems('custom', {})[0];
    expect(itemOpts('custom', sup).prompt).toContain('supervisor of a team of specialist agents');
    expect(customAgentOpts({ id: 'm1', name: 'Helper', desc: 'Helps.' }).prompt).toContain('You are the Helper. Your job: Helps.');
  });
});
