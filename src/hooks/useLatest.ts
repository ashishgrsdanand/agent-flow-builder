import { useRef } from 'react';

/** A ref that always holds the newest value, so document-level listeners never see stale state. */
export function useLatest<T>(value: T): { readonly current: T } {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}
