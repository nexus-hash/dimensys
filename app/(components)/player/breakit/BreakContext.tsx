'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { KitView, NeedView, RemedyView } from '../types';
import type { TargetCatalog } from './tools';

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
}

const EMPTY: BreakData = { kit: undefined, remedies: [], needs: [], catalog: { nodes: [], links: [] } };

const BreakDataContext = createContext<BreakData>(EMPTY);

export function BreakDataProvider({ kit, remedies, needs, catalog, children }: BreakData & { children: ReactNode }) {
  const value = useMemo(() => ({ kit, remedies, needs, catalog }), [kit, remedies, needs, catalog]);
  return <BreakDataContext.Provider value={value}>{children}</BreakDataContext.Provider>;
}

export function useBreakData(): BreakData {
  return useContext(BreakDataContext);
}

/** The fixes this diagram offers in the Fix it panel, in the toolkit's order. */
export function useOfferedFixes(): RemedyView[] {
  const { kit, remedies } = useBreakData();
  return useMemo(() => {
    if (!kit) return [];
    return kit.remedies.map((id) => remedies.find((r) => r.id === id)).filter((r): r is RemedyView => r !== undefined);
  }, [kit, remedies]);
}
