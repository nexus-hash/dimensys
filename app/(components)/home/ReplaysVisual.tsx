import { DiagramCard } from './DiagramCard';

/**
 * "02 Outage replays" showcase visual (S4.6a). Replays aren't built yet —
 * no incident data exists to render honestly, so this stays generic and
 * unlabeled rather than inventing a postmortem with fabricated numbers the
 * way the design's mock (a specific dated Cloudflare outage) does. The
 * link this section would carry is left off entirely (see `ShowcaseSection`
 * `comingSoon`) until a real Replays destination exists.
 */
export function ReplaysVisual() {
  return (
    <DiagramCard>
      <svg
        viewBox="0 0 420 140"
        role="img"
        aria-label="Illustrative diagram: users, an edge layer and an origin service, one link marked as a bottleneck"
        className="w-full"
      >
        <path d="M96 70H150M254 70H295" style={{ stroke: 'var(--color-line-strong)', strokeWidth: 1.5, fill: 'none' }} />
        <g>
          <rect x="16" y="46" width="80" height="48" rx="10" style={{ fill: 'var(--color-surface-raised)', stroke: 'var(--color-line-strong)' }} />
          <text x="56" y="74" textAnchor="middle" style={{ font: '600 12px var(--font-sans)', fill: 'var(--color-ink-primary)' }}>
            Users
          </text>
        </g>
        <g>
          <rect
            x="150"
            y="41"
            width="114"
            height="58"
            rx="13"
            style={{ fill: 'none', stroke: 'var(--color-signal-warn)', strokeWidth: 2 }}
          />
          <rect x="155" y="46" width="104" height="48" rx="10" style={{ fill: 'var(--color-surface-raised)', stroke: 'var(--color-line-strong)' }} />
          <text x="207" y="74" textAnchor="middle" style={{ font: '600 12px var(--font-sans)', fill: 'var(--color-ink-primary)' }}>
            Edge
          </text>
        </g>
        <g>
          <rect x="295" y="46" width="80" height="48" rx="10" style={{ fill: 'var(--color-surface-raised)', stroke: 'var(--color-line-strong)' }} />
          <text x="335" y="74" textAnchor="middle" style={{ font: '600 12px var(--font-sans)', fill: 'var(--color-ink-primary)' }}>
            Origin
          </text>
        </g>
      </svg>
      <figcaption className="mt-4 font-mono text-mono-sm text-ink-muted">
        real incidents, rebuilt from public postmortems — in progress
      </figcaption>
    </DiagramCard>
  );
}
