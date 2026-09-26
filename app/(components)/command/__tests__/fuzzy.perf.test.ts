import { describe, it, expect } from 'vitest';
import { fuzzyFilter } from '../fuzzy';

const GROUPS = ['Diagrams', 'Actions', 'Navigation', 'Player', 'Build'];

function buildItems(count: number) {
  const words = [
    'cache', 'redis', 'cassandra', 'kill', 'restore', 'partition', 'flush', 'spike',
    'service', 'gateway', 'queue', 'worker', 'orchestrator', 'shortener', 'limiter',
    'inspector', 'replay', 'daily', 'path', 'review', 'streak', 'checkpoint', 'export',
  ];
  return Array.from({ length: count }, (_, i) => ({
    label: `${words[i % words.length]} ${words[(i * 7) % words.length]} #${i}`,
    keywords: [GROUPS[i % GROUPS.length], words[(i * 3) % words.length]],
  }));
}

describe('fuzzyFilter perf', () => {
  it('filters ~200 items in well under 16ms (median of several runs)', () => {
    const items = buildItems(200);
    const queries = ['ca', 'kill', 'gate', 'zzz-no-match', ''];

    const durations: number[] = [];
    // Warm up the JIT so the measured runs reflect steady-state cost, not
    // first-call compilation — a fairer read of the real, hot-path budget.
    for (let i = 0; i < 5; i++) {
      for (const q of queries) fuzzyFilter(q, items);
    }

    for (let i = 0; i < 20; i++) {
      const query = queries[i % queries.length];
      const start = performance.now();
      fuzzyFilter(query, items);
      durations.push(performance.now() - start);
    }

    durations.sort((a, b) => a - b);
    const median = durations[Math.floor(durations.length / 2)];
    const max = durations[durations.length - 1];

    console.info(`fuzzyFilter(200 items): median ${median.toFixed(3)}ms, max ${max.toFixed(3)}ms`);

    expect(median).toBeLessThan(16);
    // A generous ceiling on the worst single run, to absorb one-off GC/scheduler noise
    // without masking a real perf regression.
    expect(max).toBeLessThan(50);
  });
});
