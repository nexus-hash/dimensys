import type { Board } from '../types';
import type { TargetCatalog } from './tools';

/** The board's names, kinds and link ends: all Break It needs to know about the drawn elements. Small and serialisable. */
export function buildTargetCatalog(board: Board): TargetCatalog {
  return {
    nodes: board.blocks.map((b) => ({ id: b.id, text: b.text, form: b.form })),
    links: board.wires.map((w) => ({ id: w.id, a: w.a, b: w.b })),
  };
}
