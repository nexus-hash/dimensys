'use client';

/**
 * Scale by hand: a stepper for a node's replica count (pods, instances,
 * nodes, shards or brokers), showing its live count and load, and the
 * monthly cost of the change before it's applied. Applying sends the
 * `resize` action through the worker, so it joins the action log (undo,
 * Reset and share links all follow) and the diagram reacts live.
 */
import { useState } from 'react';
import { Button, IconButton, MinusIcon, PlusIcon, toast } from '@/app/(components)/ui';
import { nodeMetricKey, REPLICA_CODE, UTILIZATION_CODE } from '../metricKeys';
import { useMetricSeriesFeed } from '../metrics/useMetricSeriesFeed';
import { usePlayerStoreApi } from '../store/PlayerStoreProvider';
import { getBridge } from '../worker/bridgeRegistry';
import type { KnobView } from '../types';

const money = (v: number) => `$${Math.round(Math.abs(v)).toLocaleString('en-US')}`;

export function ScaleControl({ knob, label }: { knob: KnobView; label: string }) {
  const store = usePlayerStoreApi();
  const replicasKey = nodeMetricKey(knob.el, REPLICA_CODE);
  const utilKey = nodeMetricKey(knob.el, UTILIZATION_CODE);
  const feed = useMetricSeriesFeed([replicasKey, utilKey], 5);
  const live = feed.series[replicasKey]?.value;
  const current = live !== undefined ? Math.round(live) : knob.n;
  const util = feed.series[utilKey]?.value;

  // The stepper follows the live count until the viewer starts changing it.
  const [draft, setDraft] = useState<number | null>(null);
  const target = draft ?? current;

  const step = (d: number) => setDraft(Math.min(knob.hi, Math.max(knob.lo, target + d)));
  const delta = target - current;
  const costDelta = delta * knob.each;

  const apply = () => {
    const bridge = getBridge(store);
    if (!bridge || store.getState().sim.status !== 'ready' || delta === 0) return;
    bridge.applyAction('resize', knob.el, target);
    if (!store.getState().sim.playing) bridge.play();
    toast(`Scaled ${label} to ×${target} ${knob.noun}`);
    setDraft(null);
  };

  const headingId = `scale-${knob.el}`;
  return (
    <section className="scale-control" aria-labelledby={headingId}>
      <div className="scale-head">
        <h3 id={headingId} className="scale-title">
          Scale
        </h3>
        <span className="scale-now">
          ×{current} {knob.noun}
          {util !== undefined ? ` · ${Math.round(util * 100)}% busy` : ''}
        </span>
      </div>
      <div className="scale-row">
        <div className="scale-stepper" role="group" aria-label={`${label} ${knob.noun}`}>
          <IconButton size="sm" aria-label={`One fewer ${knob.noun}`} onClick={() => step(-1)} disabled={target <= knob.lo}>
            <MinusIcon />
          </IconButton>
          <output className="scale-count" aria-live="polite">
            ×{target}
          </output>
          <IconButton size="sm" aria-label={`One more ${knob.noun}`} onClick={() => step(1)} disabled={target >= knob.hi}>
            <PlusIcon />
          </IconButton>
        </div>
        <span className="scale-cost">
          {delta === 0
            ? knob.each > 0
              ? `${money(knob.each)}/mo each`
              : 'no cost per replica'
            : `${costDelta >= 0 ? '+' : '−'}${money(costDelta)}/mo`}
        </span>
        <Button size="sm" variant={delta === 0 ? 'glass' : 'primary'} onClick={apply} disabled={delta === 0}>
          {delta === 0 ? 'Apply' : `Apply ×${target}`}
        </Button>
      </div>
    </section>
  );
}
