import { describe, it, expect } from 'vitest';
import type { PlayView } from '../../types';
import {
  askBefore,
  authoredPlays,
  blockingAsk,
  currentNarration,
  freePlayLabel,
  narrationEntries,
  REVEAL_AFTER,
  timelineMarks,
} from '../model';
import { initialStoryUi, reduceRunnerEvents, type StoryUiState } from '../storyStore';

const story: PlayView = {
  id: 'outage',
  text: 'The cache dies',
  genre: 'story',
  secs: 90,
  beats: [
    { t: 0, verb: 'traffic' },
    { t: 20, verb: 'kill', el: 'cache' },
    { t: 50, verb: 'restore', el: 'cache' },
  ],
  captions: [
    { t: 2, md: 'Healthy.' },
    { t: 21, md: 'Cache gone: {{0}} reads/s.', aim: 'db' },
    { t: 51, md: 'Back, but **cold**.' },
  ],
  asks: [
    {
      id: 'cp',
      t: 30,
      md: 'What now?',
      picks: [
        { id: 'a', text: 'Back off', then: 'Retries fall.' },
        { id: 'b', text: 'Scale', then: 'Nothing changes.' },
      ],
      truth: 'Capacity was the problem.',
    },
  ],
};
const sandbox: PlayView = { id: 'free', text: 'Free play', genre: 'sandbox', beats: [], captions: [], asks: [] };

const ui = (patch: Partial<StoryUiState> = {}): StoryUiState => ({ ...initialStoryUi(), ...patch });

describe('scenario list', () => {
  it('offers free play first, then every timed scenario', () => {
    expect(authoredPlays([sandbox, story]).map((p) => p.id)).toEqual(['outage']);
    expect(freePlayLabel([sandbox, story])).toBe('Free play');
    expect(freePlayLabel([story])).toBe('Free play');
  });
});

describe('narration', () => {
  it('shows the latest caption that has started, nothing before the first', () => {
    expect(currentNarration(story, ui(), 1)).toBeNull();
    expect(currentNarration(story, ui(), 2)?.key).toBe('c0');
    expect(currentNarration(story, ui(), 20.9)?.key).toBe('c0');
    expect(currentNarration(story, ui(), 21)?.aim).toBe('db');
  });

  it('uses the runner-rendered text once a caption fired, and blanks live slots before that', () => {
    expect(currentNarration(story, ui(), 22)?.text).toBe('Cache gone: … reads/s.');
    const fired = reduceRunnerEvents(ui(), [{ kind: 'caption', at: 21, rendered: 'Cache gone: 3960 reads/s.' }]);
    expect(currentNarration(story, fired, 22)?.text).toBe('Cache gone: 3960 reads/s.');
  });

  it('a fired trigger takes over until the next caption', () => {
    const s = reduceRunnerEvents(ui(), [{ kind: 'trigger', at: 22.5, triggerId: 't1', rendered: 'DB hot', aim: 'db' }]);
    expect(currentNarration(story, s, 23)).toMatchObject({ kind: 'trigger', text: 'DB hot', aim: 'db' });
    expect(currentNarration(story, s, 52)?.key).toBe('c2');
    // The same firing arriving twice is one note.
    expect(reduceRunnerEvents(s, [{ kind: 'trigger', at: 22.5, triggerId: 't1', rendered: 'DB hot' }]).triggers).toHaveLength(1);
  });

  it('an answer plays its outcome, then the reveal, then the story goes on', () => {
    const s = reduceRunnerEvents(ui(), [{ kind: 'choice', at: 30, checkpointId: 'cp', choiceId: 'b' }]);
    expect(currentNarration(story, s, 30)).toMatchObject({ kind: 'outcome', text: 'Nothing changes.' });
    expect(currentNarration(story, s, 30)?.pick?.text).toBe('Scale');
    expect(currentNarration(story, s, 30 + REVEAL_AFTER)).toMatchObject({ kind: 'reveal', text: 'Capacity was the problem.' });
    expect(currentNarration(story, s, 51)?.key).toBe('c2');
  });

  it('keeping watching goes straight to the reveal', () => {
    const s = reduceRunnerEvents(ui(), [{ kind: 'skip', at: 30, checkpointId: 'cp' }]);
    expect(narrationEntries(story, s).filter((e) => e.kind === 'outcome')).toHaveLength(0);
    expect(currentNarration(story, s, 30)?.kind).toBe('reveal');
  });
});

describe('runner events', () => {
  it('track the checkpoint the run is paused at until it is answered', () => {
    let s = reduceRunnerEvents(ui(), [{ kind: 'checkpoint', at: 30, checkpointId: 'cp' }]);
    expect(s.pending).toBe('cp');
    s = reduceRunnerEvents(s, [{ kind: 'choice', at: 30, checkpointId: 'cp', choiceId: 'a' }]);
    expect(s.pending).toBeNull();
    expect(s.answers.cp).toEqual({ choiceId: 'a', at: 30 });
    // Replayed after a rewind, an answered checkpoint doesn't ask again.
    expect(reduceRunnerEvents(s, [{ kind: 'checkpoint', at: 30, checkpointId: 'cp' }]).pending).toBeNull();
  });

  it('a new runner (a restart or Reset) starts everything over', () => {
    const s = reduceRunnerEvents(ui(), [
      { kind: 'caption', at: 2, rendered: 'x' },
      { kind: 'choice', at: 30, checkpointId: 'cp', choiceId: 'a' },
      { kind: 'ended', at: 90 },
    ]);
    expect(s.ended).toBe(true);
    expect(reduceRunnerEvents(s, [{ kind: 'started', at: 0 }])).toEqual(initialStoryUi());
  });
});

describe('checkpoints and seeking', () => {
  it('finds the unanswered checkpoint a run is blocked on', () => {
    expect(blockingAsk(story, {}, 29)).toBeNull();
    expect(blockingAsk(story, {}, 30)?.id).toBe('cp');
    expect(blockingAsk(story, { cp: { choiceId: 'a', at: 30 } }, 30)).toBeNull();
  });

  it('a seek past an unanswered checkpoint must stop there', () => {
    expect(askBefore(story, {}, 30)).toBeNull();
    expect(askBefore(story, {}, 90)?.id).toBe('cp');
    expect(askBefore(story, { cp: { choiceId: null, at: 30 } }, 90)).toBeNull();
  });
});

describe('timeline marks', () => {
  it('a tick per event and a diamond per checkpoint, in time order, named by element', () => {
    const marks = timelineMarks(story, {}, 90, { cache: 'Redis Cache' });
    expect(marks.map((m) => [m.kind, m.t])).toEqual([
      ['beat', 0],
      ['beat', 20],
      ['ask', 30],
      ['beat', 50],
    ]);
    expect(marks[1].label).toBe('kill Redis Cache');
    expect(marks[2].done).toBe(false);
    expect(timelineMarks(story, { cp: { choiceId: 'a', at: 30 } }, 90)[2].done).toBe(true);
    expect(timelineMarks(story, {}, 25).map((m) => m.t)).toEqual([0, 20]);
  });
});
