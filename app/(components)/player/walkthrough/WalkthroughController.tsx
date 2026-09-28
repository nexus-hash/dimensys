'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { useShortcut } from '@/app/(components)/command';
import { isMotionReduced } from '@/app/(components)/motion/reducedMotion';
import { usePlayerStore, usePlayerStoreApi } from '../store/PlayerStoreProvider';
import { useActiveWalkthrough, useWalkthroughData } from './WalkthroughContext';
import { openWalkthrough, stepBy } from './actions';
import { WalkthroughStage } from './stage';
import { readWalkthroughParams, writeWalkthroughParams, VIEW_PARAM } from './url';

/**
 * Walkthrough mode's behaviour, with no UI of its own:
 * - opens the walkthrough a `?v=…&st=…` link names, on load;
 * - entering the mode with none chosen (key 3, the mode switcher) opens the first;
 * - keeps the URL in step with the walkthrough and step on screen;
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
  const firstUrlWriteRef = useRef(true);

  // Deep link: read once, on mount.
  useEffect(() => {
    const ref = readWalkthroughParams(window.location.search, walkthroughs);
    if (ref) openWalkthrough(store, walkthroughs, ref.id, ref.stepIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The mode was entered with nothing chosen: start the first walkthrough.
  useEffect(() => {
    if (mode !== 'walkthrough' || walkthroughs.length === 0) return;
    if (!chosen || !walkthroughs.some((w) => w.id === chosen)) openWalkthrough(store, walkthroughs, walkthroughs[0].id, 0);
  }, [mode, chosen, walkthroughs, store]);

  const activeId = active?.walkthrough.id ?? null;
  const stepIndex = active?.stepIndex ?? 0;
  const stepId = active?.step.id ?? null;

  // URL: reflect what's on screen. `replaceState` — stepping through a
  // walkthrough shouldn't fill the back button with every step.
  useEffect(() => {
    // The first pass runs before the deep link above has reached the store:
    // writing then would strip the very params being read.
    if (firstUrlWriteRef.current) {
      firstUrlWriteRef.current = false;
      return;
    }
    const { pathname, search, hash } = window.location;
    // Leaving: only clear the params when they name a walkthrough (a `v` for
    // anything else belongs to whoever set it).
    if (!activeId && !walkthroughs.some((w) => w.id === new URLSearchParams(search).get(VIEW_PARAM))) return;
    const next = writeWalkthroughParams(search, activeId && stepId ? { id: activeId, stepId } : null);
    if (next !== search) window.history.replaceState(window.history.state, '', `${pathname}${next}${hash}`);
  }, [activeId, stepId, walkthroughs]);

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
