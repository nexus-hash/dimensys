import type { CSSProperties } from 'react';
import {
  Board as CanvasBoard,
  Node,
  Link,
  LinkLabel,
  SubsystemFrame,
  meterKindForType,
  nodeSubLabel,
} from '@/app/(components)/canvas';
import type { LeafNodeType, LinkProtocol, NodeMeter, NodeRole } from '@/app/(components)/canvas';
import type { Board as BoardView, FrameView, LinkView, NodeView } from '../types';
import { routeToPath, routeMidpoint } from './geometry';
import { resolveHealth } from './colorBy';
import type { ColorByMode, HealthLookup } from './colorBy';

export type { ColorByMode, HealthLookup, ElementHealth } from './colorBy';

export interface StaticBlueprintProps {
  /** The graph level to draw — `ViewData.board` for the top level. */
  board: BoardView;
  /** Namespaces every SVG id this render produces; must be unique on the page (see the canvas kit's `Board`). */
  boardId: string;
  /** The board `<svg>`'s `aria-label`. Defaults to the canvas kit's own default. */
  label?: string;
  className?: string;
  style?: CSSProperties;
  /** Which color-by scheme drives node rings. Only `health` exists today. */
  mode?: ColorByMode;
  /** Per-element static health; an id with no entry renders `ok`. */
  health?: HealthLookup;
  /** False draws every node as a non-focusable image (a preview, not a control). Default true. */
  interactive?: boolean;
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

/**
 * The meter row's healthy-baseline reading (FID: "the server render shows
 * the baseline or an empty bar"). The interactive layer (T3.3) overwrites
 * `value`/`text` in place once the worker's first frame lands — see
 * `overlay/InteractiveLayer.tsx` and `metricKindText`, which must read the
 * same `kind` this produces.
 */
function baselineMeter(kind: NonNullable<ReturnType<typeof meterKindForType>>): NodeMeter {
  switch (kind) {
    case 'hit':
      return { kind, value: 0, text: 'hit 0%' };
    case 'lag':
      return { kind, value: 0, text: 'lag 0 s' };
    case 'backlog':
      return { kind, value: 0, text: '0 msgs' };
    default:
      return { kind: 'util', value: 0, text: '0%' };
  }
}


function renderNode(
  block: NodeView,
  boardId: string,
  mode: ColorByMode,
  health: HealthLookup | undefined,
  interactive: boolean,
) {
  if (!block.box) return null; // spare node: not laid out yet.
  const type = asLeafNodeType(block.form);
  if (!type) return null; // DSA/LLD member shapes get their own renderer elsewhere.

  const { state, label: healthLabel } = resolveHealth(mode === 'health' ? health : undefined, block.id);
  const [cx, cy] = block.box;
  const meterKind = meterKindForType(block.form);

  return (
    <Node
      key={block.id}
      boardId={boardId}
      id={block.id}
      type={type}
      variant={block.flavor}
      label={block.text}
      sublabel={nodeSubLabel(block.form, block.flavor, block.stack)}
      role={asNodeRole(block.duty)}
      replicas={block.stack ?? 1}
      meter={meterKind ? baselineMeter(meterKind) : undefined}
      health={state}
      healthLabel={healthLabel}
      x={cx}
      y={cy}
      width={block.box[2]}
      height={block.box[3]}
      interactive={interactive}
    />
  );
}

/** A group's frame: a dashed border round its nodes with its name as a tab — the tab is the group's one control (it selects the group). */
function renderFrame(frame: FrameView, boardId: string, interactive: boolean) {
  const [cx, cy, width, height] = frame.box;
  return (
    <SubsystemFrame
      key={`frame-${frame.id}`}
      boardId={boardId}
      id={frame.id}
      label={frame.text}
      x={cx - width / 2}
      y={cy - height / 2}
      width={width}
      height={height}
      interactive={interactive}
    />
  );
}

function renderLink(wire: LinkView, boardId: string) {
  if (!wire.route || wire.route.length === 0) return null; // spare link: not routed yet.
  return (
    <Link
      key={wire.id}
      boardId={boardId}
      id={wire.id}
      d={routeToPath(wire.route, wire.curve === true)}
      toNodeId={wire.b}
      protocol={asLinkProtocol(wire.line)}
      bidirectional={!!wire.two}
    />
  );
}

/**
 * A link's label pill, drawn in its own pass after every link so no other
 * link can cross its text (its opaque fill masks its own line). `cap` — the
 * engine's collision-free anchor on the drawn curve — wins when present; a
 * link with `text` but no `cap` (an older/unsynced document) falls back to
 * the route's own arc-length midpoint.
 */
function renderLinkLabel(wire: LinkView) {
  if (!wire.text || !wire.route || wire.route.length === 0) return null;
  const [x, y] = wire.cap ? wire.cap.pt : routeMidpoint(wire.route);
  return <LinkLabel key={`label-${wire.id}`} id={wire.id} label={wire.text} x={x} y={y} size={wire.cap?.sz} />;
}

/** Frames first (behind everything), then links, their label pills, then nodes on top. */
function renderBoard(board: BoardView, boardId: string, mode: ColorByMode, health: HealthLookup | undefined, interactive: boolean) {
  return (
    <>
      {(board.frames ?? []).map((frame) => renderFrame(frame, boardId, interactive))}
      {board.wires.map((wire) => renderLink(wire, boardId))}
      {board.wires.map((wire) => renderLinkLabel(wire))}
      {board.blocks.map((block) => renderNode(block, boardId, mode, health, interactive))}
    </>
  );
}

/**
 * The static blueprint (T3.2): nodes, links and group frames, drawn server-side
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
 * The fit scale is capped at 1 and centered (T3.4), on *both* axes: `maxWidth`
 * and `maxHeight` are the board's own pixel size, so a small graph never
 * gets stretched up to fill a wide or tall container — it only
 * ever scales *down*, when the available box is narrower or shorter than the
 * board's own size, and sits centered otherwise. Centering is the parent's
 * job now (`.player-board-level`'s `display: flex` + centering in
 * `globals.css`, for the player shell specifically), not this component's —
 * a plain `<div className="w-full">` caller with no such parent still gets
 * the width-only behavior this had before, since `marginInline: auto` only
 * self-centers within a block-formatting-context parent that's *wider* than
 * this box, which a flex/grid parent overrides harmlessly.
 *
 * Both `min-width: 0` and `min-height: 0` are defensive: they stop this
 * box's own intrinsic size (from its only child, a replaced `<svg>` whose
 * intrinsic size comes from `viewBox`) from becoming an unshrinkable floor
 * if it's ever placed directly inside a flex/grid item with no size of its
 * own (the classic "automatic minimum size" trap) — as `.player-board-level`
 * already is; see that rule in `globals.css`. Neither one, by itself, fixes
 * an ancestor whose *own* size is resolved through flex stretch (see
 * `/dev/player`'s `main` for that distinct, page-level fix, and
 * `.player-board-stage`/`.player-board-level`'s explicit `width`/`height:
 * 100%` in `globals.css` for the same fix applied through the player
 * shell's own chain).
 */
export function StaticBlueprint({
  board,
  boardId,
  label,
  className,
  style,
  mode = 'health',
  health,
  interactive = true,
}: StaticBlueprintProps) {
  return (
    <CanvasBoard
      id={boardId}
      label={label}
      viewBox={`0 0 ${board.size[0]} ${board.size[1]}`}
      className={className}
      style={{
        aspectRatio: `${board.size[0]} / ${board.size[1]}`,
        maxWidth: board.size[0],
        maxHeight: board.size[1],
        minWidth: 0,
        minHeight: 0,
        marginInline: 'auto',
        ...style,
      }}
    >
      {renderBoard(board, boardId, mode, health, interactive)}
    </CanvasBoard>
  );
}
