'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { WalkthroughView } from './model';
import { usePlayerStore } from '../store/PlayerStoreProvider';

export interface WalkthroughData {
  walkthroughs: readonly WalkthroughView[];
  /** Server-rendered narration per step, keyed by `stepKey(walkthroughId, stepId)`. */
  narration: Readonly<Record<string, ReactNode>>;
  /** Break it is a mode of this diagram: the last step offers it as the next thing to try. */
  breakAvailable: boolean;
}

const EMPTY: WalkthroughData = { walkthroughs: [], narration: {}, breakAvailable: false };
const WalkthroughContext = createContext<WalkthroughData>(EMPTY);

export function WalkthroughProvider({ value, children }: { value: WalkthroughData; children: ReactNode }) {
  return <WalkthroughContext.Provider value={value}>{children}</WalkthroughContext.Provider>;
}

export function useWalkthroughData(): WalkthroughData {
  return useContext(WalkthroughContext);
}

/** The walkthrough and step on screen, or `null` outside Walkthrough mode. */
export function useActiveWalkthrough() {
  const { walkthroughs } = useWalkthroughData();
  const mode = usePlayerStore((s) => s.mode);
  const slice = usePlayerStore((s) => s.walkthrough);
  if (mode !== 'walkthrough' || !slice.id) return null;
  const walkthrough = walkthroughs.find((w) => w.id === slice.id);
  if (!walkthrough) return null;
  const stepIndex = Math.min(slice.stepIndex, walkthrough.steps.length - 1);
  return { walkthrough, stepIndex, step: walkthrough.steps[stepIndex] };
}
