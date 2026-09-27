import { test, expect, type Page } from '@playwright/test';

/**
 * T3.16 (board-fit review follow-up): numeric proof that the board
 * contain-fits its free area — both axes, capped at 1 (never upscale past
 * native size), centered, fully inside the free area — at each breakpoint,
 * and that it re-fits when the free area itself changes (rail collapsed,
 * inspector closed, the phone sheet dragged to a taller snap point). Also
 * proves the particle overlay canvas tracks the board's own rect after
 * every one of those refits — `InteractiveLayer`'s `ResizeObserver` used to
 * watch a box that didn't change size when `DrillStage`'s fit effect wrote
 * a new size onto the board element, leaving the canvas (and its particles)
 * stuck at the pre-refit rect.
 *
 * "Free area" is `.player-board-wrap`'s own rendered box, *inset by its own
 * 24px padding* (`globals.css` — so the board never sits flush against the
 * rail's border or the far viewport edge): the region below the HUD/toolbar
 * strip and above the timeline dock, with whatever width the rail/
 * inspector's *current* grid columns leave it (desktop), the full canvas
 * width (tablet — the inspector is an overlay there, though its width is
 * still reserved via padding so the board doesn't sit under it), or up to
 * the phone sheet's current top edge (`--player-sheet-peek` tracks the live
 * snap index, not just the lowest one).
 */

const TOLERANCE_PX = 2;
const WRAP_PADDING_PX = 24; // `.player-board-wrap`'s own CSS padding.

interface FreeBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

function insetBox(box: FreeBox, inset: number): FreeBox {
  return { x: box.x + inset, y: box.y + inset, width: box.width - 2 * inset, height: box.height - 2 * inset };
}

async function measureFit(page: Page) {
  const svg = page.locator('[data-drill-key=""] svg').first();
  const viewBox = await svg.getAttribute('viewBox');
  if (!viewBox) throw new Error('root level svg has no viewBox');
  const [, , wStr, hStr] = viewBox.split(' ');
  const nativeW = parseFloat(wStr);
  const nativeH = parseFloat(hStr);

  const wrapOuterBox = await page.locator('.player-board-wrap').boundingBox();
  if (!wrapOuterBox) throw new Error('.player-board-wrap has no box (not visible?)');
  const wrapBox = insetBox(wrapOuterBox, WRAP_PADDING_PX);

  const boardBox = await page.locator('[data-drill-key=""] > div').first().boundingBox();
  if (!boardBox) throw new Error('board element has no box');

  const canvasBox = await page.locator('.player-overlay-canvas').boundingBox();
  if (!canvasBox) throw new Error('.player-overlay-canvas has no box');

  return { nativeW, nativeH, wrapBox, wrapOuterBox, boardBox, canvasBox };
}

