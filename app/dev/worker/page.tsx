import { notFound } from 'next/navigation';
import { loadManifest, loadPlayerDiagram, loadSimPayloadRef } from '@/app/(server)/engine/publicData';
import { DevWorkerClient } from './DevWorkerClient';

export const metadata = {
  title: 'Worker bridge — /dev/worker',
  robots: { index: false, follow: false },
};

const DEV_DIAGRAM_ID = 'url-shortener';

/** Finds the synced runtime bundle's dev-servable path (`/dev/worker/data/runtime/<file>`), or `null`. */
async function loadDevRuntimeUrl(): Promise<string | null> {
  const manifest = await loadManifest();
  const entry = manifest.files.find((f) => f.scope === 'public' && /^public\/runtime\/sim-worker\..*\.js$/.test(f.path));
  if (!entry) return null;
  const rel = entry.path.slice('public/'.length); // "runtime/sim-worker.<hash>.js"
  const shortHash = entry.hash.replace(/^sha256:/, '').slice(0, 8);
  return `/dev/worker/data/${rel}?h=${shortHash}`;
}

/**
 * T2.13 dev check: loads url-shortener's real synced sim payload + runtime
 * worker bundle from `data/engine/` (via the dev-only route next to this
 * page) and drives the worker bridge for real — play/pause, live metrics at
 * 10 Hz, and one "kill cache" Break It action. Development only — 404s in
 * production, same gating as `/dev/ui` and `/dev/player`.
 */
export default async function DevWorkerPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  const [diagram, simRef, runtimeUrl] = await Promise.all([
    loadPlayerDiagram(DEV_DIAGRAM_ID),
    loadSimPayloadRef(DEV_DIAGRAM_ID),
    loadDevRuntimeUrl(),
  ]);

  if (!diagram || !simRef || !runtimeUrl) {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-6">
        <h1 className="text-lg font-medium">Worker bridge — /dev/worker</h1>
        <p role="status" className="text-ink-secondary">
          Missing synced data for &quot;{DEV_DIAGRAM_ID}&quot;: {!diagram && 'no view.json. '}
          {!simRef && 'no sim.bin. '}
          {!runtimeUrl && 'no runtime bundle. '}
          Run the engine&apos;s <code>npm run build:v3</code> then <code>node scripts/sync-engine-v3.js</code> (with{' '}
          <code>DMS_ENGINE_DIST_V3</code> pointed at the engine worktree if it isn&apos;t a sibling of this repo).
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-lg font-medium">Worker bridge — {diagram.head.title}</h1>
      <DevWorkerClient
        simUrl={`/dev/worker/data/${simRef.dataPath}`}
        build={simRef.build}
        runtimeUrl={runtimeUrl}
        title={diagram.head.title}
      />
    </main>
  );
}
