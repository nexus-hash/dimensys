'use client';

import { useId, useState } from 'react';
import { TableView } from '@/app/(components)/data';
import { Button, SegmentedControl, Tooltip } from '@/app/(components)/ui';
import { usePlayerStore, usePlayerStoreApi } from '../store/PlayerStoreProvider';
import { getBridge } from '../worker/bridgeRegistry';
import type { SwitchView, TradePart } from '../types';
import { SectionHeading } from './SectionHeading';
import { TOGGLE_TOOL, activeOptionId, defaultOptionId, tradeRows, type TradeRow } from './tradeState';

/**
 * One row per axis, every option's score as a dot on a shared 0–10 track
 * (a dumbbell for the usual two options). The active option's dot is solid,
 * the others hollow and faded; the dots slide when the choice changes. The
 * legend under the rows says which dot is which, so nothing rests on color.
 */
function TradeBars({ rows, sw, active }: { rows: TradeRow[]; sw: SwitchView; active: string }) {
  return (
    <div className="grid gap-2.5">
      {rows.map((row) => {
        const scored = row.scores.filter((s): s is number => s !== null);
        const lo = Math.min(...scored) * 10;
        const hi = Math.max(...scored) * 10;
        const title = `${row.label}: ${sw.opts.map((o, i) => `${o.text} ${row.scores[i] ?? '—'}`).join(' · ')}`;
        return (
          <div key={row.label} className="grid grid-cols-[92px_1fr] items-center gap-2.5 text-caption text-ink-secondary">
            <span className="truncate" title={row.label}>
              {row.label}
            </span>
            <Tooltip content={title}>
              <div className="relative h-[18px]" role="img" aria-label={title}>
                <div className="absolute inset-x-0 top-[8px] h-0.5 rounded-full bg-line-hairline" />
                {scored.length > 1 ? (
                  <span className="absolute top-[8px] h-0.5 rounded-full bg-line-strong" style={{ left: `${lo}%`, width: `${hi - lo}%` }} />
                ) : null}
                {sw.opts.map((opt, i) => {
                  const score = row.scores[i];
                  if (score === null) return null;
                  const on = opt.id === active;
                  return (
                    <span
                      key={opt.id}
                      data-trade-dot={opt.id}
                      data-active={on ? 'true' : 'false'}
                      className={`absolute top-[3px] -ml-1.5 h-3 w-3 rounded-full transition-[opacity,background-color] duration-[var(--transition-duration-panel)] ease-[var(--ease-standard)] ${
                        on ? 'z-1 bg-ink-primary' : 'border-2 border-ink-primary bg-surface-page opacity-45'
                      }`}
                      style={{ left: `${score * 10}%` }}
                    />
                  );
                })}
              </div>
            </Tooltip>
          </div>
        );
      })}
    </div>
  );
}

type Pending = { opt: string; actions: readonly unknown[] } | null;

/**
 * A tradeoff part that follows a live switch: a segmented control picks the
 * option, the bars show every option's scores with the active one solid, and
 * the active option's pros and cons sit under them. When the simulation is
 * running a pick is sent as a switch flip through the worker; the active
 * option is then read back from the worker-stamped action log, so the
 * control, a share link's replay and Reset all agree. Without a simulation
 * the control still compares the options locally.
 */
export function TradeToggle({ part, sw }: { part: TradePart; sw: SwitchView }) {
  const store = usePlayerStoreApi();
  const status = usePlayerStore((s) => s.sim.status);
  const actions = usePlayerStore((s) => s.actions);
  const [pending, setPending] = useState<Pending>(null);
  const [local, setLocal] = useState<string | null>(null);
  const headingId = useId();

  const live = status === 'ready';
  const offline = status === 'unavailable' || status === 'error';
  const fallback = defaultOptionId(sw);
  const logged = activeOptionId(actions, sw);
  // A pick waits for the worker's echo; any change to the log (the echo
  // itself, or a Reset) supersedes it.
  const active = live ? (pending && pending.actions === actions ? pending.opt : logged) : offline ? (local ?? fallback) : logged;
  const activeOpt = sw.opts.find((o) => o.id === active) ?? sw.opts[0];
  const rows = tradeRows(sw);

  function choose(optId: string) {
    if (optId === active) return;
    if (live) {
      const bridge = getBridge(store);
      if (!bridge) return;
      setPending({ opt: optId, actions: store.getState().actions });
      bridge.applyAction(TOGGLE_TOOL, sw.id, optId);
    } else if (offline) {
      setLocal(optId);
    }
  }

  return (
    <section className="min-w-0" data-inspector-trade={sw.id}>
      <SectionHeading title={part.title} assumed={part.assumed} id={headingId} />
      <SegmentedControl
        size="sm"
        aria-label={sw.text}
        value={active}
        onValueChange={choose}
        options={sw.opts.map((o) => ({ value: o.id, label: o.text, disabled: !live && !offline }))}
        className="mb-3 max-w-full flex-wrap"
      />
      {rows.length > 0 ? (
        <>
          <TradeBars rows={rows} sw={sw} active={active} />
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[12px] font-medium text-ink-muted">
            {sw.opts.map((o) => (
              <span key={o.id} className="inline-flex items-center gap-1.5">
                <i
                  aria-hidden="true"
                  className={`inline-block h-2.5 w-2.5 rounded-full ${o.id === active ? 'bg-ink-primary' : 'border-2 border-ink-primary bg-surface-page'}`}
                />
                {o.text}
                {o.id === active ? <span className="sr-only"> (active)</span> : null}
              </span>
            ))}
            <span>0–10 · higher is better</span>
          </div>
          <TableView
            caption={`${sw.text}: scores per option, 0 to 10`}
            columns={['Axis', ...sw.opts.map((o) => o.text)]}
            rows={rows.map((r) => [r.label, ...r.scores.map((s) => (s === null ? '—' : String(s)))])}
          />
        </>
      ) : null}
      {activeOpt && (activeOpt.plus || activeOpt.minus) ? (
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-body" aria-live="polite">
          {activeOpt.plus ? (
            <>
              <dt className="font-medium text-ink-primary">Pros</dt>
              <dd className="min-w-0 break-words text-ink-secondary">{activeOpt.plus}</dd>
            </>
          ) : null}
          {activeOpt.minus ? (
            <>
              <dt className="font-medium text-ink-primary">Cons</dt>
              <dd className="min-w-0 break-words text-ink-secondary">{activeOpt.minus}</dd>
            </>
          ) : null}
        </dl>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 text-caption text-ink-muted">
          {live
            ? 'Switching changes the live simulation.'
            : offline
              ? 'Compare the options. This view has no live simulation.'
              : 'Available once the simulation starts.'}
        </p>
        {live && active !== fallback ? (
          <Button variant="ghost" size="sm" onClick={() => choose(fallback)}>
            Back to {sw.opts.find((o) => o.id === fallback)?.text ?? 'default'}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
