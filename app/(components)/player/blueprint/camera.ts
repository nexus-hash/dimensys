/**
 * Pan/zoom camera math (BG part 2b). Pure, DOM-free: one `Camera` is the CSS
 * transform DrillStage applies to a drill level's board element —
 * `translate(x, y) scale(scale)`, origin `0 0`, in the stage's own CSS-pixel
 * coordinate space (the board's native pixel size is fixed; `scale` is the
 * absolute native-px → screen-px multiplier, not a multiplier on top of a
 * separate "fit" factor).
 *
 * Kept free of any element lookup or event handling on purpose — `DrillStage`
 * owns the DOM side (measuring the stage box, applying the transform,
 * wiring pointer/wheel/touch/keyboard) and calls into these functions with
 * plain numbers, which is what makes the zoom-about-a-point and fit math
 * unit-testable without a browser.
 */

export interface Camera {
  x: number;
  y: number;
  scale: number;
}

/** `contain` fit, capped at 1× (never upscale past native size) — same rule the pre-camera board-fit effect used. */
export function computeFitScale(freeW: number, freeH: number, nativeW: number, nativeH: number): number {
  if (freeW <= 0 || freeH <= 0 || nativeW <= 0 || nativeH <= 0) return 1;
  return Math.min(1, freeW / nativeW, freeH / nativeH);
}

/** The default camera: fit-scaled and centered in the free area. */
export function fitCamera(freeW: number, freeH: number, nativeW: number, nativeH: number): Camera {
  const scale = computeFitScale(freeW, freeH, nativeW, nativeH);
  return {
    scale,
    x: (freeW - nativeW * scale) / 2,
    y: (freeH - nativeH * scale) / 2,
  };
}

/** `[min, max]` zoom, relative to native (1×) pixels: down to whichever is smaller of the fit or 0.25×, up to 4×. */
export function zoomRange(fitScale: number): { min: number; max: number } {
  return { min: Math.min(fitScale, 0.25), max: 4 };
}

export function clampScale(scale: number, fitScale: number): number {
  const { min, max } = zoomRange(fitScale);
  return Math.min(max, Math.max(min, scale));
}

/**
 * Re-scales `camera` to `nextScale` (clamped to `zoomRange(fitScale)`)
 * keeping the point at stage-space `(cx, cy)` visually fixed — the
 * "zoom about the cursor" / "zoom about the pinch midpoint" invariant.
 * `(cx, cy)` and `camera.x/y` share the same coordinate space (the stage's
 * own box, origin top-left), so this needs no separate unprojection step.
 */
export function zoomAtPoint(camera: Camera, cx: number, cy: number, nextScale: number, fitScale: number): Camera {
  const scale = clampScale(nextScale, fitScale);
  if (scale === camera.scale) return camera;
  const k = scale / camera.scale;
  return {
    scale,
    x: cx - (cx - camera.x) * k,
    y: cy - (cy - camera.y) * k,
  };
}

/** Multiplies the current scale by `factor` (e.g. 1.2 for a zoom-in step), about `(cx, cy)`. */
export function zoomByFactor(camera: Camera, cx: number, cy: number, factor: number, fitScale: number): Camera {
  return zoomAtPoint(camera, cx, cy, camera.scale * factor, fitScale);
}

/** Plain translation — dragging, wheel-pan, arrow-key pan. */
export function panBy(camera: Camera, dx: number, dy: number): Camera {
  return { ...camera, x: camera.x + dx, y: camera.y + dy };
}

/**
 * Keeps the board from being panned entirely out of the free area: on each
 * axis independently, at least `min(120, 20% of that axis's *rendered*
 * size)` of the board must overlap the free area. Fit is always a no-op
 * here (a centered, ≤1× board always clears this by construction) — this
 * only ever bites an intentional pan/zoom past the edge, and "Fit" (`0`)
 * always recovers regardless of how far the camera drifted.
 */
export function clampPan(camera: Camera, freeW: number, freeH: number, nativeW: number, nativeH: number): Camera {
  const renderedW = nativeW * camera.scale;
  const renderedH = nativeH * camera.scale;
  const minVisibleX = Math.min(120, 0.2 * renderedW);
  const minVisibleY = Math.min(120, 0.2 * renderedH);

  function clampAxis(pos: number, rendered: number, free: number, minVisible: number): number {
    const lower = minVisible - rendered;
    const upper = free - minVisible;
    // Defensive only: with `minVisible = min(120, 20% of rendered)` and a
    // non-negative `free`, `lower <= upper` always holds, so this never
    // actually triggers today — kept so a degenerate rendered size (0, or a
    // future change to the visibility-floor formula) can't divide the
    // clamp into an empty range.
    if (lower > upper) return (free - rendered) / 2;
    return Math.min(upper, Math.max(lower, pos));
  }

  return {
    scale: camera.scale,
    x: clampAxis(camera.x, renderedW, freeW, minVisibleX),
    y: clampAxis(camera.y, renderedH, freeH, minVisibleY),
  };
}

/** The CSS `transform` string for a `Camera`, `transform-origin: 0 0`. */
export function cameraTransform(camera: Camera): string {
  return `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`;
}

export const ZOOM_STEP = 1.25;
/** Below this, a pointer gesture reads as a click/tap, not a drag/pan (px, in stage space). */
export const DRAG_THRESHOLD_PX = 4;
