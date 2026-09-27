'use client';

import { IconButton } from '@/app/(components)/ui';
import { ZoomInIcon, ZoomOutIcon, FitIcon } from '@/app/(components)/ui/icons';

export interface ZoomControlsProps {
  /** Current camera scale as a percent of native (1×) size, already rounded for display. */
  percent: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
}

/**
 * The floating zoom cluster (BG part 2b): zoom out / a percent readout /
 * zoom in / fit, bottom-right of the canvas free area — matches the
 * prototype's `.zoomctl` (a bordered `.icon-btn` row) placement and chrome,
 * translated to this app's `IconButton`/glass tokens. Positioned in CSS
 * (`.player-zoom-controls` in `globals.css`), not here, so it stays clear of
 * the phone sheet's peek height the same way the tooltip/HUD chrome does.
 */
export function ZoomControls({ percent, onZoomIn, onZoomOut, onFit, canZoomIn, canZoomOut }: ZoomControlsProps) {
  return (
    <div className="player-zoom-controls glass" role="group" aria-label="Zoom">
      <IconButton aria-label="Zoom out" size="sm" onClick={onZoomOut} disabled={!canZoomOut}>
        <ZoomOutIcon />
      </IconButton>
      <span className="player-zoom-readout" aria-hidden="true">
        {percent}%
      </span>
      <IconButton aria-label="Zoom in" size="sm" onClick={onZoomIn} disabled={!canZoomIn}>
        <ZoomInIcon />
      </IconButton>
      <IconButton aria-label="Fit to view" size="sm" onClick={onFit}>
        <FitIcon />
      </IconButton>
    </div>
  );
}
