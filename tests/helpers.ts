import { defaultModels } from '../src/data/providers';
import { generate } from '../src/logic/generate';
import { buildTeam } from '../src/logic/graph';
import type { GenConfig, GenResult } from '../src/types';

export const config = (over: Partial<GenConfig> = {}): GenConfig => ({ provider: 'gemini', models: defaultModels(), explain: true, ...over });

/** Generate code for a ready-made domain team. */
export function genTeam(domain: string, over?: Partial<GenConfig>): GenResult {
  return generate(buildTeam(domain, {}, 1), config(over));
}

/** The text of lines `range` (1-based, inclusive) of `code`. */
export function lines(code: string, range: [number, number]): string {
  return code.replace(/\n$/, '').split('\n').slice(range[0] - 1, range[1]).join('\n');
}
