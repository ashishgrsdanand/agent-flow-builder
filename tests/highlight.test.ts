import { describe, expect, it } from 'vitest';
import { tokenizeCode, tokenizeLine } from '../src/logic/highlight';
import { genTeam } from './helpers';

describe('highlighter', () => {
  it('never loses or changes text', () => {
    const code = genTeam('support').code;
    const toks = tokenizeCode(code);
    expect(toks.map((t) => t.map((x) => x.text).join(''))).toEqual(code.replace(/\n$/, '').split('\n'));
  });
  it('classifies keywords, strings, comments and decorators', () => {
    const st = { inString: false };
    expect(tokenizeLine('def f(): return "a"  # hi', st)).toEqual([
      { cls: 'k', text: 'def' }, { cls: '', text: ' f(): ' }, { cls: 'k', text: 'return' }, { cls: '', text: ' ' },
      { cls: 's', text: '"a"' }, { cls: '', text: '  ' }, { cls: 'c', text: '# hi' },
    ]);
    expect(tokenizeLine('@tool', { inString: false })).toEqual([{ cls: 'd', text: '@tool' }]);
  });
  it('carries a triple-quoted string across lines', () => {
    const st = { inString: false };
    tokenizeLine('P = """first line', st);
    expect(st.inString).toBe(true);
    expect(tokenizeLine('still in the string', st)).toEqual([{ cls: 's', text: 'still in the string' }]);
    tokenizeLine('end"""', st);
    expect(st.inString).toBe(false);
  });
});
