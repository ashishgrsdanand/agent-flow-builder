/*
 * Words shown in the Learn tab and the code-section guide.
 * Text uses a tiny markup: `code` for code and **bold** for emphasis (see components/ui/Rich.tsx).
 */

export const SECTION_INFO: Record<string, { title: string; text: string }> = {
  imports: { title: 'Imports', text: 'The libraries the code needs.' },
  model: { title: 'Model', text: 'The AI model every agent shares. Switching provider only changes these lines.' },
  tools: { title: 'Tools', text: 'Functions the model may call. They are empty stubs for you to fill in.' },
  state: { title: 'Shared state', text: 'The notebook that every node reads from and writes to.' },
  agents: { title: 'Agents', text: 'One function per agent. Each function is a node.' },
  supervisor: { title: 'Supervisor', text: 'The node that decides which agent goes next.' },
  routing: { title: 'Conditional routing', text: 'How an agent lets the model choose between paths.' },
  graph: { title: 'Build the graph', text: 'Registers every node and connects them with edges.' },
  run: { title: 'Run it', text: 'Starts the graph with a first message and prints the conversation.' }
};

/** The order sections appear in the generated code (and in the guide). */
export const SECTION_ORDER = Object.keys(SECTION_INFO);

export const GLOSSARY: [term: string, text: string][] = [
  ['State', 'A shared notebook that every node can read and write. Here it holds `messages`, the conversation so far (and `next` when there is a Supervisor).'],
  ['Node', 'A normal Python function that receives the state and returns the changes to make to it. Each agent is a node.'],
  ['Edge', 'An arrow that says which node runs after which: `workflow.add_edge("a", "b")`. Your solid arrows become edges.'],
  ['Conditional edge', 'An edge where a function decides the next node. `add_conditional_edges` takes a source node, a function that returns a key, and a mapping from keys to nodes. The Supervisor and your orange arrows use it.'],
  ['Supervisor pattern', 'One node decides who works next. Workers report back to it, so it can pick another worker or stop. It is easy to understand, but every step costs an extra model call.'],
  ['Reducer', '`MessagesState` has a rule (a "reducer") that appends new messages instead of replacing the list. That is why each agent only returns its own reply.'],
  ['Structured output', 'Asking the model to answer in a fixed shape, like the `Route` class, so your code receives exactly one allowed value instead of free text.'],
  ['Tools and ReAct', 'A tool is a function the model may call. A ReAct agent loops: think, call a tool, read the result, answer. `create_react_agent` builds that loop for you.'],
  ['START and END', 'Two special nodes. A run begins at START and stops at END.'],
  ['Recursion limit', 'A safety stop on the number of steps (25 here). Without it, agents that keep passing work back and forth would run forever.'],
  ['compile()', 'Checks the graph for mistakes and turns it into an object you can run with `invoke()`.']
];

export const EXPERIMENTS: string[] = [
  'Load the **smallest example**, open Code, and click each agent on the canvas. Watch which lines light up.',
  'Draw an arrow from one agent to another. Find the new `add_edge` line, and notice that the "report back to supervisor" line disappears for that agent.',
  'Double-click that arrow and type a condition, then add a second arrow with a condition from the same agent. Watch a `route_after_...` function appear.',
  'Open **Simulate** and run your graph. Choose different answers at each decision and compare the paths.',
  'Load the **writer and reviewer loop**, simulate it, and keep choosing "needs fixes" until the recursion limit stops it.',
  'Rename an agent. The function name in the code changes with it.',
  'Delete the Supervisor. The code switches from the supervisor pattern to a simple pipeline.',
  'Switch the provider. Only a few lines change, which shows how little depends on the AI vendor.'
];
