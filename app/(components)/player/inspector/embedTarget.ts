import 'server-only';

import { loadCatalog, loadPlayerDiagram } from '@/app/(server)/engine/publicData';
import type { Board } from '../types';

/** Everything the embed card shows about the diagram it links to. */
export interface EmbedTarget {
  id: string;
  /** Catalog title, or `null` when the id isn't in the catalog at all. */
  title: string | null;
  blurb: string | null;
  /** A published diagram with a board: the card links to it. Anything else is "coming soon". */
  ready: boolean;
  /** The target's board, for the card's small preview. Absent when it has none. */
  board?: Board;
}

/**
 * Resolves an embed's target at build time from the public catalog and the
 * target's own view data (both cached per render). Only a published entry
 * whose view has a board counts as ready: a planned one has a page, but
 * nothing to open yet.
 */
export async function loadEmbedTarget(id: string): Promise<EmbedTarget> {
  const catalog = await loadCatalog();
  const card = catalog.cards.find((c) => c.id === id);
  if (!card) return { id, title: null, blurb: null, ready: false };
  const view = card.lifecycle === 'published' ? await loadPlayerDiagram(id) : null;
  const board = view?.board;
  return { id, title: card.title, blurb: card.blurb, ready: board !== undefined, ...(board ? { board } : {}) };
}
