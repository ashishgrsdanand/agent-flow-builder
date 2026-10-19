import { defaultModels } from '../data/providers';
import { CANVAS_H, CANVAS_W, NODE_W, NODE_H } from '../logic/constants';
import { buildTeam, createNode, customAgentOpts, customTeam, type BuiltGraph } from '../logic/graph';
import type { LoadedSave } from '../logic/saveFile';
import type { AgentNode, Edge, MyAgent, NodeOpts, NodeType, ProviderKey, Selection, SimAction, SimSession, TabName } from '../types';

export type HlSpec = { type: 'sel' } | { type: 'section'; key: string };
export type FocusField = 'name' | 'when' | null;

export interface AppState {
  /* the graph the learner draws */
  nodes: AgentNode[];
  edges: Edge[];
  nextId: number;
  sel: Selection;
  /* palette */
  domain: string;
  overrides: Record<string, string>;
  myAgents: MyAgent[];
  /** what the team is for (used by the Custom domain in starting instructions) */
  teamName: string;
  /* code settings */
  provider: ProviderKey;
  models: Record<ProviderKey, string>;
  explain: boolean;
  /* interface */
  tab: TabName;
  hl: HlSpec;
  /** bump to ask the code view to scroll to the highlighted lines */
  scrollTick: number;
  focusField: FocusField;
  /** bump to ask the canvas to fit everything in view */
  fitTick: number;
  wide: boolean;
  /** which sections of the Learn tab are open */
  learnOpen: Record<string, boolean>;
  /** bump to ask the Learn tab to scroll to the "run it" steps */
  howtoTick: number;
  /** true once the first-click tip has been shown */
  tipShown: boolean;
  /* simulator */
  sim: SimSession | null;
  simPlaying: boolean;
}

export type Action =
  | { type: 'select'; sel: Selection }
  | { type: 'edit'; sel: NonNullable<Selection>; field: FocusField }
  | { type: 'clear-focus-field' }
  | { type: 'set-tab'; tab: TabName }
  | { type: 'show-code' }
  | { type: 'show-section'; key: string }
  | { type: 'clear-hl' }
  | { type: 'toggle-wide' }
  | { type: 'learn-toggle'; key: string; open: boolean }
  | { type: 'show-howto' }
  | { type: 'add-node'; nodeType: NodeType; x: number; y: number; opts?: NodeOpts }
  | { type: 'create-custom-agent'; name: string; desc: string; x: number; y: number }
  | { type: 'move-node'; id: string; x: number; y: number }
  | { type: 'update-node'; id: string; patch: Partial<Pick<AgentNode, 'name' | 'desc' | 'prompt' | 'tools'>> }
  | { type: 'delete-selection' }
  | { type: 'delete-edge'; id: string }
  | { type: 'add-edge'; from: string; to: string }
  | { type: 'update-edge'; id: string; when: string }
  | { type: 'load-graph'; graph: BuiltGraph }
  | { type: 'clear-canvas' }
  | { type: 'open-save'; loaded: LoadedSave }
  | { type: 'set-domain'; domain: string }
  | { type: 'set-team-name'; value: string }
  | { type: 'rename-override'; key: string; name: string }
  | { type: 'rename-my-agent'; id: string; name: string }
  | { type: 'remove-my-agent'; id: string }
  | { type: 'set-provider'; provider: ProviderKey }
  | { type: 'set-model'; value: string }
  | { type: 'set-explain'; value: boolean }
  | { type: 'sim-start'; request: string; sig: string }
  | { type: 'sim-act'; action: SimAction }
  | { type: 'sim-back' }
  | { type: 'sim-reset' }
  | { type: 'sim-play'; on: boolean };

export function initialState(): AppState {
  const built = buildTeam('hospitality', {}, 1);
  return {
    nodes: built.nodes,
    edges: built.edges,
    nextId: built.nextId,
    sel: null,
    domain: 'hospitality',
    overrides: {},
    myAgents: [],
    teamName: '',
    provider: 'gemini',
    models: defaultModels(),
    explain: true,
    tab: 'learn',
    hl: { type: 'sel' },
    scrollTick: 0,
    focusField: null,
    fitTick: 1,
    wide: false,
    learnOpen: {},
    howtoTick: 0,
    tipShown: false,
    sim: null,
    simPlaying: false,
  };
}

const clampX = (x: number) => Math.max(8, Math.min(CANVAS_W - NODE_W - 8, x));
const clampY = (y: number) => Math.max(8, Math.min(CANVAS_H - NODE_H - 8, y));

/** Selecting something highlights its code. From the Learn tab it also jumps to the Code tab. */
function withSelection(s: AppState, sel: Selection): AppState {
  const tab = sel && s.tab === 'learn' ? 'code' : s.tab;
  return {
    ...s,
    sel,
    hl: { type: 'sel' },
    tab,
    scrollTick: sel ? s.scrollTick + 1 : s.scrollTick,
    // the first time something is selected on the Code tab, remind the learner how to edit
    tipShown: s.tipShown || (!!sel && tab === 'code'),
  };
}

