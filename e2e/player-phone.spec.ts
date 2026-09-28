import { test, expect, type Page, type CDPSession } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Phone and tablet chrome for /solutions/url-shortener.
 *
 * Phone (390×844, touch, the "Mobile Chrome" project): the mode menu in the
 * top bar, the bottom sheet's Live / Guide / Inspect / Fix it tabs (every
 * rail section reachable from Guide), the board's tall arrangement fitted to
 * the width with readable card titles, touch pan / pinch / double-tap on the
 * board while the sheet keeps its own scroll, Break it, a walkthrough and a
 * scenario checkpoint played end to end by touch, and 44px targets.
 *
 * Tablet (834×1112, the desktop "chromium" project): the top bar's three
 * groups never overlap, and the rail and inspector drawers open and close.
 *
 * axe at 390 and 834, light and dark.
 */

const DIAGRAM = 'url-shortener';
const STORY = 'cache-outage';
const READY_TIMEOUT = 20000;
const EFFECT_TIMEOUT = 15000;

const root = (page: Page) => page.locator('[data-player-root]');
const sheet = (page: Page) => page.locator('[role="dialog"]');
const stage = (page: Page) => page.locator('.player-board-stage');
const boardEl = (page: Page) => page.locator('[data-board-level] > div').first();

async function open(page: Page, path = `/solutions/${DIAGRAM}`) {
  await page.goto(path);
  await expect(root(page)).toHaveAttribute('data-sim-status', 'ready', { timeout: READY_TIMEOUT });
}

/** Opens the sheet's Guide tab and lets the sheet finish rising. */
async function openGuide(page: Page) {
  await sheet(page).getByRole('tab', { name: 'Guide' }).tap();
  await expect(page.getByRole('slider', { name: 'Resize sheet' })).not.toHaveAttribute('aria-valuenow', '0');
  await page.waitForTimeout(500);
}

async function pickMode(page: Page, name: string) {
  await page.locator('[data-mode-menu]').tap();
  await page.getByRole('menuitemradio', { name }).tap();
}

/** Real touch input through the DevTools protocol (the page sees touch events and touch-typed pointer events). */
async function touch(cdp: CDPSession, type: 'touchStart' | 'touchMove' | 'touchEnd', points: Array<{ x: number; y: number }>) {
  await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map((p, id) => ({ x: p.x, y: p.y, id })) });
}

async function swipe(cdp: CDPSession, from: { x: number; y: number }, to: { x: number; y: number }) {
  await touch(cdp, 'touchStart', [from]);
  for (let i = 1; i <= 8; i++) await touch(cdp, 'touchMove', [{ x: from.x + ((to.x - from.x) * i) / 8, y: from.y + ((to.y - from.y) * i) / 8 }]);
  await touch(cdp, 'touchEnd', []);
}

async function pinch(cdp: CDPSession, mid: { x: number; y: number }, fromHalf: number, toHalf: number) {
  const at = (h: number) => [{ x: mid.x - h, y: mid.y }, { x: mid.x + h, y: mid.y }];
  await touch(cdp, 'touchStart', at(fromHalf));
  for (let i = 1; i <= 8; i++) await touch(cdp, 'touchMove', at(fromHalf + ((toHalf - fromHalf) * i) / 8));
  await touch(cdp, 'touchEnd', []);
}

/** On-screen size of a card title at the current camera: font size × the board's rendered scale. */
async function titlePx(page: Page): Promise<{ scale: number; px: number }> {
  return page.evaluate(() => {
    const svg = document.querySelector<SVGSVGElement>('[data-board-level] svg')!;
    const scale = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width;
    const label = document.querySelector('[data-board-level] .cv-label')!;
    return { scale, px: parseFloat(getComputedStyle(label).fontSize) * scale };
  });
}

