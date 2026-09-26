import { NodeIcon } from './icons';
import { HealthGlyph } from './HealthGlyph';
import { hatchId } from './CanvasDefs';
import { NODE_HEIGHT, NODE_WIDTH } from './types';
import type { HealthState, HldNodeType, NodeMeter, NodeRole } from './types';

export type LeafNodeType = Exclude<HldNodeType, 'subSystem'>;

export interface NodeProps {
  /** The board this node is drawn on — namespaces the hatch pattern id. */
  boardId: string;
  id: string;
  type: LeafNodeType;
  /** Picks the icon/sub-style, e.g. `client: mobile|web`. Also shown in the mono sub-label. */
  variant?: string;
  label: string;
  /** Mono-sm sub-label under the label: `type · variant`, replica count, role. */
  sublabel?: string;
  role?: NodeRole;
  /** > 1 draws stacked "shadow cards" behind the body (§5.2). */
  replicas?: number;
  /** Utilization / hit-ratio / backlog / lag meter (§5.2). Omit for source nodes (`client`). */
  meter?: NodeMeter;
  health?: HealthState;
  /** Mono chip text shown below the node once health isn't `ok`, e.g. "p99 640 ms". */
  healthLabel?: string;
  /** Critical only: the ring opacity-pulses while the metric keeps getting worse (§5.3).
   * A static kit can't know "getting worse" on its own — callers in the interactive
   * layer (T3.3) pass this once they track the trend. */
  pulsing?: boolean;
  selected?: boolean;
  dimmed?: boolean;
  /** Center position, for placement inside a `<Board>`. Defaults to (0,0) so the
   * component also renders standalone (e.g. the dev gallery). */
  x?: number;
  y?: number;
  /** False renders a non-interactive, non-focusable node (`role="img"`). */
  interactive?: boolean;
}

const ROLE_LABEL: Record<NodeRole, string> = {
  primary: 'primary',
  replica: 'replica',
  leader: 'leader',
  follower: 'follower',
  active: 'active',
  standby: 'standby',
};

function healthSentence(health: HealthState, healthLabel?: string): string {
  switch (health) {
    case 'ok':
      return 'healthy';
    case 'down':
      return 'down';
    case 'recovering':
      return healthLabel ? `recovering, ${healthLabel}` : 'recovering';
    case 'critical':
      return healthLabel ? `critical: ${healthLabel}` : 'critical';
    case 'warn':
      return healthLabel ? `warning: ${healthLabel}` : 'warning';
    default:
      return 'healthy';
  }
}

/**
 * The HLD node (§5.2): 144×72, monochrome body, icon + label + mono
 * sub-label, an optional meter, an optional role pill, and the health ring +
 * glyph + text label (§5.3 — health is never color-only, §3.4 rule 2).
 * Hover/focus/selected/dimmed are §5.6 states.
 */
export function Node({
  boardId,
  id,
  type,
  variant,
  label,
  sublabel,
  role,
  replicas = 1,
  meter,
  health = 'ok',
  healthLabel,
  pulsing = false,
  selected = false,
  dimmed = false,
  x = 0,
  y = 0,
  interactive = true,
}: NodeProps) {
  const w = NODE_WIDTH;
  const h = NODE_HEIGHT;
  const showGlyphSlot = health !== 'ok';
  const showRolePill = !showGlyphSlot && !!role;
  const ariaLabel = `${label}, ${type}${variant ? ` · ${variant}` : ''}, ${healthSentence(health, healthLabel)}`;
  // Label/sub-label are clipped to the space left of the health glyph / role
  // pill so a long label never overlaps them (§5.2: "truncated with a full
  // tooltip" — the tooltip itself is an interactive concern, T3.3).
  const textClipId = `${boardId}-${id}-text-clip`;
  const textAreaWidth = w - 38 - (showRolePill ? 60 : 12);

  return (
    <g
      className={
        'cv-node' +
        (health !== 'ok' ? ` cv-health-${health}` : '') +
        (health === 'critical' && pulsing ? ' is-pulsing' : '') +
        (selected ? ' is-selected' : '') +
        (dimmed ? ' is-dimmed' : '')
      }
      transform={`translate(${x - w / 2}, ${y - h / 2})`}
      data-node-id={id}
      tabIndex={interactive ? 0 : -1}
      role={interactive ? 'button' : 'img'}
      aria-label={ariaLabel}
    >
      <rect className="cv-halo" x={-5} y={-5} width={w + 10} height={h + 10} rx={15} />
      <rect className="cv-focus" x={-8} y={-8} width={w + 16} height={h + 16} rx={18} />

      <g className="cv-inner">
        {replicas > 1 && (
          <>
            <rect className="cv-stack" x={6} y={6} width={w} height={h} rx={10} />
            <rect className="cv-stack" x={3} y={3} width={w} height={h} rx={10} />
          </>
        )}
        <rect className="cv-body" width={w} height={h} rx={10} />
        <g className="cv-icon" transform="translate(12, 12) scale(0.83)">
          <NodeIcon type={type} variant={variant} />
        </g>
        <clipPath id={textClipId}>
          <rect x={38} y={0} width={Math.max(0, textAreaWidth)} height={h} />
        </clipPath>
        <g clipPath={`url(#${textClipId})`}>
          <text className="cv-label" x={38} y={27}>
            {label}
          </text>
          {sublabel && (
            <text className="cv-sub" x={38} y={45}>
              {sublabel}
            </text>
          )}
        </g>
        {meter && (
          <>
            <rect className="cv-mtrack" x={12} y={57} width={w - 60} height={2} rx={1} />
            <rect
              className="cv-mfill"
              x={12}
              y={57}
              width={(w - 60) * Math.min(1, Math.max(0, meter.value))}
              height={2}
              rx={1}
            />
            <text className="cv-mtext" x={w - 12} y={61} textAnchor="end">
              {meter.text}
            </text>
          </>
        )}
      </g>

      <rect className="cv-hatch" width={w} height={h} rx={10} fill={`url(#${hatchId(boardId)})`} />
      <rect className="cv-ring" x={-3} y={-3} width={w + 6} height={h + 6} rx={13} />
      <rect className="cv-sel" x={-3} y={-3} width={w + 6} height={h + 6} rx={13} />

      {showGlyphSlot && (
        <g className="cv-glyph" transform={`translate(${w - 22}, 8)`}>
          <HealthGlyph state={health} size={16} />
        </g>
      )}
      {!showGlyphSlot && role && (
        <g className="cv-role" transform={`translate(${w - 54}, 8)`}>
          <rect width={46} height={16} rx={8} />
          <text x={23} y={11.5} textAnchor="middle">
            {ROLE_LABEL[role]}
          </text>
        </g>
      )}

      {healthLabel && health !== 'ok' && (
        <g transform={`translate(${w / 2}, ${h + 8})`}>
          <g className="cv-chip">
            <rect
              x={-Math.max(40, (healthLabel.length * 7.3 + 14) / 2)}
              y={0}
              width={Math.max(80, healthLabel.length * 7.3 + 14)}
              height={20}
              rx={10}
            />
            <text x={0} y={14} textAnchor="middle">
              {healthLabel}
            </text>
          </g>
        </g>
      )}
    </g>
  );
}
