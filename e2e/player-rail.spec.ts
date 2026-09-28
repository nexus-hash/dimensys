import { test, expect, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * The player's left rail on /solutions/url-shortener: the problem header,
 * the first-visit "How it works" card, the request paths (hover or focus
 * traces one on the board), the design-wide estimate calculator, and the
 * section headings' letter spacing.
 */

const DIAGRAM = 'url-shortener';
const READY_TIMEOUT = 20000;
const rail = (page: Page) => page.locator('.player-rail');
const root = (page: Page) => page.locator('[data-player-root]');

async function open(page: Page) {
  await page.goto(`/solutions/${DIAGRAM}`);
  await expect(root(page)).toHaveAttribute('data-sim-status', 'ready', { timeout: READY_TIMEOUT });
}

async function setTheme(page: Page, theme: 'light' | 'dark') {
  await page.addInitScript((t) => window.localStorage.setItem('theme', t), theme);
}

/** Dimmed / lit counts of the main board's nodes and links. */
async function traceCounts(page: Page) {
  return page.evaluate(() => {
    const svg = document.querySelector('[data-board-level] svg')!;
    const count = (sel: string) => svg.querySelectorAll(sel).length;
    return {
      nodes: count('[data-node-id]'),
      dimNodes: count('[data-node-id].is-dimmed'),
      links: count('[data-link-id]'),
      dimLinks: count('[data-link-id].is-dimmed'),
      inked: count('[data-link-id] .cv-link.is-hl'),
    };
  });
}

function hudTile(page: Page, label: string): Locator {
  return page.locator('.player-canvas-area .hud-tile').filter({ hasText: label });
}

async function tileValue(tile: Locator): Promise<string> {
  return (await tile.locator('.font-mono.tabular-nums').first().textContent())?.trim() ?? '';
}

test.describe('left rail', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('the problem header shows the title and level, difficulty and time pills', async ({ page }) => {
    await open(page);
    const header = rail(page).locator('[data-rail-problem]');
    await expect(header).toContainText('URL Shortener');
    const pills = header.getByRole('list', { name: 'About this problem' }).getByRole('listitem');
    await expect(pills).toHaveCount(3);
    await expect(pills.nth(0)).toHaveText('Level: hld');
    await expect(pills.nth(1)).toHaveText('Difficulty: medium●●○');
    await expect(pills.nth(2)).toHaveText('Estimated time: 25 min');
    // The requirement badges follow the header in the same section.
    await expect(rail(page).locator('[data-rail-slot="problem"] .hud-req-badges')).toBeVisible();
  });

  test('"How it works" shows once, stays dismissed across a reload', async ({ page }) => {
    await open(page);
    const card = rail(page).getByRole('note', { name: 'How it works' });
    await expect(card).toBeVisible();
    await expect(card).toContainText('New here?');
    await card.getByRole('button', { name: 'Dismiss How it works' }).click();
    await expect(card).toHaveCount(0);
    await page.reload();
    await expect(root(page)).toHaveAttribute('data-sim-status', 'ready', { timeout: READY_TIMEOUT });
    await expect(rail(page).getByRole('note', { name: 'How it works' })).toHaveCount(0);
  });

  test('"Start the tour" enters the first walkthrough', async ({ page }) => {
    await open(page);
    await rail(page).getByRole('button', { name: 'Start the tour' }).click();
    await expect(page.locator('.player-shell')).toHaveAttribute('data-player-mode', 'walkthrough');
    await expect(page).toHaveURL(/[?&]v=write-path/);
    await expect(page.locator('.player-canvas-area [data-walkthrough-narration]')).toHaveAttribute('data-step', '1');
    await expect(rail(page).getByRole('note', { name: 'How it works' })).toHaveCount(0);
  });

  test('hovering or focusing a request path traces it on the board', async ({ page }) => {
    await open(page);
    const section = rail(page).getByRole('region', { name: 'Request paths' });
    await expect(section.getByRole('heading')).toContainText('hover to trace');
    const redirect = section.locator('[data-lane="redirect"]');
    const create = section.locator('[data-lane="create"]');
    await expect(redirect).toContainText('client → LB → API → Redis → (miss) Cassandra');
    await expect(create).toContainText('client → LB → API → KGS → Cassandra');
    // Live rate and p99 from the running simulation.
    await expect(redirect.locator('[data-lane-stat]')).toHaveText(/\/s · p99 \d/, { timeout: READY_TIMEOUT });

    const base = await traceCounts(page);
    expect(base.dimNodes).toBe(0);
    expect(base.nodes).toBe(10);

    // Redirect: both clients, LB, API, Redis, Cassandra, Kafka, analytics lit; the key service's two nodes dim.
    await redirect.hover();
    await expect.poll(() => traceCounts(page)).toMatchObject({ dimNodes: 2, dimLinks: base.links - 7, inked: 7 });
    await expect(page.locator('[data-node-id="kgs-worker"]')).toHaveClass(/is-dimmed/);
    await expect(page.locator('[data-node-id="cache-redis"]')).not.toHaveClass(/is-dimmed/);

    // Away: everything back.
    await page.mouse.move(700, 880);
    await expect.poll(() => traceCounts(page)).toMatchObject({ dimNodes: 0, dimLinks: 0, inked: 0 });

    // Keyboard focus traces too: create lights 6 nodes and 5 links.
    await create.focus();
    await expect.poll(() => traceCounts(page)).toMatchObject({ dimNodes: 4, dimLinks: base.links - 5, inked: 5 });
    await expect(page.locator('[data-node-id="cache-redis"]')).toHaveClass(/is-dimmed/);
    await expect(page.locator('[data-node-id="kgs-worker"]')).not.toHaveClass(/is-dimmed/);
    await create.blur();
    await expect.poll(() => traceCounts(page)).toMatchObject({ dimNodes: 0, dimLinks: 0 });
  });

  test('tracing stands down while a walkthrough owns the board', async ({ page }) => {
    await open(page);
    await rail(page).getByRole('button', { name: 'Start the tour' }).click();
    await expect(page.locator('.player-shell')).toHaveAttribute('data-player-mode', 'walkthrough');
    await page.waitForTimeout(400);
    const during = await traceCounts(page);
    await rail(page).locator('[data-lane="redirect"]').hover();
    await page.waitForTimeout(300);
    expect(await traceCounts(page)).toEqual(during);
  });

  test('the estimates calculator previews and applies to the simulation', async ({ page }) => {
    await open(page);
    const calc = rail(page).locator('[data-rail-estimate="c0"]');
    await calc.scrollIntoViewIfNeeded();
    await expect(calc).toContainText('New URLs / month');
    const outputs = calc.locator('[data-calc-outputs]');
    const reads = outputs.locator('[data-calc-output="readRps"] dd');
    await expect(reads).not.toHaveText('—', { timeout: READY_TIMEOUT });
    const readsBefore = await reads.textContent();
    await expect(calc).toContainText('Preview only until you apply it.');

    const throughput = hudTile(page, 'throughput');
    await expect.poll(() => tileValue(throughput), { timeout: READY_TIMEOUT }).not.toBe('—');
    const before = await tileValue(throughput);

    // More new links a month: the preview answers, nothing applied yet.
    const slider = calc.getByRole('slider').first();
    await slider.focus();
    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
    await expect(reads).not.toHaveText(readsBefore ?? '', { timeout: 10000 });
    expect(await tileValue(throughput)).toBe(before);

    await calc.getByRole('button', { name: 'Apply to simulation' }).click();
    await expect(calc.getByRole('button', { name: 'Applied' })).toBeDisabled();
    await expect.poll(() => tileValue(throughput), { timeout: 10000 }).not.toBe(before);
  });

  test('section headings render with even letter spacing, no stray gaps', async ({ page }) => {
    await open(page);
    const result = await page.evaluate(() => {
      const out: Array<{ text: string; gaps: number[] }> = [];
      for (const h of document.querySelectorAll<HTMLElement>('.player-rail h2 > span:first-child')) {
        const t = h.firstChild as Text;
        const range = document.createRange();
        const lefts: number[] = [];
        for (let i = 0; i < t.length; i++) {
          range.setStart(t, i);
          range.setEnd(t, i + 1);
          lefts.push(range.getBoundingClientRect().left);
        }
        const gaps = lefts.slice(1).map((x, i) => Math.round((x - lefts[i]) * 100) / 100);
        out.push({ text: getComputedStyle(h).textTransform === 'uppercase' ? t.data.toUpperCase() : t.data, gaps });
      }
      return out;
    });
    expect(result.map((r) => r.text)).toEqual(expect.arrayContaining(['WALKTHROUGHS', 'ESTIMATES', 'REQUEST PATHS', 'PROBLEM', 'SCENARIOS']));
    for (const { text, gaps } of result) {
      // Every glyph advances by the same amount (±0.5px): no hole after any letter.
      const spread = Math.max(...gaps) - Math.min(...gaps);
      expect(spread, `${text}: ${gaps.join(',')}`).toBeLessThanOrEqual(0.5);
    }
  });
});

