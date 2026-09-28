'use client';

import './story.css';
import { Button } from '@/app/(components)/ui';
import { usePlayerStore, usePlayerStoreApi } from '../store/PlayerStoreProvider';
import { fmtSimTime } from '../metrics/simTime';
import { useActivePlay, useStoryData } from './StoryContext';
import { useStoryUi } from './storyStore';
import { currentNarration, freePlayLabel, genreLabel, type NarrationEntry } from './model';
import { continueCaption, startScenario } from './actions';
import { useOpenAsk } from './useOpenAsk';
import { RichText } from './RichText';

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const KICKER: Record<NarrationEntry['kind'], string> = {
  caption: '',
  trigger: 'Alert',
  outcome: 'Outcome',
  reveal: 'What happened',
};

/**
 * The narration card in the dock while a scenario plays in Explore: the
 * caption for this moment of the run, an alert when the simulation trips a
 * trigger, and after a checkpoint the outcome of the answer and then the
 * reveal. Values are set in mono tabular figures. Renders nothing in free
 * play, in the other modes (a walkthrough owns the slot then) and while a
 * checkpoint card is open.
 */
export function StoryNarration() {
  const play = useActivePlay();
  const mode = usePlayerStore((s) => s.mode);
  const open = useOpenAsk();
  if (!play || mode !== 'explore' || open) return null;
  return <StoryNarrationCard />;
}

function StoryNarrationCard() {
  const store = usePlayerStoreApi();
  const play = useActivePlay()!;
  const { plays } = useStoryData();
  const ui = useStoryUi((s) => s);
  const t = usePlayerStore((s) => s.sim.frame?.t ?? 0);
  const runner = usePlayerStore((s) => s.story.runner);
  const entry = currentNarration(play, ui, t);
  const done = runner === 'done';
  const held = runner === 'paused-caption';

  const kind = entry?.kind ?? 'intro';
  const label = entry ? KICKER[entry.kind] : '';
  const kicker = entry?.kind === 'outcome' && entry.pick ? `${label} · ${entry.pick.text}` : label || `${capitalize(genreLabel(play.genre))} · ${play.text}`;
  const text = entry?.text ?? play.tip ?? play.text;

  return (
    <div className="story-narr" data-story-narration={play.id} data-kind={kind} data-entry={entry?.key ?? 'intro'} data-done={done || undefined}>
      <div className="story-narr-body" key={entry?.key ?? 'intro'}>
        <p className="story-narr-k">
          <span className="truncate">{done ? `End · ${play.text}` : kicker}</span>
          {entry ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="flex-none tabular-nums">t={fmtSimTime(entry.start)}</span>
            </>
          ) : null}
        </p>
        <p className="story-narr-p">
          <RichText text={text} />
        </p>
      </div>
      {held || done ? (
        <div className="story-narr-acts">
          {held ? (
            <Button variant="glass" size="sm" onClick={() => continueCaption(store)}>
              Continue
            </Button>
          ) : (
            <>
              <Button variant="glass" size="sm" onClick={() => startScenario(store, play.id)}>
                Replay
              </Button>
              <Button variant="ghost" size="sm" onClick={() => startScenario(store, null)}>
                Back to {freePlayLabel(plays).toLowerCase()}
              </Button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
