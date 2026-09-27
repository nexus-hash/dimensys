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
 *   - `preparePage` also force-hides `<nextjs-portal>`, the Next.js
 *     dev-tools indicator/issues overlay, which is `position: fixed` on
 *     `<body>` — with `fullPage: true` a tall page's screenshot can catch it
 *     pinned partway down the bitmap instead of in its usual corner,
 *     wherever its fixed viewport offset happened to land in the full
 *     capture. It used to show up as a stray "N … Issue" badge baked into
 *     a few baselines. Each test below also asserts zero `console.error`
 *     calls during the whole page lifecycle, so a real underlying issue
 *     (the kind that overlay exists to report) fails loudly instead of
 *     just getting visually hidden.
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

/**
 * Freezes the things `reducedMotion: 'reduce'` doesn't reach, and hides the
 * Next.js dev-tools portal (the floating "N" indicator/issues badge — see
 * the file comment) so it can never land in a baseline bitmap again. It's a
 * custom element (`<nextjs-portal>`) with its own shadow root mounted
 * directly on `<body>`, so a plain `display: none` on the host from the
 * outer document's stylesheet hides the whole thing — no shadow-DOM
 * piercing needed. This only affects what the screenshot captures; the dev
 * overlay itself (and any real build/runtime error it would still surface)
 * is untouched.
 */
async function preparePage(page: Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        caret-color: transparent !important;
      }
      ::selection {
        background: transparent !important;
      }
      nextjs-portal {
        display: none !important;
      }
    `,
  });
  await page.evaluate(() => document.fonts.ready);
}

for (const { path, heading, name } of GALLERY_PAGES) {
  for (const theme of ['light', 'dark'] as const) {
    test(`${name} gallery screenshot (${theme})`, async ({ page }) => {
      // Attached before navigation so it catches anything logged during the
      // initial load/hydration, not just after — see the file comment on
      // the Next.js dev-tools indicator this suite used to capture.
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

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
        // Playwright's own default (`caret: 'hide'`) transiently inserts and
        // removes its own caret-hiding stylesheet right around the capture.
        // On DS3 specifically (the only gallery with real `<input>`s, plus a
        // Radix `Slider`, which mounts a hidden native "bubble input" — see
        // app/(components)/ui/Slider.tsx — to mirror value changes as native
        // DOM events), that transient extra style churn reliably triggered a
        // real React hydration-consistency warning on the bubble input's
        // `style` attribute, logged as a `console.error` (and, on a human's
        // screen, the Next.js dev-tools "Issues" indicator this suite used
        // to also capture). `preparePage` already freezes carets with its
        // own permanent stylesheet rule, so Playwright's redundant transient
        // one is disabled here rather than worked around.
        caret: 'initial',
      });

      expect(consoleErrors).toEqual([]);
    });
  }
}
