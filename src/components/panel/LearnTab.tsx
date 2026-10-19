import { useEffect, useRef, type ReactNode } from 'react';
import { EXPERIMENTS, GLOSSARY, SECTION_INFO, SECTION_ORDER } from '../../data/learn';
import { useActions } from '../../hooks/useActions';
import { explainGraph } from '../../logic/explain';
import { useApp } from '../../state/AppContext';
import type { SetupInfo } from '../../types';
import { Rich } from '../ui/Rich';

/** A collapsible section. Whether it is open is kept in the app state, so it survives re-renders. */
function Section({ id, title, defaultOpen, children }: { id: string; title: string; defaultOpen: boolean; children: ReactNode }) {
  const { state, dispatch } = useApp();
  const open = id in state.learnOpen ? state.learnOpen[id] : defaultOpen;
  return (
    <details data-k={id} open={open} onToggle={(e) => dispatch({ type: 'learn-toggle', key: id, open: e.currentTarget.open })}>
      <summary>{title}</summary>
      <div className="lbody">{children}</div>
    </details>
  );
}

/** The exact steps to run the generated code, for the provider the learner picked. */
function RunSteps({ setup }: { setup: SetupInfo | null }) {
  if (!setup) return <p>Add some agents first, then the exact steps for your setup appear here.</p>;
  return (
    <ol>
      <li>
        Install Python 3.10 or newer from python.org. Check it with <code>python --version</code>.
      </li>
      <li>
        Save the code from the Code tab as <code>multi_agent_graph.py</code> (the Download .py button does this).
      </li>
      <li>
        Open a terminal in that folder and install the libraries:
        <pre>{`pip install -U langgraph langchain-core ${setup.pkg}${setup.pyd ? ' pydantic' : ''}`}</pre>
      </li>
      {setup.env ? (
        <li>
          Create an API key at {setup.keyUrl} and set it in the terminal:
          <pre>{`export ${setup.env}="your-key"      # Mac / Linux\n$env:${setup.env}="your-key"      # Windows PowerShell`}</pre>
        </li>
      ) : (
        <li>
          Install Ollama from ollama.com, then download the model:
          <pre>{`ollama pull ${setup.model}`}</pre>
        </li>
      )}
      <li>
        Run it:
        <pre>python multi_agent_graph.py</pre>
      </li>
      <li>
        Change the text inside <code>HumanMessage(...)</code> at the bottom of the file to ask something else.
      </li>
      {setup.tools && <li>The tools are stubs that return "TODO". Replace them with real code when you want agents to do real work.</li>}
    </ol>
  );
}

/** Teaches how the graph works, using the learner's own graph as the example. */
export function LearnTab() {
  const { state, dispatch, gen } = useApp();
  const actions = useActions();
  const runRef = useRef<HTMLDivElement>(null);
  const sections = SECTION_ORDER.filter((k) => gen.marks.sections[k]);

  // "How do I run this?" on the Code tab opens this section and scrolls to it.
  useEffect(() => {
    if (state.howtoTick > 0 && runRef.current) runRef.current.scrollIntoView({ block: 'start' });
  }, [state.howtoTick]);

  return (
    <div className="lsec">
      <Section id="start" title="Start here" defaultOpen>
        <ol>
          <li>
            <b>Build.</b> Pick a domain on the left and press <i>Load full team</i>, or drag agents onto the canvas. Connect them by dragging from one agent's right dot to another.
          </li>
          <li>
            <b>Read.</b> Click any agent or arrow. The Code tab jumps to the exact lines that create it.
          </li>
          <li>
            <b>Edit.</b> Double-click an agent or arrow to change its name, instructions, tools or condition.
          </li>
          <li>
            <b>Watch.</b> Open Simulate to see the graph run step by step, with no API key needed.
          </li>
          <li>
            <b>Use.</b> Copy the code, or download it as a .py file, and run it on your computer. Open "Run it on your computer" below for the steps.
          </li>
        </ol>
        <p>New to this? Start with a small example:</p>
        <div className="exrow">
          <button className="btn" onClick={() => actions.loadExample('tiny')}>
            Smallest example
          </button>
          <button className="btn" onClick={() => actions.loadExample('loop')}>
            Writer and reviewer loop
          </button>
        </div>
      </Section>

      <Section id="graph" title="Your graph in plain English" defaultOpen>
        <ol>
          {explainGraph(gen.plan).map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ol>
      </Section>

      <Section id="read" title="Read the code in order" defaultOpen={false}>
        {sections.length ? (
          sections.map((k) => (
            <div className="rrow" key={k}>
              <div>
                <b>{SECTION_INFO[k].title}</b>
                <div>{SECTION_INFO[k].text}</div>
              </div>
              <button className="btn mini" onClick={() => dispatch({ type: 'show-section', key: k })}>
                Show
              </button>
            </div>
          ))
        ) : (
          <p>Add some agents to see the code sections here.</p>
        )}
      </Section>

      <div ref={runRef}>
        <Section id="run" title="Run it on your computer" defaultOpen={false}>
          <RunSteps setup={gen.setup} />
        </Section>
      </div>

      <Section id="ideas" title="Key ideas" defaultOpen={false}>
        {GLOSSARY.map(([term, text]) => (
          <p key={term}>
            <b>{term}.</b> <Rich text={text} />
          </p>
        ))}
      </Section>

      <Section id="try" title="Experiments to try" defaultOpen={false}>
        <ol>
          {EXPERIMENTS.map((x, i) => (
            <li key={i}>
              <Rich text={x} />
            </li>
          ))}
        </ol>
      </Section>
    </div>
  );
}
