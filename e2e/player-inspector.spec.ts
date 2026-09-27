import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * T3.6: the inspector body — tabs per pane, section content for a selected
 * node, endpoint/protocol fallback for a selected link, and the same body
 * inside the phone sheet's "Inspect" tab. Against `/solutions/url-shortener`
 * (real production routes — the sections are prerendered server-side, so
 * this also proves nothing about that requires client JS beyond the tab
 * switch itself).
 */

async function setTheme(page: Page, theme: 'light' | 'dark') {
  await page.addInitScript((t) => {
    window.localStorage.setItem('theme', t);
  }, theme);
}

async function settle(page: Page) {
  await page.waitForTimeout(1500);
}

/**
 * Links render as a thin (1.5px, `fill: none`) stroke plus a separate fat
 * invisible `.cv-link-hit` path just for pointer hit-testing (`globals.css`)
 * — real hardware clicking anywhere on the visible line works fine, but a
 * synthetic click at the *bounding box center* Playwright computes for
 * `[data-link-id]` (an orthogonal, multi-segment route) routinely lands on
 * empty space between segments, which the underlying blueprint `<svg>`
 * "intercepts" instead. `InteractiveLayer`'s click handler only needs the
 * event's `target` to be inside `[data-link-id]` (see its `onClick`), so
 * dispatching the DOM event directly sidesteps the real-pixel hit-testing
 * entirely rather than hunting for a point guaranteed to sit on the stroke.
 */
async function selectLink(page: Page) {
  const link = page.locator('[data-link-id]:visible').first();
  await link.waitFor({ state: 'visible' });
  await link.dispatchEvent('click');
  return link;
}

test.describe('player inspector body', () => {
  // Explicit desktop viewport regardless of project: the "Mobile Chrome"
  // project runs at a phone-sized viewport by default, where the desktop/
  // tablet `<aside aria-label="Inspector">` is CSS-hidden entirely (T3.16 —
  // selection instead surfaces in the phone sheet's own "Inspect" tab,
  // covered separately below).
  test.use({ viewport: { width: 1440, height: 900 } });

  test('selecting a node shows tabs and pane content, switchable with the keyboard', async ({ page }) => {
    await page.goto('/solutions/url-shortener');
    const node = page.locator('[data-node-id="api-service"]');
    await node.waitFor({ state: 'visible' });
    await node.click();

    const inspector = page.getByRole('complementary', { name: 'Inspector' });
    await expect(inspector).toBeVisible();
    await expect(inspector.getByRole('heading', { level: 2 })).toBeVisible();

    const tabs = inspector.getByRole('tab');
    await expect(tabs.first()).toBeVisible();
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThan(1);

    // First pane (first-appearance order) starts active with real content
    // below it, not an empty panel.
    const firstTab = tabs.first();
    await expect(firstTab).toHaveAttribute('aria-selected', 'true');
    const panel = inspector.getByRole('tabpanel');
    await expect(panel).not.toBeEmpty();

    // Keyboard: arrow-right moves to the next tab and its content shows.
    await firstTab.focus();
    await page.keyboard.press('ArrowRight');
    const secondTab = tabs.nth(1);
    await expect(secondTab).toHaveAttribute('aria-selected', 'true');
    await expect(inspector.getByRole('tabpanel')).not.toBeEmpty();

    // Esc closes the inspector entirely (T3.16 behaviour, still true with a body inside it).
    await page.keyboard.press('Escape');
    await expect(inspector).not.toBeVisible();
  });

  test('selecting a link shows its endpoints, protocol and label', async ({ page }) => {
    await page.goto('/solutions/url-shortener');
    await selectLink(page);

    const inspector = page.getByRole('complementary', { name: 'Inspector' });
    await expect(inspector).toBeVisible();
    await expect(inspector).toContainText('From');
    await expect(inspector).toContainText('To');
    await expect(inspector).toContainText('Protocol');
  });

  test('no axe violations with a node selected, at 1440/834/390', async ({ page }) => {
    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 834, height: 1112 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto('/solutions/url-shortener');
      const node = page.locator('[data-node-id="api-service"]');
      await node.waitFor({ state: 'visible' });
      await node.click();
      await settle(page);
      const results = await new AxeBuilder({ page }).analyze();
      if (results.violations.length > 0) console.log(viewport.width, JSON.stringify(results.violations, null, 2));
      expect(results.violations).toEqual([]);
    }
  });
});

test.describe('phone sheet — Inspect tab', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('shows the same inspector body as the desktop aside', async ({ page }) => {
    await page.goto('/solutions/url-shortener');
    const node = page.locator('[data-node-id="api-service"]');
    await node.waitFor({ state: 'visible' });
    await node.click();

    // Selecting a node on phone flips the sheet to its "Inspect" tab.
    const inspectTab = page.getByRole('tab', { name: 'Inspect' });
    await expect(inspectTab).toHaveAttribute('aria-selected', 'true');

    // The header (h2 title) and the detail tabs render inside the sheet's Inspect panel — the
    // same `InspectorHeader`/tabbed body `Inspector` uses on desktop/tablet. Scoped to the Inspect
    // tabpanel specifically: the sheet itself also carries a visually-hidden Radix dialog title
    // (`showTitleBar={false}` — see `PhoneSheet.tsx`'s doc comment), which is a second, off-screen
    // `<h2>` with the same text but isn't the one this test is about.
    const inspectPanel = page.getByRole('tabpanel', { name: 'Inspect' });
    await expect(inspectPanel.getByRole('heading', { level: 2 })).toBeVisible();
    // Tab count here is the sheet's own "Metrics"/"Inspect" pair plus the inspector body's own pane
    // tabs (api-service has more than one pane), so it must be more than 2, not just more than 1.
    expect(await page.getByRole('tab').count()).toBeGreaterThan(2);
  });
});

test.describe('inspector — visual', () => {
  test.use({ reducedMotion: 'reduce' });

  test('1440 dark, api-service selected, each tab', async ({ page }) => {
    await setTheme(page, 'dark');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/solutions/url-shortener');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    const node = page.locator('[data-node-id="api-service"]');
    await node.waitFor({ state: 'visible' });
    await node.click();
    await settle(page);

    const tabs = page.getByRole('complementary', { name: 'Inspector' }).getByRole('tab');
    const count = await tabs.count();
    for (let i = 0; i < count; i++) {
      await tabs.nth(i).click();
      await settle(page);
      await page.screenshot({
        path: `${process.env.SCREENSHOT_DIR || '/tmp'}/T3.6/1440-dark-api-service-tab-${i}.png`,
      });
    }
  });

  test('1440 light, a link selected', async ({ page }) => {
    await setTheme(page, 'light');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/solutions/url-shortener');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    await selectLink(page);
    await settle(page);
    await page.screenshot({ path: `${process.env.SCREENSHOT_DIR || '/tmp'}/T3.6/1440-light-link.png` });
  });

  test('390 dark, sheet at 50%, Inspect tab', async ({ page }) => {
    await setTheme(page, 'dark');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/solutions/url-shortener');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    const node = page.locator('[data-node-id="api-service"]');
    await node.waitFor({ state: 'visible' });
    await node.click();
    await settle(page);
    await page.screenshot({ path: `${process.env.SCREENSHOT_DIR || '/tmp'}/T3.6/390-dark-sheet-50.png` });
  });
});
