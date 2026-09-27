import type { CSSProperties } from 'react';
import {
  Board as CanvasBoard,
  Node,
  Link,
  SubsystemCollapsed,
  SubsystemFrame,
} from '@/app/(components)/canvas';
import type { LeafNodeType, LinkProtocol, NodeRole } from '@/app/(components)/canvas';
import type { Board as BoardView, LinkView, NodeView, XY } from '../types';
import { routeToPath, routeMidpoint, translate } from './geometry';
import { resolveHealth } from './colorBy';
import type { ColorByMode, HealthLookup } from './colorBy';

export type { ColorByMode, HealthLookup, ElementHealth } from './colorBy';

/**
 * Gutter between an expanded subsystem's frame and the content it encloses.
 * The synced layout sizes a subsystem's inner content flush against its own
 * bounding box (no border allowance), so drawing the frame at that exact
 * size puts its dashed edge right on the first/last inner node's own
 * corner. This inset keeps the frame reading as a boundary drawn around its
 * contents, not through them.
 */
const SUBSYSTEM_FRAME_PADDING = 12;

export interface StaticBlueprintProps {
  /** The graph level to draw — `ViewData.board` for the top level. */
  board: BoardView;
  /** Namespaces every SVG id this render produces; must be unique on the page (see the canvas kit's `Board`). */
  boardId: string;
  /** The board `<svg>`'s `aria-label`. Defaults to the canvas kit's own default. */
  label?: string;
  className?: string;
  style?: CSSProperties;
  /** Which color-by scheme drives node/subsystem rings. Only `health` exists today. */
  mode?: ColorByMode;
  /** Per-element static health; an id with no entry renders `ok`. */
  health?: HealthLookup;
}

const LEAF_NODE_TYPES = new Set<LeafNodeType>([
  'client',
  'lb',
  'apiGateway',
  'server',
  'worker',
  'orchestrator',
  'cache',
  'cdn',
  'db',
  'objectStore',
  'queue',
  'messageBus',
  'cloud',
  'external',
]);

function asLeafNodeType(form: string): LeafNodeType | null {
  return LEAF_NODE_TYPES.has(form as LeafNodeType) ? (form as LeafNodeType) : null;
}

const NODE_ROLES = new Set<NodeRole>(['primary', 'replica', 'leader', 'follower', 'active', 'standby']);

function asNodeRole(duty: string | undefined): NodeRole | undefined {
  return duty && NODE_ROLES.has(duty as NodeRole) ? (duty as NodeRole) : undefined;
}

const LINK_PROTOCOLS = new Set<LinkProtocol>(['sync', 'async', 'stream']);

function asLinkProtocol(line: string): LinkProtocol {
  return LINK_PROTOCOLS.has(line as LinkProtocol) ? (line as LinkProtocol) : 'sync';
}

/** `type · variant`, plus a replica count once there's more than one — the visual contract's node sub-label. */
function buildSublabel(form: string, flavor: string | undefined, stack: number | undefined): string | undefined {
  const parts = [form, flavor].filter((p): p is string => !!p);
  let text = parts.join(' · ');
  if (stack && stack > 1) text += ` ×${stack}`;
  return text || undefined;
}

function renderNode(
  block: NodeView,
  boardId: string,
  offset: XY,
  mode: ColorByMode,
  health: HealthLookup | undefined,
) {
  if (!block.box) return null; // spare node: not laid out yet.
  const type = asLeafNodeType(block.form);
  if (!type) return null; // DSA/LLD member shapes get their own renderer elsewhere.

  const { state, label: healthLabel } = resolveHealth(mode === 'health' ? health : undefined, block.id);
  const [cx, cy] = translate([block.box[0], block.box[1]], offset);

  return (
    <Node
      key={block.id}
      boardId={boardId}
      id={block.id}
      type={type}
      variant={block.flavor}
      label={block.text}
      sublabel={buildSublabel(block.form, block.flavor, block.stack)}
      role={asNodeRole(block.duty)}
      replicas={block.stack ?? 1}
      health={state}
      healthLabel={healthLabel}
      x={cx}
      y={cy}
    />
  );
}

