import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { RequirementBadges } from '../RequirementBadges';
import { PlayerStoreProvider, usePlayerStoreApi } from '../../store/PlayerStoreProvider';
import type { PlayerBootstrap, NeedView } from '../../types';

const boot: PlayerBootstrap = {
  diagramId: 'url-shortener',
  revision: 1,
  hash: 'sha256:abc',
  diagramUrl: '/x/diagram.json',
  hasSimulation: true,
  runtimeUrl: '/x.js',
  simUrl: '/x.bin',
  canvas: { w: 100, h: 100 },
};

const needs: NeedView[] = [
  { id: 'req-create', text: 'Create a short link', nature: 'functional' },
  { id: 'req-latency', text: 'Redirect p99 under 50 ms', nature: 'non-functional', chip: 'p99 < 50 ms', alarm: 'w0' },
];

function SetWatch({ id, pass }: { id: string; pass: boolean }) {
  const store = usePlayerStoreApi();
  return (
    <button type="button" onClick={() => store.setState((s) => ({ sim: { ...s.sim, watches: { ...s.sim.watches, [id]: pass } } }))}>
      set {id}={String(pass)}
    </button>
  );
}

function renderBadges() {
  return render(
    <PlayerStoreProvider bootstrap={boot}>
      <SetWatch id="w0" pass={true} />
      <SetWatch id="w0" pass={false} />
      <RequirementBadges needs={needs} />
    </PlayerStoreProvider>,
  );
}

describe('RequirementBadges', () => {
  afterEach(() => vi.useRealTimers());

  it('renders the functional requirement as "not simulated" (no alarm)', () => {
    renderBadges();
    expect(screen.getByText('Create a short link')).toBeTruthy();
    expect(screen.getByText(/not simulated/)).toBeTruthy();
  });

  it('renders neutral (no pass/fail glyph yet) before the watch reports', () => {
    renderBadges();
    expect(screen.queryByRole('img', { name: 'passing' })).toBeNull();
    expect(screen.queryByRole('img', { name: 'failing' })).toBeNull();
  });

  it('flips to passing after the hysteresis delay once a watch reports true, with an accessible glyph label', () => {
    vi.useFakeTimers();
    renderBadges();
    act(() => {
      screen.getByText('set w0=true').click();
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByRole('img', { name: 'passing' })).toBeTruthy();
  });

  it('does not flicker on a change shorter than the 500ms hysteresis window', () => {
    vi.useFakeTimers();
    renderBadges();
    act(() => {
      screen.getByText('set w0=true').click();
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    // Flips back to false before the 500ms window elapsed — the pending
    // "true" is abandoned, so no flip to "passing" ever shows.
    act(() => {
      screen.getByText('set w0=false').click();
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.queryByRole('img', { name: 'passing' })).toBeNull();
    expect(screen.getByRole('img', { name: 'failing' })).toBeTruthy();
  });
});
