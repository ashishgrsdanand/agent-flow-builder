import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import App from '../src/App';
import { DOMAINS } from '../src/data/domains';
import { buildExample, buildTeam } from '../src/logic/graph';
import { initialState, type AppState } from '../src/state/reducer';
import type { TabName } from '../src/types';

/** These render the whole app to a string. They catch crashes in any component without needing a browser. */
const render = (s: Partial<AppState> = {}) => renderToString(<App initial={{ ...initialState(), ...s }} />);

describe('App renders', () => {
  it('shows the page shell, palette, canvas and the Learn tab', () => {
    const html = render();
    for (const text of ['Agent Flow Builder', 'Load full team on canvas', 'Hospitality (hotels)', 'Billing Agent', 'Your graph in plain English', 'Start here']) {
      expect(html).toContain(text);
    }
  });

  for (const tab of ['learn', 'code', 'sim', 'agent'] as TabName[]) {
    it(`the ${tab} tab`, () => expect(render({ tab }).length).toBeGreaterThan(2000));
  }

  it('the Custom domain asks what the team is for', () => {
    const html = render({ domain: 'custom' });
    expect(html).toContain('What is your team for?');
    expect(render({ domain: 'hospitality' })).not.toContain('What is your team for?');
  });

  it('an empty canvas', () => {
    const html = render({ nodes: [], edges: [] });
    expect(html).toContain('Your canvas is empty');
    expect(html).toContain('Add some agents');
  });

  for (const dk of Object.keys(DOMAINS)) {
    it(`the ${dk} team, with an agent selected and every tab`, () => {
      const g = buildTeam(dk, {}, 1);
      for (const tab of ['learn', 'code', 'sim', 'agent'] as TabName[]) {
        const html = render({ ...g, domain: dk, tab, sel: { k: 'node', id: g.nodes[0].id } });
        expect(html).toContain('Agent Flow Builder');
      }
    });
  }

  it('an arrow selected in the editor shows its condition box', () => {
    const s = initialState();
    const cond = s.edges.find((e) => e.when)!;
    const html = render({ tab: 'agent', sel: { k: 'edge', id: cond.id } });
    expect(html).toContain('Take this path only when');
    expect(html).toContain(cond.when);
  });

  it('the Code tab marks highlighted lines for the selected agent', () => {
    const s = initialState();
    const html = render({ tab: 'code', sel: { k: 'node', id: s.nodes[1].id } });
    expect(html).toContain('ln hl');
    expect(html).toContain('Highlighted: the code for');
  });

  it('a running simulation shows its step and the code involved', () => {
    const html = render({ tab: 'sim', sim: { request: 'hi', actions: ['next'], sig: '' } });
    expect(html).toContain('Supervisor decides');
    expect(html).toContain('Function that runs');
  });

  it('a finished simulation', () => {
    const html = render({ tab: 'sim', ...buildExample('tiny', 1), sim: { request: 'hi', actions: ['next', { choose: 'writer_agent' }, 'next', 'next', { choose: 'FINISH' }, 'next'], sig: '' } });
    expect(html).toContain('Run finished');
  });
});
