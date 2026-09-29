'use client';

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useShortcut, useShortcutScope } from '@/app/(components)/command';
import {
  cameraTransform,
  computeFitScale,
  fitCamera,
  panBy,
  clampPan,
  zoomAtPoint,
  zoomRange,
  normalizeWheelDeltaY,
  WHEEL_ZOOM_K,
  PINCH_ZOOM_K,
  WHEEL_MAX_STEP,
  ZOOM_STEP,
  DRAG_THRESHOLD_PX,
  focusCamera,
  interpolateCamera,
  cameraForView,
  viewOfCamera,
  CAMERA_VIEW_EVENT,
  easeInOut,
  readingFitCamera,
  readingFitScale,
} from './camera';
import { applyShape, captureShape, BOARD_SHAPE_EVENT, type BoardShapeDetail, type DrawnShape, type ShapeName } from './shape';
import { isMotionReduced } from '@/app/(components)/motion/reducedMotion';
import { CAMERA_FOCUS_EVENT, type CameraFocusDetail } from '../walkthrough/stage';
import type { BoardView, Camera, CameraChangeDetail } from './camera';
import { ZoomControls } from './ZoomControls';
import type { Box, XY } from '../types';

/** Length of an animated camera move (a walkthrough step's focus). Instant under reduced motion. */
const CAMERA_MOVE_MS = 420;

export interface BoardStageProps {
  /** The board's own native pixel size (`Board.size`), for the board-fit effect. */
  boardSize: XY;
  /**
   * The board's tall (top-to-bottom) arrangement, when it has one: swapped
   * in on a phone-width player (or wherever it reads much bigger than the
   * wide one), and back out when the player widens again.
   */
  tall?: DrawnShape | null;
  className?: string;
  /**
   * False: a static preview (the home hero). The board still fits its box
   * and re-fits on resize, but there are no zoom controls, no pointer/wheel
   * pan or zoom (a wheel over it scrolls the page) and no player keyboard
   * scope. Default true.
   */
  interactive?: boolean;
  /**
   * One `<div data-board-level>` wrapping the board's `<StaticBlueprint>`,
   * pre-rendered server-side by `PlayerBlueprint`. This component only
   * moves and scales it (the camera); it draws nothing itself.
   */
  children: ReactNode;
}

/** Phone width: the same breakpoint as the player's own phone CSS. */
const PHONE_QUERY = '(max-width: 639px)';
/** Off a phone, the tall arrangement is used only when its fit is at least this much bigger than the wide one's. */
const TALL_ADVANTAGE = 1.5;
/** Two taps this close in time (ms) and space (px) are a double tap: fit. */
const DOUBLE_TAP_MS = 320;
const DOUBLE_TAP_PX = 32;

/** Distance and stage-space midpoint between two tracked pointers (pinch). */
function pointerGeometry(a: XY, b: XY): { dist: number; mid: XY } {
  const dist = Math.hypot(a[0] - b[0], a[1] - b[1]);
  const mid: XY = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  return { dist, mid };
}

/**
 * The player's pan/zoom camera (BG part 2b): owns the board's camera
 * (translate + scale, applied as one CSS transform to the board element —
 * see `camera.ts`).
 *
 * This measures only its own box (`stageRef`, a `ResizeObserver` on it) —
 * never the HUD strip, timeline dock, rail or inspector. Those bands are
 * laid out in CSS (`.player-canvas-area`'s flex column / `.player-body`'s
 * grid columns in `globals.css`); however the owner rearranges that chrome
 * later, this component and `camera.ts` don't need to change, because they
 * only ever ask *this* element for its own `clientWidth`/`clientHeight`.
 *
 * Camera state is plain refs, not the shared store: chrome-only (never part
 * of a share link, never synced across tabs). `tracking` is true until the
 * user pans or zooms; while true, every resize (window, rail/inspector
 * toggle, phone sheet snap) re-fits the board. Once false, the camera holds
 * until the user hits Fit (`0`, or the zoom cluster's Fit button), which
 * re-fits and flips `tracking` back to true.
 *
 * The zoom cluster floats as a small island in the board's bottom-left
 * corner; a non-interactive (hero preview) board renders none.
 */
