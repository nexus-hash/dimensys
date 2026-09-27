/**
 * Frame → health mapping (T3.3): turns one worker frame's per-id health byte
 * (`SimHealthToken`, decoded from `FrameMsg.health` via `HEALTH_CODES`) plus
 * that node's own "up" metric (code `h`, see `metricKeys.ts`) into the
 * canvas kit's health state machine (`HealthState`: `ok | warn | critical |
 * down | recovering`).
 *
 * These are two different vocabularies on purpose: the worker publishes a
 * small, generic decoration token per id (shared with links/flows, which
 * have no "up" concept), while the canvas rings draw a richer node lifecycle
 * that also needs a transient "recovering" state the token alone can't
 * express. This module is the one seam that reconciles them; nothing else
 * in the app should read `SimHealthToken` values directly to decide a ring
 * color.
 *
 * `classifyHealth` is a tiny state machine so it can report `recovering`
 * (worse before, better now, not fully clean yet) without the caller having
 * to track trend itself — callers just keep passing back the previous
 * result per id.
 */
import type { HealthState } from '@/app/(components)/canvas';
import type { SimHealthToken } from '../types';
import { criticalThresholdOf, formatMetricValue, severityOf, type ThresholdMetricKind } from '@/app/(components)/data';

/** Severity ordering used to detect "was worse, now better". */
const SEVERITY: Readonly<Record<HealthState, number>> = {
  ok: 0,
  recovering: 1,
  warn: 2,
  critical: 3,
  down: 4,
};

/**
 * `up === 0` (or explicitly `false`-ish) always wins: a node with no
 * replicas answering is `down` regardless of what the decoration token says.
 * Otherwise the token drives the state, `info`/`accent`/`muted` reading as
 * healthy (they're generic decoration, not distress). A transition from
 * `critical`/`down` straight to `ok`/`warn` reports `recovering` for one
 * step instead of snapping straight back to clean, so the ring's dashed
 * "still settling" look has something to attach to.
 */
export function classifyHealth(prev: HealthState | undefined, token: SimHealthToken, up: number | undefined): HealthState {
  if (up === 0) return 'down';

  const raw: HealthState = token === 'warn' || token === 'critical' ? token : 'ok';

  if (prev && SEVERITY[prev] >= SEVERITY.critical && SEVERITY[raw] <= SEVERITY.warn) {
    return raw === 'ok' ? 'recovering' : 'warn';
  }
  if (prev === 'recovering' && raw === 'ok') return 'ok';
  if (prev === 'recovering' && raw !== 'ok') return raw;

  return raw;
}

/** Meter fill severity from a 0..1 utilization-like ratio (matches the canvas kit's `cv-meter-*` thresholds). */
export function meterSeverity(value: number): 'ok' | 'warn' | 'critical' {
  if (value >= 0.9) return 'critical';
  if (value >= 0.7) return 'warn';
  return 'ok';
}

/** Inner SVG markup for the health glyph, mirroring the canvas kit's `HealthGlyph` (kept here so DOM patches don't need React to render it). */
export function healthGlyphMarkup(state: HealthState): string {
  switch (state) {
    case 'warn':
      return (
        '<path d="M8 1.5l7 12.5H1z" style="fill:var(--color-signal-warn)"></path>' +
        '<path d="M8 6v3.6M8 11.6v.1" style="stroke:var(--color-warn-ink)" stroke-width="1.6" stroke-linecap="round"></path>'
      );
    case 'critical':
      return (
        '<path d="M5.1 1h5.8L15 5.1v5.8L10.9 15H5.1L1 10.9V5.1z" style="fill:var(--color-signal-critical)"></path>' +
        '<path d="M5.6 5.6l4.8 4.8M10.4 5.6l-4.8 4.8" style="stroke:var(--color-ink-inverse)" stroke-width="1.6" stroke-linecap="round"></path>'
      );
    case 'down':
      return (
        '<path d="M8 2v6" fill="none" style="stroke:var(--color-ink-secondary)" stroke-width="1.5" stroke-linecap="round"></path>' +
        '<path d="M4.4 4.6a5 5 0 1 0 7.2 0" fill="none" style="stroke:var(--color-ink-secondary)" stroke-width="1.5" stroke-linecap="round"></path>'
      );
    case 'recovering':
      return (
        '<path d="M13.5 8A5.5 5.5 0 1 1 11.8 4" fill="none" style="stroke:var(--color-signal-warn)" stroke-width="1.6" stroke-linecap="round"></path>' +
        '<path d="M12.5 1.5v3h-3" fill="none" style="stroke:var(--color-signal-warn)" stroke-width="1.6" stroke-linecap="round"></path>'
      );
    default:
      return '<circle cx="8" cy="8" r="7" style="fill:var(--color-signal-ok)"></circle>';
  }
}

/** A node's live readings the health chip can explain a state with; any may be missing (not every node publishes every metric). */
export interface NodeHealthReadings {
  /** Utilization, 0..1+. */
  util?: number;
  /** Error ratio, 0..1. */
  err?: number;
  /** p99 latency, ms. */
  p99?: number;
}

const CHIP_KINDS = ['err', 'util', 'p99'] as const satisfies readonly ThresholdMetricKind[];

function chipLabel(kind: (typeof CHIP_KINDS)[number], v: number): string {
  if (kind === 'util') return `util ${formatMetricValue(v, '%', 0)}%`;
  if (kind === 'err') return `err ${formatMetricValue(v, '%', v < 0.1 ? 1 : 0)}%`;
  return `p99 ${formatMetricValue(v, 'ms')} ms`;
}

/**
 * The mono chip under a node that isn't healthy, e.g. "p99 640 ms". It names
 * the metric that actually crossed the display thresholds (the same
 * warn/critical table the HUD tiles use) — the worst severity first, and
 * among equals the one closest to its critical limit — rather than
 * whichever metric the node happens to publish first. A node reported
 * warn/critical with no reading over a threshold gets no chip (the ring and
 * glyph still show); a down node reads "DOWN".
 */
export function healthChipText(state: HealthState, readings: NodeHealthReadings): string | undefined {
  if (state === 'ok') return undefined;
  if (state === 'down') return 'DOWN';
  let best: { kind: (typeof CHIP_KINDS)[number]; v: number; sev: number; ratio: number } | undefined;
  for (const kind of CHIP_KINDS) {
    const v = readings[kind];
    if (v === undefined || !Number.isFinite(v)) continue;
    const sev = severityOf(kind, v);
    if (!sev) continue;
    const ratio = v / criticalThresholdOf(kind);
    if (!best || sev > best.sev || (sev === best.sev && ratio > best.ratio)) best = { kind, v, sev, ratio };
  }
  return best ? chipLabel(best.kind, best.v) : undefined;
}
