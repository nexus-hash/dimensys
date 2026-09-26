'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import {
  StatTile,
  Meter,
  Sparkline,
  DumbbellBars,
  HealthBadge,
  RequirementBadge,
  formatMs,
  formatPercent,
  formatRps,
  formatUsd,
  severityOf,
} from '@/app/(components)/data';
import type { HealthState } from '@/app/(components)/canvas';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="mb-4 border-b border-line-hairline pb-2 text-title-2 text-ink-primary">{title}</h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start gap-3">
      <span className="w-32 flex-none pt-1 font-mono text-[12px] text-ink-muted">{label}</span>
      <div className="flex flex-1 flex-wrap items-start gap-3">{children}</div>
    </div>
  );
}

// Deterministic PRNG (mulberry32) so the SSR-rendered initial state and the
// client's first hydration pass match exactly — only later ticks (inside
// `useEffect`, client-only) actually vary.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WINDOW = 60;

function initialHistory(base: number, spread: number, seed: number): number[] {
  const rng = mulberry32(seed);
  const out: number[] = [];
  let v = base;
  for (let i = 0; i < 24; i++) {
    v += (rng() - 0.5) * spread;
    out.push(Math.max(0, v));
  }
  return out;
}

/**
 * A live StatTile: appends one sample roughly every tick, capped at a fixed
 * 60-sample rolling window with no scrubber (§15.4 — free play's HUD).
 */
function StreamingStat() {
  const [history, setHistory] = React.useState(() => initialHistory(420, 60, 7));
  const rngRef = React.useRef(mulberry32(99));

  React.useEffect(() => {
    const id = setInterval(() => {
      setHistory((prev) => {
        const last = prev[prev.length - 1] ?? 420;
        const next = Math.max(0, last + (rngRef.current() - 0.45) * 90);
        const appended = [...prev, next];
        return appended.length > WINDOW ? appended.slice(appended.length - WINDOW) : appended;
      });
    }, 600);
    return () => clearInterval(id);
  }, []);

  const current = history[history.length - 1] ?? 0;
  const sev = severityOf('p99', current);

  return (
    <StatTile
      label="p99 latency (live)"
      value={formatMs(current)}
      unit="ms"
      severity={sev}
      sparkline={{ values: history, window: WINDOW, warnThreshold: 500, unit: 'ms', formatValue: formatMs }}
      tooltip={`p99 latency, rolling ${WINDOW}s window, now ${formatMs(current)} ms`}
    />
  );
}

const HEALTH_STATES: HealthState[] = ['ok', 'warn', 'critical', 'down', 'recovering'];
const HEALTH_DETAIL: Partial<Record<HealthState, string>> = {
  warn: 'p99 900 ms',
  critical: 'err 38%',
  down: 'DOWN',
  recovering: 'warming 42%',
};

