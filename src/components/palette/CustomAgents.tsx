import { useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { useActions } from '../../hooks/useActions';
import { useApp } from '../../state/AppContext';
import type { MyAgent } from '../../types';
import { PaletteRow } from './PaletteRow';

interface Props {
  onDragStart(e: ReactPointerEvent<HTMLDivElement>, agent: MyAgent): void;
}

/** "Add your own": name an agent yourself. It is added to the canvas and kept in the palette for reuse. */
export function CustomAgents({ onDragStart }: Props) {
  const { state, dispatch } = useApp();
  const actions = useActions();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  const create = () => {
    if (actions.createCustomAgent(name, desc)) {
      setName('');
      setDesc('');
    } else if (nameRef.current) {
      nameRef.current.focus();
    }
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') create();
  };

  return (
    <div className="mine">
      <h3>Add your own</h3>
      <p className="sub">Any name, any job. It stays in your palette so you can reuse it.</p>
      <input ref={nameRef} id="my-name" placeholder="Name, e.g. Refund Agent" maxLength={40} spellCheck={false} aria-label="Custom agent name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={onKey} />
      <input id="my-desc" placeholder="What it does (optional)" maxLength={140} aria-label="What the custom agent does" value={desc} onChange={(e) => setDesc(e.target.value)} onKeyDown={onKey} />
      <button className="btn" id="my-add" onClick={create}>
        Create and add to canvas
      </button>
      <div id="mylist">
        {state.myAgents.map((a) => (
          <PaletteRow
            key={a.id}
            name={a.name}
            desc={a.desc || 'Your agent'}
            cls="k4"
            onRename={(n) => dispatch({ type: 'rename-my-agent', id: a.id, name: n })}
            onRemove={() => dispatch({ type: 'remove-my-agent', id: a.id })}
            onDragStart={(e) => onDragStart(e, a)}
          />
        ))}
      </div>
    </div>
  );
}
