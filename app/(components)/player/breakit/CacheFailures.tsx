'use client';

/**
 * Cache failures in Break it: the toolbox's Cache control (a popover listing
 * the failures for the chosen cache or CDN, each with one plain line on what
 * it simulates) and, in the Fix it panel, the current failure's own live
 * readings (hit ratio, misses reaching the store, stale answers, filter
 * rejections, the busiest shard), so its effect and each fix's show where
 * the fix is picked. Only shown for diagrams whose data lists them.
 */
import { useId, useMemo } from 'react';
import { Kbd, Popover, Select } from '@/app/(components)/ui';
import { Sparkline, formatPercent, formatRps } from '@/app/(components)/data';
import { usePlayerStore, usePlayerStoreApi } from '../store/PlayerStoreProvider';
import { nodeMetricKey } from '../metricKeys';
import { useMetricSeriesFeed } from '../metrics/useMetricSeriesFeed';
import { useBreakData } from './BreakContext';
import { breakUiFor, useBreakUi } from './breakStore';
import { useBreakCommands } from './useBreakCommands';
import { CacheIcon } from './icons';
import { CACHE_TOOL, activeBreaks, breakAction, packFor, packTargets, SERIES_LABELS, type ActiveBreak } from './pack';
import { targetName } from './tools';
import type { PackView } from '../types';

/** The cache the popover acts on: the one picked there, else the selected node when it's a cache, else the first. */
export function useCacheTarget(): PackView | undefined {
  const { kit, catalog } = useBreakData();
  const picked = useBreakUi((s) => s.cacheTarget);
  const selected = usePlayerStore((s) => (s.selection?.kind === 'node' ? s.selection.id : null));
  const targets = useMemo(() => packTargets(kit, catalog), [kit, catalog]);
  const id = [picked, selected].find((x) => x && targets.some((t) => t.id === x)) ?? targets[0]?.id;
  return packFor(kit, id);
}

