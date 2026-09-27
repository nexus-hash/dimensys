import type { CSSProperties } from 'react';
import { StaticBlueprint } from './StaticBlueprint';
import type { ColorByMode, HealthLookup } from './StaticBlueprint';
import { DrillStage } from './DrillStage';
import { collectDrillLevels, drillKey, subsystemLabelsById } from './drill';
import type { Board } from '../types';

export interface DrilldownBlueprintProps {
  /** The top-level board — `ViewData.board`. */
  board: Board;
  boardId: string;
  /** The diagram's own title: the root breadcrumb, and that level's `aria-label`. */
  rootLabel: string;
  className?: string;
  style?: CSSProperties;
  mode?: ColorByMode;
  health?: HealthLookup;
}

/**
 * Subsystem drill-down (T3.4), built on the static blueprint (T3.2): every
 * level — the top board and every subsystem's own board, at any depth — is
 * pre-rendered server-side with `StaticBlueprint`, so the whole tree ships
 * as plain HTML/SVG with no client JS needed to draw it. `<DrillStage>` (the
 * one client piece) only toggles which pre-rendered level is visible and
 * drives the transition, breadcrumbs, focus and the aria-live announcement —
 * reusing the drawing code rather than duplicating it, and keeping the
 * island's own JS to the interaction layer.
 *
 * A subsystem's `inner` board is its own coordinate space (see `NodeView`
 * in `../types`), not a to-scale inset of the parent — which is exactly why
 * this renders it as its own separate level/level-sized `<StaticBlueprint>`
 * rather than trying to inline it at the parent's scale.
 */
export function DrilldownBlueprint({ board, boardId, rootLabel, className, style, mode, health }: DrilldownBlueprintProps) {
  const levels = [{ path: [] as string[], label: rootLabel, board }, ...collectDrillLevels(board)];
  const labelsById = subsystemLabelsById(board);

  return (
    <DrillStage rootLabel={rootLabel} labelsById={labelsById}>
      {levels.map((level) => {
        const key = drillKey(level.path);
        const levelBoardId = level.path.length ? `${boardId}-${level.path.join('-')}` : boardId;
        return (
          <div
            key={key || '$root'}
            data-drill-key={key}
            hidden={level.path.length > 0}
            tabIndex={-1}
            role="group"
            aria-label={level.path.length ? `${level.label} subsystem` : rootLabel}
            className="player-drill-level"
          >
            <StaticBlueprint
              board={level.board}
              boardId={levelBoardId}
              label={level.path.length ? level.label : rootLabel}
              className={className}
              style={style}
              mode={mode}
              health={health}
            />
          </div>
        );
      })}
    </DrillStage>
  );
}
