import { test, expect } from '@playwright/test';

/**
 * T3.2: the static blueprint (nodes, links, group frames) must be readable
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

  test('draws a group as a frame round its nodes, inline, and every link style', async ({ page }) => {
    await page.goto('/dev/player');
    const fixtureBoard = page.locator('svg[aria-label="Static blueprint fixture"]');

    // The group is a frame with its name as a tab; its nodes are ordinary nodes on the one board.
    await expect(fixtureBoard.getByText('KEY GENERATION SERVICE')).toBeVisible();
    await expect(fixtureBoard.locator('[data-node-id="kgs-service"]')).toHaveCount(0);
    await expect(fixtureBoard.locator('[data-node-id="kgs-worker"]')).toBeVisible();
    await expect(fixtureBoard.locator('[data-node-id="kgs-db"]')).toBeVisible();
    // A perfectly horizontal link's SVG path has a zero-height bounding box, so it's checked by
    // attachment + its drawn path, not pixel visibility.
    const innerLink = fixtureBoard.locator('[data-link-id="kgs-link"] path.cv-link');
    await expect(innerLink).toBeAttached();
    await expect(innerLink).toHaveAttribute('d', 'M258,340 L314,340');
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
