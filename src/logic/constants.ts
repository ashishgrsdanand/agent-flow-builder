/** Size of a node on the canvas, and of the canvas itself, in canvas units. */
export const NODE_W = 176;
export const NODE_H = 64;
export const CANVAS_W = 1500;
export const CANVAS_H = 900;

/** Number of agent colours in the palette (the supervisor has its own). */
export const KCOUNT = 5;

export const HINT = {
  supervisor: 'Decides which agent works next',
  agent: 'Specialist agent',
} as const;

export const DEFAULT_REQUEST = 'Hi! I need some help, can you get started?';
export const RECURSION_LIMIT = 25;
