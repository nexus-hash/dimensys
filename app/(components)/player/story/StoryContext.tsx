'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { GaugeView, PlayView } from '../types';
import { usePlayerStore } from '../store/PlayerStoreProvider';

export interface StoryData {
  plays: readonly PlayView[];
  /** HUD gauges: the checkpoint card quotes their current values. */
  gauges: readonly GaugeView[];
  /** Element id → visible label, for timeline mark descriptions. */
  names: Readonly<Record<string, string>>;
}

const EMPTY: StoryData = { plays: [], gauges: [], names: {} };
const StoryContext = createContext<StoryData>(EMPTY);

export function StoryProvider({ value, children }: { value: StoryData; children: ReactNode }) {
  return <StoryContext.Provider value={value}>{children}</StoryContext.Provider>;
}

export function useStoryData(): StoryData {
  return useContext(StoryContext);
}

/** The scenario the simulation is running, or `null` in free play. */
export function useActivePlay(): PlayView | null {
  const { plays } = useStoryData();
  const id = usePlayerStore((s) => s.story.scenarioId);
  if (!id) return null;
  return plays.find((p) => p.id === id) ?? null;
}
