import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * T3.8: HUD tiles, requirement badges and playback controls, against the
 * real production runtime for a diagram that ships a simulation
 * (`url-shortener`). Covers: HUD values change over time, pause freezes
 * them, speed changes the sim clock's rate, badges render with accessible
 * text, and the phone sheet's Live and Guide tabs carry the same content.
 *
 * The HUD strip and timeline dock are each mounted *twice* by the shell
 * (T3.16) — once in the top chrome (`HudTimelineFrame`, never hidden, at
 * any breakpoint), once again inside the phone bottom sheet's "Live" tab
 * (`PhoneSheet`, shown only below the `sm` breakpoint) — so a person on
 * phone can read live numbers from the sheet without looking past it at the
 * thin top strip. Both copies read the same shared store, so they always
 * agree; every selector below scopes to one instance explicitly
 * (`.player-canvas-area` for the always-present top strip, `[role="dialog"]`
 * for the phone sheet's copy) rather than counting `.hud-tile` unscoped,
 * which would double-count. Requirement badges render once more, in the
 * left rail's "Problem" section (`.player-rail`) — the phone sheet's own
 * Live and Guide tabs carry their own copy for phone, where the rail is hidden.
 */

const READY_TIMEOUT = 20000; // generous: shared/contended hosts can be slow to hydrate under load

async function waitForReady(page: import('@playwright/test').Page) {
  await page.goto('/solutions/url-shortener');
  await expect(page.locator('[data-player-root]')).toHaveAttribute('data-sim-status', 'ready', { timeout: READY_TIMEOUT });
}

test.describe('/solutions/url-shortener HUD + timeline', () => {
  test('HUD tiles render with a label, a live value and a growing sparkline', async ({ page }) => {
    await waitForReady(page);
    const tiles = page.locator('.player-canvas-area .hud-tile');
    await expect(tiles).toHaveCount(4, { timeout: READY_TIMEOUT });
    await expect(tiles.first()).toContainText('p99 latency'); // the url-shortener view's first gauge
    await expect(tiles.first().locator('svg[role="img"]')).toHaveCount(1); // the sparkline

    // The sim is playing by default (healthy autoplay): the sparkline's path
    // gains a point every frame, so its `d` attribute length only grows —
    // a robust "the HUD is live" signal that doesn't depend on any one
    // metric's displayed number happening to differ a second later.
    const sparkPath = tiles.first().locator('svg[role="img"] path').first();
    const before = (await sparkPath.getAttribute('d'))?.length ?? 0;
    await page.waitForTimeout(1500);
    const after = (await sparkPath.getAttribute('d'))?.length ?? 0;
    expect(after).toBeGreaterThan(before);
  });

  test('pause freezes the HUD values and Space toggles it back to running', async ({ page }) => {
    await waitForReady(page);
    const transport = page.locator('.player-canvas-area .player-timeline-slot');
    const playButton = transport.getByRole('button', { name: /Pause \(Space\)|Play \(Space\)/ });
    await expect(playButton).toBeVisible({ timeout: READY_TIMEOUT });

    // Ensure playing, then pause via the button.
    if ((await playButton.getAttribute('aria-label'))?.includes('Play')) await playButton.click();
    await expect(transport.getByRole('button', { name: 'Pause (Space)' })).toBeVisible();
    await playButton.click();
    await expect(transport.getByRole('button', { name: 'Play (Space)' })).toBeVisible();

    // One last frame can already be in flight when `pause` is sent (the
    // worker posts at its own 10Hz tick boundary, not synchronously with
    // the command) — settle past that before treating the value as frozen.
    await page.waitForTimeout(300);

    const tile = page.locator('.player-canvas-area .hud-tile').first();
    const frozen = await tile.textContent();
    await page.waitForTimeout(1200);
    expect(await tile.textContent()).toBe(frozen);

    // Space resumes play.
    await page.locator('.player-board-wrap').click(); // move focus off any button so Space doesn't just re-click it
    await page.keyboard.press('Space');
    await expect(transport.getByRole('button', { name: 'Pause (Space)' })).toBeVisible();
  });

  test('] increases speed and the sim clock label reflects it', async ({ page }) => {
    await waitForReady(page);
    const transport = page.locator('.player-canvas-area .player-timeline-slot');
    await page.locator('.player-board-wrap').click();
    await page.keyboard.press(']');
    // The clock readout carries a non-1× speed ("running 00:04 · 2×") at
    // every width; the speed button itself is desktop/tablet-only.
    await expect(transport.locator('.player-tl-run')).toContainText('· 2×');
    if ((page.viewportSize()?.width ?? 0) >= 640) await expect(transport.getByText('2×', { exact: true })).toBeVisible();
  });

  test('requirement badges render (in the rail) with accessible pass/fail text, not color alone', async ({ page }) => {
    test.setTimeout(60000); // the pass/fail poll below can run up to 45s under a loaded host
    // The rail only renders (statically shown, not the phone/tablet overlay
    // drawer) at desktop widths — the "Mobile Chrome" project's own default
    // viewport is phone-sized, where the rail is CSS-hidden by design (its
    // content reaches phone through the bottom sheet's Guide tab instead,
    // covered by the next test).
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForReady(page);
    const badges = page.locator('.player-rail .hud-req-badges > *');
    await expect(badges.first()).toBeVisible({ timeout: READY_TIMEOUT });
    await expect(page.locator('.player-rail .hud-req-badges')).toContainText(/not simulated/);

    // At least one badge settles to a pass/fail glyph — its accessible name
    // carries the state, not just the border color. This needs real sim
    // time to elapse (the watch tracks a live throughput/latency threshold),
    // which can take much longer than the page-ready budget under a loaded
    // CI host running the whole suite in parallel — poll well past that
    // rather than one-shot checking at `READY_TIMEOUT`.
    await expect
      .poll(
        async () =>
          page
            .locator('.player-rail .hud-req-badges [role="img"]')
            .evaluateAll((els) => els.some((e) => e.getAttribute('aria-label') === 'passing' || e.getAttribute('aria-label') === 'failing')),
        { timeout: 45000 },
      )
      .toBe(true);
  });

  test('phone: the bottom sheet Live tab shows the same HUD tiles, and its Guide tab the requirement badges', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await waitForReady(page);
    await page.getByRole('tab', { name: 'Live' }).click();
    const sheetTiles = page.locator('[role="dialog"] .hud-tile');
    await expect(sheetTiles.first()).toBeVisible({ timeout: READY_TIMEOUT });
    await expect(sheetTiles).toHaveCount(4);
    await page.getByRole('tab', { name: 'Guide' }).click();
    await expect(page.locator('[role="dialog"] .hud-req-badges > *').first()).toBeVisible();
  });
});

