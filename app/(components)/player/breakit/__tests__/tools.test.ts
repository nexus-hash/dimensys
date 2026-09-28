import { describe, it, expect } from 'vitest';
import {
  canTarget,
  chipMove,
  deriveFaults,
  failuresInEffect,
  describeAction,
  fixEntryIndex,
  hasActiveFault,
  killEntryIndex,
  offeredTools,
  targetsFor,
  tryCards,
  undoPlan,
  whyNot,
  withoutEntry,
  type TargetCatalog,
} from '../tools';
import type { KitView, RemedyView, UserAction } from '../../types';

const catalog: TargetCatalog = {
  nodes: [
    { id: 'web', text: 'Web Browser', form: 'client' },
    { id: 'api', text: 'API Service', form: 'server' },
    { id: 'redis', text: 'Redis Cache', form: 'cache' },
    { id: 'cdn', text: 'Edge CDN', form: 'cdn' },
    { id: 'db', text: 'URL Storage', form: 'db' },
  ],
  links: [
    { id: 'l-web-api', a: 'web', b: 'api' },
    { id: 'l-api-redis', a: 'api', b: 'redis' },
    { id: 'l-api-db', a: 'api', b: 'db' },
  ],
};

const kit: KitView = {
  verbs: ['kill', 'spike', 'partition', 'slow', 'flush'],
  cap: 50,
  chips: [
    { text: 'Kill the Redis cache', verb: 'kill', el: 'redis' },
    { text: 'Viral link: 10x traffic', verb: 'spike', amt: 10 },
  ],
  remedies: ['fix-a'],
  locks: [['db', ['slow']]],
};

const remedies: RemedyView[] = [{ id: 'fix-a', text: 'Coalesce cache misses', md: 'Why.', nature: 'caching' }];

describe('offeredTools', () => {
  it('keeps the design order and only what the diagram offers', () => {
    expect(offeredTools({ ...kit, verbs: ['slow', 'kill', 'degrade'] }).map((t) => t.id)).toEqual(['kill', 'slow']);
    expect(offeredTools(undefined)).toEqual([]);
  });
});

describe('target rules', () => {
  it('clients are the load and never break', () => {
    expect(canTarget('kill', { kind: 'node', id: 'web' }, catalog, kit)).toBe(false);
    expect(whyNot('kill', { kind: 'node', id: 'web' }, catalog, kit)).toMatch(/Clients/);
  });
  it('flush only takes caches and CDNs', () => {
    expect(canTarget('flush', { kind: 'node', id: 'redis' }, catalog, kit)).toBe(true);
    expect(canTarget('flush', { kind: 'node', id: 'cdn' }, catalog, kit)).toBe(true);
    expect(canTarget('flush', { kind: 'node', id: 'api' }, catalog, kit)).toBe(false);
  });
  it('partition takes links only; slow takes both', () => {
    expect(canTarget('partition', { kind: 'link', id: 'l-api-redis' }, catalog, kit)).toBe(true);
    expect(canTarget('partition', { kind: 'node', id: 'api' }, catalog, kit)).toBe(false);
    expect(canTarget('slow', { kind: 'link', id: 'l-api-redis' }, catalog, kit)).toBe(true);
    expect(canTarget('kill', { kind: 'link', id: 'l-api-redis' }, catalog, kit)).toBe(false);
  });
  it('honours per-element locks', () => {
    expect(canTarget('kill', { kind: 'node', id: 'db' }, catalog, kit)).toBe(false);
    expect(canTarget('slow', { kind: 'node', id: 'db' }, catalog, kit)).toBe(true);
  });
  it('lists every valid target, nodes first', () => {
    expect(targetsFor('kill', catalog, kit).map((t) => t.id)).toEqual(['api', 'redis', 'cdn']);
    expect(targetsFor('partition', catalog, kit).map((t) => t.id)).toEqual(['l-web-api', 'l-api-redis', 'l-api-db']);
  });
});

describe('deriveFaults', () => {
  it('folds kills, cuts, slows, spikes and fixes, with their inverses', () => {
    const log: UserAction[] = [
      [1, 'kill', 'redis', null],
      [2, 'partition', 'l-api-db', null],
      [3, 'slow', 'api', 5],
      [4, 'spike', null, 10],
      [5, 'intervention', 'fix-a', null],
      [6, 'restore', 'redis', null],
      [7, 'slow', 'api', 1],
      [8, 'flush', 'cdn', null],
    ];
    const f = deriveFaults(log);
    expect([...f.killed]).toEqual([]);
    expect([...f.cut]).toEqual(['l-api-db']);
    expect([...f.slowed]).toEqual([]);
    expect(f.spike).toBe(10);
    expect([...f.fixes]).toEqual(['fix-a']);
    expect([...f.flushed]).toEqual(['cdn']);
    expect(hasActiveFault(f)).toBe(true);
    expect(hasActiveFault(deriveFaults([[1, 'flush', 'redis', null]]))).toBe(false);
  });
});

