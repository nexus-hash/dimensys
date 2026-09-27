import { test, expect } from '@playwright/test';

/**
 * T3.8: HUD tiles, requirement badges and playback controls, against the
 * real production runtime for a diagram that ships a simulation
 * (`url-shortener`). Covers: HUD values change over time, pause freezes
 * them, speed changes the sim clock's rate, badges render with accessible
 * text, and the phone sheet's Metrics tab carries the same content.
 *
 * The HUD strip and timeline dock are each mounted *twice* by the shell
 * (T3.16) — once in the top chrome (`HudTimelineFrame`, never hidden, at
 * any breakpoint), once again inside the phone bottom sheet's "Metrics" tab
 * (`PhoneSheet`, shown only below the `sm` breakpoint) — so a person on
 * phone can read live numbers from the sheet without looking past it at the
 * thin top strip. Both copies read the same shared store, so they always
 * agree; every selector below scopes to one instance explicitly
 * (`.player-canvas-area` for the always-present top strip, `[role="dialog"]`
 * for the phone sheet's copy) rather than counting `.hud-tile` unscoped,
 * which would double-count. Requirement badges render once more, in the
 * left rail's "Problem" section (`.player-rail`) — the phone sheet's own
 * Metrics tab carries its own copy for phone, where the rail is hidden.
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
    await expect(transport.getByText('2×', { exact: true })).toBeVisible();
  });

  test('requirement badges render (in the rail) with accessible pass/fail text, not color alone', async ({ page }) => {
    test.setTimeout(60000); // the pass/fail poll below can run up to 45s under a loaded host
    // The rail only renders (statically shown, not the phone/tablet overlay
    // drawer) at desktop widths — the "Mobile Chrome" project's own default
    // viewport is phone-sized, where the rail is CSS-hidden by design (its
    // content reaches phone through the bottom sheet's Metrics tab instead,
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

  test('phone: the bottom sheet Metrics tab shows the same HUD tiles and requirement badges', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await waitForReady(page);
    await page.getByRole('tab', { name: 'Metrics' }).click();
    const sheetTiles = page.locator('[role="dialog"] .hud-tile');
    await expect(sheetTiles.first()).toBeVisible({ timeout: READY_TIMEOUT });
    await expect(sheetTiles).toHaveCount(4);
    await expect(page.locator('[role="dialog"] .hud-req-badges > *').first()).toBeVisible();
  });
});
