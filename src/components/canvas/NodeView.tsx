import { colorClass, displayName } from '../../logic/helpers';
import type { AgentNode } from '../../types';

interface Props {
  node: AgentNode;
  x: number;
  y: number;
  subtitle: string;
  selected: boolean;
  /** 'active' = the simulation is here now, 'seen' = already visited */
  live: 'active' | 'seen' | '';
  dragging: boolean;
  dropTarget: boolean;
}

/** One agent on the canvas. The dots are the connection points. */
export function NodeView({ node, x, y, subtitle, selected, live, dragging, dropTarget }: Props) {
  const cls = ['node', colorClass(node), selected ? 'sel' : '', live, dragging ? 'dragging' : '', dropTarget ? 'drop' : '']
    .filter(Boolean)
    .join(' ');
  const name = displayName(node);
  return (
    <div className={cls} data-id={node.id} style={{ left: x, top: y }}>
      <div className="nmeta">
        <div className="nname" title={name}>
          {name}
        </div>
        <div className="nsub">{subtitle}</div>
      </div>
      <span className="port in" />
      <span className="port out" title="Drag to another agent to connect" />
    </div>
  );
}