function expectFit({ nativeW, nativeH, wrapBox, boardBox, canvasBox }: Awaited<ReturnType<typeof measureFit>>) {
  const scale = Math.min(1, wrapBox.width / nativeW, wrapBox.height / nativeH);
  const expectedW = nativeW * scale;
  const expectedH = nativeH * scale;

  expect(boardBox.width, `board width (scale ${scale.toFixed(3)})`).toBeGreaterThanOrEqual(expectedW - TOLERANCE_PX);
  expect(boardBox.width).toBeLessThanOrEqual(expectedW + TOLERANCE_PX);
  expect(boardBox.height).toBeGreaterThanOrEqual(expectedH - TOLERANCE_PX);
  expect(boardBox.height).toBeLessThanOrEqual(expectedH + TOLERANCE_PX);

  // Centered within the free area.
  const wrapCenterX = wrapBox.x + wrapBox.width / 2;
  const wrapCenterY = wrapBox.y + wrapBox.height / 2;
  const boardCenterX = boardBox.x + boardBox.width / 2;
  const boardCenterY = boardBox.y + boardBox.height / 2;
  expect(Math.abs(boardCenterX - wrapCenterX)).toBeLessThanOrEqual(TOLERANCE_PX);
  expect(Math.abs(boardCenterY - wrapCenterY)).toBeLessThanOrEqual(TOLERANCE_PX);

  // Fully inside the free area (never overflowing into the rail/inspector/HUD/sheet).
  expect(boardBox.x).toBeGreaterThanOrEqual(wrapBox.x - TOLERANCE_PX);
  expect(boardBox.y).toBeGreaterThanOrEqual(wrapBox.y - TOLERANCE_PX);
  expect(boardBox.x + boardBox.width).toBeLessThanOrEqual(wrapBox.x + wrapBox.width + TOLERANCE_PX);
  expect(boardBox.y + boardBox.height).toBeLessThanOrEqual(wrapBox.y + wrapBox.height + TOLERANCE_PX);

  // Never upscaled past native size.
  expect(boardBox.width).toBeLessThanOrEqual(nativeW + TOLERANCE_PX);
  expect(boardBox.height).toBeLessThanOrEqual(nativeH + TOLERANCE_PX);

  // The particle overlay canvas must track the board's own rect exactly —
  // this is what a stale `ResizeObserver` target broke (particles drawn off
  // the links, over whatever used to be free space before a refit).
  expect(canvasBox.x).toBeGreaterThanOrEqual(boardBox.x - 1);
  expect(canvasBox.x).toBeLessThanOrEqual(boardBox.x + 1);
  expect(canvasBox.y).toBeGreaterThanOrEqual(boardBox.y - 1);
  expect(canvasBox.y).toBeLessThanOrEqual(boardBox.y + 1);
  expect(canvasBox.width).toBeGreaterThanOrEqual(boardBox.width - 1);
  expect(canvasBox.width).toBeLessThanOrEqual(boardBox.width + 1);
  expect(canvasBox.height).toBeGreaterThanOrEqual(boardBox.height - 1);
  expect(canvasBox.height).toBeLessThanOrEqual(boardBox.height + 1);
}

/** A settle wait matching how the orchestrator's own review measured (≥1.5s after the last interaction) — the fit effect and the canvas resize observer are both async (rAF/microtask-batched), and the panel-open transitions are 320ms. */
async function settle(page: Page) {
  await page.waitForTimeout(1500);
}

test.describe('player board fit — desktop (1440x900)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('default state (rail open, inspector closed)', async ({ page }) => {
    await page.goto('/solutions/url-shortener');
    await expect(page.locator('.player-board-wrap')).toBeVisible();
    await settle(page);
    expectFit(await measureFit(page));
  });

  test('inspector open (a node selected) — free area narrows to exclude its column, canvas follows', async ({ page }) => {
    await page.goto('/solutions/url-shortener');
    const before = await measureFit(page);
    await page.locator('[data-node-id]').first().click();
    await expect(page.getByRole('complementary', { name: 'Inspector' })).toBeVisible();
    await expect
      .poll(async () => (await page.locator('.player-board-wrap').boundingBox())?.width ?? 0)
      .toBeLessThan(before.wrapOuterBox.width - 100);
    await settle(page);
    expectFit(await measureFit(page));
  });

  test('rail collapsed (mod+B) — free area widens to reclaim the rail column, canvas follows', async ({ page }) => {
    await page.goto('/solutions/url-shortener');
    const before = await measureFit(page);
    await page.keyboard.down('Meta');
    await page.keyboard.press('b');
    await page.keyboard.up('Meta');
    // The rail's own column is expected to disappear (reclaimed for the canvas).
    await expect
      .poll(async () => (await page.locator('.player-board-wrap').boundingBox())?.width ?? 0)
      .toBeGreaterThan(before.wrapOuterBox.width + 100);
    await settle(page);
    expectFit(await measureFit(page));
  });

  test('rail collapsed AND inspector closed together, canvas follows', async ({ page }) => {
    await page.goto('/solutions/url-shortener');
    await page.locator('[data-node-id]').first().click();
    await page.keyboard.press('Escape'); // closes the inspector (selection cleared)
    await page.keyboard.down('Meta');
    await page.keyboard.press('b');
    await page.keyboard.up('Meta');
    // The rail toggle *button* is only rendered visible at tablet/phone
    // widths (desktop collapses via the shortcut only, matching the
    // prototype) — check the state via the shell's own data attribute instead.
    await expect(page.locator('.player-body')).toHaveAttribute('data-rail-open', 'false');
    await settle(page);
    expectFit(await measureFit(page));
  });
});

