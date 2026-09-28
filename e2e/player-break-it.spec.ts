import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Break it mode against the real production runtime: every tool on both
 * simulated diagrams, a fix that brings the requirement badges back (and
 * its undo), reset, a keyboard-only pass, the phone chips, the home hero's
 * two buttons, and axe at three widths in both themes.
 */

const READY_TIMEOUT = 30000;
const EFFECT_TIMEOUT = 25000;

async function openBreak(page: Page, id: string) {
  await page.goto(`/solutions/${id}`);
  await expect(page.locator('[data-player-root]')).toHaveAttribute('data-sim-status', 'ready', { timeout: READY_TIMEOUT });
  await page.locator('body').press('2');
  await expect(page.locator('[data-player-root]')).toHaveAttribute('data-player-mode', 'break');
}

/** Faster sim clock (4×) so recoveries land within the test budget. */
async function fastForward(page: Page) {
  await page.locator('body').press(']');
  await page.locator('body').press(']');
}

const toolbox = (page: Page) => page.locator('.break-toolbox');
const tool = (page: Page, label: string) => toolbox(page).getByRole('button', { name: new RegExp(`^${label}`) });
const node = (page: Page, id: string) => page.locator(`[data-node-id="${id}"]`);

/** The HUD's first tile (p99 latency), read from its table alternative. */
async function p99(page: Page): Promise<number> {
  const cell = page.locator('.player-canvas-area .player-hud-slot table tbody tr').first().locator('td').first();
  const text = (await cell.textContent()) ?? '';
  const m = text.replace(/,/g, '').match(/([\d.]+)\s*(k)?/);
  if (!m) return NaN;
  return Number(m[1]) * (m[2] ? 1000 : 1);
}

function badge(page: Page, text: RegExp) {
  return page.locator('.player-rail .hud-req-badges > *').filter({ hasText: text }).locator('[role="img"]');
}

async function pickTargetFromList(page: Page, toolLabel: string, optionName: RegExp) {
  await page.getByRole('combobox', { name: `${toolLabel} target` }).click();
  await page.getByRole('option', { name: optionName }).click();
}

async function reset(page: Page) {
  await toolbox(page).getByRole('button', { name: /^Reset/ }).click();
  await expect(page.locator('.player-canvas-area .break-try')).toBeVisible({ timeout: EFFECT_TIMEOUT });
}

type Check = (page: Page) => Promise<void>;
interface ToolCase {
  label: string;
  apply: (page: Page) => Promise<void>;
  check: Check;
}

const expectHealth = (id: string, re: RegExp): Check => async (page) => {
  await expect(node(page, id)).toHaveClass(re, { timeout: EFFECT_TIMEOUT });
};
const expectP99Above = (ms: number): Check => async (page) => {
  await expect.poll(() => p99(page), { timeout: EFFECT_TIMEOUT }).toBeGreaterThan(ms);
};
const expectCut = (linkId: string): Check => async (page) => {
  await expect(page.locator(`[data-link-id="${linkId}"] path.cv-link`)).toHaveClass(/is-cut/, { timeout: EFFECT_TIMEOUT });
};
const both = (...checks: Check[]): Check => async (page) => {
  for (const c of checks) await c(page);
};

function onNode(label: string, id: string) {
  return async (page: Page) => {
    await tool(page, label).click();
    await node(page, id).click();
  };
}
function onLink(label: string, name: RegExp) {
  return async (page: Page) => {
    await tool(page, label).click();
    await pickTargetFromList(page, label, name);
  };
}
async function spike(page: Page) {
  await tool(page, 'Spike').click();
  await page.getByRole('button', { name: /^Apply \d+×$/ }).click();
}

const CASES: Record<string, ToolCase[]> = {
  'url-shortener': [
    { label: 'kill', apply: onNode('Kill', 'cache-redis'), check: both(expectHealth('cache-redis', /cv-health-down/), expectHealth('db-nosql', /cv-health-critical/)) },
    { label: 'spike', apply: spike, check: both(expectHealth('api-service', /cv-health-critical/), expectP99Above(200)) },
    { label: 'partition', apply: onLink('Partition', /API Service → Redis Cache/), check: both(expectCut('l-api-cache'), expectHealth('db-nosql', /cv-health-critical/)) },
    { label: 'slow', apply: onNode('Slow', 'api-service'), check: expectP99Above(100) },
    { label: 'flush', apply: onNode('Flush', 'cache-redis'), check: expectHealth('db-nosql', /cv-health-critical/) },
  ],
  netflix: [
    { label: 'kill', apply: onNode('Kill', 'cdn-edge'), check: expectHealth('cdn-edge', /cv-health-down/) },
    { label: 'spike', apply: spike, check: expectHealth('recommend-service', /cv-health-critical/) },
    { label: 'partition', apply: onLink('Partition', /Open Connect CDN → Video Block Store/), check: both(expectCut('l-cdn-s3'), expectP99Above(400)) },
    { label: 'slow', apply: onNode('Slow', 'recommend-service'), check: expectHealth('recommend-service', /cv-health-(warn|critical)/) },
    { label: 'flush', apply: onNode('Flush', 'cdn-edge'), check: expectP99Above(300) },
  ],
};

