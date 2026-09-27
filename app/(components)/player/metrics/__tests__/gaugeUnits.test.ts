import { describe, it, expect } from 'vitest';
import { unitForSuffix, thresholdKindForCode } from '../gaugeUnits';

describe('unitForSuffix', () => {
  it('maps every gauge suffix the url-shortener/netflix diagrams use', () => {
    expect(unitForSuffix('ms')).toBe('ms');
    expect(unitForSuffix('%')).toBe('%');
    expect(unitForSuffix('rps')).toBe('rps');
    expect(unitForSuffix('$/mo')).toBe('usd-mo');
  });
  it('falls back to a bare count for an unrecognized suffix', () => {
    expect(unitForSuffix('msgs')).toBe('count');
  });
});

describe('thresholdKindForCode', () => {
  it('maps latency-family codes to the p99 threshold table', () => {
    expect(thresholdKindForCode('e')).toBe('p99');
    expect(thresholdKindForCode('d')).toBe('p99');
    expect(thresholdKindForCode('r')).toBe('p99');
  });
  it('maps error rate, utilization and lag to their own kinds', () => {
    expect(thresholdKindForCode('f')).toBe('err');
    expect(thresholdKindForCode('c')).toBe('util');
    expect(thresholdKindForCode('k')).toBe('lag');
  });
  it('returns undefined for a code with no severity table (throughput, cost, …)', () => {
    expect(thresholdKindForCode('q')).toBeUndefined();
    expect(thresholdKindForCode('m')).toBeUndefined();
  });
});
