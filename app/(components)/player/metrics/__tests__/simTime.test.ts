import { describe, it, expect } from 'vitest';
import { fmtSimTime } from '../simTime';

describe('fmtSimTime', () => {
  it('formats mm:ss, floored', () => {
    expect(fmtSimTime(92.9)).toBe('01:32');
  });
  it('floors negative/zero to 00:00', () => {
    expect(fmtSimTime(-5)).toBe('00:00');
  });
});
