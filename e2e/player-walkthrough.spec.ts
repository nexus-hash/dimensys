import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Walkthrough mode on /solutions/url-shortener: the rail lists the
 * diagram's walkthroughs, choosing one plays it step by step (rail step
 * list, dock narration, progress, Prev / Next and ← / →), each step lights
 * its elements and dims the rest, the camera frames the step's targets,
 * `?v=<walkthrough>&st=<step>` reflects and restores the step, and leaving
 * puts the whole board and the camera back.
 *
 * The walkthrough under test is url-shortener's write path (several steps,
 * one of them aimed at a group frame).
 */

const DIAGRAM = 'url-shortener';
const READY_TIMEOUT = 20000;

interface Story {
  id: string;
  text: string;
  frames: Array<{ id: string; title?: string }>;
}

let wt: Story;

test.beforeAll(async ({ request }) => {
  const res = await request.get(`/solutions/${DIAGRAM}/diagram.json`);
  expect(res.ok()).toBe(true);
  const view = (await res.json()) as { stories: Story[] };
  const playable = view.stories.filter((s) => s.frames.length > 0);
  expect(playable.length).toBeGreaterThan(0);
  wt = playable.find((s) => s.id === 'write-path')!;
  expect(wt).toBeTruthy();
  expect(wt.frames.length).toBeGreaterThanOrEqual(3);
});

const narration = (page: Page) => page.locator('.player-canvas-area [data-walkthrough-narration]');
const root = (page: Page) => page.locator('[data-player-root]');

async function open(page: Page, query = '') {
  await page.goto(`/solutions/${DIAGRAM}${query}`);
  await expect(root(page)).toHaveAttribute('data-sim-status', 'ready', { timeout: READY_TIMEOUT });
}

/** The camera's current scale, from the board's transform. */
async function cameraScale(page: Page): Promise<number> {
  return page.evaluate(() => {
    const t = document.querySelector<HTMLElement>('[data-board-level] > *')?.style.transform ?? '';
    const m = /scale\(([\d.]+)\)/.exec(t);
    return m ? Number(m[1]) : NaN;
  });
}

async function boardTransform(page: Page): Promise<string> {
  return page.evaluate(() => document.querySelector<HTMLElement>('[data-board-level] > *')?.style.transform ?? '');
}

async function expectStep(page: Page, n: number) {
  await expect(narration(page)).toHaveAttribute('data-step', String(n));
  await expect(narration(page)).toContainText(`step ${n} / ${wt.frames.length}`);
  await expect(page).toHaveURL(new RegExp(`[?&]v=${wt.id}&st=${wt.frames[n - 1].id}(&|$)`));
  await expect(page.locator('[data-wt-badge]')).toHaveText(String(n));
}

