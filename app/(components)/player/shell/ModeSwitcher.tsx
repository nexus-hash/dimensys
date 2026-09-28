'use client';

import { SegmentedControl, Kbd } from '@/app/(components)/ui';
import { useShortcut } from '@/app/(components)/command';
import { usePlayerStore, usePlayerStoreApi } from '../store/PlayerStoreProvider';
import type { PlayerMode } from '../store/playerStore';
import { MODE_DEFS, type ModeAvailability } from './modes';

export interface ModeSwitcherProps {
  availability: Record<PlayerMode, ModeAvailability>;
}

/**
 * The mode segmented control, wired to the store: `mode` (T3.16's own
 * slice — URL sync is T3.12's job, see `PlayerShell`'s hook comment).
 * Switching modes only ever writes `mode`; it never touches `selection`
 * (switching modes keeps the camera and selection).
 *
 * Digits 1–4 are registered one at a time (not looped over `MODE_DEFS`) so
 * each call site is a plain, statically-shaped `useShortcut` — safe under
 * the rules-of-hooks lint rule, which can't see that the array is a fixed
 * module-level constant.
 */
export function ModeSwitcher({ availability }: ModeSwitcherProps) {
  const mode = usePlayerStore((s) => s.mode);
  const store = usePlayerStoreApi();

  function trySetMode(id: PlayerMode) {
    if (availability[id] !== 'available') return;
    store.setState({ mode: id });
  }

  const explore = MODE_DEFS[0];
  const breakIt = MODE_DEFS[1];
  const walkthrough = MODE_DEFS[2];
  const build = MODE_DEFS[3];

  useShortcut(
    { id: 'player:mode-explore', keys: explore.digit, label: 'Switch to Explore', group: 'Player', when: 'player', hidden: availability.explore !== 'available' },
    () => trySetMode('explore'),
  );
  useShortcut(
    { id: 'player:mode-break', keys: breakIt.digit, label: 'Switch to Break it', group: 'Player', when: 'player', hidden: availability.break !== 'available' },
    () => trySetMode('break'),
  );
  useShortcut(
    {
      id: 'player:mode-walkthrough',
      keys: walkthrough.digit,
      label: 'Switch to Walkthrough',
      group: 'Player',
      when: 'player',
      hidden: availability.walkthrough !== 'available',
    },
    () => trySetMode('walkthrough'),
  );
  useShortcut(
    { id: 'player:mode-build', keys: build.digit, label: 'Switch to Build', group: 'Player', when: 'player', hidden: availability.build !== 'available' },
    () => trySetMode('build'),
  );

  const visible = MODE_DEFS.filter((m) => availability[m.id] !== 'hidden');

  return (
    <div className="player-mode-switcher">
      <SegmentedControl
        aria-label="Mode"
        value={mode}
        onValueChange={(value) => trySetMode(value as PlayerMode)}
        options={visible.map((m) => ({
          value: m.id,
          label: m.label,
          disabled: availability[m.id] === 'disabled',
          hint: (
            <span aria-hidden="true">
              <Kbd className="mode-kbd-hint ml-1.5">{m.digit}</Kbd>
            </span>
          ),
        }))}
      />
    </div>
  );
}
