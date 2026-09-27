import { NodeIcon } from './icons';
import { HealthGlyph } from './HealthGlyph';
import { hatchId } from './CanvasDefs';
import { NODE_HEIGHT, NODE_WIDTH } from './types';
import type { HealthState, HldNodeType, NodeMeter, NodeRole } from './types';
import {
  MONO_CHAR_EM,
  measureMono,
  measureSans,
  SUB_FONT_PX,
  TEXT_PAD_R,
  TEXT_X,
  TITLE_FONT_PX,
  TITLE_PAD_R,
  truncateToFit,
  truncateToWidth,
} from './text';

// ---------------------------------------------------------------------------
// Meter row (FID): a thin bar plus a right-aligned value. The bar and the
// value must never overlap — the value gets a fixed reserved width (from
// `METER_VALUE_CHARS`, the longest realistic reading for that meter's
// `kind`, not the current text, so live updates — which only ever change
// `.cv-mfill`'s width and `.cv-mtext`'s content, never these `x`/`width`
// attributes, see `overlay/domHealth.ts` — can't drift the geometry this
// computed) and the bar fills the rest, with `METER_GAP` of hairline between
// them. `Math.min` against a live `meter.text` still truncates the rare
// reading that's longer than its own kind's reservation (e.g. three-digit
// utilization), so the two rects stay disjoint regardless.
// ---------------------------------------------------------------------------
const METER_TEXT_FONT_SIZE = 11;
const METER_TRACK_X = 12;
/**
 * 14, not the 12px text padding: at meter size (11px) the rasterizer rounds
 * each mono advance up (6.6 → ~7px) and the end-anchored value's box then
 * overhangs its anchor by ~1–2px; 2px of guard keeps it inside the padding.
 */
const METER_RIGHT_PAD = 14;
const METER_GAP = 6;
/** Minimum bar width kept even if a meter's value text is implausibly long. */
const METER_MIN_BAR_WIDTH = 24;
/** Longest realistic reading per meter kind, in characters (`"142%"`, `"hit 100%"`, `"lag 820 ms"`). */
const METER_VALUE_CHARS: Record<NodeMeter['kind'], number> = {
  util: 4,
  hit: 8,
  backlog: 10,
  lag: 10,
};

/**
 * The meter row: bar from `METER_TRACK_X`, value right-aligned to the
 * padding, the two disjoint. Shared by leaf nodes and the collapsed
 * subsystem card (its aggregate utilization). Live updates only rewrite
 * `.cv-mfill`'s width and `.cv-mtext`'s text, never this geometry.
 */
export function MeterRow({ meter, width }: { meter: NodeMeter; width: number }) {
  const valueCharWidth = METER_TEXT_FONT_SIZE * MONO_CHAR_EM;
  const reservedValueWidth = METER_VALUE_CHARS[meter.kind] * valueCharWidth;
  const barWidth = Math.max(METER_MIN_BAR_WIDTH, width - METER_TRACK_X - METER_RIGHT_PAD - METER_GAP - reservedValueWidth);
  const valueAreaWidth = Math.max(0, width - METER_RIGHT_PAD - (METER_TRACK_X + barWidth + METER_GAP));
  const displayMeterText = truncateToWidth(meter.text, valueAreaWidth, valueCharWidth);
  return (
    <>
      <rect className="cv-mtrack" x={METER_TRACK_X} y={57} width={barWidth} height={2} rx={1} />
      <rect
        className="cv-mfill"
        x={METER_TRACK_X}
        y={57}
        width={barWidth * Math.min(1, Math.max(0, meter.value))}
        height={2}
        rx={1}
      />
      <text className="cv-mtext" x={width - METER_RIGHT_PAD} y={61} textAnchor="end">
        {displayMeterText}
      </text>
    </>
  );
}

export type LeafNodeType = Exclude<HldNodeType, 'subSystem'>;

