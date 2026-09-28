/**
 * Inspector title resolution (T3.16). Pure and server-safe: the inspector
 * frame itself only needs the selected element's title (T3.6 fills the
 * body), so this stays a small lookup rather than pulling in the sheet /
 * detail-panel machinery that isn't built yet.
 */
import type { Board, LinkView, NodeView } from '../types';
import type { Selection } from '../store/playerStore';

export interface ElementIndex {
  nodes: Map<string, NodeView>;
  links: Map<string, LinkView>;
}

/** Indexes every node and link in `board` by id. */
export function buildElementIndex(board: Board): ElementIndex {
  return {
    nodes: new Map<string, NodeView>(board.blocks.map((b) => [b.id, b])),
    links: new Map<string, LinkView>(board.wires.map((w) => [w.id, w])),
  };
}

/** A node's label, a link's `"A → B"`, or the flow's own id — `null` when nothing is selected. */
export function selectionTitle(index: ElementIndex, selection: Selection): string | null {
  if (!selection) return null;
  if (selection.kind === 'node') return index.nodes.get(selection.id)?.text ?? selection.id;
  if (selection.kind === 'link') {
    const link = index.links.get(selection.id);
    if (!link) return selection.id;
    const a = index.nodes.get(link.a)?.text ?? link.a;
    const b = index.nodes.get(link.b)?.text ?? link.b;
    return `${a} → ${b}`;
  }
  return selection.id;
}

/** The mono `type · variant` subtitle under the inspector title (the header's detail sections are T3.6's). */
export function selectionKindLabel(index: ElementIndex, selection: Selection): string {
  if (!selection) return '';
  if (selection.kind === 'node') {
    const node = index.nodes.get(selection.id);
    return node ? `${node.form}${node.flavor ? ` · ${node.flavor}` : ''}` : 'node';
  }
  if (selection.kind === 'link') {
    const link = index.links.get(selection.id);
    return link ? `link · ${link.line}` : 'link';
  }
  return 'flow';
}
