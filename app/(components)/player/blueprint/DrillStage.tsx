'use client';

import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import { usePlayerStore, usePlayerStoreApi } from '../store/PlayerStoreProvider';
import { enterSubsystem, exitSubsystem } from '../store/playerStore';
import { useShortcut, useShortcutScope } from '@/app/(components)/command';
import { drillKey } from './drill';
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
  ZOOM_STEP,
  DRAG_THRESHOLD_PX,
} from './camera';
import type { Camera } from './camera';
import { ZoomControls } from './ZoomControls';
import type { XY } from '../types';

export interface DrillStageProps {
  /** The top level's own label — used only for the live-region announcement. */
  rootLabel: string;
  /** Subsystem id → label, for every drillable subsystem anywhere in the diagram (any depth). */
  labelsById: Record<string, string>;
  /** Drill key → that level's own native pixel size (`boardSizesByDrillKey`), for the board-fit effect. */
  boardSizes: Record<string, XY>;
  className?: string;
  /**
   * False: a static preview (the home hero). The board still fits its box
   * and re-fits on resize, but there are no zoom controls, no pointer/wheel
   * pan or zoom (a wheel over it scrolls the page), no click/keyboard drill
   * and no player keyboard scope. Default true.
   */
  interactive?: boolean;
  /**
   * One `<div data-drill-key="…">` per level (root's key is `""`), each
   * wrapping that level's own `<StaticBlueprint>` — pre-rendered server-side
   * by `DrilldownBlueprint`. This component only toggles which one is
   * visible; it draws nothing itself.
   */
  children: ReactNode;
}

const EXIT_FALLBACK_MS = 700; // safety net if `animationend` never fires (animations disabled some other way, a hidden tab, …).

/** Distance and stage-space midpoint between two tracked pointers (pinch). */
function pointerGeometry(a: XY, b: XY): { dist: number; mid: XY } {
  const dist = Math.hypot(a[0] - b[0], a[1] - b[1]);
  const mid: XY = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  return { dist, mid };
}

/**
 * The player's subsystem drill-down (T3.4) and pan/zoom camera (BG part 2b):
 * shows exactly one pre-rendered level at a time, drives the enter/exit
 * transition, keeps focus and an aria-live announcement in step, and owns
 * that level's own camera (translate + scale, applied as one CSS transform
 * to the level's board element — see `camera.ts`).
 *
 * This measures only its own box (`stageRef`, a `ResizeObserver` on it) —
 * never the HUD strip, timeline dock, rail or inspector. Those bands are
 * laid out in CSS (`.player-canvas-area`'s flex column / `.player-body`'s
 * grid columns in `globals.css`); however the owner rearranges that chrome
 * later, this component and `camera.ts` don't need to change, because they
 * only ever ask *this* element for its own `clientWidth`/`clientHeight`.
 *
 * Camera state is plain refs, not the shared store: chrome-only (never part
 * of a share link, never synced across tabs), keyed by drill key so each
 * level remembers its own camera independently — entering a subsystem
 * starts that level at its own fit; going back finds the parent's entry
 * still in the map, camera untouched. `tracking` (per level) is true until
 * the user pans or zooms that level; while true, every resize (window,
 * rail/inspector toggle, phone sheet snap) re-fits it, same as the old
 * board-fit effect this replaces. Once false, the camera holds until the
 * user hits Fit (`0`, or the zoom cluster's Fit button), which re-fits and
 * flips `tracking` back to true.
 */
