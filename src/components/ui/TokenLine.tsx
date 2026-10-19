import type { Token } from '../../logic/highlight';

/** One line of highlighted code. */
export function TokenLine({ tokens }: { tokens: Token[] | undefined }) {
  if (!tokens) return null;
  return (
    <>
      {tokens.map((t, i) => (t.cls ? <span key={i} className={'hl-' + t.cls}>{t.text}</span> : t.text))}
    </>
  );
}
