import { useEffect, useMemo, useRef } from 'react';
import { useLatest } from '../../hooks/useLatest';
import type { Token } from '../../logic/highlight';
import type { Range } from '../../types';
import { TokenLine } from '../ui/TokenLine';

interface Props {
  tokens: Token[][];
  /** lines to highlight (1-based, inclusive) */
  ranges: Range[];
  /** is the Code tab showing? */
  active: boolean;
  /** changes whenever the view should scroll to the highlighted lines */
  scrollTick: number;
}

/** The generated code with line numbers. Highlighted lines are shaded, and the view scrolls to them on request. */
export function CodeView({ tokens, ranges, active, scrollTick }: Props) {
  const preRef = useRef<HTMLPreElement>(null);
  const rangesRef = useLatest(ranges);

  const highlighted = useMemo(() => {
    const set = new Set<number>();
    ranges.forEach(([a, b]) => {
      for (let i = a; i <= b; i++) set.add(i);
    });
    return set;
  }, [ranges]);

  useEffect(() => {
    const r = rangesRef.current;
    const pre = preRef.current;
    if (!active || !pre || !r.length) return;
    const el = pre.children[r[0][0] - 1] as HTMLElement | undefined;
    if (el) pre.scrollTo({ top: Math.max(0, el.offsetTop - pre.clientHeight * 0.2), behavior: 'smooth' });
  }, [scrollTick, active, rangesRef]);

  return (
    <pre id="code" ref={preRef}>
      {tokens.map((line, i) => (
        <span key={i} className={'ln' + (highlighted.has(i + 1) ? ' hl' : '')}>
          <TokenLine tokens={line} />
        </span>
      ))}
    </pre>
  );
}
