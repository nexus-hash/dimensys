/**
 * Walkthrough view model. Pure and server-safe: the server resolves every
 * step's precomputed frame against the board once — which nodes, links and
 * frames are lit, which links carry the step's flow, where the camera
 * should look — and hands the client a small plain object per step. The
 * browser never needs the board's geometry or the full view data to play a
 * walkthrough.
 */
import type { Board, BreakChip, Box, Frame, Sheet, StoryView, ViewData } from '../types';

/** One step, ready to apply to the drawn board. */
export interface WalkthroughStep {
  id: string;
  /** Short title (the step's own, or "Step n"). */
  title: string;
  /** One-line plain-text summary for the step list (markdown stripped). */
  summary: string;
  /** Lit elements; everything else on the board dims. Empty = nothing dims. */
  litNodes: string[];
  litLinks: string[];
  litFrames: string[];
  /** Links the step's flow runs along: particles are emphasised here. */
  pathLinks: string[];
  /** Per-element emphasis tone (`ok` | `warn` | `critical` | `info` | …). */
  tones: Array<[string, string]>;
  /** Elements the step fades on purpose (lower opacity than a plain dim), with their opacity. */
  fades: Array<[string, number]>;
  /** Links whose particles stop for this step. */
  still: string[];
  /** The element the step centres on: gets the step badge and the soft pulse. */
  focusId: string | null;
  /** That element's own box (board units), where the badge sits. */
  focusAnchor: Box | null;
  /** Camera target in board units `[cx, cy, w, h]`; `null` = the whole board. */
  focusBox: Box | null;
  /** The elements `focusBox` frames (the board may be drawn in another arrangement, so the stage re-reads their boxes). Empty = the whole board. */
  focusIds: string[];
  /** Marker tags `[label, nodeId, nodeBox]` pinned on nodes for this step. */
  markers: Array<[string, string, Box]>;
}

export interface WalkthroughView {
  id: string;
  title: string;
  tip?: string;
  /** The failure it explains, applied when "Now break it" hands over to Break it. */
  brk?: BreakChip;
  steps: WalkthroughStep[];
}

const FADE_BELOW = 0.5;

/**
 * A step with no narration of its own may still carry a detail panel on
 * one of its elements; its title and prose then stand in as the step's
 * title and narration, so the step never plays silent.
 */
export function stepSheet(frame: Frame): Sheet | undefined {
  return frame.looks.find((l) => l.sheet)?.sheet;
}

