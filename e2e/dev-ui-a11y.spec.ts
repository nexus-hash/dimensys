import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * The dev gallery is the a11y test surface for the primitive layer.
 * Runs axe in both themes with zero serious/critical violations.
 *
 * Themes are set the way the app actually sets them: next-themes
 * (app/(components)/theme/ThemeProvider.tsx, `attribute="data-theme"`,
 * default storageKey `"theme"`) persists the choice in localStorage and
 * applies `data-theme` on `documentElement` itself on mount/hydration. Poking
 * the attribute post-navigation (the old approach) gets silently reverted by
 * next-themes, so every "dark" run was actually testing light. Seeding
 * localStorage via `addInitScript` before navigation, then asserting the
 * resolved attribute/token, makes the intended theme real and catches any
 * future regression of this.
 */
const DARK_BODY_BG = 'rgb(18, 18, 18)'; // --surface-page / --background, dark (#121212)
const LIGHT_BODY_BG = 'rgb(255, 255, 255)'; // --color-light-primary, light (#ffffff)

async function setTheme(page: Page, theme: 'light' | 'dark') {
  await page.addInitScript((t) => {
    window.localStorage.setItem('theme', t);
  }, theme);
}

async function assertThemeIsReal(page: Page, theme: 'light' | 'dark') {
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bodyBg).toBe(theme === 'dark' ? DARK_BODY_BG : LIGHT_BODY_BG);
}

async function runAxe(page: Page, disableRules: string[] = []) {
  let builder = new AxeBuilder({ page });
  if (disableRules.length > 0) {
    builder = builder.disableRules(disableRules);
  }
  const results = await builder.analyze();
  const seriousOrCritical = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  if (seriousOrCritical.length > 0) {
    console.log(JSON.stringify(seriousOrCritical, null, 2));
  }
  expect(seriousOrCritical).toEqual([]);
}

for (const theme of ['light', 'dark'] as const) {
  test(`/dev/ui has no serious/critical axe violations (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto('/dev/ui');
    await assertThemeIsReal(page, theme);
    await expect(page.getByRole('heading', { name: 'DS3 — UI primitives gallery' })).toBeVisible();

    await runAxe(page);
  });
}

/**
 * DS5: the canvas kit gallery (every node type × health state, links,
 * group frames, DSA cells/markers, an LLD card) is the a11y test surface for
 * the canvas layer. Same zero serious/critical bar, both themes.
 */
for (const theme of ['light', 'dark'] as const) {
  test(`/dev/ui/canvas has no serious/critical axe violations (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto('/dev/ui/canvas');
    await assertThemeIsReal(page, theme);
    await expect(page.getByRole('heading', { name: 'DS5 — Canvas visual kit gallery' })).toBeVisible();

    await runAxe(page);
  });
}

/**
 * DS4: the data-display kit gallery (StatTile, Meter, Sparkline,
 * DumbbellBars, HealthBadge, RequirementBadge — every state, plus a
 * streaming sparkline demo) is the a11y test surface for the HUD/chart
 * layer. Same zero serious/critical bar, both themes.
 */
for (const theme of ['light', 'dark'] as const) {
  test(`/dev/ui/data has no serious/critical axe violations (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto('/dev/ui/data');
    await assertThemeIsReal(page, theme);
    await expect(page.getByRole('heading', { name: 'DS4 — Data-display kit gallery' })).toBeVisible();

    await runAxe(page);
  });
}

/**
 * DS7: the command palette gallery, with the palette OPEN — a modal
 * combobox/listbox is a different a11y surface than the closed page (focus
 * trap, aria-activedescendant, listbox semantics), so it needs its own
 * axe pass rather than relying on the closed-page run above to cover it.
 */
for (const theme of ['light', 'dark'] as const) {
  test(`/dev/ui/command (palette open) has no serious/critical axe violations (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto('/dev/ui/command');
    await assertThemeIsReal(page, theme);
    await expect(page.getByRole('heading', { name: 'DS7 — Command palette gallery' })).toBeVisible();

    await page.getByRole('button', { name: /open command palette/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('combobox')).toBeFocused();

    await runAxe(page);
  });
}

/**
 * DS6: the motion gallery (every signature-moment preset with its
 * full-motion and reduced-motion variant, the number-roll demo, and the
 * view-transitions demo) is the a11y test surface for the motion layer.
 * Same zero serious/critical bar, both themes.
 */
for (const theme of ['light', 'dark'] as const) {
  test(`/dev/ui/motion has no serious/critical axe violations (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto('/dev/ui/motion');
    await assertThemeIsReal(page, theme);
    await expect(page.getByRole('heading', { name: 'DS6 — Motion gallery' })).toBeVisible();

    await runAxe(page);
  });
}

/**
 * DS8: the content gallery (server-rendered Markdown, CodeBlock and
 * AnnotatedCode, Shiki-highlighted, both themes) is the a11y test surface
 * for the content layer. Same zero serious/critical bar, both themes,
 * including `color-contrast`.
 *
 * That rule used to be disabled here: the light-theme Shiki token palette
 * (`github-light`) had real failures (e.g. `#e36209` on the `#fafafa` code
 * background, ~3.3:1, needs 4.5:1). The fix was a Shiki theme swap, not a
 * component change — see app/(components)/content/shiki.ts, which now uses
 * `github-light-high-contrast` (every token it defines for this app's
 * highlighted languages clears 4.5:1 against `#fafafa`; dark mode was
 * already passing and is unchanged). The flat `--brand`-as-text bug that
 * used to fail here too (headings/links/checkmarks using `text-brand`,
 * ~2.93:1, instead of the design system's dedicated `--brand-ink` text
 * token) was fixed earlier at the source (app/(components)/content/Markdown.tsx
 * and this page).
 */
for (const theme of ['light', 'dark'] as const) {
  test(`/dev/ui/content has no serious/critical axe violations (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto('/dev/ui/content');
    await assertThemeIsReal(page, theme);
    await expect(page.getByRole('heading', { name: 'DS8 — Content kit gallery' })).toBeVisible();

    await runAxe(page);
  });
}
