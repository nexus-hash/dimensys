'use client';

import * as React from 'react';
import { BottomSheet, Tabs, TabsContent } from '@/app/(components)/ui';
import { usePlayerStore, usePlayerStoreApi } from '../store/PlayerStoreProvider';
import type { ElementIndex } from './selection';
import { selectionKindLabel, selectionTitle } from './selection';
import { InspectorHeader, InspectorBodySlot } from './InspectorHeader';
import { HudStrip, TimelineDock } from './HudTimelineFrame';

const SNAP_PERCENTS = [12, 50, 92];

export interface PhoneSheetProps {
  elementIndex: ElementIndex;
}

/**
 * Phone chrome (T3.16 scope item 6): below `sm` (<640px) the rail and the
 * static inspector both leave the layout (`globals.css`), and this single
 * bottom sheet holds what they held instead — the inspector and the HUD —
 * as tabs, at the spec's 12/50/92% snap points. The diagram itself is
 * scaled to fit above it via `--player-sheet-peek` (kept at the lowest snap
 * point's height: the sheet's lowest point must never cover a node).
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
 */
export function PhoneSheet({ elementIndex }: PhoneSheetProps) {
  const selection = usePlayerStore((s) => s.selection);
  const store = usePlayerStoreApi();
  const [tab, setTab] = React.useState<'inspect' | 'hud'>('hud');
  const [snapIndex, setSnapIndex] = React.useState(0);

  React.useEffect(() => {
    if (selection) {
      setTab('inspect');
      setSnapIndex((i) => Math.max(i, 1));
    }
  }, [selection]);

  const title = selection ? (selectionTitle(elementIndex, selection) ?? selection.id) : 'Player';

  return (
    <BottomSheet
      open
      onOpenChange={() => {}}
      scrim={false}
      className="sm:hidden"
      title={title}
      snapPoints={SNAP_PERCENTS}
      snapIndex={snapIndex}
      onSnapIndexChange={setSnapIndex}
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
          <HudStrip />
          <TimelineDock />
        </TabsContent>
        <TabsContent value="inspect">
          {selection ? (
            <>
              <InspectorHeader
                title={title}
                kindLabel={selectionKindLabel(elementIndex, selection)}
                onClose={() => store.setState({ selection: null })}
              />
              <InspectorBodySlot />
            </>
          ) : null}
        </TabsContent>
      </Tabs>
    </BottomSheet>
  );
}
