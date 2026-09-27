/**
 * Server-side text-width estimate for SVG `<text>` truncation. There's no
 * DOM or canvas to measure glyphs against at render time (this kit renders
 * on the server with no client JS), so width is estimated as
 * `text.length * charWidth`, with `charWidth` derived from the font size:
 * a monospace glyph reads at roughly `0.6em` (the same ratio already used
 * for the link-label/health-chip pill width budgets elsewhere in this
 * kit), and this kit's proportional label font reads a little narrower on
 * average, roughly `0.56em`, given its mixed-case, medium-weight glyph set.
 *
 * This is an estimate, not a measurement — callers keep an SVG `clipPath`
 * as a hard safety net for whatever it gets wrong.
 */
export const MONO_CHAR_EM = 0.6;
export const SANS_CHAR_EM = 0.56;

const ELLIPSIS = '…';

/**
 * Truncates `text` to fit `maxWidth` px at the given estimated `charWidth`
 * px/glyph, appending an ellipsis. Returns `text` unchanged once it already
 * fits (including when `maxWidth`/`charWidth` aren't usable numbers).
 */
export function truncateToWidth(text: string, maxWidth: number, charWidth: number): string {
  if (!(charWidth > 0) || !(maxWidth > 0)) return text;
  if (text.length * charWidth <= maxWidth) return text;

  // Reserve one glyph's width for the ellipsis itself.
  const maxChars = Math.floor(maxWidth / charWidth) - 1;
  if (maxChars <= 0) return ELLIPSIS;
  return `${text.slice(0, maxChars).trimEnd()}${ELLIPSIS}`;
}
