import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Fix it's two modes: "Fix it myself" (every fix, no hints, a live verdict)
 * and "Show me the fixes" (the verified plans for the failure in effect,
 * cheapest first, the cheapest applied as soon as the mode opens).
 */
const READY_TIMEOUT = 30000;
const EFFECT_TIMEOUT = 25000;

async function openBreak(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/solutions/url-shortener');
  await expect(page.locator('[data-player-root]')).toHaveAttribute('data-sim-status', 'ready', { timeout: READY_TIMEOUT });
  await page.locator('body').press('2');
  await expect(page.locator('[data-player-root]')).toHaveAttribute('data-player-mode', 'break');
  await page.locator('body').press(']');
  await page.locator('body').press(']');
}

const panel = (page: Page) => page.locator('.player-inspector .break-fixit');
const tool = (page: Page, label: string) => page.locator('.break-toolbox').getByRole('button', { name: new RegExp(`^${label}`) });

async function openFixIt(page: Page) {
  await expect(async () => {
    if (!(await panel(page).isVisible())) await tool(page, 'Fix it').click();
    await expect(panel(page)).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 10000 });
}

/** Kills a node without a card (the "Try this" cards give way to the action log after the first move). */
async function killNode(page: Page, id: string) {
  await page.locator(`[data-node-id="${id}"]`).first().click();
  await page.keyboard.press('k');
}

async function tryCard(page: Page, text: string | RegExp) {
  await page.locator('.player-canvas-area .break-try-card', { hasText: text }).click();
}

test.describe('Fix it modes', () => {
  test.skip(({ isMobile }) => isMobile, 'desktop panel; the phone sheet shows the same panel');

  test('Fix it myself lists every fix with no hints and a live verdict', async ({ page }) => {
    await openBreak(page);
    await openFixIt(page);
    await tryCard(page, 'Kill the Redis cache');
    await expect(panel(page).locator('.break-fixit-verdict')).toHaveAttribute('data-passing', '0', { timeout: EFFECT_TIMEOUT });
    await expect(panel(page).locator('[data-fix-id]').first()).toBeVisible();
    await expect(panel(page)).not.toContainText('fits this failure');
    expect(await panel(page).locator('[data-fix-id]').count()).toBeGreaterThan(7);
  });

  test('Show me the fixes applies the cheapest plan, and another plan can replace it', async ({ page }) => {
    test.setTimeout(120000);
    await openBreak(page);
    await openFixIt(page);
    await tryCard(page, 'Kill the Redis cache');
    await expect(panel(page).locator('.break-fixit-verdict')).toHaveAttribute('data-passing', '0', { timeout: EFFECT_TIMEOUT });
    await panel(page).getByRole('radio', { name: 'Show me the fixes' }).click();
    const plans = panel(page).locator('.break-plans');
    await expect(plans).toHaveAttribute('data-cause', 'kill:cache-redis');
    await expect(plans.locator('.break-plan').first()).toHaveAttribute('data-applied', 'true', { timeout: 10000 });
    await expect(plans.locator('.break-plan').first()).toContainText('no extra cost');
    await expect(plans.locator('.break-plan').first()).toContainText('Trade-offs');
    // The cheapest plan brings the requirements back.
    await expect(panel(page).locator('.break-fixit-reqs [aria-label="failing"]')).toHaveCount(0, { timeout: EFFECT_TIMEOUT });
    // Plan 2 replaces plan 1 (a costlier one: it scales something).
    await plans.getByRole('button', { name: 'Apply plan 2' }).click();
    await expect(plans.locator('.break-plan').nth(1)).toHaveAttribute('data-applied', 'true', { timeout: 15000 });
    await expect(plans.locator('.break-plan').first()).toHaveAttribute('data-applied', 'false');
    await expect(panel(page).locator('.break-fixit-reqs [aria-label="failing"]')).toHaveCount(0, { timeout: EFFECT_TIMEOUT });
  });

  test('a 10× spike is fixed by scaling the busy tiers', async ({ page }) => {
    await openBreak(page);
    await openFixIt(page);
    await tryCard(page, /10x traffic/);
    await panel(page).getByRole('radio', { name: 'Show me the fixes' }).click();
    const first = panel(page).locator('.break-plan').first();
    await expect(first).toContainText('Scale API Service to ×');
    await expect(first).toContainText('/mo');
  });

  test('a flushed cache heals on its own, and a mix of failures points to Fix it myself', async ({ page }) => {
    await openBreak(page);
    await openFixIt(page);
    await panel(page).getByRole('radio', { name: 'Show me the fixes' }).click();
    await expect(panel(page).locator('[data-plans-state]')).toHaveAttribute('data-plans-state', 'none');
    await tryCard(page, 'Flush the Redis Cache');
    await expect(panel(page).locator('[data-plans-state]')).toHaveAttribute('data-plans-state', 'heals');
    await killNode(page, 'cache-redis');
    await expect(panel(page).locator('[data-plans-state]')).toHaveAttribute('data-plans-state', 'plans');
    await killNode(page, 'lb-main');
    await expect(panel(page).locator('[data-plans-state]')).toHaveAttribute('data-plans-state', 'unknown');
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`no axe violations in either mode, ${theme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme });
      await openBreak(page);
      await openFixIt(page);
      await tryCard(page, 'Kill the Redis cache');
      expect((await new AxeBuilder({ page }).include('.player-inspector').analyze()).violations).toEqual([]);
      await panel(page).getByRole('radio', { name: 'Show me the fixes' }).click();
      await expect(panel(page).locator('.break-plan').first()).toBeVisible();
      expect((await new AxeBuilder({ page }).include('.player-inspector').analyze()).violations).toEqual([]);
    });
  }
});
