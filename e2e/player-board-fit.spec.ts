import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

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

/**
 * Every visible node's own rendered rect sits inside the free area (not
 * just the board's own bounding box, which is derived from the same
 * `viewBox` math — this checks the actual painted geometry). A few px of
 * slack accounts for stroke width around a node's rect extending past its
 * layout box, not layout error.
 */
async function expectNodesInsideFreeArea(page: Page, wrapBox: FreeBox) {
  const nodeTolerance = 4;
  const nodes = page.locator('[data-drill-key=""] [data-node-id]');
  const count = await nodes.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    const box = await nodes.nth(i).boundingBox();
    if (!box) continue;
    expect(box.x, `node ${i} left`).toBeGreaterThanOrEqual(wrapBox.x - nodeTolerance);
    expect(box.y, `node ${i} top`).toBeGreaterThanOrEqual(wrapBox.y - nodeTolerance);
    expect(box.x + box.width, `node ${i} right`).toBeLessThanOrEqual(wrapBox.x + wrapBox.width + nodeTolerance);
    expect(box.y + box.height, `node ${i} bottom`).toBeLessThanOrEqual(wrapBox.y + wrapBox.height + nodeTolerance);
  }
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
    const inspector = page.getByRole('complementary', { name: 'Inspector' });
    await expect(inspector).toBeVisible();

    // The inspector is a *visual* overlay (doesn't participate in layout on
    // its own), but the canvas area reserves its width anyway (`globals.css`)
    // so the board re-fits clear of it, same "nothing overlaps" rule as
    // everywhere else — not literally "the full canvas width" regardless of
    // the inspector, which the review comment offered as the simpler
    // alternative.
    const inspBox = await inspector.boundingBox();
    expect(inspBox).not.toBeNull();
    // `toBeVisible()` alone doesn't catch a panel pushed off-screen by its
    // own `transform` (still has a box, isn't `display:none` — Playwright
    // counts that as "visible") — this is exactly the bug a dropped CSS
    // rule caused here once already: the panel technically "visible" per
    // that definition while sitting past the viewport's right edge.
    if (inspBox) {
      expect(inspBox.x, 'inspector must be within the viewport, not pushed off by a stray transform').toBeLessThan(
        page.viewportSize()!.width,
      );
      expect(inspBox.width).toBeGreaterThan(200);
    }
    // The canvas area's reserved-width transition (320ms, `globals.css`) needs
    // to settle before measuring, same as the rail-collapse case above.
    await expect
      .poll(async () => (await page.locator('.player-board-wrap').boundingBox())?.width ?? 0)
      .toBeLessThan(before.wrapOuterBox.width - 100);
    await settle(page);
    const after = await measureFit(page);
    expect(after.wrapBox.width).toBeLessThan(before.wrapBox.width - 100);
    expectFit(after);
    await expectNodesInsideFreeArea(page, after.wrapBox);
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

/**
 * Pan/zoom camera (BG part 2b). Runs on both Playwright projects (desktop
 * `chromium` here — real `page.mouse`/`page.keyboard` drag and ctrl+wheel —
 * and `Mobile Chrome` below, via synthetic `PointerEvent`s dispatched
 * in-page with `pointerType: 'touch'`: `DrillStage`'s pan/pinch handlers are
 * plain Pointer Event listeners, so a dispatched touch-typed pointer event
 * exercises the exact same code path a real touchscreen would, without
 * needing hardware-level multi-touch injection).
 */
