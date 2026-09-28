import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useGlobalMetricsFeed } from '../useGlobalMetricsFeed';
import { PlayerStoreProvider, usePlayerStoreApi } from '../../store/PlayerStoreProvider';
import type { PlayerBootstrap } from '../../types';
import { setLeadUp } from '../leadUp';

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

function FeedProbe({ codes }: { codes: string[] }) {
  const feed = useGlobalMetricsFeed(codes);
  return <pre data-testid="feed">{JSON.stringify(feed)}</pre>;
}

/** A button that pushes one frame, the way `WorkerBridge`'s `frame` handler does. */
function PushButton({ t, value, code = 'e', label }: { t: number; value: number; code?: string; label: string }) {
  const store = usePlayerStoreApi();
  return (
    <button
      type="button"
      onClick={() =>
        store.setState((s) => ({
          sim: {
            ...s.sim,
            status: 'ready',
            metricKeys: [`g.${code}`],
            frame: { t, keysEpoch: 0, metrics: Float64Array.from([value]), health: new Uint8Array(0) },
            frameNo: s.sim.frameNo + 1,
          },
        }))
      }
    >
      {label}
    </button>
  );
}

function SetWatchButton({ id, pass }: { id: string; pass: boolean }) {
  const store = usePlayerStoreApi();
  return (
    <button type="button" onClick={() => store.setState((s) => ({ sim: { ...s.sim, watches: { ...s.sim.watches, [id]: pass } } }))}>
      set {id}
    </button>
  );
}

function readFeed() {
  return JSON.parse(screen.getByTestId('feed').textContent!);
}

describe('useGlobalMetricsFeed', () => {
  it('starts with undefined values and empty history', () => {
    render(
      <PlayerStoreProvider bootstrap={boot}>
        <FeedProbe codes={['e']} />
      </PlayerStoreProvider>,
    );
    const feed = readFeed();
    expect(feed.metrics.e.value).toBeUndefined();
    expect(feed.metrics.e.history).toEqual([]);
  });

  it('captures the first reading as the baseline and updates value/history on each frame', () => {
    render(
      <PlayerStoreProvider bootstrap={boot}>
        <PushButton t={0} value={40} label="frame 1" />
        <PushButton t={1} value={1000} label="frame 2" />
        <FeedProbe codes={['e']} />
      </PlayerStoreProvider>,
    );

    fireEvent.click(screen.getByText('frame 1'));
    let feed = readFeed();
    expect(feed.metrics.e.value).toBe(40);
    expect(feed.metrics.e.baseline).toBe(40);
    expect(feed.metrics.e.history).toHaveLength(1);

    fireEvent.click(screen.getByText('frame 2'));
    feed = readFeed();
    expect(feed.metrics.e.value).toBe(1000);
    expect(feed.metrics.e.baseline).toBe(40); // unchanged
    expect(feed.metrics.e.history).toHaveLength(2);
  });

  it('a run rebuilt from a share link takes its start reading and last 60 s from the lead-up', () => {
    function SeedButton() {
      const store = usePlayerStoreApi();
      return (
        <button type="button" onClick={() => setLeadUp(store, { keys: ['g.e', 'g.f'], first: [40, 0], t: [30, 60, 99.9], series: [[50, 300, 900], [0, 0.1, 0.2]] })}>
          seed
        </button>
      );
    }
    render(
      <PlayerStoreProvider bootstrap={boot}>
        <SeedButton />
        <PushButton t={100} value={1000} label="restored frame" />
        <PushButton t={100.1} value={1001} label="next frame" />
        <FeedProbe codes={['e']} />
      </PlayerStoreProvider>,
    );
    fireEvent.click(screen.getByText('seed'));
    fireEvent.click(screen.getByText('restored frame'));
    let feed = readFeed();
    expect(feed.metrics.e.baseline).toBe(40);
    expect(feed.metrics.e.history.map((s: { t: number }) => s.t)).toEqual([60, 99.9, 100]);
    fireEvent.click(screen.getByText('next frame'));
    feed = readFeed();
    // Handed over once: later frames just extend it.
    expect(feed.metrics.e.baseline).toBe(40);
    expect(feed.metrics.e.history).toHaveLength(4);
  });

  it('trims history older than the 60s window', () => {
    render(
      <PlayerStoreProvider bootstrap={boot}>
        <PushButton t={0} value={1} label="frame at t=0" />
        <PushButton t={70} value={2} label="frame at t=70" />
        <FeedProbe codes={['e']} />
      </PlayerStoreProvider>,
    );

    fireEvent.click(screen.getByText('frame at t=0'));
    fireEvent.click(screen.getByText('frame at t=70'));

    const feed = readFeed();
    // The t=0 sample is more than 60s behind the latest (t=70) — trimmed.
    expect(feed.metrics.e.history.every((s: { t: number }) => s.t >= 10)).toBe(true);
    expect(feed.metrics.e.history[feed.metrics.e.history.length - 1].t).toBe(70);
  });

  it('recaptures the baseline and clears history on a restart (t drops back to ~0)', () => {
    render(
      <PlayerStoreProvider bootstrap={boot}>
        <PushButton t={10} value={500} label="frame at t=10" />
        <PushButton t={0} value={12} label="reset to t=0" />
        <FeedProbe codes={['e']} />
      </PlayerStoreProvider>,
    );

    fireEvent.click(screen.getByText('frame at t=10'));
    expect(readFeed().metrics.e.baseline).toBe(500);

    fireEvent.click(screen.getByText('reset to t=0'));
    const feed = readFeed();
    expect(feed.metrics.e.baseline).toBe(12);
    expect(feed.metrics.e.history).toHaveLength(1);
  });

  it('mirrors sim.watches', () => {
    render(
      <PlayerStoreProvider bootstrap={boot}>
        <SetWatchButton id="w0" pass={true} />
        <PushButton t={0} value={1} label="frame" />
        <FeedProbe codes={[]} />
      </PlayerStoreProvider>,
    );
    fireEvent.click(screen.getByText('set w0'));
    fireEvent.click(screen.getByText('frame'));
    expect(readFeed().watches).toEqual({ w0: true });
  });
});
