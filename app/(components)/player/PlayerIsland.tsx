'use client';

import type { ReactNode } from 'react';
import { PlayerStoreProvider, usePlayerStore } from './store/PlayerStoreProvider';
import type { PlayerBootstrap } from './types';

/**
 * The player's single client boundary.
 *
 * Owns the per-player store (and, from T2.13, the worker bridge). Everything
 * passed as `children` is server-rendered and stays server-rendered: the
 * static SVG frame (T3.2), rail markdown and detail sections ship as HTML
 * with no component JS. Interactive leaves (HUD, timeline, overlay, mode
 * switcher) are separate small client components that read the store.
 *
 * Skeleton: no behaviour yet. It only exposes the mode as a data attribute
 * so styling hooks (and tests) have something stable to target.
 */
export function PlayerIsland({ bootstrap, children }: { bootstrap: PlayerBootstrap; children?: ReactNode }) {
  return (
    <PlayerStoreProvider bootstrap={bootstrap}>
      <PlayerRoot diagramId={bootstrap.diagramId}>{children}</PlayerRoot>
    </PlayerStoreProvider>
  );
}

function PlayerRoot({ diagramId, children }: { diagramId: string; children?: ReactNode }) {
  const mode = usePlayerStore((s) => s.mode);
  const simStatus = usePlayerStore((s) => s.sim.status);
  return (
    <div data-player-root={diagramId} data-player-mode={mode} data-sim-status={simStatus} className="relative">
      {children}
      {/* TODO(T3.3): <InteractiveLayer /> — overlay SVG + Canvas2D particles sharing the frame's viewBox. */}
    </div>
  );
}
