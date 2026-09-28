'use client';

/**
 * The Fix it panel: the diagram's fixes (parameter changes the simulation
 * applies live), in the inspector column on desktop and tablet, and in the
 * phone sheet's Fix it tab.
 *
 * Each fix shows its category, a one-line why and its cost note; fixes that
 * fit what's broken right now are marked. Applying one takes a reading of
 * p99, error rate, throughput and cost at that moment, then shows it next
 * to the live reading ("before → now"), with the explanation. The
 * requirement badges sit at the top of the panel, so recovery (or not) is
 * visible right where the fix was applied. Every applied fix can be taken
 * back out.
 */
import { formatMs, formatPercent, formatRps, formatUsd } from '@/app/(components)/data';
import { Button, CheckIcon, Pill } from '@/app/(components)/ui';
import { usePlayerStore } from '../store/PlayerStoreProvider';
import { RequirementBadges } from '../hud/RequirementBadges';
import { useBreakData, useOfferedFixes } from './BreakContext';
import { useBreakUi, type MetricSnapshot } from './breakStore';
import { useBreakCommands } from './useBreakCommands';
import { useGlobalMetricsFeed } from '../metrics/useGlobalMetricsFeed';
import { FixNatureIcon, UndoIcon, WrenchIcon } from './icons';
import { deriveFaults, fittingNatures, hasActiveFault } from './tools';
import type { RemedyView } from '../types';

const COMPARE_CODES = ['e', 'f', 'q', 'm'] as const;

const COMPARE_ROWS: ReadonlyArray<{ code: (typeof COMPARE_CODES)[number]; label: string; fmt: (v: number | undefined) => string; lowerIsBetter: boolean }> = [
  { code: 'e', label: 'p99 latency', fmt: (v) => (v === undefined ? '—' : `${formatMs(v)} ms`), lowerIsBetter: true },
  { code: 'f', label: 'error rate', fmt: (v) => (v === undefined ? '—' : `${formatPercent(v)}%`), lowerIsBetter: true },
  { code: 'q', label: 'throughput', fmt: (v) => (v === undefined ? '—' : `${formatRps(v)} rps`), lowerIsBetter: false },
  { code: 'm', label: 'cost', fmt: (v) => (v === undefined ? '—' : `${formatUsd(v)}/mo`), lowerIsBetter: true },
];

export function FixItPanel({ headingLevel = 2 }: { headingLevel?: 2 | 3 }) {
  const fixes = useOfferedFixes();
  const { needs, catalog } = useBreakData();
  const actions = usePlayerStore((s) => s.actions);
  const faults = deriveFaults(actions);
  const natures = fittingNatures(faults, catalog);
  const broken = hasActiveFault(faults);
  const H = headingLevel === 2 ? 'h2' : 'h3';
  const watched = needs.filter((n) => n.alarm);

  return (
    <section className="break-fixit" aria-label="Fix it">
      <div className="break-fixit-h">
        <WrenchIcon className="break-fixit-ic" />
        <H className="break-fixit-title">Fix it</H>
        <Pill>{fixes.length === 1 ? '1 fix' : `${fixes.length} fixes`}</Pill>
      </div>
      {watched.length > 0 ? (
        <div className="break-fixit-reqs">
          <p className="break-fixit-k">Requirements, live</p>
          <RequirementBadges needs={watched} />
        </div>
      ) : null}
      <p className="break-fixit-lede">
        {broken ? 'Pick a change that addresses what you broke. Marked fixes fit the current failure.' : 'Break something first, or apply a fix to see what it changes at baseline.'}
      </p>
      {fixes.length === 0 ? (
        <p className="break-fixit-lede">This diagram offers no fixes yet.</p>
      ) : (
        <ul className="break-fixit-list">
          {fixes.map((f) => (
            <FixCard key={f.id} fix={f} applied={faults.fixes.has(f.id)} fits={broken && !!f.nature && natures.has(f.nature)} />
          ))}
        </ul>
      )}
    </section>
  );
}

function FixCard({ fix, applied, fits }: { fix: RemedyView; applied: boolean; fits: boolean }) {
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
        {fits && !applied ? <Pill variant="brand">fits this failure</Pill> : null}
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
