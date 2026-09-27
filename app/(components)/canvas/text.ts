/**
 * Server-side text-width measurement for SVG `<text>` sizing/truncation.
 * There's no DOM or canvas to measure glyphs against at render time (this
 * kit renders on the server with no client JS), so widths come from the
 * fonts' own advance widths:
 *
 * - Geist Mono advances exactly 0.6em per glyph.
 * - Geist Sans is proportional: `SANS_ADVANCE_PER_MILLE` tables its
 *   weight-500 advance for each printable ASCII glyph (thousandths of an
 *   em), measured in Chromium from the font file this app ships. Anything
 *   outside that range costs `SANS_FALLBACK_EM` (wider than any tabled
 *   lowercase glyph, so an unknown glyph over- rather than under-estimates).
 *
 * The diagram build sizes every node's box from these *same* numbers (its
 * own copy, pinned against this one in both repos' tests — see
 * `__tests__/text.test.ts`), so a title the box was sized for never gets an
 * ellipsis here. Truncation still exists for text longer than a node's
 * maximum width; callers keep an SVG `clipPath` as a hard safety net.
 */

/** Geist Sans 500 advance widths, per mille of an em, for char codes 32 (space) … 126 (`~`). */
export const SANS_ADVANCE_PER_MILLE: readonly number[] = [
  243, 228, 361, 515, 643, 810, 649, 186, 290, 290, 427, 562, 213, 418, 213, 494, 673, 406, 630, 625, 629, 641, 604, 531,
  624, 606, 302, 302, 546, 544, 546, 570, 925, 689, 688, 713, 701, 609, 595, 713, 716, 280, 607, 656, 583, 890, 745, 751,
  657, 745, 680, 654, 568, 694, 688, 968, 633, 594, 561, 361, 470, 361, 438, 558, 258, 565, 608, 563, 608, 576, 412, 607,
  591, 256, 284, 609, 282, 885, 591, 588, 608, 608, 394, 537, 410, 586, 560, 829, 607, 553, 552, 395, 274, 395, 523,
];

/** Advance, em, for any glyph outside the ASCII table (conservative). */
export const SANS_FALLBACK_EM = 0.72;

/** Geist Mono advance, em (every glyph). */
export const MONO_CHAR_EM = 0.6;

/** Kept for callers that only need a rough per-glyph sans estimate (tab labels, legacy boxes). */
export const SANS_CHAR_EM = 0.56;

/**
 * Safety margin on a measured width: `w * TEXT_SAFETY_SCALE + TEXT_SAFETY_PX`
 * — per-glyph hinting rounding at small sizes and rasterizer differences.
 */
export const TEXT_SAFETY_SCALE = 1.04;
export const TEXT_SAFETY_PX = 2;

/** Raw advance width of `text` in Geist Sans 500 at `px`. */
export function measureSans(text: string, px: number): number {
  let em = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    em += code >= 32 && code <= 126 ? SANS_ADVANCE_PER_MILLE[code - 32] / 1000 : SANS_FALLBACK_EM;
  }
  return em * px;
}

/** Raw advance width of `text` in Geist Mono at `px`. */
export function measureMono(text: string, px: number): number {
  return [...text].length * MONO_CHAR_EM * px;
}

/** A measured width with the shared safety margin applied. */
export function withSafety(width: number): number {
  return width === 0 ? 0 : width * TEXT_SAFETY_SCALE + TEXT_SAFETY_PX;
}

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

/**
 * Truncates `text` so its *measured* width (with the safety margin) fits
 * `maxWidth`, appending an ellipsis — the proportional-font counterpart of
 * `truncateToWidth`. `measure` is `measureSans`/`measureMono` bound to a size.
 */
export function truncateToFit(text: string, maxWidth: number, measure: (s: string) => number): string {
  if (!(maxWidth > 0)) return text;
  if (withSafety(measure(text)) <= maxWidth) return text;
  const chars = [...text];
  for (let n = chars.length - 1; n > 0; n--) {
    const candidate = `${chars.slice(0, n).join('').trimEnd()}${ELLIPSIS}`;
    if (withSafety(measure(candidate)) <= maxWidth) return candidate;
  }
  return ELLIPSIS;
}

// ---------------------------------------------------------------------------
// Node anatomy — must match the diagram build's own sizing numbers.
// ---------------------------------------------------------------------------

/** Title font size, px (`.cv-label`). */
export const TITLE_FONT_PX = 13;
/** Sub-label font size, px (`.cv-sub`). */
export const SUB_FONT_PX = 12;
/** Text column's left edge, px from the node's left (icon inset + glyph + gap). */
export const TEXT_X = 38;
/** Right padding of the sub-label line, px. */
export const TEXT_PAD_R = 12;
/** Right reservation of the title line, px: the top-right status glyph slot plus a gap. */
export const TITLE_PAD_R = 26;
/** Collapsed subsystem: the inline expand glyph after the sub-label (gap + glyph), px. */
export const EXPAND_GLYPH_W = 18;

/** Short kind names for the sub-label head. */
const KIND_SHORT: Readonly<Record<string, string>> = {
  messageBus: 'bus',
  apiGateway: 'gateway',
  objectStore: 'store',
};

/**
 * A node's mono sub-label: `<kind> · <detail>`, with the replica count
 * appended as ` ×N` to the detail — or standing in for it when there is
 * none (`worker · ×12`). The kind is the node type's short name, except a
 * `server`, whose own variant (`api`, `web`, …) already *is* its kind
 * (`api · ×6`, not `server · api ×6`).
 */
export function nodeSubLabel(form: string, flavor: string | undefined, stack: number | undefined): string {
  const serverKind = form === 'server' && flavor !== undefined;
  const head = serverKind ? flavor! : (KIND_SHORT[form] ?? form);
  const detail = serverKind ? undefined : flavor;
  const count = stack !== undefined && stack > 1 ? `×${stack}` : undefined;
  if (detail !== undefined) return `${head} · ${detail}${count ? ` ${count}` : ''}`;
  return count ? `${head} · ${count}` : head;
}

/** The collapsed subsystem card's sub-label. */
export function subsystemSubLabel(nodeCount: number): string {
  return `${nodeCount} node${nodeCount === 1 ? '' : 's'}`;
}