for (const theme of ['light', 'dark'] as const) {
  test(`no axe violations with the rail content, ${theme}, at 1440/834/390`, async ({ page }) => {
    await setTheme(page, theme);
    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 834, height: 1112 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await open(page);
      if (viewport.width === 834) {
        await page.getByRole('button', { name: 'Toggle left rail' }).click();
        await page.waitForTimeout(400);
      }
      if (viewport.width !== 390) {
        await expect(rail(page).getByRole('note', { name: 'How it works' })).toBeVisible();
        await rail(page).locator('[data-lane="redirect"]').hover();
        await expect(rail(page).locator('[data-rail-estimate="c0"] [data-calc-outputs]')).not.toContainText('—', { timeout: READY_TIMEOUT });
      }
      await page.waitForTimeout(800);
      const results = await new AxeBuilder({ page }).analyze();
      if (results.violations.length > 0) console.log('rail', theme, viewport.width, JSON.stringify(results.violations, null, 2));
      expect(results.violations).toEqual([]);
    }
  });
}

test.describe('left rail — visual', () => {
  test.use({ reducedMotion: 'reduce' });
  for (const theme of ['light', 'dark'] as const) {
    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 834, height: 1112 },
    ]) {
      test(`${viewport.width} ${theme}`, async ({ page }) => {
        await setTheme(page, theme);
        await page.setViewportSize(viewport);
        await open(page);
        if (viewport.width === 834) {
          await page.getByRole('button', { name: 'Toggle left rail' }).click();
          await page.waitForTimeout(400);
        }
        await rail(page).locator('[data-lane="redirect"]').hover();
        await page.waitForTimeout(2500);
        const dir = `${process.env.SCREENSHOT_DIR || '/tmp'}/RAIL`;
        await page.screenshot({ path: `${dir}/${viewport.width}-${theme}-top.png` });
        await rail(page).locator('[data-rail-estimate="c0"]').scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        await page.screenshot({ path: `${dir}/${viewport.width}-${theme}-estimates.png` });
      });
    }
  }
});
