import { describe, it, expect } from 'vitest';
import { decodeShare, encodeShare } from '../codec';
import { captureShare, planRestore, resolveWalkthrough, restoreNotice, type RestoreContext } from '../plan';
import { createPlayerStore, initialPlayerState } from '../../store/playerStore';
import type { UserAction } from '../../types';

const walkthroughs = [
  { id: 'wt-write', steps: [{ id: 'w1' }, { id: 'w2' }, { id: 'w3' }] },
  { id: 'wt-empty', steps: [] },
];

const ctx: RestoreContext = {
  revision: 2,
  walkthroughs,
  elements: {
    nodes: new Map([['api', {} as never]]),
    links: new Map([['l-api-db', {} as never]]),
    groups: new Map([['tier', {} as never]]),
  },
  modes: { explore: 'available', break: 'available', walkthrough: 'available', build: 'disabled', interview: 'hidden' },
};

const plan = (q: string, c: RestoreContext = ctx) => planRestore(decodeShare(q), c);

describe('resolveWalkthrough (old ?v=&st= links included)', () => {
  it('by step id or 1-based number, clamped', () => {
    expect(resolveWalkthrough(walkthroughs, 'wt-write', 'w2')).toEqual({ id: 'wt-write', stepIndex: 1 });
    expect(resolveWalkthrough(walkthroughs, 'wt-write', '3')).toEqual({ id: 'wt-write', stepIndex: 2 });
    expect(resolveWalkthrough(walkthroughs, 'wt-write', '99')).toEqual({ id: 'wt-write', stepIndex: 2 });
    expect(resolveWalkthrough(walkthroughs, 'wt-write', undefined)).toEqual({ id: 'wt-write', stepIndex: 0 });
    expect(resolveWalkthrough(walkthroughs, 'wt-write', 'nope')).toEqual({ id: 'wt-write', stepIndex: 0 });
    expect(resolveWalkthrough(walkthroughs, 'nope', 'w1')).toBeNull();
    expect(resolveWalkthrough(walkthroughs, 'wt-empty', undefined)).toBeNull();
  });
});

describe('planRestore', () => {
  it('an old walkthrough link opens the step, nothing else, no notice', () => {
    const p = plan('?v=wt-write&st=2');
    expect(p).toMatchObject({ mode: 'walkthrough', walkthrough: { id: 'wt-write', stepIndex: 1 }, selection: null, sim: null, stale: false, lost: [] });
    expect(restoreNotice(p, 0)).toBeNull();
  });

  it('a meltdown link: mode, selection, the run and the view', () => {
    const actions: UserAction[] = [[3, 'kill', 'api', null]];
    const p = plan(encodeShare({ rev: 2, mode: 'break', selection: { kind: 'node', id: 'api' }, t: 9, playing: false, speed: 2, camera: { x: 1, y: 2, z: 1.5 }, actions }));
    expect(p.mode).toBe('break');
    expect(p.selection).toEqual({ kind: 'node', id: 'api' });
    expect(p.sim).toEqual({ actions, t: 9, playing: false, speed: 2 });
    expect(p.camera).toEqual({ x: 1, y: 2, z: 1.5 });
    expect(p.stale).toBe(false);
  });

  it('what no longer exists is dropped and counted; unavailable modes fall back to Explore', () => {
    const p = plan('?s=1&r=2&m=b&sel=n:gone&v=gone', { ...ctx, modes: { ...ctx.modes, break: 'hidden' } });
    expect(p.mode).toBe('explore');
    expect(p.selection).toBeNull();
    expect(p.lost.sort()).toEqual(['m', 'sel', 'v']);
    expect(restoreNotice(p, 0)).toEqual({ title: 'Some of this link couldn’t be restored', description: 'Part of it couldn’t be restored.' });
  });

  it('a link from another revision is flagged, with or without skipped actions', () => {
    const older = plan('?s=1&r=1&m=b');
    expect(older.stale).toBe('older');
    expect(restoreNotice(older, 0)!.title).toBe('This link was made on an older version of the diagram');
    expect(restoreNotice(older, 2)!.description).toBe('2 actions couldn’t be replayed.');
    expect(restoreNotice(older, 1)!.description).toBe('One action couldn’t be replayed.');
    expect(plan('?s=1&r=5').stale).toBe('newer');
    // No revision at all (a hand-made link): not stale.
    expect(plan('?m=b').stale).toBe(false);
  });

  it('a scenario id is kept for the scenario player when it can open one', () => {
    const p = plan('?s=1&v=outage&ch=cp1:a,cp2:', { ...ctx, scenarios: ['outage'] });
    expect(p.scenario).toEqual({ id: 'outage', choices: { cp1: 'a', cp2: null } });
    expect(p.lost).toEqual([]);
  });
});

describe('captureShare → encode → decode → plan is the identity for what the player shows', () => {
  it('round-trips a paused Break it run', () => {
    const store = createPlayerStore(initialPlayerState({ diagramId: 'd', revision: 2, hasSimulation: true, runtimeUrl: '/w.js' }));
    const actions: UserAction[] = [[4.2, 'kill', 'api', null], [6, 'calc', 'c1', 'a=1']];
    store.setState((s) => ({
      mode: 'break',
      selection: { kind: 'link', id: 'l-api-db' },
      actions,
      sim: { ...s.sim, status: 'ready', playing: false, speed: 4, frame: { t: 12.5, keysEpoch: 0, metrics: new Float64Array(), health: new Uint8Array() } },
    }));
    const shared = captureShare(store.getState(), walkthroughs, { x: 10, y: 20, z: 2 });
    const p = plan(encodeShare(shared));
    expect(p).toMatchObject({ mode: 'break', selection: { kind: 'link', id: 'l-api-db' }, sim: { actions, t: 12.5, playing: false, speed: 4 }, camera: { x: 10, y: 20, z: 2 }, stale: false, lost: [] });
  });

  it('never shares a time before the last action', () => {
    const store = createPlayerStore(initialPlayerState({ diagramId: 'd', revision: 2, hasSimulation: true, runtimeUrl: '/w.js' }));
    store.setState((s) => ({ actions: [[8, 'kill', 'api', null]], sim: { ...s.sim, status: 'ready', playing: true, frame: { t: 7.9, keysEpoch: 0, metrics: new Float64Array(), health: new Uint8Array() } } }));
    expect(captureShare(store.getState(), walkthroughs, null).t).toBe(8);
  });

  it('a walkthrough step', () => {
    const store = createPlayerStore(initialPlayerState({ diagramId: 'd', revision: 2, hasSimulation: false, runtimeUrl: null }));
    store.setState({ mode: 'walkthrough', walkthrough: { id: 'wt-write', stepIndex: 2 } });
    const q = encodeShare(captureShare(store.getState(), walkthroughs, null));
    expect(q).toBe('?s=1&r=2&v=wt-write&st=w3');
    expect(plan(q).walkthrough).toEqual({ id: 'wt-write', stepIndex: 2 });
  });
});
