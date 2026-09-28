/**
 * Share links: the player's state as a query string, and back.
 *
 *   /solutions/<id>?s=1&r=<revision>&m=<mode>&v=<walkthrough|scenario>&st=<step>
 *                  &sel=<n|l|g>:<id>&t=<sec>&p=0&x=<speed>&cam=<x>,<y>,<zoom>
 *                  &ch=<checkpoint>:<choice>,…&a=<actions>
 *
 * - `s`: this format's version. A link without one is a plain hand-made
 *   or older link (`?v=<walkthrough>&st=<step>` still opens that step).
 *   A newer version than this code knows keeps only the stable core
 *   (`r v st t a`) and flags the rest as not understood.
 * - `a`: the action log, base64url of the JSON `[[t, tool, target, value], …]`
 *   exactly as the simulation worker stamped it; replaying it to `t`
 *   rebuilds the same run (the simulation is deterministic).
 * - Everything else is small and readable, and left out when it's the
 *   default (Explore, nothing selected, playing at 1×, the fitted view).
 *
 * Pure: no DOM, no store. Decoding never throws; a malformed param is
 * dropped on its own and counted in `dropped`.
 */
import type { PlayerMode } from '../store/playerStore';
import type { Speed } from '../worker/protocol';
import type { UserAction } from '../types';

export const SHARE_VERSION = 1;

/** Every query param this codec owns (anything else in the URL is left alone). */
export const SHARE_PARAMS = ['s', 'r', 'm', 'v', 'st', 'sel', 't', 'p', 'x', 'cam', 'ch', 'a'] as const;

/** Most actions a link carries, and the longest `a` it accepts. */
export const MAX_ACTIONS = 500;
export const MAX_ENCODED_ACTIONS = 8000;

export type ShareSelection = { kind: 'node' | 'link' | 'group'; id: string };

/** The view, in board pixels: the point at the centre of the stage and the zoom. Screen-size independent. */
export interface ShareCamera {
  x: number;
  y: number;
  z: number;
}

export interface ShareState {
  /** Diagram revision the link was made on. */
  rev?: number;
  /** Omitted: Explore (or implied by `view` naming a walkthrough). */
  mode?: PlayerMode;
  /** A walkthrough id, or a scenario id (scenarios read this too). */
  view?: string;
  /** Step id, or a 1-based step number (handy to type by hand). */
  step?: string;
  selection?: ShareSelection;
  /** Simulated seconds to rebuild the run to. */
  t?: number;
  /** Omitted: playing. */
  playing?: boolean;
  speed?: Speed;
  camera?: ShareCamera;
  /** Scenario checkpoint answers (`null` = skipped), for a scenario link. */
  choices?: Record<string, string | null>;
  actions?: UserAction[];
}

export interface DecodedShare {
  state: ShareState;
  /** The format version the link says it is (1 when it names none). */
  version: number;
  /** Params that were present but couldn't be read, or belong to a newer format. */
  dropped: string[];
}

const MODE_CODES: Record<string, PlayerMode> = { e: 'explore', b: 'break', w: 'walkthrough' };
const MODE_TO_CODE: Partial<Record<PlayerMode, string>> = { explore: 'e', break: 'b', walkthrough: 'w' };
const SEL_CODES: Record<string, ShareSelection['kind']> = { n: 'node', l: 'link', g: 'group' };
const SEL_TO_CODE: Record<ShareSelection['kind'], string> = { node: 'n', link: 'l', group: 'g' };
const SPEEDS: readonly Speed[] = [0.5, 1, 2, 4];

/** Element ids, step ids, tool names: letters, digits and `-_.`. */
const ID = /^[A-Za-z0-9_.-]{1,128}$/;
const NUM = /^-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i;

function num(raw: string | null): number | undefined {
  if (raw === null || !NUM.test(raw)) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

/** Shortest text for a number, rounded to `places` decimals. */
function fmt(n: number, places: number): string {
  const k = 10 ** places;
  return String(Math.round(n * k) / k);
}

// ---------------------------------------------------------------------------
// base64url (UTF-8), without Buffer/btoa so it runs the same everywhere
// ---------------------------------------------------------------------------

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
    if (i + 1 < bytes.length) out += B64[(n >> 6) & 63];
    if (i + 2 < bytes.length) out += B64[n & 63];
  }
  return out;
}

