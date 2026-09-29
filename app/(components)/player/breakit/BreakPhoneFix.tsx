'use client';

import { usePlayerStore } from '../store/PlayerStoreProvider';
import { ActionLog, BreakDockRow } from './BreakDockRow';
import { FixItPanel } from './FixItPanel';

/** The phone sheet's Fix it tab: "Try this" or the action log (the dock has no room for them on phone), then the fixes. */
export function BreakPhoneFix() {
  const actions = usePlayerStore((s) => s.actions);
  return (
    <div className="break-phone-fix">
      {actions.length === 0 ? <BreakDockRow /> : <ActionLog actions={actions} />}
      <FixItPanel />
    </div>
  );
}
