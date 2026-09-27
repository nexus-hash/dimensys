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
import { findActiveLevel, findBoardSvg, linkPath as findLinkPath } from './readBoard';
import { MAX_PARTICLES, ParticlePool, particleSpawnHz, particleTravelMs, pickParticleKind, progressForPileup } from './particleMath';
import type { HealthState } from '@/app/(components)/canvas';
import { isMotionReduced } from '@/app/(components)/motion/reducedMotion';

export interface InteractiveLayerProps {
  bootstrap: PlayerBootstrap;
  /** The player root element (`data-player-root`) — an ancestor of every drill level's SVG. */
  containerRef: RefObject<HTMLDivElement | null>;
}

interface LinkEntry {
  id: string;
  /** The link's target node id (`data-to`, from `Link.tsx`) — a link has no latency of its own; particle speed reads this node's. */
  toNodeId: string | undefined;
  group: SVGGElement;
  path: SVGPathElement;
  length: number;
  spawnAccMs: number;
}

export function InteractiveLayer({ bootstrap, containerRef }: InteractiveLayerProps) {
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

        const util = readMetric(idx.nodeCols, frame.metrics, id, UTILIZATION_CODE);
        const chipCode = NODE_TOOLTIP_CODES.find((c) => readMetric(idx.nodeCols, frame.metrics, id, c) !== undefined);
        const chipValue = chipCode ? readMetric(idx.nodeCols, frame.metrics, id, chipCode) : undefined;

        applyNodeHealth(el, {
          state,
          pulsing: state === 'critical',
          chipText: chipCode ? healthChipText(state, metricCodeLabel(chipCode), chipValue, metricCodeUnit(chipCode)) : undefined,
          meter:
            util !== undefined
              ? { kind: 'util', value: util, text: `${Math.round(util * 100)}%`, severity: meterSeverity(util) }
              : undefined,
        });
      }

      for (const [id, el] of linkEls) {
        const errRatio = readMetric(idx.linkCols, frame.metrics, id, LINK_ERROR_RATE_CODE) ?? 0;
        applyLinkHealth(el, { bad: errRatio >= 0.3 });
      }

      const sel = s.selection;
      for (const [id, el] of nodeEls) setSelected(el, sel?.kind === 'node' && sel.id === id);
      for (const [id, el] of linkEls) setSelected(el, sel?.kind === 'link' && sel.id === id);
    });

    // ---- particles / static reduced-motion flow ----
    const pool = new ParticlePool(MAX_PARTICLES);
    let links: LinkEntry[] = [];
    let ctx: CanvasRenderingContext2D | null = null;
    let rafId = 0;
    let lastTs = 0;
    let ro: ResizeObserver | null = null;
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
        if (length > 0) links.push({ id, toNodeId: group.dataset.to, group, path, length, spawnAccMs: 0 });
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
      canvas.style.left = `${rect.left - hostRect.left}px`;
      canvas.style.top = `${rect.top - hostRect.top}px`;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      const vb = svg.viewBox.baseVal;
      const scaleX = vb.width > 0 ? canvas.width / vb.width : dpr;
      const scaleY = vb.height > 0 ? canvas.height / vb.height : dpr;
      ctx = canvas.getContext('2d');
      ctx?.setTransform(scaleX, 0, 0, scaleY, -vb.x * scaleX, -vb.y * scaleY);
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
        const pt = link.path.getPointAtLength(Math.min(1, Math.max(0, t)) * link.length);
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

    ro = new ResizeObserver(() => {
      sizeCanvas();
    });
    const canvasEl = canvasRef.current;
    if (canvasEl) ro.observe(canvasEl.parentElement ?? canvasEl);

    let prevDrill = store.getState().drill;
    const unsubDrill = store.subscribe(() => {
      const d = store.getState().drill;
      if (d !== prevDrill) {
        prevDrill = d;
        rebuildLinks();
        sizeCanvas();
      }
    });

    const onVisibility = () => {
      // The rAF loop itself checks `document.hidden` every tick; nothing else to do here,
      // but returning from a long hidden spell should resize once in case the viewport changed.
      if (!document.hidden) sizeCanvas();
    };
    document.addEventListener('visibilitychange', onVisibility);

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
        const label = linkGroup.querySelector('.cv-link-label text')?.textContent;
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

    container.addEventListener('pointerover', onPointerOver);
    container.addEventListener('pointerout', onPointerOut);
    container.addEventListener('focusin', onFocusIn);
    container.addEventListener('focusout', onFocusOut);
    container.addEventListener('click', onClick);
    container.addEventListener('keydown', onKeyDown);

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
      <div ref={tooltipRef} className="player-tooltip" role="tooltip" hidden />
    </>
  );
}

