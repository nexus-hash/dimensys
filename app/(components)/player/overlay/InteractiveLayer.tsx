'use client';

/**
 * The player's interactive layer (T3.3): starts the worker lazily after
 * first paint, drives live node health and meters onto the existing static
 * SVG in place, draws request particles on a Canvas2D overlay aligned to
 * that SVG's viewBox, and wires up hover/click/keyboard selection.
 *
 * Deliberately not a `useState`-driven React tree past mount: the 10 Hz
 * frame stream and the 60 fps particle loop both read/write the DOM
 * directly (`domHealth.ts`, the canvas draw loop) so neither one causes a
 * React render. The only React state here is UI chrome that changes at
 * human speed — the tooltip's open/closed target.
 */
import { useEffect, useRef, type RefObject } from 'react';
import { usePlayerStoreApi } from '../store/PlayerStoreProvider';
import { WorkerBridge } from '../worker/bridge';
import { HEALTH_CODES } from '../worker/protocol';
import type { PlayerBootstrap, SimHealthToken } from '../types';
import {
  metricCodeLabel,
  metricCodeUnit,
  UTILIZATION_CODE,
  HIT_RATIO_CODE,
  QUEUE_DEPTH_CODE,
  NODE_UP_CODE,
  LINK_ERROR_RATE_CODE,
  LINK_RETRY_RPS_CODE,
  LINK_RPS_CODE,
  LINK_TOOLTIP_CODES,
  NODE_LATENCY_CODE,
  NODE_TOOLTIP_CODES,
} from '../metricKeys';
import { buildMetricIndex, readMetric, type MetricIndex } from './metricIndex';
import { classifyHealth, healthChipText, meterSeverity } from './health';
import { applyNodeHealth, applyLinkHealth, setSelected, setStaticFlow } from './domHealth';
import { findActiveLevel, findBoardSvg, linkLabelFor, linkPath as findLinkPath } from './readBoard';
import { MAX_PARTICLES, ParticlePool, particleSpawnHz, particleTravelMs, pickParticleKind, progressForPileup, pointOnSamples, samplePath } from './particleMath';
import type { HealthState, NodeMeterKind } from '@/app/(components)/canvas';
import { isMotionReduced } from '@/app/(components)/motion/reducedMotion';

export interface InteractiveLayerProps {
  bootstrap: PlayerBootstrap;
  /** The player root element (`data-player-root`) — an ancestor of every drill level's SVG. */
  containerRef: RefObject<HTMLDivElement | null>;
  /** False: health/meters and particles only — no hover tooltip, selection or keyboard input. Default true. */
  interactive?: boolean;
}

interface LinkEntry {
  id: string;
  /** The link's target node id (`data-to`, from `Link.tsx`) — a link has no latency of its own; particle speed reads this node's. */
  toNodeId: string | undefined;
  group: SVGGElement;
  path: SVGPathElement;
  length: number;
  /** The drawn path sampled by arc length (`samplePath`): particles ride exactly the curve the SVG draws. */
  samples: Float32Array;
  spawnAccMs: number;
}

/**
 * The meter row's live reading for one node (FID), from whichever raw metric
 * its `data-meter-kind` (set by `Node.tsx` from `meterKindForType`) calls
 * for: utilization, hit ratio, or (`queue`/`messageBus`) message backlog.
 * `undefined` when that node's meter kind has no reading published this
 * epoch — `applyNodeHealth` then leaves the server-rendered baseline in
 * place rather than clearing it.
 */
