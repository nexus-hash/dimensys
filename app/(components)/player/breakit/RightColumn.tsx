'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { IconButton, SegmentedControl } from '@/app/(components)/ui';
import { CloseIcon } from '@/app/(components)/ui/icons';
import { usePlayerStore, usePlayerStoreApi } from '../store/PlayerStoreProvider';
import { Inspector } from '../shell/Inspector';
import { InspectorBodySlot, InspectorHeader } from '../shell/InspectorHeader';
import { selectionKindLabel, selectionTitle, type ElementIndex } from '../shell/selection';
import { EmptyInspectorBody } from '../inspector';
import { breakUiFor, useBreakUi } from './breakStore';
import { FixItPanel } from './FixItPanel';

/**
 * The right column. Normally just the inspector; while the Fix it panel is
 * open in Break it, the column carries an Inspect / Fix it switch on top
 * and shows one or the other, so fixing and inspecting share the space
 * rather than stacking. Selecting something on the board flips the switch
 * to Inspect; the wrench (or the Fix it tab) flips it back.
 */
export function RightColumn({ elementIndex, panels }: { elementIndex: ElementIndex; panels: Record<string, ReactNode> }) {
  const store = usePlayerStoreApi();
  const mode = usePlayerStore((s) => s.mode);
  const selection = usePlayerStore((s) => s.selection);
  const drawer = useBreakUi((s) => s.drawer);
  const tab = useBreakUi((s) => s.tab);
  const open = mode === 'break' && drawer;

  const lastSelection = useRef(selection);
  useEffect(() => {
    if (selection && selection !== lastSelection.current && open) breakUiFor(store).set({ tab: 'inspect' });
    lastSelection.current = selection;
  }, [selection, open, store]);

  if (!open) return <Inspector elementIndex={elementIndex} panels={panels} />;

  const close = () => breakUiFor(store).set({ drawer: false });
  return (
    <aside className="player-inspector break-right" aria-label="Inspector and Fix it">
      <div className="break-rp-seg">
        <SegmentedControl
          aria-label="Right panel"
          size="sm"
          value={tab}
          onValueChange={(v) => breakUiFor(store).set({ tab: v as 'inspect' | 'fix' })}
          options={[
            { value: 'inspect', label: 'Inspect' },
            { value: 'fix', label: 'Fix it' },
          ]}
        />
        <IconButton aria-label="Close Fix it" size="sm" onClick={close}>
          <CloseIcon />
        </IconButton>
      </div>
      {tab === 'fix' ? (
        <div className="break-right-body">
          <FixItPanel />
        </div>
      ) : selection ? (
        <>
          <InspectorHeader
            title={selectionTitle(elementIndex, selection) ?? selection.id}
            kindLabel={selectionKindLabel(elementIndex, selection)}
            onClose={() => store.setState({ selection: null })}
            closeLabel="Clear selection"
          />
          <InspectorBodySlot>{panels[selection.id] ?? <EmptyInspectorBody />}</InspectorBodySlot>
        </>
      ) : (
        <EmptyInspectorBody message="Select a node or link on the board to inspect it." />
      )}
    </aside>
  );
}