interface NodeProps {
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
  /** > 1 draws stacked "shadow cards" behind the body. */
  replicas?: number;
  /** Utilization / hit-ratio / backlog / lag meter. Omit for source nodes (`client`). */
  meter?: NodeMeter;
  health?: HealthState;
  /** Mono chip text shown below the node once health isn't `ok`, e.g. "p99 640 ms". */
  healthLabel?: string;
  /** Critical only: the ring opacity-pulses while the metric keeps getting worse.
   * A static kit can't know "getting worse" on its own — callers in the interactive
   * layer (T3.3) pass this once they track the trend. */
  pulsing?: boolean;
  selected?: boolean;
  dimmed?: boolean;
  /** Center position, for placement inside a `<Board>`. Defaults to (0,0) so the
   * component also renders standalone (e.g. the dev gallery). */
  x?: number;
  y?: number;
  /** Box size from the layout (content-driven width). Defaults to the standard 144×72 card. */
  width?: number;
  height?: number;
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
 * The HLD node: 72px tall and as wide as the layout sized it for its own
 * title and sub-label (144×72 standalone), monochrome body, icon + label + mono
 * sub-label (variant · replicas · role, when present), an optional meter,
 * and the health ring + glyph + text label.
 * Hover/focus/selected/dimmed are the design spec states.
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
  width = NODE_WIDTH,
  height = NODE_HEIGHT,
  interactive = true,
}: NodeProps) {
  const w = width;
  const h = height;
  const showGlyphSlot = health !== 'ok';
  // The role reads inline as part of the sub-label ("api · ×4 · primary")
  // rather than as its own top-right pill: a fixed-width pill there sat
  // partly over the card's own right border for longer role names (e.g.
  // "follower") and ate a fixed 60px out of the label's line whether or not
  // a role was even present long enough to need it, squeezing an ordinary
  // label down to a couple of characters. Folding it into the sub-label
  // costs it only the room its own text needs, same as any other sub-label
  // content, and it can never cross the card's edge because it's truncated
  // by the exact same estimate-and-clip guard as the rest of that line. It
  // still only shows when there's no status glyph, same as before, since
  // both live in that same top-right "extra state" slot conceptually.
  const roleText = !showGlyphSlot && role ? ROLE_LABEL[role] : undefined;
  const rawSublabel = sublabel ? (roleText ? `${sublabel} · ${roleText}` : sublabel) : roleText;
  const ariaLabel = `${label}, ${type}${variant ? ` · ${variant}` : ''}, ${healthSentence(health, healthLabel)}`;
  // Label/sub-label are clipped to the space left of the health glyph so a
  // long label never overlaps it (the design spec: "truncated with a full
  // tooltip"). The visible glyphs are truncated with an ellipsis at an estimated
  // width (`text.ts` — there's no DOM to measure against server-side); the
  // clipPath stays as a hard safety net for whatever that estimate gets wrong,
  // and the full text always ships in `aria-label` above plus a native `<title>`
  // tooltip below, regardless of what's visually truncated.
  //
  // Widths are measured with the fonts' own advances (`text.ts`), the same
  // numbers the layout sized this box with, so a title only truncates past
  // the widest box the layout allows. The title line stops short of the
  // top-right glyph slot (`TITLE_PAD_R`); the sub-label runs to the padding.
  const textClipId = `${boardId}-${id}-text-clip`;
  const textAreaWidth = w - TEXT_X - TEXT_PAD_R;
  const displayLabel = truncateToFit(label, w - TEXT_X - TITLE_PAD_R, (t) => measureSans(t, TITLE_FONT_PX));
  const displaySublabel = rawSublabel ? truncateToFit(rawSublabel, textAreaWidth, (t) => measureMono(t, SUB_FONT_PX)) : undefined;
  const titleText = rawSublabel ? `${label} — ${rawSublabel}` : label;

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
      data-meter-kind={meter?.kind}
      tabIndex={interactive ? 0 : -1}
      role={interactive ? 'button' : 'img'}
      aria-label={ariaLabel}
    >
      <title>{titleText}</title>
      <rect className="cv-halo" x={-5} y={-5} width={w + 10} height={h + 10} rx={15} />
      <rect className="cv-focus" x={-8} y={-8} width={w + 16} height={h + 16} rx={18} />

      <g className="cv-inner">
        {/* FID: +4/+8px (was +3/+6px) so the back cards' edges show clearly
            at default fit, and their own selection/hover outline (`.cv-stack`
            in globals.css) reads as a distinct card, not just this node's
            shadow. This offset and the layout engine's own copy
            (`NODE_STACK_DECORATION_MARGIN`, used for label obstacles) must
            stay identical — each side pins the other's number in a test. */}
        {replicas > 1 && (
          <>
            <rect className="cv-stack" x={8} y={8} width={w} height={h} rx={10} />
            <rect className="cv-stack" x={4} y={4} width={w} height={h} rx={10} />
          </>
        )}
        <rect className="cv-body" width={w} height={h} rx={10} />
        <g className="cv-icon" transform="translate(12, 12) scale(0.83)">
          <NodeIcon type={type} variant={variant} />
        </g>
        <clipPath id={textClipId}>
          <rect x={TEXT_X} y={0} width={Math.max(0, textAreaWidth)} height={h} />
        </clipPath>
        {meter && <MeterRow meter={meter} width={w} />}
      </g>

      <rect className="cv-hatch" width={w} height={h} rx={10} fill={`url(#${hatchId(boardId)})`} />

      {/* Text sits above the hatch/dimmed body as its own layer (not inside
          `.cv-inner`) so the `down` state's heavy dimming never drops label
          legibility below a readable contrast — glyphs, labels and hatch
          textures are the non-color channel the design spec leans on, so
          the label can't be the part that fades away. */}
      <g className="cv-text" clipPath={`url(#${textClipId})`}>
        <text className="cv-label" x={TEXT_X} y={27}>
          {displayLabel}
        </text>
        {displaySublabel && (
          <text className="cv-sub" x={TEXT_X} y={45}>
            {displaySublabel}
          </text>
        )}
      </g>

      <rect className="cv-ring" x={-3} y={-3} width={w + 6} height={h + 6} rx={13} />
      <rect className="cv-sel" x={-3} y={-3} width={w + 6} height={h + 6} rx={13} />

      {showGlyphSlot && (
        <g className="cv-glyph" transform={`translate(${w - 22}, 8)`}>
          <HealthGlyph state={health} size={16} />
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
