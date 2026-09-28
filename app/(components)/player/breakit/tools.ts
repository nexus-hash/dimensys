/**
 * Break It: the pure half. Tool definitions, which targets a tool accepts,
 * what the action log currently leaves broken, how each logged action reads
 * as a sentence and how it's taken back, the "Try this" cards and which
 * fixes fit the current failure. No React, no DOM: every rule here is
 * unit-tested on its own and shared by the toolbox, the board targeting,
 * the action log and the Fix it panel.
 *
 * Every tool name here is a worker protocol `tool` value (the same words
 * the share link's action log carries), so an action is sent exactly as
 * it's described, never translated.
 */
import type { KitView, RemedyView, UserAction } from '../types';

/** The five faults the toolbox offers, in the design's order. */
export type BreakTool = 'kill' | 'spike' | 'partition' | 'slow' | 'flush';

export interface ToolDef {
  id: BreakTool;
  label: string;
  /** Shorter label for the phone chips. */
  chip: string;
  /** Registry combo (`command/keys.ts` spelling). */
  combo: string;
  /** Keycap text. */
  keyLabel: string;
  /** `aria-keyshortcuts` value. */
  ariaKey: string;
  /** What the tool needs picked on the board; `null` = applies to the whole system. */
  needs: 'node' | 'link' | 'node-or-link' | null;
  /** One line for the armed hint and tooltips. */
  hint: string;
}

export const TOOL_DEFS: readonly ToolDef[] = [
  { id: 'kill', label: 'Kill', chip: 'Kill', combo: 'k', keyLabel: 'K', ariaKey: 'K', needs: 'node', hint: 'Take a node down completely' },
  { id: 'spike', label: 'Spike', chip: 'Spike', combo: 'arrowup', keyLabel: '↑', ariaKey: 'ArrowUp', needs: null, hint: 'Multiply incoming traffic' },
  { id: 'partition', label: 'Partition', chip: 'Cut', combo: 'p', keyLabel: 'P', ariaKey: 'P', needs: 'link', hint: 'Cut a link between two nodes' },
  { id: 'slow', label: 'Slow', chip: 'Slow', combo: 's', keyLabel: 'S', ariaKey: 'S', needs: 'node-or-link', hint: 'Make a node or link slower' },
  { id: 'flush', label: 'Flush', chip: 'Flush', combo: 'f', keyLabel: 'F', ariaKey: 'F', needs: 'node', hint: 'Empty a cache or CDN' },
];

/** How much slower the Slow tool makes its target. */
export const SLOW_FACTOR = 5;
/** Spike slider default, before the diagram's own idea (if any) sets one. */
export const DEFAULT_SPIKE = 10;

/** The tools this diagram offers, in toolbox order. */
export function offeredTools(kit: KitView | undefined): ToolDef[] {
  if (!kit) return [];
  return TOOL_DEFS.filter((t) => kit.verbs.includes(t.id));
}

export function toolDef(id: BreakTool): ToolDef {
  return TOOL_DEFS.find((t) => t.id === id)!;
}

// ---------------------------------------------------------------------------
// Targets
// ---------------------------------------------------------------------------

export interface TargetNode {
  id: string;
  text: string;
  form: string;
}
export interface TargetLink {
  id: string;
  a: string;
  b: string;
}
/** The board's breakable elements, as the toolbox and the log need them (names, kinds, endpoints). */
export interface TargetCatalog {
  nodes: readonly TargetNode[];
  links: readonly TargetLink[];
}

export type BoardTarget = { kind: 'node' | 'link'; id: string };

const CACHE_FORMS = new Set(['cache', 'cdn']);

export function isCacheForm(form: string | undefined): boolean {
  return form !== undefined && CACHE_FORMS.has(form);
}

/** Why a tool can't be used on a target, or `null` when it can. Short enough for a toast. */
export function whyNot(tool: BreakTool, target: BoardTarget, catalog: TargetCatalog, kit: KitView | undefined): string | null {
  const def = toolDef(tool);
  if (!def.needs) return 'Spike applies to the whole system';
  const lock = kit?.locks.find(([id]) => id === target.id);
  if (lock && !lock[1].includes(tool)) return lock[1].length === 0 ? 'This part can’t be broken' : `${def.label} doesn’t apply here`;
  if (target.kind === 'link') {
    if (def.needs === 'node') return `${def.label} works on nodes, not links`;
    return catalog.links.some((l) => l.id === target.id) ? null : 'Unknown link';
  }
  if (def.needs === 'link') return 'Partition works on links: pick a line between two nodes';
  const node = catalog.nodes.find((n) => n.id === target.id);
  if (!node) return 'Unknown node';
  if (node.form === 'client') return 'Clients are the load. They can’t be broken';
  if (tool === 'flush' && !isCacheForm(node.form)) return 'Flush works on caches and CDNs only';
  return null;
}

