import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useActions } from '../../hooks/useActions';
import { useApp } from '../../state/AppContext';
import { useToast } from '../../state/ToastContext';

/** The top bar: open and save a design, clear the canvas, jump to the code. */
export function Header() {
  const { dispatch } = useApp();
  const actions = useActions();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [clearArmed, setClearArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const onClear = () => {
    if (!clearArmed) {
      setClearArmed(true);
      timer.current = setTimeout(() => setClearArmed(false), 3000);
      return;
    }
    clearTimeout(timer.current);
    setClearArmed(false);
    dispatch({ type: 'clear-canvas' });
  };
  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (file) void actions.openFile(file);
    e.target.value = ''; // allow choosing the same file again
  };

  return (
    <header>
      <div className="brand">
        <b>Agent Flow Builder</b>
        <span>Pick a domain, connect agents, get LangGraph code</span>
      </div>
      <div className="spacer" />
      <button className="btn" id="b-open" onClick={() => fileRef.current && fileRef.current.click()}>
        Open
      </button>
      <button className="btn" id="b-save" onClick={actions.save}>
        Save
      </button>
      <button className="btn" id="b-clear" onClick={onClear}>
        {clearArmed ? 'Click again to clear' : 'Clear'}
      </button>
      <button
        className="btn primary"
        id="b-gen"
        onClick={() => {
          dispatch({ type: 'set-tab', tab: 'code' });
          toast('Code is up to date. Copy it or download the .py file.');
        }}
      >
        Generate code
      </button>
      <input ref={fileRef} type="file" id="file" accept="application/json,.json" hidden onChange={onFile} />
    </header>
  );
}
