import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Money spent (one simulated minute = one month) and the auto-scale switch:
 * the card counts up, and auto-scaling shrinks an over-provisioned service
 * and lowers the run rate; the switch is in share links.
 */
async function open(page: import('@playwright/test').Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/solutions/url-shortener');
  await expect(page.locator('[data-player-root]')).toHaveAttribute('data-sim-status', 'ready', { timeout: 30000 });
}

const dollars = (s: string) => Number(s.replace(/[^0-9.]/g, ''));

test.describe('money spent and auto-scale', () => {
  test.skip(({ isMobile }) => isMobile, 'desktop strip; the phone shows the same card in the expanded HUD');

  test('the spent card counts up with simulated time', async ({ page }) => {
    await open(page);
    const amount = page.locator('.cost-meter-amount');
    await expect(amount).not.toHaveText('—', { timeout: 10000 });
    const first = dollars(await amount.innerText());
    await page.locator('body').press(']');
    await page.locator('body').press(']');
    await expect.poll(async () => dollars(await amount.innerText()), { timeout: 10000 }).toBeGreaterThan(first);
    await expect(page.locator('.cost-meter-period')).toContainText('1 min = 1 mo');
  });

  test('auto-scale shrinks the idle API and lowers the monthly cost', async ({ page }) => {
    await open(page);
    await page.locator('body').press(']');
    await page.locator('body').press(']');
    await page.locator('.cost-meter').getByRole('switch', { name: 'Auto-scale' }).click();
    await expect(page.locator('.cost-meter').getByRole('switch')).toBeChecked();
    // 6 pods at a third busy: one at a time down to the fewest that stay under 80%.
    await expect(page.locator('[data-node-id="api-service"] .cv-sub').first()).toHaveText('api · ×3', { timeout: 30000 });
    await expect(page.locator('.hud-tile').nth(3)).toContainText('↓', { timeout: 10000 });
    await expect.poll(() => new URL(page.url()).searchParams.get('a') ?? '', { timeout: 5000 }).not.toBe('');
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`no axe violations on the HUD strip, ${theme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme });
      await open(page);
      const results = await new AxeBuilder({ page }).include('.player-hud-strip').analyze();
      expect(results.violations).toEqual([]);
    });
  }
});
