import { useRef } from 'react';
import { useFocusField } from '../../hooks/useFocusField';
import { HINT } from '../../logic/constants';
import { colorClass, displayName, slug } from '../../logic/helpers';
import { useApp } from '../../state/AppContext';
import type { AgentNode, Edge } from '../../types';

/** The editor: change an agent's name, instructions and tools, or an arrow's condition. */
export function AgentTab() {
  const { state } = useApp();
  const sel = state.sel;
  const node = sel && sel.k === 'node' ? state.nodes.find((n) => n.id === sel.id) : undefined;
  const edge = sel && sel.k === 'edge' ? state.edges.find((e) => e.id === sel.id) : undefined;
  if (node) return <NodeEditor node={node} />;
  if (edge) return <EdgeEditor edge={edge} />;
  return <NothingSelected />;
}

function NothingSelected() {
  const { state } = useApp();
  const a = state.nodes.length, c = state.edges.length;
  return (
    <>
      <div className="p-title" style={{ marginBottom: 10 }}>
        Nothing selected
      </div>
      <ol className="steps">
        <li>
          Pick a <b>domain</b> on the left and press <b>Load full team</b>, or drag agents onto the canvas.
        </li>
        <li>Drag from an agent's right dot onto another agent to connect them.</li>
        <li>Double-click an agent or arrow to edit its name, instructions, tools or condition.</li>
        <li>
          Open the <b>Code</b> tab to copy the generated Python.
        </li>
      </ol>
      <p className="muted" style={{ marginTop: 14 }}>
        {a} agent{a === 1 ? '' : 's'}, {c} connection{c === 1 ? '' : 's'}. Select a connection and press Delete to remove it.
      </p>
    </>
  );
}

function NodeEditor({ node }: { node: AgentNode }) {
  const { state, dispatch } = useApp();
  const nameRef = useRef<HTMLInputElement>(null);
  useFocusField('name', nameRef, true);

  const sup = node.type === 'supervisor';
  const outs = state.edges.filter((e) => e.from === node.id);
  const hasSup = state.nodes.some((x) => x.type === 'supervisor');
  const nameOf = (id: string) => {
    const t = state.nodes.find((x) => x.id === id);
    return t ? displayName(t) : '';
  };
  const patch = (p: Partial<Pick<AgentNode, 'name' | 'desc' | 'prompt' | 'tools'>>) => dispatch({ type: 'update-node', id: node.id, patch: p });

  return (
    <>
      <div className={'p-head ' + colorClass(node)}>
        <span className="dot" />
        <div>
          <div className="p-title" id="p-title">
            {displayName(node)}
          </div>
          <div className="p-sub">{HINT[node.type]}</div>
        </div>
      </div>
      <div style={{ margin: '-4px 0 12px' }}>
        <button className="btn mini" id="f-showcode" onClick={() => dispatch({ type: 'show-code' })}>
          Show this in the code
        </button>
      </div>

      <label className="f" style={{ marginBottom: 4 }}>
        Name<span className="help">{sup ? 'label only' : 'any name you like'}</span>
        <input id="f-name" ref={nameRef} spellCheck={false} maxLength={40} value={node.name} onChange={(e) => patch({ name: e.target.value })} />
      </label>
      {sup ? (
        <div style={{ marginBottom: 12 }} />
      ) : (
        <div className="muted" id="f-slug" style={{ marginBottom: 12 }}>
          {/[a-z0-9]/i.test(node.name) ? 'Name in the code: ' + slug(node.name) : 'Add some English letters or numbers so the name in the code is readable.'}
        </div>
      )}
      {!sup && (
        <label className="f">
          What it does<span className="help">the Supervisor reads this to pick an agent</span>
          <input id="f-desc" value={node.desc} onChange={(e) => patch({ desc: e.target.value })} />
        </label>
      )}
      <label className="f">
        Instructions (system prompt)
        <textarea id="f-prompt" rows={9} value={node.prompt} onChange={(e) => patch({ prompt: e.target.value })} />
      </label>
      {!sup && (
        <label className="f">
          Tools<span className="help">comma-separated, stubs are generated for you</span>
          <input id="f-tools" placeholder="search_rooms, create_booking" spellCheck={false} value={node.tools} onChange={(e) => patch({ tools: e.target.value })} />
        </label>
      )}

      <div className="sect">Connections</div>
      {outs.length > 0 &&
        (sup ? (
          <p className="muted">Optional: say when each agent should be picked. The Supervisor reads this.</p>
        ) : (
          <p className="muted">Leave a condition empty for a fixed handoff. Add conditions to two or more arrows and this agent picks the path when it finishes. An arrow with no condition becomes the default.</p>
        ))}
      {outs.length === 0 && (
        <p className="muted">
          {sup
            ? "No agents yet. Drag from this node's right dot onto an agent."
            : hasSup
              ? 'No outgoing arrows. When this agent finishes, control returns to the Supervisor.'
              : 'No outgoing arrows. The flow ends here.'}
        </p>
      )}
      {outs.map((e) => (
        <div className="cwrap" key={e.id}>
          <div className="conn">
            <span className="cl">{sup ? 'can route to' : 'then runs'}</span>
            <b>{nameOf(e.to)}</b>
            <button className="x" title="Remove connection" aria-label="Remove connection" onClick={() => dispatch({ type: 'delete-edge', id: e.id })}>
              &times;
            </button>
          </div>
          <input
            className="when"
            value={e.when}
            placeholder={sup ? 'Pick this agent when\u2026 (optional)' : 'Only when\u2026 (empty = always)'}
            aria-label={'Condition for ' + nameOf(e.to)}
            onChange={(ev) => dispatch({ type: 'update-edge', id: e.id, when: ev.target.value })}
          />
        </div>
      ))}

      <div style={{ marginTop: 18 }}>
        <button className="btn danger" id="f-del" onClick={() => dispatch({ type: 'delete-selection' })}>
          Delete agent
        </button>
      </div>
    </>
  );
}

