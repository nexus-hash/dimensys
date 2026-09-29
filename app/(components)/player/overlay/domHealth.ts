/**
 * Applies live health/meter/selection state to the server-rendered static
 * blueprint's existing SVG elements, in place — no React re-render (T3.3
 * scope 2). The static render (`Node` in the canvas
 * kit) always opens on the healthy baseline, which means a fresh page has
 * none of the conditional health-glyph/chip markup in the DOM yet (that kit
 * only emits it when `health !== 'ok'`, since the player always opens
 * healthy). `ensureHealthSlots` lazily creates that markup once, the first
 * time a node actually needs it, and every later update only flips classes
 * and text content on elements that already exist — the same "small, cheap
 * per-frame DOM writes" contract the rest of this module keeps.
 */
import { linkLabelFor } from './readBoard';
import { XML_NS } from './xmlNs';
import { healthGlyphMarkup } from './health';
import type { HealthState, NodeMeterKind } from '@/app/(components)/canvas';

const HEALTH_STATES: readonly HealthState[] = ['ok', 'warn', 'critical', 'down', 'recovering'];

function setHealthClass(el: SVGElement, state: HealthState): void {
  for (const s of HEALTH_STATES) el.classList.toggle(`cv-health-${s}`, s !== 'ok' && s === state);
}

/** The node's own body rect (`.cv-body`) gives the exact draw size (`w`/`h`) — always present, unlike the group's overall `getBBox()`, which also spans the halo/focus rings that extend past it. */
function bodySize(nodeGroup: SVGGElement): { width: number; height: number } {
  const body = nodeGroup.querySelector<SVGRectElement>('.cv-body');
  return {
    width: Number(body?.getAttribute('width')) || 144,
    height: Number(body?.getAttribute('height')) || 72,
  };
}

function ensureGlyphHost(nodeGroup: SVGGElement): SVGGElement {
  let host = nodeGroup.querySelector<SVGGElement>(':scope > .cv-glyph');
  if (!host) {
    host = document.createElementNS(XML_NS, 'g') as SVGGElement;
    host.setAttribute('class', 'cv-glyph');
    // Same offset every node draws its glyph at server-side (top-right, 22px in from the right edge).
    const { width } = bodySize(nodeGroup);
    host.setAttribute('transform', `translate(${width - 22}, 8)`);
    nodeGroup.appendChild(host);
  }
  return host;
}

function ensureChipHost(nodeGroup: SVGGElement): { host: SVGGElement; rect: SVGRectElement; text: SVGTextElement } {
  let host = nodeGroup.querySelector<SVGGElement>(':scope > .cv-chip-host');
  if (host) {
    return {
      host,
      rect: host.querySelector('rect') as SVGRectElement,
      text: host.querySelector('text') as SVGTextElement,
    };
  }
  const { width, height } = bodySize(nodeGroup);
  host = document.createElementNS(XML_NS, 'g') as SVGGElement;
  host.setAttribute('class', 'cv-chip-host');
  host.setAttribute('transform', `translate(${width / 2}, ${height + 8})`);
  const inner = document.createElementNS(XML_NS, 'g');
  inner.setAttribute('class', 'cv-chip');
  const rect = document.createElementNS(XML_NS, 'rect') as SVGRectElement;
  rect.setAttribute('y', '0');
  rect.setAttribute('height', '20');
  rect.setAttribute('rx', '10');
  const text = document.createElementNS(XML_NS, 'text') as SVGTextElement;
  text.setAttribute('x', '0');
  text.setAttribute('y', '14');
  text.setAttribute('text-anchor', 'middle');
  inner.appendChild(rect);
  inner.appendChild(text);
  host.appendChild(inner);
  nodeGroup.appendChild(host);
  return { host, rect, text };
}

export interface NodeHealthUpdate {
  state: HealthState;
  pulsing?: boolean;
  chipText?: string;
  meter?: { kind: NodeMeterKind; value: number; text: string; severity?: 'ok' | 'warn' | 'critical' };
  /** Live replica count: keeps the sub-label's `×N` in step with scaling (by hand or automatic). */
  replicas?: number;
}

