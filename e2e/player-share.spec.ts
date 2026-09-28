import { test, expect, type Browser, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Share links against the real production runtime: a link made mid-meltdown
 * opens on the same failing and passing requirements, health rings and HUD
 * readings at the same simulated time (the run is rebuilt from its action
 * log, deterministically); walkthrough steps, trade-offs and calculator
 * applies come back too; old `?v=&st=` links and old diagram ids still work;
 * a link from another revision says what it couldn't replay; the Share
 * button copies (or offers the link to copy by hand); the address bar
 * follows along without adding history entries; axe stays clean.
 */

const DIAGRAM = 'url-shortener';
const READY_TIMEOUT = 30000;
const EFFECT_TIMEOUT = 25000;

const root = (page: Page) => page.locator('[data-player-root]');
const node = (page: Page, id: string) => page.locator(`[data-node-id="${id}"]`);
const toolbox = (page: Page) => page.locator('.break-toolbox');
const tool = (page: Page, label: string) => toolbox(page).getByRole('button', { name: new RegExp(`^${label}`) });
const badge = (page: Page, text: RegExp) => page.locator('.player-rail .hud-req-badges > *').filter({ hasText: text }).locator('[role="img"]');

async function ready(page: Page) {
  await expect(root(page)).toHaveAttribute('data-sim-status', 'ready', { timeout: READY_TIMEOUT });
}

/** base64url of the JSON action log, as the player writes it. */
function encodeLog(log: unknown[]): string {
  return Buffer.from(JSON.stringify(log)).toString('base64url');
}

async function pause(page: Page) {
  const btn = page.locator('.player-canvas-area .player-timeline-slot').getByRole('button', { name: 'Pause (Space)' });
  await btn.click();
  await expect(page.locator('.player-canvas-area .player-timeline-slot').getByRole('button', { name: 'Play (Space)' })).toBeVisible();
}

/** Clicks Share and returns the copied link. */
async function share(page: Page): Promise<string> {
  await page.locator('[data-share-button]:visible').click();
  await expect(page.getByText('Link copied').first()).toBeVisible();
  return page.evaluate(() => navigator.clipboard.readText());
}

interface Snapshot {
  time: string;
  badges: Array<[string, string]>;
  health: Array<[string, string]>;
  hud: Array<[string, number]>;
  deltas: string[];
}

async function snapshot(page: Page): Promise<Snapshot> {
  return page.evaluate(() => {
    const time = document.querySelector('.player-canvas-area .player-tl-run, .player-canvas-area .player-time')?.textContent?.trim() ?? '';
    const badges = [...document.querySelectorAll('.player-rail .hud-req-badges > *')].map(
      (b) => [b.textContent?.trim() ?? '', b.querySelector('[role="img"]')?.getAttribute('aria-label') ?? ''] as [string, string],
    );
    const health = [...document.querySelectorAll<SVGGElement>('[data-board-level] [data-node-id]')].map(
      (g) => [g.dataset.nodeId ?? '', /cv-health-(\w+)/.exec(g.getAttribute('class') ?? '')?.[1] ?? 'none'] as [string, string],
    );
    const tiles = [...document.querySelectorAll('.player-canvas-area .hud-tile')];
    const hud = tiles.map((t) => {
      const label = t.querySelector('.text-ink-secondary')?.textContent?.trim() ?? '';
      const v = Number((t.querySelector('.font-mono.tabular-nums')?.textContent ?? '').replace(/[^0-9.-]/g, ''));
      return [label, v] as [string, number];
    });
    // "versus the start": the tile's delta line.
    const deltas = tiles.map((t) => t.querySelector('.text-right.font-mono')?.textContent?.trim() ?? '');
    return { time, badges, health, hud, deltas };
  });
}

/** Opens `url` in a fresh browser context (nothing shared with the page that made it). */
async function openFresh(browser: Browser, url: string, viewport = { width: 1440, height: 900 }): Promise<Page> {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.goto(url);
  return page;
}

function expectSameMoment(a: Snapshot, b: Snapshot) {
  expect(b.time).toBe(a.time);
  expect(b.badges).toEqual(a.badges);
  expect(b.health).toEqual(a.health);
  expect(b.hud.map(([l]) => l)).toEqual(a.hud.map(([l]) => l));
  for (let i = 0; i < a.hud.length; i++) {
    const [label, va] = a.hud[i];
    const vb = b.hud[i][1];
    if (Number.isNaN(va)) continue;
    // The rebuild is tick-exact; the tolerance only covers display rounding.
    expect(Math.abs(vb - va), `${label}: ${va} vs ${vb}`).toBeLessThanOrEqual(Math.max(0.02 * Math.abs(va), 0.01));
  }
}

test.describe('share links', () => {
  test.use({ viewport: { width: 1440, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });

  test('a meltdown with a fix: the link opens on the same requirements, health and HUD at the same time', async ({ page, browser }) => {
    test.setTimeout(120000);
    await page.goto(`/solutions/${DIAGRAM}`);
    await ready(page);
    // A healthy moment first, as anyone would see before breaking things (the HUD has its start reading).
    await expect(page.locator('.player-canvas-area .hud-tile').first()).toContainText('baseline', { timeout: EFFECT_TIMEOUT });
    await page.locator('body').press('2');
    await page.locator('body').press(']');
    await page.locator('body').press(']');
    await page.locator('.player-canvas-area .break-try-card', { hasText: 'Kill the Redis cache' }).click();
    await expect(badge(page, /redirect p99/)).toHaveAttribute('aria-label', 'failing', { timeout: EFFECT_TIMEOUT });

    const panel = page.locator('.player-inspector .break-fixit');
    await expect(async () => {
      if (!(await panel.isVisible())) await tool(page, 'Fix it').click();
      await expect(panel).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 10000 });
    await panel.getByRole('button', { name: 'Apply: In-process L1 cache in the API' }).click();
    await page.waitForTimeout(2500);
    await pause(page);
    await page.waitForTimeout(500);
    const before = await snapshot(page);
    expect(before.health).toContainEqual(['cache-redis', 'down']);

    const url = await share(page);
    test.info().annotations.push({ type: 'meltdown link length', description: `${url.length} chars: ${url}` });
    expect(url).toMatch(/[?&]r=\d+/);
    expect(url).toMatch(/[?&]m=b(&|$)/);
    expect(url).toMatch(/[?&]p=0(&|$)/);
    expect(url).toMatch(/[?&]a=[A-Za-z0-9_-]+/);
    expect(url.length).toBeLessThan(600);

    const fresh = await openFresh(browser, url);
    await ready(fresh);
    await expect(root(fresh)).toHaveAttribute('data-player-mode', 'break');
    await expect(fresh.locator('.player-canvas-area .player-timeline-slot').getByRole('button', { name: 'Play (Space)' })).toBeVisible();
    await expect(fresh.locator('.player-canvas-area .break-log')).toContainText('Killed Redis Cache');
    await expect(fresh.locator('.player-canvas-area .break-log')).toContainText('L1 cache');
    await expect(fresh.locator('.player-canvas-area .player-tl-run')).toHaveText(before.time.replace(/\s+/g, ' '), { timeout: EFFECT_TIMEOUT });
    await expect.poll(async () => (await snapshot(fresh)).badges, { timeout: EFFECT_TIMEOUT }).toEqual(before.badges);
    await fresh.waitForTimeout(500);
    const after = await snapshot(fresh);
    expectSameMoment(before, after);
    // Versus the start, too: the rebuilt run knows how it began.
    expect(after.deltas).toEqual(before.deltas);
    // Nothing to apologise for: same revision, every action replayed.
    await expect(fresh.getByText(/couldn’t be (replayed|restored)|older version/)).toHaveCount(0);

    // Playing on from there works.
    await fresh.locator('.player-canvas-area .player-timeline-slot').getByRole('button', { name: 'Play (Space)' }).click();
    await expect(fresh.locator('.player-canvas-area .player-tl-run')).toContainText('running');
    await fresh.context().close();
  });

  test('a trade-off flip and a calculator apply come back from the link', async ({ page, browser }) => {
    test.setTimeout(90000);
    await page.goto(`/solutions/${DIAGRAM}`);
    await ready(page);

    await node(page, 'db-nosql').click();
    let body = page.locator('[data-inspector-body-slot]:visible');
    await body.getByRole('tab', { name: 'Operations' }).click();
    const one = body.locator('[data-inspector-trade="write-consistency"]').getByRole('radio', { name: 'ONE' });
    await one.click();
    await expect(one).toHaveAttribute('aria-checked', 'true');

    await node(page, 'api-service').click();
    body = page.locator('[data-inspector-body-slot]:visible');
    await body.getByRole('tab', { name: 'Operations' }).click();
    const calc = body.locator('[data-inspector-calc="c1"]');
    const thumb = calc.getByRole('slider').first();
    await thumb.focus();
    for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowRight');
    const moved = (await calc.locator('output').first().textContent())?.trim();
    await calc.getByRole('button', { name: 'Apply to simulation' }).click();
    await expect(calc.getByRole('button', { name: 'Applied' })).toBeDisabled();
    await page.waitForTimeout(1000);
    await pause(page);
    const before = await snapshot(page);
    const url = await share(page);
    expect(url).toMatch(/[?&]sel=n:api-service(&|$)/);
    // The calculator apply is in the log, with its values.
    const log = JSON.parse(Buffer.from(new URL(url).searchParams.get('a')!, 'base64url').toString()) as unknown[][];
    expect(log.map((a) => a[1])).toEqual(['toggle', 'calc']);

    const fresh = await openFresh(browser, url);
    await ready(fresh);
    const fbody = fresh.locator('[data-inspector-body-slot]:visible');
    await expect(fbody).toBeVisible();
    await fbody.getByRole('tab', { name: 'Operations' }).click();
    const fcalc = fbody.locator('[data-inspector-calc="c1"]');
    await expect(fcalc.getByRole('button', { name: 'Applied' })).toBeDisabled();
    await expect(fcalc.locator('output').first()).toHaveText(moved!);
    await expect(fresh.locator('.player-canvas-area .player-tl-run')).toHaveText(before.time.replace(/\s+/g, ' '), { timeout: EFFECT_TIMEOUT });
    await fresh.waitForTimeout(500);
    expectSameMoment(before, await snapshot(fresh));

    await fresh.locator('[data-node-id="db-nosql"]').click();
    await fbody.getByRole('tab', { name: 'Operations' }).click();
    await expect(fbody.locator('[data-inspector-trade="write-consistency"]').getByRole('radio', { name: 'ONE' })).toHaveAttribute('aria-checked', 'true');
    await fresh.context().close();
  });

  test('a scenario past its checkpoint: the link replays the recorded answer to the same moment', async ({ page, browser, request }) => {
    test.setTimeout(120000);
    const view = (await (await request.get(`/solutions/${DIAGRAM}/diagram.json`)).json()) as {
      plays: Array<{ id: string; asks: Array<{ id: string; picks: Array<{ id: string; text: string }> }> }>;
    };
    const story = view.plays.find((p) => p.id === 'cache-outage')!;
    const ask = story.asks[0];
    const pick = ask.picks[1];
    await page.goto(`/solutions/${DIAGRAM}`);
    await ready(page);
    const option = page.locator('.player-rail [data-scenario="cache-outage"] .story-opt');
    await option.click();
    await expect(option).toHaveAttribute('aria-current', 'true');
    await ready(page);
    await page.keyboard.press(']');
    await page.keyboard.press(']');
    const card = page.locator(`[data-checkpoint="${ask.id}"]`);
    const thumb = page.locator('.player-canvas-area .player-scrubber [role="slider"]');
    await thumb.focus();
    await page.keyboard.press('End');
    await expect(card).toBeVisible({ timeout: 30000 });
    await card.locator(`[data-choice="${pick.id}"]`).click();
    await expect(card).toHaveCount(0);
    await page.waitForTimeout(2500);
    await pause(page);
    await page.waitForTimeout(400);
    const before = await snapshot(page);
    const said = (await page.locator('.player-canvas-area [data-story-narration]').innerText()).trim();
    const url = await share(page);
    expect(url).toMatch(/[?&]v=cache-outage(&|$)/);
    expect(url).toContain(`ch=${ask.id}:${pick.id}`);

    const fresh = await openFresh(browser, url);
    await ready(fresh);
    await expect(fresh.locator('.player-rail [data-scenario="cache-outage"] .story-opt')).toHaveAttribute('aria-current', 'true');
    // The answer was replayed, not asked again.
    await expect(fresh.locator(`[data-checkpoint="${ask.id}"]`)).toHaveCount(0);
    await expect.poll(async () => (await snapshot(fresh)).time, { timeout: EFFECT_TIMEOUT }).toBe(before.time);
    // The same narration: the answer's outcome (or the reveal after it), not the question.
    await expect.poll(async () => (await fresh.locator('.player-canvas-area [data-story-narration]').innerText()).trim(), { timeout: EFFECT_TIMEOUT }).toBe(said);
    await fresh.waitForTimeout(500);
    expectSameMoment(before, await snapshot(fresh));
    await fresh.context().close();
  });

  test('a walkthrough step link, and the view the user moved to', async ({ page, browser }) => {
    await page.goto(`/solutions/${DIAGRAM}`);
    await ready(page);
    await page.locator('body').press('3');
    const narration = page.locator('.player-canvas-area [data-walkthrough-narration]');
    await expect(narration).toHaveAttribute('data-step', '1');
    await narration.getByRole('button', { name: 'Next step' }).click();
    await expect(narration).toHaveAttribute('data-step', '2');
    await page.waitForTimeout(700);
    // Zoom in from the keyboard: the camera is now the user's.
    await page.locator('body').press('+');
    await page.waitForTimeout(300);
    const transform = await page.evaluate(() => document.querySelector<HTMLElement>('[data-board-level] > *')?.style.transform ?? '');
    const url = await share(page);
    expect(url).toMatch(/[?&]v=write-path&st=[\w-]+/);
    expect(url).toMatch(/[?&]cam=-?[\d.]+,-?[\d.]+,[\d.]+/);

    const fresh = await openFresh(browser, url);
    const fnarr = fresh.locator('.player-canvas-area [data-walkthrough-narration]');
    await expect(root(fresh)).toHaveAttribute('data-player-mode', 'walkthrough', { timeout: READY_TIMEOUT });
    await expect(fnarr).toHaveAttribute('data-step', '2');
    // Same view, to within the link's rounding (0.1 board px).
    const parse = (s: string) => (/translate\((-?[\d.]+)px, (-?[\d.]+)px\) scale\(([\d.]+)\)/.exec(s) ?? []).slice(1).map(Number);
    const want = parse(transform);
    await expect
      .poll(
        async () => {
          const got = parse(await fresh.evaluate(() => document.querySelector<HTMLElement>('[data-board-level] > *')?.style.transform ?? ''));
          return got.length === 3 && got.every((v, i) => Math.abs(v - want[i]) <= (i === 2 ? 0.001 : 0.5));
        },
        { timeout: 5000 },
      )
      .toBe(true);
    await fresh.context().close();
  });

  test('old links: a plain ?v=&st= link and an old diagram id both still open', async ({ page }) => {
    await page.goto(`/solutions/${DIAGRAM}?v=write-path&st=2`);
    await expect(root(page)).toHaveAttribute('data-player-mode', 'walkthrough', { timeout: READY_TIMEOUT });
    await expect(page.locator('.player-canvas-area [data-walkthrough-narration]')).toHaveAttribute('data-step', '2');
    await expect(page).toHaveURL(/[?&]v=write-path&st=[\w-]+/);

    const log = encodeLog([[2, 'kill', 'cache-redis', null]]);
    await page.goto(`/solutions/url-shortener-01?s=1&r=1&m=b&t=4&p=0&a=${log}`);
    await expect(page).toHaveURL(new RegExp(`/solutions/${DIAGRAM}\\?`));
    await ready(page);
    await expect(root(page)).toHaveAttribute('data-player-mode', 'break');
    await expect(node(page, 'cache-redis')).toHaveClass(/cv-health-down/, { timeout: EFFECT_TIMEOUT });
  });

  test('a link from an older revision replays what it can and says what it could not', async ({ page }) => {
    const log = encodeLog([
      [1, 'kill', 'a-node-that-was-removed', null],
      [1.5, 'kill', 'cache-redis', null],
    ]);
    await page.goto(`/solutions/${DIAGRAM}?s=1&r=0&m=b&t=6&p=0&a=${log}`);
    await ready(page);
    await expect(page.getByText('This link was made on an older version of the diagram').first()).toBeVisible({ timeout: EFFECT_TIMEOUT });
    await expect(page.getByText('One action couldn’t be replayed.').first()).toBeVisible();
    await expect(node(page, 'cache-redis')).toHaveClass(/cv-health-down/, { timeout: EFFECT_TIMEOUT });
    await expect(page.locator('.player-canvas-area .break-log li')).toHaveCount(1);
    // The address bar now holds the link as replayed: current revision, one action.
    await expect.poll(() => new URL(page.url()).searchParams.get('r')).toBe('1');
    await expect
      .poll(() => {
        const a = new URL(page.url()).searchParams.get('a');
        return a ? (JSON.parse(Buffer.from(a, 'base64url').toString()) as unknown[]).length : 0;
      })
      .toBe(1);
  });

  test('the address bar follows along without new history entries; back and forward keep the player working', async ({ page }) => {
    await page.goto('/');
    await page.goto(`/solutions/${DIAGRAM}`);
    await ready(page);
    const length = await page.evaluate(() => history.length);
    await page.locator('body').press('2');
    await expect(page).toHaveURL(/[?&]m=b(&|$)/);
    await node(page, 'api-service').click();
    await expect(page).toHaveURL(/[?&]sel=n:api-service(&|$)/);
    await page.locator('.player-canvas-area .break-try-card', { hasText: 'Kill the Redis cache' }).click();
    await expect(page).toHaveURL(/[?&]a=/);
    expect(await page.evaluate(() => history.length)).toBe(length);

    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await page.goForward();
    await ready(page);
    await expect(root(page)).toHaveAttribute('data-player-mode', 'break');
    await expect(node(page, 'cache-redis')).toHaveClass(/cv-health-down/, { timeout: EFFECT_TIMEOUT });
  });

  test('without clipboard access, Share offers the link selected in a field', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('denied')) }, configurable: true });
    });
    await page.goto(`/solutions/${DIAGRAM}`);
    await ready(page);
    await page.locator('body').press('2');
    await page.locator('[data-share-button]:visible').click();
    const field = page.locator('[data-share-url]');
    await expect(field).toBeVisible();
    await expect(field).toHaveValue(new RegExp(`/solutions/${DIAGRAM}\\?s=1&r=\\d+&m=b`));
    expect(await field.evaluate((el: HTMLInputElement) => el.selectionEnd! - el.selectionStart!)).toBe(await field.evaluate((el: HTMLInputElement) => el.value.length));
    await page.keyboard.press('Escape');
    await expect(field).toBeHidden();
  });

  test('the keyboard shortcut copies too', async ({ page }) => {
    await page.goto(`/solutions/${DIAGRAM}`);
    await ready(page);
    await page.locator('body').press('ControlOrMeta+Shift+S');
    await expect(page.getByText('Link copied').first()).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(`/solutions/${DIAGRAM}`);
  });

  test('phone: the Share icon copies too', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/solutions/${DIAGRAM}`);
    await ready(page);
    const url = await share(page);
    expect(url).toContain(`/solutions/${DIAGRAM}`);
  });
});

test.describe('share links: axe', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`zero axe violations on a restored meltdown link, 1440/834/390, ${theme}`, async ({ page }) => {
      test.setTimeout(120000);
      await page.addInitScript((t) => window.localStorage.setItem('theme', t), theme);
      const log = encodeLog([
        [1, 'kill', 'no-such-node', null],
        [1.5, 'kill', 'cache-redis', null],
      ]);
      for (const [w, h] of [
        [1440, 900],
        [834, 1112],
        [390, 844],
      ] as const) {
        await page.setViewportSize({ width: w, height: h });
        await page.goto(`/solutions/${DIAGRAM}?s=1&r=0&m=b&sel=n:api-service&t=6&p=0&a=${log}`);
        await ready(page);
        await expect(page.getByText('This link was made on an older version of the diagram').first()).toBeVisible({ timeout: EFFECT_TIMEOUT });
        // Let the notice finish sliding in (axe reads colors mid-animation otherwise).
        await page.waitForTimeout(600);
        const results = await new AxeBuilder({ page }).analyze();
        if (results.violations.length > 0) console.log(theme, w, JSON.stringify(results.violations.map((v) => v.nodes.map((n) => [n.html, n.failureSummary])), null, 1));
        expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
      }
    });
  }
});
