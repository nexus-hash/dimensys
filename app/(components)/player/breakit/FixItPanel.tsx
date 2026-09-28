'use client';

/**
 * The Fix it panel, in the inspector column on desktop and tablet and in
 * the phone sheet's Fix it tab, with two modes:
 *
 * - Fix it myself: every fix the diagram knows, with no hints about which
 *   fits, and a live verdict (requirements passing, what it costs). Applying
 *   one takes a reading of p99, error rate, throughput and cost, then shows
 *   it next to the live reading. Every applied fix can be taken back out.
 * - Show me the fixes: the verified plans for the failure in effect
 *   (`FixPlans`), the cheapest applied as soon as the mode opens.
 *
 * The requirement badges sit at the top in both, so recovery (or not) is
 * visible right where the change was made.
 */
import { formatMs, formatPercent, formatRps, formatUsd } from '@/app/(components)/data';
import { Button, CheckIcon, Pill, SegmentedControl } from '@/app/(components)/ui';
import { usePlayerStore } from '../store/PlayerStoreProvider';
import { RequirementBadges } from '../hud/RequirementBadges';
import { useBreakData } from './BreakContext';
import { useBreakUi, useBreakUiApi, type MetricSnapshot } from './breakStore';
import { FixPlans, planCost } from './FixPlans';
import { useBreakCommands } from './useBreakCommands';
import { useGlobalMetricsFeed } from '../metrics/useGlobalMetricsFeed';
import { FixNatureIcon, UndoIcon, WrenchIcon } from './icons';
import { currentCause, deriveFaults, hasActiveFault } from './tools';
import { activeBreaks } from './pack';
import { CacheFailureCard, nodeRowLabel } from './CacheFailures';
import { BrokenNow } from './InEffect';
import { useMetricSeriesFeed } from '../metrics/useMetricSeriesFeed';
import type { RemedyView } from '../types';

const COMPARE_CODES = ['e', 'f', 'q', 'm'] as const;

const COMPARE_ROWS: ReadonlyArray<{ code: (typeof COMPARE_CODES)[number]; label: string; fmt: (v: number | undefined) => string; lowerIsBetter: boolean }> = [
  { code: 'e', label: 'p99 latency', fmt: (v) => (v === undefined ? '—' : `${formatMs(v)} ms`), lowerIsBetter: true },
  { code: 'f', label: 'error rate', fmt: (v) => (v === undefined ? '—' : `${formatPercent(v)}%`), lowerIsBetter: true },
  { code: 'q', label: 'throughput', fmt: (v) => (v === undefined ? '—' : `${formatRps(v)} rps`), lowerIsBetter: false },
  { code: 'm', label: 'cost', fmt: (v) => (v === undefined ? '—' : `${formatUsd(v)}/mo`), lowerIsBetter: true },
];

export function FixItPanel({ headingLevel = 2 }: { headingLevel?: 2 | 3 }) {
  const data = useBreakData();
  const { needs, kit, remedies } = data;
  const commands = useBreakCommands(data);
  const ui = useBreakUiApi();
  const mode = useBreakUi((s) => s.fixMode);
  const plan = useBreakUi((s) => s.plan);
  const actions = usePlayerStore((s) => s.actions);
  const H = headingLevel === 2 ? 'h2' : 'h3';
  const watched = needs.filter((n) => n.alarm);

  const setMode = (next: string) => {
    if (next !== 'myself' && next !== 'plans') return;
    ui.set({ fixMode: next });
    // Show me: the cheapest verified plan goes in straight away, unless one for this failure already did.
    if (next === 'plans') {
      const cause = currentCause(actions);
      const set = cause ? kit?.plans?.find((p) => p.cause === cause) : undefined;
      if (cause && set?.ways.length && !(plan && plan.cause === cause)) commands.applyPlan(cause, 0, set.ways[0].acts);
    }
  };

  return (
    <section className="break-fixit" aria-label="Fix it">
      <div className="break-fixit-h">
        <WrenchIcon className="break-fixit-ic" />
        <H className="break-fixit-title">Fix it</H>
      </div>
      <SegmentedControl
        size="sm"
        aria-label="How to fix it"
        className="break-fixit-mode"
        value={mode}
        onValueChange={setMode}
        options={[
          { value: 'myself', label: 'Fix it myself' },
          { value: 'plans', label: 'Show me the fixes' },
        ]}
      />
      {watched.length > 0 ? (
        <div className="break-fixit-reqs">
          <p className="break-fixit-k">Requirements, live</p>
          <RequirementBadges needs={watched} />
        </div>
      ) : null}
      <BrokenNow />
      <CacheFailureCard />
      {mode === 'plans' ? <FixPlans /> : <FixItMyself remedies={remedies} order={kit?.remedies ?? []} />}
    </section>
  );
}

