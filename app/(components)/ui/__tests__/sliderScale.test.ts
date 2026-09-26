import { describe, it, expect } from 'vitest';
import { logBounds, positionToValue, valueToPosition } from '../sliderScale';

describe('slider log-scale mapping', () => {
  it('maps value <-> internal position through log10 for scale="log"', () => {
    expect(valueToPosition(1, 1, 10000, 'log')).toBeCloseTo(0);
    expect(valueToPosition(100, 1, 10000, 'log')).toBeCloseTo(2);
    expect(valueToPosition(10000, 1, 10000, 'log')).toBeCloseTo(4);

    expect(positionToValue(0, 1, 10000, 'log')).toBeCloseTo(1);
    expect(positionToValue(2, 1, 10000, 'log')).toBeCloseTo(100);
    expect(positionToValue(4, 1, 10000, 'log')).toBeCloseTo(10000);
  });

  it('round-trips value -> position -> value', () => {
    for (const v of [1, 5, 42, 400, 9999]) {
      const pos = valueToPosition(v, 1, 10000, 'log');
      expect(positionToValue(pos, 1, 10000, 'log')).toBeCloseTo(v, 5);
    }
  });

  it('is the identity for scale="linear"', () => {
    expect(valueToPosition(42, 0, 100, 'linear')).toBe(42);
    expect(positionToValue(42, 0, 100, 'linear')).toBe(42);
  });

  it('computes log10 bounds for the internal track', () => {
    const bounds = logBounds(1, 10000);
    expect(bounds.min).toBeCloseTo(0);
    expect(bounds.max).toBeCloseTo(4);
  });
});
