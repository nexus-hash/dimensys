import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * T3.4: subsystem drill-down on `/dev/player`'s real synced url-shortener
 * document, which has one subsystem ("Key Generation Service", KGS) whose
 * `folded: false` means the ambient canvas already shows it as an expanded
 * inline frame (T3.2) — so the entry point here is that frame's tab, not the
 * collapsed affordance (a folded subsystem, exercised instead by the
 * component tests). Scoped to that one diagram's section so pre-existing
 * issues elsewhere on the dev page don't leak into these assertions.
 */
const SECTION = 'section[aria-label="URL Shortener System Design"]';
const KGS_TAB_NAME = /Enter Key Generation Service/;

async function setTheme(page: Page, theme: 'light' | 'dark') {
  await page.addInitScript((t) => {
    window.localStorage.setItem('theme', t);
  }, theme);
}

async function gotoPlayer(page: Page) {
  await page.goto('/dev/player');
  await expect(page.getByRole('heading', { name: 'url-shortener (synced)' })).toBeVisible();
}

async function runAxe(page: Page, include: string) {
  const results = await new AxeBuilder({ page }).include(include).analyze();
  const seriousOrCritical = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  if (seriousOrCritical.length > 0) {
    console.log(JSON.stringify(seriousOrCritical, null, 2));
  }
  expect(seriousOrCritical).toEqual([]);
}

test.describe('player subsystem drill-down (T3.4)', () => {
  test('enters Key Generation Service by clicking the expanded frame tab, and breadcrumbs appear', async ({ page }) => {
    await gotoPlayer(page);
    const section = page.locator(SECTION);

    await expect(section.getByRole('navigation', { name: 'Subsystem breadcrumbs' })).toHaveCount(0);
    await section.getByRole('button', { name: KGS_TAB_NAME }).click();

    const breadcrumbs = section.getByRole('navigation', { name: 'Subsystem breadcrumbs' });
    await expect(breadcrumbs).toBeVisible();
    await expect(breadcrumbs.getByText('Key Generation Service', { exact: false })).toBeVisible();

    // Its own board/camera: the dedicated level's board is visible with its own nodes.
    const kgsLevel = section.locator('[data-drill-key="kgs-service"]');
    await expect(kgsLevel).toBeVisible();
    await expect(kgsLevel.locator('[data-node-id="kgs-worker"]')).toBeVisible();
  });

  test('enters Key Generation Service by keyboard (Enter), and Escape exits back to the top level', async ({ page }) => {
    await gotoPlayer(page);
    const section = page.locator(SECTION);
    const tab = section.getByRole('button', { name: KGS_TAB_NAME });

    await tab.focus();
    await page.keyboard.press('Enter');
    await expect(section.getByRole('navigation', { name: 'Subsystem breadcrumbs' })).toBeVisible();
    await expect(section.locator('[data-drill-key="kgs-service"]')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(section.getByRole('navigation', { name: 'Subsystem breadcrumbs' })).toHaveCount(0);
    await expect(tab).toBeFocused();
  });

  test('enters by keyboard (Space) too', async ({ page }) => {
    await gotoPlayer(page);
    const section = page.locator(SECTION);
    const tab = section.getByRole('button', { name: KGS_TAB_NAME });

    await tab.focus();
    await page.keyboard.press(' ');
    await expect(section.getByRole('navigation', { name: 'Subsystem breadcrumbs' })).toBeVisible();
  });

  test('a breadcrumb click jumps back to the top level', async ({ page }) => {
    await gotoPlayer(page);
    const section = page.locator(SECTION);

    await section.getByRole('button', { name: KGS_TAB_NAME }).click();
    const breadcrumbs = section.getByRole('navigation', { name: 'Subsystem breadcrumbs' });
    await expect(breadcrumbs).toBeVisible();

    await breadcrumbs.getByRole('button', { name: 'URL Shortener System Design' }).click();
    await expect(breadcrumbs).toHaveCount(0);
    await expect(section.locator('[data-drill-key="kgs-service"]')).toBeHidden();
  });

  test('works the same with reduced motion requested', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await gotoPlayer(page);
    const section = page.locator(SECTION);
    const tab = section.getByRole('button', { name: KGS_TAB_NAME });

    await tab.click();
    await expect(section.getByRole('navigation', { name: 'Subsystem breadcrumbs' })).toBeVisible();
    await expect(section.locator('[data-drill-key="kgs-service"]')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(section.getByRole('navigation', { name: 'Subsystem breadcrumbs' })).toHaveCount(0);
    await expect(tab).toBeFocused();
  });

  test('no serious/critical axe violations at the top level', async ({ page }) => {
    await gotoPlayer(page);
    await runAxe(page, SECTION);
  });

  test('no serious/critical axe violations inside the Key Generation Service level', async ({ page }) => {
    await gotoPlayer(page);
    const section = page.locator(SECTION);
    await section.getByRole('button', { name: KGS_TAB_NAME }).click();
    await expect(section.locator('[data-drill-key="kgs-service"]')).toBeVisible();
    await runAxe(page, SECTION);
  });
});

/**
 * Reference screenshots for the T3.4 report — plain captures (not
 * `toHaveScreenshot` baselines, which belong to the DS gallery's own
 * snapshot suite). Written under the scratchpad, never under `e2e/`.
 */
const SCREENSHOT_DIR = process.env.T3_4_SCREENSHOT_DIR;

test.describe('player subsystem drill-down — reference screenshots', () => {
  test.skip(!SCREENSHOT_DIR, 'T3_4_SCREENSHOT_DIR not set');

  for (const theme of ['light', 'dark'] as const) {
    test(`captures the top level and inside KGS (${theme})`, async ({ page }) => {
      await setTheme(page, theme);
      await gotoPlayer(page);
      const section = page.locator(SECTION);
      await section.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${SCREENSHOT_DIR}/${theme}-top-level.png`, fullPage: false, clip: await section.boundingBox() ?? undefined });

      await section.getByRole('button', { name: KGS_TAB_NAME }).click();
      await expect(section.locator('[data-drill-key="kgs-service"]')).toBeVisible();
      // Wait for the leave transition to fully settle (the root level to
      // actually hide) rather than screenshotting mid-crossfade.
      await expect(section.locator('[data-drill-key=""]')).toBeHidden();
      await page.screenshot({ path: `${SCREENSHOT_DIR}/${theme}-inside-kgs.png`, fullPage: false, clip: await section.boundingBox() ?? undefined });
    });
  }
});