export function canTarget(tool: BreakTool, target: BoardTarget, catalog: TargetCatalog, kit: KitView | undefined): boolean {
  return whyNot(tool, target, catalog, kit) === null;
}

/** Every valid target for a tool, nodes first, for the keyboard target picker. */
export function targetsFor(tool: BreakTool, catalog: TargetCatalog, kit: KitView | undefined): BoardTarget[] {
  const out: BoardTarget[] = [];
  for (const n of catalog.nodes) if (canTarget(tool, { kind: 'node', id: n.id }, catalog, kit)) out.push({ kind: 'node', id: n.id });
  for (const l of catalog.links) if (canTarget(tool, { kind: 'link', id: l.id }, catalog, kit)) out.push({ kind: 'link', id: l.id });
  return out;
}

export function targetName(target: BoardTarget | { id: string }, catalog: TargetCatalog): string {
  const node = catalog.nodes.find((n) => n.id === target.id);
  if (node) return node.text;
  const link = catalog.links.find((l) => l.id === target.id);
  if (link) {
    const a = catalog.nodes.find((n) => n.id === link.a)?.text ?? link.a;
    const b = catalog.nodes.find((n) => n.id === link.b)?.text ?? link.b;
    return `${a} → ${b}`;
  }
  return target.id;
}

// ---------------------------------------------------------------------------
// Current faults, derived from the action log
// ---------------------------------------------------------------------------

export interface FaultState {
  killed: ReadonlySet<string>;
  cut: ReadonlySet<string>;
  /** Target id → slow factor (only entries other than 1). */
  slowed: ReadonlyMap<string, number>;
  /** Current traffic multiplier (1 = baseline). */
  spike: number;
  /** Caches flushed so far (one-shot: they refill on their own). */
  flushed: ReadonlySet<string>;
  /** Applied fix ids. */
  fixes: ReadonlySet<string>;
}

/** Folds the canonical action log into what's broken (and fixed) right now. */
export function deriveFaults(actions: readonly UserAction[]): FaultState {
  const killed = new Set<string>();
  const cut = new Set<string>();
  const slowed = new Map<string, number>();
  const flushed = new Set<string>();
  const fixes = new Set<string>();
  let spike = 1;
  for (const [, tool, target, value] of actions) {
    switch (tool) {
      case 'kill':
        if (target) killed.add(target);
        break;
      case 'restore':
        if (target) killed.delete(target);
        break;
      case 'partition':
        if (target) cut.add(target);
        break;
      case 'heal':
        if (target) cut.delete(target);
        break;
      case 'slow':
        if (target && typeof value === 'number') {
          if (value === 1) slowed.delete(target);
          else slowed.set(target, value);
        }
        break;
      case 'flush':
        if (target) flushed.add(target);
        break;
      case 'spike':
        if (typeof value === 'number') spike = value;
        break;
      case 'intervention':
        if (target) fixes.add(target);
        break;
    }
  }
  return { killed, cut, slowed, spike, flushed, fixes };
}

/** True when anything is currently broken (fixes and one-shot flushes don't count). */
export function hasActiveFault(f: FaultState): boolean {
  return f.killed.size > 0 || f.cut.size > 0 || f.slowed.size > 0 || f.spike !== 1;
}

// ---------------------------------------------------------------------------
// The action log, as read by a person
// ---------------------------------------------------------------------------

export function formatMultiplier(v: number): string {
  return `${Number.isInteger(v) ? v : v.toFixed(1)}×`;
}

export function describeAction(action: UserAction, catalog: TargetCatalog, remedies: readonly RemedyView[]): string {
  const [, tool, target, value] = action;
  const name = target ? targetName({ id: target }, catalog) : '';
  switch (tool) {
    case 'kill':
      return `Killed ${name}`;
    case 'restore':
      return `Restored ${name}`;
    case 'partition':
      return `Cut ${name}`;
    case 'heal':
      return `Healed ${name}`;
    case 'slow':
      return value === 1 ? `${name} back to normal speed` : `Slowed ${name} ${formatMultiplier(Number(value))}`;
    case 'flush':
      return `Flushed ${name}`;
    case 'spike':
      return value === 1 ? 'Traffic back to 1×' : `Traffic ${formatMultiplier(Number(value))}`;
    case 'intervention':
      return `Applied: ${remedies.find((r) => r.id === target)?.text ?? target}`;
    case 'degrade':
      return `Degraded ${name}`;
    default:
      return tool;
  }
}

/**
 * How to take one logged action back, or `null` when it can't be (a flush
 * refills on its own; an entry already undone by a later one). A fault is
 * taken back by its own inverse move, which joins the log like any other
 * action; a fix is taken back by rebuilding the run without it (`replay`).
 */
export type UndoPlan = { kind: 'inverse'; tool: string; target: string | null; value: number | null } | { kind: 'replay'; index: number };

