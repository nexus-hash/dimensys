/**
 * What a share link asks for, resolved against the diagram on screen.
 * Pure: the controller applies the plan; tests check it without a DOM.
 */
import type { PlayerMode, PlayerState, Selection } from '../store/playerStore';
import type { ModeAvailability } from '../shell/modes';
import type { ElementIndex } from '../shell/selection';
import type { Speed } from '../worker/protocol';
import type { UserAction } from '../types';
import type { DecodedShare, ShareCamera, ShareState } from './codec';

interface Walkthroughish {
  id: string;
  steps: ReadonlyArray<{ id: string }>;
}

export interface RestoreContext {
  revision: number;
  walkthroughs: readonly Walkthroughish[];
  elements: Pick<ElementIndex, 'nodes' | 'links' | 'groups'>;
  modes: Record<PlayerMode, ModeAvailability>;
  /** Scenario ids the player can open from a link (none until scenarios can be). */
  scenarios?: readonly string[];
}

export interface RestorePlan {
  mode: PlayerMode;
  walkthrough: { id: string; stepIndex: number } | null;
  /** A scenario the link names, with its checkpoint answers: for the scenario player to open. */
  scenario: { id: string; choices: Record<string, string | null> } | null;
  selection: Selection;
  /** The run to rebuild; `null` = the plain healthy start. */
  sim: { actions: UserAction[]; t: number; playing: boolean; speed: Speed } | null;
  camera: ShareCamera | null;
  /** The link was made on another revision of the diagram (`older` is the usual case). */
  stale: 'older' | 'newer' | false;
  /** Parts of the link that couldn't be restored (besides actions: the worker reports those). */
  lost: string[];
}

/** Resolves `v`/`st` to a walkthrough and step index: `st` is a step id or a 1-based number. */
export function resolveWalkthrough(walkthroughs: readonly Walkthroughish[], view: string | undefined, step: string | undefined): { id: string; stepIndex: number } | null {
  if (!view) return null;
  const wt = walkthroughs.find((w) => w.id === view);
  if (!wt || wt.steps.length === 0) return null;
  if (!step) return { id: wt.id, stepIndex: 0 };
  const byId = wt.steps.findIndex((s) => s.id === step);
  if (byId >= 0) return { id: wt.id, stepIndex: byId };
  if (/^\d+$/.test(step)) return { id: wt.id, stepIndex: Math.min(Math.max(Number(step), 1), wt.steps.length) - 1 };
  return { id: wt.id, stepIndex: 0 };
}

export function planRestore(decoded: DecodedShare, ctx: RestoreContext): RestorePlan {
  const s: ShareState = decoded.state;
  const lost = [...decoded.dropped.filter((k) => k !== 'a' && k !== 's')];
  const available = (m: PlayerMode) => ctx.modes[m] === 'available';

  const walkthrough = available('walkthrough') ? resolveWalkthrough(ctx.walkthroughs, s.view, s.step) : null;
  const scenario =
    !walkthrough && s.view && ctx.scenarios?.includes(s.view) ? { id: s.view, choices: s.choices ?? {} } : null;
  if (s.view && !walkthrough && !scenario) lost.push('v');

  let mode: PlayerMode = 'explore';
  if (walkthrough) mode = 'walkthrough';
  else if (s.mode && s.mode !== 'walkthrough') {
    if (available(s.mode)) mode = s.mode;
    else lost.push('m');
  }

  let selection: Selection = null;
  if (s.selection) {
    const { kind, id } = s.selection;
    const known = kind === 'node' ? ctx.elements.nodes.has(id) : kind === 'link' ? ctx.elements.links.has(id) : ctx.elements.groups.has(id);
    if (known) selection = { kind, id };
    else lost.push('sel');
  }

  const actions = s.actions ?? [];
  const playing = s.playing ?? true;
  const speed = s.speed ?? 1;
  const t = s.t ?? 0;
  const sim = scenario || actions.length > 0 || t > 0 || !playing || speed !== 1 ? { actions, t, playing, speed } : null;

  return {
    mode,
    walkthrough,
    scenario,
    selection,
    sim,
    camera: s.camera ?? null,
    stale: s.rev === undefined || s.rev === ctx.revision ? false : s.rev < ctx.revision ? 'older' : 'newer',
    lost,
  };
}

/** The share state for what's on screen now. `camera` is the user's own view, or `null` while it's the fitted one. */
export function captureShare(
  state: Pick<PlayerState, 'revision' | 'mode' | 'selection' | 'walkthrough' | 'sim' | 'actions' | 'story'>,
  walkthroughs: readonly Walkthroughish[],
  camera: ShareCamera | null,
  choices?: Record<string, string | null>,
): ShareState {
  const out: ShareState = { rev: state.revision };
  if (state.mode !== 'explore' && state.mode !== 'build' && state.mode !== 'interview') out.mode = state.mode;
  const wt = state.mode === 'walkthrough' ? walkthroughs.find((w) => w.id === state.walkthrough.id) : undefined;
  if (wt) {
    out.view = wt.id;
    out.step = wt.steps[state.walkthrough.stepIndex]?.id;
  } else if (state.story.scenarioId) {
    out.view = state.story.scenarioId;
    if (choices && Object.keys(choices).length) out.choices = choices;
  }
  if (state.selection && state.selection.kind !== 'flow') out.selection = { kind: state.selection.kind, id: state.selection.id };
  // Never before the last action: the rebuild only runs actions up to its time.
  const frameT = state.sim.frame?.t;
  const lastT = state.actions.length ? state.actions[state.actions.length - 1][0] : undefined;
  if (frameT !== undefined || lastT !== undefined) out.t = Math.max(frameT ?? 0, lastT ?? 0);
  if (state.sim.status === 'ready' || state.sim.status === 'loading') {
    if (!state.sim.playing) out.playing = false;
    if (state.sim.speed !== 1) out.speed = state.sim.speed;
  }
  if (state.actions.length) out.actions = [...state.actions];
  if (camera) out.camera = camera;
  return out;
}

/** The notice a restored link earns, if any: honest about what didn't come back. */
export function restoreNotice(plan: Pick<RestorePlan, 'stale' | 'lost'>, skippedActions: number): { title: string; description?: string } | null {
  const partial = skippedActions > 0 || plan.lost.length > 0;
  const what =
    skippedActions > 0
      ? `${skippedActions === 1 ? 'One action' : `${skippedActions} actions`} couldn’t be replayed.`
      : partial
        ? 'Part of it couldn’t be restored.'
        : undefined;
  if (plan.stale) {
    return {
      title: `This link was made on ${plan.stale === 'older' ? 'an older' : 'a newer'} version of the diagram`,
      description: what ?? 'Everything in it replayed, but the numbers may differ from what was shared.',
    };
  }
  if (partial) return { title: 'Some of this link couldn’t be restored', description: what };
  return null;
}
