import { describe, it, expect } from 'vitest';
import {
  parseMetricKey,
  nodeMetricKey,
  linkMetricKey,
  flowMetricKey,
  globalMetricKey,
  metricCodeLabel,
  metricCodeUnit,
  LINK_RPS_CODE,
  LINK_ERROR_RATE_CODE,
  LINK_RETRY_RPS_CODE,
  LINK_UP_CODE,
  LINK_TOOLTIP_CODES,
  NODE_UP_CODE,
  NODE_LATENCY_CODE,
  NODE_P99_LATENCY_CODE,
  NODE_ERROR_RATE_CODE,
  NODE_TOOLTIP_CODES,
  UTILIZATION_CODE,
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
    expect(metricCodeLabel('Q')).toBe('Q');
    expect(metricCodeUnit('Q')).toBe('');
  });

  it('knows the lost-writes code (u)', () => {
    expect(metricCodeLabel('u')).toBe('lost writes');
    expect(metricCodeUnit('u')).toBe('writes');
  });
});

describe('per-scope code sets', () => {
  it('fixes the exact link code letters (no per-link latency)', () => {
    expect(LINK_RPS_CODE).toBe('n');
    expect(LINK_ERROR_RATE_CODE).toBe('f');
    expect(LINK_RETRY_RPS_CODE).toBe('o');
    expect(LINK_UP_CODE).toBe('h');
    expect(LINK_TOOLTIP_CODES).toEqual(['n', 'f', 'o']);
  });

  it('fixes the exact node code letters the interactive layer reads', () => {
    expect(UTILIZATION_CODE).toBe('c');
    expect(NODE_UP_CODE).toBe('h');
    expect(NODE_LATENCY_CODE).toBe('d');
    expect(NODE_P99_LATENCY_CODE).toBe('e');
    expect(NODE_ERROR_RATE_CODE).toBe('f');
    expect(NODE_TOOLTIP_CODES).toEqual(['c', 'd', 'e', 'f']);
  });
});
