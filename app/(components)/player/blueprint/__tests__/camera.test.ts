import { describe, it, expect } from 'vitest';
import {
  computeFitScale,
  fitCamera,
  zoomRange,
  clampScale,
  zoomAtPoint,
  zoomByFactor,
  panBy,
  clampPan,
  cameraTransform,
  normalizeWheelDeltaY,
  WHEEL_ZOOM_K,
} from '../camera';

describe('computeFitScale', () => {
  it('contains without upscaling past 1×', () => {
    expect(computeFitScale(2000, 2000, 640, 360)).toBe(1);
  });
  it('shrinks to the tighter axis', () => {
    expect(computeFitScale(320, 360, 640, 360)).toBeCloseTo(0.5);
    expect(computeFitScale(640, 180, 640, 360)).toBeCloseTo(0.5);
  });
  it('is defensive against a zero-size free area or native board', () => {
    expect(computeFitScale(0, 500, 640, 360)).toBe(1);
    expect(computeFitScale(500, 500, 0, 360)).toBe(1);
  });
});

describe('fitCamera', () => {
  it('centers a smaller-than-native board in the free area', () => {
    const cam = fitCamera(320, 360, 640, 360);
    expect(cam.scale).toBeCloseTo(0.5);
    // 640*0.5 = 320 wide -> flush on x; 360*0.5=180 tall -> centered with 90px above/below.
    expect(cam.x).toBeCloseTo(0);
    expect(cam.y).toBeCloseTo(90);
  });
  it('centers a native-size (1×) board with margins on both axes', () => {
    const cam = fitCamera(800, 600, 640, 360);
    expect(cam.scale).toBe(1);
    expect(cam.x).toBeCloseTo(80);
    expect(cam.y).toBeCloseTo(120);
  });
});

describe('zoomRange / clampScale', () => {
  it('floors at min(fit, 0.25) and caps at 4×', () => {
    expect(zoomRange(0.5)).toEqual({ min: 0.25, max: 4 });
    expect(zoomRange(0.1)).toEqual({ min: 0.1, max: 4 });
    expect(clampScale(10, 0.5)).toBe(4);
    expect(clampScale(0.01, 0.5)).toBe(0.25);
    expect(clampScale(1, 0.5)).toBe(1);
  });
});

describe('zoomAtPoint', () => {
  it('keeps the point under the cursor stationary', () => {
    const cam = { x: 10, y: 20, scale: 1 };
    const cx = 150;
    const cy = 80;
    const next = zoomAtPoint(cam, cx, cy, 2, 1);
    // The point at (cx, cy) maps to the same native-space point before and after.
    const before = { nx: (cx - cam.x) / cam.scale, ny: (cy - cam.y) / cam.scale };
    const after = { nx: (cx - next.x) / next.scale, ny: (cy - next.y) / next.scale };
    expect(after.nx).toBeCloseTo(before.nx);
    expect(after.ny).toBeCloseTo(before.ny);
    expect(next.scale).toBe(2);
  });

  it('clamps to the zoom range and is a no-op past the clamp', () => {
    const cam = { x: 0, y: 0, scale: 4 };
    const next = zoomAtPoint(cam, 50, 50, 10, 1);
    expect(next).toBe(cam);
    expect(next.scale).toBe(4);
  });

  it('zoomByFactor multiplies the current scale about the point', () => {
    const cam = { x: 0, y: 0, scale: 1 };
    const next = zoomByFactor(cam, 100, 100, 1.25, 1);
    expect(next.scale).toBeCloseTo(1.25);
  });
});

describe('panBy', () => {
  it('translates without touching scale', () => {
    const cam = { x: 10, y: 20, scale: 1.5 };
    expect(panBy(cam, 5, -5)).toEqual({ x: 15, y: 15, scale: 1.5 });
  });
});

describe('clampPan', () => {
  it('leaves a well-inside camera untouched', () => {
    const cam = { x: 100, y: 100, scale: 1 };
    expect(clampPan(cam, 1000, 800, 640, 360)).toEqual(cam);
  });

  it('never fully evicts a normal-sized board off either edge', () => {
    // Panned way off to the left/up.
    const cam = { x: -5000, y: -5000, scale: 1 };
    const clamped = clampPan(cam, 1000, 800, 640, 360);
    // At least min(120, 20% of 640)=120px of the board's right edge stays on screen.
    expect(clamped.x + 640 * 1).toBeGreaterThanOrEqual(120 - 0.001);
    // Panned way off to the right/down.
    const cam2 = { x: 5000, y: 5000, scale: 1 };
    const clamped2 = clampPan(cam2, 1000, 800, 640, 360);
    expect(clamped2.x).toBeLessThanOrEqual(1000 - 120 + 0.001);
  });

  it("fit's own centered camera is always already inside the clamp", () => {
    const fit = fitCamera(1000, 800, 640, 360);
    expect(clampPan(fit, 1000, 800, 640, 360)).toEqual(fit);
  });

  it('is a defensive no-op (never divides by an empty range) even for a degenerate zero-size board', () => {
    const cam = { x: 9999, y: -9999, scale: 1 };
    const clamped = clampPan(cam, 500, 500, 0, 0);
    expect(Number.isFinite(clamped.x)).toBe(true);
    expect(Number.isFinite(clamped.y)).toBe(true);
  });
});

describe('cameraTransform', () => {
  it('renders a translate+scale CSS transform', () => {
    expect(cameraTransform({ x: 12, y: -4, scale: 2 })).toBe('translate(12px, -4px) scale(2)');
  });
});

describe('normalizeWheelDeltaY (GEOM: every wheel gesture zooms now)', () => {
  it('passes a pixel-mode delta through unchanged', () => {
    expect(normalizeWheelDeltaY(-120, 0)).toBe(-120);
  });
  it('scales a line-mode delta by a 16px line height', () => {
    expect(normalizeWheelDeltaY(-3, 1)).toBe(-48);
  });
  it('scales a page-mode delta by the given page size', () => {
    expect(normalizeWheelDeltaY(-1, 2, 700)).toBe(-700);
  });
  it('falls back to a nominal 800px page size when none is given', () => {
    expect(normalizeWheelDeltaY(-1, 2)).toBe(-800);
  });
  it('zooms in for a negative deltaY and out for a positive one, at the tuned rate', () => {
    const factorIn = Math.exp(-normalizeWheelDeltaY(-120, 0) * WHEEL_ZOOM_K);
    const factorOut = Math.exp(-normalizeWheelDeltaY(120, 0) * WHEEL_ZOOM_K);
    expect(factorIn).toBeGreaterThan(1);
    expect(factorOut).toBeLessThan(1);
  });
});
