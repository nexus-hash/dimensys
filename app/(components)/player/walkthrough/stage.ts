/**
 * Applies a walkthrough step to the drawn board, in place. Like the live
 * health layer, this writes classes and attributes straight onto the
 * server-rendered SVG instead of re-rendering it: lit elements stay at full
 * opacity, the rest take `is-dimmed`; the step's path links get the ink
 * stroke and a `data-wt-flow` flag the particle loop reads; the focused
 * element gets a soft pulse and a numbered badge; markers become pinned
 * tags; and the camera is asked to frame the step's targets.
 *
 * Two-phase revert. Moving between steps first takes the old step's
 * decorations off (badge, markers, tones, path, fades) and un-dims only
 * what the next step lights, then applies the next step. Anything dimmed in
 * both steps stays dimmed throughout, so nothing flashes to full opacity on
 * the way. Switching to another walkthrough, or leaving, reverts the whole
 * board and the camera to the base view first, then applies the new state.
 *
 * Only elements this module dimmed or decorated are ever touched on the way
 * back (tracked with `data-wt-*` attributes), so other layers' classes on
 * the same elements survive.
 */
import type { Box } from '../types';
import type { WalkthroughStep } from './model';
import { XML_NS as SVG_NS } from '../overlay/xmlNs';

/** The camera request event `BoardStage` listens for. `box: null` returns to the view from before the walkthrough. */
export const CAMERA_FOCUS_EVENT = 'playercamerafocus';
export interface CameraFocusDetail {
  box: Box | null;
}

export interface StageState {
  walkthroughId: string;
  stepIndex: number;
  step: WalkthroughStep;
}

/** Pause between a full revert and applying the new walkthrough. */
export const SWITCH_REVERT_MS = 280;
/** Pause between taking a step's decorations off and applying the next one. */
export const STEP_REVERT_MS = 120;

export interface BoardElements {
  svg: SVGSVGElement;
  nodes: Map<string, SVGGElement>;
  links: Map<string, SVGGElement>;
  labels: Map<string, SVGGElement>;
  frames: Map<string, SVGGElement>;
}

/** The drawn board's nodes, links, link labels and frames by id (the main board, never an inspector mini-board). */
export function collectBoardElements(root: ParentNode): BoardElements | null {
  const svg = root.querySelector<SVGSVGElement>('[data-board-level] svg') ?? root.querySelector<SVGSVGElement>('svg');
  if (!svg) return null;
  const byAttr = (attr: string, key: string) => {
    const map = new Map<string, SVGGElement>();
    for (const el of svg.querySelectorAll<SVGGElement>(`[${attr}]`)) {
      const id = el.dataset[key];
      if (id) map.set(id, el);
    }
    return map;
  };
  return {
    svg,
    nodes: byAttr('data-node-id', 'nodeId'),
    links: byAttr('data-link-id', 'linkId'),
    labels: byAttr('data-link-label-for', 'linkLabelFor'),
    frames: byAttr('data-frame-id', 'frameId'),
  };
}

/** Ids of everything the step dims: every drawn element not lit. Empty when the step lights nothing (then nothing dims). */
function dimmedIds(els: BoardElements, step: WalkthroughStep): Set<string> {
  const out = new Set<string>();
  const lit = step.litNodes.length + step.litLinks.length + step.litFrames.length;
  if (lit === 0) return out;
  const nodes = new Set(step.litNodes);
  const links = new Set(step.litLinks);
  const frames = new Set(step.litFrames);
  for (const id of els.nodes.keys()) if (!nodes.has(id)) out.add(`n:${id}`);
  for (const id of els.links.keys()) if (!links.has(id)) out.add(`l:${id}`);
  for (const id of els.frames.keys()) if (!frames.has(id)) out.add(`f:${id}`);
  return out;
}

export class WalkthroughStage {
  private root: ParentNode;
  private els: BoardElements | null = null;
  private shown: StageState | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private reduced: () => boolean;

