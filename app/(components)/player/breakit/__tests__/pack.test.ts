import { describe, it, expect } from 'vitest';
import { activeBreaks, breakAction, findBreak, offeredFixIds, packFits, packFor, packTargets, packsOf } from '../pack';
import { deriveFaults, describeAction, hasActiveFault, undoPlan, type TargetCatalog } from '../tools';
import type { KitView, PackView, UserAction } from '../../types';

const catalog: TargetCatalog = {
  nodes: [
    { id: 'api', text: 'API Service', form: 'server' },
    { id: 'redis', text: 'Redis Cache', form: 'cache' },
    { id: 'cdn', text: 'Edge CDN', form: 'cdn' },
    { id: 'db', text: 'URL Storage', form: 'db' },
  ],
  links: [],
};

function pack(el: string): PackView {
  return {
    el,
    breaks: [
      { id: `${el}--stampede`, text: 'Stampede', md: 'Empty it.', verb: 'flush', fits: ['own-coalesce', `${el}--prewarm`], series: ['j', 'v'] },
      { id: `${el}--hot-key`, text: 'Hot key expires', md: 'A hot key expires.', verb: 'fault', fits: [`${el}--swr`, 'own-coalesce'], series: ['j', 'v', 'w'] },
      { id: `${el}--penetration`, text: 'Penetration', md: 'Made-up keys.', verb: 'fault', fits: [`${el}--bloom`], series: ['v', 'x'] },
    ],
    down: [`${el}--replica`],
  };
}

const kit: KitView = {
  verbs: ['kill', 'flush'],
  chips: [],
  remedies: ['own-coalesce', 'scale-api'],
  locks: [['cdn', []]],
  packs: [pack('redis'), pack('cdn')],
};

const act = (t: number, tool: string, target: string | null): UserAction => [t, tool, target, null];

describe('pack lookups', () => {
  it('finds a cache’s failures and a failure by id; none without packs', () => {
    expect(packsOf(undefined)).toEqual([]);
    expect(packFor(kit, 'redis')?.el).toBe('redis');
    expect(packFor(kit, 'db')).toBeUndefined();
    expect(findBreak(kit, 'redis--hot-key')?.brk.text).toBe('Hot key expires');
    expect(findBreak(kit, 'nope')).toBeUndefined();
  });

  it('offers only caches that can be broken (an unbreakable one is left out)', () => {
    expect(packTargets(kit, catalog).map((n) => n.id)).toEqual(['redis']);
    expect(packTargets({ ...kit, locks: [] }, catalog).map((n) => n.id)).toEqual(['redis', 'cdn']);
  });

  it('sends a stampede as a flush of the cache and every other failure as a fault by id', () => {
    const p = pack('redis');
    expect(breakAction(p, p.breaks[0])).toEqual(['flush', 'redis']);
    expect(breakAction(p, p.breaks[1])).toEqual(['fault', 'redis--hot-key']);
  });
});

describe('the current failure, from the log', () => {
  it('faults stay in effect; a flush is current until another failure hits the same cache', () => {
    expect(activeBreaks([], kit)).toEqual([]);
    const log = [act(1, 'flush', 'redis'), act(2, 'kill', 'api')];
    expect(activeBreaks(log, kit).map((a) => a.brk.id)).toEqual(['redis--stampede']);
    const later = [...log, act(3, 'fault', 'redis--penetration')];
    expect(activeBreaks(later, kit).map((a) => a.brk.id)).toEqual(['redis--penetration']);
    const again = [...later, act(4, 'fault', 'redis--hot-key'), act(5, 'fault', 'redis--penetration')];
    expect(activeBreaks(again, kit).map((a) => [a.brk.id, a.index])).toEqual([
      ['redis--hot-key', 3],
      ['redis--penetration', 4],
    ]);
    expect(activeBreaks([act(1, 'flush', 'db'), act(2, 'fault', 'unknown')], kit)).toEqual([]);
    expect(activeBreaks(log, { ...kit, packs: undefined })).toEqual([]);
  });

  it('fits: the newest failure’s fixes first, then a killed cache’s', () => {
    const log = [act(1, 'fault', 'redis--penetration'), act(2, 'fault', 'redis--hot-key')];
    expect(packFits(log, kit, new Set())).toEqual(['redis--swr', 'own-coalesce', 'redis--bloom']);
    expect(packFits([], kit, new Set(['redis']))).toEqual(['redis--replica']);
  });

  it('the Fix it list: fitting fixes lead, the diagram’s own follow, then anything else applied', () => {
    expect(offeredFixIds(undefined, ['x'], new Set())).toEqual([]);
    expect(offeredFixIds(kit, [], new Set())).toEqual(['own-coalesce', 'scale-api']);
    expect(offeredFixIds(kit, ['redis--bloom', 'own-coalesce'], new Set(['redis--lfu', 'scale-api']))).toEqual([
      'redis--bloom',
      'own-coalesce',
      'scale-api',
      'redis--lfu',
    ]);
  });
});

describe('faults in the shared log rules', () => {
  const log = [act(1, 'fault', 'redis--hot-key')];

  it('count as something broken, and read as a sentence', () => {
    const f = deriveFaults(log);
    expect([...f.faults]).toEqual(['redis--hot-key']);
    expect(hasActiveFault(f)).toBe(true);
    expect(describeAction(log[0], catalog, [], [], kit)).toBe('Hot key expires on Redis Cache');
    expect(describeAction(act(1, 'fault', 'nope'), catalog, [], [], kit)).toBe('Cache failure');
  });

  it('are taken back by replaying without them (there is no inverse move)', () => {
    expect(undoPlan(log, 0)).toEqual({ kind: 'replay', index: 0 });
  });
});