/** Every visible control in the player and its sheet that's smaller than 44×44 (SVG board elements and inline prose links excepted). */
async function smallTargets(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const sel = 'button, [role="tab"], [role="slider"], [role="checkbox"], [role="switch"], [role="menuitemradio"], a[href]';
    for (const el of document.querySelectorAll<HTMLElement>(`.player-shell :is(${sel}), [role="dialog"] :is(${sel}), [role="menu"] :is(${sel})`)) {
      if (el.closest('svg')) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'inline') continue;
      if (r.bottom <= 0 || r.top >= innerHeight) continue;
      if (r.width < 43.5 || r.height < 43.5) out.push(`${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 30)}" ${Math.round(r.width)}×${Math.round(r.height)}`);
    }
    return out;
  });
}

test.describe('phone (390×844, touch)', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test.beforeEach(async ({ browserName }, info) => {
    test.skip(info.project.name !== 'Mobile Chrome' || browserName !== 'chromium', 'phone project only');
  });

  test('the mode menu switches modes by touch, with Build shown as coming soon', async ({ page }) => {
    await open(page);
    await expect(page.locator('.player-mode-switcher')).toBeHidden();
    const menu = page.locator('[data-mode-menu]');
    await expect(menu).toBeVisible();
    await expect(menu).toHaveAccessibleName('Mode: Explore');

    await pickMode(page, 'Break it');
    await expect(root(page)).toHaveAttribute('data-player-mode', 'break');
    await expect(menu).toHaveAccessibleName('Mode: Break it');

    await pickMode(page, 'Walkthrough');
    await expect(root(page)).toHaveAttribute('data-player-mode', 'walkthrough');

    await menu.tap();
    const build = page.getByRole('menuitemradio', { name: /Build/ });
    await expect(build).toBeVisible();
    await expect(build).toHaveAttribute('aria-disabled', 'true');
    await expect(build).toContainText('Coming soon');
    await page.getByRole('menuitemradio', { name: 'Explore' }).tap();
    await expect(root(page)).toHaveAttribute('data-player-mode', 'explore');
  });

  test('every rail section is reachable from the sheet\'s Guide tab', async ({ page }) => {
    await open(page);
    await expect(page.locator('.player-rail')).toBeHidden();
    await openGuide(page);
    const panel = sheet(page).getByRole('tabpanel', { name: 'Guide' });
    for (const name of ['Problem', 'Request paths', 'Scenarios', 'Walkthroughs', 'Estimates']) {
      const section = panel.getByRole('region', { name });
      await section.scrollIntoViewIfNeeded();
      await expect(section, name).toBeVisible();
    }
    await expect(panel.locator('[data-rail-how]')).toHaveCount(1);
    await expect(panel.locator('.hud-req-badges > *').first()).toBeVisible();
    // Tapping a request path traces it on the board.
    const lane = panel.locator('[data-lane]').first();
    await lane.scrollIntoViewIfNeeded();
    await lane.tap();
    await expect(lane).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-board-level] .is-dimmed').first()).toBeAttached();
  });

  test('the board switches to its tall arrangement, fitted to the width, with titles of 11px or more', async ({ page }) => {
    await open(page);
    await expect(stage(page)).toHaveAttribute('data-board-shape', 'tall');
    const vb = await page.locator('[data-board-level] > div > svg').getAttribute('viewBox');
    const [, , w, h] = vb!.split(' ').map(Number);
    expect(h).toBeGreaterThan(w);
    await page.waitForTimeout(500);
    const { px } = await titlePx(page);
    expect(px, 'card title on screen at the fit').toBeGreaterThanOrEqual(11);
    // Particles ride the tall arrangement's paths: the overlay canvas sits on the board.
    const canvas = (await page.locator('.player-overlay-canvas').boundingBox())!;
    const wrap = (await page.locator('.player-board-wrap').boundingBox())!;
    expect(canvas.y).toBeGreaterThanOrEqual(wrap.y - 1);
    expect(canvas.width).toBeGreaterThan(300);
  });

  test('touch: one finger pans, two fingers pinch, a double tap fits, and the sheet keeps its own scroll', async ({ page }) => {
    await open(page);
    const cdp = await page.context().newCDPSession(page);
    const wrap = (await page.locator('.player-board-wrap').boundingBox())!;
    const fitBox = (await boardEl(page).boundingBox())!;

    // One finger: pans (down the tall board).
    await swipe(cdp, { x: wrap.x + wrap.width - 30, y: wrap.y + wrap.height - 40 }, { x: wrap.x + wrap.width - 30, y: wrap.y + 60 });
    await expect.poll(async () => (await boardEl(page).boundingBox())!.y).toBeLessThan(fitBox.y - 100);
    expect(await page.evaluate(() => document.scrollingElement!.scrollTop)).toBe(0);

    // Two fingers: zoom in about the midpoint.
    await pinch(cdp, { x: wrap.x + wrap.width / 2, y: wrap.y + wrap.height / 2 }, 40, 130);
    await expect.poll(async () => (await boardEl(page).boundingBox())!.width).toBeGreaterThan(fitBox.width * 1.4);

    // Double tap on empty canvas: back to the fit.
    const empty = { x: wrap.x + 16, y: wrap.y + wrap.height / 2 };
    await page.touchscreen.tap(empty.x, empty.y);
    await page.touchscreen.tap(empty.x, empty.y);
    await expect.poll(async () => Math.round((await boardEl(page).boundingBox())!.width)).toBe(Math.round(fitBox.width));
    await expect.poll(async () => Math.round((await boardEl(page).boundingBox())!.y)).toBe(Math.round(fitBox.y));

    // The sheet, raised and on its long Guide tab, scrolls under a finger; the board doesn't move.
    await sheet(page).getByRole('tab', { name: 'Guide' }).tap();
    const handle = page.getByRole('slider', { name: 'Resize sheet' });
    await handle.focus();
    await page.keyboard.press('End');
    await expect(handle).toHaveAttribute('aria-valuenow', '2');
    await page.waitForTimeout(400);
    const scroller = sheet(page).locator('> :last-child');
    const before = (await boardEl(page).boundingBox())!;
    const s = (await scroller.boundingBox())!;
    await swipe(cdp, { x: s.x + s.width / 2, y: s.y + s.height - 60 }, { x: s.x + s.width / 2, y: s.y + 80 });
    await expect.poll(async () => scroller.evaluate((el) => el.scrollTop)).toBeGreaterThan(50);
    const after = (await boardEl(page).boundingBox())!;
    expect(Math.round(after.y)).toBe(Math.round(before.y));
  });

  test('Break it by touch: kill Redis from the chips, then Fix it in the sheet', async ({ page }) => {
    await open(page);
    await pickMode(page, 'Break it');
    const chips = page.locator('.break-chips');
    await expect(chips).toBeVisible();
    await chips.getByRole('button', { name: 'Kill' }).tap();
    await expect(chips.getByRole('button', { name: 'Kill' })).toHaveAttribute('aria-pressed', 'true');
    const redis = page.locator('[data-node-id="cache-redis"]');
    await redis.scrollIntoViewIfNeeded();
    await redis.tap();
    await expect(redis).toHaveClass(/cv-health-down/, { timeout: EFFECT_TIMEOUT });

    await chips.getByRole('button', { name: 'Fix it' }).tap();
    await expect(sheet(page).getByRole('tab', { name: 'Fix it' })).toHaveAttribute('aria-selected', 'true');
    await expect(sheet(page).locator('.break-fixit')).toBeVisible();
    await expect(sheet(page).locator('.break-log')).toContainText('Killed Redis Cache');
    expect(await smallTargets(page)).toEqual([]);
  });

  test('a walkthrough picked from the sheet plays and steps by touch, framed on the tall board', async ({ page }) => {
    await open(page);
    await openGuide(page);
    const option = sheet(page).locator('[data-walkthrough] .wt-opt').first();
    await option.scrollIntoViewIfNeeded();
    await option.tap();
    await expect(root(page)).toHaveAttribute('data-player-mode', 'walkthrough');
    const narration = page.locator('.player-canvas-area [data-walkthrough-narration]');
    await expect(narration).toBeVisible();
    await expect(narration).toHaveAttribute('data-step', '1');
    await expect(stage(page)).toHaveAttribute('data-board-shape', 'tall');
    await narration.getByRole('button', { name: 'Next step' }).tap();
    await expect(narration).toHaveAttribute('data-step', '2');
    // The step's badge sits on its focused element in the tall arrangement.
    const badge = page.locator('[data-wt-badge]');
    await expect(badge).toHaveCount(1);
    const focused = page.locator('[data-board-level] .is-wt-focus').first().locator('.cv-body').first();
    const [b, f] = [(await badge.boundingBox())!, (await focused.boundingBox())!];
    // On a corner of it (top-left of a card, top-right of a frame).
    const [cx, cy] = [b.x + b.width / 2, b.y + b.height / 2];
    expect(Math.min(Math.abs(cx - f.x), Math.abs(cx - (f.x + f.width)))).toBeLessThan(4);
    expect(Math.abs(cy - f.y)).toBeLessThan(4);
  });

  test('a scenario started from the sheet asks its checkpoint question on the Live tab', async ({ page }) => {
    await open(page);
    await openGuide(page);
    const option = sheet(page).locator(`[data-scenario="${STORY}"] .story-opt`);
    await option.scrollIntoViewIfNeeded();
    await option.tap();
    await expect(root(page)).toHaveAttribute('data-sim-status', 'ready', { timeout: READY_TIMEOUT });
    await expect(page.locator('.player-canvas-area .player-scrubber')).toBeVisible();
    const thumb = page.locator('.player-canvas-area .player-scrubber [role="slider"]');
    await thumb.focus();
    await page.keyboard.press('End');
    const card = sheet(page).locator('[data-checkpoint]');
    await expect(card).toBeVisible();
    await expect(sheet(page).getByRole('tab', { name: 'Live' })).toHaveAttribute('aria-selected', 'true');
    await card.locator('[data-choice]').first().tap();
    await expect(card).toHaveCount(0);
    await expect(page.locator('.player-canvas-area [data-story-narration]')).toHaveAttribute('data-kind', 'outcome', { timeout: EFFECT_TIMEOUT });
  });

  test('every control is at least 44×44: top bar, strip, dock, sheet tabs and grabber, Guide tab, mode menu', async ({ page }) => {
    await open(page);
    expect(await smallTargets(page)).toEqual([]);
    await sheet(page).getByRole('tab', { name: 'Guide' }).tap();
    await page.getByRole('slider', { name: 'Resize sheet' }).focus();
    await page.keyboard.press('End');
    await page.waitForTimeout(400);
    expect(await smallTargets(page)).toEqual([]);
    await page.locator('[data-mode-menu]').tap();
    await expect(page.getByRole('menu')).toBeVisible();
    expect(await smallTargets(page)).toEqual([]);
  });
});

