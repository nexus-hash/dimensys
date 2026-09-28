import { Fragment, type ReactNode } from 'react';

/**
 * Inline text for narration, outcomes and reveals: `**bold**`, `*italic*`,
 * `` `code` `` and nothing else (no links, no blocks, no HTML), with every
 * value — a number, and its unit when one follows — set in mono tabular
 * figures so live numbers don't jitter. Small on purpose: this text arrives
 * at runtime from the simulation, so it can't be rendered on the server.
 */

const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g;

/**
 * A value: an optional `~`/`+`/`−` and currency sign, digits with
 * thousands separators and decimals, then an optional unit. Never the
 * digits inside a word ("p99", "3xl").
 */
const VALUE =
  /(?<![\p{L}\p{N}_.])[~≈+−-]?\$?\d[\d,]*(?:\.\d+)?(?:\s?(?:%|×|ms\b|s\b|req\/s|reads\/s|writes\/s|rps\b|\/s|\/mo\b|k\b|M\b|GB\b|MB\b))?/gu;

function values(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(VALUE)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    out.push(
      <b key={`${key}v${i++}`} className="v">
        {m[0]}
      </b>,
    );
    last = at + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function renderInline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let i = 0;
  for (const part of text.split(INLINE)) {
    if (!part) continue;
    const key = `p${i++}`;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      out.push(<strong key={key}>{values(part.slice(2, -2), key)}</strong>);
    } else if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      out.push(<code key={key}>{part.slice(1, -1)}</code>);
    } else if (((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) && part.length > 2) {
      out.push(<em key={key}>{values(part.slice(1, -1), key)}</em>);
    } else {
      out.push(<Fragment key={key}>{values(part, key)}</Fragment>);
    }
  }
  return out;
}

export function RichText({ text }: { text: string }) {
  return <>{renderInline(text)}</>;
}
