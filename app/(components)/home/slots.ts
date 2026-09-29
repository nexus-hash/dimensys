/**
 * Home hero — deliberately inert slots (HOME2).
 *
 * The hero (`Hero.tsx`) ships its full visual chrome now, per the approved
 * design, but several of its controls have no feature behind them yet.
 * Rather than scatter that reasoning across JSX comments, every such slot
 * is listed here once, with the data-attribute or aria pattern used to mark
 * it and which future task is expected to wire it.
 *
 * Marking convention:
 *   - `aria-disabled="true"` (never the native `disabled` attribute, so the
 *     control stays keyboard-reachable and announced, per the accessibility spec).
 *   - a `title`/tooltip reading "<action> — coming soon".
 *   - a stable `data-slot="<name>"` for the task that will wire it to find
 *     and replace, without hunting through the JSX.
 *
 * Slots:
 *   - `data-slot="hero-kill-cache"` / `"hero-10x-traffic"` — now wired
 *     (`HeroBreakActions`): they run the same worker actions as the full
 *     player's Break it tools, and are no longer inert.
 *   - `data-slot="hero-pause"`        — the hero card's pause/play control.
 *     Needs the shared sim-playback control T3.8 is building for the full
 *     player's HUD/timeline shell.
 *   - `data-slot="hero-speed"`        — the "simulated · 1×" speed readout.
 *     Same owner as `hero-pause`.
 *   - `data-slot="hero-replay-tour"`  — "Replay tour" status-line link.
 *     Restarts the hero's first-visit caption tour; depends on that
 *     tour existing, which is a separate task.
 *   - Navbar `Streak` and `Avatar` (see their own files) are the equivalent
 *     inert slots outside the hero, both waiting on an accounts system.
 */
export const HERO_SLOTS = [
  'hero-pause',
  'hero-speed',
  'hero-replay-tour',
] as const;

export type HeroSlot = (typeof HERO_SLOTS)[number];