test.describe('tablet (834×1112)', () => {
  test.use({ viewport: { width: 834, height: 1112 } });
  test.beforeEach(async ({ browserName }, info) => {
    test.skip(info.project.name !== 'chromium' || browserName !== 'chromium', 'desktop project only');
  });

  test('the top bar\'s groups and controls never overlap', async ({ page }) => {
    await open(page);
    const boxes = await page.evaluate(() => {
      const bar = document.querySelector('.player-topbar')!;
      const els = [...bar.querySelectorAll<HTMLElement>('a[href], button, h1, [role="radio"], [role="tab"]')].filter((el) => el.getBoundingClientRect().width > 0);
      return {
        bar: bar.getBoundingClientRect().toJSON(),
        items: els.map((el) => ({ name: (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 24), r: el.getBoundingClientRect().toJSON(), inModes: !!el.closest('.player-topbar-modes') })),
        groups: ['.player-topbar-start', '.player-topbar-modes', '.player-topbar-end'].map((s) => bar.querySelector(s)!.getBoundingClientRect().toJSON()),
      };
    });
    type R = { left: number; right: number; top: number; bottom: number };
    const overlaps = (a: R, b: R) => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
    const [start, modes, end] = boxes.groups as R[];
    expect(overlaps(start, modes)).toBe(false);
    expect(overlaps(modes, end)).toBe(false);
    for (const it of boxes.items) {
      expect(it.r.right, `${it.name} inside the bar`).toBeLessThanOrEqual(boxes.bar.right + 0.5);
      expect(it.r.left).toBeGreaterThanOrEqual(boxes.bar.left - 0.5);
    }
    // No two controls overlap (a segment and its own switcher container aside).
    const leaves = boxes.items.filter((it) => it.name !== '');
    for (let i = 0; i < leaves.length; i++) {
      for (let j = i + 1; j < leaves.length; j++) {
        if (leaves[i].inModes && leaves[j].inModes) continue;
        expect(overlaps(leaves[i].r, leaves[j].r), `${leaves[i].name} × ${leaves[j].name}`).toBe(false);
      }
    }
    await expect(page.getByRole('radio', { name: /Build/ }).or(page.getByRole('tab', { name: /Build/ })).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Share' }).first()).toBeVisible();
  });

  test('the rail drawer and the inspector drawer open and close', async ({ page }) => {
    await open(page);
    const rail = page.locator('.player-rail');
    const toggle = page.getByRole('button', { name: 'Toggle left rail' });
    await toggle.click();
    await expect.poll(async () => (await rail.boundingBox())!.x).toBeGreaterThanOrEqual(-1);
    await page.getByRole('button', { name: 'Close rail overlay' }).click({ force: true });
    await expect.poll(async () => (await rail.boundingBox())!.x + (await rail.boundingBox())!.width).toBeLessThanOrEqual(1);

    await page.locator('[data-node-id="api-service"]').click();
    const inspector = page.getByRole('complementary', { name: 'Inspector' });
    await expect.poll(async () => (await inspector.boundingBox())!.x).toBeLessThan(834);
    const insp = (await inspector.boundingBox())!;
    await page.waitForTimeout(600);
    const board = (await boardEl(page).boundingBox())!;
    expect(board.x + board.width).toBeLessThanOrEqual(insp.x + 2);
    await inspector.getByRole('button', { name: 'Close inspector' }).click();
    await expect(page.locator('.player-body')).toHaveAttribute('data-inspector-open', 'false');
    // Closed: the canvas gets its full width back.
    await expect.poll(async () => (await page.locator('.player-board-wrap').boundingBox())!.width).toBeGreaterThan(800);
  });
});

test.describe('phone and tablet axe (light + dark)', () => {
  for (const scheme of ['light', 'dark'] as const) {
    for (const [name, viewport] of [
      ['390', { width: 390, height: 844 }],
      ['834', { width: 834, height: 1112 }],
    ] as const) {
      test(`0 axe violations at ${name}, ${scheme}`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme });
        await page.setViewportSize(viewport);
        await open(page);
        await expect(page.locator('html')).toHaveAttribute('data-theme', scheme);
        if (viewport.width < 640) {
          await sheet(page).getByRole('tab', { name: 'Guide' }).click();
          await page.waitForTimeout(400);
        }
        await page.waitForTimeout(800);
        const results = await new AxeBuilder({ page }).analyze();
        if (results.violations.length > 0) console.log(name, scheme, JSON.stringify(results.violations, null, 2));
        expect(results.violations).toEqual([]);
      });
    }
  }
});
