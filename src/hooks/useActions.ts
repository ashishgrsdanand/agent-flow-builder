import { DOMAINS } from '../data/domains';
import { checkConnection, connectedMessage } from '../logic/connect';
import { buildExample, buildTeam, type ExampleKind } from '../logic/graph';
import { findFreeSpot } from '../logic/placement';
import { parseSave, serializeSave } from '../logic/saveFile';
import { useApp } from '../state/AppContext';
import { useCanvasApi } from '../state/CanvasApi';
import { useToast } from '../state/ToastContext';
import type { NodeOpts, NodeType } from '../types';
import { copyText } from '../utils/clipboard';
import { downloadText } from '../utils/download';

export interface Actions {
  addNode(type: NodeType, pos: { x: number; y: number } | null, opts?: NodeOpts): void;
  /** returns true when the agent was created */
  createCustomAgent(name: string, desc: string): boolean;
  connect(fromId: string, toId: string): void;
  loadTeam(): void;
  loadExample(kind: ExampleKind): void;
  save(): void;
  openFile(file: File): Promise<void>;
  copyCode(): Promise<void>;
  downloadCode(): void;
}

/**
 * Things the learner can do that need a check or a message, not just a state change.
 * The returned object is rebuilt on every render, so it always sees the newest state.
 */
export function useActions(): Actions {
  const { state, dispatch, gen } = useApp();
  const toast = useToast();
  const canvas = useCanvasApi();

  /** A tidy spot for an agent added by clicking: a column to the right of the Supervisor. */
  const freeSpot = (type: NodeType) => findFreeSpot(state.nodes, type, canvas.current ? canvas.current.spot() : { x: 50, y: 50 });

  return {
    addNode(type, pos, opts) {
      if (type === 'supervisor' && state.nodes.some((n) => n.type === 'supervisor')) {
        toast('Only one Supervisor is supported. Connect more agents to the one you have.');
        return;
      }
      const p = pos ?? freeSpot(type);
      dispatch({ type: 'add-node', nodeType: type, x: p.x, y: p.y, opts });
    },
    createCustomAgent(name, desc) {
      const n = name.trim();
      if (!n) {
        toast('Type a name for your agent first.');
        return false;
      }
      const p = freeSpot('agent');
      dispatch({ type: 'create-custom-agent', name: n, desc: desc.trim(), x: p.x, y: p.y });
      return true;
    },
    connect(fromId, toId) {
      const check = checkConnection(state.nodes, state.edges, fromId, toId);
      if (!check.ok) {
        if (check.message) toast(check.message);
        return;
      }
      const a = state.nodes.find((n) => n.id === fromId);
      const b = state.nodes.find((n) => n.id === toId);
      dispatch({ type: 'add-edge', from: fromId, to: toId });
      if (a && b) toast(connectedMessage(a, b));
    },
    loadTeam() {
      dispatch({ type: 'load-graph', graph: buildTeam(state.domain, state.overrides, state.nextId) });
      const flows = (DOMAINS[state.domain].flows || []).length;
      toast(
        'Loaded the ' + DOMAINS[state.domain].label + ' team' +
          (flows ? ' with ' + flows + ' conditional paths. Double-click an orange arrow to edit its condition.' : '. Double-click any agent to rename it.'),
      );
    },
    loadExample(kind) {
      dispatch({ type: 'load-graph', graph: buildExample(kind, state.nextId) });
      toast(
        kind === 'tiny'
          ? 'Loaded a Supervisor and two agents. Click each one, then open the Code tab.'
          : 'Loaded a loop: the Reviewer can send work back to the Writer. Try it in Simulate.',
      );
    },
    save() {
      downloadText('agent-flow.json', serializeSave(state), 'application/json');
      toast('Layout saved as agent-flow.json');
    },
    async openFile(file) {
      try {
        dispatch({ type: 'open-save', loaded: parseSave(await file.text()) });
        toast('Layout loaded');
      } catch {
        toast("That file isn't a saved Agent Flow Builder layout.");
      }
    },
    async copyCode() {
      await copyText(gen.code);
      toast('Code copied');
    },
    downloadCode() {
      downloadText('multi_agent_graph.py', gen.code, 'text/x-python');
      toast('Saved multi_agent_graph.py');
    },
  };
}