test.describe('player board fit — tablet (834x1112)', () => {
  test.use({ viewport: { width: 834, height: 1112 } });

  test('uses the full canvas width (inspector is an overlay, not a column)', async ({ page }) => {
    await page.goto('/solutions/url-shortener');
    await settle(page);
    expectFit(await measureFit(page));
  });

  test('re-fits to a narrower free area with the inspector open, canvas follows, and never sits under it', async ({ page }) => {
    await page.goto('/solutions/url-shortener');
    const before = await measureFit(page);
    await page.locator('[data-node-id]').first().click();
    await expect(page.getByRole('complementary', { name: 'Inspector' })).toBeVisible();

    // The inspector is a *visual* overlay (doesn't participate in layout on
    // its own), but the canvas area reserves its width anyway (`globals.css`)
    // so the board re-fits clear of it, same "nothing overlaps" rule as
    // everywhere else — not literally "the full canvas width" regardless of
    // the inspector, which the review comment offered as the simpler
    // alternative.
    const inspBox = await page.getByRole('complementary', { name: 'Inspector' }).boundingBox();
    expect(inspBox).not.toBeNull();
    // The canvas area's reserved-width transition (320ms, `globals.css`) needs
    // to settle before measuring, same as the rail-collapse case above.
    await expect
      .poll(async () => (await page.locator('.player-board-wrap').boundingBox())?.width ?? 0)
      .toBeLessThan(before.wrapOuterBox.width - 100);
    await settle(page);
    const after = await measureFit(page);
    expect(after.wrapBox.width).toBeLessThan(before.wrapBox.width - 100);
    expectFit(after);
    if (inspBox) {
      expect(after.boardBox.x + after.boardBox.width).toBeLessThanOrEqual(inspBox.x + TOLERANCE_PX);
      expect(after.canvasBox.x + after.canvasBox.width).toBeLessThanOrEqual(inspBox.x + TOLERANCE_PX);
    }
  });
});

test.describe('player board fit — phone (390x844)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('fits above the sheet at its default (12%) peek', async ({ page }) => {
    await page.goto('/solutions/url-shortener');
    await settle(page);
    expectFit(await measureFit(page));
  });

  test('re-fits to a smaller free area once the sheet is dragged to 50%, canvas follows', async ({ page }) => {
    await page.goto('/solutions/url-shortener');
    const before = await measureFit(page);

    const handle = page.getByRole('slider', { name: 'Resize sheet' });
    const box = await handle.boundingBox();
    if (!box) throw new Error('sheet grab handle not found');
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y - 300, { steps: 10 });
    await page.mouse.up();
    await expect(handle).toHaveAttribute('aria-valuetext', '50% of screen');
    await expect
      .poll(async () => (await page.locator('.player-board-wrap').boundingBox())?.height ?? 0)
      .toBeLessThan(before.wrapOuterBox.height - 100);
    await settle(page);

    const after = await measureFit(page);
    expect(after.wrapBox.height).toBeLessThan(before.wrapBox.height - 100);
    expectFit(after);

    // The board (and the canvas tracking it) must be entirely above the sheet's current top edge.
    const sheetBox = await page.locator('[role="dialog"]').boundingBox();
    if (sheetBox) {
      expect(after.boardBox.y + after.boardBox.height).toBeLessThanOrEqual(sheetBox.y + TOLERANCE_PX);
      expect(after.canvasBox.y + after.canvasBox.height).toBeLessThanOrEqual(sheetBox.y + TOLERANCE_PX);
    }
  });
});
