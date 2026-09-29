'use client';

import { Button, CheckIcon, PowerIcon, Tooltip, TrendingUpIcon } from '@/app/(components)/ui';
import { usePlayerStore, usePlayerStoreApi } from '@/app/(components)/player/store/PlayerStoreProvider';
import { getBridge } from '@/app/(components)/player/worker/bridgeRegistry';
import { deriveFaults } from '@/app/(components)/player/breakit/tools';

export interface HeroBreakActionsProps {
  /** The node "Kill the cache" takes down (the diagram's own kill suggestion). */
  killTarget: string | null;
  /** The traffic multiplier "10× traffic" sends. */
  spike: number;
}

/**
 * The hero card's status line and its two Break it buttons, wired to the
 * hero's own running simulation through the same worker commands the full
 * player's toolbox uses. Each button toggles: kill, then restore; spike,
 * then back to 1×. Rendered inside the player's client boundary
 * (`DiagramPlayer`'s `heroFooter`) so it can reach the hero's store.
 */
export function HeroBreakActions({ killTarget, spike }: HeroBreakActionsProps) {
  const store = usePlayerStoreApi();
  const ready = usePlayerStore((s) => s.sim.status === 'ready');
  const actions = usePlayerStore((s) => s.actions);
  const faults = deriveFaults(actions);
  const killed = killTarget !== null && faults.killed.has(killTarget);
  const spiked = faults.spike !== 1;
  const broken = killed || spiked;

  function send(tool: string, target: string | null, value: number | null) {
    const bridge = getBridge(store);
    if (!bridge || !ready) return;
    bridge.applyAction(tool, target, value);
    if (!store.getState().sim.playing) bridge.play();
  }

  return (
    <>
      <div className="mx-3.5 mb-3 flex min-h-16 flex-wrap items-center gap-x-2.5 gap-y-1 rounded-xl border border-line-hairline bg-surface-sunken px-3 py-2.5">
        {broken ? (
          <PowerIcon aria-hidden className="h-3.5 w-3.5 flex-none text-signal-critical" />
        ) : (
          <CheckIcon aria-hidden className="h-3.5 w-3.5 flex-none text-brand-ink" />
        )}
        <p className="min-w-0 flex-[1_1_200px] text-[14px] leading-[1.45] text-ink-primary" aria-live="polite" data-slot="hero-status">
          {broken
            ? `${killed ? 'Cache down' : ''}${killed && spiked ? ' and ' : ''}${spiked ? `${spike}× traffic` : ''}. Watch p99 and errors climb, then undo it, or fix it in the full simulator.`
            : `Healthy at baseline. Your turn: kill the cache or send ${spike}× traffic.`}
        </p>
        <Tooltip content="Replay the tour — coming soon">
          <Button type="button" variant="ghost" size="sm" data-slot="hero-replay-tour" aria-disabled="true" className="flex-none">
            Replay tour
          </Button>
        </Tooltip>
      </div>

      <div className="flex flex-wrap gap-2 px-3.5 pb-3.5 max-sm:[&>*]:flex-auto">
        {killTarget ? (
          <Button
            type="button"
            variant="danger"
            data-slot="hero-kill-cache"
            aria-pressed={killed}
            disabled={!ready}
            onClick={() => send(killed ? 'restore' : 'kill', killTarget, null)}
          >
            <PowerIcon />
            {killed ? 'Restore the cache' : 'Kill the cache'}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="glass"
          data-slot="hero-10x-traffic"
          aria-pressed={spiked}
          disabled={!ready}
          onClick={() => send('spike', null, spiked ? 1 : spike)}
        >
          <TrendingUpIcon />
          {spiked ? 'Back to 1× traffic' : `${spike}× traffic`}
        </Button>
      </div>
    </>
  );
}
