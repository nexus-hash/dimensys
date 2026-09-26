import { describe, it, expect } from 'vitest';
import { fuzzyMatch, fuzzyFilter } from '../fuzzy';

describe('fuzzyMatch', () => {
  it('matches a subsequence and returns null for a non-subsequence', () => {
    expect(fuzzyMatch('cche', 'cache')).not.toBeNull();
    expect(fuzzyMatch('xyz', 'cache')).toBeNull();
  });

  it('is case-insensitive', () => {
    expect(fuzzyMatch('HLD', 'high level design')).not.toBeNull();
    expect(fuzzyMatch('hld', 'HLD Overview')).not.toBeNull();
  });

  it('matches an empty query against anything with score 0', () => {
    expect(fuzzyMatch('', 'anything')).toEqual({ score: 0, indices: [] });
  });

  it('scores a contiguous match higher than a scattered one of the same length', () => {
    const contiguous = fuzzyMatch('cache', 'Redis Cache');
    const scattered = fuzzyMatch('cache', 'Cost Advisory Cluster Health Explorer');
    expect(contiguous).not.toBeNull();
    expect(scattered).not.toBeNull();
    expect(contiguous!.score).toBeGreaterThan(scattered!.score);
  });

  it('scores a word-boundary match higher than the same contiguous run mid-word', () => {
    const boundary = fuzzyMatch('cache', 'cache-redis'); // "cache" starts at index 0: a boundary
    const midWord = fuzzyMatch('cache', 'memcache-redis'); // "cache" starts at index 3, preceded by "m"
    expect(boundary).not.toBeNull();
    expect(midWord).not.toBeNull();
    expect(boundary!.score).toBeGreaterThan(midWord!.score);
  });

  it('prefers an earlier match start over a later one', () => {
    const early = fuzzyMatch('kill', 'kill cache-redis');
    const late = fuzzyMatch('kill', 'jump to: kill cache-redis');
    expect(early).not.toBeNull();
    expect(late).not.toBeNull();
    expect(early!.score).toBeGreaterThan(late!.score);
  });
});

describe('fuzzyFilter', () => {
  const items = [
    { label: 'Kill cache-redis' },
    { label: 'Kill Cassandra' },
    { label: 'Apply exponential backoff' },
    { label: 'Jump to: Cache dies at peak' },
    { label: 'Keyboard shortcuts' },
  ];

  it('returns every item, unscored, for an empty query, in original order', () => {
    const results = fuzzyFilter('', items);
    expect(results.map((r) => r.item.label)).toEqual(items.map((i) => i.label));
    expect(results.every((r) => r.score === 0)).toBe(true);
  });

  it('excludes non-matches and ranks the best match first', () => {
    const results = fuzzyFilter('kill cache', items);
    const labels = results.map((r) => r.item.label);
    expect(labels).toContain('Kill cache-redis');
    expect(labels[0]).toBe('Kill cache-redis');
    expect(labels).not.toContain('Apply exponential backoff');
  });

  it('matches on keywords as well as the label', () => {
    const withKeywords = [
      { label: 'Redis Cache', keywords: ['hld', 'cache'] },
      { label: 'Order Service', keywords: ['hld', 'server'] },
    ];
    const results = fuzzyFilter('server', withKeywords);
    expect(results.map((r) => r.item.label)).toEqual(['Order Service']);
  });

  it('is a total order (scores strictly decreasing or tied down the list)', () => {
    const results = fuzzyFilter('ca', items);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });
});
