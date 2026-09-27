/**
 * Mode switcher data (T3.16). Pure and server-safe: `modeAvailability` reads
 * only the slices of `ViewData` that say whether a mode applies to this
 * diagram at all, so the server can compute it once and hand a small plain
 * object across the client boundary instead of the whole document.
 */
import type { PlayerMode } from '../store/playerStore';
import type { ViewData } from '../types';

export type ModeAvailability = 'available' | 'disabled' | 'hidden';

export interface ModeDef {
  id: PlayerMode;
  label: string;
  /** Registry shortcut key (Interview isn't part of this task's switcher). */
  digit: string;
}

/** Visible order (Interview is a separate mode the schema supports but this task's switcher doesn't render — see the shell report). */
export const MODE_DEFS: readonly ModeDef[] = [
  { id: 'explore', label: 'Explore', digit: '1' },
  { id: 'break', label: 'Break it', digit: '2' },
  { id: 'walkthrough', label: 'Walkthrough', digit: '3' },
  { id: 'build', label: 'Build', digit: '4' },
];

/**
 * Modes the diagram doesn't support are hidden, not disabled. Build
 * mode is the one exception — it's a real destination the schema and store
 * already support, just not one this task builds the canvas for yet, so it
 * shows *disabled* (a future capability, not an absent one) rather than
 * hidden.
 */
export function modeAvailability(diagram: Pick<ViewData, 'kit' | 'stories'>): Record<PlayerMode, ModeAvailability> {
  return {
    explore: 'available',
    break: diagram.kit ? 'available' : 'hidden',
    walkthrough: diagram.stories.length > 0 ? 'available' : 'hidden',
    build: 'disabled',
    interview: 'hidden',
  };
}
