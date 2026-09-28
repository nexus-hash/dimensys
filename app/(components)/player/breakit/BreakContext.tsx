'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { KitView, NeedView, RemedyView, SwitchView } from '../types';
import { usePlayerStore } from '../store/PlayerStoreProvider';
import { offeredFixIds, packFits } from './pack';
import { deriveFaults, type TargetCatalog } from './tools';

/**
 * The diagram data Break It reads, handed down once by the shell: the
 * toolkit (tools, "Try this" ideas, which fixes to offer), the fixes themselves,
 * the requirements (their badges show recovery in the Fix it panel) and the
 * board's names and kinds (for labels and target rules).
 */
export interface BreakData {
  kit: KitView | undefined;
  remedies: readonly RemedyView[];
  needs: readonly NeedView[];
  catalog: TargetCatalog;
  /** Trade-off switches, so a flip in the action log reads by name. */
  switches?: readonly SwitchView[];
}

const EMPTY: BreakData = { kit: undefined, remedies: [], needs: [], catalog: { nodes: [], links: [] } };

const BreakDataContext = createContext<BreakData>(EMPTY);

export function BreakDataProvider({ kit, remedies, needs, catalog, switches, children }: BreakData & { children: ReactNode }) {
  const value = useMemo(() => ({ kit, remedies, needs, catalog, switches }), [kit, remedies, needs, catalog, switches]);
  return <BreakDataContext.Provider value={value}>{children}</BreakDataContext.Provider>;
}

export function useBreakData(): BreakData {
  return useContext(BreakDataContext);
}

/**
 * The fixes the Fix it panel offers: those that fit a current cache failure
 * first, then the diagram's own in the toolkit's order, then any other
 * applied fix (so it can be taken back out).
 */
export function useOfferedFixes(): RemedyView[] {
  const { kit, remedies } = useBreakData();
  const actions = usePlayerStore((s) => s.actions);
  return useMemo(() => {
    if (!kit) return [];
    const faults = deriveFaults(actions);
    const ids = offeredFixIds(kit, packFits(actions, kit, faults.killed), faults.fixes);
    return ids.map((id) => remedies.find((r) => r.id === id)).filter((r): r is RemedyView => r !== undefined);
  }, [kit, remedies, actions]);
}
