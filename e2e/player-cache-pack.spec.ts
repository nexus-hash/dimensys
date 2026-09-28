import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Break it's cache failures against the real production runtime, on a Redis
 * cache (url-shortener) and a CDN (netflix): every failure changes the
 * cache's own live readings in the Fix it panel, and a fix that fits it
 * (marked so) mitigates it; the TTL-jitter fix flattens an avalanche's echo
 * over a window; the popover works from the keyboard; axe at three widths in
 * both themes.
 *
 * Readings come from the Fix it panel's "Current failure" card (one row per
 * reading, its raw value in `data-value`), timed by the transport's clock.
 */

const READY_TIMEOUT = 30000;

const isMobileProject = () => test.info().project.name === 'Mobile Chrome';

async function openBreak(page: Page, id: string) {
  await page.goto(`/solutions/${id}`);
  await expect(page.locator('[data-player-root]')).toHaveAttribute('data-sim-status', 'ready', { timeout: READY_TIMEOUT });
  await page.locator('body').press('2');
  await expect(page.locator('[data-player-root]')).toHaveAttribute('data-player-mode', 'break');
}

/** 4× sim clock, so a failure and its fix play out in seconds. */
async function fastForward(page: Page) {
  await page.locator('body').press(']');
  await page.locator('body').press(']');
}

const toolbox = (page: Page) => page.locator('.break-toolbox');
const panel = (page: Page) => page.locator('.player-inspector .break-fixit');
const card = (page: Page) => panel(page).locator('.break-cf');

async function openFixIt(page: Page) {
  if (!(await panel(page).isVisible())) await toolbox(page).getByRole('button', { name: /^Fix it/ }).click();
  await expect(panel(page)).toBeVisible();
}