export function DataGallery() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const p99History = React.useMemo(() => initialHistory(180, 40, 1), []);
  const p99HistoryWarn = React.useMemo(() => initialHistory(700, 200, 2), []);
  const errHistory = React.useMemo(() => [0.001, 0.002, NaN, 0.001, 0.0015, 0.0009, 0.0012], []);
  const thrHistory = React.useMemo(() => initialHistory(3800, 300, 3), []);
  const costHistory = React.useMemo(() => initialHistory(2100, 20, 4), []);

  return (
    <div className="min-h-screen bg-surface-page px-6 py-8 text-ink-primary">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-line-hairline pb-4">
        <div>
          <h1 className="text-title-1">DS4 — Data-display kit gallery</h1>
          <p className="mt-1 text-body text-ink-secondary">
            Development only (404s in production). StatTile, Meter, Sparkline, DumbbellBars, HealthBadge and
            RequirementBadge, every state, both themes.
          </p>
        </div>
        {mounted && (
          <button
            type="button"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="rounded-control border border-line-hairline px-3 py-1.5 text-body text-ink-secondary hover:text-ink-primary"
          >
            Toggle theme ({resolvedTheme})
          </button>
        )}
      </header>

      <Section title="StatTile — value + delta + sparkline (§8)">
        <Row label="ok">
          <StatTile
            label="p99 latency"
            value="180"
            unit="ms"
            delta={{ direction: 0, text: '≈ baseline' }}
            sparkline={{ values: p99History, window: 24, warnThreshold: 500, unit: 'ms', formatValue: formatMs }}
            tooltip="p99 latency, last 24 samples, now 180 ms"
          />
          <StatTile
            label="Throughput"
            value={formatRps(thrHistory[thrHistory.length - 1])}
            unit="rps"
            delta={{ direction: 0, text: '+4% vs baseline' }}
            sparkline={{ values: thrHistory, window: 24, unit: 'rps', formatValue: formatRps }}
          />
          <StatTile
            label="Cost"
            value={formatUsd(costHistory[costHistory.length - 1])}
            unit="/mo"
            delta={{ direction: 0, text: 'baseline' }}
            sparkline={{ values: costHistory, window: 24, unit: '$', formatValue: formatUsd }}
          />
        </Row>
        <Row label="warn">
          <StatTile
            label="p99 latency"
            value={formatMs(p99HistoryWarn[p99HistoryWarn.length - 1])}
            unit="ms"
            severity={1}
            delta={{ direction: 1, text: '1.8× baseline', bad: 'warn' }}
            sparkline={{ values: p99HistoryWarn, window: 24, warnThreshold: 500, unit: 'ms', formatValue: formatMs }}
          />
        </Row>
        <Row label="critical">
          <StatTile
            label="Error rate"
            value={formatPercent(0.38)}
            unit="%"
            severity={2}
            delta={{ direction: 1, text: '38 pts', bad: 'critical' }}
            sparkline={{ values: [0.001, 0.004, 0.02, 0.09, 0.24, 0.38], window: 6, warnThreshold: 0.01, unit: '%', formatValue: formatPercent }}
          />
        </Row>
        <Row label="streaming">
          <StreamingStat />
        </Row>
      </Section>

      <Section title="Meter — utilization with warn/critical thresholds (§8)">
        <Row label="ok">
          <Meter label="core-db util" value={0.42} valueLabel="42%" warnAt={0.7} criticalAt={0.9} className="w-64" />
        </Row>
        <Row label="warn">
          <Meter
            label="core-db util"
            value={0.78}
            valueLabel="78%"
            warnAt={0.7}
            criticalAt={0.9}
            className="w-64"
            tooltip="core-db utilization, now 78%"
          />
        </Row>
        <Row label="critical">
          <Meter label="core-db util" value={0.96} valueLabel="96%" warnAt={0.7} criticalAt={0.9} className="w-64" />
        </Row>
        <Row label="budget">
          <Meter
            label="Budget"
            value={2161 / 3000}
            valueLabel="$2,161 / $3,000"
            warnAt={0.85}
            criticalAt={1}
            className="w-64"
            tableRows={[
              ['00:00', '$1,800'],
              ['00:20', '$2,050'],
              ['00:40', '$2,161'],
            ]}
            tableColumns={['t', 'spend']}
          />
        </Row>
      </Section>

      <Section title="Sparkline — fixed window, gaps, threshold (§8)">
        <Row label="normal">
          <div className="w-48">
            <Sparkline values={[10, 12, 11, 14, 18, 22, 20, 24]} title="requests/sec, last 8 samples" />
          </div>
        </Row>
        <Row label="gaps / NaN">
          <div className="w-48">
            <Sparkline
              values={errHistory}
              title="error rate, last 7 samples (one dropped sample)"
              warnThreshold={0.01}
              unit="%"
              formatValue={(v) => formatPercent(v, 2)}
            />
          </div>
        </Row>
        <Row label="with mark">
          <div className="w-48">
            <Sparkline
              values={[0.09, 0.08, 0.09, 0.01, 0.008, 0.009]}
              markIndex={3}
              title="error rate before/after the fix was applied"
              warnThreshold={0.01}
              severity={0}
            />
          </div>
        </Row>
        <Row label="empty window">
          <div className="w-48">
            <Sparkline values={[]} window={24} title="no samples yet" />
          </div>
        </Row>
      </Section>

      <Section title="DumbbellBars — before/after comparisons (§8)">
        <Row label="fix impact">
          <div className="w-96">
            <DumbbellBars
              rows={[
                { label: 'Availability', before: 6, after: 9 },
                { label: 'p99 latency', before: 3, after: 8 },
                { label: 'Cost', before: 7, after: 6 },
              ]}
              beforeLabel="Without fix"
              afterLabel="With fix"
              caption="0–10 · higher is better"
            />
          </div>
        </Row>
      </Section>

      <Section title="HealthBadge — shared with the canvas kit (§5.3/§8)">
        <Row label="all states">
          {HEALTH_STATES.map((state) => (
            <HealthBadge key={state} state={state} label={state} detail={HEALTH_DETAIL[state]} />
          ))}
        </Row>
      </Section>

      <Section title="RequirementBadge — pass/fail with observed value (§8)">
        <Row label="pass">
          <RequirementBadge text="p99 < 50 ms" status="pass" observed="p99 42 ms" />
        </Row>
        <Row label="fail">
          <RequirementBadge text="Error rate < 1%" status="fail" observed="err 38%" />
        </Row>
        <Row label="pending">
          <RequirementBadge text="p99 < 50 ms" status="pending" observed="p99 55 ms" />
        </Row>
        <Row label="not simulated">
          <RequirementBadge text="Redirects resolve to the original URL" status="not-simulated" />
        </Row>
      </Section>
    </div>
  );
}
