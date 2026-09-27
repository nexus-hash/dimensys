import { describe, it, expect, vi } from 'vitest';
import { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// `CommandPalette` (mounted by `CommandProvider`) calls `useRouter()` unconditionally.
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { CommandProvider, useShortcutScope } from '@/app/(components)/command';
import { PlaybackControls } from '../PlaybackControls';
import { PlayerStoreProvider, usePlayerStoreApi } from '../../store/PlayerStoreProvider';
import { registerBridge } from '../../worker/bridgeRegistry';
import type { WorkerBridge } from '../../worker/bridge';
import type { PlayerBootstrap } from '../../types';

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

/** Pushes the 'player' shortcut scope active, matching `PlayerShell`. */
function PlayerScope({ children }: { children: React.ReactNode }) {
  useShortcutScope('player');
  return <>{children}</>;
}

function FakeBridge() {
  return { play: vi.fn(), pause: vi.fn(), setSpeed: vi.fn(), seek: vi.fn() } as unknown as WorkerBridge & {
    play: ReturnType<typeof vi.fn>;
    pause: ReturnType<typeof vi.fn>;
    setSpeed: ReturnType<typeof vi.fn>;
    seek: ReturnType<typeof vi.fn>;
  };
}

function RegisterFakeBridge({ bridge }: { bridge: ReturnType<typeof FakeBridge> }) {
  const store = usePlayerStoreApi();
  useEffect(() => {
    registerBridge(store, bridge);
    // Controls are disabled until `sim.status === 'ready'`.
    store.setState((s) => ({ sim: { ...s.sim, status: 'ready' } }));
  }, [store, bridge]);
  return null;
}

function renderControls(registerShortcuts = true) {
  const bridge = FakeBridge();
  render(
    <CommandProvider navItems={[]}>
      <PlayerStoreProvider bootstrap={boot}>
        <PlayerScope>
          <RegisterFakeBridge bridge={bridge} />
          <PlaybackControls registerShortcuts={registerShortcuts} />
        </PlayerScope>
      </PlayerStoreProvider>
    </CommandProvider>,
  );
  return bridge;
}

describe('PlaybackControls', () => {
  it('renders play (paused by default) and 1x speed', () => {
    renderControls();
    expect(screen.getByRole('button', { name: 'Play (Space)' })).toBeTruthy();
    expect(screen.getByText('1×')).toBeTruthy();
  });

  it('clicking play calls bridge.play()', async () => {
    const bridge = renderControls();
    await userEvent.click(screen.getByRole('button', { name: 'Play (Space)' }));
    expect(bridge.play).toHaveBeenCalledOnce();
  });

  it('clicking the speed button calls bridge.setSpeed(2)', async () => {
    const bridge = renderControls();
    await userEvent.click(screen.getByText('1×'));
    // The store only reflects the new speed once the (real) worker echoes
    // a `status` message back — this fake bridge doesn't, so the assertion
    // is on the call, not the rendered label.
    expect(bridge.setSpeed).toHaveBeenCalledWith(2);
  });

  it('Space toggles play/pause when this instance owns shortcuts', async () => {
    const bridge = renderControls(true);
    await userEvent.keyboard(' ');
    expect(bridge.play).toHaveBeenCalledOnce();
  });

  it('Space does nothing when registerShortcuts=false (the phone-sheet duplicate instance)', async () => {
    const bridge = renderControls(false);
    await userEvent.keyboard(' ');
    expect(bridge.play).not.toHaveBeenCalled();
  });

  it('[ and ] call cycleSpeed via bridge.setSpeed', async () => {
    const bridge = renderControls(true);
    await userEvent.keyboard(']');
    expect(bridge.setSpeed).toHaveBeenCalledWith(2);
  });

  it('shows no scrubber in free play (story.duration === null)', () => {
    renderControls();
    expect(screen.queryByRole('group', { name: 'Scenario timeline' })).toBeNull();
    expect(screen.getByText(/paused/)).toBeTruthy();
  });

  it('shows a scrubber once story.duration is set (scenario mode)', () => {
    const bridge = FakeBridge();
    function WithDuration() {
      const store = usePlayerStoreApi();
      useEffect(() => {
        registerBridge(store, bridge);
        store.setState((s) => ({ sim: { ...s.sim, status: 'ready' }, story: { ...s.story, duration: 90 } }));
      }, [store]);
      return null;
    }
    render(
      <CommandProvider navItems={[]}>
        <PlayerStoreProvider bootstrap={boot}>
          <PlayerScope>
            <WithDuration />
            <PlaybackControls />
          </PlayerScope>
        </PlayerStoreProvider>
      </CommandProvider>,
    );
    expect(screen.getByRole('group', { name: 'Scenario timeline' })).toBeTruthy();
    expect(screen.getByText('00:00')).toBeTruthy();
  });
});
