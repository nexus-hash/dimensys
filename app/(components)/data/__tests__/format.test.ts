import { describe, it, expect } from 'vitest';
import {
  formatMs,
  formatSeconds,
  formatPercent,
  formatRps,
  formatUsd,
  formatMetric,
  formatMetricValue,
  metricUnitLabel,
  severityOf,
  severityFromThresholds,
} from '../format';

describe('formatMs', () => {
  it('keeps one decimal below 10ms', () => {
    expect(formatMs(1.234)).toBe('1.2');
  });
  it('rounds and groups at/above 10ms', () => {
    expect(formatMs(640)).toBe('640');
    expect(formatMs(12345)).toBe('12,345');
  });
  it('returns an em dash for non-finite input', () => {
    expect(formatMs(NaN)).toBe('—');
    expect(formatMs(Infinity)).toBe('—');
    expect(formatMs(null)).toBe('—');
    expect(formatMs(undefined)).toBe('—');
  });
});

describe('formatSeconds', () => {
  it('keeps two decimals below 10s, one above', () => {
    expect(formatSeconds(1.234)).toBe('1.23');
    expect(formatSeconds(42)).toBe('42.0');
  });
  it('returns an em dash for non-finite input', () => {
    expect(formatSeconds(NaN)).toBe('—');
  });
});

describe('formatPercent', () => {
  it('formats a 0-1 ratio as a percent with one decimal by default', () => {
    expect(formatPercent(0.382)).toBe('38.2');
  });
  it('rounds to an integer at/above 100%', () => {
    expect(formatPercent(1.049)).toBe('105');
  });
  it('honors an explicit decimals count for small values', () => {
    expect(formatPercent(0.0042, 2)).toBe('0.42');
  });
  it('returns an em dash for non-finite input', () => {
    expect(formatPercent(undefined)).toBe('—');
  });
});

describe('formatRps', () => {
  it('renders sub-1000 as a rounded integer', () => {
    expect(formatRps(482.6)).toBe('483');
  });
  it('compacts to k above 1,000', () => {
    expect(formatRps(3858)).toBe('3.9k');
  });
  it('compacts to M above 1,000,000', () => {
    expect(formatRps(2_400_000)).toBe('2.4M');
  });
  it('returns an em dash for non-finite input', () => {
    expect(formatRps(NaN)).toBe('—');
  });
});

describe('formatUsd', () => {
  it('groups and rounds to whole dollars', () => {
    expect(formatUsd(2161.4)).toBe('$2,161');
  });
  it('returns an em dash for non-finite input', () => {
    expect(formatUsd(null)).toBe('—');
  });
});

describe('metricUnitLabel', () => {
  it('maps each unit to its short label', () => {
    expect(metricUnitLabel('ms')).toBe('ms');
    expect(metricUnitLabel('s')).toBe('s');
    expect(metricUnitLabel('%')).toBe('%');
    expect(metricUnitLabel('rps')).toBe('rps');
    expect(metricUnitLabel('usd-mo')).toBe('/mo');
    expect(metricUnitLabel('count')).toBe('');
  });
});

describe('formatMetricValue / formatMetric', () => {
  it('dispatches to the matching formatter per unit', () => {
    expect(formatMetricValue(640, 'ms')).toBe('640');
    expect(formatMetricValue(0.382, '%')).toBe('38.2');
    expect(formatMetricValue(3858, 'rps')).toBe('3.9k');
    expect(formatMetricValue(2161, 'usd-mo')).toBe('$2,161');
    expect(formatMetricValue(12, 'count')).toBe('12');
  });
  it('combines value and unit label, and drops the unit on a dash', () => {
    expect(formatMetric(640, 'ms')).toBe('640 ms');
    expect(formatMetric(2161, 'usd-mo')).toBe('$2,161 /mo');
    expect(formatMetric(12, 'count')).toBe('12');
    expect(formatMetric(NaN, 'ms')).toBe('—');
  });
});

describe('severityOf (fixed HEALTH thresholds)', () => {
  it('is ok below the warn threshold', () => {
    expect(severityOf('util', 0.5)).toBe(0);
  });
  it('is warn at/above the warn threshold', () => {
    expect(severityOf('util', 0.7)).toBe(1);
    expect(severityOf('util', 0.85)).toBe(1);
  });
  it('is critical at/above the critical threshold', () => {
    expect(severityOf('util', 0.9)).toBe(2);
    expect(severityOf('p99', 2500)).toBe(2);
  });
  it('is ok for missing/non-finite values', () => {
    expect(severityOf('err', undefined)).toBe(0);
    expect(severityOf('err', NaN)).toBe(0);
  });
});

describe('severityFromThresholds', () => {
  it('honors explicit warn/critical thresholds', () => {
    expect(severityFromThresholds(0.5, 0.7, 0.9)).toBe(0);
    expect(severityFromThresholds(0.75, 0.7, 0.9)).toBe(1);
    expect(severityFromThresholds(0.95, 0.7, 0.9)).toBe(2);
  });
  it('is ok when no thresholds are given', () => {
    expect(severityFromThresholds(0.99, undefined, undefined)).toBe(0);
  });
  it('is ok for missing/non-finite values', () => {
    expect(severityFromThresholds(NaN, 0.7, 0.9)).toBe(0);
  });
});
