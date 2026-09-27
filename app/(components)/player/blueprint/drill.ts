/**
 * Subsystem drill-path helpers (T3.4). Pure, server-safe (no React, no DOM):
 * used from the server component that pre-renders every level and from
 * tests alike.
 *
 * A subsystem's `inner` board is its own coordinate space, not a to-scale
 * inset of the parent (see `NodeView.inner` in `../types`) — so "drilling
 * in" means switching which level's board is on screen, not zooming the
 * shared canvas.
 */
import type { Board, NodeView, XY } from '../types';

export interface DrillLevel {
  /** Subsystem ids from the root, in order. `[]` never appears here (the root level is the caller's job to add). */
  path: string[];
  /** The subsystem's own label (`NodeView.text`). */
  label: string;
  board: Board;
}

/** Every drillable subsystem in `root`, depth-first, root-first, each with its full id path. */
export function collectDrillLevels(root: Board, path: string[] = []): DrillLevel[] {
  const levels: DrillLevel[] = [];
  for (const block of root.blocks) {
    if (block.form !== 'subSystem' || !block.inner) continue;
    const childPath = [...path, block.id];
    levels.push({ path: childPath, label: block.text, board: block.inner });
    levels.push(...collectDrillLevels(block.inner, childPath));
  }
  return levels;
}

/** `path.join('>')`; the empty path (root level) is the empty string. */
export function drillKey(path: readonly string[]): string {
  return path.join('>');
}

/**
 * Subsystem id → label, for every drillable subsystem anywhere in `root`
 * (any depth). Shared by `DrilldownBlueprint` (labelling each pre-rendered
 * level) and the shell's breadcrumb slot (T3.16), which needs the same map
 * without pulling in `collectDrillLevels`' path bookkeeping itself.
 */
export function subsystemLabelsById(root: Board): Record<string, string> {
  const labelsById: Record<string, string> = {};
  for (const level of collectDrillLevels(root)) {
    labelsById[level.path[level.path.length - 1]] = level.label;
  }
  return labelsById;
}

/**
 * Drill key → that level's own native pixel size (`Board.size`), for every
 * level including the root (key `""`). The board-fit effect (T3.16,
 * `DrillStage`) needs each level's own native size to compute its scale —
 * a subsystem's `inner` board is its own coordinate space, not scaled from
 * the parent, so this can't be derived from the root's size alone.
 */
export function boardSizesByDrillKey(root: Board): Record<string, XY> {
  const sizes: Record<string, XY> = { '': root.size };
  for (const level of collectDrillLevels(root)) {
    sizes[drillKey(level.path)] = level.board.size;
  }
  return sizes;
}

/**
 * Walks `path` down from `root`, stopping early (rather than throwing) if a
 * segment no longer resolves — a subsystem id from a stale store/URL that no
 * longer exists in this board. The returned chain is always non-empty (at
 * least the root).
 */
export function resolveDrillChain(root: Board, rootLabel: string, path: readonly string[]): DrillLevel[] {
  const chain: DrillLevel[] = [{ path: [], label: rootLabel, board: root }];
  let board = root;
  const resolved: string[] = [];
  for (const id of path) {
    const block: NodeView | undefined = board.blocks.find((b) => b.id === id);
    if (!block?.inner) break;
    resolved.push(id);
    board = block.inner;
    chain.push({ path: [...resolved], label: block.text, board });
  }
  return chain;
}
