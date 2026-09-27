'use client';

import { useRef, type ReactNode } from 'react';
import { PlayerStoreProvider, usePlayerStore } from './store/PlayerStoreProvider';
import { InteractiveLayer } from './overlay/InteractiveLayer';
import type { PlayerBootstrap } from './types';

/**
 * The player's single client boundary.
 *
 * Owns the per-player store and the worker bridge (via `InteractiveLayer`,
 * T3.3). Everything passed as `children` is server-rendered and stays
 * server-rendered: the static SVG frame (T3.2), rail markdown and detail
 * sections ship as HTML with no component JS. Interactive leaves (HUD,
 * timeline, overlay, mode switcher) are separate small client components
 * that read the store.
 */
export function PlayerIsland({ bootstrap, children }: { bootstrap: PlayerBootstrap; children?: ReactNode }) {
  return (
    <PlayerStoreProvider bootstrap={bootstrap}>
      <PlayerRoot bootstrap={bootstrap}>{children}</PlayerRoot>
    </PlayerStoreProvider>
  );
}

function PlayerRoot({ bootstrap, children }: { bootstrap: PlayerBootstrap; children?: ReactNode }) {
  const mode = usePlayerStore((s) => s.mode);
  const simStatus = usePlayerStore((s) => s.sim.status);
  const rootRef = useRef<HTMLDivElement | null>(null);
  return (
    <div ref={rootRef} data-player-root={bootstrap.diagramId} data-player-mode={mode} data-sim-status={simStatus} className="relative h-full">
      {children}
      {bootstrap.canvas.w > 0 && <InteractiveLayer bootstrap={bootstrap} containerRef={rootRef} />}
    </div>
  );
}
