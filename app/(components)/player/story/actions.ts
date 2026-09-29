/**
 * Scenario commands. Plain functions over the player store, its bridge and
 * the story UI store: the rail, the checkpoint card, the narration card and
 * the timeline all go through these, so the rules live in one place.
 * Every command is a safe no-op while there's no running simulation.
 */
import type { PlayerStore } from '../store/playerStore';
import { getBridge } from '../worker/bridgeRegistry';
import type { PlayView } from '../types';
import { askBefore } from './model';
import { initialStoryUi, storyUiFor } from './storyStore';

/**
 * Starts `playId` from its beginning, or free play for `null`. A scenario
 * plays in Explore: a walkthrough or Break it in progress is left for it.
 */
export function startScenario(store: PlayerStore, playId: string | null): void {
  const bridge = getBridge(store);
  if (!bridge || store.getState().sim.status === 'unavailable') return;
  const { mode } = store.getState();
  if (mode !== 'explore') store.setState({ mode: 'explore', walkthrough: { id: null, stepIndex: 0 }, selection: null });
  storyUiFor(store).set(initialStoryUi());
  if (playId) bridge.restart('scenario', playId);
  else bridge.restart('free');
}

/** Answers the checkpoint the run is paused at and plays on. */
export function chooseAnswer(store: PlayerStore, checkpointId: string, choiceId: string): void {
  const bridge = getBridge(store);
  if (!bridge) return;
  const at = store.getState().sim.frame?.t ?? 0;
  const ui = storyUiFor(store);
  // Recorded right away (the runner's own `choice` event confirms it a frame
  // later with the same answer): the card closes on the click, not 100 ms on.
  ui.set((s) => ({ pending: null, answers: { ...s.answers, [checkpointId]: { choiceId, at } } }));
  bridge.choose(checkpointId, choiceId);
  bridge.play();
}

/** Passes the checkpoint without changing anything ("Keep watching"). */
export function keepWatching(store: PlayerStore, checkpointId: string): void {
  const bridge = getBridge(store);
  if (!bridge) return;
  const at = store.getState().sim.frame?.t ?? 0;
  storyUiFor(store).set((s) => ({ pending: null, answers: { ...s.answers, [checkpointId]: { choiceId: null, at } } }));
  bridge.skip(checkpointId);
  bridge.play();
}

/** Resumes after a caption that holds playback. */
export function continueCaption(store: PlayerStore): void {
  const bridge = getBridge(store);
  if (!bridge) return;
  bridge.continueCaption();
  bridge.play();
}

/**
 * Scrubbing a scenario: a seek can't jump over a question nobody has
 * answered yet (the run's outcome depends on it). Seeking past one stops at
 * it and plays into it, so the question opens.
 */
export function seekScenario(store: PlayerStore, play: PlayView | null, t: number): void {
  const bridge = getBridge(store);
  if (!bridge) return;
  const ask = play ? askBefore(play, storyUiFor(store).get().answers, t) : null;
  if (ask) {
    bridge.seek(ask.t);
    bridge.play();
    return;
  }
  bridge.seek(t);
}

/** Reset: the runner starts over and so do its captions, triggers and answers. */
export function resetStory(store: PlayerStore): void {
  storyUiFor(store).set(initialStoryUi());
}
