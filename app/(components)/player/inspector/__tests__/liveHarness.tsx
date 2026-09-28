import type { ReactNode } from 'react';
import { vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { TooltipProvider } from '@/app/(components)/ui/Tooltip';
import { PlayerStoreProvider, usePlayerStoreApi } from '../../store/PlayerStoreProvider';
import type { PlayerStore, SimSlice } from '../../store/playerStore';
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

export interface FakeBridge {
  applyAction: ReturnType<typeof vi.fn>;
  calc: ReturnType<typeof vi.fn>;
}

/** A bridge stand-in: records commands; `calc` hands out increasing seqs like the real one. */
export function fakeBridge(): FakeBridge {
  let seq = 100;
  return {
    applyAction: vi.fn(),
    calc: vi.fn(() => {
      seq += 1;
      return seq;
    }),
  };
}

function Capture({ onStore }: { onStore: (s: PlayerStore) => void }) {
  onStore(usePlayerStoreApi());
  return null;
}

/**
 * Renders `ui` inside a player store (and the tooltip provider the data kit
 * needs). With `status`, the sim starts in that state; with `bridge`, that
 * fake is registered as the player's bridge.
 */
export function renderLive(ui: ReactNode, opts: { status?: SimSlice['status']; bridge?: FakeBridge; hasSimulation?: boolean } = {}) {
  let store: PlayerStore | null = null;
  const utils = render(
    <PlayerStoreProvider bootstrap={{ ...boot, hasSimulation: opts.hasSimulation ?? true }}>
      <TooltipProvider>
        <Capture
          onStore={(s) => {
            store = s;
          }}
        />
        {ui}
      </TooltipProvider>
    </PlayerStoreProvider>,
  );
  const s = store as unknown as PlayerStore;
  act(() => {
    if (opts.bridge) registerBridge(s, opts.bridge as unknown as WorkerBridge);
    if (opts.status) s.setState((st) => ({ sim: { ...st.sim, status: opts.status! } }));
  });
  return { ...utils, store: s };
}

/** Publishes one frame with the given metric values (keys become the key table on first use). */
export function pushFrame(store: PlayerStore, t: number, values: Record<string, number>) {
  act(() => {
    store.setState((st) => {
      const keys = Object.keys(values);
      const metricKeys = st.sim.metricKeys.length ? st.sim.metricKeys : keys;
      const metrics = new Float64Array(metricKeys.length).fill(Number.NaN);
      metricKeys.forEach((k, i) => {
        if (k in values) metrics[i] = values[k];
      });
      return {
        sim: {
          ...st.sim,
          metricKeys,
          frame: { t, keysEpoch: 1, metrics, health: new Uint8Array(0) },
          frameNo: st.sim.frameNo + 1,
        },
      };
    });
  });
}
