/**
 * DOM readers over the server-rendered static blueprint (T3.3). The overlay
 * never re-derives node/link geometry from view data on the client — the
 * static SVG already carries it (`transform`/`d` attributes in the shared
 * viewBox), so these just read that SVG's own geometry back out, the same
 * way any consumer of an SVG would. That's different from *measuring*
 * layout (`getBoundingClientRect`, screen pixels): `getBBox`/`getPointAtLength`
 * report in the SVG's own user-unit coordinate space regardless of how the
 * viewport has scaled it, so they stay correct through resize, DPR changes
 * and drill-down level swaps with no re-measurement plumbing.
 */

/** The currently-visible drill level's container, or the stage/root itself when there's no drill-down (no `[data-drill-key]` levels at all). */
export function findActiveLevel(root: HTMLElement): HTMLElement {
  const levels = root.querySelectorAll<HTMLElement>('[data-drill-key]');
  for (const level of levels) {
    if (!level.hidden) return level;
  }
  return root;
}

/** The active level's own `<svg>` (the static blueprint's board element). */
export function findBoardSvg(level: HTMLElement): SVGSVGElement | null {
  return level.querySelector('svg');
}

/** Center of a node/subsystem group, in the SVG's own viewBox units. `null` if the id isn't present in this level. */
export function nodeCenter(svg: SVGSVGElement, nodeId: string): { x: number; y: number } | null {
  const el = svg.querySelector<SVGGraphicsElement>(`[data-node-id="${cssEscape(nodeId)}"]`);
  if (!el) return null;
  try {
    const box = el.getBBox();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  } catch {
    return null;
  }
}

/** The link's drawn path element (the visible stroke, not the wider invisible hit-path), for `getPointAtLength`. */
export function linkPath(svg: SVGSVGElement, linkId: string): SVGPathElement | null {
  const group = svg.querySelector<SVGGElement>(`[data-link-id="${cssEscape(linkId)}"]`);
  return group?.querySelector<SVGPathElement>('path.cv-link') ?? null;
}

function cssEscape(id: string): string {
  return typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(id) : id.replace(/["\\]/g, '\\$&');
}
