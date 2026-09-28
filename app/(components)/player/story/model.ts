/**
 * Scenario playback, the pure parts: which scenarios the player offers,
 * what the narration card says at a given simulated second, and which
 * checkpoint the run is waiting on. No React, no worker: the rail, the
 * dock, the timeline marks and the tests all read these.
 */
import type { PlayView } from '../types';
import { captionKey, type StoryUiState } from './storyStore';

export type Ask = PlayView['asks'][number];
export type ChoiceView = Ask['picks'][number];

/** Seconds after an answer that the reveal (what happened and why) takes over from the outcome. */
export const REVEAL_AFTER = 8;

/** Free play: the diagram's open-ended sandbox, never a timed scenario. */
export const isFreePlay = (p: { genre: string }) => p.genre === 'sandbox';

/** The scenarios to list after "Free play": everything with a timeline. */
export function authoredPlays(plays: readonly PlayView[]): PlayView[] {
  return plays.filter((p) => !isFreePlay(p));
}

/** The free-play entry's label: the diagram's own sandbox name, else "Free play". */
export function freePlayLabel(plays: readonly PlayView[]): string {
  return plays.find(isFreePlay)?.text ?? 'Free play';
}

const GENRE_LABEL: Record<string, string> = { story: 'story', incident: 'incident replay', loadTest: 'load test' };

export function genreLabel(genre: string): string {
  return GENRE_LABEL[genre] ?? 'scenario';
}

export function sortedAsks(play: PlayView): Ask[] {
  return [...play.asks].sort((a, b) => a.t - b.t);
}

/** The first checkpoint at or before `t` with no answer yet, i.e. the one a run standing at `t` is blocked on. */
export function blockingAsk(play: PlayView, answers: StoryUiState['answers'], t: number): Ask | null {
  for (const ask of sortedAsks(play)) {
    if (ask.t > t + 1e-6) return null;
    if (!answers[ask.id]) return ask;
  }
  return null;
}

/** The first unanswered checkpoint strictly before `t`: a seek to `t` has to stop there. */
export function askBefore(play: PlayView, answers: StoryUiState['answers'], t: number): Ask | null {
  for (const ask of sortedAsks(play)) {
    if (ask.t >= t - 1e-6) return null;
    if (!answers[ask.id]) return ask;
  }
  return null;
}

export type NarrationKind = 'caption' | 'trigger' | 'outcome' | 'reveal';

export interface NarrationEntry {
  /** Stable while the same entry is on screen (drives the fade-in). */
  key: string;
  kind: NarrationKind;
  /** Simulated second it starts. */
  start: number;
  /** Inline markdown. */
  text: string;
  /** Element to point at (node, link or frame id). */
  aim?: string;
  /** The choice an outcome belongs to. */
  pick?: ChoiceView;
  /** A caption that holds playback until Continue. */
  halt?: boolean;
}

/** View caption text with its live-value slots blanked, for a caption that hasn't fired yet (a seek jumped over it). */
function staticCaption(md: string): string {
  return md.replace(/\{\{\d+\}\}/g, '…');
}

/**
 * Every narration entry of a run so far, oldest first: the authored
 * captions, the triggers that fired, and each answered checkpoint's outcome
 * and (after `REVEAL_AFTER` seconds) its reveal.
 */
export function narrationEntries(play: PlayView, ui: StoryUiState): NarrationEntry[] {
  const out: NarrationEntry[] = [];
  play.captions.forEach((c, i) => {
    out.push({
      key: `c${i}`,
      kind: 'caption',
      start: c.t,
      text: ui.rendered[captionKey(c.t)] ?? staticCaption(c.md),
      ...(c.aim ? { aim: c.aim } : {}),
      ...(c.halt ? { halt: true } : {}),
    });
  });
  for (const tr of ui.triggers) {
    out.push({ key: `t${tr.id}@${tr.at}`, kind: 'trigger', start: tr.at, text: tr.text, ...(tr.aim ? { aim: tr.aim } : {}) });
  }
  for (const ask of play.asks) {
    const answer = ui.answers[ask.id];
    if (!answer) continue;
    const pick = answer.choiceId ? ask.picks.find((p) => p.id === answer.choiceId) : undefined;
    if (pick) out.push({ key: `o${ask.id}`, kind: 'outcome', start: answer.at, text: pick.then, pick });
    if (ask.truth) out.push({ key: `r${ask.id}`, kind: 'reveal', start: answer.at + (pick ? REVEAL_AFTER : 0), text: ask.truth });
  }
  // Stable: on a tie the later kind (outcome, reveal) wins.
  return out.map((e, i) => ({ e, i })).sort((a, b) => a.e.start - b.e.start || a.i - b.i).map(({ e }) => e);
}

/** What the narration card shows at simulated second `t`: the latest entry that has started. */
export function currentNarration(play: PlayView, ui: StoryUiState, t: number): NarrationEntry | null {
  let cur: NarrationEntry | null = null;
  for (const e of narrationEntries(play, ui)) {
    if (e.start <= t + 1e-6) cur = e;
    else break;
  }
  return cur;
}

export interface TimelineMark {
  kind: 'beat' | 'ask';
  t: number;
  /** Short description for the marker's tooltip / the screen-reader list. */
  label: string;
  /** Checkpoints only: already answered. */
  done?: boolean;
}

const VERB_LABEL: Record<string, string> = {
  traffic: 'traffic',
  kill: 'kill',
  restore: 'restore',
  slow: 'slow down',
  degrade: 'errors',
  partition: 'partition',
  heal: 'heal',
  flush: 'flush',
  expire: 'keys expire',
  scan: 'cache scan',
  patch: 'change',
};

/** Ticks for the scenario's timed events and diamonds for its checkpoints, within `[0, duration]`. */
export function timelineMarks(play: PlayView, answers: StoryUiState['answers'], duration: number, names: Readonly<Record<string, string>> = {}): TimelineMark[] {
  const marks: TimelineMark[] = [];
  for (const b of play.beats) {
    if (b.t < 0 || b.t > duration) continue;
    const what = b.text ?? VERB_LABEL[b.verb] ?? b.verb;
    const el = b.el ? (names[b.el] ?? b.el) : '';
    marks.push({ kind: 'beat', t: b.t, label: el ? `${what} ${el}` : what });
  }
  for (const a of play.asks) {
    if (a.t < 0 || a.t > duration) continue;
    marks.push({ kind: 'ask', t: a.t, label: `checkpoint: ${a.md}`, done: !!answers[a.id] });
  }
  return marks.sort((x, y) => x.t - y.t);
}