/** The Cache button (or chip) and its failures popover. `open` gates which of the two instances may show it. */
export function CacheControl({ variant, open, disabled }: { variant: 'bar' | 'chip'; open: boolean; disabled: boolean }) {
  const store = usePlayerStoreApi();
  const data = useBreakData();
  const { kit, catalog } = data;
  const commands = useBreakCommands(data);
  const cacheOpen = useBreakUi((s) => s.cacheOpen);
  const pack = useCacheTarget();
  const targets = useMemo(() => packTargets(kit, catalog), [kit, catalog]);
  const actions = usePlayerStore((s) => s.actions);
  const current = useMemo(() => new Set(activeBreaks(actions, kit).map((a) => a.brk.id)), [actions, kit]);
  const headId = useId();
  if (!pack) return null;
  const shown = cacheOpen && open;

  const trigger =
    variant === 'bar' ? (
      <button
        type="button"
        className="break-tool"
        aria-pressed={shown}
        aria-haspopup="dialog"
        aria-keyshortcuts={CACHE_TOOL.ariaKey}
        disabled={disabled}
        title={CACHE_TOOL.hint}
      >
        <CacheIcon />
        {CACHE_TOOL.label}
        <Kbd className="break-kbd">{CACHE_TOOL.keyLabel}</Kbd>
      </button>
    ) : (
      <button type="button" className="break-chip" aria-pressed={shown} aria-haspopup="dialog" disabled={disabled}>
        <CacheIcon />
        {CACHE_TOOL.chip}
      </button>
    );

  return (
    <Popover
      trigger={trigger}
      open={shown}
      onOpenChange={(next) => breakUiFor(store).set({ cacheOpen: next, spikeOpen: false, armed: null })}
      side="bottom"
      align="start"
      className="break-cache"
      aria-label="Cache failures"
    >
      <div role="group" aria-labelledby={headId}>
        <div className="break-cache-h">
          <span id={headId} className="break-cache-title">
            Cache failures
          </span>
          {targets.length > 1 ? (
            <Select
              aria-label="Cache to break"
              className="break-cache-select"
              value={pack.el}
              options={targets.map((t) => ({ value: t.id, label: t.text }))}
              onValueChange={(id) => breakUiFor(store).set({ cacheTarget: id })}
            />
          ) : (
            <span className="break-cache-on">on {targetName({ id: pack.el }, catalog)}</span>
          )}
        </div>
        <ul className="break-cache-list">
          {pack.breaks.map((b) => {
            const whyId = `${headId}-${b.id}`;
            const [tool, target] = breakAction(pack, b);
            return (
              <li key={b.id}>
                <button
                  type="button"
                  className="break-cache-item"
                  data-break-id={b.id}
                  aria-describedby={whyId}
                  disabled={disabled}
                  onClick={() => commands.apply(tool, target, null)}
                >
                  <span className="break-cache-name">
                    {b.text}
                    {current.has(b.id) ? <span className="break-cache-now">in effect</span> : null}
                  </span>
                  <span className="break-cache-why" id={whyId}>
                    {b.md}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// Fix it: the current failure, live
// ---------------------------------------------------------------------------

function fmtCode(code: string, v: number | undefined): string {
  const unit = SERIES_LABELS[code]?.unit ?? 'ratio';
  if (v === undefined) return '—';
  return unit === 'rps' ? `${formatRps(v)} rps` : `${formatPercent(v)}%`;
}

/** The most recent cache failure still in effect, with its cache's live readings. Nothing when there is none. */
export function CacheFailureCard() {
  const { kit } = useBreakData();
  const actions = usePlayerStore((s) => s.actions);
  const active = useMemo(() => activeBreaks(actions, kit), [actions, kit]);
  const latest = active[active.length - 1];
  if (!latest) return null;
  return <CacheFailureReadout key={latest.brk.id} active={latest} others={active.length - 1} />;
}

function CacheFailureReadout({ active, others }: { active: ActiveBreak; others: number }) {
  const { catalog } = useBreakData();
  const { pack, brk } = active;
  const keys = useMemo(() => brk.series.map((c) => nodeMetricKey(pack.el, c)), [brk, pack]);
  const feed = useMetricSeriesFeed(keys, 60);
  const name = targetName({ id: pack.el }, catalog);
  return (
    <section className="break-cf" data-break-id={brk.id} aria-label={`Current failure: ${brk.text} on ${name}`}>
      <p className="break-fixit-k">Current failure</p>
      <p className="break-cf-t">
        <CacheIcon className="break-cf-ic" />
        <span>
          {brk.text} <span className="break-cf-on">on {name}</span>
        </span>
      </p>
      <p className="break-cf-why">{brk.md}</p>
      <table className="break-cmp break-cf-read">
        <caption className="sr-only">{`${name}, live`}</caption>
        <tbody>
          {brk.series.map((code, i) => {
            const s = feed.series[keys[i]];
            const label = SERIES_LABELS[code]?.text ?? code;
            const values = (s?.history ?? []).map((p) => p.v);
            return (
              <tr key={code} data-code={code} data-value={s?.value ?? ''}>
                <th scope="row">{label}</th>
                <td className="break-cf-spark" aria-hidden="true">
                  {values.length > 1 ? <Sparkline values={values} window={120} height={16} title={`${label}, last minute`} table={false} /> : null}
                </td>
                <td className="break-cf-now">{fmtCode(code, s?.value)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {others > 0 ? <p className="break-cf-more">{others === 1 ? 'One more cache failure is in effect.' : `${others} more cache failures are in effect.`}</p> : null}
    </section>
  );
}

/** Node readings for a fix's before/now table: label and format per full metric key. */
export function nodeRowLabel(key: string): { label: string; fmt: (v: number | undefined) => string } {
  const code = key.slice(key.lastIndexOf('.') + 1);
  return { label: SERIES_LABELS[code]?.text ?? code, fmt: (v) => fmtCode(code, v) };
}