/** Number of points in a sparkline's line path (one `M`/`L` command per point). */
async function sparkPointCount(page: Page, tileIndex: number): Promise<number> {
  const d = await page
    .locator('.player-canvas-area .hud-tile')
    .nth(tileIndex)
    .locator('svg[role="img"] path[fill="none"]')
    .first()
    .getAttribute('d');
  return (d?.match(/[ML]/g) ?? []).length;
}

/**
 * HUDFIX: the chrome strip above the board is one compact row (HUD tiles,
 * then the zoom cluster), nothing floats over the diagram, and the height
 * the old two-row strip and the empty narration band used is the board's.
 */
test.describe('/solutions/url-shortener chrome strip + dock layout (1440x900)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  /** `.player-board-wrap` height at 1440x900 before this layout (app v3 at 8d5d23a): 577.4px. */
  const BOARD_HEIGHT_BEFORE = 577.4;

  test('the zoom cluster sits inside the strip and never overlaps the board', async ({ page }) => {
    await waitForReady(page);
    const strip = (await page.locator('.player-canvas-area .player-hud-strip').boundingBox())!;
    const zoom = page.locator('.player-hud-strip .player-zoom-controls');
    await expect(zoom).toBeVisible();
    await expect(page.locator('.player-board-wrap .player-zoom-controls')).toHaveCount(0);
    const z = (await zoom.boundingBox())!;
    const board = (await page.locator('.player-board-wrap').boundingBox())!;
    expect(z.y).toBeGreaterThanOrEqual(strip.y);
    expect(z.y + z.height).toBeLessThanOrEqual(strip.y + strip.height);
    expect(z.y + z.height, 'zoom cluster must end above the board').toBeLessThanOrEqual(board.y);
    for (const name of ['Zoom in', 'Zoom out', 'Fit to view']) {
      await expect(zoom.getByRole('button', { name })).toBeVisible();
    }
  });

  test('HUD tiles are compact (<= 48px tall) and the strip is one row', async ({ page }) => {
    await waitForReady(page);
    const tiles = page.locator('.player-canvas-area .hud-tile');
    await expect(tiles).toHaveCount(4, { timeout: READY_TIMEOUT });
    const tops = new Set<number>();
    for (let i = 0; i < 4; i++) {
      const box = (await tiles.nth(i).boundingBox())!;
      expect(box.height, `tile ${i} height`).toBeLessThanOrEqual(48);
      expect(box.width, `tile ${i} width`).toBeLessThanOrEqual(230.5);
      tops.add(Math.round(box.y));
    }
    expect(tops.size, 'all four tiles on one row').toBe(1);
    // No per-tile table link; one table for the whole HUD, for assistive tech.
    await expect(page.locator('.player-canvas-area .hud-tile').getByText('View as table')).toHaveCount(0);
    await expect(page.locator('.player-hud-slot table caption')).toHaveText('Live metrics, last 60 seconds');
    const strip = (await page.locator('.player-canvas-area .player-hud-strip').boundingBox())!;
    expect(strip.height).toBeLessThanOrEqual(66);
  });

  test('sparklines draw from the live history (>= 2 points after 3s of sim)', async ({ page }) => {
    await waitForReady(page);
    await page.waitForTimeout(3000);
    for (let i = 0; i < 4; i++) {
      expect(await sparkPointCount(page, i), `tile ${i} sparkline points`).toBeGreaterThanOrEqual(2);
    }
  });

  test('no requirement row in the rail has a line that is only a dash', async ({ page }) => {
    await waitForReady(page);
    const rows = page.locator('.player-rail .hud-req-badges > *');
    await expect(rows.first()).toBeVisible();
    const lines = await rows.evaluateAll((els) => els.flatMap((el) => (el as HTMLElement).innerText.split('\n').map((l) => l.trim())));
    expect(lines.filter((l) => /^[-–—]$/.test(l))).toEqual([]);
  });

  test('the board is taller than before (strip and dock sized to their content)', async ({ page }) => {
    await waitForReady(page);
    const board = (await page.locator('.player-board-wrap').boundingBox())!;
    const dock = (await page.locator('.player-canvas-area .player-timeline-dock').boundingBox())!;
    expect(dock.height, 'dock is one transport row').toBeLessThanOrEqual(60);
    expect(board.height, `board height (was ${BOARD_HEIGHT_BEFORE}px)`).toBeGreaterThan(BOARD_HEIGHT_BEFORE + 100);
  });

  test('the transport row reads LIVE with the running clock, and Reset (R) is at its far end', async ({ page }) => {
    await waitForReady(page);
    const row = page.locator('.player-canvas-area .player-timeline-slot');
    await expect(row.locator('.player-tl-live')).toContainText(/LIVE\s*running \d\d:\d\d/);
    const reset = row.getByRole('button', { name: 'Reset (R)' });
    await expect(reset).toBeVisible();
    const rowBox = (await row.boundingBox())!;
    const resetBox = (await reset.boundingBox())!;
    expect(rowBox.x + rowBox.width - (resetBox.x + resetBox.width)).toBeLessThanOrEqual(2);
  });
});