/** Simulated seconds on the transport's clock (mm:ss). */
async function simTime(page: Page): Promise<number> {
  const text = (await page.locator('.player-canvas-area .player-timeline-slot').textContent()) ?? '';
  const m = text.match(/(\d+):(\d\d)/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
}

async function reading(page: Page, code: string): Promise<number> {
  const v = await card(page).locator(`tr[data-code="${code}"]`).getAttribute('data-value', { timeout: 5000 });
  return v ? Number(v) : NaN;
}

/**
 * Polls `probe` until `ok` holds, and fails if more than `withinSec`
 * simulated seconds pass first. Returns the passing value.
 */
async function within(page: Page, withinSec: number, probe: () => Promise<number>, ok: (v: number) => boolean, what: string): Promise<number> {
  const start = await simTime(page);
  let last = NaN;
  for (;;) {
    last = await probe().catch(() => NaN);
    if (Number.isFinite(last) && ok(last)) return last;
    const t = await simTime(page);
    if (t - start > withinSec) throw new Error(`${what}: not within ${withinSec}s of sim time (last ${last})`);
    await page.waitForTimeout(100);
  }
}

/** Waits `sec` simulated seconds (the readings are 5 s window averages, so a change needs a few to show fully). */
async function settle(page: Page, sec: number) {
  const start = await simTime(page);
  await expect.poll(() => simTime(page), { timeout: 60000 }).toBeGreaterThanOrEqual(start + sec);
}

/** The highest reading seen while the sim clock is in [from, to]. */
async function peakBetween(page: Page, code: string, from: number, to: number): Promise<number> {
  let peak = -Infinity;
  for (;;) {
    const t = await simTime(page);
    if (t > to) return peak;
    if (t >= from) peak = Math.max(peak, await reading(page, code));
    await page.waitForTimeout(100);
  }
}

async function breakCache(page: Page, failure: string) {
  await toolbox(page).getByRole('button', { name: /^Cache/ }).click();
  await page.locator('.break-cache').getByRole('button', { name: new RegExp(`^${failure}`) }).click();
  await expect(page.locator('.break-cache')).toBeHidden();
}

async function applyFix(page: Page, fixId: string) {
  const fx = panel(page).locator(`[data-fix-id="${fixId}"]`);
  await expect(fx).toContainText('fits this failure');
  await fx.getByRole('button', { name: /^Apply: / }).click();
  await expect(fx).toHaveAttribute('data-applied', 'true');
}

async function reset(page: Page) {
  await toolbox(page).getByRole('button', { name: /^Reset/ }).click();
  await expect(page.locator('.player-canvas-area .break-try')).toBeVisible({ timeout: 25000 });
  await expect(card(page)).toHaveCount(0);
}

interface Diagram {
  id: string;
  cache: string;
  /** Misses reaching the store at baseline (rps). */
  base: number;
  fixes: Record<'stampede' | 'hotKey' | 'avalanche' | 'penetration' | 'hotShard' | 'eviction', string>;
}

const DIAGRAMS: Diagram[] = [
  {
    id: 'url-shortener',
    cache: 'Redis Cache',
    base: 396,
    fixes: {
      stampede: 'enable-coalescing',
      hotKey: 'cache-redis--stale-refresh',
      avalanche: 'cache-redis--ttl-jitter',
      penetration: 'cache-redis--bloom',
      hotShard: 'cache-redis--hot-replicas',
      eviction: 'cache-redis--memory',
    },
  },
  {
    id: 'netflix',
    cache: 'Open Connect CDN',
    base: 336,
    fixes: {
      stampede: 'enable-coalescing-cdn',
      hotKey: 'cdn-edge--stale-refresh',
      avalanche: 'cdn-edge--local-l1',
      penetration: 'cdn-edge--bloom',
      hotShard: 'cdn-edge--hot-replicas',
      eviction: 'cdn-edge--memory',
    },
  },
];

test.describe('Break it: cache failures', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  for (const d of DIAGRAMS) {
    test(`${d.id}: every failure shows in the cache's readings, and a fix that fits mitigates it`, async ({ page }) => {
      test.skip(isMobileProject(), 'the simulation is the same on every device: the matrix runs once, on desktop');
      test.setTimeout(300000);
      await openBreak(page, d.id);
      await fastForward(page);
      await openFixIt(page);
      const v = () => reading(page, 'v');

      await test.step('stampede → request coalescing', async () => {
        await breakCache(page, 'Stampede');
        await expect(card(page)).toContainText(`Stampede on ${d.cache}`);
        await within(page, 8, v, (x) => x > 4 * d.base, 'misses flood the store');
        await applyFix(page, d.fixes.stampede);
        // Without it the cache takes 30 s or more to warm; with it the store sees about a tenth of the flood.
        await within(page, 10, v, (x) => x < 2.5 * d.base, 'coalescing collapses the misses');
        await reset(page);
      });

      await test.step('hot key expires → serve stale while refreshing', async () => {
        await breakCache(page, 'Hot key expires');
        await within(page, 8, v, (x) => x > 2 * d.base, 'a miss burst');
        await applyFix(page, d.fixes.hotKey);
        // The next expiry is served stale: no burst.
        await within(page, 30, () => reading(page, 'w'), (x) => x > 0, 'answers served stale at the next expiry');
        const t = await simTime(page);
        expect(await peakBetween(page, 'v', t, t + 5)).toBeLessThan(1.3 * d.base);
        await reset(page);
      });

      await test.step('avalanche → the cache goes cold at once', async () => {
        await breakCache(page, 'Avalanche');
        const low = await within(page, 8, () => reading(page, 'j'), (x) => x < 0.7, 'the hit ratio dips');
        expect(low).toBeLessThan(0.7);
        if (d.id === 'netflix') {
          // An L1 in front absorbs half the wave: the misses fall about twice as fast as the refill alone makes them.
          await settle(page, 6);
          const at = await v();
          await applyFix(page, d.fixes.avalanche);
          await settle(page, 6);
          expect(await v()).toBeLessThan(0.55 * at);
        }
        await reset(page);
      });

      await test.step('penetration → Bloom filter', async () => {
        await breakCache(page, 'Penetration');
        await within(page, 8, v, (x) => x > 4 * d.base, 'made-up keys reach the store');
        await applyFix(page, d.fixes.penetration);
        await within(page, 10, v, (x) => x < 1.2 * d.base, 'store reads drop back');
        expect(await reading(page, 'x')).toBeGreaterThan(d.base);
        await reset(page);
      });

      await test.step('hot shard → replicate the hot keys', async () => {
        await breakCache(page, 'Hot shard');
        const hot = await within(
          page,
          8,
          async () => (await reading(page, 'y')) / (await reading(page, 'c')),
          (r) => r > 2.8,
          'the busiest shard runs far above the average',
        );
        expect(hot).toBeGreaterThan(2.8);
        const y = await reading(page, 'y');
        await applyFix(page, d.fixes.hotShard);
        await within(page, 10, () => reading(page, 'y'), (x) => x < 0.8 * y, 'the busiest shard cools');
        await reset(page);
      });

      await test.step('eviction storm → add memory', async () => {
        await breakCache(page, 'Eviction storm');
        await within(page, 8, () => reading(page, 'j'), (x) => x < 0.55, 'the scan empties the cache');
        // The scan's damage warms back up; the working set that no longer fits caps the hit ratio at about two thirds of normal.
        const capped = await within(page, 60, () => reading(page, 'j'), (x) => x > 0.58, 'the cache warms back up to its memory limit');
        expect(capped).toBeLessThan(0.65);
        await applyFix(page, d.fixes.eviction);
        await within(page, 10, () => reading(page, 'j'), (x) => x > 0.8, 'with memory for the working set, the hit ratio recovers');
        await reset(page);
      });
    });
  }

  test('url-shortener: TTL jitter flattens the avalanche’s echo one expiry cycle later', async ({ page }) => {
    test.skip(isMobileProject(), 'the simulation is the same on every device: runs once, on desktop');
    test.setTimeout(180000);
    await openBreak(page, 'url-shortener');
    await fastForward(page);
    await openFixIt(page);

    /** Peak misses in the window where the first echo comes back (the cache's keys expire every 20 s). */
    async function echo(withJitter: boolean): Promise<number> {
      await breakCache(page, 'Avalanche');
      const t0 = await simTime(page);
      if (withJitter) await applyFix(page, 'cache-redis--ttl-jitter');
      const peak = await peakBetween(page, 'v', t0 + 27, t0 + 48);
      await reset(page);
      return peak;
    }
    const plain = await echo(false);
    const jittered = await echo(true);
    expect(plain).toBeGreaterThan(420); // there is an echo to flatten
    expect(jittered).toBeLessThan(0.9 * plain);
  });

  test('keyboard only: C opens the failures, Tab and Enter apply one, the log reads it, Esc closes', async ({ page }) => {
    await openBreak(page, 'url-shortener');
    const body = page.locator('body');
    await body.press('c');
    const pop = page.locator('.break-cache');
    await expect(pop).toBeVisible();
    await expect(pop.getByRole('button').first()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(pop).toBeHidden();

    await body.press('c');
    await expect(pop.getByRole('button', { name: /^Stampede/ })).toBeFocused();
    for (let i = 0; i < 3; i++) await page.keyboard.press('Tab');
    await expect(pop.getByRole('button', { name: /^Penetration/ })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(pop).toBeHidden();
    const log = page.locator('.player-canvas-area .break-log');
    await expect(log).toContainText('Penetration on Redis Cache');

    // The failure is in the log with its own undo, like any move.
    const undo = log.getByRole('button', { name: 'Undo: Penetration on Redis Cache' });
    await undo.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-player-root]')).toHaveAttribute('data-sim-status', 'ready', { timeout: READY_TIMEOUT });
    await expect(page.locator('.player-canvas-area .break-try')).toBeVisible();
  });

  test('phone: Cache is a chip, and the current failure shows in the Fix it sheet', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openBreak(page, 'url-shortener');
    const chips = page.locator('.break-chips');
    await chips.getByRole('button', { name: 'Cache' }).click();
    await page.locator('.break-cache').getByRole('button', { name: /^Hot shard/ }).click();
    await chips.getByRole('button', { name: 'Fix it' }).click();
    const sheet = page.locator('[role="dialog"]');
    await expect(sheet.locator('.break-cf')).toContainText('Hot shard on Redis Cache');
    await expect(sheet.locator('[data-fix-id="cache-redis--virtual-nodes"]')).toContainText('fits this failure');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`zero axe violations with the failures open and a failure in Fix it, 1440/834/390, ${theme}`, async ({ page }) => {
      test.setTimeout(150000);
      await page.emulateMedia({ colorScheme: theme });
      for (const viewport of [
        { width: 1440, height: 900 },
        { width: 834, height: 1112 },
        { width: 390, height: 844 },
      ]) {
        await page.setViewportSize(viewport);
        await openBreak(page, 'url-shortener');
        const phone = viewport.width < 640;
        // Fix it opens before anything breaks (it would otherwise open itself on the first failing requirement).
        if (!phone) await openFixIt(page);
        const trigger = phone ? page.locator('.break-chips').getByRole('button', { name: 'Cache' }) : toolbox(page).getByRole('button', { name: /^Cache/ });
        await trigger.click();
        await expect(page.locator('.break-cache')).toBeVisible();
        await page.waitForTimeout(400);
        let results = await new AxeBuilder({ page }).analyze();
        if (results.violations.length > 0) console.log(theme, viewport.width, 'popover', JSON.stringify(results.violations, null, 2));
        expect(results.violations).toEqual([]);

        await page.locator('.break-cache').getByRole('button', { name: /^Penetration/ }).click();
        if (phone) {
          await page.locator('.break-chips').getByRole('button', { name: 'Fix it' }).click();
          await expect(page.locator('[role="dialog"] .break-cf')).toBeVisible();
        } else {
          await expect(card(page)).toBeVisible();
        }
        await page.waitForTimeout(1500);
        results = await new AxeBuilder({ page }).analyze();
        if (results.violations.length > 0) console.log(theme, viewport.width, 'fix it', JSON.stringify(results.violations, null, 2));
        expect(results.violations).toEqual([]);
      }
    });
  }
});
