'use client';

import * as React from 'react';
import { useShortcut, useShortcutScope } from '@/app/(components)/command';
import { usePlayerStore } from '../store/PlayerStoreProvider';
import type { PlayerMode } from '../store/playerStore';
import { TopBar } from './TopBar';
import { LeftRail } from './LeftRail';
import { Inspector } from './Inspector';
import { HudTimelineFrame } from './HudTimelineFrame';
import { PhoneSheet } from './PhoneSheet';
import type { ElementIndex } from './selection';
import type { ModeAvailability } from './modes';

export interface PlayerShellProps {
  title: string;
  labelsById: Record<string, string>;
  elementIndex: ElementIndex;
  modeAvailability: Record<PlayerMode, ModeAvailability>;
  children: React.ReactNode;
}

/**
 * The player shell (T3.16): top bar, left rail, inspector frame, the HUD/
 * timeline frame around the board, and the phone bottom sheet — the frames
 * and slots the rest of the player fills in. `children` is the board itself
 * (`DrilldownBlueprint`, server-rendered) and mounts inside the HUD/timeline
 * frame's board-wrap; `InteractiveLayer` (a sibling of this whole shell —
 * see `PlayerIsland.tsx`) keeps aligning its overlay canvas to the active
 * level's own rect inside `data-player-root` regardless of what chrome
 * surrounds it, so nothing here has to know about it.
 *
 * Rail collapse and inspector-open are the only two bits of state this
 * component owns directly: chrome-only (never shared, never part of a
 * share link), so plain `useState`, not the store. Mode and selection are
 * both store slices already (T3.1); this file only reflects them onto the
 * DOM (`data-player-mode` — already set one level up on `data-player-root`,
 * kept here too for CSS scoped to the shell itself — and
 * `data-inspector-open` for the responsive CSS in `globals.css`).
 *
 * The rail toggle is *two* booleans, not one, because "open" means opposite
 * things at the two breakpoints where the same toggle (⌘B / the top bar
 * button) applies: on desktop the rail is a static column that starts shown
 * and can be collapsed, while on tablet/phone it's an overlay drawer that
 * starts closed and can be opened. One shared boolean can't default
 * correctly for both without detecting the breakpoint in JS (which risks a
 * hydration flash) — so `railOpen` (default `true`) drives the desktop
 * column via `data-rail-open`, `railDrawerOpen` (default `false`) drives the
 * tablet/phone overlay via `data-rail-drawer-open`, and one handler flips
 * both together since only one is ever visually relevant at a time.
 *
 * URL state (T3.12) hook: that task reads/writes `mode` (and `drill`,
 * `selection`) through the same store this shell reads — it doesn't need
 * anything from this file beyond the store already being there.
 */
export function PlayerShell({ title, labelsById, elementIndex, modeAvailability, children }: PlayerShellProps) {
  const mode = usePlayerStore((s) => s.mode);
  const selection = usePlayerStore((s) => s.selection);
  const [railOpen, setRailOpen] = React.useState(true);
  const [railDrawerOpen, setRailDrawerOpen] = React.useState(false);

  function toggleRail() {
    setRailOpen((open) => !open);
    setRailDrawerOpen((open) => !open);
  }

  useShortcutScope('player');
  useShortcut(
    { id: 'player:toggle-rail', keys: 'mod+b', label: 'Toggle left rail', group: 'Player', when: 'player' },
    (event) => {
      event.preventDefault();
      toggleRail();
    },
  );

  return (
    <div className="player-shell" data-player-mode={mode}>
      <TopBar
        title={title}
        labelsById={labelsById}
        modeAvailability={modeAvailability}
        railOpen={railOpen}
        onToggleRail={toggleRail}
      />
      <main
        className="player-body"
        aria-label={title}
        data-rail-open={railOpen}
        data-rail-drawer-open={railDrawerOpen}
        data-inspector-open={selection !== null}
      >
        <LeftRail open={railDrawerOpen} onClose={toggleRail} />
        <HudTimelineFrame>{children}</HudTimelineFrame>
        <Inspector elementIndex={elementIndex} />
      </main>
      <PhoneSheet elementIndex={elementIndex} />
    </div>
  );
}