test.describe('/solutions/url-shortener phone HUD summary', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('one summary button expands the tiles into a 2x2 grid and the board re-fits', async ({ page }) => {
    await waitForReady(page);
    const summary = page.locator('.player-canvas-area .player-hud-summary');
    await expect(summary).toBeVisible();
    await expect(summary).toHaveAttribute('aria-expanded', 'false');
    await expect(summary).toContainText(/p99 .* ms/);
    await expect(page.locator('.player-canvas-area .hud-tile').first()).toBeHidden();
    const boardBefore = (await page.locator('.player-board-wrap').boundingBox())!;

    await summary.click();
    await expect(summary).toHaveAttribute('aria-expanded', 'true');
    const tiles = page.locator('.player-canvas-area .hud-tile');
    await expect(tiles.first()).toBeVisible();
    const boxes = await Promise.all([0, 1, 2, 3].map(async (i) => (await tiles.nth(i).boundingBox())!));
    expect(Math.round(boxes[0].y)).toBe(Math.round(boxes[1].y));
    expect(Math.round(boxes[2].y)).toBe(Math.round(boxes[3].y));
    expect(boxes[2].y).toBeGreaterThan(boxes[0].y);
    await expect
      .poll(async () => (await page.locator('.player-board-wrap').boundingBox())?.height ?? 0)
      .toBeLessThan(boardBefore.height - 40);
  });
});

/** axe, every rule (not just serious/critical), at the three reference viewports in both themes, after the sim has run. */
test.describe('/solutions/url-shortener player axe (light + dark)', () => {
  for (const scheme of ['light', 'dark'] as const) {
    for (const [name, viewport] of [
      ['1440', { width: 1440, height: 900 }],
      ['834', { width: 834, height: 1112 }],
      ['390', { width: 390, height: 844 }],
    ] as const) {
      test(`0 axe violations at ${name}, ${scheme}`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme });
        await page.setViewportSize(viewport);
        await waitForReady(page);
        await expect(page.locator('html')).toHaveAttribute('data-theme', scheme);
        await page.waitForTimeout(3000);
        const results = await new AxeBuilder({ page }).analyze();
        if (results.violations.length > 0) console.log(name, scheme, JSON.stringify(results.violations, null, 2));
        expect(results.violations).toEqual([]);
      });
    }
  }
});
