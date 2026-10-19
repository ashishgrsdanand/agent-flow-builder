import { PROVIDERS } from '../data/providers';
import type { AgentNode, Edge, GenConfig, GenResult, Graph, Marks, Plan } from '../types';
import { RECURSION_LIMIT } from './constants';
import { pyDesc, pyTriple, slug, toolList } from './helpers';

/**
 * Turns the learner's graph into Python (LangGraph) code.
 *
 * Besides the code, it returns:
 *  - marks: which lines belong to which agent, arrow or section (used for click-to-see-code)
 *  - plan:  a compact description of the compiled graph (used by the explainer and the simulator)
 *
 * It is a pure function: the same graph and settings always give the same output.
 */
export function generate(graph: Graph, cfg: GenConfig): GenResult {
  // an agent whose name was cleared is shown as "Unnamed" in the code and the plan
  const nodes = graph.nodes.map((n) => (n.name.trim() ? n : { ...n, name: 'Unnamed' }));
  const edges = graph.edges;
  const marks: Marks = { nodes: {}, edges: {}, sections: {} };
  if (!nodes.length) return { code: '# Choose a domain and load a team, or drag agents onto the canvas.\n# The code for your graph will appear here.\n', warnings: [], notes: [], meta: '', marks, plan: null, setup: null };

  const byId: Record<string, AgentNode> = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const outE = (id: string): Edge[] => edges.filter(e => e.from === id && byId[e.to]);
  const out = (id: string): AgentNode[] => outE(id).map(e => byId[e.to]);
  const sup = nodes.find(n => n.type === 'supervisor');
  const warnings: string[] = [], notes: string[] = [];
  const whenOf = (e: Edge): string => (e.when || '').trim();
  const explain = cfg.explain !== false;

  let workers: AgentNode[];
  if (sup) {
    const seen = new Set([sup.id]); const q = [sup.id];
    while (q.length) { const id = q.shift() as string; out(id).forEach(t => { if (!seen.has(t.id)) { seen.add(t.id); q.push(t.id); } }); }
    workers = nodes.filter(n => n.id !== sup.id && seen.has(n.id));
    nodes.filter(n => n.id !== sup.id && !seen.has(n.id)).forEach(n =>
      warnings.push('"' + n.name + '" is not reachable from the Supervisor, so it was left out of the code. Draw an arrow from the Supervisor to it.'));
    if (!workers.length) warnings.push('The Supervisor has no agents to route to yet. Drag from its right dot to an agent.');
  } else {
    workers = nodes.slice();
  }
  const wIds = new Set(workers.map(w => w.id));
  const handE = (id: string): Edge[] => outE(id).filter(e => byId[e.to].type !== 'supervisor' && wIds.has(e.to));
  const hand = (id: string): AgentNode[] => handE(id).map(e => byId[e.to]);
  const isRouter = (w: AgentNode): boolean => handE(w.id).some(whenOf);
  const routers = workers.filter(isRouter);
  const needPyd = !!sup || routers.length > 0;

  const reserved = new Set(['supervisor','llm','graph','workflow','route','tool','os','state','workers','nudge','ensure_user_last','choose_branch','done','start','end',
    'class','def','import','from','return','lambda','pass','if','else','elif','for','while','in','is','not','and','or','try','except','with','as','del','global','assert','yield','raise','print','list','dict','str','int']);
  const used = new Set<string>(); const ident: Record<string, string> = {};
  workers.forEach(n => {
    let base = slug(n.name); if (reserved.has(base)) base += '_agent';
    let s = base, i = 2; while (used.has(s)) s = base + '_' + (i++);
    used.add(s); ident[n.id] = s;
  });
  const toolsOf = (n: AgentNode): string[] => {
    const seen = new Set<string>();
    return toolList(n.tools).map(t => { let s = slug(t); if (reserved.has(s) || used.has(s)) s += '_tool'; return s; }).filter(s => !seen.has(s) && seen.add(s));
  };
  const allTools: string[] = [];
  workers.forEach(w => toolsOf(w).forEach(t => { if (!allTools.includes(t)) allTools.push(t); }));

  workers.forEach(w => {
    const hs = handE(w.id);
    if (isRouter(w)) {
      const defaults = hs.filter(e => !whenOf(e));
      if (defaults.length > 1) warnings.push('"' + w.name + '" has ' + defaults.length + ' paths with no condition (' + defaults.map(e => byId[e.to].name).join(', ') + '). Give all but one a condition, or the choice between them is arbitrary.');
    } else if (hs.length > 1) {
      warnings.push('"' + w.name + '" hands off to ' + hs.length + ' agents at once (' + hs.map(e => byId[e.to].name).join(', ') + '). They will run in parallel. Add a condition to each arrow if you want it to pick just one.');
    }
  });
  const cyc = (next: (id: string) => AgentNode[]): boolean => { const st: Record<string, number> = {}; const dfs = (id: string): boolean => { st[id] = 1; for (const t of next(id)) { if (st[t.id] === 1) return true; if (!st[t.id] && dfs(t.id)) return true; } st[id] = 2; return false; }; return workers.some(w => !st[w.id] && dfs(w.id)); };
  if (cyc(id => isRouter(byId[id]) ? [] : hand(id))) warnings.push('Some agents hand off to each other in a loop with no condition to break it. Add a condition to one of the arrows, or remove it, otherwise the graph runs until LangGraph\'s recursion limit stops it.');
  else if (cyc(hand)) notes.push('Some paths loop back to an earlier agent. That is fine because a condition decides when to loop, and the recursion limit (25 steps) stops a runaway loop.');

  let entries: AgentNode[] = [];
  if (!sup && workers.length) {
    entries = workers.filter(w => !edges.some(e => e.to === w.id && wIds.has(e.from)));
    if (!entries.length) { entries = [workers[0]]; warnings.push('Every agent has an incoming arrow, so "' + workers[0].name + '" is used as the entry point.'); }
    if (entries.length > 1) warnings.push('There are ' + entries.length + ' starting agents (' + entries.map(e => e.name).join(', ') + '). They will all start in parallel. Add a Supervisor if you want one agent to decide.');
  }

  const anyTools = allTools.length > 0;
  const prov = PROVIDERS[cfg.provider] ?? PROVIDERS.gemini;
  const model = ((cfg.models && cfg.models[cfg.provider]) || prov.model).trim();
  const doneTarget = sup ? '"supervisor"' : 'END';

  /* ---- writing helpers: every array item is exactly one line, so line numbers can be tracked ---- */
  const L: string[] = [];
  const P = (...s: string[]): void => s.forEach(x => String(x).split('\n').forEach(l => L.push(l)));
  const C = (...s: string[]): void => { if (explain) P(...s); };
  const here = () => L.length;
  const addM = (kind: 'nodes' | 'edges', key: string, a: number, b: number): void => { (marks[kind][key] = marks[kind][key] || []).push([a, b]); };
  const PM = (kind: 'nodes' | 'edges', key: string, text: string): void => { P(text); addM(kind, key, here(), here()); };
  let curSec: { key: string; start: number } | null = null;
  const closeSec = () => { if (curSec) { marks.sections[curSec.key] = [curSec.start, here()]; curSec = null; } };
  const sec = (key: string, title: string): void => { closeSec(); P('', '# ' + '-'.repeat(4) + ' ' + title + ' ' + '-'.repeat(Math.max(3, 64 - title.length))); curSec = { key, start: here() }; };
  const routeEdge = (r: string): Edge => { const w = workers.find((x) => ident[x.id] === r) as AgentNode; return edges.find((x) => x.from === (sup as AgentNode).id && x.to === w.id) as Edge; };

  P('"""',
    'Multi-agent system generated by Agent Flow Builder',
    sup ? 'Pattern: a supervisor routes work to specialist agents (LangGraph + ' + prov.label.replace(/ \(.*\)/, '') + ')' : 'Pattern: a fixed pipeline of agents (LangGraph + ' + prov.label.replace(/ \(.*\)/, '') + ')',
    routers.length ? 'Some agents choose their next step with conditional routing.' : '',
    '',
    'Setup:',
    '    pip install -U langgraph langchain-core ' + prov.pkg + (needPyd ? ' pydantic' : ''),
    prov.env ? '    export ' + prov.env + '="your-key"   # create one at ' + prov.keyUrl : '    ollama pull ' + model + '   # then keep the Ollama app running',
    '"""');
  if (!routers.length) L.splice(L.length - 6, 1);   // drop the empty line when there is no routing note
  if (prov.env) P('import os');
  if (needPyd) P('from typing import Literal');
  P('');
  if (needPyd) {
    const pyd = []; if (sup) pyd.push('BaseModel'); pyd.push('Field'); if (routers.length) pyd.push('create_model');
    P('from pydantic import ' + pyd.join(', '));
  }
  P('from langchain_core.messages import AIMessage, HumanMessage, SystemMessage');
  if (anyTools) P('from langchain_core.tools import tool');
  P(prov.imp,
    'from langgraph.graph import END, START, MessagesState, StateGraph');
  if (anyTools) P('from langgraph.prebuilt import create_react_agent');
  if (prov.env) P('', 'if not os.getenv("' + prov.env + '"):',
    '    raise RuntimeError("Set ' + prov.env + ' first: ' + prov.keyUrl + '")');
  marks.sections.imports = [1, here()];

  sec('model', '1. Model');
  C('# The model client. All agents share this one object. To switch AI providers you only change these lines.');
  if (!prov.env) P('# Tip: use a model that supports tool calling (like llama3.1). Routing and tools need it.');
  P('llm = ' + prov.cls + '(model=' + JSON.stringify(model) + ', temperature=0)',
    '',
    'NUDGE = "Continue with your part of the task."',
    '',
    '',
    'def ensure_user_last(messages, nudge=NUDGE):',
    '    """Chat models work best when the conversation ends on a user turn, so add one if needed."""',
    '    messages = list(messages)',
    '    if messages and not isinstance(messages[-1], HumanMessage):',
    '        messages.append(HumanMessage(content=nudge))',
    '    return messages');

  let n = 2;
  if (anyTools) {
    sec('tools', n++ + '. Tools (stubs: fill these in with your real logic)');
    C('# A tool is an ordinary Python function that the model is allowed to call, for example to look something up.');
    P('# The model reads each docstring to decide when to call the tool.');
    allTools.forEach(t => {
      P('', '', '@tool', 'def ' + t + '(query: str) -> str:',
        '    """Describe what ' + t + ' does. The model reads this to decide when to use it."""',
        '    return "TODO: implement ' + t + '"');
    });
  }

  sec('state', n++ + '. Shared state');
  C('# The "state" is a shared notebook that every node can read and write.',
    '# MessagesState already has a `messages` list that grows as agents add their replies.');
  if (sup) {
    C('# We add one extra field, `next`, so the supervisor can leave a note saying who goes next.');
    P('class AgentState(MessagesState):', '    next: str  # the supervisor\'s latest routing decision');
  } else P('class AgentState(MessagesState):', '    """Shared state: the running list of messages."""');

  sec('agents', n++ + '. Agents');
  C('# Each agent is a "node": a normal Python function that receives the state',
    '# and returns the changes to make to it. Here the change is one new message.');
  workers.forEach((w, wi) => {
    const id = ident[w.id], PN = id.toUpperCase() + '_PROMPT', tl = toolsOf(w);
    P('');
    const s0 = here() + 1;
    P('# ' + w.name.replace(/[\r\n]+/g, ' '), PN + ' = ' + pyTriple(w.prompt), '');
    if (tl.length) {
      if (wi === 0) C('# create_react_agent builds a small loop: the model may call a tool, read the result, then answer.');
      P(id + '_executor = create_react_agent(',
        '    llm,',
        '    tools=[' + tl.join(', ') + '],',
        '    prompt=' + PN + ',  # older langgraph versions call this state_modifier=',
        ')', '', '',
        'def ' + id + '(state: AgentState):',
        '    messages = ensure_user_last(state["messages"])',
        '    result = ' + id + '_executor.invoke({"messages": messages})',
        '    reply = result["messages"][-1].content  # final answer after any tool calls',
        '    return {"messages": [AIMessage(content=reply, name="' + id + '")]}');
    } else {
      P('', 'def ' + id + '(state: AgentState):');
      if (wi === 0) C('    # 1) the instructions + the conversation go to the model  2) its reply becomes a message from this agent');
      P('    messages = [SystemMessage(content=' + PN + ')] + state["messages"]',
        '    response = llm.invoke(ensure_user_last(messages))',
        '    return {"messages": [AIMessage(content=response.content, name="' + id + '")]}');
    }
    addM('nodes', w.id, s0, here());
    P('');
  });
  while (L[L.length - 1] === '') L.pop();

  let routes: string[] = [];
  if (sup) {
    routes = [...new Set(out(sup.id).filter(t => wIds.has(t.id)).map(t => ident[t.id]))];
    sec('supervisor', n++ + '. Supervisor');
    C('# The supervisor is a node too, but it writes no answer. It only decides who goes next.');
    P('');
    const sS = here() + 1;
    P('# ' + sup.name.replace(/[\r\n]+/g, ' ') + ' (the supervisor)', 'SUPERVISOR_PROMPT = ' + pyTriple(sup.prompt), '',
      '# The supervisor reads these descriptions to decide who should act next.',
      'WORKERS = {');
    routes.forEach(r => {
      const w = workers.find((x) => ident[x.id] === r) as AgentNode, e = routeEdge(r);
      const hint = e && whenOf(e) ? ' Choose this agent only when: ' + whenOf(e) : '';
      PM('edges', e.id, '    "' + r + '": ' + pyDesc((w.desc || w.name) + hint) + ',');
    });
    P('}', '', '');
    C('# Route forces the model to answer in a fixed shape, so we always get one valid name instead of free text.');
    P('class Route(BaseModel):',
      '    """The supervisor\'s decision."""',
      '    next: Literal[' + [...routes, 'FINISH'].map(r => '"' + r + '"').join(', ') + '] = Field(',
      '        description="The agent that should act next, or FINISH when the request is fully handled."',
      '    )', '', '',
      'def supervisor(state: AgentState):');
    C('    # The supervisor writes no answer. It picks the next agent and saves the choice in state["next"].');
    P('    team = "\\n".join(f"- {name}: {desc}" for name, desc in WORKERS.items())',
      '    system = f"{SUPERVISOR_PROMPT}\\n\\nYour team:\\n{team}"',
      '    messages = [SystemMessage(content=system)] + state["messages"]',
      '    decision = llm.with_structured_output(Route).invoke(',
      '        ensure_user_last(messages, "Who should act next? Answer FINISH if the request is fully handled.")',
      '    )',
      '    return {"next": decision.next}');
    addM('nodes', sup.id, sS, here());
  }

  if (routers.length) {
    sec('routing', n++ + '. Conditional routing');
    P('# After these agents finish, the model reads the conversation and picks one path.',
      '# DONE means no path applies, so ' + (sup ? 'control returns to the supervisor.' : 'the run ends.'),
      '',
      '',
      'def choose_branch(state: AgentState, branches: dict[str, str]) -> str:',
      '    """Ask the model which branch fits best. `branches` maps each option to when it applies."""',
      '    options = "\\n".join(f"- {name}: {when}" for name, when in branches.items())',
      '    Choice = create_model(',
      '        "Choice",',
      '        next=(Literal[tuple(branches)], Field(description="The single best next step.")),',
      '    )',
      '    system = "You are a router. Read the conversation and pick the single best next step.\\n\\nOptions:\\n" + options',
      '    messages = [SystemMessage(content=system)] + state["messages"]',
      '    decision = llm.with_structured_output(Choice).invoke(',
      '        ensure_user_last(messages, "Which option applies now?")',
      '    )',
      '    return decision.next');
    routers.forEach(w => {
      const id = ident[w.id], hs = handE(w.id), hasDefault = hs.some(e => !whenOf(e));
      P('', '');
      const sB = here() + 1;
      P(id.toUpperCase() + '_BRANCHES = {');
      hs.forEach(e => PM('edges', e.id, '    "' + ident[e.to] + '": ' + pyDesc(whenOf(e) || 'none of the other options apply (default path)') + ','));
      if (!hasDefault) PM('edges', 'done:' + w.id, '    "DONE": ' + pyDesc('none of the above apply; the work is finished here') + ',');
      P('}', '', '',
        'def route_after_' + id + '(state: AgentState) -> str:',
        '    return choose_branch(state, ' + id.toUpperCase() + '_BRANCHES)');
      addM('nodes', w.id, sB, here());
    });
  }

  const condEdges = (w: AgentNode): void => {
    const id = ident[w.id], hs = handE(w.id), hasDefault = hs.some(e => !whenOf(e));
    const s0 = here() + 1;
    P('workflow.add_conditional_edges(', '    "' + id + '",', '    route_after_' + id + ',', '    {');
    hs.forEach(e => PM('edges', e.id, '        "' + ident[e.to] + '": "' + ident[e.to] + '",'));
    if (!hasDefault) PM('edges', 'done:' + w.id, '        "DONE": ' + doneTarget + ',');
    P('    },', ')');
    addM('nodes', w.id, s0, here());
  };

  sec('graph', n++ + '. Build the graph');
  C('# Step 1: register every node under a name.');
  P('workflow = StateGraph(AgentState)');
  if (sup) PM('nodes', sup.id, 'workflow.add_node("supervisor", supervisor)');
  workers.forEach(w => PM('nodes', w.id, 'workflow.add_node("' + ident[w.id] + '", ' + ident[w.id] + ')'));
  P('');
  C('# Step 2: connect the nodes with edges. START is where a run begins and END is where it stops.');
  if (sup) {
    PM('edges', 'start', 'workflow.add_edge(START, "supervisor")');
    addM('nodes', sup.id, here(), here());
    P('', '# The supervisor picks the next agent (or ends the run).');
    C('# A conditional edge calls a function and uses its answer to choose the next node.');
    P('workflow.add_conditional_edges(', '    "supervisor",', '    lambda state: state["next"],', '    {');
    routes.forEach(r => PM('edges', routeEdge(r).id, '        "' + r + '": "' + r + '",'));
    PM('edges', 'finish', '        "FINISH": END,');
    P('    },', ')');
    const plain = workers.filter(w => !isRouter(w));
    const back = plain.filter(w => !hand(w.id).length), chain = plain.filter(w => hand(w.id).length);
    if (back.length) { P('', '# These agents report back to the supervisor when they finish.'); back.forEach(w => PM('edges', 'back:' + w.id, 'workflow.add_edge("' + ident[w.id] + '", "supervisor")')); }
    if (chain.length) { P('', '# Fixed handoffs you drew on the canvas: A always runs before B.'); chain.forEach(w => handE(w.id).forEach(e => PM('edges', e.id, 'workflow.add_edge("' + ident[w.id] + '", "' + ident[e.to] + '")'))); }
    if (routers.length) { P('', '# Conditional paths: after these agents finish, the model picks one.'); routers.forEach(condEdges); }
  } else {
    entries.forEach(e => PM('edges', 'start', 'workflow.add_edge(START, "' + ident[e.id] + '")'));
    P('');
    workers.forEach(w => {
      if (isRouter(w)) { condEdges(w); return; }
      const hs = handE(w.id);
      if (hs.length) hs.forEach(e => PM('edges', e.id, 'workflow.add_edge("' + ident[w.id] + '", "' + ident[e.to] + '")'));
      else PM('edges', 'end:' + w.id, 'workflow.add_edge("' + ident[w.id] + '", END)');
    });
  }
  P('');
  C('# compile() checks the graph for mistakes and turns it into something you can run.');
  P('graph = workflow.compile()',
    '# print(graph.get_graph().draw_mermaid())  # paste the output into mermaid.live to see your graph');

  sec('run', n++ + '. Run it');
  C('# invoke() runs the graph from START to END and returns the final state.',
    '# Change the message below to try other requests.');
  P('if __name__ == "__main__":',
    '    result = graph.invoke(',
    '        {"messages": [HumanMessage(content="Hi! I need some help, can you get started?")]},',
    '        config={"recursion_limit": 25},  # safety stop against endless loops',
    '    )',
    '    for m in result["messages"]:',
    '        who = getattr(m, "name", None) or m.type',
    '        print(f"[{who}] {m.content}\\n")');
  closeSec();

  /* ---- a plain description of the compiled graph, used by the simulator and the explainer ---- */
  const plan: Plan = { sup: sup ? { id: sup.id, name: sup.name } : null, limit: RECURSION_LIMIT, done: sup ? 'supervisor' : 'END', entries: entries.map((e) => e.id), routes: [], workers: {} };
  if (sup) plan.routes = routes.map((r) => { const w = workers.find((x) => ident[x.id] === r) as AgentNode, e = routeEdge(r); return { edge: e.id, to: w.id, when: whenOf(e) }; });
  workers.forEach(w => {
    const hs = handE(w.id), router = isRouter(w);
    plan.workers[w.id] = { id: w.id, name: w.name, ident: ident[w.id], tools: toolsOf(w),
      mode: router ? 'router' : hs.length ? 'chain' : (sup ? 'back' : 'end'),
      next: router ? [] : hs.map(e => ({ edge: e.id, to: e.to })),
      branches: router ? hs.map(e => ({ edge: e.id, to: e.to, when: whenOf(e) })) : [],
      hasDefault: router ? hs.some(e => !whenOf(e)) : false };
  });

  return { code: L.join('\n') + '\n', warnings, notes, marks, plan,
    setup: { pkg: prov.pkg, pyd: needPyd, env: prov.env, keyUrl: prov.keyUrl, model, label: prov.label, tools: anyTools },
    meta: (sup ? 'Supervisor mode' : 'Pipeline mode') + ', ' + workers.length + ' agent' + (workers.length === 1 ? '' : 's') + (routers.length ? ', ' + routers.length + ' branching' : '') };
}
