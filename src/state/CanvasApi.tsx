import { createContext, useContext, useRef, type ReactNode } from 'react';

/** What the palette needs from the canvas (to drop an agent where the pointer is). */
export interface CanvasApi {
  /** screen position -> canvas position (accounts for zoom and scroll) */
  toCanvas(clientX: number, clientY: number): { x: number; y: number };
  /** is this screen position over the visible canvas? */
  contains(clientX: number, clientY: number): boolean;
  /** a good spot for an agent added by clicking (top-left of what you can see) */
  spot(): { x: number; y: number };
  /** show or hide the dashed "drop here" outline */
  setDropHot(on: boolean): void;
}

type ApiRef = { current: CanvasApi | null };
const CanvasApiContext = createContext<ApiRef>({ current: null });

export function CanvasApiProvider({ children }: { children: ReactNode }) {
  const ref = useRef<CanvasApi | null>(null);
  return <CanvasApiContext.Provider value={ref}>{children}</CanvasApiContext.Provider>;
}

export const useCanvasApi = (): ApiRef => useContext(CanvasApiContext);
