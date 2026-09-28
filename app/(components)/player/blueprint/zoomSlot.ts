'use client';

import { createContext, useContext } from 'react';

/**
 * Where the zoom cluster renders. The full player's chrome strip above the
 * board provides a host element (nothing floats over the diagram, so the
 * cluster lives in that strip, next to the HUD tiles); `BoardStage` portals
 * its controls into it. `host` is `null` until the strip has mounted, and
 * the controls render nowhere in that window rather than flashing in over
 * the board. Without a provider at all (the embed/hero boards, which have
 * no chrome strip) the cluster stays where it always was, inside the
 * board's own box.
 */
export interface ZoomSlot {
  host: HTMLElement | null;
}

export const ZoomSlotContext = createContext<ZoomSlot | null>(null);

export function useZoomSlot(): ZoomSlot | null {
  return useContext(ZoomSlotContext);
}
