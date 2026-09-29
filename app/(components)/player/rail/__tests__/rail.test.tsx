import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PlayerStoreProvider, usePlayerStore, usePlayerStoreApi } from '../../store/PlayerStoreProvider';
import { WalkthroughProvider } from '../../walkthrough/WalkthroughContext';
import type { WalkthroughView } from '../../walkthrough/model';
import type { PlayerBootstrap, ViewData } from '../../types';
import { buildRailData, designEstimate, gradeDots, shortLabel } from '../data';
import { traceOnBoard } from '../trace';
import { HOW_SEEN_KEY, HowItWorks, resetHowItWorksSeen } from '../HowItWorks';
import { RequestPaths, laneStat } from '../RequestPaths';
import { ProblemHeader } from '../ProblemHeader';

const boot: PlayerBootstrap = {
  diagramId: 'url-shortener',
  revision: 1,
  hash: 'sha256:abc',
  diagramUrl: '/x.json',
  hasSimulation: false,
  runtimeUrl: null,
  simUrl: null,
  canvas: { w: 800, h: 400 },
};

function view(): ViewData {
  return {
    fmt: 3,
    build: 'sha256:abc',
    id: 'url-shortener',
    rev: 1,
    family: 'hld',
    head: { title: 'URL Shortener', blurb: '', grade: 'medium', labels: [], minutes: 25 },
    needs: [],
    premises: [],
    refs: [],
    board: {
      size: [800, 400],
      blocks: [
        { id: 'web', form: 'client', text: 'Web Browser' },
        { id: 'mob', form: 'client', text: 'Mobile App' },
        { id: 'lb', form: 'lb', text: 'Load Balancer' },
        { id: 'api', form: 'server', text: 'API Service', sheet: { parts: [{ shape: 'calc', calc: 'c1', title: 'Pods', pane: 'operations' }] } },
        { id: 'cache', form: 'cache', text: 'Redis Cache' },
        { id: 'db', form: 'db', text: 'URL Storage (Cassandra)' },
        { id: 'bus', form: 'messageBus', text: 'Analytics Stream (Kafka)' },
        { id: 'kgs', form: 'worker', text: 'KGS Worker' },
      ],
      wires: [],
      frames: [{ id: 'kgs-frame', text: 'Keys', look: 'group', box: [0, 0, 10, 10], holds: ['kgs'] }],
    },
    spares: { blocks: [], wires: [] },
    pins: [],
    stories: [],
    plays: [],
    remedies: [],
    switches: [],
    gauges: [],
    calcs: [
      { id: 'c0', sliders: [], results: [] },
      { id: 'c1', sliders: [], results: [] },
    ],
    lanes: [
      {
        id: 'redirect',
        text: 'Open a short link',
        senders: ['web', 'mob'],
        hops: [['lb'], ['api'], ['cache'], ['db', 'miss'], ['bus', 'async']],
        wires: ['l1', 'l2'],
        probes: ['f:redirect.n', 'f:redirect.e'],
      },
      { id: 'create', text: 'Create a short link', senders: ['web'], hops: [['lb'], ['api'], ['kgs'], ['db']], wires: ['l1', 'l3'] },
    ],
    drills: [],
    motifs: [],
    live: true,
  };
}

describe('rail data', () => {
  it('builds the problem header from the view', () => {
    expect(buildRailData(view()).problem).toEqual({ title: 'URL Shortener', level: 'hld', grade: 'medium', minutes: 25 });
    expect(gradeDots('medium')).toBe(2);
    expect(gradeDots('Hard')).toBe(3);
    expect(gradeDots('expert')).toBeNull();
  });

  it('writes hop chains with short labels, the miss and the async branch', () => {
    const [redirect, create] = buildRailData(view()).lanes;
    expect(redirect.chain).toBe('client → LB → API → Redis → (miss) Cassandra · async Kafka');
    expect(create.chain).toBe('client → LB → API → KGS → Cassandra');
    expect(redirect.nodes).toEqual(['web', 'mob', 'lb', 'api', 'cache', 'db', 'bus']);
    expect(redirect.frames).toEqual([]);
    expect(create.frames).toEqual(['kgs-frame']);
    expect(create.probes).toBeUndefined();
  });

  it('shortens labels without losing a lone word', () => {
    expect(shortLabel('Key Pool (SQL)')).toBe('SQL');
    expect(shortLabel('Analytics Worker')).toBe('Analytics');
    expect(shortLabel('Cache')).toBe('Cache');
    expect(shortLabel('API Gateway')).toBe('API Gateway');
  });

  it('picks the calculator no element shows as the design estimate', () => {
    expect(designEstimate(view())?.id).toBe('c0');
    const v = view();
    v.calcs = [v.calcs[1]];
    expect(designEstimate(v)).toBeUndefined();
    expect(buildRailData(v).estimate).toBeUndefined();
  });

  it('has no lanes when the view has none', () => {
    const v = view();
    delete v.lanes;
    expect(buildRailData(v).lanes).toEqual([]);
  });
});

describe('lane stat', () => {
  it('reads rate and p99 from the frame by key', () => {
    const sim = { metricKeys: ['g.e', 'f:redirect.n', 'f:redirect.e'], frame: { t: 1, keysEpoch: 1, metrics: new Float64Array([1, 3940, 12.4]), health: new Uint8Array() } };
    expect(laneStat(sim, ['f:redirect.n', 'f:redirect.e'])).toBe('3.9k/s · p99 12 ms');
    expect(laneStat({ ...sim, frame: null }, ['f:redirect.n', 'f:redirect.e'])).toBe('');
    expect(laneStat(sim, undefined)).toBe('');
  });
});

