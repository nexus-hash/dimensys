import { describe, it, expect } from 'vitest';
import { collectDrillLevels, drillKey, resolveDrillChain } from '../drill';
import type { Board } from '../../types';

const kgsInner: Board = {
  size: [408, 72],
  blocks: [
    { id: 'kgs-worker', form: 'worker', text: 'KGS Worker' },
    { id: 'kgs-db', form: 'db', text: 'Key Pool (SQL)' },
  ],
  wires: [],
};

const board: Board = {
  size: [1248, 492],
  blocks: [
    { id: 'client-web', form: 'client', text: 'Web' },
    { id: 'kgs-service', form: 'subSystem', text: 'Key Generation Service', folded: false, box: [888, 180, 192, 96], inner: kgsInner },
  ],
  wires: [],
};

describe('drillKey', () => {
  it('is empty for the root path and joins ids with ">" otherwise', () => {
    expect(drillKey([])).toBe('');
    expect(drillKey(['a', 'b'])).toBe('a>b');
  });
});

describe('collectDrillLevels', () => {
  it('finds every subsystem with an inner board, with its id path', () => {
    const levels = collectDrillLevels(board);
    expect(levels).toEqual([{ path: ['kgs-service'], label: 'Key Generation Service', board: kgsInner }]);
  });

  it('recurses into nested subsystems, at any depth', () => {
    const nestedInner: Board = { size: [100, 50], blocks: [{ id: 'leaf', form: 'server', text: 'Leaf' }], wires: [] };
    const outer: Board = {
      size: [500, 200],
      blocks: [
        {
          id: 'outer-sub',
          form: 'subSystem',
          text: 'Outer',
          box: [100, 100, 100, 100],
          inner: {
            size: [200, 100],
            blocks: [{ id: 'inner-sub', form: 'subSystem', text: 'Inner', box: [50, 50, 80, 60], inner: nestedInner }],
            wires: [],
          },
        },
      ],
      wires: [],
    };
    const levels = collectDrillLevels(outer);
    expect(levels.map((l) => l.path)).toEqual([['outer-sub'], ['outer-sub', 'inner-sub']]);
    expect(levels[1].board).toBe(nestedInner);
  });

  it('skips a subsystem block with no inner board (nothing to drill into)', () => {
    const noInner: Board = { size: [100, 50], blocks: [{ id: 's', form: 'subSystem', text: 'Empty', box: [50, 25, 40, 30] }], wires: [] };
    expect(collectDrillLevels(noInner)).toEqual([]);
  });

  it('returns nothing for a board with no subsystems', () => {
    expect(collectDrillLevels({ size: [10, 10], blocks: [{ id: 'a', form: 'server', text: 'A' }], wires: [] })).toEqual([]);
  });
});

describe('resolveDrillChain', () => {
  it('resolves the root alone for an empty path', () => {
    expect(resolveDrillChain(board, 'URL shortener', [])).toEqual([{ path: [], label: 'URL shortener', board }]);
  });

  it('walks down one level', () => {
    const chain = resolveDrillChain(board, 'URL shortener', ['kgs-service']);
    expect(chain).toEqual([
      { path: [], label: 'URL shortener', board },
      { path: ['kgs-service'], label: 'Key Generation Service', board: kgsInner },
    ]);
  });

  it('stops early at a stale/invalid segment rather than throwing', () => {
    const chain = resolveDrillChain(board, 'URL shortener', ['kgs-service', 'no-such-id']);
    expect(chain).toHaveLength(2);
    expect(chain[chain.length - 1].path).toEqual(['kgs-service']);
  });

  it('stops early if a path segment names a node that has no inner board', () => {
    const chain = resolveDrillChain(board, 'URL shortener', ['client-web']);
    expect(chain).toHaveLength(1);
  });
});
