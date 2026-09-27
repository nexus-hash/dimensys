import { describe, it, expect } from 'vitest';
import { tileDelta } from '../tileDelta';

describe('tileDelta', () => {
  it('returns undefined with no value or no baseline yet', () => {
    expect(tileDelta('e', undefined, 100)).toBeUndefined();
    expect(tileDelta('e', 100, undefined)).toBeUndefined();
  });

  it('reads within the noise floor as baseline, uncolored', () => {
    const d = tileDelta('e', 103, 100)!;
    expect(d.text).toBe('≈ baseline');
    expect(d.direction).toBe(0);
    expect(d.bad).toBeUndefined();
  });

  it('a latency rise past 1.5x baseline is bad and gets a multiple', () => {
    const d = tileDelta('e', 1000, 40)!; // 25x
    expect(d.text).toBe('25×');
    expect(d.direction).toBe(1);
    expect(d.bad).toBe('critical');
  });

  it('a latency drop is not bad (direction shows, no color)', () => {
    const d = tileDelta('e', 20, 40)!; // half
    expect(d.direction).toBe(-1);
    expect(d.bad).toBeUndefined();
  });

  it('a throughput *drop* is the bad direction, a rise is not', () => {
    const drop = tileDelta('q', 1000, 4000)!; // -75%
    expect(drop.bad).toBe('critical');
    const rise = tileDelta('q', 5000, 4000)!; // +25%
    expect(rise.bad).toBeUndefined();
  });

  it('a code with no bad-direction entry never colors (e.g. cost)', () => {
    const d = tileDelta('m', 3000, 2000)!;
    expect(d.bad).toBeUndefined();
  });

  it('a smaller change (under 1.5x) reads as a percentage, not a multiple', () => {
    const d = tileDelta('f', 0.012, 0.01)!; // +20%, under the 1.5x multiple cutoff
    expect(d.text).toMatch(/^\+\d+%$/);
  });
});
