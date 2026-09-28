import { describe, expect, it } from 'vitest';
import { withReplicas } from '../domHealth';

describe('withReplicas', () => {
  it('replaces an existing count', () => {
    expect(withReplicas('api · ×6', 8)).toBe('api · ×8');
    expect(withReplicas('lb · nginx ×2', 3)).toBe('lb · nginx ×3');
  });
  it('adds a count where there was none', () => {
    expect(withReplicas('db · nosql', 3)).toBe('db · nosql ×3');
  });
  it('shows no count for a single replica', () => {
    expect(withReplicas('api · ×6', 1)).toBe('api');
    expect(withReplicas('db · nosql', 1)).toBe('db · nosql');
    expect(withReplicas('worker', 1)).toBe('worker');
  });
});