function meterReading(
  kind: NodeMeterKind,
  idx: MetricIndex,
  frame: { metrics: Float64Array },
  id: string,
  down: boolean,
): { kind: NodeMeterKind; value: number; text: string; severity: 'ok' | 'warn' | 'critical' } | undefined {
  if (kind === 'hit') {
    const hit = readMetric(idx.nodeCols, frame.metrics, id, HIT_RATIO_CODE);
    if (hit === undefined) return undefined;
    const v = down ? 0 : hit;
    return { kind, value: v, text: `hit ${Math.round(v * 100)}%`, severity: 'ok' };
  }
  if (kind === 'backlog') {
    const depth = readMetric(idx.nodeCols, frame.metrics, id, QUEUE_DEPTH_CODE);
    if (depth === undefined) return undefined;
    // No natural 0..1 ceiling for a message count (unlike a ratio): scaled
    // against a soft, generous reference depth just so the bar has
    // *something* to fill toward, same idea as a browser download bar with
    // no known total. The warn/critical thresholds below are absolute counts,
    // not tied to that scale.
    const REFERENCE_DEPTH = 500;
    const value = Math.min(1, depth / REFERENCE_DEPTH);
    const severity = depth >= 2000 ? 'critical' : depth >= 200 ? 'warn' : 'ok';
    return { kind, value, text: `${Math.round(depth)} msgs`, severity };
  }
  const util = readMetric(idx.nodeCols, frame.metrics, id, UTILIZATION_CODE);
  if (util === undefined) return undefined;
  return { kind: 'util', value: util, text: `${Math.round(util * 100)}%`, severity: meterSeverity(util) };
}

/**
 * A collapsed subsystem card's meter: the *highest* utilization among the
 * nodes inside it (not the mean — a subsystem is as close to saturation as
 * its hottest member, and a mean would hide one saturated node behind idle
 * ones). `undefined` when no child publishes utilization this epoch.
 */
function aggregateUtilization(
  childIds: readonly string[],
  idx: MetricIndex,
  frame: { metrics: Float64Array },
): { kind: NodeMeterKind; value: number; text: string; severity: 'ok' | 'warn' | 'critical' } | undefined {
  let max: number | undefined;
  for (const child of childIds) {
    const util = readMetric(idx.nodeCols, frame.metrics, child, UTILIZATION_CODE);
    if (util !== undefined && (max === undefined || util > max)) max = util;
  }
  if (max === undefined) return undefined;
  return { kind: 'util', value: max, text: `${Math.round(max * 100)}%`, severity: meterSeverity(max) };
}

