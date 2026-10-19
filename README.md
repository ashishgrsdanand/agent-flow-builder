# Agent Flow Builder

Draw a team of AI agents, get the [LangGraph](https://langchain-ai.github.io/langgraph/) code for it, and watch step by step how the graph runs.
Made for **learning**: you do not need to know how to code to understand the flow, and you can copy the generated Python into your own project.

- **Build** by dragging agents onto a canvas and connecting them. Pick a ready-made domain (hospitality, education, healthcare and more) or start blank.
- **Read** the generated Python. Click any agent or arrow and the matching lines light up.
- **Simulate** a run with no API key. You play the model and choose its answers, and the canvas shows where the run is.
- **Learn** with a plain-English description of your own graph, a guide to reading the code, and a glossary.

It runs entirely in the browser. There is no server, no account, and no AI inside the app: the same design always produces the same code.

## Quick start

You need [Node.js](https://nodejs.org) 20.19 or newer.

```bash
npm install
npm run dev        # open the address it prints
```

| Command             | What it does                                           |
| ------------------- | ------------------------------------------------------ |
| `npm run dev`       | Start the app with live reload                         |
| `npm run build`     | Build the site into `dist/`                            |
| `npm run preview`   | Serve the built site locally                           |
| `npm test`          | Run all tests once                                     |
| `npm run test:watch`| Re-run tests as you edit                               |
| `npm run typecheck` | Check the TypeScript types                             |

## Project structure

```
.
├── index.html                  Page shell (Vite entry)
├── vite.config.ts              Build and test settings
├── public/favicon.svg
├── netlify.toml                Hosting settings for Netlify
├── .nvmrc                      Node version (22)
├── .github/workflows/ci.yml    Runs types, tests and a build on every push
├── src/
│   ├── main.tsx                Starts React
│   ├── App.tsx                 Layout: header, palette, canvas, side panel
│   ├── types.ts                Every shared type, in one place
│   │
│   ├── data/                   Plain data. Edit these to change what the app offers.
│   │   ├── domains.ts          The 15 domains and their ready-made agents
│   │   ├── providers.ts        Gemini, Claude, OpenAI, Ollama settings
│   │   └── learn.ts            Glossary, experiments, code-section descriptions
│   │
│   ├── logic/                  The brain. Pure functions: no React, no browser.
│   │   ├── generate.ts         Graph -> Python code, line map and plan
│   │   ├── explain.ts          Plan -> plain-English description
│   │   ├── simulate.ts         Plan -> step-by-step simulation
│   │   ├── graph.ts            Creating agents, ready-made teams, examples
│   │   ├── connect.ts          Which arrows are allowed
│   │   ├── placement.ts        Where a newly added agent goes
│   │   ├── highlight.ts        Python syntax colouring (returns tokens, not HTML)
│   │   ├── saveFile.ts         Save and open .json files (old saves still open)
│   │   ├── helpers.ts          slug(), pyTriple(), ...
│   │   └── constants.ts
│   │
│   ├── state/                  One reducer holds the whole app state
│   │   ├── reducer.ts          State shape and every action
│   │   ├── AppContext.tsx      Provider: runs generate(), the simulator and auto-play
│   │   ├── selectors.ts        Small derived values
│   │   ├── ToastContext.tsx    The short messages at the bottom
│   │   └── CanvasApi.tsx       Lets the palette ask the canvas where to drop an agent
│   │
│   ├── hooks/
│   │   ├── useActions.ts       Actions that need a check or a message (connect, add, open...)
│   │   ├── useDeleteKey.ts     Delete key removes the selection
│   │   ├── useFocusField.ts    Puts the cursor in the right field after a double-click
│   │   └── useLatest.ts
│   │
│   ├── components/
│   │   ├── layout/Header.tsx
│   │   ├── palette/            Palette, PaletteRow, CustomAgents, LoadTeamButton, Legend
│   │   ├── canvas/             Canvas, NodeView, ZoomBar, geometry.ts
│   │   ├── panel/              SidePanel, LearnTab, CodeTab, CodeView, FocusBar, SimulateTab, AgentTab
│   │   └── ui/                 Rich (safe **bold** and `code`), TokenLine, PencilIcon
│   │
│   ├── utils/                  download.ts, clipboard.ts
│   └── styles/                 tokens, base, layout, palette, canvas, code, agent, simulate, learn, responsive
│
└── tests/                      Vitest. Logic, state and a render test of every tab and domain
```

## How it works

```
 canvas  ->  design data  ->  generate()  ->  Python code
 (drag)      (nodes, edges)                -> line map   -> click an agent, see its lines
                                           -> plan       -> explainGraph() and simCompute()
```

1. The canvas only edits a small object: agents (name, instructions, tools) and arrows (with optional conditions).
2. `generate()` reads it and writes Python from templates. Along the way it records which line numbers belong to which agent or arrow (the **line map**) and builds a compact **plan** of the compiled graph.
3. The explainer and the simulator read the plan. The simulator mirrors what LangGraph does: START, the supervisor chooses, an agent runs, control returns, FINISH, END.
4. Everything is recomputed after every change, so the code, the explanation and the simulation always match the drawing.

The simulator and the generator are checked against each other in tests: the same choices give the same path.

## Changing things

| I want to...                         | Edit                                                                 |
| ------------------------------------ | -------------------------------------------------------------------- |
| Add a domain or change its agents    | `src/data/domains.ts` (each agent is `[name, what it does, tools]`)  |
| Add an AI provider                   | `src/data/providers.ts`, then add its key to `ProviderKey` in `types.ts` |
| Change the generated code            | `src/logic/generate.ts`, then update `tests/generate.test.ts`        |
| Change the learning text             | `src/data/learn.ts` and `src/components/panel/LearnTab.tsx`          |
| Add a new tab                        | add it to `TabName` in `types.ts`, then to `SidePanel.tsx`           |
| Change colours                       | `src/styles/tokens.css` (light and dark mode)                        |

**You do not need to add a domain for a new topic.** Choose *Custom (start blank)*, type what your team is for (for example "cooking class"), add a Supervisor, create your own agents with *Add your own*, and draw the arrows. The team name is used in the starting instructions of the Supervisor and of the agents you create. Agents you add by clicking line up in a column to the right of the Supervisor (see `src/logic/placement.ts`). Add a domain in code only when you want a ready-made team to load in one click.

Rule of thumb: anything about *what the code says* lives in `src/logic/` and is covered by tests. Anything about *how it looks or reacts* lives in `src/components/`.

## Tests

`npm test` runs, among others:

- **Line map**: for every domain, with and without comments, each highlighted range really contains the code it claims to.
- **Generated Python compiles**: every domain, provider and example is run through `python3 -m py_compile` (skipped if Python is not installed).
- **Simulator**: paths, conditions, the recursion limit, Back, auto-play.
- **State**: selection rules, ids, deleting, saving and opening (including saves from the first, single-file version).
- **Render test**: the whole app is rendered for every tab and every domain, to catch crashes.

## Deploy (GitHub + Netlify)

1. **Check it locally first**: `npm install`, `npm test`, `npm run build`. This also creates `package-lock.json`, which you should commit.
2. **Put it on GitHub**: create an empty repository (do not add a README or licence there, this project has them), then:
   ```bash
   git init
   git add .
   git commit -m "Agent Flow Builder"
   git branch -M main
   git remote add origin https://github.com/YOUR-NAME/agent-flow-builder.git
   git push -u origin main
   ```
3. **Host it on Netlify**: Add new site > Import an existing project > GitHub > pick the repository. The settings come from `netlify.toml` (build command `npm run build`, publish folder `dist`). Press Deploy.
4. From then on, every `git push` to `main` publishes a new version, and every pull request gets its own preview link.

No keys or environment variables are needed: the app never talks to any AI service.

**Without GitHub**: run `npm run build`, then drag the `dist/` folder onto Netlify's deploy area.
**Other hosts** (Cloudflare Pages, Vercel, GitHub Pages): build command `npm run build`, publish folder `dist`. The build uses relative paths, so it also works from a sub-folder.

## Status and limits

- The generated code is checked to be valid Python, and its routing is tested with stand-ins for LangGraph and the model. **It has not been run against a real model API.** Run it once with your own key before you tell anyone it works end to end.
- Tools are empty stubs. The block at the bottom of the generated file is a demo: in your own app, import `graph` and call `graph.invoke(...)`.
- The simulator uses placeholder replies. Real LangGraph runs parallel branches at the same time; the simulator runs them one after another and says so.

## License

MIT, see `LICENSE`.
