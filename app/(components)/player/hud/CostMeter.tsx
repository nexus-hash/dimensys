'use client';

/**
 * The HUD's money card: what the run has cost so far, with one simulated
 * minute billed as one month of the current run rate, next to the switch
 * that turns auto-scaling on for every server and worker (one more pod above
 * 80% busy, one fewer below 70%). Watching it next to the cost tile shows
 * what autoscaling saves compared with running at peak size all the time.
 */
import { useId } from 'react';
import { Switch, toast } from '@/app/(components)/ui';
import { globalMetricKey } from '../metricKeys';
import { useMetricSeriesFeed } from '../metrics/useMetricSeriesFeed';
import { usePlayerStore, usePlayerStoreApi } from '../store/PlayerStoreProvider';
import { getBridge } from '../worker/bridgeRegistry';

const SPENT_KEY = globalMetricKey('z');

/** Simulated seconds as billed time: 60 s = 1 month, a month read as 30 days. */
export function billedPeriod(t: number): string {
  const months = Math.max(0, t) / 60;
  const whole = Math.floor(months);
  const days = Math.floor((months - whole) * 30);
  if (whole === 0) return `${days} d`;
  return days === 0 ? `${whole} mo` : `${whole} mo ${days} d`;
}

export function formatDollars(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  return `$${Math.round(v).toLocaleString('en-US')}`;
}

export function CostMeter() {
  const store = usePlayerStoreApi();
  const feed = useMetricSeriesFeed([SPENT_KEY], 5);
  const spent = feed.series[SPENT_KEY]?.value;
  // On when the latest diagram-wide `elastic` action turned it on.
  const auto = usePlayerStore((s) => {
    for (let i = s.actions.length - 1; i >= 0; i--) {
      const a = s.actions[i];
      if (a[1] === 'elastic' && a[2] === null) return a[3] === 1;
    }
    return false;
  });
  const switchId = useId();

  const toggle = (on: boolean) => {
    const bridge = getBridge(store);
    if (!bridge || store.getState().sim.status !== 'ready') return;
    bridge.applyAction('elastic', null, on ? 1 : 0);
    if (!store.getState().sim.playing) bridge.play();
    toast(on ? 'Auto-scaling on: +1 pod above 80% busy, −1 below 70%' : 'Auto-scaling off: back to the set sizes');
  };

  return (
    <div className="cost-meter" role="group" aria-label="Money spent, one simulated minute billed as one month" title="Money spent so far: every simulated minute bills one month at the current cost">
      <div className="cost-meter-top">
        <span className="cost-meter-label">spent so far</span>
        <span className="cost-meter-auto">
          <label htmlFor={switchId}>Auto-scale</label>
          <Switch id={switchId} checked={auto} onCheckedChange={toggle} />
        </span>
      </div>
      <div className="cost-meter-value">
        <span className="cost-meter-amount">{spent === undefined ? '—' : formatDollars(spent)}</span>
        <span className="cost-meter-period">{spent === undefined ? '1 min = 1 mo' : `over ${billedPeriod(feed.t)} · 1 min = 1 mo`}</span>
      </div>
    </div>
  );
}
