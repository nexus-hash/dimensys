import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/react';
import { SparkPanel, bucketSamples } from '../SparkPanel';
import type { SparkPart } from '../../types';
import { pushFrame, renderLive } from './liveHarness';

const PART: SparkPart = { shape: 'spark', pane: 'operations', title: 'Live load', series: ['c', 'e'], span: 60 };

/** Points drawn by a sparkline's line path: one `M` plus one `L` per further point. */
function pointsIn(svg: Element): number {
  const d = svg.querySelector('path[fill="none"]')?.getAttribute('d') ?? '';
  return (d.match(/[ML]/g) ?? []).length;
}

describe('bucketSamples', () => {
  it('keeps the last sample of each bucket', () => {
    const h = [0, 0.2, 0.4, 0.6, 1.1].map((t, i) => ({ t, v: i }));
    expect(bucketSamples(h, 2)).toEqual([
      { t: 0.4, v: 2 },
      { t: 0.6, v: 3 },
      { t: 1.1, v: 4 },
    ]);
  });
});

describe('SparkPanel', () => {
  it("plots the node's own metric columns as compact stat tiles with sparklines", () => {
    const { store } = renderLive(<SparkPanel part={PART} elementId="api" />, { status: 'ready' });
    for (let i = 0; i <= 30; i++) {
      pushFrame(store, i / 10, { 'n:api.c': 0.3 + i / 100, 'n:api.e': 40 + i, 'n:db.c': 0.99 });
    }
    const tiles = document.querySelectorAll('[data-variant="compact"]');
    expect(tiles).toHaveLength(2);
    expect(within(tiles[0] as HTMLElement).getByText('utilization')).toBeTruthy();
    expect(within(tiles[0] as HTMLElement).getByText('60.0')).toBeTruthy();
    expect(within(tiles[1] as HTMLElement).getByText('p99 latency')).toBeTruthy();
    expect(within(tiles[1] as HTMLElement).getByText('70')).toBeTruthy();
    // 3 s of frames → one point per half second.
    const svgs = document.querySelectorAll('[data-inspector-spark] svg[role="img"]');
    expect(svgs).toHaveLength(2);
    expect(pointsIn(svgs[0])).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('last 60 s')).toBeTruthy();
  });

  it('offers one table for all the series: a row per second, newest first', () => {
    const { store } = renderLive(<SparkPanel part={PART} elementId="api" />, { status: 'ready' });
    for (let i = 0; i <= 25; i++) pushFrame(store, i / 10, { 'n:api.c': 0.5, 'n:api.e': 12 });
    const table = document.querySelector('[data-inspector-spark] table')!;
    const heads = [...table.querySelectorAll('th')].map((th) => th.textContent);
    expect(heads).toEqual(['t', 'utilization (%)', 'p99 latency (ms)']);
    const rows = table.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(3); // seconds 2, 1, 0
    expect(rows[0].querySelectorAll('td')[1].textContent).toBe('50.0');
    expect(rows[0].querySelectorAll('td')[2].textContent).toBe('12');
  });

  it('flags a metric past its threshold with a glyph, not color alone', () => {
    const { store } = renderLive(<SparkPanel part={{ ...PART, series: ['c'] }} elementId="api" />, { status: 'ready' });
    pushFrame(store, 1, { 'n:api.c': 0.95 });
    expect(screen.getByLabelText('critical')).toBeTruthy();
  });

  it('a restart starts the history over', () => {
    const { store } = renderLive(<SparkPanel part={{ ...PART, series: ['c'] }} elementId="api" />, { status: 'ready' });
    for (let i = 0; i <= 20; i++) pushFrame(store, i / 2, { 'n:api.c': 0.4 });
    pushFrame(store, 0, { 'n:api.c': 0.4 });
    expect(document.querySelectorAll('[data-inspector-spark] tbody tr')).toHaveLength(1);
  });

  it('before the simulation runs the tiles read as dashes, with a note', () => {
    renderLive(<SparkPanel part={PART} elementId="api" />, { status: 'loading' });
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Waiting for the simulation…')).toBeTruthy();
  });
});
