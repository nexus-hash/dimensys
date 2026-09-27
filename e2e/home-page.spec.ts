import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * S4.6a: the Home page. Covers structure (one h1, the hero embed, every
 * showcase section, real links) plus an axe pass at the three required
 * widths, in both themes.
 */

async function setTheme(page: Page, theme: 'light' | 'dark') {
  await page.addInitScript((t) => {
    window.localStorage.setItem('theme', t);
  }, theme);
}

async function runAxe(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const seriousOrCritical = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  if (seriousOrCritical.length > 0) {
    console.log(JSON.stringify(seriousOrCritical, null, 2));
  }
  expect(seriousOrCritical).toEqual([]);
}

test.describe('Home', () => {
  test('has exactly one h1, the headline', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Step inside');
  });

  test('has main and contentinfo landmarks', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('contentinfo')).toBeVisible();
  });

  test('the hero embeds the live url-shortener board', async ({ page }) => {
    await page.goto('/');
    const hero = page.locator('[data-player-variant="hero"]');
    await expect(hero).toBeVisible();
    await expect(hero.locator('svg[aria-label]').first()).toBeVisible();
  });

  test('every showcase section renders with its heading', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /watch it fail/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /relive the outages/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /every step, explained/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /every meltdown will be a link/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /pick a system/i })).toBeVisible();
  });

  test('coming-soon sections show a pill, not a fake link', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Coming soon').first()).toBeVisible();
  });

  test('primary CTAs go to real routes', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /start breaking things/i }).first()).toHaveAttribute(
      'href',
      '/solutions/url-shortener',
    );
    await expect(page.getByRole('link', { name: /explore all systems/i }).first()).toHaveAttribute('href', '/problems');
  });

  test('the walkthrough section lists real story titles from the catalog', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Write Path (URL Creation)')).toBeVisible();
  });

  for (const viewport of [
    { name: '1440', width: 1440, height: 900 },
    { name: '834', width: 834, height: 1194 },
    { name: '390', width: 390, height: 844 },
  ]) {
    for (const theme of ['light', 'dark'] as const) {
      test(`no serious/critical axe violations at ${viewport.name} (${theme})`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await setTheme(page, theme);
        await page.goto('/');
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await runAxe(page);
      });
    }
  }
});
