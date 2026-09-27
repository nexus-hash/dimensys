import type { ReactNode } from 'react';

/**
 * The HUD strip: a slim strip above the board, never over it — matching the
 * prototype's `.cstrip`. Two rows: HUD tiles on top (T3.8 fills
 * `data-hud-slot`, sized for up to 4), the Break It toolbar below
 * (`data-canvas-toolbar-slot`, T3.9's Kill/Spike/Partition/Slow/Flush
 * strip — empty here; this task only builds the labelled slot).
 */
export function HudStrip() {
  return (
    <div className="player-hud-strip">
      <div className="player-hud-strip-row">
        <div className="player-hud-slot" role="group" aria-label="Live metrics, last 60 seconds" data-hud-slot />
      </div>
      <div className="player-canvas-toolbar-slot" role="toolbar" aria-label="Break it tools" data-canvas-toolbar-slot />
    </div>
  );
}

/**
 * The narration + timeline dock: below the board, never
 * over it — the board shrinks and re-fits above this dock rather than being
 * covered or dimmed. T3.8 renders the free-play/scenario transport controls
 * and the scrubber into `data-timeline-slot`; story captions and checkpoint
 * decision cards render into `data-narration-slot`.
 */
export function TimelineDock() {
  return (
    <div className="player-timeline-dock">
      <div className="player-narration-slot" aria-live="polite" data-narration-slot />
      <div className="player-timeline-slot" role="group" aria-label="Playback" data-timeline-slot />
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
export function HudTimelineFrame({ children }: { children: ReactNode }) {
  return (
    <div className="player-canvas-area">
      <HudStrip />
      <div className="player-board-wrap">{children}</div>
      <TimelineDock />
    </div>
  );
}
