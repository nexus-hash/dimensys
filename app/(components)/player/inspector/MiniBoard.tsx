import type { Board, Box, XY } from '../types';

/** `M p0 C c1 c2 p1 …` for a curved route, `M p0 L p1 …` for a polyline. */
function routePath(route: XY[], curve?: true): string {
  if (route.length === 0) return '';
  const [first, ...rest] = route;
  let d = `M${first[0]} ${first[1]}`;
  if (curve) {
    for (let i = 0; i + 2 < rest.length; i += 3) {
      d += `C${rest[i][0]} ${rest[i][1]} ${rest[i + 1][0]} ${rest[i + 1][1]} ${rest[i + 2][0]} ${rest[i + 2][1]}`;
    }
  } else {
    for (const p of rest) d += `L${p[0]} ${p[1]}`;
  }
  return d;
}

function rectOf(box: Box) {
  const [cx, cy, w, h] = box;
  return { x: cx - w / 2, y: cy - h / 2, width: w, height: h };
}

/**
 * A read-only thumbnail of another diagram's board: frames, links and node
 * boxes only, no labels or glyphs — enough to recognise the shape of the
 * system at card size for a few hundred bytes, instead of the full
 * blueprint's markup. Decorative (the card's own text names the diagram), so
 * hidden from assistive tech.
 */
export function MiniBoard({ board, className }: { board: Board; className?: string }) {
  const [w, h] = board.size;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
      className={className}
      data-mini-board
    >
      {(board.frames ?? []).map((frame) => (
        <rect
          key={frame.id}
          {...rectOf(frame.box)}
          rx={10}
          fill="none"
          stroke="var(--color-line-strong)"
          strokeWidth={2}
          strokeDasharray="8 6"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {board.wires.map((wire) =>
        wire.route ? (
          <path
            key={wire.id}
            d={routePath(wire.route, wire.curve)}
            fill="none"
            stroke="var(--color-ink-muted)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ) : null,
      )}
      {board.blocks.map((block) =>
        block.box ? (
          <rect
            key={block.id}
            {...rectOf(block.box)}
            rx={12}
            fill="var(--color-surface-raised)"
            stroke="var(--color-ink-secondary)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ) : null,
      )}
    </svg>
  );
}
