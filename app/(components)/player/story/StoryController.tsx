'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { usePlayerStore, usePlayerStoreApi } from '../store/PlayerStoreProvider';
import { onRunnerEvents } from '../worker/runnerEvents';
import { getBridge } from '../worker/bridgeRegistry';
import { useActivePlay } from './StoryContext';
import { initialStoryUi, reduceRunnerEvents, storyUiFor, useStoryUi } from './storyStore';
import { currentNarration } from './model';

/**
 * Scenario playback's behaviour, with no UI of its own:
 * - folds the runner events every frame carries into the story state;
 * - points at what the narration is about (`data-story-aim` on the board
 *   element, drawn by CSS);
 * - Break it works on the live system, so entering it leaves a scenario
 *   for free play.
 */
export function StoryController({ boardRootRef }: { boardRootRef: RefObject<HTMLElement | null> }) {
  const store = usePlayerStoreApi();
  const mode = usePlayerStore((s) => s.mode);
  const play = useActivePlay();

  useEffect(() => {
    const ui = storyUiFor(store);
    return onRunnerEvents(store, (events) => ui.set(reduceRunnerEvents(ui.get(), events)));
  }, [store]);

  const prevMode = useRef(mode);
  useEffect(() => {
    const was = prevMode.current;
    prevMode.current = mode;
    if (mode !== 'break' || was === 'break' || !store.getState().story.scenarioId) return;
    storyUiFor(store).set(initialStoryUi());
    getBridge(store)?.restart('free');
  }, [mode, store]);

  const ui = useStoryUi((s) => s);
  const t = usePlayerStore((s) => s.sim.frame?.t ?? 0);
  const aim = play && mode === 'explore' ? (currentNarration(play, ui, t)?.aim ?? null) : null;

  useEffect(() => {
    const root = boardRootRef.current;
    if (!root || !aim) return;
    const esc = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(aim) : aim;
    const el = root.querySelector<SVGGElement>(`[data-node-id="${esc}"], [data-link-id="${esc}"], [data-frame-id="${esc}"]`);
    if (!el) return;
    el.setAttribute('data-story-aim', '');
    return () => el.removeAttribute('data-story-aim');
  }, [aim, boardRootRef]);

  return null;
}
