import { test, expect, type Page } from '@playwright/test';

/**
 * Visual regression baselines for every /dev/ui gallery page, in both
 * themes. These are the pages the DG design-system gate reviews against the
 * prototype and the UI/UX spec, so a baseline here is a frozen "this is what
 * shipped" reference for each kit.
 *
 * Determinism:
 *   - `test.use({ colorScheme, reducedMotion: 'reduce' })` below freezes CSS
 *     transitions/animations globally (see the `prefers-reduced-motion`
 *     block in app/globals.css) — the same mechanism the app's own motion
 *     kit honors (see app/(components)/ui/useReducedMotion.ts).
 *   - The DS6 motion gallery additionally has a JS-driven (rAF/spring) demo
 *     that CSS alone can't freeze, gated behind its own "Reduced motion"
 *     switch (component state, independent of the OS setting) — the test
 *     below clicks it before capturing.
 *   - The DS4 "streaming" StatTile now pauses its `setInterval` under
 *     reduced motion (app/dev/ui/data/DataGallery.tsx `StreamingStat`), so
 *     no live-updating numbers land in the bitmap.
 *   - `preparePage` neutralizes text-input carets and text selection, which
 *     Playwright's `reducedMotion` context option does not touch.
 *   - Theme is seeded via localStorage before navigation — see
 *     dev-ui-a11y.spec.ts's file comment for why this (not poking
 *     `data-theme` post-navigation) is the only way that actually sticks.
 *
 * Baselines are platform-suffixed by Playwright's default snapshot naming
 * (`{arg}-{projectName}-{platform}{ext}`) and were generated on this
 * WSL/Linux dev machine, not inside a container. Font rasterization can
 * differ subtly from `ubuntu-latest` (different fontconfig/freetype even
 * though `process.platform` reports "linux" in both places); `maxDiffPixelRatio`
 * is set generously enough to absorb anti-aliasing drift while still
 * catching real regressions. See docs/DEV_UI_SCREENSHOTS.md for the
 * `--update-snapshots` workflow if CI ever drifts past that threshold.
 */

test.use({ reducedMotion: 'reduce' });

const GALLERY_PAGES = [
  { path: '/dev/ui', heading: 'DS3 — UI primitives gallery', name: 'ds3-primitives' },
  { path: '/dev/ui/canvas', heading: 'DS5 — Canvas visual kit gallery', name: 'ds5-canvas' },
  { path: '/dev/ui/data', heading: 'DS4 — Data-display kit gallery', name: 'ds4-data' },
  { path: '/dev/ui/motion', heading: 'DS6 — Motion gallery', name: 'ds6-motion' },
  { path: '/dev/ui/command', heading: 'DS7 — Command palette gallery', name: 'ds7-command' },
  { path: '/dev/ui/content', heading: 'DS8 — Content kit gallery', name: 'ds8-content' },
] as const;

async function setTheme(page: Page, theme: 'light' | 'dark') {
  await page.addInitScript((t) => {
    window.localStorage.setItem('theme', t);
  }, theme);
}

async function assertThemeIsReal(page: Page, theme: 'light' | 'dark') {
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
}

/** Freezes the things `reducedMotion: 'reduce'` doesn't reach. */
async function preparePage(page: Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        caret-color: transparent !important;
      }
      ::selection {
        background: transparent !important;
      }
    `,
  });
  await page.evaluate(() => document.fonts.ready);
}

for (const { path, heading, name } of GALLERY_PAGES) {
  for (const theme of ['light', 'dark'] as const) {
    test(`${name} gallery screenshot (${theme})`, async ({ page }) => {
      await setTheme(page, theme);
      await page.goto(path);
      await assertThemeIsReal(page, theme);
      await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();

      if (name === 'ds7-command') {
        // The shortcut registry populates via a `useEffect` (see
        // app/(components)/command/useShortcut.ts), so the very first paint
        // can still show "Nothing registered." — wait for that to settle
        // before capturing, or the page's height (and the bitmap) varies
        // run to run depending on how fast that effect flushes.
        await expect(page.getByText('Nothing registered.')).toHaveCount(0);
      }

      if (name === 'ds6-motion') {
        // Freezes the JS spring/rAF demo (gated on its own "Reduced motion"
        // switch, independent of the OS-level setting `reducedMotion: 'reduce'`
        // above already satisfies for the CSS-driven stages).
        const reducedSwitch = page.getByRole('switch', { name: 'Reduced motion', exact: true });
        await reducedSwitch.click();
        await expect(reducedSwitch).toHaveAttribute('aria-checked', 'true');
      }

      await preparePage(page);

      await expect(page).toHaveScreenshot(`${name}-${theme}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });
  }
}
