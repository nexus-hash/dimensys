import { describe, it, expect } from 'vitest';
import { buildGlobalMetricIndex, readGlobalMetric, gaugeCode } from '../globalMetrics';
import type { SimFrame } from '../../store/playerStore';

const metricKeys = ['n:api.c', 'g.e', 'g.f', 'l:l1.n'];

describe('buildGlobalMetricIndex', () => {
  it('indexes only the global (g.*) columns', () => {
    const index = buildGlobalMetricIndex(metricKeys);
    expect(index.get('e')).toBe(1);
    expect(index.get('f')).toBe(2);
    expect(index.get('c')).toBeUndefined(); // n:api.c, not global
  });
});

describe('readGlobalMetric', () => {
  const index = buildGlobalMetricIndex(metricKeys);
  function frame(values: number[]): SimFrame {
    return { t: 1, keysEpoch: 0, metrics: Float64Array.from(values), health: new Uint8Array(0) };
  }

  it('reads a published global column', () => {
    expect(readGlobalMetric(frame([0, 12, 0.02, 0]), index, 'e')).toBe(12);
  });
  it('returns undefined for NaN (not published this frame)', () => {
    expect(readGlobalMetric(frame([0, NaN, 0.02, 0]), index, 'e')).toBeUndefined();
  });
  it('returns undefined for a code this build never publishes', () => {
    expect(readGlobalMetric(frame([0, 12, 0.02, 0]), index, 'm')).toBeUndefined();
  });
  it('returns undefined with no frame', () => {
    expect(readGlobalMetric(null, index, 'e')).toBeUndefined();
  });
});

describe('gaugeCode', () => {
  it('extracts the bare code from a global probe', () => {
    expect(gaugeCode('g.e')).toBe('e');
  });
  it('returns null for a non-global probe', () => {
    expect(gaugeCode('n:api.c')).toBeNull();
  });
});
