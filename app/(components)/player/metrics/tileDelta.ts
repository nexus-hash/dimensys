/**
 * HUD tile delta-vs-baseline (T3.8), matching the visual contract's own
 * tile delta logic: a big jump gets a "×" multiple, a smaller one a
 * percentage, and a change inside the noise floor just reads "≈ baseline".
 * Shaped to drop straight into `StatTile`'s own `delta` prop.
 */
import type { StatTileDelta } from '@/app/(components)/data';

/** Whether a *rise* in this metric code is the bad direction, the good direction, or neither (no color, ever — e.g. cost). */
const BAD_DIRECTION: Readonly<Record<string, 'up' | 'down' | 'neutral'>> = {
  d: 'up', // mean latency
  e: 'up', // p99 latency
  r: 'up', // p50 latency
  f: 'up', // error rate
  c: 'up', // utilization
  k: 'up', // replication lag
  o: 'up', // retries
  u: 'up', // lost writes
  q: 'down', // throughput — a drop is the bad direction
  p: 'down', // successful requests
  j: 'down', // hit ratio
  s: 'down', // availability
};

const NOISE_FLOOR = 0.05; // ±5% of baseline reads as "no real change"

/** Metrics that are shares (0–1): their change reads in percentage points, since a ratio of two tiny shares means nothing. */
const SHARE_CODES = new Set(['f', 'c', 's', 'j', 'w', 'y']);
/** A change of less than this many points reads as "≈ baseline". */
const POINT_FLOOR = 1;

/**
 * - No reading, or no data (a latency with no successful requests): no delta.
 * - Shares (error rate, utilization, availability, hit ratio…): "+37 pts".
 * - A rise of 1.5× or more: "4.2×"; a smaller rise: "+12%".
 * - A fall: always a percentage ("-40%", "-100%" when it drops to nothing).
 */
export function tileDelta(code: string, value: number | undefined, baseline: number | undefined): StatTileDelta | undefined {
  if (value === undefined || baseline === undefined || !Number.isFinite(value) || !Number.isFinite(baseline)) return undefined;
  const direction = BAD_DIRECTION[code] ?? 'neutral';
  const badIf = (rose: boolean) => direction !== 'neutral' && (direction === 'up' ? rose : !rose);

  if (SHARE_CODES.has(code)) {
    const pts = (value - baseline) * 100;
    if (Math.abs(pts) < POINT_FLOOR) return { direction: 0, text: '≈ baseline' };
    const rose = pts > 0;
    return { direction: rose ? 1 : -1, text: `${rose ? '+' : '-'}${Math.round(Math.abs(pts))} pts`, bad: badIf(rose) ? 'critical' : undefined };
  }

  if (baseline <= 0) return undefined;
  const ratio = value / baseline;
  const rel = ratio - 1;
  if (Math.abs(rel) < NOISE_FLOOR) return { direction: 0, text: '≈ baseline' };
  const rose = rel > 0;
  let text: string;
  if (rose && ratio >= 1.5) text = `${ratio >= 10 ? Math.round(ratio) : ratio.toFixed(1)}×`;
  else text = `${rose ? '+' : '-'}${Math.min(100, Math.round(Math.abs(rel) * 100))}%`;
  return { direction: rose ? 1 : -1, text, bad: badIf(rose) ? 'critical' : undefined };
}
