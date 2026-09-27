import { useId } from 'react';

export type BrandMarkTone =
  /** Filled with the brand gradient (navbar, footer — the default lockup). */
  | 'gradient'
  /** One-colour fallback in flat brand orange (e.g. small/mono contexts). */
  | 'brand'
  /** One-colour fallback that follows the surrounding text color (`currentColor`) —
   *  used for the ink-on-light / ink-on-dark fallbacks named in the brand spec. */
  | 'ink';

export interface BrandMarkProps {
  /** Mark size in px (square). Minimum sensible size is 16 (favicon). */
  size?: number;
  tone?: BrandMarkTone;
  className?: string;
  /** Set only when the mark stands alone as a meaningful image (no adjacent wordmark/text). */
  title?: string;
}

/**
 * The "Fault line" brand mark (UI_UX_SPEC §2 Brand mark, concept C): one
 * diagram node, split and slipped along a diagonal fault — "break it" in one
 * shape. A single SVG on a 24px grid, two paths, no filters.
 *
 * Tones: `gradient` (default) fills with the brand gradient tokens via an
 * inline `<linearGradient>` (built from `--brand`/`--brand-strong`/
 * `--brand-tertiary`, never a literal hex — `npm run lint:colors` enforces
 * that for every `.tsx`/`.css` file). `brand` is the flat one-colour
 * fallback. `ink` fills with `currentColor`, so it reads correctly as
 * "ink on light" or "ink on dark" depending on where the caller places it
 * (e.g. `className="text-ink-primary"` picks up the theme-correct ink).
 */
export function BrandMark({ size = 24, tone = 'gradient', className = '', title }: BrandMarkProps) {
  const rawId = useId();
  const gradientId = `brand-mark-gradient-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const fill = tone === 'gradient' ? `url(#${gradientId})` : tone === 'brand' ? 'var(--brand)' : 'currentColor';

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {tone === 'gradient' ? (
        <defs>
          <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1="3" y1="2" x2="21" y2="22">
            <stop offset="0" stopColor="var(--brand)" />
            <stop offset="0.5" stopColor="var(--brand-strong)" />
            <stop offset="1" stopColor="var(--brand-tertiary)" />
          </linearGradient>
        </defs>
      ) : null}
      <g fill={fill}>
        <path transform="translate(-.25 1.5)" d="M6 3H12.9L9.9 21H6A3 3 0 0 1 3 18V6A3 3 0 0 1 6 3Z" />
        <path transform="translate(.25 -1.5)" d="M14.7 3H18A3 3 0 0 1 21 6V18A3 3 0 0 1 18 21H11.7Z" />
      </g>
    </svg>
  );
}
