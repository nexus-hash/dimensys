'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { useShortcut } from '@/app/(components)/command';
import { isMotionReduced } from '@/app/(components)/motion/reducedMotion';
import { usePlayerStore, usePlayerStoreApi } from '../store/PlayerStoreProvider';
import { useActiveWalkthrough, useWalkthroughData } from './WalkthroughContext';
import { openWalkthrough, stepBy } from './actions';
import { WalkthroughStage } from './stage';

/**
 * Walkthrough mode's behaviour, with no UI of its own:
 * - entering the mode with none chosen (key 3, the mode switcher) opens the first;
 * - ← / → move between steps;
 * - drives the board (`WalkthroughStage`): highlight, dim, badges, flow, camera.
 */
export function WalkthroughController({ boardRootRef }: { boardRootRef: RefObject<HTMLElement | null> }) {
  const store = usePlayerStoreApi();
  const { walkthroughs } = useWalkthroughData();
  const mode = usePlayerStore((s) => s.mode);
  const chosen = usePlayerStore((s) => s.walkthrough.id);
  const active = useActiveWalkthrough();
  const stageRef = useRef<WalkthroughStage | null>(null);

  // The mode was entered with nothing chosen: start the first walkthrough.
  useEffect(() => {
    if (mode !== 'walkthrough' || walkthroughs.length === 0) return;
    if (!chosen || !walkthroughs.some((w) => w.id === chosen)) openWalkthrough(store, walkthroughs, walkthroughs[0].id, 0);
  }, [mode, chosen, walkthroughs, store]);

  const activeId = active?.walkthrough.id ?? null;
  const stepIndex = active?.stepIndex ?? 0;

  // The board.
  useEffect(() => {
    const root = boardRootRef.current;
    if (!root) return;
    const stage = new WalkthroughStage(root, { reducedMotion: isMotionReduced });
    stageRef.current = stage;
    return () => {
      stage.dispose();
      stageRef.current = null;
    };
  }, [boardRootRef]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const wt = activeId ? walkthroughs.find((w) => w.id === activeId) : undefined;
    stage.show(wt ? { walkthroughId: wt.id, stepIndex, step: wt.steps[stepIndex] } : null);
  }, [activeId, stepIndex, walkthroughs]);

  const enabled = active !== null;
  useShortcut(
    { id: 'player:walkthrough-prev', keys: 'arrowleft', label: 'Previous walkthrough step', group: 'Player', when: 'player' },
    (event) => {
      // Focus inside the board pans with the arrows; a focused control (a
      // segmented control, a slider) moves its own selection. Either one
      // already took the key.
      if (event.defaultPrevented) return;
      event.preventDefault();
      stepBy(store, walkthroughs, -1);
    },
    enabled,
  );
  useShortcut(
    { id: 'player:walkthrough-next', keys: 'arrowright', label: 'Next walkthrough step', group: 'Player', when: 'player' },
    (event) => {
      if (event.defaultPrevented) return;
      event.preventDefault();
      stepBy(store, walkthroughs, 1);
    },
    enabled,
  );

  return null;
}