export function reducer(s: AppState, a: Action): AppState {
  switch (a.type) {
    case 'select':
      return withSelection(s, a.sel);
    case 'edit':
      return { ...s, sel: a.sel, hl: { type: 'sel' }, tab: 'agent', focusField: a.field };
    case 'clear-focus-field':
      return s.focusField ? { ...s, focusField: null } : s;
    case 'set-tab':
      return { ...s, tab: a.tab, scrollTick: a.tab === 'code' ? s.scrollTick + 1 : s.scrollTick };
    case 'show-code':
      return { ...s, hl: { type: 'sel' }, tab: 'code', scrollTick: s.scrollTick + 1 };
    case 'show-section':
      return { ...s, hl: { type: 'section', key: a.key }, tab: 'code', scrollTick: s.scrollTick + 1 };
    case 'clear-hl':
      return { ...s, hl: { type: 'sel' } };
    case 'toggle-wide':
      return { ...s, wide: !s.wide };
    case 'learn-toggle':
      return { ...s, learnOpen: { ...s.learnOpen, [a.key]: a.open } };
    case 'show-howto':
      return { ...s, tab: 'learn', learnOpen: { ...s.learnOpen, run: true }, howtoTick: s.howtoTick + 1 };

    case 'add-node': {
      if (a.nodeType === 'supervisor' && s.nodes.some((n) => n.type === 'supervisor')) return s;
      const id = 'n' + s.nextId;
      const node = createNode(s.nodes, id, a.nodeType, clampX(a.x), clampY(a.y), a.opts);
      return withSelection({ ...s, nodes: [...s.nodes, node], nextId: s.nextId + 1 }, { k: 'node', id });
    }
    case 'create-custom-agent': {
      const agent: MyAgent = { id: 'm' + s.nextId, name: a.name, desc: a.desc };
      const nid = 'n' + (s.nextId + 1);
      const node = createNode(s.nodes, nid, 'agent', clampX(a.x), clampY(a.y), customAgentOpts(agent, customTeam(s.domain, s.teamName)));
      return withSelection({ ...s, myAgents: [...s.myAgents, agent], nodes: [...s.nodes, node], nextId: s.nextId + 2 }, { k: 'node', id: nid });
    }
    case 'move-node':
      return { ...s, nodes: s.nodes.map((n) => (n.id === a.id ? { ...n, x: clampX(a.x), y: clampY(a.y) } : n)) };
    case 'update-node':
      return { ...s, nodes: s.nodes.map((n) => (n.id === a.id ? { ...n, ...a.patch } : n)) };

    case 'delete-selection': {
      if (!s.sel) return s;
      const { k, id } = s.sel;
      if (k === 'node') return { ...s, nodes: s.nodes.filter((n) => n.id !== id), edges: s.edges.filter((e) => e.from !== id && e.to !== id), sel: null };
      return { ...s, edges: s.edges.filter((e) => e.id !== id), sel: null };
    }
    case 'delete-edge':
      return { ...s, edges: s.edges.filter((e) => e.id !== a.id), sel: s.sel && s.sel.k === 'edge' && s.sel.id === a.id ? null : s.sel };
    case 'add-edge':
      return { ...s, edges: [...s.edges, { id: 'e' + s.nextId, from: a.from, to: a.to, when: '' }], nextId: s.nextId + 1 };
    case 'update-edge':
      return { ...s, edges: s.edges.map((e) => (e.id === a.id ? { ...e, when: a.when } : e)) };

    case 'load-graph':
      return { ...s, nodes: a.graph.nodes, edges: a.graph.edges, nextId: a.graph.nextId, sel: null, hl: { type: 'sel' }, fitTick: s.fitTick + 1 };
    case 'clear-canvas':
      return { ...s, nodes: [], edges: [], sel: null, hl: { type: 'sel' }, fitTick: s.fitTick + 1 };
    case 'open-save': {
      const l = a.loaded;
      return {
        ...s,
        nodes: l.nodes,
        edges: l.edges,
        nextId: l.nextId,
        sel: null,
        hl: { type: 'sel' },
        myAgents: l.myAgents,
        overrides: l.overrides,
        teamName: l.teamName,
        domain: l.domain ?? s.domain,
        provider: l.provider ?? s.provider,
        models: { ...s.models, ...l.models },
        fitTick: s.fitTick + 1,
      };
    }

    case 'set-domain':
      return { ...s, domain: a.domain };
    case 'set-team-name':
      return { ...s, teamName: a.value };
    case 'rename-override':
      return { ...s, overrides: { ...s.overrides, [a.key]: a.name } };
    case 'rename-my-agent':
      return { ...s, myAgents: s.myAgents.map((m) => (m.id === a.id ? { ...m, name: a.name } : m)) };
    case 'remove-my-agent':
      return { ...s, myAgents: s.myAgents.filter((m) => m.id !== a.id) };

    case 'set-provider':
      return { ...s, provider: a.provider };
    case 'set-model':
      return { ...s, models: { ...s.models, [s.provider]: a.value } };
    case 'set-explain':
      return { ...s, explain: a.value };

    case 'sim-start':
      return { ...s, sim: { request: a.request, actions: [], sig: a.sig }, simPlaying: false };
    case 'sim-act':
      return s.sim ? { ...s, sim: { ...s.sim, actions: [...s.sim.actions, a.action] } } : s;
    case 'sim-back':
      return s.sim && s.sim.actions.length ? { ...s, sim: { ...s.sim, actions: s.sim.actions.slice(0, -1) }, simPlaying: false } : s;
    case 'sim-reset':
      return { ...s, sim: null, simPlaying: false };
    case 'sim-play':
      return { ...s, simPlaying: a.on };
  }
}
