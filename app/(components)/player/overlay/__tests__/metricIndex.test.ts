import { describe, it, expect } from 'vitest';
import { buildMetricIndex, readMetric } from '../metricIndex';

describe('buildMetricIndex', () => {
  it('indexes node and link columns by id and code', () => {
    const keys = ['n:api.c', 'n:api.h', 'l:link1.f', 'g.e'];
    const idx = buildMetricIndex(3, keys, ['api', 'link1']);
    expect(idx.nodeCols.get('api')?.get('c')).toBe(0);
    expect(idx.nodeCols.get('api')?.get('h')).toBe(1);
    expect(idx.linkCols.get('link1')?.get('f')).toBe(2);
    expect(idx.nodeCols.has('g')).toBe(false); // global keys aren't node-scoped
    expect(idx.healthRow.get('api')).toBe(0);
    expect(idx.healthRow.get('link1')).toBe(1);
  });

  it('ignores unparseable keys', () => {
    const idx = buildMetricIndex(1, ['garbage', 'n:api.c'], []);
    expect(idx.nodeCols.get('api')?.get('c')).toBe(1);
  });
});

describe('readMetric', () => {
  it('reads a column value and treats NaN as absent', () => {
    const idx = buildMetricIndex(1, ['n:api.c', 'n:api.f'], []);
    const metrics = new Float64Array([0.5, NaN]);
    expect(readMetric(idx.nodeCols, metrics, 'api', 'c')).toBe(0.5);
    expect(readMetric(idx.nodeCols, metrics, 'api', 'f')).toBeUndefined();
  });

  it('is undefined for an unknown id/code', () => {
    const idx = buildMetricIndex(1, ['n:api.c'], []);
    const metrics = new Float64Array([0.5]);
    expect(readMetric(idx.nodeCols, metrics, 'unknown', 'c')).toBeUndefined();
    expect(readMetric(idx.nodeCols, metrics, 'api', 'z')).toBeUndefined();
  });
});
