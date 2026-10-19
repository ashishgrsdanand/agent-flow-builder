import { useEffect, type RefObject } from 'react';
import { useApp } from '../state/AppContext';

/**
 * When the learner double-clicks an agent or arrow, the editor opens and this puts the cursor in the right field.
 * It only runs once per request, then clears the request.
 */
export function useFocusField(field: 'name' | 'when', ref: RefObject<HTMLInputElement | HTMLTextAreaElement | null>, selectText: boolean): void {
  const { state, dispatch } = useApp();
  useEffect(() => {
    const el = ref.current;
    if (state.focusField === field && el) {
      el.focus();
      if (selectText) el.select();
      dispatch({ type: 'clear-focus-field' });
    }
  }, [state.focusField, field, ref, selectText, dispatch]);
}
