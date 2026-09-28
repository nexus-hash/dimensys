'use client';

import { usePlayerStore } from '../store/PlayerStoreProvider';
import { useActivePlay } from './StoryContext';
import { useStoryUi } from './storyStore';
import { blockingAsk, type Ask } from './model';

/**
 * The checkpoint question on screen: the run is paused at a checkpoint,
 * in Explore. The runner names it when it pauses; after a seek (which
 * replays silently) it's the first unanswered one the run has reached.
 */
export function useOpenAsk(): Ask | null {
  const play = useActivePlay();
  const mode = usePlayerStore((s) => s.mode);
  const runner = usePlayerStore((s) => s.story.runner);
  const t = usePlayerStore((s) => s.sim.frame?.t ?? 0);
  const pending = useStoryUi((s) => s.pending);
  const answers = useStoryUi((s) => s.answers);
  if (!play || mode !== 'explore' || runner !== 'paused-checkpoint') return null;
  const named = pending && !answers[pending] ? play.asks.find((a) => a.id === pending) : undefined;
  return named ?? blockingAsk(play, answers, t);
}
