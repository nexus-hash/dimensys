/**
 * Simulated-time clock formatting (T3.8) — `mm:ss`, e.g. `"01:32"`. Distinct
 * from the data-display kit's `formatSeconds` (a decimal duration reading
 * like `"1.32"`): the timeline dock's clock is a wall-clock-style pair the
 * kit has no equivalent for.
 */
export function fmtSimTime(t: number): string {
  const s = Math.max(0, Math.floor(t));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return String(m).padStart(2, '0') + ':' + String(r).padStart(2, '0');
}
