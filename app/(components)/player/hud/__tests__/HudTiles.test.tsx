import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TooltipProvider } from '@/app/(components)/ui';
import { HudTiles } from '../HudTiles';
import { PlayerStoreProvider, usePlayerStoreApi } from '../../store/PlayerStoreProvider';
import type { PlayerBootstrap } from '../../types';
import type { GaugeView } from '../../types';

const boot: PlayerBootstrap = {
  diagramId: 'url-shortener',
  revision: 1,
  hash: 'sha256:abc',
  diagramUrl: '/x/diagram.json',
  hasSimulation: true,
  runtimeUrl: '/x.js',
  simUrl: '/x.bin',
  canvas: { w: 100, h: 100 },
};

const gauges: GaugeView[] = [
  { probe: 'g.e', text: 'p99 latency', suffix: 'ms' },
  { probe: 'g.f', text: 'Error rate', suffix: '%' },
  { probe: 'g.q', text: 'Throughput', suffix: 'rps' },
  { probe: 'g.m', text: 'Cost', suffix: '$/mo' },
];

/** Pushes one frame the way `WorkerBridge`'s `frame` handler does. */
function FramePusher({ metricKeys, values }: { metricKeys: string[]; values: number[] }) {
  const store = usePlayerStoreApi();
  return (
    <button
      type="button"
      onClick={() =>
        store.setState((s) => ({
          sim: {
            ...s.sim,
            status: 'ready',
            metricKeys,
            frame: { t: 1, keysEpoch: 0, metrics: Float64Array.from(values), health: new Uint8Array(0) },
            frameNo: s.sim.frameNo + 1,
          },
        }))
      }
    >
      push frame
    </button>
  );
}

/** `StatTile`'s `Sparkline` throws without an ancestor `TooltipProvider` (mounted once, in `UIProviders`, at the real app root). */
function renderTiles(gaugeList: GaugeView[] = gauges) {
  const metricKeys = ['g.e', 'g.f', 'g.q', 'g.m'];
  return render(
    <TooltipProvider>
      <PlayerStoreProvider bootstrap={boot}>
        <FramePusher metricKeys={metricKeys} values={[12, 0.002, 4000, 2140]} />
        <HudTiles gauges={gaugeList} />
      </PlayerStoreProvider>
    </TooltipProvider>,
  );
}

describe('HudTiles', () => {
  it('renders nothing for an empty gauges list', () => {
    const { container } = renderTiles([]);
    // Only the FramePusher button is left.
    expect(container.querySelectorAll('.hud-tile')).toHaveLength(0);
  });

  it('caps at 4 tiles even with more gauges', () => {
    const five = [...gauges, { probe: 'g.s', text: 'Availability', suffix: '%' }];
    const { container } = renderTiles(five);
    expect(container.querySelectorAll('.hud-tile')).toHaveLength(4);
  });

  it('shows a placeholder value before any frame arrives, then the formatted live value', async () => {
    renderTiles();
    expect(screen.getByText('p99 latency')).toBeTruthy();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByText('push frame'));

    // Each formatted value also appears in its tile's collapsed "view as
    // table" row (`Sparkline`'s own accessibility affordance) — `getAllBy`
    // rather than `getBy` since both are legitimately in the DOM at once.
    expect((await screen.findAllByText('12')).length).toBeGreaterThan(0); // fmtMs(12) — >=10ms rounds to a plain integer
    expect(screen.getAllByText('0.2').length).toBeGreaterThan(0); // formatPercent(0.002) -> "0.2" (one decimal, the kit's default)
    expect(screen.getAllByText('4.0k').length).toBeGreaterThan(0);
    expect(screen.getAllByText('$2,140').length).toBeGreaterThan(0);
  });

  it('marks a tile critical when its value crosses the threshold, with accessible text (not color alone)', async () => {
    render(
      <TooltipProvider>
        <PlayerStoreProvider bootstrap={boot}>
          <FramePusher metricKeys={['g.e']} values={[3000]} />
          <HudTiles gauges={[{ probe: 'g.e', text: 'p99 latency', suffix: 'ms' }]} />
        </PlayerStoreProvider>
      </TooltipProvider>,
    );
    fireEvent.click(screen.getByText('push frame'));
    // `StatTile` never colors severity alone: a `HealthGlyph` with an
    // accessible name accompanies the ring — not just a border/shadow color.
    expect(await screen.findByRole('img', { name: 'critical' })).toBeTruthy();
  });
});
