/**
 * The board's two arrangements (wide and tall) as drawable geometry, and the
 * in-place swap between them.
 *
 * The board is drawn once, server-side, in its wide (left-to-right)
 * arrangement. A narrow screen gets the tall (top-to-bottom) arrangement by
 * rewriting that same SVG's geometry in place — node positions, link paths,
 * label pills, frame boxes and the viewBox — rather than drawing a second
 * board. Every other layer keeps working on the very same elements: live
 * health classes, selection, a walkthrough's dims and badges, Break It's cut
 * marks. Layers that cache geometry (the particle paths, the camera, a
 * walkthrough step's framing) listen for `BOARD_SHAPE_EVENT` and re-read it.
 *
 * `tallShape` (`tallShape.ts`) runs on the server (it needs the canvas
 * kit's text helpers for frame tabs) and hands the client a small,
 * precomputed shape: strings and numbers only. The wide shape never ships — the client reads it back
 * off the server-rendered SVG the first time it swaps (`captureShape`).
 */
import type { Box, XY } from '../types';

/** Fired (bubbling, from the board stage) after the drawn arrangement changed. */
export const BOARD_SHAPE_EVENT = 'playerboardshape';

export type ShapeName = 'wide' | 'tall';

export interface BoardShapeDetail {
  shape: ShapeName;
}

/** One arrangement, ready to write onto the drawn board. */
export interface DrawnShape {
  size: XY;
  /** Node id → the node group's top-left (its `translate`). */
  nodes: Record<string, XY>;
  /** Link id → path data, and its label pill's centre and size when it has one. */
  links: Record<string, { d: string; pill?: [number, number, number, number] }>;
  /** Frame id → top-left, size, and the tab's text and hit width at that width. */
  frames: Record<string, { x: number; y: number; w: number; h: number; tab: string; hit: number }>;
}

function esc(id: string): string {
  return typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(id) : id.replace(/["\\]/g, '\\$&');
}

function translateOf(el: Element): XY {
  const m = /translate\(\s*(-?[\d.eE+-]+)[ ,]+(-?[\d.eE+-]+)\s*\)/.exec(el.getAttribute('transform') ?? '');
  return m ? [parseFloat(m[1]), parseFloat(m[2])] : [0, 0];
}

function num(el: Element | null, attr: string): number {
  return parseFloat(el?.getAttribute(attr) ?? '0') || 0;
}

/** Reads the arrangement the board currently shows back off its SVG (the ids come from `like`). */
export function captureShape(svg: SVGSVGElement, like: DrawnShape): DrawnShape {
  const vb = svg.viewBox.baseVal;
  const nodes: DrawnShape['nodes'] = {};
  for (const id of Object.keys(like.nodes)) {
    const g = svg.querySelector(`[data-node-id="${esc(id)}"]`);
    if (g) nodes[id] = translateOf(g);
  }
  const links: DrawnShape['links'] = {};
  for (const id of Object.keys(like.links)) {
    const path = svg.querySelector(`[data-link-id="${esc(id)}"] path.cv-link`);
    if (!path) continue;
    const entry: DrawnShape['links'][string] = { d: path.getAttribute('d') ?? '' };
    const pill = svg.querySelector(`[data-link-label-for="${esc(id)}"]`);
    if (pill) {
      const [x, y] = translateOf(pill);
      const rect = pill.querySelector('rect');
      entry.pill = [x, y, num(rect, 'width'), num(rect, 'height')];
    }
    links[id] = entry;
  }
  const frames: DrawnShape['frames'] = {};
  for (const id of Object.keys(like.frames)) {
    const g = svg.querySelector(`[data-frame-id="${esc(id)}"]`);
    if (!g) continue;
    const [x, y] = translateOf(g);
    const body = g.querySelector(':scope > rect.cv-body');
    frames[id] = {
      x,
      y,
      w: num(body, 'width'),
      h: num(body, 'height'),
      tab: g.querySelector('text.cv-tab')?.textContent ?? '',
      hit: num(g.querySelector('rect.cv-tab-hit'), 'width'),
    };
  }
  return { size: [vb.width, vb.height], nodes, links, frames };
}

/** Writes `shape` onto the drawn board in place. `boardEl` is the SVG's sizing wrapper. */
export function applyShape(svg: SVGSVGElement, boardEl: HTMLElement | null, shape: DrawnShape): void {
  const [w, h] = shape.size;
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  if (boardEl) {
    boardEl.style.aspectRatio = `${w} / ${h}`;
    boardEl.style.maxWidth = `${w}px`;
    boardEl.style.maxHeight = `${h}px`;
  }
  for (const [id, [x, y]] of Object.entries(shape.nodes)) {
    svg.querySelector(`[data-node-id="${esc(id)}"]`)?.setAttribute('transform', `translate(${x}, ${y})`);
  }
  for (const [id, link] of Object.entries(shape.links)) {
    const g = svg.querySelector<SVGGElement>(`[data-link-id="${esc(id)}"]`);
    if (g) {
      for (const path of g.querySelectorAll('path.cv-link, path.cv-link-hit')) path.setAttribute('d', link.d);
      // A cut mark (Break It) sits at its path's midpoint: move it along.
      const mark = g.querySelector('.break-cut-mark');
      const path = g.querySelector<SVGPathElement>('path.cv-link');
      if (mark && path) {
        try {
          const p = path.getPointAtLength(path.getTotalLength() / 2);
          mark.setAttribute('transform', `translate(${p.x}, ${p.y})`);
        } catch {
          // Not laid out (a detached or hidden board): the next cut redraws it.
        }
      }
    }
    const pill = link.pill ? svg.querySelector(`[data-link-label-for="${esc(id)}"]`) : null;
    if (pill && link.pill) {
      const [x, y, pw, ph] = link.pill;
      pill.setAttribute('transform', `translate(${x}, ${y})`);
      const rect = pill.querySelector('rect');
      rect?.setAttribute('x', String(-pw / 2));
      rect?.setAttribute('y', String(-ph / 2));
      rect?.setAttribute('width', String(pw));
      rect?.setAttribute('height', String(ph));
    }
  }
  for (const [id, f] of Object.entries(shape.frames)) {
    const g = svg.querySelector(`[data-frame-id="${esc(id)}"]`);
    if (!g) continue;
    g.setAttribute('transform', `translate(${f.x}, ${f.y})`);
    const body = g.querySelector(':scope > rect.cv-body');
    body?.setAttribute('width', String(f.w));
    body?.setAttribute('height', String(f.h));
    g.querySelector('clipPath rect')?.setAttribute('width', String(Math.max(0, f.w - 4)));
    const tab = g.querySelector('text.cv-tab');
    if (tab && tab.textContent !== f.tab) tab.textContent = f.tab;
    g.querySelector('rect.cv-tab-hit')?.setAttribute('width', String(f.hit));
  }
}

/**
 * A drawn node's or frame's box (`[cx, cy, w, h]`, board units) as the board
 * shows it now — whichever arrangement that is. `null` when absent (or not
 * drawn as a card or frame).
 */
export function drawnBox(svg: ParentNode, id: string): Box | null {
  const g = svg.querySelector(`[data-node-id="${esc(id)}"], [data-frame-id="${esc(id)}"]`);
  if (!g) return null;
  const [x, y] = translateOf(g);
  const body = g.querySelector(':scope > .cv-inner > rect.cv-body, :scope > rect.cv-body');
  if (!body) return null;
  const w = num(body, 'width');
  const h = num(body, 'height');
  return [x + w / 2, y + h / 2, w, h];
}
