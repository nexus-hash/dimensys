import { DiagramCard } from './DiagramCard';

/**
 * "01 Break -> Fix" static visual (S4.6a). The prototype's looping
 * no-backoff/with-backoff clip needs a Canvas2D demo this task doesn't
 * build — left as a documented slot below. What renders here is honest,
 * static and true today: this is the same shape the real simulator draws,
 * captioned so nobody mistakes it for a live loop.
 */
export function BreakFixVisual() {
  return (
    <DiagramCard>
      <svg
        viewBox="0 0 420 160"
        role="img"
        aria-label="Diagram: clients call the API, the API calls a database that is running critically slow"
        className="w-full"
      >
        <path d="M96 80H150" style={{ stroke: 'var(--color-line-strong)', strokeWidth: 1.5, fill: 'none' }} />
        <path
          d="M254 80H300"
          style={{ stroke: 'var(--color-signal-critical)', strokeWidth: 1.5, fill: 'none', strokeDasharray: '2 6' }}
        />
        <g>
          <rect x="16" y="56" width="80" height="48" rx="10" style={{ fill: 'var(--color-surface-raised)', stroke: 'var(--color-line-strong)' }} />
          <text x="56" y="84" textAnchor="middle" style={{ font: '600 12px var(--font-sans)', fill: 'var(--color-ink-primary)' }}>
            Clients
          </text>
        </g>
        <g>
          <rect x="150" y="56" width="104" height="48" rx="10" style={{ fill: 'var(--color-surface-raised)', stroke: 'var(--color-line-strong)' }} />
          <text x="202" y="84" textAnchor="middle" style={{ font: '600 12px var(--font-sans)', fill: 'var(--color-ink-primary)' }}>
            API
          </text>
        </g>
        <g>
          <rect
            x="295"
            y="51"
            width="114"
            height="58"
            rx="13"
            style={{ fill: 'none', stroke: 'var(--color-signal-critical)', strokeWidth: 2 }}
          />
          <rect x="300" y="56" width="104" height="48" rx="10" style={{ fill: 'var(--color-surface-raised)', stroke: 'var(--color-line-strong)' }} />
          <text x="352" y="78" textAnchor="middle" style={{ font: '600 12px var(--font-sans)', fill: 'var(--color-ink-primary)' }}>
            Database
          </text>
          <text
            x="352"
            y="96"
            textAnchor="middle"
            style={{ font: '500 11px var(--font-mono)', fill: 'var(--color-signal-critical)' }}
          >
            p99 4.2s
          </text>
        </g>
      </svg>
      <figcaption className="mt-4 font-mono text-mono-sm text-ink-muted">
        same shape the simulator draws · no backoff yet, so retries pile up
      </figcaption>
    </DiagramCard>
  );
}