/** Strips the few markdown marks a one-line summary can carry. */
export function plainText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`#>~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function unionBox(boxes: Box[]): Box | null {
  if (boxes.length === 0) return null;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [cx, cy, w, h] of boxes) {
    x0 = Math.min(x0, cx - w / 2);
    y0 = Math.min(y0, cy - h / 2);
    x1 = Math.max(x1, cx + w / 2);
    y1 = Math.max(y1, cy + h / 2);
  }
  return [(x0 + x1) / 2, (y0 + y1) / 2, x1 - x0, y1 - y0];
}

function buildStep(frame: Frame, index: number, board: Board, markerText: Map<string, string>): WalkthroughStep {
  const nodes = new Map(board.blocks.filter((b) => b.box).map((b) => [b.id, b]));
  const links = new Map(board.wires.map((w) => [w.id, w]));
  const frames = new Map((board.frames ?? []).map((f) => [f.id, f]));

  const litNodes = new Set<string>();
  const litLinks = new Set<string>();
  const litFrames = new Set<string>();
  const pathLinks = new Set<string>();
  const tones: Array<[string, string]> = [];
  const fades: Array<[string, number]> = [];
  const still: string[] = [];
  /** First element the step itself names — the focus when there's no explicit aim. */
  let firstNamed: string | null = null;

  function light(id: string) {
    if (nodes.has(id)) litNodes.add(id);
    else if (links.has(id)) litLinks.add(id);
    else if (frames.has(id)) litFrames.add(id);
    else return;
    firstNamed ??= nodes.has(id) || frames.has(id) ? id : null;
  }

  for (const id of frame.lit) light(id);

  for (const look of frame.looks) {
    const faded = look.shown === false || (look.alpha !== undefined && look.alpha < FADE_BELOW);
    if (faded) {
      fades.push([look.el, look.shown === false ? 0 : (look.alpha ?? 0)]);
      continue;
    }
    light(look.el);
    if (look.hue) tones.push([look.el, look.hue]);
    if (look.flux !== undefined && links.has(look.el)) {
      const total = Array.isArray(look.flux) ? look.flux[0] + look.flux[1] : look.flux;
      if (total > 0) pathLinks.add(look.el);
      else still.push(look.el);
    }
  }

  // The flow: every link joining two trail nodes carries the step's
  // particles. When the step lights nothing itself, the trail is what it
  // lights; otherwise its own highlight decides what stays at full opacity
  // and the path links are kept visible on top of that (added after the
  // propagation below, so they don't light their ends).
  const trailLinks: string[] = [];
  if (frame.trail && frame.trail.length > 0) {
    // A group on the trail stands for its members (links end on those).
    const onTrail = new Set(frame.trail.flatMap((id) => [id, ...(frames.get(id)?.holds ?? [])]));
    const lightsNothing = litNodes.size + litLinks.size + litFrames.size === 0;
    if (lightsNothing) for (const id of frame.trail) light(id);
    for (const wire of board.wires) {
      if (onTrail.has(wire.a) && onTrail.has(wire.b)) {
        pathLinks.add(wire.id);
        if (lightsNothing) litLinks.add(wire.id);
        else trailLinks.push(wire.id);
      }
    }
  }

  const namedFrames = new Set(litFrames);
  // A lit frame lights its members; a lit link lights its two ends; two lit
  // nodes light the link between them, so a highlighted hop reads as one piece.
  for (const id of litFrames) for (const member of frames.get(id)?.holds ?? []) if (nodes.has(member)) litNodes.add(member);
  for (const id of litLinks) {
    const wire = links.get(id)!;
    if (nodes.has(wire.a)) litNodes.add(wire.a);
    if (nodes.has(wire.b)) litNodes.add(wire.b);
  }
  for (const wire of board.wires) if (litNodes.has(wire.a) && litNodes.has(wire.b)) litLinks.add(wire.id);
  for (const id of trailLinks) litLinks.add(id);
  // A node inside a frame keeps its frame visible.
  for (const f of board.frames ?? []) if (f.holds.some((m) => litNodes.has(m))) litFrames.add(f.id);

  const aim = frame.aim && (nodes.has(frame.aim) || frames.has(frame.aim)) ? frame.aim : null;
  const focusId = aim ?? firstNamed ?? [...litNodes][0] ?? null;

  // The camera fits the step's targets: its aim plus everything it lights
  // (all of the board lit = no zoom at all).
  let focusBox: Box | null = null;
  const boxes: Box[] = [];
  const focusIds: string[] = [];
  const aimBox = aim ? (nodes.get(aim)?.box ?? frames.get(aim)?.box) : undefined;
  if (aimBox) {
    boxes.push(aimBox);
    focusIds.push(aim!);
  }
  if (litNodes.size < nodes.size || aimBox) {
    for (const id of litNodes) {
      boxes.push(nodes.get(id)!.box!);
      focusIds.push(id);
    }
    for (const id of namedFrames) {
      boxes.push(frames.get(id)!.box);
      focusIds.push(id);
    }
  }
  if (boxes.length > 0) focusBox = unionBox(boxes);

  const markers: Array<[string, string, Box]> = [];
  for (const [marker, spot] of frame.pins) {
    const box = spot ? nodes.get(spot)?.box : undefined;
    if (spot && box) markers.push([markerText.get(marker) ?? marker, spot, box]);
  }
  const focusAnchor = focusId ? (nodes.get(focusId)?.box ?? frames.get(focusId)?.box ?? null) : null;

  const sheet = stepSheet(frame);
  const title = frame.title?.trim() || sheet?.title?.trim() || `Step ${index + 1}`;
  const firstProse = sheet?.parts.find((p) => p.shape === 'prose');
  const summaryMd = frame.md ?? (firstProse && 'md' in firstProse ? firstProse.md : '');
  return {
    id: frame.id,
    title,
    summary: summaryMd ? plainText(summaryMd) : '',
    litNodes: [...litNodes],
    litLinks: [...litLinks],
    litFrames: [...litFrames],
    pathLinks: [...pathLinks],
    tones,
    fades,
    still,
    focusId,
    focusAnchor,
    focusBox,
    focusIds,
    markers,
  };
}

/** Every walkthrough of the diagram that has at least one step, resolved against its board. */
export function buildWalkthroughs(diagram: Pick<ViewData, 'stories' | 'board' | 'pins'>): WalkthroughView[] {
  const board = diagram.board;
  if (!board) return [];
  const markerText = new Map(diagram.pins.map((p) => [p.id, p.text]));
  return diagram.stories
    .filter((story: StoryView) => story.frames.length > 0)
    .map((story) => ({
      id: story.id,
      title: story.text,
      ...(story.tip ? { tip: story.tip } : {}),
      ...(story.brk ? { brk: story.brk } : {}),
      steps: story.frames.map((frame, i) => buildStep(frame, i, board, markerText)),
    }));
}

/** Narration markdown per step, keyed by `stepKey`. */
export function stepKey(walkthroughId: string, stepId: string): string {
  return `${walkthroughId}/${stepId}`;
}
