/* Shared types for the whole app. Keep this file free of runtime code. */

export type NodeType = 'supervisor' | 'agent';
export type ProviderKey = 'gemini' | 'claude' | 'openai' | 'ollama';
export type TabName = 'learn' | 'code' | 'sim' | 'agent';

/* ---------- the graph the learner draws ---------- */

export interface AgentNode {
  id: string;
  type: NodeType;
  name: string;
  desc: string;
  prompt: string;
  /** comma-separated tool names */
  tools: string;
  /** index into the 5 agent colours (ignored for the supervisor) */
  color: number;
  x: number;
  y: number;
}

export interface Edge {
  id: string;
  from: string;
  to: string;
  /** optional condition; empty means "always" */
  when: string;
}

export interface Graph {
  nodes: AgentNode[];
  edges: Edge[];
}

export interface MyAgent {
  id: string;
  name: string;
  desc: string;
}

export type Selection = { k: 'node' | 'edge'; id: string } | null;

/* ---------- static data ---------- */

export type AgentDef = [name: string, desc: string, tools: string];

export interface DomainDef {
  label: string;
  team: string;
  note?: string;
  flows?: [from: number, to: number, when: string][];
  agents: AgentDef[];
}

export interface ProviderDef {
  label: string;
  model: string;
  pkg: string;
  imp: string;
  cls: string;
  env: string;
  keyUrl: string;
}

export interface PaletteItem {
  key: string;
  kind: NodeType;
  name: string;
  desc: string;
  tools?: string;
  color?: number;
}

export interface NodeOpts {
  name?: string;
  desc?: string;
  prompt?: string;
  tools?: string;
  color?: number;
}

/* ---------- code generation ---------- */

export type Range = [start: number, end: number];

/** Which lines of the generated code belong to which agent, arrow or section (1-based, inclusive). */
export interface Marks {
  nodes: Record<string, Range[]>;
  edges: Record<string, Range[]>;
  sections: Record<string, Range>;
}

export type WorkerMode = 'router' | 'chain' | 'back' | 'end';

export interface PlanWorker {
  id: string;
  name: string;
  ident: string;
  tools: string[];
  mode: WorkerMode;
  next: { edge: string; to: string }[];
  branches: { edge: string; to: string; when: string }[];
  hasDefault: boolean;
}

/** A compact description of the compiled graph. The explainer and the simulator both read it. */
export interface Plan {
  sup: { id: string; name: string } | null;
  limit: number;
  done: 'supervisor' | 'END';
  entries: string[];
  routes: { edge: string; to: string; when: string }[];
  workers: Record<string, PlanWorker>;
}

export interface SetupInfo {
  pkg: string;
  pyd: boolean;
  env: string;
  keyUrl: string;
  model: string;
  label: string;
  tools: boolean;
}

export interface GenConfig {
  provider: ProviderKey;
  models: Record<ProviderKey, string>;
  explain: boolean;
}

export interface GenResult {
  code: string;
  warnings: string[];
  notes: string[];
  marks: Marks;
  plan: Plan | null;
  setup: SetupInfo | null;
  meta: string;
}

/* ---------- simulation ---------- */

export interface SimOption {
  value: string;
  label: string;
  to: string;
  edge: string;
  hint: string;
}

export type SimPending =
  | { kind: 'go'; to: string; edge: string; label: string }
  | { kind: 'choose'; who: 'supervisor' | 'router'; node: string; options: SimOption[] };

export interface SimMessage {
  role: 'human' | 'ai';
  name: string;
  text: string;
}

export interface SimState {
  cur: string;
  pending: SimPending | null;
  done: boolean;
  error: string | null;
  next: string | null;
  trace: string[];
  walked: string[];
  visited: string[];
  runs: number;
  calls: number;
  queue: { edge: string; to: string }[];
  messages: SimMessage[];
  title: string;
  text: string;
  focus: { nodes: string[]; edges: string[] };
}

export type SimAction = 'next' | { choose: string };

export interface SimSession {
  request: string;
  actions: SimAction[];
  /** signature of the plan the session started with, used to detect edits */
  sig: string;
}

/* ---------- saved files ---------- */

export interface SavedFile {
  v: number;
  provider: ProviderKey;
  models: Record<ProviderKey, string>;
  domain: string;
  overrides: Record<string, string>;
  myAgents: MyAgent[];
  /** added later; older files do not have it */
  teamName?: string;
  nodes: AgentNode[];
  edges: Edge[];
}
