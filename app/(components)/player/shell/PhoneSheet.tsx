'use client';

import * as React from 'react';
import { BottomSheet, Tabs, TabsContent } from '@/app/(components)/ui';
import { usePlayerStore, usePlayerStoreApi } from '../store/PlayerStoreProvider';
import type { ElementIndex } from './selection';
import { selectionKindLabel, selectionTitle } from './selection';
import { InspectorHeader, InspectorBodySlot } from './InspectorHeader';
import { RailSections } from './LeftRail';
import { HudTiles } from '../hud/HudTiles';
import { EmptyInspectorBody } from '../inspector';
import type { GaugeView, NeedView } from '../types';
import { BreakPhoneFix, useBreakUi, breakUiFor, useIsPhone } from '../breakit';
import { CheckpointSlot, useActivePlay, useOpenAsk } from '../story';
import { useActiveWalkthrough } from '../walkthrough/WalkthroughContext';
import type { RailData } from '../rail/data';

type SheetTab = 'live' | 'guide' | 'inspect' | 'fix';

/** The spec's phone snap points, exported so `PlayerShell` can size the canvas area's reserved bottom space to match the *current* one, not just the lowest. */
export const SNAP_PERCENTS = [12, 50, 92];

export interface PhoneSheetProps {
  elementIndex: ElementIndex;
  /** Same pre-rendered bodies `Inspector` gets (T3.6) — the phone sheet's "Inspect" tab shows the identical content, just in this container instead of the desktop/tablet aside. */
  panels: Record<string, React.ReactNode>;
  /** HUD tiles source (T3.8), for this sheet's "Metrics" tab — same data `HudTimelineFrame` gets. */
  gauges?: readonly GaugeView[];
  /** Requirement badges source (T3.8), for the Guide tab's Problem section. */
  needs?: readonly NeedView[];
  /** The rail's content (`buildRailData`), for the Guide tab. */
  rail?: RailData;
  /** Controlled snap index — lifted to `PlayerShell` (T3.16) so it can also drive `--player-sheet-peek`, keeping the board-fit effect's measured free area in step with the sheet's *actual* current height instead of only its lowest snap point. */
  snapIndex: number;
  onSnapIndexChange: (index: number) => void;
}

/**
 * Phone chrome: below `sm` (<640px) the rail and the static inspector both
 * leave the layout (`globals.css`), and this bottom sheet holds what they
 * held, as four tabs at the 12/50/92% snap points:
 *
 * - **Live**: what's happening now — a scenario's checkpoint question and
 *   the live metric tiles (the walkthrough or scenario narration stays in
 *   the dock under the board, with its step controls).
 * - **Guide**: the rail's sections — the problem and its requirements, How
 *   it works, request paths, scenarios, walkthroughs and estimates.
 * - **Inspect**: the selected element's inspector (disabled until something
 *   is selected).
 * - **Fix it**: Break it's fixes, in Break it mode only.
 *
 * The sheet follows the player: a selection opens Inspect, the Fix it chip
 * opens Fix it, and a checkpoint question, a walkthrough or a scenario
 * starting opens Live — each raising the sheet to half height if it was
 * peeking. The board stays fitted above it via `--player-sheet-peek`, which
 * `PlayerShell` (the owner of `snapIndex`) keeps at the current snap point.
 *
 * `scrim={false}`: this sheet is permanent phone chrome, not a transient
 * drawer — its 12% peek must never dim the diagram. It ignores Radix's own
 * close attempts (outside click, Escape) by never lowering `open`; Escape
 * on phone instead clears the selection, as everywhere else.
 *
 * `showTitleBar={false}`: the tab strip is the sheet's header; `title`
 * still names the sheet for assistive tech.
 */
export function PhoneSheet({ elementIndex, panels, gauges = [], needs = [], rail, snapIndex, onSnapIndexChange }: PhoneSheetProps) {
  const selection = usePlayerStore((s) => s.selection);
  const store = usePlayerStoreApi();
  const [tab, setTab] = React.useState<SheetTab>('live');
  const mode = usePlayerStore((s) => s.mode);
  const phone = useIsPhone();
  const fixOpen = useBreakUi((s) => s.drawer) && mode === 'break' && phone;
  const askId = useOpenAsk()?.id ?? null;
  const walkthroughId = useActiveWalkthrough()?.walkthrough.id ?? null;
  const playId = useActivePlay()?.id ?? null;

  /** Shows `next`, raising a peeking sheet to half height. */
  function reveal(next: SheetTab) {
    setTab(next);
    onSnapIndexChange(Math.max(snapIndex, 1));
  }

  // A scenario's checkpoint question: Live, raised. A walkthrough or a
  // scenario starting (picked from Guide): back to Live at the peek, so the
  // board and its narration are in view.
  React.useEffect(() => {
    if (phone && askId) reveal('live');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [askId, phone]);
  React.useEffect(() => {
    if (!phone || (!walkthroughId && !playId)) return;
    setTab('live');
    onSnapIndexChange(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walkthroughId, playId, phone]);

  // Break it's Fix it chip opens this sheet on its Fix it tab.
  React.useEffect(() => {
    if (fixOpen) reveal('fix');
    else if (tab === 'fix') setTab('live');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixOpen]);

  // Only a *new* selection opens Inspect (not every render).
  React.useEffect(() => {
    if (selection) reveal('inspect');
    else if (tab === 'inspect') setTab('live');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection]);

  const title = selection ? (selectionTitle(elementIndex, selection) ?? selection.id) : 'Player';

  return (
    <BottomSheet
      open
      onOpenChange={() => {}}
      scrim={false}
      className="player-sheet sm:hidden"
      showTitleBar={false}
      title={title}
      snapPoints={SNAP_PERCENTS}
      snapIndex={snapIndex}
      onSnapIndexChange={onSnapIndexChange}
    >
      <Tabs
        aria-label="Player details"
        value={tab}
        onValueChange={(v) => {
          setTab(v as SheetTab);
          breakUiFor(store).set({ drawer: v === 'fix' });
          if (snapIndex === 0) onSnapIndexChange(1);
        }}
        items={[
          { value: 'live', label: 'Live' },
          { value: 'guide', label: 'Guide' },
          { value: 'inspect', label: 'Inspect', disabled: !selection },
          ...(mode === 'break' ? [{ value: 'fix', label: 'Fix it' }] : []),
        ]}
      >
        <TabsContent value="live">
          <div className="player-sheet-live">
            <CheckpointSlot where="sheet" />
            {gauges.length > 0 ? (
              <div className="player-sheet-hud" role="group" aria-label="Live metrics, last 60 seconds">
                <HudTiles gauges={gauges} />
              </div>
            ) : null}
          </div>
        </TabsContent>
        <TabsContent value="guide">{phone ? <RailSections needs={needs} rail={rail} touch className="player-sheet-guide" /> : null}</TabsContent>
        {mode === 'break' ? (
          <TabsContent value="fix">
            <BreakPhoneFix />
          </TabsContent>
        ) : null}
        <TabsContent value="inspect">
          {selection ? (
            <>
              <InspectorHeader
                title={title}
                kindLabel={selectionKindLabel(elementIndex, selection)}
                onClose={() => store.setState({ selection: null })}
              />
              <InspectorBodySlot>{panels[selection.id] ?? <EmptyInspectorBody />}</InspectorBodySlot>
            </>
          ) : null}
        </TabsContent>
      </Tabs>
    </BottomSheet>
  );
}
