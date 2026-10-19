import { useEffect, useRef, useState } from 'react';
import { useActions } from '../../hooks/useActions';
import { useApp } from '../../state/AppContext';

/** Loads a whole ready-made team. It asks you to click twice when that would replace your drawing. */
export function LoadTeamButton() {
  const { state } = useApp();
  const actions = useActions();
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // choosing another domain cancels a pending "click again"
  useEffect(() => {
    setArmed(false);
  }, [state.domain]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const onClick = () => {
    if (state.nodes.length && !armed) {
      setArmed(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setArmed(false), 3500);
      return;
    }
    clearTimeout(timer.current);
    setArmed(false);
    actions.loadTeam();
  };

  return (
    <button className="btn" id="b-team" onClick={onClick}>
      {armed ? 'Replace the canvas? Click again' : 'Load full team on canvas'}
    </button>
  );
}
