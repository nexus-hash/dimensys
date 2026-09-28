/**
 * Traces one request path on the drawn board: its nodes, links and frames
 * stay lit, every other element takes the board's `is-dimmed` class, and the
 * path's links get the ink stroke (`is-hl`). Only what this module marked
 * (`data-trace-*`) is ever reverted, so other layers' classes on the same
 * elements survive.
 */
import { collectBoardElements } from '../walkthrough/stage';

export interface TraceTarget {
  nodes: readonly string[];
  links: readonly string[];
  frames: readonly string[];
}

const DIM = 'data-trace-dim';
const HL = 'data-trace-hl';

function setDim(el: Element, on: boolean) {
  const mine = el.hasAttribute(DIM);
  if (on && !mine && !el.classList.contains('is-dimmed')) {
    el.setAttribute(DIM, '');
    el.classList.add('is-dimmed');
  } else if (!on && mine) {
    el.removeAttribute(DIM);
    // A walkthrough that started meanwhile may have dimmed it too.
    if (!el.hasAttribute('data-wt-dim')) el.classList.remove('is-dimmed');
  }
}

function setHl(group: Element, on: boolean) {
  const line = group.querySelector('.cv-link');
  if (!line) return;
  const mine = group.hasAttribute(HL);
  if (on && !mine && !line.classList.contains('is-hl')) {
    group.setAttribute(HL, '');
    line.classList.add('is-hl');
  } else if (!on && mine) {
    group.removeAttribute(HL);
    if ((group as HTMLElement).dataset.wtFlow !== 'path') line.classList.remove('is-hl');
  }
}

/** Shows `target` traced on the board under `root`, or clears the trace for `null`. */
export function traceOnBoard(root: ParentNode, target: TraceTarget | null): void {
  const els = collectBoardElements(root);
  if (!els) return;
  const nodes = new Set(target?.nodes);
  const links = new Set(target?.links);
  const frames = new Set(target?.frames);
  for (const [id, g] of els.nodes) setDim(g, !!target && !nodes.has(id));
  for (const [id, g] of els.links) {
    const lit = links.has(id);
    setDim(g, !!target && !lit);
    const label = els.labels.get(id);
    if (label) setDim(label, !!target && !lit);
    setHl(g, !!target && lit);
  }
  for (const [id, g] of els.frames) setDim(g, !!target && !frames.has(id));
}