export function fromBase64Url(s: string): string | null {
  if (!/^[A-Za-z0-9_-]*$/.test(s) || s.length % 4 === 1) return null;
  const bytes: number[] = [];
  let acc = 0;
  let bits = 0;
  for (const ch of s) {
    acc = (acc << 6) | B64.indexOf(ch);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((acc >> bits) & 0xff);
    }
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// The action log
// ---------------------------------------------------------------------------

function isAction(v: unknown): v is UserAction {
  if (!Array.isArray(v) || v.length !== 4) return false;
  const [t, tool, target, value] = v as unknown[];
  return (
    typeof t === 'number' &&
    Number.isFinite(t) &&
    t >= 0 &&
    typeof tool === 'string' &&
    /^[a-z]{1,24}$/.test(tool) &&
    (target === null || typeof target === 'string') &&
    (value === null || typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value)))
  );
}

export function encodeActions(actions: readonly UserAction[]): string {
  return toBase64Url(JSON.stringify(actions.slice(0, MAX_ACTIONS)));
}

/** `null` when the whole param is unreadable; otherwise the well-formed entries (a bad entry is dropped). */
export function decodeActions(s: string): { actions: UserAction[]; bad: number } | null {
  if (s.length === 0 || s.length > MAX_ENCODED_ACTIONS) return null;
  const json = fromBase64Url(s);
  if (json === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;
  const actions: UserAction[] = [];
  let bad = 0;
  for (const entry of parsed.slice(0, MAX_ACTIONS)) {
    if (isAction(entry)) actions.push(entry);
    else bad++;
  }
  bad += Math.max(0, parsed.length - MAX_ACTIONS);
  // The worker applies actions in log order at their own time: keep it sorted.
  actions.sort((a, b) => a[0] - b[0]);
  return { actions, bad };
}

// ---------------------------------------------------------------------------
// Encode
// ---------------------------------------------------------------------------

/** Query-string escaping that leaves `:` and `,` readable (both are legal in a query). */
function esc(v: string): string {
  return encodeURIComponent(v).replace(/%3A/gi, ':').replace(/%2C/gi, ',');
}

/** The query string (`?…`, or `''` for the default state) for `state`. Params are always in the same order. */
export function encodeShare(state: ShareState): string {
  const out: Array<[string, string]> = [];
  const actions = state.actions ?? [];
  const walkthroughImplied = state.mode === 'walkthrough' && !!state.view;
  if (state.mode && state.mode !== 'explore' && !walkthroughImplied && MODE_TO_CODE[state.mode]) out.push(['m', MODE_TO_CODE[state.mode]!]);
  if (state.view && ID.test(state.view)) {
    out.push(['v', state.view]);
    if (state.step && ID.test(state.step)) out.push(['st', state.step]);
  }
  if (state.selection && ID.test(state.selection.id)) out.push(['sel', `${SEL_TO_CODE[state.selection.kind]}:${state.selection.id}`]);
  // Time only matters when there's something to rebuild, or a paused frame to show.
  if (state.t !== undefined && state.t > 0 && (actions.length > 0 || state.playing === false)) out.push(['t', fmt(state.t, 3)]);
  if (state.playing === false) out.push(['p', '0']);
  if (state.speed !== undefined && state.speed !== 1 && SPEEDS.includes(state.speed)) out.push(['x', String(state.speed)]);
  if (state.camera) out.push(['cam', `${fmt(state.camera.x, 1)},${fmt(state.camera.y, 1)},${fmt(state.camera.z, 3)}`]);
  if (state.choices) {
    const pairs = Object.entries(state.choices).filter(([k, c]) => ID.test(k) && (c === null || ID.test(c)));
    if (pairs.length) out.push(['ch', pairs.map(([k, c]) => `${k}:${c ?? ''}`).join(',')]);
  }
  if (actions.length) out.push(['a', encodeActions(actions)]);
  if (out.length === 0) return '';
  // The version and revision lead, so a reader sees what the link was made on.
  const head: Array<[string, string]> = [['s', String(SHARE_VERSION)]];
  if (state.rev !== undefined) head.push(['r', String(state.rev)]);
  return `?${[...head, ...out].map(([k, v]) => `${k}=${esc(v)}`).join('&')}`;
}

/**
 * `search` with this codec's params replaced by `state`'s, anything else
 * (a campaign tag, say) kept where it was. `''` when nothing is left.
 */
export function mergeShareIntoSearch(search: string, state: ShareState): string {
  const own = new Set<string>(SHARE_PARAMS);
  const kept = search
    .replace(/^\?/, '')
    .split('&')
    .filter((kv) => kv && !own.has(decodeURIComponent(kv.split('=')[0])));
  const ours = encodeShare(state).replace(/^\?/, '');
  const all = [...kept, ...(ours ? [ours] : [])];
  return all.length ? `?${all.join('&')}` : '';
}

// ---------------------------------------------------------------------------
// Decode
// ---------------------------------------------------------------------------

export function decodeShare(search: string | URLSearchParams): DecodedShare {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;
  const state: ShareState = {};
  const dropped: string[] = [];
  const has = (k: string) => params.has(k);

  let version = 1;
  if (has('s')) {
    const v = num(params.get('s'));
    if (v !== undefined && Number.isInteger(v) && v >= 1) version = v;
    else dropped.push('s');
  }
  const future = version > SHARE_VERSION;

  if (has('r')) {
    const r = num(params.get('r'));
    if (r !== undefined && Number.isInteger(r) && r >= 0) state.rev = r;
    else dropped.push('r');
  }
  if (has('v')) {
    const v = params.get('v')!;
    if (ID.test(v)) state.view = v;
    else dropped.push('v');
  }
  if (has('st')) {
    const st = params.get('st')!;
    if (ID.test(st) && state.view) state.step = st;
    else dropped.push('st');
  }
  if (has('t')) {
    const t = num(params.get('t'));
    if (t !== undefined && t >= 0 && t <= 86_400) state.t = t;
    else dropped.push('t');
  }
  if (has('a')) {
    const got = decodeActions(params.get('a')!);
    if (got === null) dropped.push('a');
    else {
      if (got.actions.length) state.actions = got.actions;
      if (got.bad > 0) dropped.push('a');
    }
  }

  // The rest is this version's own; a newer format may mean something else by it.
  const extra = ['m', 'sel', 'p', 'x', 'cam', 'ch'] as const;
  if (future) {
    for (const k of extra) if (has(k)) dropped.push(k);
    return { state, version, dropped };
  }

  if (has('m')) {
    const m = MODE_CODES[params.get('m')!];
    if (m) state.mode = m;
    else dropped.push('m');
  }
  if (has('sel')) {
    const raw = params.get('sel')!;
    const i = raw.indexOf(':');
    const kind = SEL_CODES[raw.slice(0, i)];
    const id = raw.slice(i + 1);
    if (i > 0 && kind && ID.test(id)) state.selection = { kind, id };
    else dropped.push('sel');
  }
  if (has('p')) {
    const p = params.get('p');
    if (p === '0' || p === '1') state.playing = p === '1';
    else dropped.push('p');
  }
  if (has('x')) {
    const x = num(params.get('x'));
    const speed = SPEEDS.find((s) => s === x);
    if (speed !== undefined) state.speed = speed;
    else dropped.push('x');
  }
  if (has('cam')) {
    const parts = params.get('cam')!.split(',');
    const [x, y, z] = parts.map((p) => num(p));
    if (parts.length === 3 && x !== undefined && y !== undefined && z !== undefined && z > 0 && z <= 16) state.camera = { x, y, z };
    else dropped.push('cam');
  }
  if (has('ch')) {
    const choices: Record<string, string | null> = {};
    let ok = true;
    for (const pair of params.get('ch')!.split(',')) {
      const i = pair.indexOf(':');
      const k = pair.slice(0, i);
      const c = pair.slice(i + 1);
      if (i <= 0 || !ID.test(k) || (c !== '' && !ID.test(c))) ok = false;
      else choices[k] = c === '' ? null : c;
    }
    if (ok && Object.keys(choices).length) state.choices = choices;
    else dropped.push('ch');
  }
  return { state, version, dropped };
}

/** True when the query string carries any share param at all. */
export function hasShareParams(search: string): boolean {
  const params = new URLSearchParams(search);
  return SHARE_PARAMS.some((k) => params.has(k));
}

/** A link that opens `diagramId`'s player straight on a walkthrough (and optionally a step): the plain `?v=&st=` form. */
export function walkthroughHref(diagramId: string, walkthroughId: string, stepId?: string): string {
  const q = [`v=${esc(walkthroughId)}`, ...(stepId ? [`st=${esc(stepId)}`] : [])].join('&');
  return `/solutions/${encodeURIComponent(diagramId)}?${q}`;
}
