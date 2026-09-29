'use client';

import { useEffect, type RefObject } from 'react';
import { toast } from '@/app/(components)/ui';
import { usePlayerStoreApi } from '../store/PlayerStoreProvider';
import type { PlayerMode, PlayerState, PlayerStore } from '../store/playerStore';
import type { ModeAvailability } from '../shell/modes';
import type { ElementIndex } from '../shell/selection';
import { useWalkthroughData } from '../walkthrough/WalkthroughContext';
import { openWalkthrough } from '../walkthrough/actions';
import { CAMERA_VIEW_EVENT, type CameraChangeDetail } from '../blueprint/camera';
import { decodeShare, encodeShare, hasShareParams, mergeShareIntoSearch } from './codec';
import { captureShare, planRestore, restoreNotice, type RestorePlan } from './plan';
import { getShareCamera, setBootRun, setShareCamera } from './shareSlot';
import { storyUiFor } from '../story/storyStore';
import { useStoryData } from '../story/StoryContext';

/** How long the URL waits for interaction to settle before it's rewritten. */
const WRITE_DEBOUNCE_MS = 300;

interface Walkthroughish {
  id: string;
  steps: ReadonlyArray<{ id: string }>;
}

/** The running scenario's checkpoint answers so far (`null` = passed without answering). */
function scenarioChoices(store: PlayerStore): Record<string, string | null> {
  const answers = storyUiFor(store).get().answers;
  return Object.fromEntries(Object.entries(answers).map(([cp, a]) => [cp, a.choiceId]));
}

/** The share state for what's on screen now. */
function currentShare(store: PlayerStore, walkthroughs: readonly Walkthroughish[]) {
  return captureShare(store.getState(), walkthroughs, getShareCamera(store), scenarioChoices(store));
}

/** The full share URL for what's on screen now (current sim time included). */
export function shareUrl(store: PlayerStore, walkthroughs: readonly Walkthroughish[]): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}${encodeShare(currentShare(store, walkthroughs))}`;
}

/** The parts of the state the URL reflects; a change to any of them rewrites it. */
function urlKey(s: PlayerState): unknown[] {
  return [s.mode, s.selection, s.walkthrough, s.actions, s.sim.playing, s.sim.speed, s.story.scenarioId];
}

/**
 * Share links, both ways, with no UI of its own:
 * - on load, restores what the link holds: the run (rebuilt from its action
 *   log at its time by the worker), mode, walkthrough step, selection,
 *   the view, playing or paused and the speed, and says so honestly when
 *   part of it couldn't come back (a link made on another revision);
 * - while the player is used, keeps the address bar on the current state
 *   with `replaceState` (debounced, never a new history entry).
 */
export function ShareController({
  boardRootRef,
  elements,
  modes,
}: {
  boardRootRef: RefObject<HTMLElement | null>;
  elements: ElementIndex;
  modes: Record<PlayerMode, ModeAvailability>;
}) {
  const store = usePlayerStoreApi();
  const { walkthroughs } = useWalkthroughData();
  const { plays } = useStoryData();

  useEffect(() => {
    let settled = false;
    let timer = 0;
    let last = urlKey(store.getState());

    const write = () => {
      timer = 0;
      if (!settled) return;
      const { pathname, search, hash } = window.location;
      const next = mergeShareIntoSearch(search, currentShare(store, walkthroughs));
      if (next !== search) window.history.replaceState(window.history.state, '', `${pathname}${next}${hash}`);
    };
    const schedule = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(write, WRITE_DEBOUNCE_MS);
    };

    // ---- restore ----
    let plan: RestorePlan | null = null;
    if (hasShareParams(window.location.search)) {
      plan = planRestore(decodeShare(window.location.search), {
        revision: store.getState().revision,
        walkthroughs,
        elements,
        modes,
        scenarios: plays.map((p) => p.id),
      });
      if (plan.walkthrough) openWalkthrough(store, walkthroughs, plan.walkthrough.id, plan.walkthrough.stepIndex);
      else if (plan.mode !== 'explore') store.setState({ mode: plan.mode });
      if (plan.selection) store.setState({ selection: plan.selection });
      const done = plan;
      const finish = (skipped: number) => {
        if (settled) return;
        const notice = restoreNotice(done, skipped);
        if (notice) toast({ ...notice, duration: 12_000 });
        settled = true;
        schedule();
      };
      const sim = store.getState().sim;
      if (plan.sim && sim.status !== 'unavailable') {
        setBootRun(store, { ...plan.sim, ...(plan.scenario ? { scenario: plan.scenario } : {}), onReady: finish });
      } else {
        // Nothing to rebuild (or no simulation to rebuild it in).
        finish(0);
      }
      if (plan.camera) {
        const view = plan.camera;
        // After the walkthrough (if any) has framed its step: the link's view wins.
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            boardRootRef.current?.querySelector('.player-board-stage')?.dispatchEvent(new CustomEvent(CAMERA_VIEW_EVENT, { detail: view }));
          }),
        );
      }
    } else {
      settled = true;
    }

    // ---- keep the URL current ----
    const unsubscribe = store.subscribe(() => {
      const key = urlKey(store.getState());
      if (key.every((v, i) => v === last[i])) return;
      last = key;
      schedule();
    });
    // A checkpoint answered.
    const story = storyUiFor(store);
    let lastAnswers = story.get().answers;
    const unsubscribeStory = story.subscribe(() => {
      if (story.get().answers === lastAnswers) return;
      lastAnswers = story.get().answers;
      schedule();
    });
    const root = boardRootRef.current;
    const onCamera = (e: Event) => {
      const view = (e as CustomEvent<CameraChangeDetail>).detail?.view ?? null;
      const before = getShareCamera(store);
      setShareCamera(store, view);
      if (view || before) schedule();
    };
    root?.addEventListener('playercamerachange', onCamera);
    // A run that never gets a worker (none in this browser) settles anyway.
    const fallback = window.setTimeout(() => {
      const status = store.getState().sim.status;
      if (!settled && status !== 'ready' && status !== 'loading') {
        settled = true;
        const notice = plan ? restoreNotice(plan, 0) : null;
        if (notice) toast({ ...notice, duration: 12_000 });
      }
    }, 8000);

    return () => {
      unsubscribe();
      unsubscribeStory();
      root?.removeEventListener('playercamerachange', onCamera);
      if (timer) window.clearTimeout(timer);
      window.clearTimeout(fallback);
    };
    // Mount-only: the diagram's data doesn't change under a mounted player.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