export function undoPlan(actions: readonly UserAction[], index: number): UndoPlan | null {
  const action = actions[index];
  if (!action) return null;
  const [, tool, target, value] = action;
  const later = actions.slice(index + 1);
  const f = deriveFaults(actions);
  switch (tool) {
    case 'kill':
      return target && f.killed.has(target) && !later.some((a) => a[1] === 'kill' && a[2] === target)
        ? { kind: 'inverse', tool: 'restore', target, value: null }
        : null;
    case 'partition':
      return target && f.cut.has(target) && !later.some((a) => a[1] === 'partition' && a[2] === target)
        ? { kind: 'inverse', tool: 'heal', target, value: null }
        : null;
    case 'slow':
      return target && value !== 1 && f.slowed.get(target) === value && !later.some((a) => a[1] === 'slow' && a[2] === target)
        ? { kind: 'inverse', tool: 'slow', target, value: 1 }
        : null;
    case 'spike':
      return value !== 1 && !later.some((a) => a[1] === 'spike') ? { kind: 'inverse', tool: 'spike', target: null, value: 1 } : null;
    case 'intervention':
      return { kind: 'replay', index };
    default:
      return null;
  }
}

/** The log without one entry: what a fix's revert replays. */
export function withoutEntry(actions: readonly UserAction[], index: number): UserAction[] {
  return actions.filter((_, i) => i !== index);
}

/** Index of the entry that applied a fix, or -1. */
export function fixEntryIndex(actions: readonly UserAction[], fixId: string): number {
  for (let i = actions.length - 1; i >= 0; i--) if (actions[i][1] === 'intervention' && actions[i][2] === fixId) return i;
  return -1;
}

// ---------------------------------------------------------------------------
// "Try this" cards
// ---------------------------------------------------------------------------

export interface TryCard {
  key: string;
  text: string;
  tool: BreakTool;
  target: string | null;
  value: number | null;
}

const MAX_TRY_CARDS = 3;

/**
 * The diagram’s own ideas first, then generic ones for what it has:
 * flushing a cache or CDN no card covers yet. Only tools the diagram
 * offers, only targets that accept them.
 */
export function tryCards(kit: KitView | undefined, catalog: TargetCatalog): TryCard[] {
  if (!kit) return [];
  const offered = new Set(offeredTools(kit).map((t) => t.id));
  const out: TryCard[] = [];
  for (const chip of kit.chips) {
    if (!offered.has(chip.verb as BreakTool)) continue;
    const tool = chip.verb as BreakTool;
    const target = chip.el ?? null;
    if (toolDef(tool).needs && (!target || !canTarget(tool, targetKind(target, catalog), catalog, kit))) continue;
    const value = tool === 'spike' ? (chip.amt ?? DEFAULT_SPIKE) : tool === 'slow' ? (chip.amt ?? SLOW_FACTOR) : null;
    out.push({ key: `${tool}:${target ?? ''}`, text: chip.text, tool, target, value });
  }
  if (offered.has('flush')) {
    for (const n of catalog.nodes) {
      if (!isCacheForm(n.form) || out.some((s) => s.target === n.id && s.tool === 'flush')) continue;
      if (!canTarget('flush', { kind: 'node', id: n.id }, catalog, kit)) continue;
      out.push({ key: `flush:${n.id}`, text: `Flush the ${n.text}`, tool: 'flush', target: n.id, value: null });
    }
  }
  return out.slice(0, MAX_TRY_CARDS);
}

function targetKind(id: string, catalog: TargetCatalog): BoardTarget {
  return catalog.links.some((l) => l.id === id) ? { kind: 'link', id } : { kind: 'node', id };
}

// ---------------------------------------------------------------------------
// Fixes that fit the current failure
// ---------------------------------------------------------------------------

/**
 * Fix categories aimed squarely at what's broken right now: a lost or cold
 * cache wants a caching fix; a lost service, more capacity or resilience; a
 * spike, capacity; a slow part, resilience; a cut link, resilience (and
 * caching when the link leads to a cache). Empty when nothing is broken.
 */
export function fittingNatures(f: FaultState, catalog: TargetCatalog): ReadonlySet<string> {
  const out = new Set<string>();
  const formOf = (id: string) => catalog.nodes.find((n) => n.id === id)?.form;
  for (const id of f.killed) {
    if (isCacheForm(formOf(id))) out.add('caching');
    else ['scale', 'resilience'].forEach((n) => out.add(n));
  }
  if (f.spike > 1) ['scale', 'data'].forEach((n) => out.add(n));
  if (f.slowed.size > 0) out.add('resilience');
  for (const id of f.cut) {
    out.add('resilience');
    const link = catalog.links.find((l) => l.id === id);
    if (link && (isCacheForm(formOf(link.a)) || isCacheForm(formOf(link.b)))) out.add('caching');
  }
  return out;
}
