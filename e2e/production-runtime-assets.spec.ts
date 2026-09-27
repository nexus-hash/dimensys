import { readFileSync } from 'fs';
import * as path from 'path';
import { test, expect } from '@playwright/test';

/**
 * T3.13: production delivery of the runtime assets. `/dev/worker` already
 * proves the worker bridge drives a real sim end-to-end, but it 404s in
 * production (dev-only, same gating as `/dev/ui` and `/dev/player`) — so it
 * can't itself prove the *production* routes this task adds
 * (`/engine/runtime/<file>`, `/solutions/<id>/sim.bin`) actually serve
 * working bytes. `<DiagramPlayer>` doesn't wire a `WorkerBridge` into the
 * real page yet (T3.3's `<InteractiveLayer>` does that); this test drives
 * the real worker bundle directly, against exactly the URLs
 * `loadRuntimeUrl`/`loadSimPayloadRef` compute, using the documented wire
 * protocol (`worker/protocol.ts`) — proving the served files are the real,
 * runnable thing, independent of how the page wires them up later.
 *
 * Reads `data/engine/manifest.json` directly (Node-side, not through the
 * app) to compute the expected URLs, mirroring `publicData.ts`'s own
 * resolution rules.
 */

interface ManifestFile {
  path: string;
  hash: string;
  bytes: number;
  scope: 'public' | 'server';
}
interface Manifest {
  files: ManifestFile[];
  diagrams: Array<{ id: string; build: string; sim?: ManifestFile }>;
}

function loadManifest(): Manifest {
  const raw = readFileSync(path.join(process.cwd(), 'data/engine/manifest.json'), 'utf-8');
  return JSON.parse(raw) as Manifest;
}

function shortHash(hash: string): string {
  return hash.replace(/^sha256:/, '').slice(0, 8);
}

const DIAGRAM_ID = 'url-shortener';

test.describe('production runtime assets are servable and the worker actually runs', () => {
  test('the synced runtime worker bundle boots a real sim from the production routes', async ({ page }) => {
    const manifest = loadManifest();

    const runtimeEntry = manifest.files.find((f) => f.scope === 'public' && /^public\/runtime\/sim-worker\..*\.js$/.test(f.path));
    test.skip(!runtimeEntry, 'no synced runtime bundle in data/engine/manifest.json');
    const runtimeFilename = runtimeEntry!.path.replace(/^public\/runtime\//, '');
    const runtimeUrl = `/engine/runtime/${runtimeFilename}?h=${shortHash(runtimeEntry!.hash)}`;

    const diagramEntry = manifest.diagrams.find((d) => d.id === DIAGRAM_ID);
    test.skip(!diagramEntry?.sim, `${DIAGRAM_ID} has no synced sim payload`);
    const simUrl = `/solutions/${DIAGRAM_ID}/sim.bin?h=${shortHash(diagramEntry!.sim!.hash)}`;
    const build = diagramEntry!.build;

    // The two production routes serve the exact bytes the manifest declares,
    // with the immutable long-cache header (T3.13 goal 2).
    const runtimeRes = await page.request.get(runtimeUrl);
    expect(runtimeRes.status()).toBe(200);
    expect(runtimeRes.headers()['cache-control']).toContain('immutable');
    expect((await runtimeRes.body()).length).toBe(runtimeEntry!.bytes);

    const simRes = await page.request.get(simUrl);
    expect(simRes.status()).toBe(200);
    expect(simRes.headers()['cache-control']).toContain('immutable');
    expect((await simRes.body()).length).toBe(diagramEntry!.sim!.bytes);

    const consoleErrors: string[] = [];
    page.on('pageerror', (err) => consoleErrors.push(String(err)));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // The static blueprint (T3.2) is the LCP element: no client JS needed to see it.
    // Not `locator('svg').first()`: the player shell (T3.16) renders a few
    // small UI icons before the board itself in DOM order.
    await page.goto(`/solutions/${DIAGRAM_ID}`);
    await expect(page.locator('[data-player-root] [data-drill-key=""] svg[aria-label]').first()).toBeVisible();

    // Drive the real worker bundle with the documented protocol: init -> ready -> play -> frame.
    const frameCount = await page.evaluate(
      async ({ runtimeUrl, simUrl, build }) => {
        return await new Promise<number>((resolve, reject) => {
          const worker = new Worker(runtimeUrl, { type: 'module' });
          let seq = 0;
          let frames = 0;
          const timer = setTimeout(() => {
            worker.terminate();
            reject(new Error('timed out waiting for a frame'));
          }, 10000);

          worker.addEventListener('error', (ev) => {
            clearTimeout(timer);
            reject(new Error(`worker onerror: ${ev.message}`));
          });
          worker.addEventListener('messageerror', () => {
            clearTimeout(timer);
            reject(new Error('worker messageerror'));
          });
          worker.addEventListener('message', (ev) => {
            const data = ev.data as { type?: string; code?: string; message?: string };
            if (data?.type === 'ready') {
              worker.postMessage({ type: 'play', seq: ++seq });
            } else if (data?.type === 'frame') {
              frames += 1;
              if (frames >= 2) {
                clearTimeout(timer);
                worker.terminate();
                resolve(frames);
              }
            } else if (data?.type === 'error') {
              clearTimeout(timer);
              worker.terminate();
              reject(new Error(`worker error message: ${data.code} ${data.message}`));
            }
          });

          worker.postMessage({ type: 'init', seq: ++seq, protocol: 1, simUrl, build, mode: 'free', paused: false });
        });
      },
      { runtimeUrl, simUrl, build },
    );

    expect(frameCount).toBeGreaterThanOrEqual(2);
    expect(consoleErrors).toEqual([]);
  });
});
