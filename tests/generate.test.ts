import { describe, expect, it } from 'vitest';
import { DOMAINS } from '../src/data/domains';
import { PROVIDER_KEYS } from '../src/data/providers';
import { generate } from '../src/logic/generate';
import { buildExample, buildTeam, makeIds, createNode } from '../src/logic/graph';
import type { AgentNode, Edge } from '../src/types';
import { config, genTeam, lines } from './helpers';

describe('generate: same input, same output', () => {
  it('is deterministic', () => {
    expect(genTeam('hospitality').code).toBe(genTeam('hospitality').code);
  });
  it('produces different code when the comments are switched off', () => {
    const on = genTeam('hospitality', { explain: true }).code;
    const off = genTeam('hospitality', { explain: false }).code;
    expect(on.split('\n').length).toBeGreaterThan(off.split('\n').length + 8);
    expect(on).toContain('shared notebook');
    expect(off).not.toContain('shared notebook');
  });
  it('puts the supervisor name in the code', () => {
    const g = buildTeam('hospitality', {}, 1);
    g.nodes[0].name = 'Head Cook';
    expect(generate(g, config()).code).toContain('# Head Cook (the supervisor)');
  });
});

describe('generate: line map points at the right code', () => {
  for (const dk of Object.keys(DOMAINS)) {
    for (const explain of [true, false]) {
      it(`${dk} (${explain ? 'with' : 'without'} comments)`, () => {
        const r = genTeam(dk, { explain });
        if (!r.plan || !r.plan.sup) return; // the blank domain has nothing to map
        const sup = r.marks.nodes[r.plan.sup.id];
        expect(lines(r.code, sup[0])).toContain('def supervisor(');
        expect(sup.some((x) => lines(r.code, x).includes('workflow.add_node("supervisor"'))).toBe(true);
        for (const w of Object.values(r.plan.workers)) {
          const m = r.marks.nodes[w.id];
          expect(lines(r.code, m[0])).toContain(`def ${w.ident}(`);
          expect(m.some((x) => lines(r.code, x).includes(`workflow.add_node("${w.ident}"`))).toBe(true);
          if (w.mode === 'back') expect(lines(r.code, r.marks.edges['back:' + w.id][0])).toContain(`add_edge("${w.ident}", "supervisor")`);
          if (w.mode === 'router') {
            expect(m.some((x) => lines(r.code, x).includes(`${w.ident.toUpperCase()}_BRANCHES = {`))).toBe(true);
            for (const b of w.branches) {
              const target = r.plan.workers[b.to].ident;
              const ranges = r.marks.edges[b.edge];
              expect(ranges.length).toBeGreaterThanOrEqual(2);
              expect(ranges.every((x) => lines(r.code, x).includes(`"${target}"`))).toBe(true);
            }
          }
        }
        for (const rt of r.plan.routes) {
          const target = r.plan.workers[rt.to].ident;
          expect(r.marks.edges[rt.edge].every((x) => lines(r.code, x).includes(`"${target}"`))).toBe(true);
        }
        expect(lines(r.code, r.marks.edges['finish'][0])).toContain('"FINISH": END');
        expect(lines(r.code, r.marks.edges['start'][0])).toContain('add_edge(START, "supervisor")');
        expect(lines(r.code, r.marks.sections.state)).toContain('class AgentState');
        expect(lines(r.code, r.marks.sections.run)).toContain('graph.invoke(');
        expect(lines(r.code, r.marks.sections.graph)).toContain('workflow.compile()');
      });
    }
  }
});

describe('generate: providers', () => {
  const expected = { gemini: 'ChatGoogleGenerativeAI', claude: 'ChatAnthropic', openai: 'ChatOpenAI', ollama: 'ChatOllama' } as const;
  for (const p of PROVIDER_KEYS) {
    it(`${p} uses only its own client class`, () => {
      const code = genTeam('hospitality', { provider: p }).code;
      expect(code).toContain(`llm = ${expected[p]}(`);
      for (const other of PROVIDER_KEYS) if (other !== p) expect(code).not.toContain(expected[other]);
    });
  }
  it('ollama needs no API key and no os import', () => {
    const code = genTeam('hospitality', { provider: 'ollama' }).code;
    expect(code).not.toContain('import os');
    expect(code).toContain('ollama pull');
  });
  it('uses the model typed for that provider', () => {
    const code = genTeam('hospitality', { provider: 'claude', models: { ...config().models, claude: 'my-model' } }).code;
    expect(code).toContain('ChatAnthropic(model="my-model"');
  });
});

