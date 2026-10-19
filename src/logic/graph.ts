import { DOMAINS } from '../data/domains';
import type { AgentNode, Edge, Graph, MyAgent, NodeOpts, NodeType, PaletteItem } from '../types';
import { KCOUNT, NODE_H } from './constants';
import { toolList } from './helpers';

/* ---------- ids ---------- */

/** One counter shared by nodes, arrows and custom agents, so ids never clash. */
export function makeIds(start: number) {
  let n = start;
  return {
    node: () => 'n' + n++,
    edge: () => 'e' + n++,
    mine: () => 'm' + n++,
    next: () => n,
  };
}

export type BuiltGraph = Graph & { nextId: number };

/* ---------- palette items for a domain ---------- */

/** The supervisor plus every ready-made agent for a domain. Names can be overridden by the learner. */
export function domItems(dk: string, overrides: Record<string, string>): PaletteItem[] {
  const d = DOMAINS[dk];
  const items: PaletteItem[] = [
    { key: dk + ':sup', kind: 'supervisor', name: overrides[dk + ':sup'] || 'Supervisor', desc: 'Routes each request to the right agent' },
  ];
  d.agents.forEach((a, i) =>
    items.push({ key: dk + ':' + i, kind: 'agent', name: overrides[dk + ':' + i] || a[0], desc: a[1], tools: a[2], color: i % KCOUNT }),
  );
  return items;
}

/** The starting values (prompt, tools...) for a node created from a palette item. */
export function itemOpts(dk: string, it: PaletteItem, team?: string): NodeOpts {
  const d = DOMAINS[dk];
  const t = team || d.team;
  if (it.kind === 'supervisor') {
    return {
      name: it.name,
      desc: '',
      tools: '',
      prompt:
        'You are the supervisor of a ' + t + '. Read the conversation and decide which specialist should act next, based on what the user still needs. When the request has been completely handled, choose FINISH.',
    };
  }
  return {
    name: it.name,
    desc: it.desc,
    tools: it.tools,
    color: it.color,
    prompt:
      'You are the ' + it.name + ' on a ' + t + '. Your job: ' + it.desc + ' Ask for any detail you are missing, and say clearly when your part is done.' + (d.note ? ' ' + d.note : ''),
  };
}

/** Starting values for a node made from one of the learner's own (custom) agents. */
export function customAgentOpts(a: MyAgent, team?: string): NodeOpts {
  const job = a.desc || 'Describe what this agent is responsible for.';
  return {
    name: a.name,
    color: 4,
    tools: '',
    desc: a.desc || 'Handles ' + a.name + ' tasks.',
    prompt: 'You are the ' + a.name + (team ? ' on a ' + team : '') + '. Your job: ' + job + ' Stay within this role. Ask for any detail you are missing, and say clearly when your part is done.',
  };
}

/**
 * The team description to use in starting instructions.
 * In the Custom domain it comes from what the learner typed ("cooking class" -> "cooking class team").
 */
export function teamPhrase(dk: string, topic: string): string {
  const t = topic.trim();
  if (dk !== 'custom' || !t) return DOMAINS[dk].team;
  return /\bteam$/i.test(t) ? t : t + ' team';
}

/** Like teamPhrase, but empty when the learner has not named their team (so nothing extra is added). */
export function customTeam(dk: string, topic: string): string | undefined {
  return dk === 'custom' && topic.trim() ? teamPhrase(dk, topic) : undefined;
}

/* ---------- creating nodes ---------- */

/** "Helper" -> "Helper 2" when "Helper" already exists. */
export function uniqueName(nodes: AgentNode[], base: string): string {
  if (!nodes.some((n) => n.name === base)) return base;
  let i = 2;
  while (nodes.some((n) => n.name === base + ' ' + i)) i++;
  return base + ' ' + i;
}

export function createNode(nodes: AgentNode[], id: string, type: NodeType, x: number, y: number, o: NodeOpts = {}): AgentNode {
  const workers = nodes.filter((n) => n.type !== 'supervisor').length;
  return {
    id,
    type,
    x,
    y,
    name: uniqueName(nodes, o.name || (type === 'supervisor' ? 'Supervisor' : 'New Agent')),
    desc: o.desc ?? '',
    tools: o.tools ?? '',
    prompt: o.prompt ?? 'You are a helpful specialist agent. Describe your job here, what you should do, and what you should not do.',
    color: o.color ?? workers % KCOUNT,
  };
}

