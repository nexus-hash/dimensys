import { describe, it, expect, vi } from 'vitest';
import { createPlayerStore, initialPlayerState, enterSubsystem, exitSubsystem, goToDrillDepth } from '../store/playerStore';

const boot = { diagramId: 'url-shortener', revision: 2, hasSimulation: true, runtimeUrl: '/engine/runtime/sim-worker.abc.js' };

describe('initialPlayerState', () => {
  it('opens in explore with nothing selected', () => {
    const s = initialPlayerState(boot);
    expect(s.mode).toBe('explore');
    expect(s.selection).toBeNull();
    expect(s.actions).toEqual([]);
    expect(s.sim.status).toBe('idle');
    expect(s.drill).toEqual([]);
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

describe('drill-path reducers (T3.4)', () => {
  it('enterSubsystem pushes onto the path and clears the selection', () => {
    const s0 = { ...initialPlayerState(boot), selection: { kind: 'node' as const, id: 'x' } };
    const s1 = { ...s0, ...enterSubsystem(s0, 'kgs-service') };
    expect(s1.drill).toEqual(['kgs-service']);
    expect(s1.selection).toBeNull();
    const s2 = { ...s1, ...enterSubsystem(s1, 'inner-sub') };
    expect(s2.drill).toEqual(['kgs-service', 'inner-sub']);
  });

  it('enterSubsystem is a no-op re-entering the same (already innermost) subsystem', () => {
    const s0 = { ...initialPlayerState(boot), drill: ['kgs-service'] };
    expect(enterSubsystem(s0, 'kgs-service')).toEqual({});
  });

  it('exitSubsystem pops one level and clears the selection', () => {
    const s0 = { ...initialPlayerState(boot), drill: ['a', 'b'], selection: { kind: 'node' as const, id: 'x' } };
    const s1 = { ...s0, ...exitSubsystem(s0) };
    expect(s1.drill).toEqual(['a']);
    expect(s1.selection).toBeNull();
  });

  it('exitSubsystem is a no-op at the top level', () => {
    const s0 = initialPlayerState(boot);
    expect(exitSubsystem(s0)).toEqual({});
  });

  it('goToDrillDepth jumps to an arbitrary breadcrumb depth', () => {
    const s0 = { ...initialPlayerState(boot), drill: ['a', 'b', 'c'] };
    expect(goToDrillDepth(s0, 1).drill).toEqual(['a']);
    expect(goToDrillDepth(s0, 0).drill).toEqual([]);
  });

  it('goToDrillDepth clamps a negative depth to the top level instead of throwing', () => {
    const s0 = { ...initialPlayerState(boot), drill: ['a'] };
    expect(goToDrillDepth(s0, -5).drill).toEqual([]);
  });

  it('goToDrillDepth clamps a too-large depth to a no-op (already at/past it)', () => {
    const s0 = { ...initialPlayerState(boot), drill: ['a'] };
    expect(goToDrillDepth(s0, 99)).toEqual({});
  });

  it('goToDrillDepth is a no-op at the current depth', () => {
    const s0 = { ...initialPlayerState(boot), drill: ['a', 'b'] };
    expect(goToDrillDepth(s0, 2)).toEqual({});
  });

  it('drills through createPlayerStore end-to-end', () => {
    const store = createPlayerStore(initialPlayerState(boot));
    store.setState((s) => enterSubsystem(s, 'kgs-service'));
    expect(store.getState().drill).toEqual(['kgs-service']);
    store.setState((s) => exitSubsystem(s));
    expect(store.getState().drill).toEqual([]);
  });
});
