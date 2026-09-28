'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Button, Pill, Slider } from '@/app/(components)/ui';
import { usePlayerStore, usePlayerStoreApi } from '../store/PlayerStoreProvider';
import { getBridge } from '../worker/bridgeRegistry';
import { onCalcReply } from '../worker/calcResults';
import type { CalcPart, CalcView, UserAction } from '../types';
import { SectionHeading } from './SectionHeading';
import { formatCalcValue, formatSliderValue, sliderStep, snapSliderValue } from './calcFormat';

/** How long slider movement settles before the preview is recomputed. */
const PREVIEW_DEBOUNCE_MS = 120;

type Values = Record<string, number>;

function initialValues(calc: CalcView): Values {
  return Object.fromEntries(calc.sliders.map((s) => [s.id, s.init]));
}

/** The values this calculator was last applied with, from the action log (`id=value,…`), or `null`. */
export function lastAppliedText(actions: readonly UserAction[], calcId: string): string | null {
  for (let i = actions.length - 1; i >= 0; i--) {
    const [, tool, target, value] = actions[i];
    if (tool === 'calc' && target === calcId && typeof value === 'string') return value;
  }
  return null;
}

export function parseCalcValues(text: string): Values | null {
  const out: Values = {};
  for (const part of text.split(',')) {
    const eq = part.indexOf('=');
    const n = Number(part.slice(eq + 1));
    if (eq <= 0 || !Number.isFinite(n)) return null;
    out[part.slice(0, eq)] = n;
  }
  return out;
}

function sameValues(a: Values, b: Values): boolean {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((k) => a[k] === b[k]);
}

/** The output shown large: the first one that feeds the simulation, else the first one. */
export function heroResultId(calc: CalcView): string | undefined {
  return (calc.results.find((r) => r.feeds) ?? calc.results[0])?.id;
}

/**
 * A sizing calculator: sliders in, outputs out. The simulation worker owns
 * the formulas; while the sliders move it answers previews (`dry`), which
 * change nothing. When the calculator feeds the simulation, "Apply" sends
 * the same values for real and the worker writes the results into the live
 * run (e.g. a replica count), so the board, HUD and health all move. The
 * apply joins the action log, so a share link replays it; the panel reads
 * what's applied back from that log (a restored link shows its values).
 * `heading={false}` drops the title row where the host already has one.
 */
