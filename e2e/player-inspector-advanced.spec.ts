import { test, expect, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * T3.7: the inspector's live sections — a tradeoff toggle that flips a live
 * switch, a sizing calculator whose result is applied to the running
 * simulation, per-node live sparklines, and a card linking to another
 * diagram — against the real production runtime.
 */

const READY_TIMEOUT = 20000;

async function setTheme(page: Page, theme: 'light' | 'dark') {
  await page.addInitScript((t) => {
    window.localStorage.setItem('theme', t);
  }, theme);
}

async function waitForReady(page: Page, id = 'url-shortener') {
  await page.goto(`/solutions/${id}`);
  await expect(page.locator('[data-player-root]')).toHaveAttribute('data-sim-status', 'ready', { timeout: READY_TIMEOUT });
}

/** Selects a node and opens one of its detail tabs; returns the visible inspector body (desktop aside or phone sheet). */
async function openPane(page: Page, nodeId: string, tab: string): Promise<Locator> {
  const node = page.locator(`[data-node-id="${nodeId}"]`);
  await node.waitFor({ state: 'visible' });
  await node.click();
  const body = page.locator('[data-inspector-body-slot]:visible');
  await expect(body).toBeVisible();
  await body.getByRole('tab', { name: tab }).click();
  return body;
}

/** The top strip's HUD tile with this label (the phone sheet carries a second copy). */
function hudTile(page: Page, label: string): Locator {
  return page.locator('.player-canvas-area .hud-tile').filter({ hasText: label });
}

/** A compact tile's current value text (the mono number, without the unit). */
async function tileValue(tile: Locator): Promise<string> {
  return (await tile.locator('.font-mono.tabular-nums').first().textContent())?.trim() ?? '';
}

test.describe('inspector live sections', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('toggling a tradeoff flips the live switch and the HUD reacts', async ({ page }) => {
    await waitForReady(page);
    const body = await openPane(page, 'db-nosql', 'Operations');
    const trade = body.locator('[data-inspector-trade="write-consistency"]');
    await expect(trade).toBeVisible();
    const quorum = trade.getByRole('radio', { name: 'LOCAL_QUORUM' });
    const one = trade.getByRole('radio', { name: 'ONE' });
    await expect(quorum).toHaveAttribute('aria-checked', 'true');

    const p99 = hudTile(page, 'p99 latency');
    await expect.poll(() => tileValue(p99), { timeout: READY_TIMEOUT }).not.toBe('—');
    const before = await tileValue(p99);

    await one.click();
    await expect(one).toHaveAttribute('aria-checked', 'true');
    await expect(trade).toContainText('Fastest reads and writes');
    await expect(trade.locator('[data-trade-dot="one"][data-active="true"]').first()).toBeAttached();

    // Reads answered by one replica instead of two: p99 falls.
    await expect.poll(async () => Number(await tileValue(p99)), { timeout: 15000 }).toBeLessThan(Number(before));

    // Revertible: back to the default through the same path.
    await trade.getByRole('button', { name: 'Back to LOCAL_QUORUM' }).click();
    await expect(quorum).toHaveAttribute('aria-checked', 'true');
    await expect(trade.getByRole('button', { name: 'Back to LOCAL_QUORUM' })).toHaveCount(0);
  });

  test('applying a calculator changes the sim: more replicas, lower utilization', async ({ page }) => {
    await waitForReady(page);
    const body = await openPane(page, 'api-service', 'Operations');
    const calc = body.locator('[data-inspector-calc="c1"]');
    await expect(calc).toBeVisible();

    // The worker answers the preview: 4,000 req/s × 20 ms → 80 cores → 10 pods.
    const outputs = calc.locator('[data-calc-outputs]');
    await expect(outputs).toContainText('80', { timeout: READY_TIMEOUT });
    await expect(outputs).toContainText('10');
    await expect(calc).toContainText('Preview only until you apply it.');

    const spark = body.locator('[data-inspector-spark="api-service"]');
    const util = spark.locator('[data-variant="compact"]').filter({ hasText: 'utilization' });
    const replicas = spark.locator('[data-variant="compact"]').filter({ hasText: 'replicas' });
    await expect.poll(() => tileValue(replicas), { timeout: READY_TIMEOUT }).toBe('6');
    const utilBefore = Number(await tileValue(util));
    const cost = hudTile(page, 'cost');
    const costBefore = await tileValue(cost);

    await calc.getByRole('button', { name: 'Apply to simulation' }).click();
    await expect(calc.getByRole('button', { name: 'Applied' })).toBeDisabled();
    await expect.poll(() => tileValue(replicas), { timeout: 10000 }).toBe('10');
    await expect.poll(async () => Number(await tileValue(util)), { timeout: 10000 }).toBeLessThan(utilBefore);
    await expect.poll(() => tileValue(cost), { timeout: 10000 }).not.toBe(costBefore);

    // Moving a slider makes it a preview again.
    const thumb = calc.getByRole('slider').first();
    await thumb.focus();
    await page.keyboard.press('ArrowRight');
    await expect(calc.getByRole('button', { name: 'Apply to simulation' })).toBeEnabled();
  });

  test("a node's live sparklines draw at least two points within 3 s", async ({ page }) => {
    await waitForReady(page);
    const body = await openPane(page, 'api-service', 'Operations');
    const spark = body.locator('[data-inspector-spark="api-service"]');
    await expect(spark.locator('[data-variant="compact"]')).toHaveCount(3);
    await page.waitForTimeout(3000);
    const d = (await spark.locator('svg[role="img"] path[fill="none"]').first().getAttribute('d')) ?? '';
    expect((d.match(/[ML]/g) ?? []).length).toBeGreaterThanOrEqual(2);

    // The accessible alternative: one table, a row per second.
    await spark.getByText('View as table').click();
    const table = spark.locator('table');
    await expect(table.locator('th').first()).toHaveText('t');
    expect(await table.locator('tbody tr').count()).toBeGreaterThanOrEqual(2);
  });

  test('an embed card opens the diagram it links to', async ({ page }) => {
    await waitForReady(page, 'netflix');
    const body = await openPane(page, 'client-mobile', 'Architecture');
    const card = body.locator('[data-inspector-embed="ready"]');
    await expect(card).toContainText('URL Shortener');
    await expect(card.locator('[data-mini-board]')).toBeVisible();
    await card.getByRole('link', { name: /^Open / }).click();
    await expect(page).toHaveURL(/\/solutions\/url-shortener$/);
    await expect(page.locator('[data-node-id="api-service"]')).toBeVisible();
  });

  test('an embed whose diagram is not published yet is a disabled Coming soon card', async ({ page }) => {
    await waitForReady(page);
    const body = await openPane(page, 'cache-redis', 'Architecture');
    const card = body.locator('[data-inspector-embed="soon"]');
    await expect(card).toContainText('Coming soon');
    await expect(card.getByRole('link')).toHaveCount(0);
    await expect(card.getByRole('button', { name: 'Open' })).toBeDisabled();
  });
});

