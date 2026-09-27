'use client';

import { formatMs, formatPercent, formatRps } from '@/app/(components)/data/format';
import { useGlobalMetricsFeed } from '@/app/(components)/player/metrics/useGlobalMetricsFeed';

/** Global metric codes the strip reads: p99 latency, error rate, throughput, retries. */
const CODES = ['e', 'f', 'q', 'o'] as const;

/**
 * The hero card's one-line metric strip: p99, error rate and throughput on
 * the left, retries on the right, read live from the shared global-metrics
 * feed (the same one the full player's HUD uses). Every value shows "—"
 * until the simulation's first frame arrives, or if this diagram doesn't
 * publish that metric — never a placeholder number.
 *
 * Must render inside the player's client boundary (`DiagramPlayer`'s
 * `heroFooter` slot). Not an aria-live region: it updates ten times a
 * second, which would flood a screen reader.
 */
export function HeroMetricStrip() {
  const feed = useGlobalMetricsFeed(CODES);
  const v = (code: (typeof CODES)[number]) => feed.metrics[code]?.value;

  return (
    <div
      data-slot="hero-hud"
      className="flex flex-wrap items-center gap-x-[18px] gap-y-1.5 border-t border-line-hairline px-3.5 py-3 font-mono text-[14px] font-semibold tabular-nums text-ink-primary"
    >
      <span className="sr-only">Live metrics:</span>
      <span className="inline-flex items-center gap-1.5">
        p99 <span data-metric="p99">{formatMs(v('e'))}</span>
        <small className="text-[12px] font-medium text-ink-muted">ms</small>
      </span>
      <span className="inline-flex items-center gap-1.5">
        err <span data-metric="err">{formatPercent(v('f'))}</span>
        <small className="text-[12px] font-medium text-ink-muted">%</small>
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span data-metric="rps">{formatRps(v('q'))}</span>
        <small className="text-[12px] font-medium text-ink-muted">rps</small>
      </span>
      <small className="ml-auto text-[12px] font-medium text-ink-muted">
        retries <span data-metric="retries">{formatRps(v('o'))}</span>
        {v('o') !== undefined ? ' rps' : ''}
      </small>
    </div>
  );
}
