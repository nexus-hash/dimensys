/**
 * Shared `<defs>` for one board instance: the 45° hatch
 * pattern used by `down` nodes, the link arrowheads (default / bad /
 * highlighted), and the LLD UML relation markers. IDs are namespaced
 * by `boardId` so two `<Board>`s on the same page never collide — `Board`
 * requires the caller to pass a unique `id` (see its docstring for why this
 * kit doesn't generate one itself).
 */
export function CanvasDefs({ boardId }: { boardId: string }) {
  return (
    <defs>
      <pattern
        id={hatchId(boardId)}
        width={6}
        height={6}
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <line x1={0} y1={0} x2={0} y2={6} style={{ stroke: 'var(--color-ink-muted)' }} strokeWidth={1.4} />
      </pattern>
      {(['default', 'bad', 'hl'] as const).map((kind) => (
        <marker
          key={kind}
          id={arrowId(boardId, kind)}
          viewBox="0 0 10 10"
          refX={9}
          refY={5}
          markerWidth={7}
          markerHeight={7}
          markerUnits="userSpaceOnUse"
          orient="auto-start-reverse"
        >
          <path
            d="M0,1L9,5L0,9z"
            style={{
              fill:
                kind === 'bad'
                  ? 'color-mix(in srgb, var(--color-signal-critical) 60%, transparent)'
                  : kind === 'hl'
                    ? 'var(--color-ink-primary)'
                    : 'var(--color-line-strong)',
            }}
          />
        </marker>
      ))}

      {/* LLD relations: `inherits` = hollow triangle
          (`implements` reuses it on a dashed line, drawn by the `Link`
          consumer), `composes` = filled diamond, `aggregates` = hollow
          diamond. `associates`/`depends` need no special marker (a plain or
          dashed line, per UML convention). */}
      <marker
        id={relationMarkerId(boardId, 'inherits')}
        viewBox="0 0 16 12"
        refX={15}
        refY={6}
        markerWidth={16}
        markerHeight={12}
        markerUnits="userSpaceOnUse"
        orient="auto-start-reverse"
      >
        <path d="M1,1 L15,6 L1,11 z" style={{ fill: 'var(--color-surface-raised)', stroke: 'var(--color-ink-primary)' }} strokeWidth={1.2} />
      </marker>
      <marker
        id={relationMarkerId(boardId, 'composes')}
        viewBox="0 0 18 10"
        refX={17}
        refY={5}
        markerWidth={18}
        markerHeight={10}
        markerUnits="userSpaceOnUse"
        orient="auto-start-reverse"
      >
        <path d="M1,5 L9,1 L17,5 L9,9 z" style={{ fill: 'var(--color-ink-primary)' }} />
      </marker>
      <marker
        id={relationMarkerId(boardId, 'aggregates')}
        viewBox="0 0 18 10"
        refX={17}
        refY={5}
        markerWidth={18}
        markerHeight={10}
        markerUnits="userSpaceOnUse"
        orient="auto-start-reverse"
      >
        <path d="M1,5 L9,1 L17,5 L9,9 z" style={{ fill: 'var(--color-surface-raised)', stroke: 'var(--color-ink-primary)' }} strokeWidth={1.2} />
      </marker>
    </defs>
  );
}

export function hatchId(boardId: string): string {
  return `${boardId}-hatch`;
}

export type ArrowKind = 'default' | 'bad' | 'hl';

export function arrowId(boardId: string, kind: ArrowKind = 'default'): string {
  return `${boardId}-arrow-${kind}`;
}

/** LLD relations with dedicated markers. `implements`/`associates`/
 * `depends` reuse `inherits`'s marker (dashed for `implements`) or none. */
export type RelationMarkerKind = 'inherits' | 'composes' | 'aggregates';

export function relationMarkerId(boardId: string, kind: RelationMarkerKind): string {
  return `${boardId}-rel-${kind}`;
}
