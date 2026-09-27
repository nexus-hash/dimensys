'use client';

import * as React from 'react';
import { BottomSheet, Tabs, TabsContent } from '@/app/(components)/ui';
import { usePlayerStore, usePlayerStoreApi } from '../store/PlayerStoreProvider';
import type { ElementIndex } from './selection';
import { selectionKindLabel, selectionTitle } from './selection';
import { InspectorHeader, InspectorBodySlot } from './InspectorHeader';
import { HudStrip, TimelineDock } from './HudTimelineFrame';
import { RequirementBadges } from '../hud/RequirementBadges';
import { EmptyInspectorBody } from '../inspector';
import type { GaugeView, NeedView } from '../types';

/** The spec's phone snap points, exported so `PlayerShell` can size the canvas area's reserved bottom space to match the *current* one, not just the lowest. */
export const SNAP_PERCENTS = [12, 50, 92];

export interface PhoneSheetProps {
  elementIndex: ElementIndex;
  /** Same pre-rendered bodies `Inspector` gets (T3.6) — the phone sheet's "Inspect" tab shows the identical content, just in this container instead of the desktop/tablet aside. */
  panels: Record<string, React.ReactNode>;
  /** HUD tiles source (T3.8), for this sheet's "Metrics" tab — same data `HudTimelineFrame` gets. */
  gauges?: readonly GaugeView[];
  /** Requirement badges source (T3.8), for the same tab. */
  needs?: readonly NeedView[];
  /** Controlled snap index — lifted to `PlayerShell` (T3.16) so it can also drive `--player-sheet-peek`, keeping the board-fit effect's measured free area in step with the sheet's *actual* current height instead of only its lowest snap point. */
  snapIndex: number;
  onSnapIndexChange: (index: number) => void;
}

/**
 * Phone chrome (T3.16 scope item 6): below `sm` (<640px) the rail and the
 * static inspector both leave the layout (`globals.css`), and this single
 * bottom sheet holds what they held instead — the inspector and the HUD —
 * as tabs, at the spec's 12/50/92% snap points. The diagram itself is
 * scaled to fit above it via `--player-sheet-peek`, which `PlayerShell` (the
 * one that owns `snapIndex`, passed down here as a controlled prop) keeps
 * at the *current* snap point's height — not just the lowest one — so the
 * board re-fits to stay clear of the sheet at 50%/92% too, not only at the
 * 12% peek.
 *
 * `scrim={false}`: this sheet is permanent phone chrome, not a transient
 * drawer — its 12% peek must never dim the diagram underneath. It ignores
 * Radix's own close attempts (outside click, Escape) by never lowering
 * `open`; Escape on phone instead closes the inspector's *selection*
 * (handled the same way as everywhere else, via the `Inspector`-owned
 * shortcut) which — since selection is what puts the "Inspect" tab in view —
 * reads to the person as the same "Esc closes the inspector" behaviour.
 *
 * T3.5 ("phone chrome") plugs deeper interaction into this frame: switching
 * to the "Inspect" tab and bumping the snap point on selection, the
 * mode-specific toolbox chips, and narration. This task only builds the
 * sheet, its tabs, and the title/empty-body slots.
 *
 * `showTitleBar={false}`: the prototype's own phone sheet has no separate
 * title row above its tabs — the tab strip *is* the sheet's header. `title`
 * still names the sheet for assistive tech (a visually-hidden Radix title),
 * and the selected element's name still shows up visibly, just scoped to
 * the "Inspect" tab's own `<InspectorHeader>` instead of a sheet-wide banner.
 */
export function PhoneSheet({ elementIndex, panels, gauges = [], needs = [], snapIndex, onSnapIndexChange }: PhoneSheetProps) {
  const selection = usePlayerStore((s) => s.selection);
  const store = usePlayerStoreApi();
  const [tab, setTab] = React.useState<'inspect' | 'hud'>('hud');

  React.useEffect(() => {
    if (selection) {
      setTab('inspect');
      onSnapIndexChange(Math.max(snapIndex, 1));
    }
    // Only react to a *new* selection, not to `snapIndex`/`onSnapIndexChange`
    // themselves — this bumps the snap point once when something gets
    // selected, it doesn't keep forcing it back up on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection]);

  const title = selection ? (selectionTitle(elementIndex, selection) ?? selection.id) : 'Player';

  return (
    <BottomSheet
      open
      onOpenChange={() => {}}
      scrim={false}
      className="sm:hidden"
      showTitleBar={false}
      title={title}
      snapPoints={SNAP_PERCENTS}
      snapIndex={snapIndex}
      onSnapIndexChange={onSnapIndexChange}
    >
      <Tabs
        aria-label="Player details"
        value={tab}
        onValueChange={(v) => setTab(v as 'inspect' | 'hud')}
        items={[
          { value: 'hud', label: 'Metrics' },
          { value: 'inspect', label: 'Inspect', disabled: !selection },
        ]}
      >
        <TabsContent value="hud">
          <HudStrip gauges={gauges} />
          {needs.length > 0 ? <RequirementBadges needs={needs} /> : null}
          <TimelineDock registerShortcuts={false} />
        </TabsContent>
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