/** Every fix, in the diagram's own order, with no hint about which fits: the learner decides. */
function FixItMyself({ remedies, order }: { remedies: readonly RemedyView[]; order: readonly string[] }) {
  const { needs, kit } = useBreakData();
  const actions = usePlayerStore((s) => s.actions);
  const watches = usePlayerStore((s) => s.sim.watches);
  const cost = useGlobalMetricsFeed(['m']).metrics.m;
  const faults = deriveFaults(actions);
  const broken = hasActiveFault(faults) || activeBreaks(actions, kit).length > 0;
  const watched = needs.filter((n) => n.alarm);
  const passing = watched.filter((n) => watches[n.alarm!] === true).length;
  const extra = cost?.value !== undefined && cost.baseline !== undefined ? cost.value - cost.baseline : undefined;
  const listed = [...order.map((id) => remedies.find((r) => r.id === id)).filter((r): r is RemedyView => !!r), ...remedies.filter((r) => !order.includes(r.id))];

  return (
    <>
      {watched.length > 0 ? (
        <p className="break-fixit-verdict" data-passing={passing} data-total={watched.length}>
          {passing} of {watched.length} requirements passing{extra !== undefined ? ` · ${planCost(extra)} vs before` : ''}
        </p>
      ) : null}
      <p className="break-fixit-lede">
        {broken
          ? 'Try changes until every requirement passes. Undo any that don’t help. You can also scale any component from its inspector.'
          : 'Break something first, or apply a fix to see what it changes at baseline.'}
      </p>
      {listed.length === 0 ? (
        <p className="break-fixit-lede">This diagram offers no fixes yet.</p>
      ) : (
        <ul className="break-fixit-list">
          {listed.map((f) => (
            <FixCard key={f.id} fix={f} applied={faults.fixes.has(f.id)} />
          ))}
        </ul>
      )}
    </>
  );
}

function FixCard({ fix, applied }: { fix: RemedyView; applied: boolean }) {
  const data = useBreakData();
  const commands = useBreakCommands(data);
  const ready = usePlayerStore((s) => s.sim.status === 'ready');
  const mark = useBreakUi((s) => s.marks[fix.id]);
  const titleId = `fix-${fix.id}-title`;

  return (
    <li className="break-fx" data-applied={applied} data-fix-id={fix.id} aria-labelledby={titleId}>
      <div className="break-fx-top">
        <FixNatureIcon nature={fix.nature} className="break-fx-ic" />
        <div className="break-fx-main">
          <p className="break-fx-t" id={titleId}>
            {fix.text}
          </p>
          <p className="break-fx-why">{plainText(fix.md)}</p>
        </div>
        {fix.price ? <span className="break-fx-cost">{fix.price}</span> : null}
      </div>
      <div className="break-fx-act">
        {applied ? (
          <>
            <Pill variant="ok" icon={<CheckIcon />}>
              applied
            </Pill>
            <Button type="button" variant="ghost" size="sm" disabled={!ready} onClick={() => commands.revertFix(fix.id)} aria-label={`Undo: ${fix.text}`}>
              <UndoIcon />
              Undo
            </Button>
          </>
        ) : (
          <Button type="button" variant="glass" size="sm" disabled={!ready} onClick={() => commands.applyFix(fix.id)} aria-label={`Apply: ${fix.text}`}>
            Apply
          </Button>
        )}
        {fix.nature ? <span className="break-fx-nature">{fix.nature}</span> : null}
      </div>
      {applied && mark ? (
        <div className="break-fx-more">
          <BeforeAfter before={mark.before} />
        </div>
      ) : null}
    </li>
  );
}

function BeforeAfter({ before }: { before: MetricSnapshot }) {
  const feed = useGlobalMetricsFeed(COMPARE_CODES);
  const nodeKeys = Object.keys(before.nodes ?? {});
  const nodeFeed = useMetricSeriesFeed(nodeKeys, 5);
  return (
    <table className="break-cmp">
      <caption className="sr-only">Before the fix and now</caption>
      <thead>
        <tr>
          <th scope="col">
            <span className="sr-only">Metric</span>
          </th>
          <th scope="col">Before</th>
          <th scope="col">Now</th>
        </tr>
      </thead>
      <tbody>
        {COMPARE_ROWS.map((row) => {
          const b = before[row.code];
          const now = feed.metrics[row.code]?.value;
          const better = b !== undefined && now !== undefined && (row.lowerIsBetter ? now < b * 0.95 : now > b * 1.05);
          const worse = b !== undefined && now !== undefined && (row.lowerIsBetter ? now > b * 1.05 : now < b * 0.95);
          return (
            <tr key={row.code} data-trend={better ? 'better' : worse ? 'worse' : 'same'}>
              <th scope="row">{row.label}</th>
              <td>{row.fmt(b)}</td>
              <td>
                {row.fmt(now)}
                {better ? <span className="sr-only"> (better)</span> : worse ? <span className="sr-only"> (worse)</span> : null}
              </td>
            </tr>
          );
        })}
        {nodeKeys.map((key) => {
          const { label, fmt } = nodeRowLabel(key);
          const b = before.nodes?.[key];
          const now = nodeFeed.series[key]?.value;
          return (
            <tr key={key} data-key={key} data-trend="same">
              <th scope="row">{label}</th>
              <td>{fmt(b)}</td>
              <td>{fmt(now)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** Fix explanations are short CommonMark; the panel shows them as plain sentences. */
function plainText(md: string): string {
  return md
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`]+/g, '')
    .trim();
}