describe('undoPlan', () => {
  const log: UserAction[] = [
    [1, 'kill', 'redis', null],
    [2, 'spike', null, 10],
    [3, 'intervention', 'fix-a', null],
    [4, 'slow', 'api', 5],
    [5, 'flush', 'cdn', null],
  ];
  it('takes a fault back with its own inverse', () => {
    expect(undoPlan(log, 0)).toEqual({ kind: 'inverse', tool: 'restore', target: 'redis', value: null });
    expect(undoPlan(log, 1)).toEqual({ kind: 'inverse', tool: 'spike', target: null, value: 1 });
    expect(undoPlan(log, 3)).toEqual({ kind: 'inverse', tool: 'slow', target: 'api', value: 1 });
  });
  it('takes a fix back by replaying without it', () => {
    expect(undoPlan(log, 2)).toEqual({ kind: 'replay', index: 2 });
    expect(withoutEntry(log, 2)).toHaveLength(4);
    expect(fixEntryIndex(log, 'fix-a')).toBe(2);
    expect(fixEntryIndex(log, 'nope')).toBe(-1);
  });
  it('a fix revert keeps every other entry, trade-off flips included', () => {
    const withFlip: UserAction[] = [[1, 'toggle', 'wc', 'one'], [2, 'intervention', 'fix-a', null], [3, 'toggle', 'wc', 'quorum']];
    expect(withoutEntry(withFlip, fixEntryIndex(withFlip, 'fix-a'))).toEqual([[1, 'toggle', 'wc', 'one'], [3, 'toggle', 'wc', 'quorum']]);
  });
  it('offers nothing for a flush or an entry already taken back', () => {
    expect(undoPlan(log, 4)).toBeNull();
    expect(undoPlan([...log, [6, 'restore', 'redis', null]], 0)).toBeNull();
    expect(undoPlan([...log, [6, 'spike', null, 3]], 1)).toBeNull();
  });
});

describe('describeAction', () => {
  it('reads as a sentence with element names', () => {
    expect(describeAction([1, 'kill', 'redis', null], catalog, remedies)).toBe('Killed Redis Cache');
    expect(describeAction([1, 'partition', 'l-api-redis', null], catalog, remedies)).toBe('Cut API Service → Redis Cache');
    expect(describeAction([1, 'spike', null, 10], catalog, remedies)).toBe('Traffic 10×');
    expect(describeAction([1, 'spike', null, 1], catalog, remedies)).toBe('Traffic back to 1×');
    expect(describeAction([1, 'slow', 'api', 5], catalog, remedies)).toBe('Slowed API Service 5×');
    expect(describeAction([1, 'intervention', 'fix-a', null], catalog, remedies)).toBe('Applied: Coalesce cache misses');
    const switches = [{ id: 'wc', text: 'Write consistency', opts: [{ id: 'one', text: 'ONE' }, { id: 'quorum', text: 'QUORUM' }] }];
    expect(describeAction([1, 'toggle', 'wc', 'one'], catalog, remedies, switches)).toBe('Write consistency: ONE');
    expect(undoPlan([[1, 'toggle', 'wc', 'one']], 0)).toBeNull();
  });
});

describe('failuresInEffect', () => {
  it('lists every failure that lasts until undone, oldest first, and no fix or flush', () => {
    const log: UserAction[] = [
      [1, 'kill', 'redis', null],
      [2, 'spike', null, 10],
      [3, 'intervention', 'fix-a', null],
      [4, 'partition', 'l-api-db', null],
      [5, 'flush', 'cdn', null],
      [6, 'fault', 'redis--avalanche', null],
    ];
    expect(failuresInEffect(log)).toEqual([0, 1, 3, 5]);
  });
  it('drops one once it’s taken back', () => {
    const log: UserAction[] = [
      [1, 'kill', 'redis', null],
      [2, 'kill', 'api', null],
      [3, 'restore', 'redis', null],
    ];
    expect(failuresInEffect(log)).toEqual([1]);
    expect(killEntryIndex(log, 'api')).toBe(1);
    expect(killEntryIndex(log, 'redis')).toBe(-1);
    expect(killEntryIndex(log, 'db')).toBe(-1);
  });
});

describe('chipMove', () => {
  it('turns a walkthrough’s failure into the same move as its chip', () => {
    expect(chipMove({ text: 'Kill the Redis cache', verb: 'kill', el: 'redis' }, kit, catalog)).toEqual(tryCards(kit, catalog)[0]);
    expect(chipMove({ text: 'Spike', verb: 'spike' }, kit, catalog)).toMatchObject({ tool: 'spike', target: null, value: 10 });
  });
  it('refuses a move this kit can’t make', () => {
    expect(chipMove({ text: 'Kill a client', verb: 'kill', el: 'web' }, kit, catalog)).toBeNull();
    expect(chipMove({ text: 'Kill the DB', verb: 'kill', el: 'db' }, kit, catalog)).toBeNull();
    expect(chipMove({ text: 'Kill it', verb: 'kill', el: 'redis' }, { ...kit, verbs: ['spike'] }, catalog)).toBeNull();
  });
});

describe('tryCards', () => {
  it('uses the diagram’s own ideas first, then flushes for caches no card covers', () => {
    const s = tryCards(kit, catalog);
    expect(s.map((x) => x.text)).toEqual(['Kill the Redis cache', 'Viral link: 10x traffic', 'Flush the Redis Cache']);
    expect(s[1]).toMatchObject({ tool: 'spike', target: null, value: 10 });
  });
  it('drops cards for tools the diagram doesn’t offer', () => {
    expect(tryCards({ ...kit, verbs: ['spike'] }, catalog).map((x) => x.tool)).toEqual(['spike']);
  });
});
