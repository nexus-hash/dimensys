'use client';

import { useId, useMemo, useState, type ReactNode } from 'react';
import { HudTable, HudSummary, HudTileRow, useHudReadings } from '../hud/HudTiles';
import { PlaybackControls } from '../hud/PlaybackControls';
import { ZoomSlotContext } from '../blueprint/zoomSlot';
import { WalkthroughNarration } from '../walkthrough/WalkthroughNarration';
import { CheckpointSlot, StoryNarration } from '../story';
import type { GaugeView } from '../types';
import { BreakDockRow, BreakToolbox } from '../breakit';

export interface HudStripProps {
  gauges: readonly GaugeView[];
  /** Receives the element the board's zoom cluster renders into (see `ZoomSlotContext`). */
  zoomHostRef?: (el: HTMLElement | null) => void;
}

/**
 * The chrome strip above the board, never over it. One compact row: the HUD
 * tiles (flexing, up to 4, each capped at 230px) and then the zoom cluster.
 * The Break It toolbar slot (`data-canvas-toolbar-slot`, filled by a later
 * task) sits in its own row underneath and takes no space while empty.
 *
 * Requirement badges don't render here: they're a per-requirement list
 * sized for the left rail (`LeftRail.tsx`), and the phone sheet's Metrics
 * tab (`PhoneSheet.tsx`).
 *
 * Phone: the tiles collapse behind one summary button (the first two
 * values); tapping it expands them into a 2×2 grid inside the strip, and
 * the board re-fits to the space left.
 */
export function HudStrip({ gauges, zoomHostRef }: HudStripProps) {
  const readings = useHudReadings(gauges);
  const [expanded, setExpanded] = useState(false);
  const tilesId = useId();

  return (
    <div className="player-hud-strip" data-hud-expanded={expanded}>
      <div className="player-hud-strip-row">
        <div id={tilesId} className="player-hud-slot" role="group" aria-label="Live metrics, last 60 seconds" data-hud-slot>
          <HudTileRow readings={readings} />
          <HudTable readings={readings} />
        </div>
        <HudSummary readings={readings} expanded={expanded} onToggle={() => setExpanded((v) => !v)} controls={tilesId} />
        <div ref={zoomHostRef} className="player-zoom-slot" data-zoom-slot />
      </div>
      <div className="player-canvas-toolbar-slot" data-canvas-toolbar-slot>
        <BreakToolbox />
      </div>
    </div>
  );
}

export interface TimelineDockProps {
  /** `false` for the phone sheet's own copy of this dock (`PhoneSheet.tsx`) — see `PlaybackControls`' doc comment: only one mounted instance may own the Space/`[`/`]`/R shortcuts. */
  registerShortcuts?: boolean;
}

/**
 * The narration + transport dock: below the board, never over it — the
 * board shrinks and re-fits above this dock rather than being covered or
 * dimmed. One 40px transport row; the narration slot above it
 * (`data-narration-slot`, for story captions and checkpoint cards) takes
 * no space while empty.
 */
export function TimelineDock({ registerShortcuts = true }: TimelineDockProps = {}) {
  return (
    <div className="player-timeline-dock" data-dock={registerShortcuts ? 'board' : 'sheet'}>
      {/* A checkpoint question takes focus itself, so it sits outside the live region. */}
      {registerShortcuts ? <CheckpointSlot where="dock" /> : null}
      <div className="player-narration-slot" aria-live="polite" data-narration-slot>
        <WalkthroughNarration />
        {registerShortcuts ? <StoryNarration /> : null}
      </div>
      {registerShortcuts ? <BreakDockRow /> : null}
      <div className="player-timeline-slot" role="group" aria-label="Playback" data-timeline-slot>
        <PlaybackControls registerShortcuts={registerShortcuts} />
      </div>
    </div>
  );
}

/**
 * The canvas frame: wraps the board (`children`, i.e. `PlayerBlueprint`
 * + its `InteractiveLayer` overlay) between the chrome strip above and the
 * narration/transport dock below — nothing floats over the diagram. The
 * board's zoom cluster is portalled up into the strip through
 * `ZoomSlotContext`.
 */
export function HudTimelineFrame({ gauges, children }: { gauges: readonly GaugeView[]; children: ReactNode }) {
  const [zoomHost, setZoomHost] = useState<HTMLElement | null>(null);
  const zoomSlot = useMemo(() => ({ host: zoomHost }), [zoomHost]);
  return (
    <div className="player-canvas-area">
      <HudStrip gauges={gauges} zoomHostRef={setZoomHost} />
      <ZoomSlotContext.Provider value={zoomSlot}>
        <div className="player-board-wrap">{children}</div>
      </ZoomSlotContext.Provider>
      <TimelineDock />
    </div>
  );
}
