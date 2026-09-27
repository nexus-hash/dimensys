import { describe, it, expect } from 'vitest';
import {
  parseMetricKey,
  nodeMetricKey,
  linkMetricKey,
  flowMetricKey,
  globalMetricKey,
  metricCodeLabel,
  metricCodeUnit,
} from '../metricKeys';

describe('parseMetricKey', () => {
  it('parses a per-node key', () => {
    expect(parseMetricKey('n:api.c')).toEqual({ scope: 'n', id: 'api', code: 'c' });
  });

  it('parses a per-link key', () => {
    expect(parseMetricKey('l:edge-1.n')).toEqual({ scope: 'l', id: 'edge-1', code: 'n' });
  });

  it('parses a per-flow key', () => {
    expect(parseMetricKey('f:checkout.e')).toEqual({ scope: 'f', id: 'checkout', code: 'e' });
  });

  it('parses a global key (no id)', () => {
    expect(parseMetricKey('g.e')).toEqual({ scope: 'g', id: null, code: 'e' });
  });

  it('handles an element id that itself contains dots', () => {
    expect(parseMetricKey('n:region.us-east.c')).toEqual({ scope: 'n', id: 'region.us-east', code: 'c' });
  });

  it('refuses the retired runtime-format-1 forms', () => {
    expect(parseMetricKey('node:api.utilization')).toBeNull();
    expect(parseMetricKey('global.p99Ms')).toBeNull();
  });

  it('returns null for garbage input', () => {
    expect(parseMetricKey('')).toBeNull();
    expect(parseMetricKey('not-a-key')).toBeNull();
    expect(parseMetricKey('n:api')).toBeNull();
  });
});

describe('key builders', () => {
  it('round-trip with parseMetricKey', () => {
    expect(parseMetricKey(nodeMetricKey('api', 'c'))).toEqual({ scope: 'n', id: 'api', code: 'c' });
    expect(parseMetricKey(linkMetricKey('edge-1', 'n'))).toEqual({ scope: 'l', id: 'edge-1', code: 'n' });
    expect(parseMetricKey(flowMetricKey('checkout', 'e'))).toEqual({ scope: 'f', id: 'checkout', code: 'e' });
    expect(parseMetricKey(globalMetricKey('e'))).toEqual({ scope: 'g', id: null, code: 'e' });
  });
});

describe('metricCodeLabel / metricCodeUnit', () => {
  it('labels known codes with plain UI text', () => {
    expect(metricCodeLabel('e')).toBe('p99 latency');
    expect(metricCodeUnit('e')).toBe('ms');
    expect(metricCodeLabel('c')).toBe('utilization');
    expect(metricCodeUnit('m')).toBe('$/mo');
  });

  it('falls back gracefully for an unknown code', () => {
    expect(metricCodeLabel('z')).toBe('z');
    expect(metricCodeUnit('z')).toBe('');
  });

  it('knows the lost-writes code (u)', () => {
    expect(metricCodeLabel('u')).toBe('lost writes');
    expect(metricCodeUnit('u')).toBe('writes');
  });
});
