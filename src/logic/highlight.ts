/**
 * A tiny Python syntax highlighter for the generated code.
 * It returns tokens (not HTML), so React can render them safely as plain text.
 */

/** k = keyword, s = string, c = comment, d = decorator, n = number, '' = plain text */
export type TokenClass = 'k' | 's' | 'c' | 'd' | 'n' | '';
export interface Token {
  cls: TokenClass;
  text: string;
}

const TOKEN_SOURCE =
  '("""(?:\\\\.|[^\\\\])*?""")|("""(?:\\\\.|[^\\\\])*$)|("(?:\\\\.|[^"\\\\])*"|\'(?:\\\\.|[^\'\\\\])*\')|(#.*)|(@\\w+)|\\b(from|import|def|class|return|if|else|elif|for|in|not|and|or|None|True|False|lambda|with|as|while|raise|try|except|pass)\\b|\\b(\\d+(?:\\.\\d+)?)\\b';

/** Highlights one line. `st.inString` carries a triple-quoted string across lines. */
export function tokenizeLine(line: string, st: { inString: boolean }): Token[] {
  const out: Token[] = [];
  let rest = line;
  if (st.inString) {
    const m = /^(?:\\.|[^\\])*?"""/.exec(rest);
    if (!m) return [{ cls: 's', text: rest }];
    out.push({ cls: 's', text: m[0] });
    rest = rest.slice(m[0].length);
    st.inString = false;
  }
  const re = new RegExp(TOKEN_SOURCE, 'g');
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(rest))) {
    if (m.index > last) out.push({ cls: '', text: rest.slice(last, m.index) });
    const cls: TokenClass = m[1] || m[2] || m[3] ? 's' : m[4] ? 'c' : m[5] ? 'd' : m[6] ? 'k' : 'n';
    if (m[2]) st.inString = true;
    out.push({ cls, text: m[0] });
    last = re.lastIndex;
  }
  if (last < rest.length) out.push({ cls: '', text: rest.slice(last) });
  return out;
}

/** Highlights a whole file: one token list per line. */
export function tokenizeCode(code: string): Token[][] {
  const st = { inString: false };
  return code
    .replace(/\n$/, '')
    .split('\n')
    .map((l) => tokenizeLine(l, st));
}
