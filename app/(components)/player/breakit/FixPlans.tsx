'use client';

/**
 * "Show me the fixes": for the failure in effect, every combination of
 * changes the build's simulator verified brings all requirements back,
 * cheapest first, each with what it costs, how fast it recovers and what it
 * gives up. Applying one rebuilds the run with that plan in place of any
 * plan applied before, so plans can be compared one after another.
 */
import { formatUsd } from '@/app/(components)/data';
import { Button, CheckIcon, Pill } from '@/app/(components)/ui';
import { usePlayerStore } from '../store/PlayerStoreProvider';
import { useBreakData } from './BreakContext';
import { useBreakUi } from './breakStore';
import { useBreakCommands } from './useBreakCommands';
import { currentCause, deriveFaults, targetName, type TargetCatalog } from './tools';
import type { KnobView, RemedyView } from '../types';

type Act = readonly [string, string, number | null];

export function planCost(cost: number): string {
  if (Math.abs(cost) < 1) return 'no extra cost';
  return `${cost > 0 ? '+' : '−'}${formatUsd(Math.abs(cost))}/mo`;
}

export function stepLabel(act: Act, remedies: readonly RemedyView[], catalog: TargetCatalog, knobs: readonly KnobView[] = []): string {
  const [tool, target, value] = act;
  if (tool === 'intervention') return remedies.find((r) => r.id === target)?.text ?? target;
  if (tool === 'resize') {
    const noun = knobs.find((k) => k.el === target)?.noun ?? 'replicas';
    return `Scale ${targetName({ id: target }, catalog)} to ×${value} ${noun}`;
  }
  return `${tool} ${target}`;
}

function tradeOffs(acts: readonly Act[], remedies: readonly RemedyView[], knobs: readonly KnobView[]): string[] {
  const out: string[] = [];
  for (const [tool, target] of acts) {
    const t =
      tool === 'intervention'
        ? remedies.find((r) => r.id === target)?.trade
        : tool === 'resize'
          ? `More ${knobs.find((k) => k.el === target)?.noun ?? 'replicas'} cost more every month, even when the load drops again.`
          : undefined;
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}

export function FixPlans() {
  const { kit, remedies, catalog, knobs, needs } = useBreakData();
  const actions = usePlayerStore((s) => s.actions);
  const watches = usePlayerStore((s) => s.sim.watches);
  const plan = useBreakUi((s) => s.plan);
  const cause = currentCause(actions);
  const set = cause ? kit?.plans?.find((p) => p.cause === cause) : undefined;

  if (!cause) {
    return (
      <p className="break-fixit-lede" data-plans-state="none">
        {deriveFaults(actions).fixes.size > 0
          ? 'Nothing is broken right now.'
          : 'Break something first: pick a “Try this” idea or a cache failure. The ways to fix each one are worked out ahead of time in the simulator.'}
      </p>
    );
  }
  if (!set) {
    const flush = cause.startsWith('flush:');
    const known = kit?.chips.some((c) => cause === `${c.verb}:${c.el ?? c.amt}`) || cause.startsWith('fault:');
    return (
      <p className="break-fixit-lede" data-plans-state={flush ? 'heals' : known ? 'unfixable' : 'unknown'}>
        {flush
          ? 'A flushed cache refills on its own: watch the requirements come back as it warms up. Fix it myself shows what makes that faster.'
          : known
            ? 'No combination of up to three changes brings this back while it lasts. Undo the failure, or try your own changes in Fix it myself.'
            : 'Plans are worked out for one failure at a time: the “Try this” ideas and the cache failures. For this mix, use Fix it myself.'}
      </p>
    );
  }

  const watched = needs.filter((n) => n.alarm);
  const allPass = watched.length > 0 && watched.every((n) => watches[n.alarm!] === true);
  const ownFixes = actions.some((a) => (a[1] === 'intervention' || a[1] === 'resize') && !(plan && Math.abs(a[0] - plan.t) < 1e-6));
  return (
    <div className="break-plans" data-plans-state="plans" data-cause={cause}>
      <p className="break-fixit-lede">
        {set.ways.length === 1 ? 'One verified way to fix this.' : `${set.ways.length} verified ways to fix this, cheapest first.`} Each was run in the simulator until every requirement held.
      </p>
      {ownFixes && allPass && !plan ? <p className="break-plans-yours">Your own changes fixed it too. Compare what they cost with the plans below.</p> : null}
      <ol className="break-plans-list">
        {set.ways.map((way, i) => (
          <PlanCard key={i} index={i} cause={cause} way={way} applied={!!plan && plan.cause === cause && plan.index === i} remedies={remedies} catalog={catalog} knobs={knobs ?? []} />
        ))}
      </ol>
    </div>
  );
}

function PlanCard({
  index,
  cause,
  way,
  applied,
  remedies,
  catalog,
  knobs,
}: {
  index: number;
  cause: string;
  way: { acts: Act[]; cost: number; back: number };
  applied: boolean;
  remedies: readonly RemedyView[];
  catalog: TargetCatalog;
  knobs: readonly KnobView[];
}) {
  const data = useBreakData();
  const commands = useBreakCommands(data);
  const ready = usePlayerStore((s) => s.sim.status === 'ready');
  const trades = tradeOffs(way.acts, remedies, knobs);
  const titleId = `plan-${index}-title`;
  return (
    <li className="break-plan" data-applied={applied} data-plan={index} aria-labelledby={titleId}>
      <div className="break-plan-top">
        <p className="break-plan-t" id={titleId}>
          Plan {index + 1}
        </p>
        <span className="break-plan-cost">{planCost(way.cost)}</span>
        <span className="break-plan-back">back in {way.back} s</span>
      </div>
      <ul className="break-plan-steps">
        {way.acts.map((a, i) => (
          <li key={i}>{stepLabel(a, remedies, catalog, knobs)}</li>
        ))}
      </ul>
      {trades.length ? (
        <div className="break-plan-trades">
          <p className="break-fixit-k">Trade-offs</p>
          <ul>
            {trades.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="break-fx-act">
        {applied ? (
          <Pill variant="ok" icon={<CheckIcon />}>
            applied
          </Pill>
        ) : (
          <Button type="button" variant="glass" size="sm" disabled={!ready} onClick={() => commands.applyPlan(cause, index, way.acts)} aria-label={`Apply plan ${index + 1}`}>
            Apply this plan
          </Button>
        )}
      </div>
    </li>
  );
}
