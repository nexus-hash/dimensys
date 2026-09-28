'use client';

/**
 * The HUD's money card: what the run has cost so far, with one simulated
 * minute billed as one month of the current run rate, next to the
 * auto-scale menu for every server and worker. Modes:
 * - Both (the default): more pods when they're busy (above 70%) or when a
 *   request path is close to its p99 goal and more pods would help; fewer
 *   only when both allow it.
 * - CPU only: 70% up / 60% down. Cheapest, but blind to latency.
 * - Latency only: keeps the p99 goals.
 * Watching it next to the cost tile shows what each choice costs.
 */
import { ChevronDownIcon, CheckIcon, DropdownMenu, toast } from '@/app/(components)/ui';
import { globalMetricKey } from '../metricKeys';
import { useMetricSeriesFeed } from '../metrics/useMetricSeriesFeed';
import { usePlayerStore, usePlayerStoreApi } from '../store/PlayerStoreProvider';
import { getBridge } from '../worker/bridgeRegistry';

const SPENT_KEY = globalMetricKey('z');

/** `elastic` action values: 0 off, 1 both, 2 utilization only, 3 latency only. */
export const AUTO_MODES = [
  { value: 0, short: 'Off', label: 'Off', toast: 'Auto-scaling off: back to the set sizes' },
  { value: 1, short: 'Both', label: 'Both (recommended)', toast: 'Auto-scaling on CPU and latency: more pods when busy or near the p99 goal' },
  { value: 2, short: 'CPU', label: 'CPU only', toast: 'Auto-scaling on CPU: +1 pod above 70% busy, −1 after 30 s below 60%' },
  { value: 3, short: 'Latency', label: 'Latency only', toast: 'Auto-scaling on latency: pods follow the p99 goals' },
] as const;

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
  // The mode of the latest diagram-wide `elastic` action (0 = off).
  const mode = usePlayerStore((s) => {
    for (let i = s.actions.length - 1; i >= 0; i--) {
      const a = s.actions[i];
      if (a[1] === 'elastic' && a[2] === null) return typeof a[3] === 'number' ? a[3] : 0;
    }
    return 0;
  });
  const current = AUTO_MODES.find((m) => m.value === mode) ?? AUTO_MODES[0];

  const choose = (value: string) => {
    const next = AUTO_MODES.find((m) => String(m.value) === value);
    const bridge = getBridge(store);
    if (!next || next.value === mode || !bridge || store.getState().sim.status !== 'ready') return;
    bridge.applyAction('elastic', null, next.value);
    if (!store.getState().sim.playing) bridge.play();
    toast(next.toast);
  };

  return (
    <div className="cost-meter" role="group" aria-label="Money spent, one simulated minute billed as one month" title="Money spent so far: every simulated minute bills one month at the current cost">
      <div className="cost-meter-top">
        <span className="cost-meter-label">spent so far</span>
        <DropdownMenu
          align="end"
          onSelect={choose}
          items={AUTO_MODES.map((m) => ({
            value: String(m.value),
            label: (
              <span className="inline-flex items-center gap-2">
                <CheckIcon aria-hidden="true" className={m.value === mode ? 'size-3.5' : 'size-3.5 invisible'} />
                {m.label}
              </span>
            ),
          }))}
          trigger={
            <button type="button" className="cost-meter-auto" aria-label={`Auto-scale: ${current.label}`} data-auto-mode={mode}>
              Auto-scale: <b className={mode ? 'is-on' : undefined}>{current.short}</b>
              <ChevronDownIcon aria-hidden="true" className="size-3" />
            </button>
          }
        />
      </div>
      <div className="cost-meter-value">
        <span className="cost-meter-amount">{spent === undefined ? '—' : formatDollars(spent)}</span>
        <span className="cost-meter-period">{spent === undefined ? '1 min = 1 mo' : `over ${billedPeriod(feed.t)} · 1 min = 1 mo`}</span>
      </div>
    </div>
  );
}
