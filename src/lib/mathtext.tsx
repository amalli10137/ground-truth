import katex from 'katex';
import 'katex/dist/katex.min.css';
import React, { useMemo } from 'react';

/**
 * Minimal markdown-ish renderer for briefs and hints:
 * paragraphs (blank-line separated), $$display$$ and $inline$ KaTeX,
 * **bold**, `code`. Anything heavier belongs in a real component.
 */

function renderInline(text: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  // split on $...$, `...`, **...** while keeping delimiters' content
  const re = /\$([^$]+)\$|`([^`]+)`|\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] != null) {
      const html = katex.renderToString(m[1], { throwOnError: false });
      out.push(<span key={`${keyBase}-${i++}`} dangerouslySetInnerHTML={{ __html: html }} />);
    } else if (m[2] != null) {
      out.push(<code key={`${keyBase}-${i++}`}>{m[2]}</code>);
    } else if (m[3] != null) {
      out.push(<strong key={`${keyBase}-${i++}`}>{m[3]}</strong>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function MathText({ text, className }: { text: string; className?: string }) {
  // metas are written in String.raw templates where backticks must be escaped
  // as \` — String.raw keeps the backslash, so strip it here
  const blocks = useMemo(() => text.replace(/\\`/g, '`').trim().split(/\n\s*\n/), [text]);
  return (
    <div className={className}>
      {blocks.map((block, bi) => {
        const displayMatch = block.trim().match(/^\$\$([\s\S]+)\$\$$/);
        if (displayMatch) {
          const html = katex.renderToString(displayMatch[1], {
            throwOnError: false,
            displayMode: true,
          });
          return (
            <div
              key={bi}
              className="math-display"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        }
        return <p key={bi}>{renderInline(block, `b${bi}`)}</p>;
      })}
    </div>
  );
}
