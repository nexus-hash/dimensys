'use client';

/**
 * Playback controls (T3.8): play/pause, a speed cycle button
 * (0.5×/1×/2×/4×) and — scenario mode only — a scrubber
 * with the sim clock. Free play has no end and no scrubber; its own clock
 * still shows, just without a track.
 *
 * `registerShortcuts`: the timeline dock's own instance (in
 * `HudTimelineFrame`) is always mounted, so it owns Space/`[`/`]` — the
 * phone sheet's Metrics tab reuses this same component (via `TimelineDock`)
 * but must not register the same shortcut ids a second time (both instances
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
import { useShortcut } from '@/app/(components)/command';
import { Button, Slider, PlayIcon, PauseIcon } from '@/app/(components)/ui';
import { fmtSimTime } from '../metrics/simTime';
import { usePlaybackCommands } from '../metrics/usePlaybackCommands';

export interface PlaybackControlsProps {
  registerShortcuts?: boolean;
}

export function PlaybackControls({ registerShortcuts = true }: PlaybackControlsProps) {
  const { playing, speed, status, t, duration, togglePlay, cycleSpeed, seek } = usePlaybackCommands();
  const disabled = status !== 'ready';

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

  return (
    <>
      <Button
        variant="glass"
        size="sm"
        iconOnly
        aria-label={playing ? 'Pause (Space)' : 'Play (Space)'}
        disabled={disabled}
        onClick={togglePlay}
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </Button>
      <Button
        variant="glass"
        size="sm"
        disabled={disabled}
        onClick={() => cycleSpeed(1)}
        aria-label={`Speed ${speed}×. Press to cycle ([ and ] also work)`}
        className="font-mono tabular-nums"
      >
        {speed}×
      </Button>
      {duration !== null ? (
        <div className="player-scrubber" role="group" aria-label="Scenario timeline">
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
          <span className="player-time font-mono tabular-nums">
            {fmtSimTime(t)} <span className="player-time-total">/ {fmtSimTime(duration)}</span>
          </span>
        </div>
      ) : (
        <span className="player-time font-mono tabular-nums" aria-live="off">
          {playing ? 'running' : 'paused'} {fmtSimTime(t)}
          {speed !== 1 ? ` · ${speed}×` : ''}
        </span>
      )}
    </>
  );
}
