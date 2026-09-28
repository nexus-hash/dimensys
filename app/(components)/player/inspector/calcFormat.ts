import { formatMs, formatPercent, formatRps, formatUsd } from '@/app/(components)/data';

const grouped = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const whole = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'] as const;

/** A formatted calculator value: the mono number and its (smaller) unit, kept apart like every other readout. */
export interface CalcReading {
  value: string;
  unit: string;
}

/**
 * Formats one calculator output by its declared format (`number`,
 * `integer`, `bytes`, `rps`, `ms`, `usd`, `percent`; anything else reads as
 * `number`). `percent` is a 0–1 ratio, like every other ratio in the player.
 */
export function formatCalcValue(value: number | undefined, fmt: string): CalcReading {
  if (value === undefined || !Number.isFinite(value)) return { value: '—', unit: '' };
  switch (fmt) {
    case 'integer':
      return { value: whole.format(Math.round(value)), unit: '' };
    case 'bytes': {
      let v = Math.abs(value);
      let i = 0;
      while (v >= 1000 && i < BYTE_UNITS.length - 1) {
        v /= 1000;
        i += 1;
      }
      return { value: (value < 0 ? '-' : '') + (v >= 100 || i === 0 ? whole.format(v) : v.toFixed(1)), unit: BYTE_UNITS[i] };
    }
    case 'rps':
      return { value: formatRps(value), unit: 'rps' };
    case 'ms':
      return { value: formatMs(value), unit: 'ms' };
    case 'usd':
      return { value: formatUsd(value), unit: '' };
    case 'percent':
      return { value: formatPercent(value), unit: '%' };
    default:
      return { value: grouped.format(value), unit: '' };
  }
}

/** A slider's readout: grouped, at most two decimals. */
export function formatSliderValue(value: number): string {
  return grouped.format(value);
}

/**
 * The step a slider moves by when the view gives none: about a hundredth of
 * its range, snapped to 1, 2 or 5 × a power of ten, and never below 1 for a
 * range of at least 100 between whole-number ends.
 */
export function sliderStep(lo: number, hi: number, inc?: number): number {
  if (inc !== undefined && inc > 0) return inc;
  const raw = (hi - lo) / 100;
  if (!(raw > 0)) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const nice = [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw;
  return Number.isInteger(lo) && Number.isInteger(hi) && hi - lo >= 100 ? Math.max(1, nice) : nice;
}

/** Snaps a raw slider value into range; log sliders keep three significant digits, linear ones the step. */
export function snapSliderValue(raw: number, lo: number, hi: number, step: number, log?: true): number {
  const clamped = Math.min(hi, Math.max(lo, raw));
  if (log) return Math.min(hi, Math.max(lo, Number(clamped.toPrecision(3))));
  const snapped = Math.round((clamped - lo) / step) * step + lo;
  return Math.min(hi, Math.max(lo, Number(snapped.toFixed(10))));
}