/** An agent is a "router" when at least one of its outgoing arrows has a condition. */
export function isRouterNode(nodes: AgentNode[], edges: Edge[], id: string): boolean {
  const n = nodes.find((x) => x.id === id);
  if (!n || n.type === 'supervisor') return false;
  return edges.some((e) => {
    if (e.from !== id || !(e.when || '').trim()) return false;
    const t = nodes.find((x) => x.id === e.to);
    return !!t && t.type !== 'supervisor';
  });
}

/* ---------- ready-made teams and examples ---------- */

/** Loads a whole domain: a supervisor, every agent, and the arrows between them. */
export function buildTeam(dk: string, overrides: Record<string, string>, startId: number): BuiltGraph {
  const ids = makeIds(startId);
  const nodes: AgentNode[] = [];
  const edges: Edge[] = [];
  const add = (type: NodeType, x: number, y: number, o: NodeOpts) => {
    const n = createNode(nodes, ids.node(), type, x, y, o);
    nodes.push(n);
    return n;
  };
  const items = domItems(dk, overrides);
  const ws = items.slice(1);
  const gap = 92;
  const center = 450;
  const flows = (DOMAINS[dk].flows || []).filter(([a, b]) => ws[a] && ws[b]);
  // columns: an agent that receives a conditional arrow sits one column to the right of its source
  const depth = ws.map(() => 0);
  for (let pass = 0; pass < ws.length; pass++) flows.forEach(([a, b]) => { depth[b] = Math.max(depth[b], depth[a] + 1); });
  const cols: Record<number, number[]> = {};
  ws.forEach((_, i) => (cols[depth[i]] = cols[depth[i]] || []).push(i));
  const sup = add('supervisor', 40, center - NODE_H / 2, itemOpts(dk, items[0]));
  const wn: AgentNode[] = [];
  Object.keys(cols).forEach((key) => {
    const d = Number(key);
    const list = cols[d];
    list.forEach((i, k) => {
      wn[i] = add('agent', 300 + d * 310, center - NODE_H / 2 + (k - (list.length - 1) / 2) * gap, itemOpts(dk, ws[i]));
    });
  });
  wn.forEach((w) => edges.push({ id: ids.edge(), from: sup.id, to: w.id, when: '' }));
  flows.forEach(([a, b, when]) => edges.push({ id: ids.edge(), from: wn[a].id, to: wn[b].id, when }));
  return { nodes, edges, nextId: ids.next() };
}

export type ExampleKind = 'tiny' | 'loop';

/** Small graphs for beginners: a supervisor with two agents, or a writer/reviewer loop. */
export function buildExample(kind: ExampleKind, startId: number): BuiltGraph {
  const ids = makeIds(startId);
  const nodes: AgentNode[] = [];
  const edges: Edge[] = [];
  const g = domItems('general', {});
  const opt = (it: PaletteItem): NodeOpts => ({ ...itemOpts('general', it), tools: '' });
  const add = (type: NodeType, x: number, y: number, o: NodeOpts) => {
    const n = createNode(nodes, ids.node(), type, x, y, o);
    nodes.push(n);
    return n;
  };
  const link = (a: AgentNode, b: AgentNode, when = '') => edges.push({ id: ids.edge(), from: a.id, to: b.id, when });
  if (kind === 'tiny') {
    const s = add('supervisor', 40, 170, itemOpts('general', g[0]));
    const a = add('agent', 300, 80, opt(g[2]));
    const b = add('agent', 300, 250, opt(g[3]));
    link(s, a);
    link(s, b);
  } else {
    const s = add('supervisor', 40, 150, itemOpts('general', g[0]));
    const w = add('agent', 300, 150, opt(g[3]));
    const r = add('agent', 620, 150, opt(g[4]));
    link(s, w);
    link(w, r);
    link(r, w, 'the draft needs fixes');
  }
  return { nodes, edges, nextId: ids.next() };
}

/** The small grey line under a node's name on the canvas. */
export function nodeSubtitle(n: AgentNode, nodes: AgentNode[], edges: Edge[]): string {
  if (n.type === 'supervisor') {
    const c = edges.filter((e) => e.from === n.id).length;
    return c ? `routes to ${c} agent${c > 1 ? 's' : ''}` : 'router';
  }
  const parts: string[] = [];
  const t = toolList(n.tools).length;
  if (t) parts.push(`${t} tool${t > 1 ? 's' : ''}`);
  if (isRouterNode(nodes, edges, n.id)) parts.push(`${edges.filter((e) => e.from === n.id).length} paths`);
  return parts.length ? parts.join(', ') : 'no tools';
}
