import type { HealthState } from './types';

/**
 * The health glyph ("health is never shown by color
 * alone"). Every non-`ok` state pairs its ring/hatch with one of these
 * shapes, so the state reads under color-vision deficiency or forced-colors
 * mode without relying on hue. Matches the prototype's `GLYPH` map.
 */
export function HealthGlyph({
  state,
  size = 16,
  className,
  ariaLabel,
}: {
  state: HealthState;
  size?: number;
  className?: string;
  ariaLabel?: string;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 16 16',
    className,
    focusable: false as const,
  };
  const a11y = ariaLabel ? { role: 'img' as const, 'aria-label': ariaLabel } : { 'aria-hidden': true as const };

  switch (state) {
    case 'ok':
      return (
        <svg {...common} {...a11y}>
          <circle cx={8} cy={8} r={7} style={{ fill: 'var(--color-signal-ok)' }} />
          <path
            d="M4.8 8.2l2.1 2.1 4.3-4.4"
            fill="none"
            style={{ stroke: 'var(--color-ink-inverse)' }}
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'warn':
      return (
        <svg {...common} {...a11y}>
          <path d="M8 1.5l7 12.5H1z" style={{ fill: 'var(--color-signal-warn)' }} />
          <path d="M8 6v3.6M8 11.6v.1" style={{ stroke: 'var(--color-warn-ink)' }} strokeWidth={1.6} strokeLinecap="round" />
        </svg>
      );
    case 'critical':
      return (
        <svg {...common} {...a11y}>
          <path d="M5.1 1h5.8L15 5.1v5.8L10.9 15H5.1L1 10.9V5.1z" style={{ fill: 'var(--color-signal-critical)' }} />
          <path
            d="M5.6 5.6l4.8 4.8M10.4 5.6l-4.8 4.8"
            style={{ stroke: 'var(--color-ink-inverse)' }}
            strokeWidth={1.6}
            strokeLinecap="round"
          />
        </svg>
      );
    case 'down':
      return (
        <svg
          {...common}
          {...a11y}
          fill="none"
          style={{ stroke: 'var(--color-ink-secondary)' }}
          strokeWidth={1.5}
          strokeLinecap="round"
        >
          <path d="M8 2v6" />
          <path d="M4.4 4.6a5 5 0 1 0 7.2 0" />
        </svg>
      );
    case 'recovering':
      return (
        <svg
          {...common}
          {...a11y}
          fill="none"
          style={{ stroke: 'var(--color-signal-warn)' }}
          strokeWidth={1.6}
          strokeLinecap="round"
        >
          <path d="M13.5 8A5.5 5.5 0 1 1 11.8 4" />
          <path d="M12.5 1.5v3h-3" />
        </svg>
      );
    default:
      return (
        <svg {...common} {...a11y}>
          <circle cx={8} cy={8} r={2.5} style={{ fill: 'var(--color-ink-muted)' }} />
        </svg>
      );
  }
}
