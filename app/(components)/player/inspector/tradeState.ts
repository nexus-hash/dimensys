import type { SwitchView, UserAction } from '../types';

/** The share-log tool name a live switch flip is recorded under. */
export const TOGGLE_TOOL = 'toggle';

/** The option a switch starts on: the one marked `on`, else the first. */
export function defaultOptionId(sw: SwitchView): string {
  return (sw.opts.find((o) => o.on) ?? sw.opts[0])?.id ?? '';
}

/**
 * The option the live run is on: the last accepted flip of this switch in
 * the worker-stamped action log, or the default when there is none (a fresh
 * run, or after Reset cleared the log). A logged option id this view doesn't
 * know is ignored.
 */
export function activeOptionId(actions: readonly UserAction[], sw: SwitchView): string {
  for (let i = actions.length - 1; i >= 0; i--) {
    const [, tool, target, value] = actions[i];
    if (tool === TOGGLE_TOOL && target === sw.id && typeof value === 'string' && sw.opts.some((o) => o.id === value)) return value;
  }
  return defaultOptionId(sw);
}

export interface TradeRow {
  label: string;
  /** One score per option (same order as `sw.opts`), `null` where that option doesn't rate this axis. */
  scores: Array<number | null>;
}

/** Every axis any option rates, in first-appearance order, with each option's score. */
export function tradeRows(sw: SwitchView): TradeRow[] {
  const labels: string[] = [];
  for (const opt of sw.opts) for (const [axis] of opt.axes ?? []) if (!labels.includes(axis)) labels.push(axis);
  return labels.map((label) => ({
    label,
    scores: sw.opts.map((opt) => opt.axes?.find(([axis]) => axis === label)?.[1] ?? null),
  }));
}
