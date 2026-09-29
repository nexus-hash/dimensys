/**
 * The left rail's content, prepared on the server from the view data: the
 * problem header, the request paths with their hop chains already written
 * out, and the diagram-wide sizing calculator. Small and serialisable, so it
 * crosses into the client rail as one prop.
 */
import type { CalcView, LaneView, Sheet, ViewData } from '../types';

export interface RailProblem {
  title: string;
  /** Diagram family, e.g. `hld`. */
  level: string;
  /** Difficulty word, e.g. `medium`. */
  grade: string;
  minutes?: number;
}

export interface RailLane {
  id: string;
  text: string;
  /** The hop chain, e.g. `client → Load Balancer → API → (miss) Cassandra`. */
  chain: string;
  nodes: string[];
  links: string[];
  /** Frames that hold any of `nodes` (they stay lit while the path is traced). */
  frames: string[];
  probes?: [string, string];
}

export interface RailData {
  problem: RailProblem;
  lanes: RailLane[];
  /** The calculator that belongs to the whole design rather than to one element. */
  estimate?: CalcView;
}

/** Filled dots out of three for a difficulty word; `null` when it isn't one of the three. */
export function gradeDots(grade: string): number | null {
  const i = ['easy', 'medium', 'hard'].indexOf(grade.toLowerCase());
  return i < 0 ? null : i + 1;
}

const ROLE_WORDS = new Set(['service', 'services', 'cache', 'server', 'servers', 'worker', 'workers', 'cluster', 'storage', 'store', 'stream', 'database']);
const ABBREVIATIONS: Record<string, string> = { 'load balancer': 'LB' };

/**
 * The short form of a node label for a hop chain: the product in brackets
 * when there is one ("URL Storage (Cassandra)" → "Cassandra"), else the label
 * without a trailing role word ("Redis Cache" → "Redis", "API Service" →
 * "API"), with a few common abbreviations ("Load Balancer" → "LB").
 */
export function shortLabel(text: string): string {
  const bracket = /\(([^()]+)\)\s*$/.exec(text);
  if (bracket) return bracket[1].trim();
  const trimmed = text.trim();
  const abbr = ABBREVIATIONS[trimmed.toLowerCase()];
  if (abbr) return abbr;
  const words = trimmed.split(/\s+/);
  while (words.length > 1 && ROLE_WORDS.has(words[words.length - 1].toLowerCase())) words.pop();
  return words.join(' ');
}

function laneChain(lane: LaneView, label: (id: string) => string, isClient: (id: string) => boolean): string {
  const parts: string[] = [];
  if (lane.senders.length > 0) {
    parts.push(lane.senders.every(isClient) ? 'client' : lane.senders.map(label).join(' / '));
  }
  let out = parts.join('');
  for (const [id, mark] of lane.hops) {
    const name = label(id);
    if (mark === 'async') out += `${out ? ' · ' : ''}async ${name}`;
    else out += `${out ? ' → ' : ''}${mark === 'miss' ? '(miss) ' : ''}${name}`;
  }
  return out;
}

function calcRefs(sheet: Sheet | undefined, out: Set<string>) {
  for (const part of sheet?.parts ?? []) if (part.shape === 'calc') out.add(part.calc);
}

/** The first calculator no element's detail panel shows: the design-wide estimate. */
export function designEstimate(view: Pick<ViewData, 'board' | 'stories' | 'calcs'>): CalcView | undefined {
  const used = new Set<string>();
  for (const b of view.board?.blocks ?? []) calcRefs(b.sheet, used);
  for (const f of view.board?.frames ?? []) calcRefs(f.sheet, used);
  for (const s of view.stories) for (const fr of s.frames) for (const look of fr.looks) calcRefs(look.sheet, used);
  return view.calcs.find((c) => !used.has(c.id));
}

export function buildRailData(view: ViewData): RailData {
  const blocks = new Map((view.board?.blocks ?? []).map((b) => [b.id, b]));
  const label = (id: string) => shortLabel(blocks.get(id)?.text ?? id);
  const isClient = (id: string) => blocks.get(id)?.form === 'client';
  const frames = view.board?.frames ?? [];

  const lanes = (view.lanes ?? []).map((lane): RailLane => {
    const nodes = [...new Set([...lane.senders, ...lane.hops.map((h) => h[0])])];
    const lit = new Set(nodes);
    return {
      id: lane.id,
      text: lane.text,
      chain: laneChain(lane, label, isClient),
      nodes,
      links: [...lane.wires],
      frames: frames.filter((f) => f.holds.some((id) => lit.has(id))).map((f) => f.id),
      ...(lane.probes ? { probes: lane.probes } : {}),
    };
  });

  return {
    problem: {
      title: view.head.title,
      level: view.family,
      grade: view.head.grade,
      ...(view.head.minutes !== undefined ? { minutes: view.head.minutes } : {}),
    },
    lanes,
    ...(designEstimate(view) ? { estimate: designEstimate(view) } : {}),
  };
}