  constructor(root: ParentNode, opts: { reducedMotion: () => boolean }) {
    this.root = root;
    this.reduced = opts.reducedMotion;
  }

  private elements(): BoardElements | null {
    if (!this.els || !this.els.svg.isConnected) this.els = collectBoardElements(this.root);
    return this.els;
  }

  /** Shows `next` (or the base view for `null`), reverting the current state first. */
  show(next: StageState | null): void {
    const prev = this.shown;
    if (prev && next && prev.walkthroughId === next.walkthroughId && prev.stepIndex === next.stepIndex) return;
    if (!prev && !next) return;
    const els = this.elements();
    if (!els) return;
    this.cancel();

    const switching = !prev || !next || prev.walkthroughId !== next.walkthroughId;
    this.shown = next;

    // Phase 1: revert.
    this.clearDecorations(els);
    if (switching) {
      this.setDims(els, new Set());
      if (prev) this.requestCamera(null);
    } else {
      const keep = dimmedIds(els, next!.step);
      const current = this.currentDims(els);
      this.setDims(els, new Set([...current].filter((id) => keep.has(id))));
    }
    if (!next) return;

    // Phase 2: apply.
    const apply = () => {
      this.timer = null;
      if (this.shown !== next) return;
      this.applyStep(els, next);
    };
    const delay = this.reduced() ? 0 : switching && prev ? SWITCH_REVERT_MS : prev ? STEP_REVERT_MS : 0;
    if (delay === 0) apply();
    else this.timer = setTimeout(apply, delay);
  }

  /** Drops everything this stage put on the board, immediately and without touching the camera. */
  dispose(): void {
    this.cancel();
    const els = this.elements();
    if (els) {
      this.clearDecorations(els);
      this.setDims(els, new Set());
    }
    this.shown = null;
  }

  private cancel() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private applyStep(els: BoardElements, state: StageState) {
    const { step } = state;
    this.setDims(els, dimmedIds(els, step));

    for (const id of step.pathLinks) {
      const g = els.links.get(id);
      if (!g) continue;
      g.dataset.wtFlow = 'path';
      g.querySelector('.cv-link')?.classList.add('is-hl');
    }
    for (const id of step.still) {
      const g = els.links.get(id);
      if (g) g.dataset.wtFlow = 'still';
    }
    for (const [id, tone] of step.tones) {
      const g = els.nodes.get(id) ?? els.links.get(id) ?? els.frames.get(id);
      if (g) g.dataset.wtTone = tone;
    }
    for (const [id, alpha] of step.fades) {
      const g = els.nodes.get(id) ?? els.links.get(id) ?? els.frames.get(id);
      if (!g) continue;
      g.dataset.wtFade = '';
      g.style.opacity = String(alpha);
      if (els.links.has(id)) g.dataset.wtFlow = 'dim';
    }

    const layer = this.layer(els);
    if (step.focusId) {
      const g = els.nodes.get(step.focusId) ?? els.frames.get(step.focusId);
      g?.classList.add('is-wt-focus');
      if (step.focusAnchor) layer.appendChild(badge(step.focusAnchor, state.stepIndex + 1, els.frames.has(step.focusId)));
    }
    const stacked = new Map<string, number>();
    for (const [label, nodeId, box] of step.markers) {
      const n = stacked.get(nodeId) ?? 0;
      stacked.set(nodeId, n + 1);
      layer.appendChild(marker(label, box, n));
    }

    this.requestCamera(step.focusBox);
  }

  private currentDims(els: BoardElements): Set<string> {
    const out = new Set<string>();
    for (const [id, g] of els.nodes) if (g.hasAttribute('data-wt-dim')) out.add(`n:${id}`);
    for (const [id, g] of els.links) if (g.hasAttribute('data-wt-dim')) out.add(`l:${id}`);
    for (const [id, g] of els.frames) if (g.hasAttribute('data-wt-dim')) out.add(`f:${id}`);
    return out;
  }