describe('generate: graph rules', () => {
  const build = (fn: (add: (name: string, type?: AgentNode['type']) => AgentNode, link: (a: AgentNode, b: AgentNode, when?: string) => void) => void) => {
    const ids = makeIds(1);
    const nodes: AgentNode[] = [];
    const edges: Edge[] = [];
    const add = (name: string, type: AgentNode['type'] = 'agent') => {
      const n = createNode(nodes, ids.node(), type, 0, 0, { name });
      nodes.push(n);
      return n;
    };
    const link = (a: AgentNode, b: AgentNode, when = '') => void edges.push({ id: ids.edge(), from: a.id, to: b.id, when });
    fn(add, link);
    return { nodes, edges };
  };

  it('leaves out agents the supervisor cannot reach, and says so', () => {
    const g = build((add, link) => { const s = add('Boss', 'supervisor'); link(s, add('A')); add('Lonely'); });
    const r = generate(g, config());
    expect(r.warnings.join(' ')).toContain('"Lonely" is not reachable');
    expect(r.code).not.toContain('lonely');
  });
  it('warns when several unconditioned arrows leave one agent', () => {
    const g = build((add, link) => { const s = add('Boss', 'supervisor'); const a = add('A'); link(s, a); link(a, add('B')); link(a, add('C')); });
    expect(generate(g, config()).warnings.join(' ')).toContain('in parallel');
  });
  it('turns conditions into routing code, and a loop with a condition is only a note', () => {
    const g = build((add, link) => { const s = add('Boss', 'supervisor'); const w = add('Writer'); const r = add('Reviewer'); link(s, w); link(w, r); link(r, w, 'needs fixes'); });
    const r = generate(g, config());
    expect(r.code).toContain('def route_after_reviewer');
    expect(r.warnings).toHaveLength(0);
    expect(r.notes.join(' ')).toContain('loop back');
  });
  it('warns about a loop that has no condition', () => {
    const g = build((add, link) => { const s = add('Boss', 'supervisor'); const a = add('A'); const b = add('B'); link(s, a); link(a, b); link(b, a); });
    expect(generate(g, config()).warnings.join(' ')).toContain('loop');
  });
  it('without a supervisor it writes a plain pipeline', () => {
    const g = build((add, link) => { link(add('Writer'), add('Editor')); });
    const r = generate(g, config());
    expect(r.code).toContain('add_edge(START, "writer")');
    expect(r.code).toContain('add_edge("editor", END)');
    expect(r.meta).toContain('Pipeline');
  });
  it('makes safe, unique Python names from awkward agent names', () => {
    const g = build((add, link) => { const s = add('Boss', 'supervisor'); link(s, add('Class')); link(s, add('Refund Agent')); link(s, add('Refund Agent')); link(s, add('রিফান্ড')); });
    const names = Object.values(generate(g, config()).plan!.workers).map((w) => w.ident);
    expect(names).toEqual(['class_agent', 'refund_agent', 'refund_agent_2', 'agent']);
    expect(new Set(names).size).toBe(names.length);
  });
  it('an agent whose name was cleared is shown as "Unnamed"', () => {
    const g = build((add, link) => { const s = add('Boss', 'supervisor'); const a = add('A'); link(s, a); a.name = '  '; });
    expect(generate(g, config()).plan!.workers[g.nodes[1].id].name).toBe('Unnamed');
  });
  it('the examples build valid graphs', () => {
    for (const kind of ['tiny', 'loop'] as const) {
      const r = generate(buildExample(kind, 1), config());
      expect(r.plan!.sup).not.toBeNull();
      expect(r.code).toContain('workflow.compile()');
    }
  });
});
