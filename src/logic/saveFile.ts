import { DOMAINS } from '../data/domains';
import { PROVIDERS, PROVIDER_KEYS } from '../data/providers';
import type { AgentNode, Edge, MyAgent, ProviderKey, SavedFile } from '../types';

export const SAVE_VERSION = 3;

export interface SaveInput {
  provider: ProviderKey;
  models: Record<ProviderKey, string>;
  domain: string;
  overrides: Record<string, string>;
  myAgents: MyAgent[];
  teamName: string;
  nodes: AgentNode[];
  edges: Edge[];
}

/** The text of the .json file the Save button downloads. */
export function serializeSave(s: SaveInput): string {
  const file: SavedFile = {
    v: SAVE_VERSION,
    provider: s.provider,
    models: s.models,
    domain: s.domain,
    overrides: s.overrides,
    myAgents: s.myAgents,
    teamName: s.teamName,
    nodes: s.nodes,
    edges: s.edges,
  };
  return JSON.stringify(file, null, 2);
}

export interface LoadedSave {
  nodes: AgentNode[];
  edges: Edge[];
  myAgents: MyAgent[];
  overrides: Record<string, string>;
  teamName: string;
  domain: string | null;
  provider: ProviderKey | null;
  models: Partial<Record<ProviderKey, string>>;
  nextId: number;
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null;

/**
 * Reads a saved file. Throws if it is not a layout from this app.
 * Older saves are accepted: per-role node types become plain agents, and a single
 * "model" field becomes the Gemini model.
 */
export function parseSave(text: string): LoadedSave {
  const d: unknown = JSON.parse(text);
  if (!isObj(d) || !Array.isArray(d.nodes) || !Array.isArray(d.edges)) throw new Error('Not a saved layout');

  const nodes: AgentNode[] = d.nodes
    .filter((n): n is Record<string, unknown> => isObj(n) && typeof n.id === 'string')
    .map((n) => ({
      id: String(n.id),
      type: n.type === 'supervisor' ? 'supervisor' : 'agent',
      name: typeof n.name === 'string' ? n.name : 'Agent',
      desc: typeof n.desc === 'string' ? n.desc : '',
      prompt: typeof n.prompt === 'string' ? n.prompt : '',
      tools: typeof n.tools === 'string' ? n.tools : '',
      color: Number.isInteger(n.color) ? Number(n.color) : 4,
      x: Number(n.x) || 0,
      y: Number(n.y) || 0,
    }));
  const ids = new Set(nodes.map((n) => n.id));
  const edges: Edge[] = d.edges
    .filter((e): e is Record<string, unknown> => isObj(e) && typeof e.id === 'string' && ids.has(String(e.from)) && ids.has(String(e.to)))
    .map((e) => ({ id: String(e.id), from: String(e.from), to: String(e.to), when: typeof e.when === 'string' ? e.when : '' }));
  const myAgents: MyAgent[] = Array.isArray(d.myAgents)
    ? d.myAgents
        .filter((a): a is Record<string, unknown> => isObj(a) && typeof a.id === 'string' && typeof a.name === 'string' && a.name !== '')
        .map((a) => ({ id: String(a.id), name: String(a.name), desc: typeof a.desc === 'string' ? a.desc : '' }))
    : [];
  const overrides: Record<string, string> = {};
  if (isObj(d.overrides)) for (const [k, v] of Object.entries(d.overrides)) if (typeof v === 'string') overrides[k] = v;

  const models: Partial<Record<ProviderKey, string>> = {};
  if (isObj(d.models)) {
    for (const k of PROVIDER_KEYS) {
      const v = d.models[k];
      if (typeof v === 'string' && v) models[k] = v;
    }
  } else if (typeof d.model === 'string' && d.model) {
    models.gemini = d.model; // saves from the first version were Gemini only
  }
  let provider: ProviderKey | null = null;
  if (typeof d.provider === 'string' && d.provider in PROVIDERS) provider = d.provider as ProviderKey;
  else if (!isObj(d.models) && typeof d.model === 'string') provider = 'gemini';

  const domain = typeof d.domain === 'string' && d.domain in DOMAINS ? d.domain : null;
  const maxId = Math.max(0, ...[...nodes, ...edges, ...myAgents].map((x) => parseInt(x.id.slice(1), 10) || 0));
  const teamName = typeof d.teamName === 'string' ? d.teamName : '';
  return { nodes, edges, myAgents, overrides, teamName, domain, provider, models, nextId: maxId + 1 };
}
