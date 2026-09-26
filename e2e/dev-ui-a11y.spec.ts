import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * §9/§14: the dev gallery is the a11y test surface for the primitive layer.
 * Runs axe in both themes with zero serious/critical violations.
 */
for (const theme of ['light', 'dark'] as const) {
  test(`/dev/ui has no serious/critical axe violations (${theme})`, async ({ page }) => {
    await page.goto('/dev/ui');
    await page.evaluate((t) => {
      document.documentElement.setAttribute('data-theme', t);
    }, theme);
    await expect(page.getByRole('heading', { name: 'DS3 — UI primitives gallery' })).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();

    const seriousOrCritical = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );

    if (seriousOrCritical.length > 0) {
      console.log(JSON.stringify(seriousOrCritical, null, 2));
    }
    expect(seriousOrCritical).toEqual([]);
  });
}
