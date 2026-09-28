import { describe, it, expect, vi } from 'vitest';
import { breakUiFor, createBreakUiStore } from '../breakStore';
import { createPlayerStore, initialPlayerState } from '../../store/playerStore';

describe('break UI store', () => {
  it('notifies only on a real change', () => {
    const s = createBreakUiStore();
    const l = vi.fn();
    s.subscribe(l);
    s.set({ armed: null });
    expect(l).not.toHaveBeenCalled();
    s.set({ armed: 'kill' });
    expect(l).toHaveBeenCalledTimes(1);
    s.set((st) => ({ drawer: !st.drawer }));
    expect(s.get().drawer).toBe(true);
  });

  it('is one store per player, never shared between players', () => {
    const boot = { diagramId: 'x', revision: 1, hasSimulation: true, runtimeUrl: 'r' };
    const a = createPlayerStore(initialPlayerState(boot));
    const b = createPlayerStore(initialPlayerState(boot));
    expect(breakUiFor(a)).toBe(breakUiFor(a));
    expect(breakUiFor(a)).not.toBe(breakUiFor(b));
  });
});