test.describe('player camera — pan/zoom (chromium, 1440x900)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  /**
   * An empty point inside the actual pan/zoom surface (`.player-drill-stage`,
   * `.player-board-wrap` *inset by its own 24px padding* — landing in that
   * padding hits the wrap's own background, not the stage, and nothing
   * happens), away from the top-left corner (never covered by chrome) and
   * clear of the zoom cluster parked bottom-right.
   */
  async function emptyCanvasPoint(page: Page): Promise<{ x: number; y: number }> {
    const wrap = (await page.locator('.player-board-wrap').boundingBox())!;
    return { x: wrap.x + WRAP_PADDING_PX + 30, y: wrap.y + WRAP_PADDING_PX + 30 };
  }

  test('drag on empty canvas pans the board rect by the drag delta', async ({ page }) => {
    await page.goto('/solutions/url-shortener');
    await settle(page);
    const before = (await page.locator('[data-drill-key=""] > div').first().boundingBox())!;
    const start = await emptyCanvasPoint(page);
    const dx = -120;
    const dy = 60;
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x + dx, start.y + dy, { steps: 10 });
    await page.mouse.up();
    const after = (await page.locator('[data-drill-key=""] > div').first().boundingBox())!;
    expect(after.x - before.x).toBeGreaterThanOrEqual(dx - TOLERANCE_PX);
    expect(after.x - before.x).toBeLessThanOrEqual(dx + TOLERANCE_PX);
    expect(after.y - before.y).toBeGreaterThanOrEqual(dy - TOLERANCE_PX);
    expect(after.y - before.y).toBeLessThanOrEqual(dy + TOLERANCE_PX);
  });

  test('ctrl+wheel zooms about the cursor: the point under it stays put', async ({ page }) => {
    await page.goto('/solutions/url-shortener');
    await settle(page);
    const node = page.locator('[data-node-id]').first();
    const nodeBoxBefore = (await node.boundingBox())!;
    const cursor = { x: nodeBoxBefore.x + nodeBoxBefore.width / 2, y: nodeBoxBefore.y + nodeBoxBefore.height / 2 };

    await page.mouse.move(cursor.x, cursor.y);
    await page.keyboard.down('Control');
    await page.mouse.wheel(0, -120); // negative deltaY: zoom in, one moderate tick (not slammed into the 4× clamp)
    await page.keyboard.up('Control');
    await settle(page);

    const nodeBoxAfter = (await node.boundingBox())!;
    const centerBefore = { x: nodeBoxBefore.x + nodeBoxBefore.width / 2, y: nodeBoxBefore.y + nodeBoxBefore.height / 2 };
    const centerAfter = { x: nodeBoxAfter.x + nodeBoxAfter.width / 2, y: nodeBoxAfter.y + nodeBoxAfter.height / 2 };
    // The spec's own "±3px" is the intent (the point reads as fixed to the
    // eye); the extra 1px here covers real subpixel rendering/rounding
    // between the JS-computed transform and the browser's own layout box,
    // not drift in the zoom-about-point math itself (unit-tested exactly in
    // `camera.test.ts`).
    expect(Math.abs(centerAfter.x - centerBefore.x)).toBeLessThanOrEqual(4);
    expect(Math.abs(centerAfter.y - centerBefore.y)).toBeLessThanOrEqual(4);
    // Actually zoomed (not a no-op): the node grew.
    expect(nodeBoxAfter.width).toBeGreaterThan(nodeBoxBefore.width * 1.05);

    // The overlay canvas tracks the (now zoomed) board, clipped to the free
    // area — it may be *smaller* than the board's own rect once the board
    // outgrows the wrap (see the dedicated clip test below), but never sits
    // off from where the board and the wrap actually overlap.
    const boardBox = (await page.locator('[data-drill-key=""] > div').first().boundingBox())!;
    const wrapBox = (await page.locator('.player-board-wrap').boundingBox())!;
    const canvasBox = (await page.locator('.player-overlay-canvas').boundingBox())!;
    const expectedLeft = Math.max(boardBox.x, wrapBox.x);
    const expectedRight = Math.min(boardBox.x + boardBox.width, wrapBox.x + wrapBox.width);
    expect(Math.abs(canvasBox.x - expectedLeft)).toBeLessThanOrEqual(1);
    expect(Math.abs(canvasBox.x + canvasBox.width - expectedRight)).toBeLessThanOrEqual(1);
  });

  test('at 400% zoom, the overlay canvas is clipped to the board-wrap region, not the (now larger) board rect', async ({ page }) => {
    await page.goto('/solutions/url-shortener');
    await settle(page);
    const wrapBox = (await page.locator('.player-board-wrap').boundingBox())!;
    const cursor = { x: wrapBox.x + wrapBox.width / 2, y: wrapBox.y + wrapBox.height / 2 };
    await page.mouse.move(cursor.x, cursor.y);
    await page.keyboard.down('Control');
    await page.mouse.wheel(0, -600); // clamped to the 4× ceiling — reliably bigger than the wrap.
    await page.keyboard.up('Control');
    await settle(page);

    const boardBox = (await page.locator('[data-drill-key=""] > div').first().boundingBox())!;
    const canvasBox = (await page.locator('.player-overlay-canvas').boundingBox())!;
    // The board itself now overflows the wrap...
    expect(boardBox.width).toBeGreaterThan(wrapBox.width);
    // ...but the overlay canvas — and so every particle it draws — never does.
    expect(canvasBox.x).toBeGreaterThanOrEqual(wrapBox.x - TOLERANCE_PX);
    expect(canvasBox.y).toBeGreaterThanOrEqual(wrapBox.y - TOLERANCE_PX);
    expect(canvasBox.x + canvasBox.width).toBeLessThanOrEqual(wrapBox.x + wrapBox.width + TOLERANCE_PX);
    expect(canvasBox.y + canvasBox.height).toBeLessThanOrEqual(wrapBox.y + wrapBox.height + TOLERANCE_PX);
  });

  test('Fit restores the fitted rect after a pan and a zoom', async ({ page }) => {
    await page.goto('/solutions/url-shortener');
    await settle(page);
    const start = await emptyCanvasPoint(page);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x - 80, start.y - 40, { steps: 5 });
    await page.mouse.up();
    await page.keyboard.down('Control');
    await page.mouse.wheel(0, -400);
    await page.keyboard.up('Control');
    await settle(page);

    await page.getByRole('button', { name: 'Fit to view' }).click();
    await settle(page);
    expectFit(await measureFit(page));
  });

  test('a node click still selects it after an earlier pan elsewhere', async ({ page }) => {
    await page.goto('/solutions/url-shortener');
    await settle(page);
    const start = await emptyCanvasPoint(page);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x - 60, start.y - 30, { steps: 5 });
    await page.mouse.up();
    await settle(page);

    await page.locator('[data-node-id]').first().click();
    await expect(page.getByRole('complementary', { name: 'Inspector' })).toBeVisible();
  });

  test('+/-/0 keyboard shortcuts zoom and fit', async ({ page }) => {
    await page.goto('/solutions/url-shortener');
    await settle(page);
    const readout = page.locator('.player-zoom-readout');
    const initial = await readout.textContent();
    await page.keyboard.press('+');
    await settle(page);
    expect(await readout.textContent()).not.toBe(initial);
    await page.keyboard.press('0');
    await settle(page);
    expect(await readout.textContent()).toBe(initial);
  });

  test('pan is clamped: the board can never be dragged entirely offscreen, and Fit always recovers', async ({ page }) => {
    await page.goto('/solutions/url-shortener');
    await settle(page);
    const wrapBox = (await page.locator('.player-board-wrap').boundingBox())!;
    const start = await emptyCanvasPoint(page);
    // Several large drags in the same direction, well past any single-drag reach.
    for (let i = 0; i < 6; i++) {
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      await page.mouse.move(start.x - 2000, start.y - 2000, { steps: 3 });
      await page.mouse.up();
    }
    await settle(page);
    const boardBox = (await page.locator('[data-drill-key=""] > div').first().boundingBox())!;
    // At least a sliver of the board must still overlap the wrap on both axes.
    const overlapX = Math.min(boardBox.x + boardBox.width, wrapBox.x + wrapBox.width) - Math.max(boardBox.x, wrapBox.x);
    const overlapY = Math.min(boardBox.y + boardBox.height, wrapBox.y + wrapBox.height) - Math.max(boardBox.y, wrapBox.y);
    expect(overlapX).toBeGreaterThan(0);
    expect(overlapY).toBeGreaterThan(0);

    await page.getByRole('button', { name: 'Fit to view' }).click();
    await settle(page);
    expectFit(await measureFit(page));
  });
});

