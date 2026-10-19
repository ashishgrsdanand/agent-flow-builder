import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { PencilIcon } from '../ui/PencilIcon';

interface Props {
  name: string;
  desc: string;
  /** colour class, e.g. "k2" or "t-supervisor" */
  cls: string;
  onRename(name: string): void;
  /** only custom agents can be removed from the palette */
  onRemove?: () => void;
  onDragStart(e: ReactPointerEvent<HTMLDivElement>): void;
}

/** One agent in the palette: drag it onto the canvas, click it to add it, or use the pencil to rename it. */
export function PaletteRow({ name, desc, cls, onRename, onRemove, onDragStart }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const finished = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const startEdit = () => {
    finished.current = false;
    setDraft(name);
    setEditing(true);
  };
  const finish = (save: boolean) => {
    if (finished.current) return; // Enter and blur can both fire
    finished.current = true;
    setEditing(false);
    const v = draft.trim();
    if (save && v) onRename(v);
  };

  return (
    <div
      className={'pitem ' + cls}
      title="Drag onto the canvas, or click to add"
      onPointerDown={(e) => {
        if ((e.target as Element).closest('.pr, .edit, .rm')) return;
        onDragStart(e);
      }}
    >
      <span className="dot" />
      <div className="pt">
        {editing ? (
          <input
            ref={inputRef}
            className="pr"
            value={draft}
            maxLength={40}
            aria-label="New name"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') finish(true);
              else if (e.key === 'Escape') finish(false);
            }}
            onBlur={() => finish(true)}
          />
        ) : (
          <b>{name}</b>
        )}
        <small>{desc}</small>
      </div>
      <button className="edit" title="Rename" aria-label="Rename" onClick={startEdit}>
        <PencilIcon />
      </button>
      {onRemove && (
        <button className="rm" title="Remove from palette" aria-label="Remove from palette" onClick={onRemove}>
          &times;
        </button>
      )}
    </div>
  );
}