test.describe('Break it', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  for (const [id, cases] of Object.entries(CASES)) {
    test(`${id}: every tool applies and the board/HUD show it`, async ({ page }) => {
      test.setTimeout(240000);
      await openBreak(page, id);
      await expect(page.locator('.player-canvas-area .break-try-card').first()).toBeVisible();
      for (const c of cases) {
        await test.step(c.label, async () => {
          await c.apply(page);
          await expect(page.locator('.player-canvas-area .break-log')).toBeVisible();
          await c.check(page);
          await reset(page);
        });
      }
    });
  }

  test('url-shortener: a fix brings the requirement badges back, and undoing it breaks them again', async ({ page }) => {
    test.setTimeout(120000);
    await openBreak(page, 'url-shortener');
    await fastForward(page);
    await page.locator('.player-canvas-area .break-try-card', { hasText: 'Kill the Redis cache' }).click();
    await expect(badge(page, /redirect p99/)).toHaveAttribute('aria-label', 'failing', { timeout: EFFECT_TIMEOUT });
    await expect(badge(page, /create successful/)).toHaveAttribute('aria-label', 'failing', { timeout: EFFECT_TIMEOUT });

    // The panel opens itself on the first failing requirement; the wrench also opens it.
    const panel = page.locator('.player-inspector .break-fixit');
    // Fix it may open itself when a requirement first fails; toggle until it
    // is open rather than racing that.
    await expect(async () => {
      if (!(await panel.isVisible())) await tool(page, 'Fix it').click();
      await expect(panel).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 10000 });
    await expect(panel).toBeVisible();
    await panel.getByRole('button', { name: 'Apply: In-process L1 cache in the API' }).click();

    await expect(badge(page, /redirect p99/)).toHaveAttribute('aria-label', 'passing', { timeout: 45000 });
    await expect(badge(page, /create successful/)).toHaveAttribute('aria-label', 'passing', { timeout: 45000 });
    const card = panel.locator('[data-fix-id="add-l1-cache"]');
    await expect(card).toHaveAttribute('data-applied', 'true');
    await expect(card.locator('table.break-cmp')).toContainText('p99 latency');
    await expect(card.locator('table.break-cmp tbody tr').first()).toHaveAttribute('data-trend', 'better');

    await card.getByRole('button', { name: /^Undo/ }).click();
    await expect(page.locator('[data-player-root]')).toHaveAttribute('data-sim-status', 'ready', { timeout: READY_TIMEOUT });
    await expect(card).toHaveAttribute('data-applied', 'false');
    await expect(badge(page, /redirect p99/)).toHaveAttribute('aria-label', 'failing', { timeout: EFFECT_TIMEOUT });
  });

  test('netflix: adding origin capacity clears the spike’s failing requirement', async ({ page }) => {
    test.setTimeout(120000);
    await openBreak(page, 'netflix');
    await fastForward(page);
    await page.locator('.player-canvas-area .break-try-card', { hasText: /15x traffic/ }).click();
    await expect(badge(page, /play p99/)).toHaveAttribute('aria-label', 'failing', { timeout: EFFECT_TIMEOUT });
    const panel = page.locator('.player-inspector .break-fixit');
    // Fix it may open itself when a requirement first fails; toggle until it
    // is open rather than racing that.
    await expect(async () => {
      if (!(await panel.isVisible())) await tool(page, 'Fix it').click();
      await expect(panel).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 10000 });
    await panel.getByRole('button', { name: 'Apply: Add origin read capacity' }).click();
    await expect(badge(page, /play p99/)).toHaveAttribute('aria-label', 'passing', { timeout: 45000 });
  });

  test('reset puts the system back to healthy', async ({ page }) => {
    await openBreak(page, 'url-shortener');
    await tool(page, 'Kill').click();
    await node(page, 'cache-redis').click();
    await expect(node(page, 'cache-redis')).toHaveClass(/cv-health-down/, { timeout: EFFECT_TIMEOUT });
    await reset(page);
    await expect(node(page, 'cache-redis')).not.toHaveClass(/cv-health-down/, { timeout: EFFECT_TIMEOUT });
    await expect(page.locator('.player-canvas-area .break-log')).toHaveCount(0);
    // It keeps running after the reset.
    await expect(page.locator('.player-canvas-area .player-timeline-slot').getByRole('button', { name: 'Pause (Space)' })).toBeVisible();
  });

  test('keyboard only: arm, cancel, pick a target from the list, key on a selection, undo, reset', async ({ page }) => {
    await openBreak(page, 'url-shortener');
    const body = page.locator('body');

    await body.press('k');
    await expect(tool(page, 'Kill')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.break-armed')).toBeVisible();
    await body.press('Escape');
    await expect(tool(page, 'Kill')).toHaveAttribute('aria-pressed', 'false');

    // Links can't take focus on the board: the armed hint's list reaches them.
    await body.press('p');
    const combo = page.getByRole('combobox', { name: 'Partition target' });
    await combo.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('option').first()).toBeFocused();
    await page.keyboard.type('API');
    await expect(page.getByRole('option', { name: 'API Service → Redis Cache' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-link-id="l-api-cache"] path.cv-link')).toHaveClass(/is-cut/, { timeout: EFFECT_TIMEOUT });

    // Select a node from the keyboard, then press a tool key: it applies to the selection.
    await node(page, 'api-service').focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('s');
    await expect(page.locator('.player-canvas-area .break-log')).toContainText('Slowed API Service 5×');

    const undo = page.locator('.player-canvas-area .break-log').getByRole('button', { name: 'Undo: Slowed API Service 5×' });
    await undo.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.player-canvas-area .break-log')).toContainText('API Service back to normal speed');

    await body.press('r');
    await expect(page.locator('.player-canvas-area .break-try')).toBeVisible({ timeout: EFFECT_TIMEOUT });
  });

  test('phone: the tools are a chip row, and Fix it opens in the sheet', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openBreak(page, 'url-shortener');
    const chips = page.locator('.break-chips');
    await expect(chips).toBeVisible();
    await expect(toolbox(page)).toBeHidden();
    await chips.getByRole('button', { name: 'Kill' }).click();
    await expect(chips.getByRole('button', { name: 'Kill' })).toHaveAttribute('aria-pressed', 'true');
    await node(page, 'cache-redis').click();
    await expect(node(page, 'cache-redis')).toHaveClass(/cv-health-down/, { timeout: EFFECT_TIMEOUT });

    await chips.getByRole('button', { name: 'Fix it' }).click();
    const sheet = page.locator('[role="dialog"]');
    await expect(sheet.getByRole('tab', { name: 'Fix it' })).toHaveAttribute('aria-selected', 'true');
    await expect(sheet.locator('.break-fixit')).toBeVisible();
    await expect(sheet.locator('.break-log')).toContainText('Killed Redis Cache');

    // No horizontal page scroll with the chips row present.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('home hero: Kill the cache and 10× traffic run and toggle back', async ({ page }) => {
    await page.goto('/');
    const card = page.locator('[data-hero-card]');
    await expect(card.locator('[data-player-root]')).toHaveAttribute('data-sim-status', 'ready', { timeout: READY_TIMEOUT });
    const kill = card.locator('[data-slot="hero-kill-cache"]');
    await expect(kill).toBeEnabled();
    await kill.click();
    await expect(kill).toHaveAttribute('aria-pressed', 'true');
    await expect(kill).toHaveText(/Restore the cache/);
    await expect(card.locator('[data-node-id="cache-redis"]')).toHaveClass(/cv-health-down/, { timeout: EFFECT_TIMEOUT });
    await kill.click();
    await expect(kill).toHaveText(/Kill the cache/);

    const spikeBtn = card.locator('[data-slot="hero-10x-traffic"]');
    await spikeBtn.click();
    await expect(spikeBtn).toHaveText(/Back to 1× traffic/);
    await spikeBtn.click();
    await expect(spikeBtn).toHaveText(/10× traffic/);
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`zero axe violations in Break it with Fix it open, 1440/834/390, ${theme}`, async ({ page }) => {
      test.setTimeout(120000);
      await page.emulateMedia({ colorScheme: theme });
      for (const viewport of [
        { width: 1440, height: 900 },
        { width: 834, height: 1112 },
        { width: 390, height: 844 },
      ]) {
        await page.setViewportSize(viewport);
        await openBreak(page, 'url-shortener');
        if (viewport.width >= 640) {
          // Open Fix it first: it also opens itself when a requirement first
          // fails, so toggling it after the kill can race that and close it.
          await tool(page, 'Fix it').click();
          await expect(page.locator('.player-inspector .break-fixit')).toBeVisible();
          await tool(page, 'Kill').click();
          await expect(page.locator('.break-armed')).toBeVisible();
          await node(page, 'cache-redis').click();
          await expect(page.locator('.player-inspector .break-fixit')).toBeVisible();
          await page.locator('.player-inspector').getByRole('button', { name: /^Apply: / }).first().click();
        } else {
          await page.locator('.break-chips').getByRole('button', { name: 'Fix it' }).click();
          await expect(page.locator('[role="dialog"] .break-fixit')).toBeVisible();
        }
        await page.waitForTimeout(600);
        const results = await new AxeBuilder({ page }).analyze();
        if (results.violations.length > 0) console.log(theme, viewport.width, JSON.stringify(results.violations, null, 2));
        expect(results.violations).toEqual([]);
      }
    });
  }
});
