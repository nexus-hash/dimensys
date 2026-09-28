/**
 * Break It's cache failures: the pure half. Every cache or CDN that serves
 * reads comes with the same six failures (stampede, hot key, avalanche,
 * penetration, hot shard, eviction storm) and, for each, the fixes that
 * address it — all in the diagram data (`KitView.packs`), none written here.
 * This module answers which caches offer them, which failure is current
 * (from the action log), and which fixes that brings into the Fix it panel.
 */
import type { KitView, PackBreakView, PackView, UserAction } from '../types';
import type { TargetCatalog, TargetNode } from './tools';

/** The toolbox entry that opens the cache failures. Not a worker tool itself: each failure is sent with its own verb. */
export const CACHE_TOOL = {
  label: 'Cache',
  chip: 'Cache',
  combo: 'c',
  keyLabel: 'C',
  ariaKey: 'C',
  hint: 'Cache failures: stampede, hot key, avalanche and more',
} as const;

export function packsOf(kit: KitView | undefined): readonly PackView[] {
  return kit?.packs ?? [];
}

export function packFor(kit: KitView | undefined, nodeId: string | null | undefined): PackView | undefined {
  return nodeId ? packsOf(kit).find((p) => p.el === nodeId) : undefined;
}

export function findBreak(kit: KitView | undefined, breakId: string | null | undefined): { pack: PackView; brk: PackBreakView } | undefined {
  if (!breakId) return undefined;
  for (const pack of packsOf(kit)) {
    const brk = pack.breaks.find((b) => b.id === breakId);
    if (brk) return { pack, brk };
  }
  return undefined;
}

/** Caches and CDNs that offer the failures, as drawn (unbreakable ones left out), in board order. */
export function packTargets(kit: KitView | undefined, catalog: TargetCatalog): TargetNode[] {
  const els = new Set(packsOf(kit).map((p) => p.el));
  return catalog.nodes.filter((n) => {
    if (!els.has(n.id)) return false;
    const lock = kit?.locks.find(([id]) => id === n.id);
    return !lock || lock[1].length > 0;
  });
}

/** The action a failure is sent as: `[tool, target]`. */
export function breakAction(pack: PackView, brk: PackBreakView): [tool: 'flush' | 'fault', target: string] {
  return brk.verb === 'flush' ? ['flush', pack.el] : ['fault', brk.id];
}

export interface ActiveBreak {
  pack: PackView;
  brk: PackBreakView;
  /** Index of the action that caused it. */
  index: number;
}

/**
 * The failures in effect, oldest first. A fault stays in effect until the run
 * is reset or the entry undone (it changes how the cache behaves); a flush is
 * the current failure of its cache until another failure is applied to it
 * (the cache refills on its own, so it's never "undone").
 */
export function activeBreaks(actions: readonly UserAction[], kit: KitView | undefined): ActiveBreak[] {
  if (!kit?.packs?.length) return [];
  const out: ActiveBreak[] = [];
  const lastFlush = new Map<string, ActiveBreak>();
  actions.forEach(([, tool, target], index) => {
    if (tool === 'fault') {
      const hit = findBreak(kit, target);
      if (!hit) return;
      const prior = out.findIndex((a) => a.brk.id === hit.brk.id);
      if (prior >= 0) out.splice(prior, 1);
      out.push({ ...hit, index });
      lastFlush.delete(hit.pack.el);
    } else if (tool === 'flush') {
      const pack = packFor(kit, target);
      const brk = pack?.breaks.find((b) => b.verb === 'flush');
      if (pack && brk) lastFlush.set(pack.el, { pack, brk, index });
    }
  });
  return [...out, ...lastFlush.values()].sort((a, b) => a.index - b.index);
}

/** Labels and formats for the node metric codes a failure is shown by. */
export const SERIES_LABELS: Readonly<Record<string, { text: string; unit: 'ratio' | 'rps' }>> = {
  j: { text: 'Hit ratio', unit: 'ratio' },
  v: { text: 'Misses to the store', unit: 'rps' },
  w: { text: 'Served stale', unit: 'ratio' },
  x: { text: 'Rejected by the filter', unit: 'rps' },
  y: { text: 'Busiest shard', unit: 'ratio' },
  c: { text: 'Average shard', unit: 'ratio' },
};
