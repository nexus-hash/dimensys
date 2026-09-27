import { test, expect } from '@playwright/test';

/**
 * T3.2: the static blueprint (nodes, links, subsystems) must be readable
 * with no client JS at all — it's server-rendered SVG, not hydrated. This
 * disables JS entirely (stronger than just not waiting for hydration) and
 * checks the synced url-shortener and netflix documents plus the
 * color-by/health fixture, all served from `/dev/player`.
 */
test.describe('static blueprint renders with JavaScript disabled', () => {
  test.use({ javaScriptEnabled: false });

  test('renders the synced url-shortener and netflix boards as server HTML', async ({ page }) => {
    await page.goto('/dev/player');

    // Real synced documents (data/engine/), each with several nodes and links.
    await expect(page.getByRole('heading', { name: 'url-shortener (synced)' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'netflix (synced)' })).toBeVisible();

    const nodeCount = await page.locator('[data-node-id]').count();
    const linkCount = await page.locator('[data-link-id]').count();
    expect(nodeCount).toBeGreaterThan(10);
    expect(linkCount).toBeGreaterThan(10);
  });

  test('draws the expanded subsystem, its inner nodes, and every link style', async ({ page }) => {
    await page.goto('/dev/player');
    const fixtureBoard = page.locator('svg[aria-label="Static blueprint fixture"]');

    // The hand-built fixture: a folded subsystem stays collapsed (no inner nodes drawn)...
    await expect(fixtureBoard.locator('[data-node-id="kgs-service"]')).toBeVisible();
    await expect(fixtureBoard.locator('[data-node-id="kgs-worker"]')).toHaveCount(0);

    // ...an expanded one draws its frame tab and inner nodes/link in the parent's space.
    await expect(fixtureBoard.getByText('ANALYTICS PIPELINE · 2 NODES')).toBeVisible();
    await expect(fixtureBoard.locator('[data-node-id="ana-worker"]')).toBeVisible();
    // A perfectly horizontal link's SVG path has a zero-height bounding box (nothing to do with
    // this being a subsystem-nested link), so it's checked by attachment + its drawn path, not
    // pixel visibility.
    const innerLink = fixtureBoard.locator('[data-link-id="ana-link"] path.cv-link');
    await expect(innerLink).toBeAttached();
    await expect(innerLink).toHaveAttribute('d', 'M872,340 L918,340');
  });

  test('drives node rings from the color-by health lookup', async ({ page }) => {
    await page.goto('/dev/player');

    const healthyDbNode = page.locator('svg[aria-label="Static blueprint fixture"] [data-node-id="db-nosql"]');
    await expect(healthyDbNode).not.toHaveClass(/cv-health-/);

    const criticalDbNode = page.locator('svg[aria-label="Static blueprint fixture, with health"] [data-node-id="db-nosql"]');
    await expect(criticalDbNode).toHaveClass(/cv-health-critical/);
    await expect(criticalDbNode).toHaveAccessibleName(/critical/i);
  });
});