export function InteractiveLayer({ bootstrap, containerRef, interactive = true }: InteractiveLayerProps) {
  const store = usePlayerStoreApi();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  // Worker lifecycle: created lazily after first paint, torn down on unmount.
  useEffect(() => {
    if (!bootstrap.runtimeUrl || !bootstrap.simUrl || !bootstrap.hasSimulation) return;
    let bridge: WorkerBridge | null = null;
    let cancelled = false;

    const start = () => {
      if (cancelled) return;
      try {
        bridge = new WorkerBridge({
          runtimeUrl: bootstrap.runtimeUrl!,
          simUrl: bootstrap.simUrl!,
          build: bootstrap.hash,
          mode: 'free',
          store,
        });
      } catch {
        // Construction failed synchronously (unsupported browser, blocked module worker, ...):
        // the static diagram stays usable. `sim.status` is already `unavailable` until a
        // bridge exists, so there's nothing further to flip here.
        return;
      }
      // Healthy baseline autoplay: play as soon as the worker reports ready.
      const unsub = store.subscribe(() => {
        const s = store.getState();
        if (s.sim.status === 'ready' && !s.sim.playing) {
          bridge?.play();
          unsub();
        } else if (s.sim.status === 'error') {
          unsub();
        }
      });
    };

    const ric: (cb: () => void) => number =
      typeof requestIdleCallback === 'function' ? requestIdleCallback : (cb) => window.setTimeout(cb, 1);
    const handle = ric(start);

    return () => {
      cancelled = true;
      bridge?.dispose();
      if (typeof cancelIdleCallback === 'function') cancelIdleCallback(handle as number);
      else window.clearTimeout(handle as number);
    };
    // Bootstrap + store identity are stable for the life of this mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live health/meters + particles + hover/click/keyboard.
  useEffect(() => {
    const containerCurrent = containerRef.current;
    if (!containerCurrent) return;
    // A plain re-typed alias: nested function declarations below close over `container`
    // long after this guard, and this fixes its type at `HTMLDivElement` for all of them
    // rather than relying on flow narrowing to reach through those closures.
    const container: HTMLDivElement = containerCurrent;

    const nodeEls = new Map<string, SVGGElement>();
    const linkEls = new Map<string, SVGGElement>();
    for (const el of container.querySelectorAll<SVGGElement>('[data-node-id]')) {
      const id = el.dataset.nodeId;
      if (id) nodeEls.set(id, el);
    }
    for (const el of container.querySelectorAll<SVGGElement>('[data-link-id]')) {
      const id = el.dataset.linkId;
      if (id) linkEls.set(id, el);
    }

    const prevHealth = new Map<string, HealthState>();
    let metricIndex: MetricIndex | null = null;

    // ---- health/meter updates, driven by the store (worker frames land here at 10 Hz) ----
    const unsubscribeHealth = store.subscribe(() => {
      const s = store.getState();
      const frame = s.sim.frame;
      if (!frame) return;
      if (!metricIndex || metricIndex.keysEpoch !== frame.keysEpoch) {
        metricIndex = buildMetricIndex(frame.keysEpoch, s.sim.metricKeys, s.sim.healthIds);
      }
      const idx = metricIndex;

      for (const [id, el] of nodeEls) {
        const row = idx.healthRow.get(id);
        const token = (row !== undefined ? HEALTH_CODES[frame.health[row]] : 'ok') as SimHealthToken;
        const up = readMetric(idx.nodeCols, frame.metrics, id, NODE_UP_CODE);
        const state = classifyHealth(prevHealth.get(id), token, up);
        prevHealth.set(id, state);

        const chipCode = NODE_TOOLTIP_CODES.find((c) => readMetric(idx.nodeCols, frame.metrics, id, c) !== undefined);
        const chipValue = chipCode ? readMetric(idx.nodeCols, frame.metrics, id, chipCode) : undefined;

        const meterKind = (el.dataset.meterKind as NodeMeterKind | undefined) ?? undefined;
        const childIds = el.dataset.childIds;
        const meter = childIds
          ? aggregateUtilization(childIds.split(' '), idx, frame)
          : meterKind
            ? meterReading(meterKind, idx, frame, id, up === 0)
            : undefined;

        applyNodeHealth(el, {
          state,
          pulsing: state === 'critical',
          chipText: chipCode ? healthChipText(state, metricCodeLabel(chipCode), chipValue, metricCodeUnit(chipCode)) : undefined,
          meter,
        });
      }

      for (const [id, el] of linkEls) {
        const errRatio = readMetric(idx.linkCols, frame.metrics, id, LINK_ERROR_RATE_CODE) ?? 0;
        applyLinkHealth(el, { bad: errRatio >= 0.3 });
      }

      if (interactive) {
        const sel = s.selection;
        for (const [id, el] of nodeEls) setSelected(el, sel?.kind === 'node' && sel.id === id);
        for (const [id, el] of linkEls) setSelected(el, sel?.kind === 'link' && sel.id === id);
      }
    });

    // ---- particles / static reduced-motion flow ----
    const pool = new ParticlePool(MAX_PARTICLES);
    let links: LinkEntry[] = [];
    let ctx: CanvasRenderingContext2D | null = null;
    let rafId = 0;
    let lastTs = 0;
    let ro: ResizeObserver | null = null;
    let observedSvg: Element | null = null;
    let reduced = isMotionReduced();

    function rebuildLinks() {
      pool.forEachActive((slot) => {
        pool.linkIndex[slot] = -1;
      });
      links = [];
      const level = findActiveLevel(container);
      const svg = findBoardSvg(level);
      if (!svg) return;
      for (const [id, group] of linkEls) {
        if (!svg.contains(group)) continue;
        const path = findLinkPath(svg, id);
        if (!path) continue;
        let length = 0;
        try {
          length = path.getTotalLength();
        } catch {
          length = 0;
        }
        if (length > 0) {
          const samples = samplePath((len) => path.getPointAtLength(len), length);
          links.push({ id, toNodeId: group.dataset.to, group, path, length, samples, spawnAccMs: 0 });
        }
      }
    }

    function sizeCanvas() {
      const canvas = canvasRef.current;
      const level = findActiveLevel(container);
      const svg = findBoardSvg(level);
      if (!canvas || !svg) return;
      // The canvas is `position: absolute` in `data-player-root` (the closest positioned
      // ancestor), which can hold more than just the diagram (breadcrumbs above the
      // board, rails beside it later) — so it's placed at the SVG's own offset within
      // that root, not assumed to fill the whole root box.
      const rect = svg.getBoundingClientRect();
      const hostRect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      // Clip to the canvas *region* (BG part 2b owner review), not the SVG's
      // own rect: the camera can pan/zoom the board past the region's own
      // edges (that's the point — see `DrillStage`'s pan clamp, which still
      // allows most of the board to leave the region on purpose), and
      // without this the overlay canvas — sized to the full, now-larger-
      // than-the-region SVG rect — drew particles that visually spilled
      // into the HUD strip/timeline dock above/below it. `.player-board-wrap`
      // is that region for the player shell; a standalone caller with no
      // such wrapper (the embed/hero variant) has no chrome to spill into,
      // so it falls back to the whole root box (`hostRect`).
      const regionEl = (svg.closest('.player-board-wrap') as HTMLElement | null) ?? container;
      const region = regionEl === container ? hostRect : regionEl.getBoundingClientRect();
      const clipLeft = Math.max(rect.left, region.left);
      const clipTop = Math.max(rect.top, region.top);
      const clipWidth = Math.max(0, Math.min(rect.right, region.right) - clipLeft);
      const clipHeight = Math.max(0, Math.min(rect.bottom, region.bottom) - clipTop);

      canvas.style.left = `${clipLeft - hostRect.left}px`;
      canvas.style.top = `${clipTop - hostRect.top}px`;
      canvas.style.width = `${clipWidth}px`;
      canvas.style.height = `${clipHeight}px`;
      canvas.width = Math.max(1, Math.round(clipWidth * dpr));
      canvas.height = Math.max(1, Math.round(clipHeight * dpr));

      const vb = svg.viewBox.baseVal;
      // Scale is still derived from the SVG's own full rect/viewBox (how many
      // device pixels one viewBox unit covers on screen) — clipping only
      // shrinks *which* of those device pixels this canvas actually owns,
      // it never changes the mapping itself.
      const scaleX = vb.width > 0 ? (rect.width * dpr) / vb.width : dpr;
      const scaleY = vb.height > 0 ? (rect.height * dpr) / vb.height : dpr;
      // The canvas's own origin moved from the SVG's top-left to the clip
      // rect's top-left (always <= 0, in device px): shift the transform by
      // exactly that so a viewBox point still lands at its true on-screen
      // position, just measured from the new (clipped) canvas origin.
      const originShiftX = (rect.left - clipLeft) * dpr;
      const originShiftY = (rect.top - clipTop) * dpr;
      ctx = canvas.getContext('2d');
      ctx?.setTransform(scaleX, 0, 0, scaleY, -vb.x * scaleX + originShiftX, -vb.y * scaleY + originShiftY);
    }

    function applyStaticFlow() {
      const s = store.getState();
      const frame = s.sim.frame;
      if (!frame || !metricIndex) return;
      for (const [id, el] of linkEls) {
        const rps = readMetric(metricIndex.linkCols, frame.metrics, id, LINK_RPS_CODE) ?? 0;
        setStaticFlow(el, rps > 0.1);
      }
    }

    const scratchPt = { x: 0, y: 0 };

    function drawFrame(ts: number) {
      rafId = requestAnimationFrame(drawFrame);
      const dt = lastTs ? ts - lastTs : 16;
      lastTs = ts;
      if (document.hidden || !ctx || !canvasRef.current) return;

      const s = store.getState();
      const frame = s.sim.frame;
      const canvas = canvasRef.current;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      if (!frame || !metricIndex || links.length === 0) return;
      const idx = metricIndex;

      for (let li = 0; li < links.length; li++) {
        const link = links[li];
        const rps = readMetric(idx.linkCols, frame.metrics, link.id, LINK_RPS_CODE) ?? 0;
        // A link has no latency of its own (see `metricKeys.ts`): particle speed
        // reads the *target node's* own latency instead, falling back to the
        // pool's own default only when that node doesn't publish it.
        const latency = link.toNodeId !== undefined ? readMetric(idx.nodeCols, frame.metrics, link.toNodeId, NODE_LATENCY_CODE) : undefined;
        // `f` is already a ratio (0..1); `o` is a rps that needs dividing by the link's own rps to become one.
        const errRatio = readMetric(idx.linkCols, frame.metrics, link.id, LINK_ERROR_RATE_CODE) ?? 0;
        const retryRps = readMetric(idx.linkCols, frame.metrics, link.id, LINK_RETRY_RPS_CODE);
        const retryRatio = rps > 0 && retryRps !== undefined ? Math.min(1, retryRps / rps) : 0;
        const cut = errRatio >= 0.85;

        const hz = particleSpawnHz(rps);
        if (hz > 0) {
          link.spawnAccMs += dt;
          const intervalMs = 1000 / hz;
          while (link.spawnAccMs >= intervalMs) {
            link.spawnAccMs -= intervalMs;
            const kind = pickParticleKind(Math.random(), errRatio, retryRatio);
            const kindCode = kind === 'ok' ? 0 : kind === 'retry' ? 1 : 2;
            pool.spawn(li, kindCode, particleTravelMs(latency ?? 0), cut);
          }
        }

      }

      pool.step(dt);

      let queueCounter = 0;
      pool.forEachActive((slot, li, progress, kindCode, piling) => {
        const link = links[li];
        if (!link) return;
        let t = progress;
        if (piling) {
          queueCounter += 1;
          t = progressForPileup(1, queueCounter, queueCounter + 1);
        }
        const pt = pointOnSamples(link.samples, t, scratchPt);
        drawParticle(ctx!, pt.x, pt.y, kindCode);
      });
    }

    function drawParticle(context: CanvasRenderingContext2D, x: number, y: number, kindCode: number) {
      // Radii are in the SVG's own viewBox units — `ctx`'s transform (set in `sizeCanvas`)
      // already maps those to device pixels, so no extra DPR/zoom scaling belongs here.
      const r = 2.4;
      context.save();
      if (kindCode === 2) {
        context.fillStyle = resolveColor('--color-signal-critical');
        context.globalAlpha = 0.9;
        context.beginPath();
        context.arc(x, y, r, 0, Math.PI * 2);
        context.fill();
      } else if (kindCode === 1) {
        context.strokeStyle = resolveColor('--color-signal-retry');
        context.globalAlpha = 0.85;
        context.lineWidth = 1.3;
        context.beginPath();
        context.arc(x, y, r + 1, 0, Math.PI * 2);
        context.stroke();
      } else {
        context.fillStyle = resolveColor('--color-signal-flow');
        context.globalAlpha = 0.7;
        context.beginPath();
        context.arc(x, y, r, 0, Math.PI * 2);
        context.fill();
      }
      context.restore();
    }

    let cachedColorEl: HTMLElement | null = null;
    const colorCache = new Map<string, string>();
    function resolveColor(token: string): string {
      const cached = colorCache.get(token);
      if (cached) return cached;
      if (!cachedColorEl) cachedColorEl = document.documentElement;
      // `getComputedStyle` always resolves a real custom property here (every token this
      // module reads is defined in `globals.css`); `gray` is only a defensive fallback for
      // a detached/pre-layout element, never a literal design color.
      const v = getComputedStyle(cachedColorEl).getPropertyValue(token).trim() || 'gray';
      colorCache.set(token, v);
      return v;
    }

    function startLoop() {
      stopLoop();
      if (reduced) return;
      rebuildLinks();
      sizeCanvas();
      lastTs = 0;
      rafId = requestAnimationFrame(drawFrame);
    }
    function stopLoop() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      const canvas = canvasRef.current;
      if (canvas) {
        const c = canvas.getContext('2d');
        c?.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    let cleanupReduced: (() => void) | null = null;
    if (reduced) cleanupReduced = store.subscribe(applyStaticFlow);
    startLoop();

    // Two things need watching, not one, for the canvas to always match the
    // active level's board box (T3.16 board-fit follow-up): the free area
    // itself (`.player-drill-stage`, stable across drill changes — its own
    // size changes whenever the rail collapses, the inspector opens/closes,
    // the phone sheet's snap changes, or the window resizes) *and* the
    // active board element (`DrillStage`'s fit effect writes an explicit
    // pixel width/height straight onto it, which is its own resize — and,
    // separately, a board already capped at its native size can *recenter*
    // within a still-growing free area with no size change of its own at
    // all, which a free-area-only observer would miss entirely since
    // `ResizeObserver` never fires for a position-only reflow).
    ro = new ResizeObserver(() => {
      sizeCanvas();
    });
    const stageEl = container.querySelector<HTMLElement>('.player-drill-stage');
    if (stageEl) ro.observe(stageEl);

    function observeActiveSvg() {
      const level = findActiveLevel(container);
      const svg = findBoardSvg(level);
      if (svg === observedSvg) return;
      if (observedSvg) ro?.unobserve(observedSvg);
      observedSvg = svg;
      if (svg) ro?.observe(svg);
    }
    observeActiveSvg();

    let prevDrill = store.getState().drill;
    const unsubDrill = store.subscribe(() => {
      const d = store.getState().drill;
      if (d !== prevDrill) {
        prevDrill = d;
        rebuildLinks();
        sizeCanvas();
        observeActiveSvg();
      }
    });

    const onVisibility = () => {
      // The rAF loop itself checks `document.hidden` every tick; nothing else to do here,
      // but returning from a long hidden spell should resize once in case the viewport changed.
      if (!document.hidden) sizeCanvas();
    };
    document.addEventListener('visibilitychange', onVisibility);

    // The pan/zoom camera (BG part 2b, `DrillStage`) moves/scales the active
    // level's board via a CSS `transform` — a translate/scale never fires
    // `ResizeObserver` (the content box itself doesn't change), so without
    // this the overlay canvas (and its particles) would drift out of step
    // with the board on every pan or zoom. `DrillStage` dispatches this
    // event (bubbling) on every camera update; `sizeCanvas` just re-reads
    // the board SVG's current (post-transform) `getBoundingClientRect()`,
    // which already reflects the camera regardless of how it got there.
    const onCameraChange = () => sizeCanvas();
    container.addEventListener('playercamerachange', onCameraChange);

    // ---- hover tooltip + click/keyboard selection ----
    function describeTarget(el: Element): { title: string; lines: string[] } | null {
      const nodeGroup = el.closest<SVGGElement>('[data-node-id]');
      const linkGroup = !nodeGroup ? el.closest<SVGGElement>('[data-link-id]') : null;
      const s = store.getState();
      const frame = s.sim.frame;

      if (nodeGroup) {
        const id = nodeGroup.dataset.nodeId!;
        const title = nodeGroup.querySelector('title')?.textContent ?? id;
        const lines: string[] = [];
        if (frame && metricIndex) {
          for (const code of NODE_TOOLTIP_CODES) {
            const v = readMetric(metricIndex.nodeCols, frame.metrics, id, code);
            if (v !== undefined) lines.push(`${metricCodeLabel(code)}: ${formatMetric(v, metricCodeUnit(code))}`);
            if (lines.length >= 3) break;
          }
        }
        return { title, lines };
      }
      if (linkGroup) {
        const id = linkGroup.dataset.linkId!;
        const label = linkLabelFor(linkGroup, id)?.querySelector('text')?.textContent;
        const title = label || id;
        const lines: string[] = [];
        if (frame && metricIndex) {
          for (const code of LINK_TOOLTIP_CODES) {
            const v = readMetric(metricIndex.linkCols, frame.metrics, id, code);
            if (v !== undefined) lines.push(`${metricCodeLabel(code)}: ${formatMetric(v, metricCodeUnit(code))}`);
            if (lines.length >= 3) break;
          }
        }
        return { title, lines };
      }
      return null;
    }

    function formatMetric(v: number, unit: string): string {
      const text = Number.isInteger(v) ? String(v) : v.toFixed(unit === 'ratio' ? 2 : 1);
      return unit && unit !== 'ratio' ? `${text} ${unit}` : text;
    }

    function showTooltip(anchor: Element, info: { title: string; lines: string[] }) {
      const tip = tooltipRef.current;
      if (!tip) return;
      tip.innerHTML = `<strong>${escapeHtml(info.title)}</strong>${info.lines.map((l) => `<div>${escapeHtml(l)}</div>`).join('')}`;
      const rect = anchor.getBoundingClientRect();
      const hostRect = container.getBoundingClientRect();
      tip.style.left = `${rect.left - hostRect.left + rect.width / 2}px`;
      tip.style.top = `${rect.top - hostRect.top}px`;
      tip.hidden = false;
    }
    function hideTooltip() {
      const tip = tooltipRef.current;
      if (tip) tip.hidden = true;
    }
    function escapeHtml(s: string): string {
      return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
    }

    let currentHoverTarget: Element | null = null;
    function onPointerOver(e: PointerEvent) {
      const target = e.target instanceof Element ? e.target.closest('[data-node-id], [data-link-id]') : null;
      if (!target || target === currentHoverTarget) return;
      currentHoverTarget = target;
      const info = describeTarget(target);
      if (info) showTooltip(target, info);
    }
    function onPointerOut(e: PointerEvent) {
      const related = e.relatedTarget instanceof Node ? e.relatedTarget : null;
      if (currentHoverTarget && (!related || !currentHoverTarget.contains(related))) {
        currentHoverTarget = null;
        hideTooltip();
      }
    }
    function onFocusIn(e: FocusEvent) {
      const target = e.target instanceof Element ? e.target.closest('[data-node-id]') : null;
      if (!target) return;
      const info = describeTarget(target);
      if (info) showTooltip(target, info);
    }
    function onFocusOut() {
      hideTooltip();
    }
    function selectFromTarget(target: Element): void {
      const nodeGroup = target.closest<HTMLElement>('[data-node-id]');
      if (nodeGroup?.dataset.nodeId) {
        store.setState({ selection: { kind: 'node', id: nodeGroup.dataset.nodeId } });
        return;
      }
      const linkGroup = target.closest<HTMLElement>('[data-link-id]');
      if (linkGroup?.dataset.linkId) {
        store.setState({ selection: { kind: 'link', id: linkGroup.dataset.linkId } });
      }
    }
    function onClick(e: MouseEvent) {
      if (e.target instanceof Element) selectFromTarget(e.target);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if (!(e.target instanceof Element)) return;
      const nodeGroup = e.target.closest('[data-node-id]');
      // Subsystem entry (handled by `DrillStage`) already calls `preventDefault`; a plain
      // leaf node has no such handler, so this is a no-op for anything `DrillStage` claimed.
      if (nodeGroup && !e.defaultPrevented) selectFromTarget(nodeGroup);
    }

    // A static preview (`interactive: false`) keeps the live health/meters and
    // particles above but takes no hover tooltip, selection or keyboard input.
    if (interactive) {
      container.addEventListener('pointerover', onPointerOver);
      container.addEventListener('pointerout', onPointerOut);
      container.addEventListener('focusin', onFocusIn);
      container.addEventListener('focusout', onFocusOut);
      container.addEventListener('click', onClick);
      container.addEventListener('keydown', onKeyDown);
    }

    const reducedMql = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const onReducedChange = () => {
      const next = isMotionReduced();
      if (next === reduced) return;
      reduced = next;
      startLoop();
    };
    reducedMql?.addEventListener?.('change', onReducedChange);

    return () => {
      unsubscribeHealth();
      unsubDrill();
      cleanupReduced?.();
      stopLoop();
      ro?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      container.removeEventListener('playercamerachange', onCameraChange);
      reducedMql?.removeEventListener?.('change', onReducedChange);
      container.removeEventListener('pointerover', onPointerOver);
      container.removeEventListener('pointerout', onPointerOut);
      container.removeEventListener('focusin', onFocusIn);
      container.removeEventListener('focusout', onFocusOut);
      container.removeEventListener('click', onClick);
      container.removeEventListener('keydown', onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="player-overlay-canvas" aria-hidden="true" />
      {/* Visual-only hover/focus hint, not wired to its target via `aria-describedby` —
          `aria-hidden` (T3.16) keeps it out of the accessibility tree regardless of the
          `hidden` toggle's own state, so it's never flagged as page content sitting
          outside every landmark (axe `region`) while the pointer happens to be over a
          node during a scan. */}
      {interactive && <div ref={tooltipRef} className="player-tooltip" role="tooltip" aria-hidden="true" hidden />}
    </>
  );
}

