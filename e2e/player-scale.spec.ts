import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Scaling a component by hand: the inspector's Scale control changes a
 * node's replica count through the worker, the node card and the cost tile
 * follow, and the change is part of a share link.
 */
async function open(page: import('@playwright/test').Page, width = 1440) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/solutions/url-shortener');
  await expect(page.locator('[data-player-root]')).toHaveAttribute('data-sim-status', 'ready', { timeout: 30000 });
}

test.describe('scale by hand', () => {
  test.skip(({ isMobile }) => isMobile, 'desktop inspector; the phone sheet shares the same control');

  test('scaling the API from ×6 to ×8 updates the card, the load and the cost', async ({ page }) => {
    await open(page);
    await page.locator('[data-node-id="api-service"]').first().click();
    const ctl = page.locator('.player-inspector .scale-control');
    await expect(ctl).toContainText('×6 pods');
    await ctl.getByRole('button', { name: 'One more pods' }).click();
    await ctl.getByRole('button', { name: 'One more pods' }).click();
    await expect(ctl).toContainText('+$248/mo');
    await ctl.getByRole('button', { name: 'Apply ×8' }).click();
    await expect(ctl).toContainText('×8 pods', { timeout: 10000 });
    await expect(page.locator('[data-node-id="api-service"] .cv-sub').first()).toHaveText('api · ×8');
    // The change is in the URL's action log, so a share link replays it.
    await expect.poll(() => new URL(page.url()).searchParams.get('a') ?? '', { timeout: 5000 }).not.toBe('');
  });

  test('the stepper stops at the limits and Apply is off when nothing changed', async ({ page }) => {
    await open(page);
    await page.locator('[data-node-id="cache-redis"]').first().click();
    const ctl = page.locator('.player-inspector .scale-control');
    await expect(ctl).toContainText('shards');
    await expect(ctl.getByRole('button', { name: 'One fewer shards' })).toBeDisabled();
    await expect(ctl.getByRole('button', { name: /^Apply/ })).toBeDisabled();
  });

  test('a share link restores the scaled API', async ({ page, context }) => {
    await open(page);
    await page.locator('[data-node-id="api-service"]').first().click();
    const ctl = page.locator('.player-inspector .scale-control');
    await ctl.getByRole('button', { name: 'One more pods' }).click();
    await ctl.getByRole('button', { name: 'Apply ×7' }).click();
    await expect(page.locator('[data-node-id="api-service"] .cv-sub').first()).toHaveText('api · ×7', { timeout: 10000 });
    await expect.poll(() => new URL(page.url()).searchParams.get('a') ?? '', { timeout: 5000 }).not.toBe('');
    const link = page.url();
    const fresh = await context.newPage();
    await fresh.setViewportSize({ width: 1440, height: 900 });
    await fresh.goto(link);
    await expect(fresh.locator('[data-player-root]')).toHaveAttribute('data-sim-status', 'ready', { timeout: 30000 });
    await expect(fresh.locator('[data-node-id="api-service"] .cv-sub').first()).toHaveText('api · ×7', { timeout: 10000 });
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`no axe violations with the Scale control open, ${theme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme });
      await open(page);
      await page.locator('[data-node-id="api-service"]').first().click();
      await expect(page.locator('.player-inspector .scale-control')).toBeVisible();
      const results = await new AxeBuilder({ page }).include('.player-inspector').analyze();
      expect(results.violations).toEqual([]);
    });
  }
});
