import { test, expect } from '@playwright/test';

/**
 * T3.13: `/solutions/[id]`, the hand-written replacement for the old
 * TSX-codegen route. Covers the three shapes a request can land on:
 *  - a published diagram (a `board` in its view data) → the real player,
 *    static SVG blueprint as the LCP element;
 *  - a planned diagram (no `board` yet) → a real static page with a
 *    "coming soon" placeholder, not a 404 (this task's documented choice —
 *    see `app/solutions/[id]/page.tsx`'s module doc comment);
 *  - an id absent from the manifest entirely → 404 (`dynamicParams = false`).
 * Plus the alias/legacy-route redirects `next.config.ts` builds from
 * `catalog.json`.
 */
test.describe('/solutions/[id]', () => {
  test('a published diagram renders the static SVG blueprint', async ({ page }) => {
    await page.goto('/solutions/url-shortener');
    await expect(page).toHaveTitle(/URL Shortener/i);
    // Not `locator('svg').first()`: the player shell (T3.16) renders a few
    // small UI icons (the rail toggle, etc.) before the board itself in DOM
    // order — this targets the actual diagram SVG specifically.
    await expect(page.locator('[data-player-root] [data-drill-key=""] svg[aria-label]').first()).toBeVisible();
    expect(await page.locator('[data-node-id]').count()).toBeGreaterThan(0);
  });

  test('a planned diagram (no board yet) renders a real page, not a 404', async ({ page }) => {
    const res = await page.goto('/solutions/whatsapp');
    expect(res?.status()).toBe(200);
    await expect(page.getByRole('status').filter({ hasText: /not available|no diagram yet/i })).toBeVisible();
  });

  test('an id absent from the manifest 404s', async ({ page }) => {
    const res = await page.goto('/solutions/this-id-does-not-exist');
    expect(res?.status()).toBe(404);
  });

  test('an old /solutions/<formerly-id> link redirects to the canonical id', async ({ page }) => {
    const res = await page.goto('/solutions/hld-netflix');
    expect(new URL(page.url()).pathname).toBe('/solutions/netflix');
    expect(res?.status()).toBe(200);
  });

  test('the old /2d/[problemId] viewer redirects to /solutions/<id>', async ({ page }) => {
    await page.goto('/2d/url-shortener');
    expect(new URL(page.url()).pathname).toBe('/solutions/url-shortener');
  });

  test('/2d/<formerly-id> redirects (via /solutions/<formerly-id>) to the canonical /solutions/<id>', async ({ page }) => {
    await page.goto('/2d/hld-netflix');
    expect(new URL(page.url()).pathname).toBe('/solutions/netflix');
  });
});