export function DrillStage({ rootLabel, labelsById, boardSizes, className, interactive = true, children }: DrillStageProps) {
  const drill = usePlayerStore((s) => s.drill);
  const store = usePlayerStoreApi();
  const stageRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef<HTMLDivElement>(null);
  const prevDrillRef = useRef<readonly string[]>([]);
  // The element that triggered entry into each subsystem id, so exiting can
  // return focus to it (a breadcrumb click has no such element — it falls
  // back to the level's own group in that case).
  const triggerRef = useRef<Map<string, HTMLElement>>(new Map());
  // Set right before an ascending `setState` (Escape / a breadcrumb click) so
  // the effect below — which is what actually un-hides the target level —
  // can focus the *specific* trigger element once that level is ready,
  // instead of racing it with a separately-scheduled callback.
  const pendingFocusIdRef = useRef<string | undefined>(undefined);
  // A per-level generation counter. A level can flip enter→leave→enter
  // faster than its *previous* phase's callbacks (the `animationend`
  // listener, and the `EXIT_FALLBACK_MS` timer that's a safety net for a
  // missed one) resolve — a real reduced-motion run hit exactly this: a fast
  // re-entry's leftover leave-settle fired mid-transition and forced
  // `hidden = true` back onto a level a newer transition had already made
  // visible again. Every phase captures the element's generation at the
  // moment it starts; its callbacks check it's still current before doing
  // anything, so a stale one — whichever of the two fires — is a no-op.
  const levelGenerationRef = useRef<Map<HTMLElement, number>>(new Map());

  const activeKey = drillKey(drill);
  const activeKeyRef = useRef(activeKey);
  activeKeyRef.current = activeKey;

  // ---- camera state (BG part 2b) ----
  const cameraRef = useRef<Map<string, Camera>>(new Map());
  const trackingRef = useRef<Map<string, boolean>>(new Map());
  const fitScaleRef = useRef<Map<string, number>>(new Map());
  const [readout, setReadout] = useState({ percent: 100, fitScale: 1 });
  const readoutFrameRef = useRef(0);

  function findBoardEl(key: string): HTMLElement | null {
    const stage = stageRef.current;
    if (!stage) return null;
    const levels = Array.from(stage.querySelectorAll<HTMLElement>('[data-drill-key]'));
    const levelEl = levels.find((el) => el.dataset.drillKey === key);
    return (levelEl?.firstElementChild as HTMLElement | null) ?? null;
  }

  function applyCamera(key: string, camera: Camera) {
    if (key !== activeKeyRef.current) {
      cameraRef.current.set(key, camera);
      return;
    }
    const boardEl = findBoardEl(key);
    const size = boardSizes[key];
    if (!boardEl || !size) {
      cameraRef.current.set(key, camera);
      return;
    }
    const stage = stageRef.current;
    const [nativeW, nativeH] = size;
    // Pan bounds (BG owner review): clamped against *this* stage's current
    // free box, not the fit-time box — a pan/zoom can't be produced without
    // the stage already being measurable, so `stage` is never null here in
    // practice, but the fallback (no clamp) is harmless if it ever were.
    camera = stage ? clampPan(camera, stage.clientWidth, stage.clientHeight, nativeW, nativeH) : camera;
    cameraRef.current.set(key, camera);
    boardEl.style.position = 'absolute';
    boardEl.style.left = '0';
    boardEl.style.top = '0';
    boardEl.style.maxWidth = 'none';
    boardEl.style.maxHeight = 'none';
    boardEl.style.width = `${nativeW}px`;
    boardEl.style.height = `${nativeH}px`;
    boardEl.style.transformOrigin = '0 0';
    boardEl.style.transform = cameraTransform(camera);
    stageRef.current?.dispatchEvent(new CustomEvent('playercamerachange', { bubbles: true }));
    if (readoutFrameRef.current) cancelAnimationFrame(readoutFrameRef.current);
    readoutFrameRef.current = requestAnimationFrame(() => {
      readoutFrameRef.current = 0;
      setReadout({ percent: Math.round(camera.scale * 100), fitScale: fitScaleRef.current.get(key) ?? 1 });
    });
  }

  /** (Re)fits `key`'s camera to the stage's current free box. Always applied when `force` (the Fit action); otherwise only while that level is still `tracking`. */
  function recompute(key: string, force = false) {
    const stage = stageRef.current;
    const size = boardSizes[key];
    if (!stage || !size) return;
    const [nativeW, nativeH] = size;
    const freeW = stage.clientWidth;
    const freeH = stage.clientHeight;
    if (freeW <= 0 || freeH <= 0) return;
    const fitScale = computeFitScale(freeW, freeH, nativeW, nativeH);
    fitScaleRef.current.set(key, fitScale);

    const tracking = trackingRef.current.get(key) ?? true;
    if (force || tracking) {
      trackingRef.current.set(key, true);
      applyCamera(key, fitCamera(freeW, freeH, nativeW, nativeH));
      return;
    }
    // Not tracking: keep the user's own camera, just re-clamp its scale in
    // case the fit (and so the zoom floor) shifted under a resize.
    const current = cameraRef.current.get(key);
    if (!current) return;
    const { min, max } = zoomRange(fitScale);
    const scale = Math.min(max, Math.max(min, current.scale));
    if (scale !== current.scale) applyCamera(key, { ...current, scale });
  }

  function fitActive() {
    recompute(activeKeyRef.current, true);
  }

  function beginPhase(el: HTMLElement): number {
    const gen = (levelGenerationRef.current.get(el) ?? 0) + 1;
    levelGenerationRef.current.set(el, gen);
    return gen;
  }
  function isCurrentPhase(el: HTMLElement, gen: number): boolean {
    return levelGenerationRef.current.get(el) === gen;
  }

  useEffect(() => {
    const stage = stageRef.current;
    const prevDrill = prevDrillRef.current;
    prevDrillRef.current = drill;
    const prevKey = drillKey(prevDrill);
    if (!stage || prevKey === activeKey) return;
    // Descending (entered deeper) auto-focuses the new level itself.
    // Ascending (Escape / a breadcrumb) focuses the specific trigger element
    // recorded for the subsystem just left, when one was recorded.
    const descending = drill.length > prevDrill.length;
    const pendingFocusId = pendingFocusIdRef.current;
    pendingFocusIdRef.current = undefined;

    const levels = Array.from(stage.querySelectorAll<HTMLElement>('[data-drill-key]'));
    const nextEl = levels.find((el) => el.dataset.drillKey === activeKey);
    const prevEl = levels.find((el) => el.dataset.drillKey === prevKey);

    if (nextEl) {
      const gen = beginPhase(nextEl);
      nextEl.hidden = false;
      nextEl.classList.add('is-entering');
      const clear = () => {
        if (!isCurrentPhase(nextEl, gen)) return;
        nextEl.classList.remove('is-entering');
      };
      nextEl.addEventListener('animationend', clear, { once: true });
      window.setTimeout(clear, EXIT_FALLBACK_MS);
      if (descending) {
        nextEl.focus();
      } else {
        ((pendingFocusId && triggerRef.current.get(pendingFocusId)) || nextEl).focus();
      }
    }
    if (prevEl && prevEl !== nextEl) {
      const gen = beginPhase(prevEl);
      prevEl.classList.add('is-leaving');
      const settle = () => {
        if (!isCurrentPhase(prevEl, gen)) return;
        prevEl.classList.remove('is-leaving');
        prevEl.hidden = true;
      };
      prevEl.addEventListener('animationend', settle, { once: true });
      window.setTimeout(settle, EXIT_FALLBACK_MS);
    }

    if (liveRef.current) {
      const label = drill.length === 0 ? rootLabel : (labelsById[drill[drill.length - 1]] ?? drill[drill.length - 1]);
      liveRef.current.textContent = drill.length === 0 ? `Back to ${label}` : descending ? `Entered ${label}` : `At ${label}`;
    }
    // The newly-active level starts at its own remembered camera (or a fresh fit, first visit).
    recompute(activeKey);
    // `drill`/`rootLabel`/`labelsById` are read for the announcement only; the
    // effect's real trigger is `activeKey` (derived from `drill`).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey]);

  // Board fit (T3.16, extended by BG part 2b): re-fits the active level on
  // every resize of the stage's own box — window resize, the rail
  // collapsing, the inspector opening/closing, the phone sheet's snap
  // height changing the canvas area's reserved bottom padding — for as long
  // as that level is still `tracking` (the user hasn't panned/zoomed it).
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    recompute(activeKeyRef.current);
    const ro = new ResizeObserver(() => recompute(activeKeyRef.current));
    ro.observe(stage);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardSizes]);

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

    function stageXY(clientX: number, clientY: number): XY {
      const rect = stage!.getBoundingClientRect();
      return [clientX - rect.left, clientY - rect.top];
    }

    function currentCamera(): { key: string; camera: Camera; fitScale: number } | null {
      const key = activeKeyRef.current;
      const camera = cameraRef.current.get(key);
      if (!camera) return null;
      return { key, camera, fitScale: fitScaleRef.current.get(key) ?? 1 };
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
      if (!currentCamera()) return;
      pointers.set(e.pointerId, [e.clientX, e.clientY]);
      if (pointers.size === 1) {
        // Capture is deliberately *not* taken here: a plain click (no
        // movement) must keep hitting its real target (a node, a subsystem
        // tab) for selection/drill-in to work — `setPointerCapture`
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
        trackingRef.current.set(cur.key, false);
        applyCamera(cur.key, next);
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
        trackingRef.current.set(cur.key, false);
        applyCamera(cur.key, panBy(cur.camera, dx, dy));
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
      const [cx, cy] = stageXY(e.clientX, e.clientY);
      trackingRef.current.set(cur.key, false);
      // GEOM: every wheel gesture zooms about the cursor — plain mouse
      // wheel, a bare trackpad two-finger scroll, and ctrl+wheel/a
      // synthesized trackpad pinch alike (a real pinch reports as
      // wheel+ctrlKey; there's nothing left for `ctrlKey` to distinguish
      // once both zoom the same way). Panning is drag/arrow-keys only now.
      const deltaY = normalizeWheelDeltaY(e.deltaY, e.deltaMode, stage!.clientHeight || undefined);
      const factor = Math.exp(-deltaY * WHEEL_ZOOM_K);
      applyCamera(cur.key, zoomAtPoint(cur.camera, cx, cy, cur.camera.scale * factor, cur.fitScale));
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
  }, [boardSizes, interactive]);

  // `+`/`-`/`0` (BG part 2b): live whenever focus is anywhere in the player
  // (registered in the 'player' scope PlayerShell already pushes), per the
  // spec — unlike arrow-key panning below, which only applies with focus
  // actually inside the canvas stage.
  useShortcutScope('player', interactive);
  function zoomStep(factor: number) {
    const cur = { key: activeKeyRef.current, camera: cameraRef.current.get(activeKeyRef.current) };
    const stage = stageRef.current;
    if (!stage || !cur.camera) return;
    const fitScale = fitScaleRef.current.get(cur.key) ?? 1;
    trackingRef.current.set(cur.key, false);
    applyCamera(cur.key, zoomAtPoint(cur.camera, stage.clientWidth / 2, stage.clientHeight / 2, cur.camera.scale * factor, fitScale));
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

  function enter(id: string, trigger: HTMLElement) {
    triggerRef.current.set(id, trigger);
    store.setState((s) => enterSubsystem(s, id));
  }

  function isSubsystemId(id: string | undefined): id is string {
    return !!id && id in labelsById;
  }

  function activateFromTarget(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) return false;
    const tab = target.closest<HTMLElement>('[data-subsystem-tab-id]');
    if (tab?.dataset.subsystemTabId) {
      enter(tab.dataset.subsystemTabId, tab);
      return true;
    }
    const node = target.closest<HTMLElement>('[data-node-id]');
    if (isSubsystemId(node?.dataset.nodeId)) {
      enter(node!.dataset.nodeId!, node!);
      return true;
    }
    return false;
  }

  function handleClick(event: MouseEvent<HTMLDivElement>) {
    activateFromTarget(event.target);
  }

  const PAN_STEP_PX = 40;

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      if (drill.length === 0) return;
      event.preventDefault();
      pendingFocusIdRef.current = drill[drill.length - 1];
      store.setState((s) => exitSubsystem(s));
      return;
    }
    // Arrow-key pan (BG part 2b): only while focus is inside this stage
    // (this handler only ever fires for a bubbling keydown from a focused
    // descendant) — deliberately not a global 'player'-scope shortcut like
    // `+`/`-`/`0` above, which would fight a node's own roving focus/typing.
    const cur = cameraRef.current.get(activeKeyRef.current);
    if (cur && (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      event.preventDefault();
      trackingRef.current.set(activeKeyRef.current, false);
      const dx = event.key === 'ArrowLeft' ? PAN_STEP_PX : event.key === 'ArrowRight' ? -PAN_STEP_PX : 0;
      const dy = event.key === 'ArrowUp' ? PAN_STEP_PX : event.key === 'ArrowDown' ? -PAN_STEP_PX : 0;
      applyCamera(activeKeyRef.current, panBy(cur, dx, dy));
      return;
    }
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if (activateFromTarget(event.target)) event.preventDefault();
  }

  const canZoomIn = readout.percent < Math.round(4 * 100) - 1;
  const canZoomOut = readout.percent > Math.round(Math.min(readout.fitScale, 0.25) * 100) + 1;

  return (
    <div className={['player-drill-root', className].filter(Boolean).join(' ')}>
      <div
        ref={stageRef}
        className={interactive ? 'player-drill-stage' : 'player-drill-stage is-static'}
        onClick={interactive ? handleClick : undefined}
        onKeyDown={interactive ? handleKeyDown : undefined}
      >
        {children}
      </div>
      {interactive && (
        <>
          <div ref={liveRef} aria-live="polite" role="status" className="sr-only" />
          <ZoomControls
            percent={readout.percent}
            canZoomIn={canZoomIn}
            canZoomOut={canZoomOut}
            onZoomIn={() => zoomStep(ZOOM_STEP)}
            onZoomOut={() => zoomStep(1 / ZOOM_STEP)}
            onFit={fitActive}
          />
        </>
      )}
    </div>
  );
}
