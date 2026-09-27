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
  return (
    <Breadcrumbs
      rootLabel={rootLabel}
      drill={drill}
      labelsById={labelsById}
      onNavigate={(depth) => store.setState((s) => goToDrillDepth(s, depth))}
    />
  );
}
