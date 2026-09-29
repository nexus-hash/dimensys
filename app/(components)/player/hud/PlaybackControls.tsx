'use client';

/**
 * Playback controls (T3.8): one 40px transport row — play/pause, a speed
 * cycle button (0.5×/1×/2×/4×), the clock, and Reset at the far end.
 * Free play has no end and no scrubber: its clock reads "LIVE running
 * 00:10" beside a live dot, with a muted note that the numbers are computed
 * every tick. Scenario mode swaps that readout for a scrubber and
 * "00:32 / 01:30".
 *
 * `registerShortcuts`: the timeline dock's own instance (in
 * `HudTimelineFrame`) is always mounted, so it owns Space/`[`/`]`/R —
 * a second copy of the dock (`TimelineDock` with `registerShortcuts={false}`)
 * must not register the same shortcut ids a second time (both instances
 * are mounted simultaneously; only CSS/tab visibility differs). This is
 * `useShortcut`'s `enabled` parameter, not just its `hidden` field: the
 * registry keys its live entries by id alone, so if *both* instances called
 * `useShortcut` unconditionally, the non-owning one's registration could
 * silently overwrite the owning one's in the registry's map (whichever
 * mounts/re-renders last wins that id) even though its own handler is a
 * no-op — `enabled={registerShortcuts}` on the non-owning instance means it
 * never registers at all, so there is only ever one live entry per id. The
 * buttons themselves work either way — only the global key bindings are
 * singular.
 */
import { useId } from 'react';
import { useShortcut } from '@/app/(components)/command';
import { IconButton, Slider, PlayIcon, PauseIcon, ResetIcon } from '@/app/(components)/ui';
import { fmtSimTime } from '../metrics/simTime';
import { usePlaybackCommands } from '../metrics/usePlaybackCommands';
import { TimelineMarks } from '../story/TimelineMarks';

export interface PlaybackControlsProps {
  registerShortcuts?: boolean;
}

export function PlaybackControls({ registerShortcuts = true }: PlaybackControlsProps) {
  const { playing, speed, status, t, duration, togglePlay, cycleSpeed, seek, reset } = usePlaybackCommands();
  const disabled = status !== 'ready';
  const marksId = useId();

  useShortcut(
    { id: 'player:play-pause', keys: 'space', label: 'Play / pause', group: 'Player', when: 'player' },
    (event) => {
      if (disabled) return;
      event.preventDefault();
      togglePlay();
    },
    registerShortcuts,
  );
  useShortcut(
    { id: 'player:speed-down', keys: '[', label: 'Slower', group: 'Player', when: 'player' },
    (event) => {
      if (disabled) return;
      event.preventDefault();
      cycleSpeed(-1);
    },
    registerShortcuts,
  );
  useShortcut(
    { id: 'player:speed-up', keys: ']', label: 'Faster', group: 'Player', when: 'player' },
    (event) => {
      if (disabled) return;
      event.preventDefault();
      cycleSpeed(1);
    },
    registerShortcuts,
  );
  useShortcut(
    { id: 'player:reset', keys: 'r', label: 'Reset', group: 'Player', when: 'player' },
    (event) => {
      if (disabled) return;
      event.preventDefault();
      reset();
    },
    registerShortcuts,
  );

  return (
    <>
      <IconButton
        size="sm"
        className="player-tl-btn"
        aria-label={playing ? 'Pause (Space)' : 'Play (Space)'}
        disabled={disabled}
        onClick={togglePlay}
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </IconButton>
      <button
        type="button"
        className="player-tl-speed"
        disabled={disabled}
        onClick={() => cycleSpeed(1)}
        aria-label={`Speed ${speed}×. Press to cycle ([ and ] also work)`}
      >
        {speed}×
      </button>
      {duration !== null ? (
        <div className="player-scrubber" role="group" aria-label="Scenario timeline" aria-describedby={marksId}>
          <div className="player-scrubber-track">
            <TimelineMarks duration={duration} descId={marksId} />
            <Slider
              value={t}
              min={0}
              max={duration}
              step={0.1}
              disabled={disabled}
              onValueChange={seek}
              aria-label="Scrub"
              className="player-scrubber-slider"
            />
          </div>
          <span className="player-time">
            {fmtSimTime(t)} <span className="player-time-total">/ {fmtSimTime(duration)}</span>
          </span>
        </div>
      ) : (
        <div className="player-tl-live" data-playing={playing}>
          <span className="player-live-dot" aria-hidden="true" />
          <b>LIVE</b>
          <span className="player-tl-run">
            {playing ? 'running' : 'paused at'} {fmtSimTime(t)}
            {speed !== 1 ? ` · ${speed}×` : ''}
          </span>
          <span className="player-tl-note">computed every tick · charts show the last 60 s</span>
        </div>
      )}
      <IconButton size="sm" className="player-tl-btn player-tl-reset" aria-label="Reset (R)" disabled={disabled} onClick={reset}>
        <ResetIcon />
      </IconButton>
    </>
  );
}