const SECTIONS = [
  { name: 'tradeoff toggle', diagram: 'url-shortener', node: 'db-nosql', tab: 'Operations', marker: '[data-inspector-trade="write-consistency"]' },
  { name: 'calculator and sparklines', diagram: 'url-shortener', node: 'api-service', tab: 'Operations', marker: '[data-inspector-calc]' },
  { name: 'embed (coming soon)', diagram: 'url-shortener', node: 'cache-redis', tab: 'Architecture', marker: '[data-inspector-embed]' },
  { name: 'embed (ready)', diagram: 'netflix', node: 'client-mobile', tab: 'Architecture', marker: '[data-inspector-embed]' },
] as const;

for (const theme of ['light', 'dark'] as const) {
  for (const section of SECTIONS) {
    test(`no axe violations with the ${section.name} open, ${theme}, at 1440/834/390`, async ({ page }) => {
      await setTheme(page, theme);
      for (const viewport of [
        { width: 1440, height: 900 },
        { width: 834, height: 1112 },
        { width: 390, height: 844 },
      ]) {
        await page.setViewportSize(viewport);
        await waitForReady(page, section.diagram);
        const body = await openPane(page, section.node, section.tab);
        await expect(body.locator(section.marker).first()).toBeVisible();
        // Tables open too, so their markup is checked as well.
        const disclosures = body.locator('summary:visible');
        for (let i = 0; i < (await disclosures.count()); i++) await disclosures.nth(i).click();
        await page.waitForTimeout(1500);
        const results = await new AxeBuilder({ page }).analyze();
        if (results.violations.length > 0) console.log(section.name, theme, viewport.width, JSON.stringify(results.violations, null, 2));
        expect(results.violations).toEqual([]);
      }
    });
  }
}

test.describe('inspector live sections — visual', () => {
  test.use({ reducedMotion: 'reduce' });

  for (const theme of ['light', 'dark'] as const) {
    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 390, height: 844 },
    ]) {
      test(`${viewport.width} ${theme}`, async ({ page }) => {
        await setTheme(page, theme);
        await page.setViewportSize(viewport);
        for (const section of SECTIONS) {
          await waitForReady(page, section.diagram);
          const body = await openPane(page, section.node, section.tab);
          const marker = body.locator(section.marker).first();
          await marker.scrollIntoViewIfNeeded();
          await page.waitForTimeout(3500);
          await page.screenshot({
            path: `${process.env.SCREENSHOT_DIR || '/tmp'}/T3.7/${viewport.width}-${theme}-${section.node}.png`,
          });
        }
      });
    }
  }
});