test.describe('player camera — touch pan/pinch (Mobile Chrome emulation, 390x844)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  /** Dispatches a synthetic touch-typed Pointer Events sequence in-page — see the describe block's own comment above for why this stands in for real hardware multi-touch. */
  async function touchDrag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
    await page.evaluate(
      ([fx, fy, tx, ty]) => {
        const el = document.querySelector('.player-drill-stage')!;
        const fire = (type: string, x: number, y: number, id: number) =>
          el.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, cancelable: true }));
        fire('pointerdown', fx, fy, 1);
        const steps = 6;
        for (let i = 1; i <= steps; i++) {
          fire('pointermove', fx + ((tx - fx) * i) / steps, fy + ((ty - fy) * i) / steps, 1);
        }
        fire('pointerup', tx, ty, 1);
      },
      [from.x, from.y, to.x, to.y],
    );
  }

  /** Dispatches a synthetic two-finger pinch (touch pointer ids 1 and 2) about a fixed midpoint. */
  async function touchPinch(page: Page, mid: { x: number; y: number }, startHalfSpan: number, endHalfSpan: number) {
    await page.evaluate(
      ([mx, my, startSpan, endSpan]) => {
        const el = document.querySelector('.player-drill-stage')!;
        const fire = (type: string, x: number, y: number, id: number) =>
          el.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, cancelable: true }));
        fire('pointerdown', mx - startSpan, my, 1);
        fire('pointerdown', mx + startSpan, my, 2);
        const steps = 6;
        for (let i = 1; i <= steps; i++) {
          const span = startSpan + ((endSpan - startSpan) * i) / steps;
          fire('pointermove', mx - span, my, 1);
          fire('pointermove', mx + span, my, 2);
        }
        fire('pointerup', mx - endSpan, my, 1);
        fire('pointerup', mx + endSpan, my, 2);
      },
      [mid.x, mid.y, startHalfSpan, endHalfSpan],
    );
  }

  test('a one-finger touch drag pans the board', async ({ page }) => {
    await page.goto('/solutions/url-shortener');
    await settle(page);
    const wrap = (await page.locator('.player-board-wrap').boundingBox())!;
    const before = (await page.locator('[data-drill-key=""] > div').first().boundingBox())!;
    const from = { x: wrap.x + wrap.width - 20, y: wrap.y + wrap.height - 20 };
    await touchDrag(page, from, { x: from.x - 50, y: from.y - 30 });
    await settle(page);
    const after = (await page.locator('[data-drill-key=""] > div').first().boundingBox())!;
    expect(after.x).not.toBeCloseTo(before.x, 0);
  });

  test('a two-finger touch pinch zooms about the midpoint', async ({ page }) => {
    await page.goto('/solutions/url-shortener');
    await settle(page);
    const wrap = (await page.locator('.player-board-wrap').boundingBox())!;
    const mid = { x: wrap.x + wrap.width / 2, y: wrap.y + wrap.height / 2 };
    const before = (await page.locator('[data-drill-key=""] > div').first().boundingBox())!;
    await touchPinch(page, mid, 40, 140);
    await settle(page);
    const after = (await page.locator('[data-drill-key=""] > div').first().boundingBox())!;
    expect(after.width).toBeGreaterThan(before.width * 1.2);
  });
});

/** Standalone axe pass (BG owner review) at the three reference viewports, on the real full player (not just the dev fixture `player-drilldown.spec.ts` already covers). */
test.describe('player camera — axe', () => {
  for (const [name, viewport] of [
    ['1440', { width: 1440, height: 900 }],
    ['834', { width: 834, height: 1112 }],
    ['390', { width: 390, height: 844 }],
  ] as const) {
    test(`no serious/critical axe violations at ${name}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/solutions/url-shortener');
      await settle(page);
      const results = await new AxeBuilder({ page }).analyze();
      const seriousOrCritical = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      if (seriousOrCritical.length > 0) console.log(JSON.stringify(seriousOrCritical, null, 2));
      expect(seriousOrCritical).toEqual([]);
    });
  }
});