  private setDims(els: BoardElements, dims: Set<string>) {
    const toggle = (g: Element, on: boolean) => {
      const mine = g.hasAttribute('data-wt-dim');
      if (on && !mine) {
        g.setAttribute('data-wt-dim', '');
        g.classList.add('is-dimmed');
      } else if (!on && mine) {
        g.removeAttribute('data-wt-dim');
        g.classList.remove('is-dimmed');
      }
    };
    for (const [id, g] of els.nodes) toggle(g, dims.has(`n:${id}`));
    for (const [id, g] of els.links) {
      const on = dims.has(`l:${id}`);
      toggle(g, on);
      const label = els.labels.get(id);
      if (label) toggle(label, on);
      if (on && !g.dataset.wtFlow) g.dataset.wtFlow = 'dim';
      else if (!on && g.dataset.wtFlow === 'dim' && !g.hasAttribute('data-wt-fade')) delete g.dataset.wtFlow;
    }
    for (const [id, g] of els.frames) toggle(g, dims.has(`f:${id}`));
  }

  private clearDecorations(els: BoardElements) {
    for (const g of els.svg.querySelectorAll<SVGGElement>('[data-wt-flow="path"]')) g.querySelector('.cv-link')?.classList.remove('is-hl');
    for (const g of els.svg.querySelectorAll<SVGGElement>('[data-wt-flow]')) {
      if (g.dataset.wtFlow !== 'dim' || g.hasAttribute('data-wt-fade')) delete g.dataset.wtFlow;
    }
    for (const g of els.svg.querySelectorAll<SVGGElement>('[data-wt-tone]')) delete g.dataset.wtTone;
    for (const g of els.svg.querySelectorAll<SVGGElement>('[data-wt-fade]')) {
      delete g.dataset.wtFade;
      g.style.removeProperty('opacity');
    }
    for (const g of els.svg.querySelectorAll('.is-wt-focus')) g.classList.remove('is-wt-focus');
    const layer = els.svg.querySelector('[data-wt-layer]');
    if (layer) layer.replaceChildren();
  }

  private layer(els: BoardElements): SVGGElement {
    let layer = els.svg.querySelector<SVGGElement>('[data-wt-layer]');
    if (!layer) {
      layer = document.createElementNS(SVG_NS, 'g');
      layer.setAttribute('data-wt-layer', '');
      layer.setAttribute('aria-hidden', 'true');
      layer.setAttribute('class', 'wt-layer');
      els.svg.appendChild(layer);
    }
    return layer;
  }

  private requestCamera(box: Box | null) {
    const stage = (this.root as Element).querySelector?.('.player-board-stage');
    stage?.dispatchEvent(new CustomEvent<CameraFocusDetail>(CAMERA_FOCUS_EVENT, { detail: { box } }));
  }
}

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>, parent?: Element): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  parent?.appendChild(node);
  return node;
}

/** The step number on the focused element's top-left corner (top-right for a frame, clear of its tab). */
function badge(box: Box, n: number, isFrame: boolean): SVGGElement {
  const [cx, cy, w, h] = box;
  const x = isFrame ? cx + w / 2 : cx - w / 2;
  const y = cy - h / 2;
  const g = el('g', { class: 'wt-badge', transform: `translate(${x}, ${y})`, 'data-wt-badge': n });
  el('circle', { r: 12 }, g);
  const t = el('text', { x: 0, y: 4.5, 'text-anchor': 'middle' }, g);
  t.textContent = String(n);
  return g;
}

/** A marker tag pinned above a node; markers sharing a node stack upward. */
function marker(label: string, box: Box, stackIndex: number): SVGGElement {
  const [cx, cy, , h] = box;
  const w = Math.max(24, label.length * 8 + 14);
  const g = el('g', { class: 'cv-marker wt-marker', transform: `translate(${cx}, ${cy - h / 2 - 18 - stackIndex * 26})`, 'data-wt-marker': label });
  el('rect', { x: -w / 2, y: -12, width: w, height: 24, rx: 12 }, g);
  const t = el('text', { x: 0, y: 4.5, 'text-anchor': 'middle' }, g);
  t.textContent = label;
  return g;
}
