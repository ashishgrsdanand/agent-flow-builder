import { describe, expect, it } from 'vitest';
import { checkConnection } from '../src/logic/connect';
import { buildExample } from '../src/logic/graph';
import { initialState, reducer, type AppState } from '../src/state/reducer';

const run = (s: AppState, ...actions: Parameters<typeof reducer>[1][]) => actions.reduce(reducer, s);

describe('reducer', () => {
  it('starts with the hospitality team and the Learn tab open', () => {
    const s = initialState();
    expect(s.tab).toBe('learn');
    expect(s.nodes[0].type).toBe('supervisor');
    expect(s.nodes.length).toBe(8);
    expect(s.edges.some((e) => e.when)).toBe(true);
  });
  it('selecting from the Learn tab jumps to the Code tab and asks it to scroll', () => {
    const s0 = initialState();
    const s = reducer(s0, { type: 'select', sel: { k: 'node', id: s0.nodes[1].id } });
    expect(s.tab).toBe('code');
    expect(s.scrollTick).toBe(s0.scrollTick + 1);
  });
  it('selecting on the Code tab keeps the tab', () => {
    let s = reducer(initialState(), { type: 'set-tab', tab: 'code' });
    s = reducer(s, { type: 'select', sel: { k: 'node', id: s.nodes[1].id } });
    expect(s.tab).toBe('code');
  });
  it('editing opens the Agent tab and remembers which field to focus', () => {
    const s0 = initialState();
    const s = reducer(s0, { type: 'edit', sel: { k: 'node', id: s0.nodes[1].id }, field: 'name' });
    expect(s.tab).toBe('agent');
    expect(s.focusField).toBe('name');
    expect(reducer(s, { type: 'clear-focus-field' }).focusField).toBeNull();
  });
  it('adds an agent, selects it, and gives it a unique name', () => {
    const s0 = initialState();
    const s = run(s0, { type: 'add-node', nodeType: 'agent', x: 100, y: 100, opts: { name: 'Billing Agent' } });
    expect(s.nodes.length).toBe(s0.nodes.length + 1);
    expect(s.nodes[s.nodes.length - 1].name).toBe('Billing Agent 2');
    expect(s.sel).toEqual({ k: 'node', id: s.nodes[s.nodes.length - 1].id });
    expect(s.nextId).toBe(s0.nextId + 1);
  });
  it('allows only one supervisor', () => {
    const s0 = initialState();
    expect(reducer(s0, { type: 'add-node', nodeType: 'supervisor', x: 0, y: 0 })).toBe(s0);
  });
  it('keeps agents inside the canvas', () => {
    const s = run(initialState(), { type: 'add-node', nodeType: 'agent', x: -500, y: 99999 });
    const n = s.nodes[s.nodes.length - 1];
    expect(n.x).toBe(8);
    expect(n.y).toBeLessThan(900);
  });
  it('creates a custom agent in the palette and on the canvas in one step', () => {
    const s = run(initialState(), { type: 'create-custom-agent', name: 'Refund Agent', desc: 'Handles refunds', x: 50, y: 50 });
    expect(s.myAgents.map((m) => m.name)).toEqual(['Refund Agent']);
    expect(s.nodes[s.nodes.length - 1].name).toBe('Refund Agent');
    expect(new Set([...s.nodes.map((n) => n.id), ...s.edges.map((e) => e.id), ...s.myAgents.map((m) => m.id)]).size).toBe(s.nodes.length + s.edges.length + s.myAgents.length);
  });
  it('deleting an agent also removes its arrows', () => {
    const s0 = initialState();
    const id = s0.nodes[1].id;
    const s = run(s0, { type: 'select', sel: { k: 'node', id } }, { type: 'delete-selection' });
    expect(s.nodes.find((n) => n.id === id)).toBeUndefined();
    expect(s.edges.some((e) => e.from === id || e.to === id)).toBe(false);
    expect(s.sel).toBeNull();
  });
  it('edits a condition on an arrow', () => {
    const s0 = initialState();
    const e = s0.edges[0];
    expect(run(s0, { type: 'update-edge', id: e.id, when: 'hello' }).edges[0].when).toBe('hello');
  });
  it('the model name is remembered for each provider separately', () => {
    let s = run(initialState(), { type: 'set-provider', provider: 'claude' }, { type: 'set-model', value: 'my-claude' }, { type: 'set-provider', provider: 'openai' });
    expect(s.models.openai).toBe('gpt-4o-mini');
    s = reducer(s, { type: 'set-provider', provider: 'claude' });
    expect(s.models.claude).toBe('my-claude');
  });
  it('simulation actions can be added, undone and reset', () => {
    let s = run(initialState(), { type: 'sim-start', request: 'hi', sig: 'x' }, { type: 'sim-act', action: 'next' }, { type: 'sim-act', action: { choose: 'a' } });
    expect(s.sim!.actions).toHaveLength(2);
    s = reducer(s, { type: 'sim-back' });
    expect(s.sim!.actions).toEqual(['next']);
    expect(reducer(s, { type: 'sim-reset' }).sim).toBeNull();
  });
  it('loading a graph asks the canvas to fit and clears the selection', () => {
    const s0 = run(initialState(), { type: 'select', sel: { k: 'node', id: 'n1' } });
    const s = reducer(s0, { type: 'load-graph', graph: buildExample('tiny', 1) });
    expect(s.nodes).toHaveLength(3);
    expect(s.sel).toBeNull();
    expect(s.fitTick).toBe(s0.fitTick + 1);
  });
});