function EdgeEditor({ edge }: { edge: Edge }) {
  const { state, dispatch } = useApp();
  const whenRef = useRef<HTMLTextAreaElement>(null);
  useFocusField('when', whenRef, false);

  const a = state.nodes.find((n) => n.id === edge.from);
  const b = state.nodes.find((n) => n.id === edge.to);
  if (!a || !b) return <NothingSelected />;
  const fromSup = a.type === 'supervisor';
  const an = displayName(a), bn = displayName(b);

  return (
    <>
      <div className="p-title">
        {an} to {bn}
      </div>
      <p className="muted" style={{ margin: '6px 0 14px' }}>
        {fromSup
          ? `The Supervisor may choose ${bn} when it fits the request. ${bn} reports back to the Supervisor afterwards.`
          : `With no condition this is a fixed handoff: whenever ${an} finishes, ${bn} runs next. Add a condition here and on another arrow from ${an}, and ${an} will choose between them.`}
      </p>
      <div style={{ margin: '0 0 12px' }}>
        <button className="btn mini" id="f-showcode" onClick={() => dispatch({ type: 'show-code' })}>
          Show this in the code
        </button>
      </div>
      <label className="f">
        {fromSup ? 'Pick this agent when' : 'Take this path only when'}
        <span className="help">optional</span>
        <textarea
          id="f-when"
          ref={whenRef}
          rows={3}
          placeholder={fromSup ? 'e.g. the guest asks about a refund' : 'e.g. the payment went through'}
          value={edge.when}
          onChange={(e) => dispatch({ type: 'update-edge', id: edge.id, when: e.target.value })}
        />
      </label>
      <button className="btn danger" id="f-deledge" onClick={() => dispatch({ type: 'delete-selection' })}>
        Delete connection
      </button>
    </>
  );
}
