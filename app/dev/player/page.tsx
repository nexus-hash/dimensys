import { notFound } from 'next/navigation';
import { DiagramPlayer, StaticBlueprint } from '@/app/(components)/player';
import type { HealthLookup, ViewData } from '@/app/(components)/player';
import { listDiagramIds, loadPlayerDiagram } from '@/app/(server)/engine/publicData';

export const metadata = {
  title: 'Player skeleton — /dev/player',
  robots: { index: false, follow: false },
};

/** Hand-written stand-in for a view-data document, so the skeleton renders without synced output. */
const FIXTURE: ViewData = {
  fmt: 2,
  build: `sha256:${'0'.repeat(64)}`,
  id: 'dev-fixture',
  rev: 1,
  family: 'hld',
  head: { title: 'Player skeleton fixture', blurb: 'Fixture for the player skeleton.', grade: 'easy', labels: [] },
  needs: [],
  premises: [],
  refs: [],
  board: { size: [640, 360], blocks: [], wires: [] },
  spares: { blocks: [], wires: [] },
  pins: [],
  stories: [],
  plays: [],
  remedies: [],
  switches: [],
  gauges: [],
  calcs: [],
  drills: [],
  motifs: [],
  live: false,
};

/** A small hand-built board exercising every element the static blueprint (T3.2) draws: nodes, a folded and an expanded subsystem, and every link style. */
const BLUEPRINT_FIXTURE_BOARD: NonNullable<ViewData['board']> = {
  size: [1040, 420],
  blocks: [
    { id: 'client-web', form: 'client', flavor: 'web', text: 'Web Browser', box: [72, 90, 144, 72] },
    { id: 'lb-main', form: 'lb', flavor: 'nginx', text: 'Load Balancer', box: [300, 90, 144, 72], stack: 2 },
    { id: 'api-service', form: 'server', flavor: 'api', text: 'API Service', box: [528, 90, 144, 72], stack: 6, duty: 'primary' },
    { id: 'cache-redis', form: 'cache', flavor: 'redis', text: 'Redis Cache', box: [528, 210, 144, 72] },
    { id: 'db-nosql', form: 'db', flavor: 'cassandra', text: 'URL Storage', box: [756, 210, 144, 72], stack: 3 },
    {
      id: 'kgs-service',
      form: 'subSystem',
      text: 'Key Generation Service',
      box: [300, 210, 192, 96],
      folded: true,
      inner: {
        size: [300, 72],
        blocks: [
          { id: 'kgs-worker', form: 'worker', text: 'KGS Worker', box: [80, 36, 144, 72] },
          { id: 'kgs-db', form: 'db', flavor: 'sql', text: 'Key Pool', box: [220, 36, 144, 72] },
        ],
        wires: [{ id: 'kgs-link', a: 'kgs-worker', b: 'kgs-db', line: 'sync', route: [[152, 36], [148, 36]] }],
      },
    },
    {
      id: 'analytics',
      form: 'subSystem',
      text: 'Analytics Pipeline',
      box: [900, 340, 192, 96],
      folded: false,
      inner: {
        size: [340, 100],
        blocks: [
          { id: 'ana-worker', form: 'worker', text: 'Worker', box: [70, 50, 144, 72] },
          { id: 'ana-store', form: 'objectStore', text: 'Cold Store', box: [260, 50, 144, 72] },
        ],
        wires: [{ id: 'ana-link', a: 'ana-worker', b: 'ana-store', line: 'stream', route: [[142, 50], [188, 50]] }],
      },
    },
  ],
  wires: [
    { id: 'l-client-lb', a: 'client-web', b: 'lb-main', line: 'sync', route: [[144, 90], [228, 90]] },
    { id: 'l-lb-api', a: 'lb-main', b: 'api-service', line: 'sync', route: [[372, 90], [456, 90]] },
    { id: 'l-api-cache', a: 'api-service', b: 'cache-redis', line: 'sync', text: 'cache read', route: [[528, 126], [528, 174]] },
    { id: 'l-api-db', a: 'api-service', b: 'db-nosql', line: 'async', text: 'async write', two: true, route: [[600, 126], [720, 174]] },
    { id: 'l-api-kgs', a: 'api-service', b: 'kgs-service', line: 'sync', route: [[456, 108], [396, 150]] },
    { id: 'l-db-analytics', a: 'db-nosql', b: 'analytics', line: 'stream', route: [[828, 246], [880, 292]] },
  ],
};

