'use client';

import type { ReactNode } from 'react';
import { useShortcut, useShortcutScope } from '@/app/(components)/command';
import { usePlayerStore, usePlayerStoreApi } from '../store/PlayerStoreProvider';
import type { ElementIndex } from './selection';
import { selectionKindLabel, selectionTitle } from './selection';
import { InspectorHeader, InspectorBodySlot } from './InspectorHeader';
import { EmptyInspectorBody } from '../inspector';

export interface InspectorProps {
  elementIndex: ElementIndex;
  /** Every node's/link's inspector body, pre-rendered server-side (T3.6) — see `DiagramPlayer.tsx`. Keyed by element id; looked up by `selection.id`. */
  panels: Record<string, ReactNode>;
}

/**
 * The inspector frame (T3.16): opens whenever `selection`
 * is set (T3.3 already sets it on a canvas click or Enter), shows only the
 * selected element's title, and is closable — a click on its own close
 * button, or Escape while it's open.
 *
 * One implementation covers desktop, tablet and phone: `globals.css`'s
 * `.player-inspector` rules turn this same markup from a static grid column
 * (desktop) into a slide-in right-edge overlay (tablet) purely with a
 * `data-inspector-open` attribute set on `.player-body` (in `PlayerShell`).
 * Phone hides it entirely (`.player-rail, .player-inspector { display: none }`
 * at <640px) — there the same title/body slot surfaces inside the phone
 * bottom sheet's "Inspect" tab instead (`PhoneSheet.tsx`), so there is
 * exactly one selection→title→slot path, just two places it can render.
 */
export function Inspector({ elementIndex, panels }: InspectorProps) {
  const selection = usePlayerStore((s) => s.selection);
  const store = usePlayerStoreApi();

  function close() {
    store.setState({ selection: null });
  }

  // Only live while a selection exists to close, i.e. only while this frame
  // is actually showing something.
  useShortcutScope('player-inspector', selection !== null);
  useShortcut(
    { id: 'player:close-inspector', keys: 'escape', label: 'Close the inspector', group: 'Player', when: 'player-inspector' },
    () => close(),
  );

  if (!selection) return null;

  const title = selectionTitle(elementIndex, selection) ?? selection.id;
  const kindLabel = selectionKindLabel(elementIndex, selection);

  return (
    <aside className="player-inspector" aria-label="Inspector">
      <InspectorHeader title={title} kindLabel={kindLabel} onClose={close} />
      <InspectorBodySlot>{panels[selection.id] ?? <EmptyInspectorBody />}</InspectorBodySlot>
    </aside>
  );
}