export function CalcPanel({ part, calc, heading = true }: { part: CalcPart; calc: CalcView; heading?: boolean }) {
  const store = usePlayerStoreApi();
  const status = usePlayerStore((s) => s.sim.status);
  const live = status === 'ready';
  const feeds = calc.sliders.some((s) => s.feeds) || calc.results.some((r) => r.feeds);
  const hero = heroResultId(calc);
  const headingId = useId();

  // What's applied lives in the action log: Reset, an undo and a share link all agree with it.
  const appliedText = usePlayerStore((s) => lastAppliedText(s.actions, calc.id));
  const applied = useMemo(() => {
    const parsed = appliedText === null ? null : parseCalcValues(appliedText);
    return parsed ? { ...initialValues(calc), ...parsed } : null;
  }, [appliedText, calc]);
  const [values, setValues] = useState<Values>(() => applied ?? initialValues(calc));
  const [outputs, setOutputs] = useState<Record<string, number> | null>(null);
  const [applying, setApplying] = useState(false);
  const [failed, setFailed] = useState(false);
  const previewSeq = useRef(-1);
  const applySeq = useRef(-1);

  // Replies for this calculator's own commands only.
  useEffect(
    () =>
      onCalcReply(store, (reply) => {
        const isApply = reply.seq === applySeq.current;
        if (!isApply && reply.seq !== previewSeq.current) return;
        if (reply.error) {
          setFailed(true);
          if (isApply) setApplying(false);
          return;
        }
        setFailed(false);
        if (reply.outputs) setOutputs({ ...reply.outputs });
        if (isApply) setApplying(false);
      }),
    [store],
  );

  // Applied from elsewhere (a share link rebuilding the run): show those values.
  const [seenApplied, setSeenApplied] = useState(appliedText);
  if (appliedText !== seenApplied) {
    setSeenApplied(appliedText);
    if (applied && !sameValues(values, applied)) setValues(applied);
  }

  // Live preview, debounced.
  const valuesKey = JSON.stringify(values);
  useEffect(() => {
    if (!live) return;
    const timer = setTimeout(() => {
      const bridge = getBridge(store);
      if (bridge) previewSeq.current = bridge.calc(calc.id, JSON.parse(valuesKey) as Values, true);
    }, PREVIEW_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [live, store, calc.id, valuesKey]);

  function apply() {
    const bridge = getBridge(store);
    if (!bridge || !live) return;
    setApplying(true);
    applySeq.current = bridge.calc(calc.id, { ...values });
  }

  const isApplied = applied !== null && sameValues(applied, values);
  const reading = (id: string, fmt: string) => formatCalcValue(live ? outputs?.[id] : undefined, fmt);
  // The hero output leads.
  const ordered = [...calc.results.filter((r) => r.id === hero), ...calc.results.filter((r) => r.id !== hero)];

  return (
    <section className="min-w-0" data-inspector-calc={calc.id}>
      {heading ? <SectionHeading title={part.title} assumed={part.assumed} id={headingId} /> : null}
      {calc.md ? <p className="mb-3 break-words font-mono text-mono-sm text-ink-muted">{calc.md}</p> : null}
      <div className="grid gap-3 rounded-xl border border-line-hairline bg-surface-raised p-3">
        {calc.sliders.map((s) => {
          const step = sliderStep(s.lo, s.hi, s.inc);
          const labelId = `${headingId}-${s.id}`;
          return (
            <div key={s.id} className="grid gap-1">
              <div className="flex items-baseline justify-between gap-2 text-caption text-ink-secondary">
                <span id={labelId} className="min-w-0 break-words">
                  {s.text}
                </span>
                <output aria-labelledby={labelId} className="flex-none font-mono text-[12px] font-semibold tabular-nums text-ink-primary">
                  {formatSliderValue(values[s.id])}
                  {s.suffix ? <span className="ml-1 font-normal text-ink-muted">{s.suffix}</span> : null}
                </output>
              </div>
              <Slider
                aria-label={s.text}
                value={values[s.id]}
                min={s.lo}
                max={s.hi}
                step={step}
                scale={s.log ? 'log' : 'linear'}
                onValueChange={(v) => setValues((cur) => ({ ...cur, [s.id]: snapSliderValue(v, s.lo, s.hi, step, s.log) }))}
              />
            </div>
          );
        })}
        {calc.results.length > 0 ? (
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5 border-t border-line-hairline pt-3" aria-live="polite" data-calc-outputs>
            {ordered.map((r) => {
              const { value, unit } = reading(r.id, r.fmt);
              return (
                <div key={r.id} className="flex min-w-0 flex-col-reverse" data-calc-output={r.id}>
                  <dt className="break-words text-caption text-ink-muted">{r.text}</dt>
                  <dd className={`font-mono font-semibold tabular-nums text-ink-primary ${r.id === hero ? 'text-[20px] leading-7' : 'text-[16px] leading-6'}`}>
                    {value}
                    {unit ? <span className="ml-1 text-[12px] font-normal text-ink-muted">{unit}</span> : null}
                  </dd>
                </div>
              );
            })}
          </dl>
        ) : null}
        {feeds ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Pill variant="neutral">{isApplied ? '✓ Applied to the simulation' : '→ Feeds the simulation'}</Pill>
            <Button variant="glass" size="sm" onClick={apply} disabled={!live || applying || isApplied}>
              {applying ? 'Applying…' : isApplied ? 'Applied' : 'Apply to simulation'}
            </Button>
          </div>
        ) : null}
      </div>
      <p className="mt-2 text-caption text-ink-muted" role="status">
        {failed
          ? 'The simulation could not evaluate these values.'
          : live
            ? feeds
              ? isApplied
                ? 'The live run now uses these results.'
                : 'Preview only until you apply it.'
              : null
            : status === 'unavailable' || status === 'error'
              ? 'Results are computed by the live simulation, which this view does not have.'
              : 'Results appear once the simulation starts.'}
      </p>
    </section>
  );
}
