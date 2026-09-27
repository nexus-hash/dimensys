import { test, expect } from '@playwright/test';

/**
 * T2.5 / T3.13: `server-data/engine/**` (full diagram sources with
 * `interview` blocks, puzzle secrets) must never be reachable over HTTP —
 * only Route Handlers that read it via `fs` may expose *derived* results,
 * never the raw documents (see `app/(server)/engine/serverData.ts`).
 * `data/engine/**` itself (the synced public JSON/binary, but deliberately
 * kept outside `public/` per SYNC2) must also be unreachable directly: the
 * only paths this app serves from it are the specific routes T3.13 adds
 * (`/solutions/<id>/diagram.json`, `/solutions/<id>/sim.bin`,
 * `/engine/runtime/<file>`), never the directory itself.
 */
test.describe('server-only and data-only directories are unreachable', () => {
  for (const requestPath of [
    '/server-data/engine/catalog.json',
    '/server-data/engine/manifest.json',
    '/server-data/engine/diagrams/url-shortener.json',
    '/server-data/engine/diagrams/url-shortener.compiled.json',
    '/server-data/engine/library/core.json',
    '/data/engine/manifest.json',
    '/data/engine/catalog.json',
    '/data/engine/diagrams/url-shortener.view.json',
    '/data/engine/runtime/sim-worker.8fc0592e.js',
  ]) {
    test(`${requestPath} 404s`, async ({ request, baseURL }) => {
      const res = await request.get(new URL(requestPath, baseURL).toString());
      expect(res.status()).toBe(404);
    });
  }
});
