import { test, expect, type Page } from '@playwright/test';

/**
 * Taking a failure back, and a walkthrough handing its failure to Break it:
 * - "Now break it" at the end of a walkthrough about a failure opens Break
 *   it with that failure already in effect;
 * - a dead node's inspector offers Restore, and so does "Broken now" at the
 *   top of Fix it, one per failure still in effect.
 */
const READY_TIMEOUT = 30000;

async function open(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/solutions/url-shortener');
  await expect(page.locator('[data-player-root]')).toHaveAttribute('data-sim-status', 'ready', { timeout: READY_TIMEOUT });
}

const tool = (page: Page, label: string) => page.locator('.break-toolbox').getByRole('button', { name: new RegExp(`^${label}`) });
const log = (page: Page) => page.locator('.player-canvas-area .break-log');

test.describe('Restore and the walkthrough hand-over', () => {
  test.skip(({ isMobile }) => isMobile, 'desktop layout; the phone sheet carries the same panels');

  test('"Now break it" after "When Redis dies" opens Break it with Redis already killed', async ({ page }) => {
    await open(page);
    await page.locator('body').press('3');
    await page.locator('[data-walkthrough="system-failure"] button').first().click();
    const narration = page.locator('[data-walkthrough-narration="system-failure"]');
    await expect(narration).toBeVisible();
    await expect(async () => {
      await page.locator('body').press('ArrowRight');
      await expect(narration).toHaveAttribute('data-step', '4', { timeout: 500 });
    }).toPass({ timeout: 10000 });
    const go = narration.locator('[data-break-move]');
    await expect(go).toHaveText(/Now break it: Kill the Redis cache/);
    await go.click();
    await expect(page.locator('[data-player-root]')).toHaveAttribute('data-player-mode', 'break');
    await expect(log(page)).toContainText('Killed Redis Cache', { timeout: 15000 });
  });

  test('a walkthrough with no failure of its own just opens Break it', async ({ page }) => {
    await open(page);
    await page.locator('body').press('3');
    await page.locator('[data-walkthrough="read-path-cache-hit"] button').first().click();
    const narration = page.locator('[data-walkthrough-narration="read-path-cache-hit"]');
    await expect(async () => {
      await page.locator('body').press('ArrowRight');
      await expect(narration).toHaveAttribute('data-step', '3', { timeout: 500 });
    }).toPass({ timeout: 10000 });
    await narration.getByRole('button', { name: /^Now break it/ }).click();
    await expect(page.locator('[data-player-root]')).toHaveAttribute('data-player-mode', 'break');
    await expect(page.locator('.player-canvas-area .break-try')).toBeVisible();
  });

  test('a dead node’s inspector restores it', async ({ page }) => {
    await open(page);
    await page.locator('body').press('2');
    await page.locator('.player-canvas-area .break-try-card', { hasText: 'Kill the Redis cache' }).click();
    await expect(log(page)).toContainText('Killed Redis Cache');
    await page.locator('[data-node-id="cache-redis"]').first().click();
    const restore = page.locator('.player-inspector').getByRole('button', { name: 'Restore Redis Cache' });
    await expect(restore).toBeVisible();
    await restore.click();
    await expect(log(page)).toContainText('Restored Redis Cache');
    await expect(page.locator('.player-inspector .break-down')).toHaveCount(0);
  });

  test('"Broken now" lists each failure in effect, and each one restores on its own', async ({ page }) => {
    await open(page);
    await page.locator('body').press('2');
    await page.locator('.player-canvas-area .break-try-card', { hasText: 'Kill the Redis cache' }).click();
    await expect(log(page)).toContainText('Killed Redis Cache');
    await tool(page, 'Kill').click();
    await expect(page.locator('.break-armed')).toBeVisible();
    await page.locator('[data-node-id="api-service"]').first().click();
    await expect(log(page)).toContainText('Killed API Service');
    const panel = page.locator('.player-inspector .break-fixit');
    await expect(async () => {
      if (!(await panel.isVisible())) await tool(page, 'Fix it').click();
      await expect(panel).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 10000 });
    const now = panel.locator('.break-now-item');
    await expect(now).toHaveCount(2);
    await panel.getByRole('button', { name: 'Restore: Killed API Service' }).click();
    await expect(now).toHaveCount(1);
    await expect(now.first()).toHaveAttribute('data-target', 'cache-redis');
    await expect(log(page)).toContainText('Restored API Service');
  });
});