test.describe('walkthrough player (desktop)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('the rail lists the walkthroughs; choosing one plays it to the end with Next', async ({ page }) => {
    await open(page);
    const rail = page.locator('.player-rail [data-rail-slot="walkthroughs"]');
    await expect(rail.locator('.wt-opt')).not.toHaveCount(0);
    await rail.locator(`[data-walkthrough="${wt.id}"] .wt-opt`).click();
    await expect(root(page)).toHaveAttribute('data-player-mode', 'walkthrough');
    await expectStep(page, 1);
    await expect(rail.locator('.wt-steps li')).toHaveCount(wt.frames.length);
    await expect(rail.locator('.wt-steps li[aria-current="step"]')).toHaveAttribute('data-n', '1');

    const next = narration(page).getByRole('button', { name: 'Next step' });
    for (let n = 2; n <= wt.frames.length; n++) {
      await next.click();
      await expectStep(page, n);
      await expect(rail.locator('.wt-steps li[aria-current="step"]')).toHaveAttribute('data-n', String(n));
    }
    await expect(next).toBeDisabled();
    // Progress dots show once there's more than one step.
    if (wt.frames.length > 1) await expect(narration(page).getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(wt.frames.length));
    else await expect(narration(page).getByRole('progressbar')).toHaveCount(0);
  });

  test('key 3 enters Walkthrough mode on the first walkthrough', async ({ page }) => {
    await open(page);
    await page.keyboard.press('3');
    await expect(root(page)).toHaveAttribute('data-player-mode', 'walkthrough');
    await expect(narration(page)).toHaveAttribute('data-step', '1');
  });

  test('← / → move between steps', async ({ page }) => {
    await open(page, `?v=${wt.id}`);
    await expectStep(page, 1);
    await page.keyboard.press('ArrowRight');
    await expectStep(page, 2);
    await page.keyboard.press('ArrowLeft');
    await expectStep(page, 1);
    await page.keyboard.press('ArrowLeft');
    await expectStep(page, 1);
  });

  test('a deep link to step 3 opens straight on step 3', async ({ page }) => {
    await open(page, `?v=${wt.id}&st=${wt.frames[2].id}`);
    await expect(root(page)).toHaveAttribute('data-player-mode', 'walkthrough');
    await expectStep(page, 3);
    await expect(page.locator('.player-rail .wt-steps li[aria-current="step"]')).toHaveAttribute('data-n', '3');
    // The step's number works as well as its id.
    await open(page, `?v=${wt.id}&st=3`);
    await expectStep(page, 3);
  });

  test('a deep link to any step renders that step', async ({ page }) => {
    for (let n = 1; n <= wt.frames.length; n++) {
      await open(page, `?v=${wt.id}&st=${wt.frames[n - 1].id}`);
      await expectStep(page, n);
    }
  });

  test('a step lights its elements and dims the rest', async ({ page }) => {
    await open(page, `?v=${wt.id}`);
    await expectStep(page, 1);
    const counts = await page.evaluate(() => {
      const nodes = [...document.querySelectorAll('[data-board-level] [data-node-id]')];
      const links = [...document.querySelectorAll('[data-board-level] [data-link-id]')];
      return {
        nodes: nodes.length,
        dimNodes: nodes.filter((n) => n.classList.contains('is-dimmed')).length,
        dimLinks: links.filter((n) => n.classList.contains('is-dimmed')).length,
        dimOpacity: nodes.find((n) => n.classList.contains('is-dimmed')) ? getComputedStyle(nodes.find((n) => n.classList.contains('is-dimmed'))!).opacity : null,
        focus: document.querySelectorAll('.is-wt-focus').length,
      };
    });
    expect(counts.dimNodes).toBeGreaterThan(0);
    expect(counts.dimNodes).toBeLessThan(counts.nodes);
    expect(counts.dimLinks).toBeGreaterThan(0);
    expect(counts.focus).toBe(1);
    await expect.poll(async () => page.evaluate(() => getComputedStyle(document.querySelector('[data-board-level] [data-node-id].is-dimmed')!).opacity)).toBe('0.2');
    expect(counts.dimOpacity).not.toBeNull();
  });

  test('the camera frames the step targets', async ({ page }) => {
    await open(page);
    const fitScale = await cameraScale(page);
    await open(page, `?v=${wt.id}&st=${wt.frames[wt.frames.length - 1].id}`);
    await expectStep(page, wt.frames.length);
    await page.waitForTimeout(800); // the camera move
    expect(await cameraScale(page)).toBeGreaterThan(fitScale);
    const outside = await page.evaluate(() => {
      const wrap = document.querySelector('.player-board-wrap')!.getBoundingClientRect();
      const lit = [...document.querySelectorAll('[data-board-level] [data-node-id]:not(.is-dimmed)')];
      return lit
        .map((n) => ({ id: n.getAttribute('data-node-id'), r: n.querySelector('.cv-body')!.getBoundingClientRect() }))
        .filter(({ r }) => r.left < wrap.left - 1 || r.right > wrap.right + 1 || r.top < wrap.top - 1 || r.bottom > wrap.bottom + 1)
        .map(({ id }) => id);
    });
    expect(outside).toEqual([]);
  });

  test('Exit restores the full view, the camera and the URL', async ({ page }) => {
    await open(page);
    await page.waitForTimeout(500);
    const before = await boardTransform(page);
    await page.locator(`.player-rail [data-walkthrough="${wt.id}"] .wt-opt`).click();
    await expectStep(page, 1);
    if (wt.frames.length > 1) {
      await page.keyboard.press('ArrowRight');
      await expectStep(page, 2);
    }
    await narration(page).getByRole('button', { name: 'Exit walkthrough' }).click();
    await expect(root(page)).toHaveAttribute('data-player-mode', 'explore');
    await expect(narration(page)).toHaveCount(0);
    await expect(page).not.toHaveURL(/[?&]v=/);
    await expect(page.locator('[data-board-level] .is-dimmed, [data-wt-badge], .is-wt-focus, [data-wt-flow], [data-wt-tone]')).toHaveCount(0);
    await expect.poll(() => boardTransform(page)).toBe(before);
  });
});

