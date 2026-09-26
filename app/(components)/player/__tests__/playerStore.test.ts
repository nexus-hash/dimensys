import { describe, it, expect, vi } from 'vitest';
import { createPlayerStore, initialPlayerState } from '../store/playerStore';

const boot = { diagramId: 'url-shortener', revision: 2, hasSimulation: true, runtimeUrl: '/engine/runtime/sim-worker.abc.js' };

describe('initialPlayerState', () => {
  it('opens in explore with nothing selected', () => {
    const s = initialPlayerState(boot);
    expect(s.mode).toBe('explore');
    expect(s.selection).toBeNull();
    expect(s.actions).toEqual([]);
    expect(s.sim.status).toBe('idle');
  });

  it('marks the sim unavailable without a runtime bundle or a simulation', () => {
    expect(initialPlayerState({ ...boot, runtimeUrl: null }).sim.status).toBe('unavailable');
    expect(initialPlayerState({ ...boot, hasSimulation: false }).sim.status).toBe('unavailable');
  });
});

describe('createPlayerStore', () => {
  it('merges updates and notifies subscribers', () => {
    const store = createPlayerStore(initialPlayerState(boot));
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.setState({ mode: 'break' });
    store.setState((s) => ({ selection: { kind: 'node', id: s.diagramId } }));
    expect(store.getState().mode).toBe('break');
    expect(store.getState().selection).toEqual({ kind: 'node', id: 'url-shortener' });
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    store.setState({ mode: 'explore' });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('does not notify when nothing changed by identity', () => {
    const store = createPlayerStore(initialPlayerState(boot));
    const listener = vi.fn();
    store.subscribe(listener);
    store.setState({ mode: 'explore' });
    expect(listener).not.toHaveBeenCalled();
  });

  it('keeps separate state per instance', () => {
    const a = createPlayerStore(initialPlayerState(boot));
    const b = createPlayerStore(initialPlayerState(boot));
    a.setState({ mode: 'walkthrough' });
    expect(b.getState().mode).toBe('explore');
  });
});