function boardDom() {
  document.body.innerHTML = `
    <div class="player-shell"><div data-board-level><svg>
      <g data-frame-id="kgs-frame"></g>
      <g class="cv-node" data-node-id="a"></g><g class="cv-node" data-node-id="b"></g><g class="cv-node" data-node-id="c"></g>
      <g data-link-id="ab"><path class="cv-link"></path></g><g data-link-id="bc"><path class="cv-link"></path></g>
      <g data-link-label-for="bc"></g>
    </svg></div></div>`;
  return document.querySelector('.player-shell')!;
}

describe('traceOnBoard', () => {
  it('dims everything off the path, inks its links, and reverts only its own marks', () => {
    const root = boardDom();
    const c = root.querySelector('[data-node-id="c"]')!;
    traceOnBoard(root, { nodes: ['a', 'b'], links: ['ab'], frames: [] });
    expect(root.querySelectorAll('.is-dimmed')).toHaveLength(4); // c, bc, its label, the frame
    expect(root.querySelector('[data-link-id="ab"] .cv-link')).toHaveClass('is-hl');
    expect(c).toHaveClass('is-dimmed');

    // Another layer dimmed c meanwhile (a walkthrough): clearing leaves it.
    c.setAttribute('data-wt-dim', '');
    traceOnBoard(root, null);
    expect(root.querySelectorAll('.is-dimmed')).toHaveLength(1);
    expect(c).toHaveClass('is-dimmed');
    expect(root.querySelector('.is-hl')).toBeNull();
  });
});

const WTS = [{ id: 'wt1', title: 'Tour', steps: [{ id: 's1' }] }] as unknown as WalkthroughView[];

function ModeProbe() {
  const mode = usePlayerStore((s) => s.mode);
  const wt = usePlayerStore((s) => s.walkthrough.id);
  return <div data-testid="mode">{`${mode}:${wt ?? ''}`}</div>;
}

function WalkButton() {
  const store = usePlayerStoreApi();
  return (
    <button type="button" onClick={() => store.setState({ mode: 'walkthrough', walkthrough: { id: 'wt1', stepIndex: 0 } })}>
      walk
    </button>
  );
}

function withPlayer(children: React.ReactNode) {
  return (
    <PlayerStoreProvider bootstrap={boot}>
      <WalkthroughProvider value={{ walkthroughs: WTS, narration: {}, breakAvailable: false }}>
        <ModeProbe />
        <WalkButton />
        {children}
      </WalkthroughProvider>
    </PlayerStoreProvider>
  );
}

describe('HowItWorks', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetHowItWorksSeen();
  });

  it('shows for a first visit and stays dismissed once closed', () => {
    const { unmount } = render(withPlayer(<HowItWorks />));
    expect(screen.getByRole('note', { name: 'How it works' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss How it works' }));
    expect(screen.queryByRole('note')).toBeNull();
    expect(window.localStorage.getItem(HOW_SEEN_KEY)).toBe('1');
    unmount();
    render(withPlayer(<HowItWorks />));
    expect(screen.queryByRole('note')).toBeNull();
  });

  it('starts the first walkthrough', () => {
    render(withPlayer(<HowItWorks />));
    fireEvent.click(screen.getByRole('button', { name: 'Start the tour' }));
    expect(screen.getByTestId('mode')).toHaveTextContent('walkthrough:wt1');
    expect(screen.queryByRole('note')).toBeNull();
  });

  it('still hides for this page view when storage is blocked', () => {
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    render(withPlayer(<HowItWorks />));
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss How it works' }));
    expect(screen.queryByRole('note')).toBeNull();
    set.mockRestore();
    get.mockRestore();
  });
});

describe('RequestPaths', () => {
  it('traces on hover and focus, pins on click, and stands down in a walkthrough', () => {
    boardDom();
    const shell = document.querySelector('.player-shell')!;
    const lanes = buildRailData(view()).lanes.map((l) => ({ ...l, nodes: ['a'], links: ['ab'] }));
    const host = document.createElement('div');
    shell.appendChild(host);
    render(withPlayer(<RequestPaths lanes={lanes} />), { container: host });
    const first = screen.getByRole('button', { name: /Open a short link/ });

    fireEvent.mouseEnter(first);
    expect(shell.querySelector('[data-node-id="b"]')).toHaveClass('is-dimmed');
    fireEvent.mouseLeave(first);
    expect(shell.querySelector('.is-dimmed')).toBeNull();

    fireEvent.focus(first);
    expect(shell.querySelector('[data-node-id="c"]')).toHaveClass('is-dimmed');
    fireEvent.blur(first);
    fireEvent.click(first);
    expect(first).toHaveAttribute('aria-pressed', 'true');
    expect(shell.querySelector('[data-node-id="c"]')).toHaveClass('is-dimmed');

    // Entering a walkthrough clears the trace and the pin; hovering does nothing there.
    fireEvent.click(screen.getByRole('button', { name: 'walk' }));
    expect(screen.getByTestId('mode')).toHaveTextContent('walkthrough:wt1');
    expect(shell.querySelector('.is-dimmed')).toBeNull();
    expect(first).toHaveAttribute('aria-pressed', 'false');
    fireEvent.mouseEnter(first);
    expect(shell.querySelector('.is-dimmed')).toBeNull();
  });
});

describe('ProblemHeader', () => {
  it('labels each pill for screen readers', () => {
    render(<ProblemHeader problem={{ title: 'Design a URL Shortener', level: 'hld', grade: 'medium', minutes: 25 }} />);
    expect(screen.getByText('Design a URL Shortener')).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'About this problem' });
    expect(list).toHaveTextContent('Level: hld');
    expect(list).toHaveTextContent('Difficulty: medium●●○');
    expect(list).toHaveTextContent('Estimated time: 25 min');
  });
});

