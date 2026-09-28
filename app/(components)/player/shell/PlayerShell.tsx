'use client';

import * as React from 'react';
import { useShortcut, useShortcutScope } from '@/app/(components)/command';
import { usePlayerStore } from '../store/PlayerStoreProvider';
import type { PlayerMode } from '../store/playerStore';
import { TopBar } from './TopBar';
import { LeftRail } from './LeftRail';
import { HudTimelineFrame } from './HudTimelineFrame';
import { PhoneSheet, SNAP_PERCENTS } from './PhoneSheet';
import type { ElementIndex } from './selection';
import type { ModeAvailability } from './modes';
import type { GaugeView, KitView, NeedView, PlayView, RemedyView, SwitchView, KnobView } from '../types';
import { BreakController, BreakDataProvider, RightColumn, useBreakUi } from '../breakit';
import type { TargetCatalog } from '../breakit/tools';
import { WalkthroughProvider, type WalkthroughData } from '../walkthrough/WalkthroughContext';
import { WalkthroughController } from '../walkthrough/WalkthroughController';
import { ShareController } from '../share/ShareController';
import type { WalkthroughView } from '../walkthrough/model';
import type { RailData } from '../rail/data';
import { StoryController, StoryProvider, type StoryData } from '../story';

export interface PlayerShellProps {
  title: string;
  elementIndex: ElementIndex;
  modeAvailability: Record<PlayerMode, ModeAvailability>;
  /** Every node's/link's pre-rendered inspector body (T3.6), handed to both `Inspector` and `PhoneSheet` — see `DiagramPlayer.tsx`. Defaults to `{}` for callers (and existing tests) that don't pass one. */
  panels?: Record<string, React.ReactNode>;
  /** HUD tiles source (T3.8) — up to 4 shown; defaults to `[]` for callers/tests that don't pass one. */
  gauges?: readonly GaugeView[];
  /** Requirement badges source (T3.8); defaults to `[]`. */
  needs?: readonly NeedView[];
  /** Break it: the toolkit (absent = the diagram can't be broken), the fixes it offers and the board's breakable elements. */
  kit?: KitView;
  remedies?: readonly RemedyView[];
  catalog?: TargetCatalog;
  switches?: readonly SwitchView[];
  /** Scalable nodes, for plan steps that resize one. */
  knobs?: readonly KnobView[];
  /** Walkthroughs resolved against the board (`buildWalkthroughs`); defaults to none. */
  walkthroughs?: readonly WalkthroughView[];
  /** Their server-rendered narration (`buildWalkthroughNarration`). */
  narration?: Readonly<Record<string, React.ReactNode>>;
  /** The left rail's problem header, request paths and estimate (`buildRailData`). */
  rail?: RailData;
  /** Scenarios: free play and the authored, timed runs. Defaults to none. */
  plays?: readonly PlayView[];
  children: React.ReactNode;
}

/**
 * The player shell (T3.16): top bar, left rail, inspector frame, the HUD/
 * timeline frame around the board, and the phone bottom sheet — the frames
 * and slots the rest of the player fills in. `children` is the board itself
 * (`PlayerBlueprint`, server-rendered) and mounts inside the HUD/timeline
 * frame's board-wrap; `InteractiveLayer` (a sibling of this whole shell —
 * see `PlayerIsland.tsx`) keeps aligning its overlay canvas to the board's
 * own rect inside `data-player-root` regardless of what chrome
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
 * URL state: `ShareController` reads a share link into the store on load
 * and keeps the address bar on the current state; it needs nothing from
 * this file beyond the store, the element index and the mode list.
 *
 * `snapIndex` (the phone sheet's current snap point) is owned here, not by
 * `PhoneSheet`, so it can also drive `--player-sheet-peek` on this root —
 * the board-fit effect (`BoardStage`) measures the canvas area's free space
 * via a plain `ResizeObserver`, and that free space only shrinks correctly
 * when the sheet is dragged up to 50%/92% if the canvas area's own reserved
 * bottom padding tracks the sheet's *actual* current height, not just its
 * lowest (12%) snap point.
 */
export function PlayerShell({
  title,
  elementIndex,
  modeAvailability,
  panels = {},
  gauges = [],
  needs = [],
  kit,
  remedies = EMPTY_REMEDIES,
  catalog = EMPTY_CATALOG,
  switches,
  knobs,
  walkthroughs = NO_WALKTHROUGHS,
  narration = NO_NARRATION,
  rail,
  plays = NO_PLAYS,
  children,
}: PlayerShellProps) {
  const mode = usePlayerStore((s) => s.mode);
  const selection = usePlayerStore((s) => s.selection);
  const fixOpen = useBreakUi((s) => s.drawer) && mode === 'break';
  const [railOpen, setRailOpen] = React.useState(true);
  const [railDrawerOpen, setRailDrawerOpen] = React.useState(false);
  const [snapIndex, setSnapIndex] = React.useState(0);
  const shellRef = React.useRef<HTMLDivElement>(null);
  const breakAvailable = modeAvailability.break === 'available';
  const walkthroughData = React.useMemo<WalkthroughData>(
    () => ({ walkthroughs, narration, breakAvailable }),
    [walkthroughs, narration, breakAvailable],
  );
  const storyData = React.useMemo<StoryData>(() => {
    const names: Record<string, string> = {};
    for (const [id, n] of elementIndex.nodes) names[id] = n.text;
    for (const [id, f] of elementIndex.groups) names[id] = f.text;
    return { plays, gauges, names };
  }, [plays, gauges, elementIndex]);

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

  const sheetPeek = { '--player-sheet-peek': `${SNAP_PERCENTS[snapIndex]}dvh` } as React.CSSProperties;

  return (
    <WalkthroughProvider value={walkthroughData}>
    <StoryProvider value={storyData}>
    <BreakDataProvider kit={kit} remedies={remedies} needs={needs} catalog={catalog} switches={switches} knobs={knobs}>
    <div ref={shellRef} className="player-shell" data-player-mode={mode} style={sheetPeek}>
      <TopBar
        title={title}
        modeAvailability={modeAvailability}
        railOpen={railOpen}
        onToggleRail={toggleRail}
      />
      <main
        className="player-body"
        aria-label={title}
        data-rail-open={railOpen}
        data-rail-drawer-open={railDrawerOpen}
        data-inspector-open={selection !== null || fixOpen}
      >
        <LeftRail open={railDrawerOpen} onClose={toggleRail} needs={needs} rail={rail} />
        <HudTimelineFrame gauges={gauges}>{children}</HudTimelineFrame>
        <RightColumn elementIndex={elementIndex} panels={panels} />
      </main>
      <PhoneSheet
        elementIndex={elementIndex}
        panels={panels}
        gauges={gauges}
        needs={needs}
        rail={rail}
        snapIndex={snapIndex}
        onSnapIndexChange={setSnapIndex}
      />
      <BreakController />
      <WalkthroughController boardRootRef={shellRef} />
      <StoryController boardRootRef={shellRef} />
      <ShareController boardRootRef={shellRef} elements={elementIndex} modes={modeAvailability} />
    </div>
    </BreakDataProvider>
    </StoryProvider>
    </WalkthroughProvider>
  );
}

const EMPTY_REMEDIES: readonly RemedyView[] = [];
const EMPTY_CATALOG: TargetCatalog = { nodes: [], links: [] };
const NO_WALKTHROUGHS: readonly WalkthroughView[] = [];
const NO_NARRATION: Readonly<Record<string, React.ReactNode>> = {};
const NO_PLAYS: readonly PlayView[] = [];