/** Demonstrates the static blueprint's color-by hook (T3.2): a per-id health lookup, defaulting every other element to `ok`. */
const HEALTH_DEMO: HealthLookup = {
  'lb-main': { state: 'warn', label: 'p99 640 ms' },
  'db-nosql': { state: 'critical', label: 'err 38%' },
  'cache-redis': { state: 'down', label: 'DOWN' },
  'kgs-service': { state: 'recovering', label: 'warming 42%' },
};

async function loadRealDiagram(id: string): Promise<ViewData | null> {
  try {
    const ids = await listDiagramIds();
    if (!ids.includes(id)) return null;
    return await loadPlayerDiagram(id);
  } catch {
    // No synced engine output in this environment (frontend-only dev run before a sync).
    return null;
  }
}

/**
 * T3.2 dev check: the static blueprint renders server-side, with real synced
 * documents when available, plus a hand-built fixture exercising every
 * element (nodes, a folded and an expanded subsystem, every link style) and
 * the color-by health hook. Development only — 404s in production, same as
 * `/dev/ui`.
 */
export default async function DevPlayerPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  const [urlShortener, netflix] = await Promise.all([loadRealDiagram('url-shortener'), loadRealDiagram('netflix')]);

  return (
    // `w-full` (an explicit, definite `width: 100%`) plus `min-w-0` (T3.4):
    // `<body>` is `flex flex-col` (root layout), and without an explicit
    // width, `main`'s cross-size is resolved via flex stretch — which,
    // combined with a fixed-height + `aspect-ratio` box further down (the
    // fixture sections below use both), hits a real Chromium sizing
    // circularity: the stretch target isn't yet definite when the
    // aspect-ratio box's width needs resolving, so it falls back to that
    // box's own aspect-ratio-derived preferred width (e.g. 1040px for the
    // 1040×420 fixture) instead of the viewport. That dragged `main` — and
    // everything after it, including the real player section below — wider
    // than a phone viewport, which is what let an earlier fixture's SVG sit
    // on top of (and intercept clicks meant for) content further down the
    // now-mis-laid-out page. An explicit `width: 100%` is definite from the
    // start (100% of `<body>`, itself definite), so it never falls into
    // that fallback.
    <main className="mx-auto w-full max-w-6xl min-w-0 space-y-10 p-6">
      <section>
        <h2 className="mb-2 text-title-2 text-ink-primary">Skeleton check (T3.1)</h2>
        <div className="space-y-4">
          <DiagramPlayer diagram={FIXTURE} />
          <DiagramPlayer diagram={null} />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-title-2 text-ink-primary">Static blueprint fixture (T3.2)</h2>
        <p className="mb-4 text-body text-ink-secondary">
          Nodes, links (sync/async/stream, bidirectional), a folded subsystem and an expanded one, drawn server-side.
        </p>
        <StaticBlueprint
          board={BLUEPRINT_FIXTURE_BOARD}
          boardId="blueprint-fixture"
          label="Static blueprint fixture"
          className="h-[420px] w-full rounded-lg border border-line-hairline"
        />
      </section>

      <section>
        <h2 className="mb-2 text-title-2 text-ink-primary">Color-by health hook (T3.2)</h2>
        <p className="mb-4 text-body text-ink-secondary">
          Same fixture, with a per-id health lookup driving the ring/glyph states T3.3 will keep live.
        </p>
        <StaticBlueprint
          board={BLUEPRINT_FIXTURE_BOARD}
          boardId="blueprint-fixture-health"
          label="Static blueprint fixture, with health"
          className="h-[420px] w-full rounded-lg border border-line-hairline"
          health={HEALTH_DEMO}
        />
      </section>

      {urlShortener?.board && (
        <section>
          <h2 className="mb-2 text-title-2 text-ink-primary">url-shortener (synced)</h2>
          <DiagramPlayer diagram={urlShortener} />
        </section>
      )}

      {netflix?.board && (
        <section>
          <h2 className="mb-2 text-title-2 text-ink-primary">netflix (synced)</h2>
          <DiagramPlayer diagram={netflix} />
        </section>
      )}

      {!urlShortener?.board && !netflix?.board && (
        <p role="status" className="text-ink-secondary">
          No synced engine output in `data/engine/` — run the sync script to see the real documents here.
        </p>
      )}
    </main>
  );
}
