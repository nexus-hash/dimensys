import type { CSSProperties } from 'react';
import { StaticBlueprint } from './StaticBlueprint';
import type { ColorByMode, HealthLookup } from './StaticBlueprint';
import { BoardStage } from './BoardStage';
import { tallShape } from './tallShape';
import type { Board } from '../types';

export interface PlayerBlueprintProps {
  /** The board — `ViewData.board`. */
  board: Board;
  boardId: string;
  /** The diagram's own title: the board's `aria-label`. */
  title: string;
  className?: string;
  style?: CSSProperties;
  mode?: ColorByMode;
  health?: HealthLookup;
  /**
   * False renders a static preview: non-focusable nodes, and a stage with no
   * zoom controls, pan/zoom gestures or keyboard shortcuts. Default true.
   */
  interactive?: boolean;
}

/**
 * The player's board, built on the static blueprint (T3.2): the whole
 * diagram — every node, framed groups included — is pre-rendered
 * server-side with `StaticBlueprint`, so it ships as plain HTML/SVG with no
 * client JS needed to draw it. `<BoardStage>` (the one client piece) only
 * adds the pan/zoom camera on top, and swaps in the board's tall
 * arrangement on a narrow player (`shape.ts`).
 */
export function PlayerBlueprint({ board, boardId, title, className, style, mode, health, interactive = true }: PlayerBlueprintProps) {
  return (
    <BoardStage boardSize={board.size} tall={interactive ? tallShape(board) : null} interactive={interactive}>
      <div data-board-level="" tabIndex={-1} role="group" aria-label={title} className="player-board-level">
        <StaticBlueprint
          board={board}
          boardId={boardId}
          label={title}
          className={className}
          style={style}
          mode={mode}
          health={health}
          interactive={interactive}
        />
      </div>
    </BoardStage>
  );
}