/**
 * The sub-label with its trailing `×N` set to `n` (`api · ×6` → `api · ×8`,
 * `lb · nginx` → `lb · nginx ×2`). One replica shows no count, as authored
 * labels do. The label as first drawn is kept on the element, so repeated
 * updates always start from it.
 */
export function withReplicas(label: string, n: number): string {
  const base = label.replace(/\s*×\d+$/, '');
  if (n > 1) return `${base} ×${n}`;
  return base.replace(/\s*·$/, '');
}

/** `nodeGroup` is the `.cv-node` element (`[data-node-id]`). */
export function applyNodeHealth(nodeGroup: SVGGElement, update: NodeHealthUpdate): void {
  setHealthClass(nodeGroup, update.state);
  nodeGroup.classList.toggle('is-pulsing', update.state === 'critical' && !!update.pulsing);

  if (update.state !== 'ok') {
    const glyphHost = ensureGlyphHost(nodeGroup);
    glyphHost.innerHTML = healthGlyphMarkup(update.state);
  }

  if (update.chipText && update.state !== 'ok') {
    const { rect, text } = ensureChipHost(nodeGroup);
    text.textContent = update.chipText;
    const w = Math.max(80, update.chipText.length * 7.3 + 14);
    rect.setAttribute('width', String(w));
    rect.setAttribute('x', String(-w / 2));
  }

  if (update.replicas !== undefined && Number.isFinite(update.replicas)) {
    const sub = nodeGroup.querySelector<SVGTextElement>('.cv-sub');
    if (sub) {
      const authored = (sub.dataset.authored ??= sub.textContent ?? '');
      const next = withReplicas(authored, Math.round(update.replicas));
      if (sub.textContent !== next) sub.textContent = next;
    }
  }

  const mfill = nodeGroup.querySelector<SVGRectElement>('.cv-mfill');
  const mtrack = nodeGroup.querySelector<SVGRectElement>('.cv-mtrack');
  const mtext = nodeGroup.querySelector<SVGTextElement>('.cv-mtext');
  if (update.meter && mfill && mtrack && mtext) {
    const trackWidth = Number(mtrack.getAttribute('width') ?? 0);
    mfill.setAttribute('width', String(trackWidth * Math.min(1, Math.max(0, update.meter.value))));
    mtext.textContent = update.meter.text;
    nodeGroup.classList.toggle('cv-meter-warn', update.meter.severity === 'warn');
    nodeGroup.classList.toggle('cv-meter-critical', update.meter.severity === 'critical');
  }
}

export function setSelected(el: SVGElement, selected: boolean): void {
  el.classList.toggle('is-selected', selected);
}

export function setDimmed(el: SVGElement, dimmed: boolean): void {
  el.classList.toggle('is-dimmed', dimmed);
}

export interface LinkHealthUpdate {
  bad?: boolean;
  highlighted?: boolean;
  selected?: boolean;
  dimmed?: boolean;
  labelHot?: boolean;
}

/** `linkGroup` is the `.cv-linkgroup` element (`[data-link-id]`). */
export function applyLinkHealth(linkGroup: SVGGElement, update: LinkHealthUpdate): void {
  const path = linkGroup.querySelector<SVGPathElement>('path.cv-link');
  path?.classList.toggle('is-bad', !!update.bad);
  path?.classList.toggle('is-hl', !!update.highlighted);
  linkGroup.classList.toggle('is-selected', !!update.selected);
  linkGroup.classList.toggle('is-dimmed', !!update.dimmed);
  // The pill lives in the level's own label pass (drawn after every link), not in this group.
  const id = linkGroup.dataset.linkId;
  const label = id ? linkLabelFor(linkGroup, id) : null;
  label?.classList.toggle('is-hot', !!update.labelHot);
  label?.classList.toggle('is-dimmed', !!update.dimmed);
}

/** Reduced motion's static substitute for canvas particles: a plain dashed stroke on links that currently carry traffic. */
export function setStaticFlow(linkGroup: SVGGElement, flowing: boolean): void {
  const path = linkGroup.querySelector<SVGPathElement>('path.cv-link');
  path?.classList.toggle('is-flow-static', flowing);
}
