import { describe, it, expect } from 'vitest';
import { buildElementIndex, selectionKindLabel, selectionTitle } from '../selection';
import { modeAvailability } from '../modes';
import type { Board } from '../../types';

const board: Board = {
  size: [400, 200],
  blocks: [
    { id: 'api', form: 'server', text: 'API', flavor: 'node' },
    { id: 'inner-a', form: 'db', text: 'Inner DB' },
  ],
  wires: [{ id: 'l1', a: 'api', b: 'inner-a', line: 'async' }],
  frames: [{ id: 'sub', text: 'KGS', look: 'cluster', box: [200, 100, 200, 100], holds: ['inner-a'], sheet: { parts: [] } }],
};

describe('buildElementIndex / selectionTitle / selectionKindLabel', () => {
  const index = buildElementIndex(board);

  it('indexes a framed group\'s nodes like any other, and never the frame itself', () => {
    expect(index.nodes.get('inner-a')?.text).toBe('Inner DB');
    expect(index.nodes.has('sub')).toBe(false);
  });

  it('titles a group selection with the group\'s name', () => {
    expect(selectionTitle(index, { kind: 'group', id: 'sub' })).toBe('KGS');
    expect(selectionKindLabel(index, { kind: 'group', id: 'sub' })).toBe('group · cluster');
  });

  it('returns null for no selection', () => {
    expect(selectionTitle(index, null)).toBeNull();
    expect(selectionKindLabel(index, null)).toBe('');
  });

  it('titles a node selection with its label', () => {
    expect(selectionTitle(index, { kind: 'node', id: 'api' })).toBe('API');
    expect(selectionKindLabel(index, { kind: 'node', id: 'api' })).toBe('server · node');
  });

  it('titles a link selection as "A → B"', () => {
    expect(selectionTitle(index, { kind: 'link', id: 'l1' })).toBe('API → Inner DB');
    expect(selectionKindLabel(index, { kind: 'link', id: 'l1' })).toBe('link · async');
  });

  it('falls back to the raw id for an unknown selection', () => {
    expect(selectionTitle(index, { kind: 'node', id: 'ghost' })).toBe('ghost');
  });
});

describe('modeAvailability', () => {
  it('hides Break it and Walkthrough with no kit/stories, and always shows Explore available / Build disabled', () => {
    const a = modeAvailability({ kit: undefined, stories: [] });
    expect(a.explore).toBe('available');
    expect(a.break).toBe('hidden');
    expect(a.walkthrough).toBe('hidden');
    expect(a.build).toBe('disabled');
    expect(a.interview).toBe('hidden');
  });

  it('shows Break it/Walkthrough available when the diagram has a kit/stories', () => {
    const a = modeAvailability({ kit: { verbs: ['kill'], chips: [], remedies: [], locks: [] }, stories: [{ id: 's', text: 't', frames: [] }] });
    expect(a.break).toBe('available');
    expect(a.walkthrough).toBe('available');
  });
});
