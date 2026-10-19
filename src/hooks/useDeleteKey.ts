import { useEffect } from 'react';
import { useApp } from '../state/AppContext';

/** Delete or Backspace removes the selected agent or arrow (unless you are typing in a field). */
export function useDeleteKey(): void {
  const { state, dispatch } = useApp();
  const hasSelection = !!state.sel;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = document.activeElement ? document.activeElement.tagName : '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && hasSelection) {
        e.preventDefault();
        dispatch({ type: 'delete-selection' });
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [hasSelection, dispatch]);
}
