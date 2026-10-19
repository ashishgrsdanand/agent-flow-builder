import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DOMAINS } from '../src/data/domains';
import { PROVIDER_KEYS } from '../src/data/providers';
import { buildExample } from '../src/logic/graph';
import { generate } from '../src/logic/generate';
import { config, genTeam } from './helpers';

const hasPython = spawnSync('python3', ['--version']).status === 0;

/** The generated code must at least be valid Python. */
describe.skipIf(!hasPython)('generated code is valid Python', () => {
  const dir = mkdtempSync(join(tmpdir(), 'afb-'));
  const compiles = (name: string, code: string) => {
    const file = join(dir, name + '.py');
    writeFileSync(file, code);
    const r = spawnSync('python3', ['-m', 'py_compile', file], { encoding: 'utf8' });
    return { ok: r.status === 0, err: r.stderr };
  };
  for (const dk of Object.keys(DOMAINS)) {
    it(`${dk}`, () => {
      for (const explain of [true, false]) {
        const r = compiles(`${dk}_${explain}`, genTeam(dk, { explain }).code);
        expect(r.err).toBe('');
        expect(r.ok).toBe(true);
      }
    });
  }
  for (const p of PROVIDER_KEYS) {
    it(`provider ${p}`, () => expect(compiles('p_' + p, genTeam('hospitality', { provider: p }).code).ok).toBe(true));
  }
  it('the starter examples', () => {
    for (const kind of ['tiny', 'loop'] as const) expect(compiles('ex_' + kind, generate(buildExample(kind, 1), config()).code).ok).toBe(true);
  });
});
