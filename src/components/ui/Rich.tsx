import { Fragment } from 'react';

/**
 * Shows text with a tiny markup: `code` becomes <code>, and **bold** becomes <b>.
 * It builds React elements (never raw HTML), so any text is safe to show.
 */
export function Rich({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.length > 2 && p.startsWith('`') && p.endsWith('`')) return <code key={i}>{p.slice(1, -1)}</code>;
        if (p.length > 4 && p.startsWith('**') && p.endsWith('**')) return <b key={i}>{p.slice(2, -2)}</b>;
        return <Fragment key={i}>{p}</Fragment>;
      })}
    </>
  );
}
