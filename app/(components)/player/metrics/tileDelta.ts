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

export function tileDelta(code: string, value: number | undefined, baseline: number | undefined): StatTileDelta | undefined {
  if (value === undefined || baseline === undefined || baseline === 0 || !Number.isFinite(value)) return undefined;
  const ratio = value / baseline;
  const rel = ratio - 1;

  if (Math.abs(rel) < NOISE_FLOOR) return { direction: 0, text: '≈ baseline' };

  const rose = rel > 0;
  const direction = BAD_DIRECTION[code] ?? 'neutral';
  const bad = direction !== 'neutral' && (direction === 'up' ? rose : !rose);

  let text: string;
  if (ratio >= 1.5 || ratio <= 1 / 1.5) {
    const mult = ratio >= 1 ? ratio : 1 / ratio;
    const multText = (mult >= 10 ? Math.round(mult) : mult.toFixed(1)) + '×';
    text = ratio >= 1 ? multText : `${multText} ${direction === 'up' ? 'lower' : 'higher'}`;
  } else {
    const pct = Math.round(Math.abs(rel) * 100);
    text = `${rose ? '+' : '-'}${pct}%`;
  }

  return { direction: rose ? 1 : -1, text, bad: bad ? 'critical' : undefined };
}
