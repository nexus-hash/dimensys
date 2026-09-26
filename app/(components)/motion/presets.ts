/**
 * One named preset per signature moment in the motion guidelines. Every
 * timing value here is *derived* from the four duration tokens and the two
 * spring tokens (see `tokens.ts`) — never a new hard-coded millisecond
 * literal — even where a moment's natural interval (a stagger step, a
 * slightly longer fade) doesn't equal a token exactly; those are expressed
 * as a fraction/multiple of one.
 *
 * Every preset also carries a `reduced` variant: per the reduced-motion
 * rule, springs collapse to a short (`micro`) fade, and anything that would
 * otherwise pulse or loop settles to a steady state instead.
 */

import { type DurationToken, type EaseToken, type SpringToken, durationMs } from './tokens';

export type StageDuration = DurationToken | { fractionOf: DurationToken; factor: number };

export interface MotionStage {
  /** Neutral label for this beat, e.g. "ink flash", "hatch fade in". */
  name: string;
  duration: StageDuration;
  /** Cumulative delay before this stage starts. Same shape as `duration`; omitted = 0. */
  delay?: StageDuration;
  easing?: EaseToken;
  /** Set when a stage is driven by a spring rather than a CSS easing curve. */
  spring?: SpringToken;
}

export type ReducedMode = 'fade' | 'steady' | 'instant';

export interface ReducedVariant {
  mode: ReducedMode;
  /** Only meaningful for `mode: 'fade'`. */
  duration?: DurationToken;
  /** Neutral description of the reduced-motion behavior, shown in the gallery. */
  description: string;
}

export interface MotionPreset {
  id: string;
  /** The signature moment this preset choreographs. */
  moment: string;
  /** Neutral one-line description of the full-motion choreography. */
  summary: string;
  stages: MotionStage[];
  reduced: ReducedVariant;
}

/** Resolves a `StageDuration` (a token, or a fraction/multiple of one) to milliseconds. */
export function resolveMs(value: StageDuration): number {
  if (typeof value === 'string') return durationMs(value);
  return Math.round(durationMs(value.fractionOf) * value.factor);
}

/** Total wall-clock length of a preset's full-motion choreography, in milliseconds. */
export function presetTotalMs(preset: MotionPreset): number {
  return preset.stages.reduce((max, stage) => {
    const delayMs = stage.delay ? resolveMs(stage.delay) : 0;
    return Math.max(max, delayMs + resolveMs(stage.duration));
  }, 0);
}

/** The effective duration (ms) to actually animate a preset with, given a reduced-motion state. */
export function effectiveDurationMs(preset: MotionPreset, reduced: boolean): number {
  if (!reduced) return presetTotalMs(preset);
  if (preset.reduced.mode === 'instant') return 0;
  if (preset.reduced.mode === 'steady') return 0;
  return durationMs(preset.reduced.duration ?? 'micro');
}

const zero: StageDuration = { fractionOf: 'micro', factor: 0 };

