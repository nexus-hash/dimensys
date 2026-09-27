import { describe, it, expect } from 'vitest';
import { resolveHealth } from '../colorBy';

describe('resolveHealth', () => {
  it('defaults an id with no lookup to ok', () => {
    expect(resolveHealth(undefined, 'api')).toEqual({ state: 'ok' });
  });

  it('defaults an id missing from the lookup to ok', () => {
    expect(resolveHealth({ db: { state: 'critical' } }, 'api')).toEqual({ state: 'ok' });
  });

  it('returns the looked-up state and label', () => {
    expect(resolveHealth({ api: { state: 'warn', label: 'p99 640 ms' } }, 'api')).toEqual({
      state: 'warn',
      label: 'p99 640 ms',
    });
  });
});
