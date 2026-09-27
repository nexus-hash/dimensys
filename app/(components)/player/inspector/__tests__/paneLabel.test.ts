import { describe, it, expect } from 'vitest';
import { paneLabel } from '../paneLabel';

describe('paneLabel', () => {
  it('capitalizes a single-word pane id', () => {
    expect(paneLabel('overview')).toBe('Overview');
    expect(paneLabel('architecture')).toBe('Architecture');
    expect(paneLabel('operations')).toBe('Operations');
  });

  it('splits camelCase pane ids into words', () => {
    expect(paneLabel('loadTest')).toBe('Load Test');
  });

  it('splits kebab-case and snake_case pane ids into words', () => {
    expect(paneLabel('load-test')).toBe('Load Test');
    expect(paneLabel('load_test')).toBe('Load Test');
  });

  it('falls back to the raw id for an empty string', () => {
    expect(paneLabel('')).toBe('');
  });
});
