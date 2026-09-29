'use client';

import './story.css';
import { usePlayerStore, usePlayerStoreApi } from '../store/PlayerStoreProvider';
import { fmtSimTime } from '../metrics/simTime';
import { useStoryData } from './StoryContext';
import { authoredPlays, freePlayLabel, genreLabel } from './model';
import { startScenario } from './actions';
import type { PlayView } from '../types';

/**
 * The rail's Scenarios section: "Free play" and then the diagram's authored
 * scenarios, as radio-style options. Choosing one starts the simulation
 * over on it; the one running shows where it is (playing, waiting on a
 * question, ended). `compact` is the phone sheet's copy: same list, no
 * blurbs.
 */
export function ScenarioList({ compact = false }: { compact?: boolean }) {
  const store = usePlayerStoreApi();
  const { plays } = useStoryData();
  const activeId = usePlayerStore((s) => s.story.scenarioId);
  const status = usePlayerStore((s) => s.sim.status);
  const disabled = status === 'unavailable' || status === 'error';
  const list = authoredPlays(plays);

  if (status === 'unavailable') return <p className="text-caption text-ink-muted">This diagram doesn&apos;t simulate yet.</p>;

  return (
    <div className="story-rail" data-compact={compact || undefined}>
      <ScenarioOption
        id={null}
        title={freePlayLabel(plays)}
        meta="live · runs until you stop it"
        active={activeId === null}
        disabled={disabled}
        onChoose={() => startScenario(store, null)}
      />
      {list.map((p) => (
        <ScenarioOption
          key={p.id}
          id={p.id}
          title={p.text}
          meta={metaFor(p)}
          tip={compact ? undefined : p.tip}
          active={activeId === p.id}
          disabled={disabled}
          onChoose={() => startScenario(store, p.id)}
        />
      ))}
      {list.length === 0 ? <p className="story-rail-empty">No scripted scenarios for this diagram yet.</p> : null}
    </div>
  );
}

function metaFor(p: PlayView): string {
  const parts = [genreLabel(p.genre)];
  if (p.secs) parts.push(fmtSimTime(p.secs));
  if (p.asks.length) parts.push(p.asks.length === 1 ? '1 question' : `${p.asks.length} questions`);
  return parts.join(' · ');
}

function ScenarioOption({
  id,
  title,
  meta,
  tip,
  active,
  disabled,
  onChoose,
}: {
  id: string | null;
  title: string;
  meta: string;
  tip?: string;
  active: boolean;
  disabled: boolean;
  onChoose: () => void;
}) {
  return (
    <div className="story-rail-item" data-scenario={id ?? 'free'}>
      <button type="button" className="wt-opt story-opt" aria-current={active ? 'true' : undefined} disabled={disabled} onClick={onChoose}>
        <span className="wt-opt-dot" aria-hidden="true" />
        <span className="min-w-0">
          <span className="wt-opt-title">{title}</span>
          <small>{meta}</small>
          {tip ? <span className="story-opt-tip">{tip}</span> : null}
        </span>
      </button>
      {active && id ? <ScenarioStatus /> : null}
    </div>
  );
}

/** Where the running scenario is: its clock, or what it's waiting on. */
function ScenarioStatus() {
  const runner = usePlayerStore((s) => s.story.runner);
  const playing = usePlayerStore((s) => s.sim.playing);
  const status = usePlayerStore((s) => s.sim.status);
  const t = usePlayerStore((s) => Math.floor(s.sim.frame?.t ?? 0));
  const duration = usePlayerStore((s) => s.story.duration);
  let text: string;
  let state: string;
  if (status !== 'ready' || runner === null) {
    text = 'starting…';
    state = 'loading';
  } else if (runner === 'done') {
    text = duration ? `ended · ${fmtSimTime(duration)}` : 'ended';
    state = 'done';
  } else if (runner === 'paused-checkpoint') {
    text = `your call · ${fmtSimTime(t)}`;
    state = 'checkpoint';
  } else {
    const clock = duration ? `${fmtSimTime(t)} / ${fmtSimTime(duration)}` : fmtSimTime(t);
    text = `${playing && runner === 'running' ? 'playing' : 'paused'} · ${clock}`;
    state = playing && runner === 'running' ? 'playing' : 'paused';
  }
  return (
    <p className="story-status" data-state={state}>
      <span className="story-status-dot" aria-hidden="true" />
      <span className="story-status-text">{text}</span>
    </p>
  );
}
