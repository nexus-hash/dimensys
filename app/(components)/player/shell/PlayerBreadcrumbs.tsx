'use client';

import { usePlayerStore, usePlayerStoreApi } from '../store/PlayerStoreProvider';
import { goToDrillDepth } from '../store/playerStore';
import { Breadcrumbs } from '../blueprint/Breadcrumbs';

export interface PlayerBreadcrumbsProps {
  rootLabel: string;
  /** Subsystem id → label, for every drillable subsystem in the diagram — `subsystemLabelsById(board)`. */
  labelsById: Record<string, string>;
}

/**
 * The top bar's breadcrumb slot (T3.16). `Breadcrumbs` itself stayed a pure,
 * presentational component (`blueprint/Breadcrumbs.tsx`) so both this shell
 * slot and `DrillStage`'s old in-canvas rendering could use it; only the
 * store wiring lives here now. See `DrillStage`'s docstring for what moving
 * the crumb trail out of the canvas costs it (focus-return precision on a
 * breadcrumb click, not on Escape).
 */
export function PlayerBreadcrumbs({ rootLabel, labelsById }: PlayerBreadcrumbsProps) {
  const drill = usePlayerStore((s) => s.drill);
  const store = usePlayerStoreApi();
  const toDepth = (depth: number) => store.setState((s) => goToDrillDepth(s, depth));
  // The diagram title is the page heading *and* the root crumb: plain text at
  // the root, a button back to the root once drilled in — never both at once.
  return (
    <>
      <h1 className="truncate text-[15px] font-medium text-ink-primary">
        {drill.length === 0 ? (
          rootLabel
        ) : (
          <button
            type="button"
            onClick={() => toDepth(0)}
            className="rounded px-1 -mx-1 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink-primary)]"
          >
            {rootLabel}
          </button>
        )}
      </h1>
      <Breadcrumbs rootLabel={rootLabel} drill={drill} labelsById={labelsById} onNavigate={toDepth} omitRoot />
    </>
  );
}
