import type { ReactNode } from 'react';
import { HudTiles } from '../hud/HudTiles';
import { PlaybackControls } from '../hud/PlaybackControls';
import type { GaugeView } from '../types';

export interface HudStripProps {
  gauges: readonly GaugeView[];
}

/**
 * The HUD strip: a slim strip above the board, never over it — matching the
 * design spec's chrome strip. Two rows: HUD tiles on top (T3.8 fills
 * `data-hud-slot`, sized for up to 4 tiles), the Break It toolbar below
 * (`data-canvas-toolbar-slot`, T3.9's Kill/Spike/Partition/Slow/Flush
 * strip — empty here; this task only builds the labelled slot).
 *
 * Requirement badges do *not* render here: they're a per-requirement list
 * row (glyph, text, observed value — the data-display kit's own
 * `RequirementBadge`), sized for the left rail's "Problem" section
 * (`LeftRail.tsx`), not a slim horizontal strip — the board-fit effect
 * (`DrillStage`, off-limits here) sizes the canvas off this strip's own
 * height, so keeping it tiles-only keeps that height fixed regardless of
 * how many requirements a diagram has. Phone (where the rail doesn't
 * render) gets the same badges through the bottom sheet's Metrics tab
 * instead (`PhoneSheet.tsx`), alongside this same `<HudStrip>`.
 */
export function HudStrip({ gauges }: HudStripProps) {
  return (
    <div className="player-hud-strip">
      <div className="player-hud-strip-row">
        {/* `tabIndex={0}`: this row scrolls horizontally on phone (one row of
            tiles rather than wrapping — see the `.hud-tile` phone rule in
            globals.css); a scrollable region must itself be reachable by
            keyboard (axe `scrollable-region-focusable`), not just the
            focusable buttons/links it happens to contain — a HUD tile has
            neither, so without this the row fails that check below the
            breakpoint where it actually overflows. */}
        <div className="player-hud-slot" role="group" aria-label="Live metrics, last 60 seconds" data-hud-slot tabIndex={0}>
          <HudTiles gauges={gauges} />
        </div>
      </div>
      <div className="player-canvas-toolbar-slot" role="toolbar" aria-label="Break it tools" data-canvas-toolbar-slot />
    </div>
  );
}

export interface TimelineDockProps {
  /** `false` for the phone sheet's own copy of this dock (`PhoneSheet.tsx`) — see `PlaybackControls`' doc comment: only one mounted instance may own the Space/`[`/`]` shortcuts. */
  registerShortcuts?: boolean;
}

/**
 * The narration + timeline dock: below the board, never
 * over it — the board shrinks and re-fits above this dock rather than being
 * covered or dimmed. T3.8 renders the free-play/scenario transport controls
 * and the scrubber into `data-timeline-slot`; story captions and checkpoint
 * decision cards render into `data-narration-slot`.
 */
export function TimelineDock({ registerShortcuts = true }: TimelineDockProps = {}) {
  return (
    <div className="player-timeline-dock">
      <div className="player-narration-slot" aria-live="polite" data-narration-slot />
      <div className="player-timeline-slot" role="group" aria-label="Playback" data-timeline-slot>
        <PlaybackControls registerShortcuts={registerShortcuts} />
      </div>
    </div>
  );
}

/**
 * The canvas frame (T3.16 scope item 5, "Timeline/HUD frame"): wraps the
 * board (`children`, i.e. `DrilldownBlueprint` + its `InteractiveLayer`
 * overlay) between the HUD strip above and the narration/timeline dock
 * below — nothing floats over the diagram; the two chrome
 * regions sit outside the board's own box instead.
 */
export function HudTimelineFrame({ gauges, children }: HudStripProps & { children: ReactNode }) {
  return (
    <div className="player-canvas-area">
      <HudStrip gauges={gauges} />
      <div className="player-board-wrap">{children}</div>
      <TimelineDock />
    </div>
  );
}
