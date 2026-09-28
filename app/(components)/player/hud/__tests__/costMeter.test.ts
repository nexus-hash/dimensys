import { describe, expect, it } from 'vitest';
import { billedPeriod, formatDollars } from '../CostMeter';

describe('billedPeriod (60 simulated seconds = one month)', () => {
  it('reads days under a month', () => {
    expect(billedPeriod(0)).toBe('0 d');
    expect(billedPeriod(30)).toBe('15 d');
  });
  it('reads months and days', () => {
    expect(billedPeriod(60)).toBe('1 mo');
    expect(billedPeriod(90)).toBe('1 mo 15 d');
    expect(billedPeriod(600)).toBe('10 mo');
  });
});

describe('formatDollars', () => {
  it('rounds to whole dollars and switches to millions', () => {
    expect(formatDollars(1234.6)).toBe('$1,235');
    expect(formatDollars(2_500_000)).toBe('$2.50M');
  });
});