export const MOTION_PRESETS: MotionPreset[] = [
  {
    id: 'card-to-player',
    moment: 'Catalog card opens into the player',
    summary: 'A view-transition morph grows the catalog thumbnail into the canvas; the surrounding chrome fades in just after.',
    stages: [
      { name: 'shared-element morph', duration: 'scene', easing: 'emphasized' },
      { name: 'chrome fade in', duration: 'micro', delay: 'micro', easing: 'standard' },
    ],
    reduced: { mode: 'fade', duration: 'micro', description: 'Crossfade only — no growth/morph, chrome appears with the canvas.' },
  },
  {
    id: 'node-critical',
    moment: 'A node goes critical',
    summary: 'The health ring draws in, the glyph springs into place, and the metric chip slides up as it appears; a pulse continues only while the metric keeps worsening.',
    stages: [
      { name: 'ring draw', duration: 'small', easing: 'standard' },
      { name: 'glyph pop', duration: { fractionOf: 'small', factor: 1 }, delay: zero, spring: 'ui' },
      { name: 'chip slide up', duration: 'small', delay: zero, easing: 'emphasized' },
    ],
    reduced: { mode: 'fade', duration: 'micro', description: 'Ring, glyph and chip fade to their end state with no draw/slide/pulse; the ring renders at full stroke weight instead of pulsing.' },
  },
  {
    id: 'requests-failing',
    moment: 'Requests on a link start failing',
    summary: 'Particles decelerate, turn the critical color and fall away as their opacity drops to zero.',
    stages: [{ name: 'decelerate + recolor + fall away', duration: { fractionOf: 'panel', factor: 15 / 16 }, easing: 'exit' }],
    reduced: { mode: 'steady', description: 'Failing particles stop animating and render as a static dashed flow indicator in the critical color.' },
  },
  {
    id: 'retry-storm',
    moment: 'A retry storm starts',
    summary: 'Hollow rings spawn at the caller at the current retry rate, visibly outnumbering the normal request dots.',
    stages: [{ name: 'ring spawn cadence', duration: 'small', easing: 'standard' }],
    reduced: { mode: 'steady', description: 'A single static hollow ring marks the retrying link instead of a spawn cadence.' },
  },
  {
    id: 'kill',
    moment: 'A component is killed',
    summary: 'A brief ink flash on the node, then it desaturates as a hatch texture fades in over it.',
    stages: [
      { name: 'ink flash', duration: 'micro', easing: 'standard' },
      { name: 'desaturate + hatch fade in', duration: { fractionOf: 'panel', factor: 1.25 }, delay: 'micro', easing: 'standard' },
    ],
    reduced: { mode: 'fade', duration: 'micro', description: 'The node steps straight to its down state (desaturated, hatch visible) with one short fade — no flash.' },
  },
  {
    id: 'recover',
    moment: 'A fix is applied and the system recovers',
    summary: "Affected links' particles re-color back to the healthy flow color as metrics recover, while the HUD delta counts down toward baseline.",
    stages: [{ name: 're-color to healthy flow', duration: 'scene', easing: 'standard' }],
    reduced: { mode: 'fade', duration: 'small', description: 'Particles and the HUD delta jump to their recovered values over one short fade instead of animating the recovery continuously.' },
  },
  {
    id: 'drill-down',
    moment: 'Drilling into a subsystem',
    summary: 'The camera springs into the subsystem boundary, sibling nodes fade out, and the inner nodes stagger in.',
    stages: [
      { name: 'camera spring', duration: 'scene', spring: 'camera' },
      { name: 'siblings fade out', duration: 'small', easing: 'exit' },
      { name: 'inner node 1 stagger', duration: 'small', delay: { fractionOf: 'small', factor: 1 / 10 }, easing: 'emphasized' },
      { name: 'inner node 2 stagger', duration: 'small', delay: { fractionOf: 'small', factor: 2 / 10 }, easing: 'emphasized' },
      { name: 'inner node 3 stagger', duration: 'small', delay: { fractionOf: 'small', factor: 3 / 10 }, easing: 'emphasized' },
    ],
    reduced: { mode: 'fade', duration: 'micro', description: 'The camera cuts straight to the boundary (no spring/stagger); siblings and inner nodes crossfade together over one short fade.' },
  },
  {
    id: 'checkpoint-open',
    moment: 'A checkpoint decision opens',
    summary: 'The canvas dims, the decision card rises with a fade, and its choices stagger in.',
    stages: [
      { name: 'canvas dim', duration: 'small', easing: 'standard' },
      { name: 'card rise + fade', duration: 'panel', delay: zero, easing: 'emphasized' },
      { name: 'choice 1 stagger', duration: 'small', delay: { fractionOf: 'panel', factor: 3 / 32 }, easing: 'emphasized' },
      { name: 'choice 2 stagger', duration: 'small', delay: { fractionOf: 'panel', factor: 6 / 32 }, easing: 'emphasized' },
      { name: 'choice 3 stagger', duration: 'small', delay: { fractionOf: 'panel', factor: 9 / 32 }, easing: 'emphasized' },
    ],
    reduced: { mode: 'fade', duration: 'micro', description: 'The dim, card and choices all fade to their open state together, with no rise or stagger.' },
  },
  {
    id: 'mode-switch',
    moment: 'Switching player modes',
    summary: 'The chrome crossfades and slides to the new mode; the canvas itself is untouched.',
    stages: [{ name: 'chrome crossfade + slide', duration: 'panel', easing: 'standard' }],
    reduced: { mode: 'fade', duration: 'micro', description: 'The chrome crossfades in place with no slide.' },
  },
  {
    id: 'theme-switch',
    moment: 'Switching light/dark theme',
    summary: 'A view-transition crossfade swaps every token-driven surface to the new theme.',
    stages: [{ name: 'crossfade', duration: 'small', easing: 'standard' }],
    reduced: { mode: 'instant', description: 'The theme swaps with no transition (also the automatic behavior when the platform view-transition API is unavailable).' },
  },
  {
    id: 'number-roll',
    moment: 'A live number updates',
    summary: 'Tabular digits roll to the new value; ordinary ticks are near-instant, and a large jump (10x or more) animates instead of snapping.',
    stages: [{ name: 'digit roll (large jump)', duration: { fractionOf: 'small', factor: 3 / 4 }, easing: 'standard' }],
    reduced: { mode: 'instant', description: 'The value swaps to its new digits immediately, with no roll, regardless of jump size.' },
  },
  {
    id: 'caption-inout',
    moment: 'A caption or narration card enters/leaves',
    summary: 'The docked card rises and fades in on entry, and fades down and out on exit.',
    stages: [
      { name: 'in: rise + fade', duration: 'panel', easing: 'emphasized' },
      { name: 'out: fade + settle', duration: 'small', easing: 'exit' },
    ],
    reduced: { mode: 'fade', duration: 'micro', description: 'The card appears/disappears with a plain short fade — no rise or settle motion.' },
  },
  {
    id: 'share-success',
    moment: 'A share/copy action succeeds',
    summary: 'A small confirmation glyph pops in next to the action and settles, then fades once acknowledged.',
    stages: [
      { name: 'glyph pop', duration: 'micro', spring: 'ui' },
      { name: 'settle + hold', duration: 'panel', delay: 'micro' },
    ],
    reduced: { mode: 'fade', duration: 'micro', description: 'The confirmation glyph fades in and out directly, with no spring pop.' },
  },
];

export function getPreset(id: string): MotionPreset | undefined {
  return MOTION_PRESETS.find((p) => p.id === id);
}
