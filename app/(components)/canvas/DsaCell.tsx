import { HealthGlyph } from './HealthGlyph';
import type { DsaCellState } from './types';

const CELL_SIZE = 48;

/**
 * A DSA array cell: 48×48, mono value, state ring/fill/badge.
 * `active` = ink ring, `compare` = flow-blue ring, `visited` = muted fill,
 * `done` = ✓ badge, `error` = critical ring + ✕.
 */
export function DsaCell({
  id,
  value,
  state = 'default',
  x = 0,
  y = 0,
  label,
}: {
  id: string;
  value: string | number;
  state?: DsaCellState;
  x?: number;
  y?: number;
  /** Accessible name override, e.g. "index 3". Defaults to "cell, value <value>". */
  label?: string;
}) {
  const stateWord =
    state === 'default'
      ? ''
      : state === 'done'
        ? ', done'
        : state === 'error'
          ? ', error'
          : `, ${state}`;

  return (
    <g
      className={`cv-cell cv-cell-${state}`}
      transform={`translate(${x - CELL_SIZE / 2}, ${y - CELL_SIZE / 2})`}
      data-cell-id={id}
      role="img"
      aria-label={`${label ?? `cell, value ${value}`}${stateWord}`}
    >
      <rect width={CELL_SIZE} height={CELL_SIZE} rx={8} strokeWidth={1} />
      <text x={CELL_SIZE / 2} y={CELL_SIZE / 2 + 5} textAnchor="middle">
        {value}
      </text>
      {state === 'done' && (
        <g transform={`translate(${CELL_SIZE - 16}, -8)`}>
          <HealthGlyph state="ok" size={16} />
        </g>
      )}
      {state === 'error' && (
        <g transform={`translate(${CELL_SIZE - 16}, -8)`}>
          <HealthGlyph state="critical" size={16} />
        </g>
      )}
    </g>
  );
}