describe('checkConnection', () => {
  const s = initialState();
  const [sup, a, b] = s.nodes;
  it('allows a new arrow between agents', () => expect(checkConnection(s.nodes, s.edges, a.id, b.id)).toEqual({ ok: true }));
  it('explains why an arrow into the supervisor is not needed', () => {
    const r = checkConnection(s.nodes, s.edges, a.id, sup.id);
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.message).toContain('report back to the Supervisor automatically');
  });
  it('rejects duplicates and self-arrows', () => {
    expect(checkConnection(s.nodes, s.edges, sup.id, a.id)).toEqual({ ok: false, message: 'Those two are already connected.' });
    expect(checkConnection(s.nodes, s.edges, a.id, a.id)).toEqual({ ok: false, message: null });
  });
});

describe('reducer: learning features', () => {
  it('remembers which Learn sections are open', () => {
    const s = reducer(initialState(), { type: 'learn-toggle', key: 'read', open: true });
    expect(s.learnOpen.read).toBe(true);
  });
  it('"how do I run this" opens the Learn tab with the run steps open', () => {
    const s0 = reducer(initialState(), { type: 'set-tab', tab: 'code' });
    const s = reducer(s0, { type: 'show-howto' });
    expect(s.tab).toBe('learn');
    expect(s.learnOpen.run).toBe(true);
    expect(s.howtoTick).toBe(s0.howtoTick + 1);
  });
  it('showing a code section highlights it and switches to the Code tab', () => {
    const s = reducer(initialState(), { type: 'show-section', key: 'routing' });
    expect(s.tab).toBe('code');
    expect(s.hl).toEqual({ type: 'section', key: 'routing' });
  });
  it('the first selection on the Code tab triggers the edit tip, once', () => {
    let s = reducer(initialState(), { type: 'set-tab', tab: 'code' });
    expect(s.tipShown).toBe(false);
    s = reducer(s, { type: 'select', sel: { k: 'node', id: s.nodes[0].id } });
    expect(s.tipShown).toBe(true);
  });
  it('selecting from the Learn tab also counts as the first code view', () => {
    const s0 = initialState();
    expect(reducer(s0, { type: 'select', sel: { k: 'node', id: s0.nodes[0].id } }).tipShown).toBe(true);
  });
  it('no tip while you stay on the Agent tab', () => {
    const s0 = reducer(initialState(), { type: 'set-tab', tab: 'agent' });
    expect(reducer(s0, { type: 'select', sel: { k: 'node', id: s0.nodes[0].id } }).tipShown).toBe(false);
  });
});

describe('reducer: team name for the Custom domain', () => {
  const custom = (s: AppState) => run(s, { type: 'set-domain', domain: 'custom' });

  it('is empty to start with', () => expect(initialState().teamName).toBe(''));
  it('is used in the prompt of an agent you create in the Custom domain', () => {
    const s = run(initialState(), { type: 'set-domain', domain: 'custom' }, { type: 'set-team-name', value: 'cooking class' }, { type: 'create-custom-agent', name: 'Helper', desc: 'Prepares ingredients.', x: 0, y: 0 });
    expect(s.nodes[s.nodes.length - 1].prompt).toContain('You are the Helper on a cooking class team.');
  });
  it('is not mentioned when it has not been filled in', () => {
    const s = run(custom(initialState()), { type: 'create-custom-agent', name: 'Helper', desc: '', x: 0, y: 0 });
    expect(s.nodes[s.nodes.length - 1].prompt).toContain('You are the Helper. Your job:');
  });
  it('is ignored in the ready-made domains', () => {
    const s = run(initialState(), { type: 'set-team-name', value: 'cooking class' }, { type: 'create-custom-agent', name: 'Helper', desc: '', x: 0, y: 0 });
    expect(s.nodes[s.nodes.length - 1].prompt).not.toContain('cooking class');
  });
});