export function BoardStage({ boardSize, tall = null, className, interactive = true, children }: BoardStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);

  // ---- arrangement (wide / tall) ----
  // `sizeRef` is the native size of whichever arrangement the board shows
  // now; everything below reads it rather than `boardSize`.
  const sizeRef = useRef<XY>(boardSize);
  const shapeRef = useRef<ShapeName>('wide');
  const wideRef = useRef<DrawnShape | null>(null);
  const [shapeName, setShapeName] = useState<ShapeName>('wide');

  // On a phone the tall arrangement is read from the top at its width fit
  // (`readingFitCamera`); anywhere else it is contain-fitted like the wide one.
  const readingRef = useRef(false);

  /** Which arrangement suits a free area of `freeW`×`freeH` (and whether it's read page-style). */
  function chooseShape(freeW: number, freeH: number): ShapeName {
    readingRef.current = false;
    if (!tall || !interactive) return 'wide';
    if (typeof window !== 'undefined' && window.matchMedia?.(PHONE_QUERY).matches) {
      readingRef.current = true;
      return 'tall';
    }
    const wide = computeFitScale(freeW, freeH, boardSize[0], boardSize[1]);
    const tallFit = computeFitScale(freeW, freeH, tall.size[0], tall.size[1]);
    // A little hysteresis, so a resize near the threshold doesn't flip it back and forth.
    const advantage = shapeRef.current === 'tall' ? TALL_ADVANTAGE * 0.85 : TALL_ADVANTAGE;
    return tallFit >= wide * advantage ? 'tall' : 'wide';
  }

  /** Swaps the drawn arrangement in place and tells the other layers. */
  function switchShape(next: ShapeName) {
    if (next === shapeRef.current || !tall) return;
    const svg = stageRef.current?.querySelector<SVGSVGElement>('[data-board-level] svg');
    if (!svg) return;
    wideRef.current ??= captureShape(svg, tall);
    const shape = next === 'tall' ? tall : wideRef.current;
    applyShape(svg, findBoardEl(), shape);
    shapeRef.current = next;
    sizeRef.current = shape.size;
    // The old framing was in the other arrangement's coordinates.
    focusBoxRef.current = null;
    stashRef.current = null;
    trackingRef.current = true;
    stopTween();
    setShapeName(next);
    stageRef.current?.dispatchEvent(new CustomEvent<BoardShapeDetail>(BOARD_SHAPE_EVENT, { bubbles: true, detail: { shape: next } }));
  }

  /** The camera's fit for the current arrangement: the tall one is read from the top at its width fit. */
  function fitFor(freeW: number, freeH: number): Camera {
    const [nativeW, nativeH] = sizeRef.current;
    return readingRef.current ? readingFitCamera(freeW, freeH, nativeW, nativeH) : fitCamera(freeW, freeH, nativeW, nativeH);
  }

  /** The smallest scale a focus request may frame at: the fit the arrangement opens with. */
  function focusFloor(freeW: number, freeH: number): number {
    const [nativeW, nativeH] = sizeRef.current;
    return readingRef.current ? readingFitScale(freeW, freeH, nativeW, nativeH) : computeFitScale(freeW, freeH, nativeW, nativeH);
  }

  // ---- camera state (BG part 2b) ----
  const cameraRef = useRef<Camera | null>(null);
  const trackingRef = useRef(true);
  const fitScaleRef = useRef(1);
  const [readout, setReadout] = useState({ percent: 100, fitScale: 1 });
  const readoutFrameRef = useRef(0);
  // Focus requests (walkthrough steps): the box the camera frames while
  // tracking, the view from before the first request (restored when the
  // requests end), and the running animation, if any.
  const focusBoxRef = useRef<Box | null>(null);
  const stashRef = useRef<{ camera: Camera; tracking: boolean } | null>(null);
  const tweenRef = useRef(0);
  // A view asked for before the stage could be measured (a share link's).
  const pendingViewRef = useRef<BoardView | null>(null);

  function stopTween() {
    if (tweenRef.current) cancelAnimationFrame(tweenRef.current);
    tweenRef.current = 0;
  }

  /** Moves the camera to `target`, animated unless motion is reduced. */
  function animateTo(target: Camera) {
    stopTween();
    const from = cameraRef.current;
    if (!from || isMotionReduced()) {
      applyCamera(target);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / CAMERA_MOVE_MS);
      // While tracking, aim at the tracked view as it is *now*: the free
      // area can change mid-move (the dock's narration card appearing).
      const stage = stageRef.current;
      const to =
        trackingRef.current && stage && stage.clientWidth > 0 && stage.clientHeight > 0
          ? trackedCamera(stage.clientWidth, stage.clientHeight)
          : target;
      applyCamera(interpolateCamera(from, to, easeInOut(t)));
      tweenRef.current = t < 1 ? requestAnimationFrame(tick) : 0;
    };
    tweenRef.current = requestAnimationFrame(tick);
  }

  /** The camera tracking mode shows: the focus box when one is set, the whole board otherwise. */
  function trackedCamera(freeW: number, freeH: number): Camera {
    const box = focusBoxRef.current;
    return box ? focusCamera(freeW, freeH, box, focusFloor(freeW, freeH)) : fitFor(freeW, freeH);
  }

  function findBoardEl(): HTMLElement | null {
    const levelEl = stageRef.current?.querySelector<HTMLElement>('[data-board-level]');
    return (levelEl?.firstElementChild as HTMLElement | null) ?? null;
  }

  function applyCamera(camera: Camera) {
    const boardEl = findBoardEl();
    if (!boardEl) {
      cameraRef.current = camera;
      return;
    }
    const stage = stageRef.current;
    const [nativeW, nativeH] = sizeRef.current;
    // Pan bounds (BG owner review): clamped against *this* stage's current
    // free box, not the fit-time box — a pan/zoom can't be produced without
    // the stage already being measurable, so `stage` is never null here in
    // practice, but the fallback (no clamp) is harmless if it ever were.
    camera = stage ? clampPan(camera, stage.clientWidth, stage.clientHeight, nativeW, nativeH) : camera;
    cameraRef.current = camera;
    boardEl.style.position = 'absolute';
    boardEl.style.left = '0';
    boardEl.style.top = '0';
    boardEl.style.maxWidth = 'none';
    boardEl.style.maxHeight = 'none';
    boardEl.style.width = `${nativeW}px`;
    boardEl.style.height = `${nativeH}px`;
    boardEl.style.transformOrigin = '0 0';
    boardEl.style.transform = cameraTransform(camera);
    // The user's own view (share links carry it); `null` while it's fitted or framed for them.
    // A view names the arrangement it's in: the same board point sits elsewhere on the other one.
    const view =
      !trackingRef.current && stage && stage.clientWidth > 0
        ? { ...viewOfCamera(camera, stage.clientWidth, stage.clientHeight), ...(shapeRef.current === 'tall' ? { tall: true as const } : {}) }
        : null;
    stageRef.current?.dispatchEvent(new CustomEvent<CameraChangeDetail>('playercamerachange', { bubbles: true, detail: { view } }));
    if (readoutFrameRef.current) cancelAnimationFrame(readoutFrameRef.current);
    readoutFrameRef.current = requestAnimationFrame(() => {
      readoutFrameRef.current = 0;
      setReadout({ percent: Math.round(camera.scale * 100), fitScale: fitScaleRef.current });
    });
  }

  /** (Re)fits the camera to the stage's current free box. Always applied when `force` (the Fit action); otherwise only while still `tracking`. */
  function recompute(force = false) {
    const stage = stageRef.current;
    if (!stage) return;
    const freeW = stage.clientWidth;
    const freeH = stage.clientHeight;
    if (freeW <= 0 || freeH <= 0) return;
    switchShape(chooseShape(freeW, freeH));
    const [nativeW, nativeH] = sizeRef.current;
    const fitScale = computeFitScale(freeW, freeH, nativeW, nativeH);
    fitScaleRef.current = fitScale;

    const pendingView = pendingViewRef.current;
    if (pendingView && !force) {
      pendingViewRef.current = null;
      showView(pendingView);
      return;
    }

    if (force || trackingRef.current) {
      trackingRef.current = true;
      if (force) {
        focusBoxRef.current = null;
        stashRef.current = null;
      }
      if (!tweenRef.current || force) {
        stopTween();
        applyCamera(trackedCamera(freeW, freeH));
      }
      return;
    }
    // Not tracking: keep the user's own camera, just re-clamp its scale in
    // case the fit (and so the zoom floor) shifted under a resize.
    const current = cameraRef.current;
    if (!current) return;
    const { min, max } = zoomRange(fitScale);
    const scale = Math.min(max, Math.max(min, current.scale));
    if (scale !== current.scale) applyCamera({ ...current, scale });
  }

  function fitActive() {
    recompute(true);
  }

  /** Shows a view given in board terms (a share link's): the user's own view from then on. */
  function showView(view: BoardView) {
    const stage = stageRef.current;
    const freeW = stage?.clientWidth ?? 0;
    const freeH = stage?.clientHeight ?? 0;
    if (!stage || freeW <= 0 || freeH <= 0) {
      pendingViewRef.current = view;
      return;
    }
    // A view of the other arrangement (a link made on a wider or narrower
    // screen) would aim at the wrong place: keep the fit instead.
    if (!!view.tall !== (shapeRef.current === 'tall')) return;
    const fitScale = computeFitScale(freeW, freeH, sizeRef.current[0], sizeRef.current[1]);
    fitScaleRef.current = fitScale;
    stopTween();
    trackingRef.current = false;
    applyCamera(cameraForView(view, freeW, freeH, fitScale));
  }

  // Board fit (T3.16, extended by BG part 2b): re-fits the board on every
  // resize of the stage's own box — window resize, the rail collapsing, the
  // inspector opening/closing, the phone sheet's snap height changing the
  // canvas area's reserved bottom padding — for as long as it's still
  // `tracking` (the user hasn't panned/zoomed it).
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    recompute();
    const ro = new ResizeObserver(() => recompute());
    ro.observe(stage);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardSize[0], boardSize[1]]);

  // Focus requests: a walkthrough step asks the camera to frame its targets
  // (`box`), or to go back to the view from before the walkthrough (`null`).
  // A framed box is tracked like the fit is — a resize re-frames it — until
  // the user pans or zooms.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    function onFocus(e: Event) {
      const box = (e as CustomEvent<CameraFocusDetail>).detail?.box ?? null;
      const current = cameraRef.current;
      const s = stageRef.current;
      const freeW = s?.clientWidth ?? 0;
      const freeH = s?.clientHeight ?? 0;
      if (!current || freeW <= 0 || freeH <= 0) {
        // Not measured yet: remember the request; the first fit frames it.
        focusBoxRef.current = box;
        trackingRef.current = true;
        return;
      }
      const [nativeW, nativeH] = sizeRef.current;
      const fitScale = computeFitScale(freeW, freeH, nativeW, nativeH);
      fitScaleRef.current = fitScale;
      if (box) {
        stashRef.current ??= { camera: current, tracking: trackingRef.current };
        focusBoxRef.current = box;
        trackingRef.current = true;
        animateTo(trackedCamera(freeW, freeH));
        return;
      }
      focusBoxRef.current = null;
      const stash = stashRef.current;
      stashRef.current = null;
      if (stash && !stash.tracking) {
        trackingRef.current = false;
        animateTo(stash.camera);
      } else {
        trackingRef.current = true;
        animateTo(fitFor(freeW, freeH));
      }
    }
    function onView(e: Event) {
      const view = (e as CustomEvent<BoardView>).detail;
      if (view && Number.isFinite(view.x) && Number.isFinite(view.y) && view.z > 0) showView(view);
    }
    stage.addEventListener(CAMERA_FOCUS_EVENT, onFocus);
    stage.addEventListener(CAMERA_VIEW_EVENT, onView);
    return () => {
      stage.removeEventListener(CAMERA_FOCUS_EVENT, onFocus);
      stage.removeEventListener(CAMERA_VIEW_EVENT, onView);
      stopTween();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardSize[0], boardSize[1]]);

  // Pointer/wheel pan+zoom (BG part 2b). Native listeners (not JSX handlers):
  // panning needs `setPointerCapture` and a capture-phase click swallow that
  // React's synthetic bubble dispatch can't give us, and wheel needs
  // `{ passive: false }` to `preventDefault` the page's own scroll/zoom.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !interactive) return;

    const pointers = new Map<number, XY>();
    let drag: { moved: boolean; startX: number; startY: number; lastX: number; lastY: number } | null = null;
    let pinch: { startDist: number; startCamera: Camera; fitScale: number } | null = null;
    let suppressClick = false;
    let lastTap: { t: number; x: number; y: number } | null = null;

    function stageXY(clientX: number, clientY: number): XY {
      const rect = stage!.getBoundingClientRect();
      return [clientX - rect.left, clientY - rect.top];
    }

    function currentCamera(): { camera: Camera; fitScale: number } | null {
      const camera = cameraRef.current;
      if (!camera) return null;
      return { camera, fitScale: fitScaleRef.current };
    }

    /** Defensive: a synthetic pointer id (tests dispatching their own `PointerEvent`s), or a browser quirk on an already-released id, throws here — real capture is a nicety (keeps receiving move events once the pointer leaves the stage's box mid-drag), not something the gesture logic depends on to function. */
    function tryCapture(pointerId: number) {
      try {
        stage!.setPointerCapture(pointerId);
      } catch {
        // no-op
      }
    }

    function onPointerDown(e: PointerEvent) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      stopTween();
      if (!currentCamera()) return;
      pointers.set(e.pointerId, [e.clientX, e.clientY]);
      if (pointers.size === 1) {
        // Capture is deliberately *not* taken here: a plain click (no
        // movement) must keep hitting its real target (a node or a link)
        // for selection to work — `setPointerCapture`
        // retargets the mouse-event chain (`mouseup`/`click` included) onto
        // the capturing element, which would break exactly that. It's taken
        // lazily in `onPointerMove`, once a drag is confirmed.
        drag = { moved: false, startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastY: e.clientY };
        pinch = null;
      } else if (pointers.size === 2) {
        // A second pointer down is never a click regardless of movement, so capturing both immediately is safe.
        tryCapture(e.pointerId);
        const [a, b] = Array.from(pointers.values());
        const { dist } = pointerGeometry(a, b);
        const cur = currentCamera();
        if (cur && dist > 0) pinch = { startDist: dist, startCamera: cur.camera, fitScale: cur.fitScale };
        drag = null;
      }
    }

    function onPointerMove(e: PointerEvent) {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, [e.clientX, e.clientY]);
      const cur = currentCamera();
      if (!cur) return;

      if (pointers.size >= 2 && pinch) {
        const [a, b] = Array.from(pointers.values());
        const { dist, mid } = pointerGeometry(a, b);
        if (dist <= 0) return;
        // `mid` is in viewport coordinates (the two pointers' own clientX/Y
        // average) — convert to stage-space once, same space `camera.x/y` live in.
        const stagePoint = stageXY(mid[0], mid[1]);
        const nextScale = pinch.startCamera.scale * (dist / pinch.startDist);
        const next = zoomAtPoint(pinch.startCamera, stagePoint[0], stagePoint[1], nextScale, pinch.fitScale);
        trackingRef.current = false;
        applyCamera(next);
        return;
      }

      if (pointers.size === 1 && drag) {
        const dx = e.clientX - drag.lastX;
        const dy = e.clientY - drag.lastY;
        if (!drag.moved) {
          if (Math.abs(e.clientX - drag.startX) < DRAG_THRESHOLD_PX && Math.abs(e.clientY - drag.startY) < DRAG_THRESHOLD_PX) {
            return;
          }
          drag.moved = true;
          tryCapture(e.pointerId);
        }
        drag.lastX = e.clientX;
        drag.lastY = e.clientY;
        trackingRef.current = false;
        applyCamera(panBy(cur.camera, dx, dy));
      }
    }

    function endPointer(e: PointerEvent) {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = null;
      if (pointers.size === 1) {
        // A pinch just ended with one finger still down: resume as a drag
        // from here (already past the click/drag threshold — the pinch
        // itself was a multi-touch gesture, never a tap) rather than
        // re-arming a fresh threshold and eating the finger's first bit of
        // movement.
        const [remaining] = Array.from(pointers.values());
        drag = { moved: true, startX: remaining[0], startY: remaining[1], lastX: remaining[0], lastY: remaining[1] };
      } else if (pointers.size === 0) {
        if (drag?.moved) suppressClick = true;
        // Double tap (touch): back to the fit.
        if (e.type === 'pointerup' && e.pointerType === 'touch' && drag && !drag.moved) {
          const now = e.timeStamp;
          if (lastTap && now - lastTap.t < DOUBLE_TAP_MS && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < DOUBLE_TAP_PX) {
            lastTap = null;
            fitActive();
          } else {
            lastTap = { t: now, x: e.clientX, y: e.clientY };
          }
        } else if (drag?.moved) {
          lastTap = null;
        }
        drag = null;
      }
    }

    function onClickCapture(e: Event) {
      if (!suppressClick) return;
      suppressClick = false;
      e.stopPropagation();
      e.preventDefault();
    }

    function onWheel(e: WheelEvent) {
      const cur = currentCamera();
      if (!cur) return;
      e.preventDefault();
      stopTween();
      const [cx, cy] = stageXY(e.clientX, e.clientY);
      trackingRef.current = false;
      // GEOM: every wheel gesture zooms about the cursor — plain mouse
      // wheel, a bare trackpad two-finger scroll, and ctrl+wheel/a
      // synthesized trackpad pinch alike (a real pinch reports as
      // wheel+ctrlKey; there's nothing left for `ctrlKey` to distinguish
      // once both zoom the same way). Panning is drag/arrow-keys only now.
      const deltaY = normalizeWheelDeltaY(e.deltaY, e.deltaMode, stage!.clientHeight || undefined);
      const k = e.ctrlKey ? PINCH_ZOOM_K : WHEEL_ZOOM_K;
      const factor = Math.min(WHEEL_MAX_STEP, Math.max(1 / WHEEL_MAX_STEP, Math.exp(-deltaY * k)));
      applyCamera(zoomAtPoint(cur.camera, cx, cy, cur.camera.scale * factor, cur.fitScale));
    }

    stage.addEventListener('pointerdown', onPointerDown);
    stage.addEventListener('pointermove', onPointerMove);
    stage.addEventListener('pointerup', endPointer);
    stage.addEventListener('pointercancel', endPointer);
    stage.addEventListener('click', onClickCapture, true);
    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      stage.removeEventListener('pointerdown', onPointerDown);
      stage.removeEventListener('pointermove', onPointerMove);
      stage.removeEventListener('pointerup', endPointer);
      stage.removeEventListener('pointercancel', endPointer);
      stage.removeEventListener('click', onClickCapture, true);
      stage.removeEventListener('wheel', onWheel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardSize[0], boardSize[1], interactive]);

  // `+`/`-`/`0` (BG part 2b): live whenever focus is anywhere in the player
  // (registered in the 'player' scope PlayerShell already pushes), per the
  // spec — unlike arrow-key panning below, which only applies with focus
  // actually inside the canvas stage.
  useShortcutScope('player', interactive);
  function zoomStep(factor: number) {
    const camera = cameraRef.current;
    const stage = stageRef.current;
    if (!stage || !camera) return;
    stopTween();
    trackingRef.current = false;
    applyCamera(zoomAtPoint(camera, stage.clientWidth / 2, stage.clientHeight / 2, camera.scale * factor, fitScaleRef.current));
  }
  useShortcut({ id: 'player:zoom-in', keys: '+', label: 'Zoom in', group: 'Player', when: 'player' }, (e) => {
    e.preventDefault();
    zoomStep(ZOOM_STEP);
  });
  useShortcut({ id: 'player:zoom-in-eq', keys: '=', label: 'Zoom in', group: 'Player', when: 'player', hidden: true }, (e) => {
    e.preventDefault();
    zoomStep(ZOOM_STEP);
  });
  useShortcut({ id: 'player:zoom-out', keys: '-', label: 'Zoom out', group: 'Player', when: 'player' }, (e) => {
    e.preventDefault();
    zoomStep(1 / ZOOM_STEP);
  });
  useShortcut({ id: 'player:zoom-fit', keys: '0', label: 'Fit diagram', group: 'Player', when: 'player' }, (e) => {
    e.preventDefault();
    fitActive();
  });

  const PAN_STEP_PX = 40;

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    // Arrow-key pan (BG part 2b): only while focus is inside this stage
    // (this handler only ever fires for a bubbling keydown from a focused
    // descendant) — deliberately not a global 'player'-scope shortcut like
    // `+`/`-`/`0` above, which would fight a node's own roving focus/typing.
    const cur = cameraRef.current;
    if (cur && (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      event.preventDefault();
      stopTween();
      trackingRef.current = false;
      const dx = event.key === 'ArrowLeft' ? PAN_STEP_PX : event.key === 'ArrowRight' ? -PAN_STEP_PX : 0;
      const dy = event.key === 'ArrowUp' ? PAN_STEP_PX : event.key === 'ArrowDown' ? -PAN_STEP_PX : 0;
      applyCamera(panBy(cur, dx, dy));
    }
  }

  const canZoomIn = readout.percent < Math.round(4 * 100) - 1;
  const canZoomOut = readout.percent > Math.round(Math.min(readout.fitScale, 0.25) * 100) + 1;

  const zoomControls = () => (
    <ZoomControls
      percent={readout.percent}
      canZoomIn={canZoomIn}
      canZoomOut={canZoomOut}
      onZoomIn={() => zoomStep(ZOOM_STEP)}
      onZoomOut={() => zoomStep(1 / ZOOM_STEP)}
      onFit={fitActive}
    />
  );

  return (
    <div className={['player-board-root', className].filter(Boolean).join(' ')}>
      <div
        ref={stageRef}
        className={interactive ? 'player-board-stage' : 'player-board-stage is-static'}
        data-board-shape={shapeName}
        onKeyDown={interactive ? handleKeyDown : undefined}
      >
        {children}
      </div>
      {interactive && zoomControls()}
    </div>
  );
}