function renderSubsystem(
  block: NodeView,
  boardId: string,
  offset: XY,
  mode: ColorByMode,
  health: HealthLookup | undefined,
) {
  if (!block.box) return null; // spare subsystem: not laid out yet.
  const { state, label: healthLabel } = resolveHealth(mode === 'health' ? health : undefined, block.id);
  const [cx, cy] = translate([block.box[0], block.box[1]], offset);

  const expanded = block.folded !== true && !!block.inner;
  if (!expanded) {
    const nodeCount = block.inner?.blocks.length ?? 0;
    return (
      <SubsystemCollapsed
        key={block.id}
        boardId={boardId}
        id={block.id}
        label={block.text}
        nodeCount={nodeCount}
        health={state}
        healthLabel={healthLabel}
        width={block.box[2]}
        height={block.box[3]}
        x={cx}
        y={cy}
      />
    );
  }

  const inner = block.inner!;
  const [innerWidth, innerHeight] = inner.size;
  const width = innerWidth + SUBSYSTEM_FRAME_PADDING * 2;
  const height = innerHeight + SUBSYSTEM_FRAME_PADDING * 2;
  const frameX = cx - width / 2;
  const frameY = cy - height / 2;
  const contentOffset: XY = [frameX + SUBSYSTEM_FRAME_PADDING, frameY + SUBSYSTEM_FRAME_PADDING];
  const nodeCount = inner.blocks.length;

  return (
    <g key={block.id} data-subsystem-id={block.id}>
      <SubsystemFrame
        boardId={boardId}
        id={block.id}
        label={`${block.text} · ${nodeCount} node${nodeCount === 1 ? '' : 's'}`}
        x={frameX}
        y={frameY}
        width={width}
        height={height}
      />
      {renderLevel(inner, boardId, contentOffset, mode, health)}
    </g>
  );
}

function renderLink(wire: LinkView, boardId: string, offset: XY) {
  if (!wire.route || wire.route.length === 0) return null; // spare link: not routed yet.
  const routeAbs = wire.route.map((p) => translate(p, offset));
  const d = routeToPath(routeAbs);
  const labelPosition = wire.text ? routeMidpoint(routeAbs) : undefined;

  return (
    <Link
      key={wire.id}
      boardId={boardId}
      id={wire.id}
      d={d}
      protocol={asLinkProtocol(wire.line)}
      bidirectional={!!wire.two}
      label={wire.text}
      labelPosition={labelPosition ? { x: labelPosition[0], y: labelPosition[1] } : undefined}
    />
  );
}

function renderLevel(
  level: BoardView,
  boardId: string,
  offset: XY,
  mode: ColorByMode,
  health: HealthLookup | undefined,
) {
  return (
    <>
      {level.wires.map((wire) => renderLink(wire, boardId, offset))}
      {level.blocks.map((block) =>
        block.form === 'subSystem'
          ? renderSubsystem(block, boardId, offset, mode, health)
          : renderNode(block, boardId, offset, mode, health),
      )}
    </>
  );
}

/**
 * The static blueprint (T3.2): nodes, links and subsystems, drawn server-side
 * from view data with the canvas kit, no client JS required. Health rings
 * default every element to `ok` (the healthy baseline the player always
 * opens on, see `colorBy.ts`) — a later task drives live values on the
 * overlay without touching this render.
 *
 * Sized by CSS `aspect-ratio` from the board's own size, so a caller only
 * needs to constrain width (`className="w-full"` or similar) — no
 * ResizeObserver, no client JS, and it still fills a fixed-height container
 * when the caller sets one (an explicit height wins over `aspect-ratio`).
 *
 * The fit scale is capped at 1 and centered (T3.4): `maxWidth` is the
 * board's own pixel size, so a small graph (a subsystem's own board is its
 * own coordinate space, not scaled to the parent) never gets stretched up
 * to fill a wide container — it only ever scales *down*, on a narrow
 * viewport, and sits centered otherwise (`marginInline: auto`) once capped.
 * `minWidth: 0` is defensive: it stops this box's own intrinsic width (from
 * its only child, a replaced `<svg>` whose intrinsic size comes from
 * `viewBox`) from becoming an unshrinkable floor if it's ever placed
 * directly inside a flex/grid item with no width of its own (the classic
 * "automatic minimum size" trap) — as `.player-drill-level` already is; see
 * that rule in `globals.css`. It does not, by itself, fix an ancestor whose
 * *own* width is resolved through flex stretch (see `/dev/player`'s `main`
 * for that distinct, page-level fix).
 */
export function StaticBlueprint({ board, boardId, label, className, style, mode = 'health', health }: StaticBlueprintProps) {
  return (
    <CanvasBoard
      id={boardId}
      label={label}
      viewBox={`0 0 ${board.size[0]} ${board.size[1]}`}
      className={className}
      style={{
        aspectRatio: `${board.size[0]} / ${board.size[1]}`,
        maxWidth: board.size[0],
        minWidth: 0,
        marginInline: 'auto',
        ...style,
      }}
    >
      {renderLevel(board, boardId, [0, 0], mode, health)}
    </CanvasBoard>
  );
}
