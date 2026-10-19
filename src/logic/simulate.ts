import type { Plan, PlanWorker, SimAction, SimOption, SimState } from '../types';

/* ---- the simulator: replays what LangGraph would do, with the learner playing the model ---- */
export function simOptionsSup(plan: Plan): SimOption[] {
  return plan.routes.map(r => ({ value: plan.workers[r.to].ident, label: plan.workers[r.to].name, to: r.to, edge: r.edge, hint: r.when || '' }))
    .concat([{ value: 'FINISH', label: 'FINISH', to: 'END', edge: 'finish', hint: 'the request is fully handled' }]);
}
export function simOptionsRouter(plan: Plan, w: PlanWorker): SimOption[] {
  const o: SimOption[] = w.branches.map(b => ({ value: plan.workers[b.to].ident, label: plan.workers[b.to].name, to: b.to, edge: b.edge, hint: b.when || 'otherwise (default path)' }));
  if (!w.hasDefault) o.push({ value: 'DONE', label: 'DONE', to: plan.done === 'supervisor' && plan.sup ? plan.sup.id : 'END', edge: 'done:' + w.id, hint: 'none of the conditions apply' });
  return o;
}
export function simCompute(plan: Plan, request: string, actions: SimAction[]): SimState {
  const W = plan.workers, supId = plan.sup ? plan.sup.id : null;
  const nm = (id: string): string => id === 'END' ? 'END' : id === supId ? (plan.sup ? plan.sup.name : id) : (W[id] ? W[id].name : id);
  const code = (t: string): string => '`' + t + '`';
  const list = (a: string[]): string => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  const s: SimState = { cur: 'START', pending: null, done: false, error: null, next: null, trace: ['START'], walked: [], visited: [], runs: 0, calls: 0, queue: [],
    messages: [{ role: 'human', name: '', text: request }], title: '', text: '', focus: { nodes: [], edges: [] } };
  const setGo = (to: string, edge: string): void => { s.pending = { kind: 'go', to, edge, label: nm(to) }; };

  const afterWorker = (w: PlanWorker): void => {
    if (w.mode === 'router') {
      s.pending = { kind: 'choose', who: 'router', node: w.id, options: simOptionsRouter(plan, w) };
      s.text += ' This agent has conditional paths. ' + code('route_after_' + w.ident) + ' asks the model which condition fits best. Choose what you think it would answer.';
      return;
    }
    let target: { edge: string; to: string };
    if (w.mode === 'chain') {
      target = w.next[0]; s.queue.push(...w.next.slice(1));
      s.text += ' You drew an arrow from this agent to ' + list(w.next.map(x => nm(x.to))) + ', which becomes ' + code('add_edge("' + w.ident + '", ...)') + ', so ' + nm(target.to) + ' runs next.' +
        (w.next.length > 1 ? ' (Real LangGraph runs the extra targets at the same time. This simulation runs them one after another.)' : '');
    } else if (s.queue.length) {
      target = s.queue.shift() as { edge: string; to: string };
      s.text += ' Another agent was started at the same time and is still waiting, so it runs next.';
    } else if (w.mode === 'back') {
      target = { edge: 'back:' + w.id, to: supId as string };
      s.text += ' No arrow leaves this agent, so the code has ' + code('add_edge("' + w.ident + '", "supervisor")') + ' and control returns to the Supervisor.';
    } else {
      target = { edge: 'end:' + w.id, to: 'END' };
      s.text += ' No arrow leaves this agent and there is no Supervisor, so the run goes to END.';
    }
    s.focus.edges = [target.edge];
    setGo(target.to, target.edge);
  };

  const goTo = (to: string, edgeKey: string): void => {
    s.walked.push(edgeKey);
    if (to === 'END') {
      s.cur = 'END'; s.trace.push('END'); s.done = true; s.pending = null;
      s.title = 'Finished';
      s.text = 'The run reached END. ' + code('graph.invoke()') + ' returns the final state: the whole ' + code('messages') + ' list shown below. It took ' + s.runs + ' node runs and about ' + s.calls + ' model calls.';
      s.focus = { nodes: [], edges: [edgeKey] };
      return;
    }
    s.runs++;
    if (s.runs > plan.limit) {
      s.done = true; s.error = 'GraphRecursionError'; s.pending = null;
      s.title = 'Stopped: recursion limit';
      s.text = 'After ' + plan.limit + ' node runs LangGraph stops with ' + code('GraphRecursionError') + '. That is the safety limit set by ' + code('config={"recursion_limit": 25}') + '. It protects you from endless loops, like agents that keep sending work back and forth.';
      s.focus = { nodes: [], edges: [] };
      return;
    }
    s.cur = to; s.trace.push(to); s.visited.push(to);
    s.focus = { nodes: [to], edges: [edgeKey] };
    if (to === supId) {
      s.calls++;
      s.title = 'Supervisor decides';
      s.text = 'The Supervisor is a node, so LangGraph calls ' + code('supervisor(state)') + '. ' + (s.runs > 1 ? 'An agent just reported back, so it looks at the conversation again. ' : '') +
        'It sends the conversation and your list of agents to the model and asks for a ' + code('Route') + ' answer. The model must reply with exactly one of the options below. Choose the one you think it would pick.';
      s.pending = { kind: 'choose', who: 'supervisor', node: supId, options: simOptionsSup(plan) };
      return;
    }
    const w = W[to];
    s.calls++;
    s.title = w.name + ' runs';
    s.text = w.name + ' is a node: the function ' + code(w.ident + '(state)') + '. ' +
      (w.tools.length ? 'It is a ReAct agent, so the model may call its tools (' + w.tools.join(', ') + ') before it answers. ' : 'It sends its instructions plus the conversation to the model. ') +
      'Its reply is added to ' + code('messages') + ' (a placeholder here, because this simulation does not call a real model).';
    s.messages.push({ role: 'ai', name: w.ident, text: '[' + w.name + ' would write its reply here]' });
    afterWorker(w);
  };

  const decide = (opt: SimOption): void => {
    const p = s.pending; s.pending = null;
    if (!p || p.kind !== 'choose') return;
    if (p.who === 'supervisor') {
      s.next = opt.value;
      s.title = 'Supervisor chose ' + opt.label;
      s.text = 'The model answered ' + code('"' + opt.value + '"') + '. The supervisor saved it as ' + code('state["next"]') + '. ' +
        (opt.value === 'FINISH' ? 'The conditional edge maps FINISH to END, so the run will stop.' : 'The conditional edge looks that value up in its mapping and sends the run to ' + opt.label + '.');
      s.focus = { nodes: [supId as string], edges: [opt.edge] };
    } else {
      const w = W[p.node]; s.calls++;
      s.title = w.name + ' chose ' + opt.label;
      s.text = 'The model answered ' + code('"' + opt.value + '"') + '. ' + code('add_conditional_edges') + ' looks that up in its mapping to find the next node.' +
        (opt.value === 'DONE' ? ' DONE means no condition matched, so control ' + (plan.done === 'supervisor' ? 'returns to the Supervisor' : 'goes to END') + '.' : '');
      s.focus = { nodes: [w.id], edges: [opt.edge] };
    }
    setGo(opt.to, opt.edge);
  };

  // start
  const first = plan.sup ? supId : plan.entries[0];
  if (!first) { s.done = true; s.title = 'Nothing to run'; s.text = 'Add an agent first.'; return s; }
  if (!plan.sup) s.queue = plan.entries.slice(1).map(id => ({ edge: 'start', to: id }));
  s.title = 'Start';
  s.text = 'Every run begins at START. The shared state starts with one message: your request. LangGraph follows the edge from START to ' + code(plan.sup ? 'supervisor' : W[first].ident) + '.';
  s.focus = { nodes: [], edges: ['start'] };
  setGo(first, 'start');

  for (const a of actions) {
    if (s.done || !s.pending) break;
    if (a === 'next') { if (s.pending.kind !== 'go') continue; const p = s.pending; s.pending = null; goTo(p.to, p.edge); }
    else if (a && a.choose !== undefined) { if (s.pending.kind !== 'choose') continue; const opt = s.pending.options.find(o => o.value === a.choose); if (opt) decide(opt); }
  }
  return s;
}
/* what the "Let the simulator pick" button and auto-play do: visit new agents first, then stop */
export function simAuto(s: SimState | null): SimAction | null {
  const p = s && s.pending; if (!p) return null;
  if (p.kind === 'go') return 'next';
  const seen = new Set(s.visited);
  const fresh = p.options.find(o => o.value !== 'FINISH' && o.value !== 'DONE' && !seen.has(o.to));
  if (fresh) return { choose: fresh.value };
  const stop = p.options.find(o => o.value === 'FINISH' || o.value === 'DONE');
  return { choose: (stop || p.options[0]).value };
}
