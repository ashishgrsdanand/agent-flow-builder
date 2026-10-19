import { describe, expect, it } from 'vitest';
import { parseSave, serializeSave } from '../src/logic/saveFile';
import { initialState } from '../src/state/reducer';

describe('save files', () => {
  it('round-trips a design', () => {
    const s = initialState();
    const loaded = parseSave(serializeSave({ ...s, provider: 'claude', overrides: { 'hospitality:0': 'Booking Desk' } }));
    expect(loaded.nodes).toEqual(s.nodes);
    expect(loaded.edges).toEqual(s.edges);
    expect(loaded.provider).toBe('claude');
    expect(loaded.overrides).toEqual({ 'hospitality:0': 'Booking Desk' });
    expect(loaded.domain).toBe('hospitality');
    expect(loaded.nextId).toBe(s.nextId);
  });
  it('opens saves from the first version: role types become plain agents, one model becomes the Gemini model', () => {
    const old = {
      v: 2, model: 'gemini-1.5-pro', domain: 'hospitality', overrides: {}, myAgents: [],
      nodes: [
        { id: 'n1', type: 'supervisor', name: 'Supervisor', desc: '', prompt: 'p', tools: '', x: 40, y: 100 },
        { id: 'n2', type: 'booking', name: 'Booking Agent', desc: 'd', prompt: 'p', tools: '', x: 300, y: 60 },
      ],
      edges: [{ id: 'e3', from: 'n1', to: 'n2' }],
    };
    const l = parseSave(JSON.stringify(old));
    expect(l.nodes.map((n) => n.type)).toEqual(['supervisor', 'agent']);
    expect(l.edges[0].when).toBe('');
    expect(l.models.gemini).toBe('gemini-1.5-pro');
    expect(l.provider).toBe('gemini');
    expect(l.nextId).toBe(4);
  });
  it('drops arrows that point at missing agents', () => {
    const l = parseSave(JSON.stringify({ nodes: [{ id: 'n1', type: 'agent', name: 'A' }], edges: [{ id: 'e2', from: 'n1', to: 'ghost' }] }));
    expect(l.edges).toHaveLength(0);
  });
  it('rejects files that are not layouts', () => {
    expect(() => parseSave('{"hello": 1}')).toThrow();
    expect(() => parseSave('not json')).toThrow();
  });
});

describe('save files: team name', () => {
  it('keeps the team name', () => {
    const s = { ...initialState(), teamName: 'cooking class' };
    expect(parseSave(serializeSave(s)).teamName).toBe('cooking class');
  });
  it('older files without one open with an empty team name', () => {
    expect(parseSave(JSON.stringify({ nodes: [], edges: [] })).teamName).toBe('');
  });
});
