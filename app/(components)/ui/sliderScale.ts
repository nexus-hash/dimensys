/**
 * Pure log-scale mapping for `Slider`'s `scale="log"` option, split out so it
 * can be unit-tested without mounting the Radix slider.
 *
 * The slider's internal (Radix) track always runs linearly from
 * `Math.log10(min)` to `Math.log10(max)`; these convert between that
 * internal position and the real-world value it represents.
 */
export function valueToPosition(value: number, min: number, max: number, scale: 'linear' | 'log'): number {
  if (scale === 'linear') return value;
  const safeValue = Math.max(value, Number.EPSILON);
  return Math.log10(safeValue);
}

export function positionToValue(position: number, min: number, max: number, scale: 'linear' | 'log'): number {
  if (scale === 'linear') return position;
  return Math.pow(10, position);
}

export function logBounds(min: number, max: number): { min: number; max: number } {
  return { min: Math.log10(Math.max(min, Number.EPSILON)), max: Math.log10(Math.max(max, Number.EPSILON)) };
}