test('a step aimed at a group frame frames and badges that frame', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, `?v=${wt.id}&st=2`);
  await expectStep(page, 2);
  await expect(page.locator('[data-frame-id].is-wt-focus')).toHaveCount(1);
  await page.waitForTimeout(800);
  const inside = await page.evaluate(() => {
    const wrap = document.querySelector('.player-board-wrap')!.getBoundingClientRect();
    const r = document.querySelector('[data-frame-id].is-wt-focus .cv-body')!.getBoundingClientRect();
    return r.left >= wrap.left - 1 && r.right <= wrap.right + 1 && r.top >= wrap.top - 1 && r.bottom <= wrap.bottom + 1;
  });
  expect(inside).toBe(true);
});

test('netflix: a deep link opens a transcoding step', async ({ page }) => {
  await page.goto('/solutions/netflix?v=transcode-pipeline&st=3');
  await expect(root(page)).toHaveAttribute('data-player-mode', 'walkthrough', { timeout: READY_TIMEOUT });
  await expect(narration(page)).toHaveAttribute('data-step', '3');
  await expect(page).toHaveURL(/[?&]v=transcode-pipeline&st=tp-queue(&|$)/);
});

test.describe('walkthrough player (phone)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('a deep link plays on phone with the narration under the board', async ({ page }) => {
    await open(page, `?v=${wt.id}`);
    await expect(narration(page)).toBeVisible();
    await expect(narration(page)).toHaveAttribute('data-step', '1');
    if (wt.frames.length > 1) {
      await narration(page).getByRole('button', { name: 'Next step' }).click();
      await expect(narration(page)).toHaveAttribute('data-step', '2');
    }
  });
});

test('home: "Take the walkthrough" deep-links into the first walkthrough', async ({ page }) => {
  await page.goto('/');
  const link = page.getByRole('link', { name: /Take the walkthrough/ });
  await expect(link).toHaveAttribute('href', new RegExp(`^/solutions/${DIAGRAM}\\?v=[\\w-]+$`));
  await link.click();
  await expect(root(page)).toHaveAttribute('data-player-mode', 'walkthrough', { timeout: READY_TIMEOUT });
  await expect(narration(page)).toHaveAttribute('data-step', '1');
});

/** axe, every rule, in walkthrough mode at the three reference viewports in both themes. */
test.describe('walkthrough mode axe (light + dark)', () => {
  for (const scheme of ['light', 'dark'] as const) {
    for (const [name, viewport] of [
      ['1440', { width: 1440, height: 900 }],
      ['834', { width: 834, height: 1112 }],
      ['390', { width: 390, height: 844 }],
    ] as const) {
      test(`0 axe violations at ${name}, ${scheme}`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme });
        await page.setViewportSize(viewport);
        await open(page, `?v=${wt.id}&st=${wt.frames[wt.frames.length - 1].id}`);
        await expect(page.locator('html')).toHaveAttribute('data-theme', scheme);
        await expect(narration(page)).toHaveAttribute('data-step', String(wt.frames.length));
        await page.waitForTimeout(1500);
        const results = await new AxeBuilder({ page }).analyze();
        if (results.violations.length > 0) console.log(name, scheme, JSON.stringify(results.violations, null, 2));
        expect(results.violations).toEqual([]);
      });
    }
  }
});
