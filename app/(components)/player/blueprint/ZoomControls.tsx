'use client';

import { IconButton } from '@/app/(components)/ui';
import { ZoomInIcon, ZoomOutIcon, FitIcon } from '@/app/(components)/ui/icons';

export interface ZoomControlsProps {
  /** Current camera scale as a percent of native (1×) size, already rounded — the group's accessible description. */
  percent: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
  /** `strip`: docked in the chrome strip above the board. `overlay`: inside a bare board with no chrome (embed/hero). */
}

/**
 * The zoom cluster: zoom in / zoom out / fit, a bordered row of 30px icon
 * buttons (`+`, `-` and `0` do the same from the keyboard). The current
 * zoom level is exposed to assistive tech on the group itself rather than
 * as a visible readout. On phone only Fit shows (pinch covers zooming).
 */
export function ZoomControls({ percent, onZoomIn, onZoomOut, onFit, canZoomIn, canZoomOut }: ZoomControlsProps) {
  return (
    <div
      className="player-zoom-controls glass"
      role="group"
      aria-label={`Zoom, ${percent}%`}
      data-zoom-percent={percent}
    >
      <IconButton aria-label="Zoom in" size="sm" className="player-zoom-step" onClick={onZoomIn} disabled={!canZoomIn}>
        <ZoomInIcon />
      </IconButton>
      <IconButton aria-label="Zoom out" size="sm" className="player-zoom-step" onClick={onZoomOut} disabled={!canZoomOut}>
        <ZoomOutIcon />
      </IconButton>
      <IconButton aria-label="Fit to view" size="sm" className="player-zoom-fit" onClick={onFit}>
        <FitIcon />
      </IconButton>
    </div>
  );
}
