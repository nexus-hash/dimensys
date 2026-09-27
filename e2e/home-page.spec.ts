import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * S4.6a: the Home page. Covers structure (one h1, the hero embed, every
 * showcase section, real links) plus an axe pass at the three required
 * widths, in both themes.
 */

async function setTheme(page: Page, theme: 'light' | 'dark') {
  await page.addInitScript((t) => {
    window.localStorage.setItem('theme', t);
  }, theme);
}

async function runAxe(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  if (results.violations.length > 0) {
    console.log(JSON.stringify(results.violations, null, 2));
  }
  expect(results.violations).toEqual([]);
}

test.describe('Home', () => {
  test('has exactly one h1, the headline', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Step inside');
  });

  test('has main and contentinfo landmarks', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('contentinfo')).toBeVisible();
  });

  test('the hero embeds the live url-shortener board', async ({ page }) => {
    await page.goto('/');
    const hero = page.locator('[data-player-variant="hero"]');
    await expect(hero).toBeVisible();
    await expect(hero.locator('svg[aria-label]').first()).toBeVisible();
  });

  test('every showcase section renders with its heading', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /watch it fail/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /relive the outages/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /every step, explained/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /every meltdown will be a link/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /pick a system/i })).toBeVisible();
  });

  test('coming-soon sections show a pill, not a fake link', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Coming soon').first()).toBeVisible();
  });

  test('primary CTAs go to real routes', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /start breaking things/i }).first()).toHaveAttribute(
      'href',
      '/solutions/url-shortener',
    );
    await expect(page.getByRole('link', { name: /explore all systems/i }).first()).toHaveAttribute('href', '/explore');
  });

  test('the walkthrough section lists real story titles from the catalog', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Write Path (URL Creation)')).toBeVisible();
  });

  for (const viewport of [
    { name: '1440', width: 1440, height: 900 },
    { name: '834', width: 834, height: 1194 },
    { name: '390', width: 390, height: 844 },
  ]) {
    for (const theme of ['light', 'dark'] as const) {
      test(`no axe violations at ${viewport.name} (${theme})`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await setTheme(page, theme);
        await page.goto('/');
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await runAxe(page);
      });
    }
  }
});

test.describe('Home hero card (1440)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test.skip(({ isMobile }) => isMobile, 'desktop layout only');

  test('the board fills the card: height >= 0.4 x card width', async ({ page }) => {
    await page.goto('/');
    const card = await page.locator('[data-hero-card]').boundingBox();
    const board = await page.locator('[data-player-variant="hero"]').boundingBox();
    expect(card).not.toBeNull();
    expect(board).not.toBeNull();
    expect(board!.height).toBeGreaterThanOrEqual(0.4 * card!.width);
  });

  test('node titles render at a legible size', async ({ page }) => {
    await page.goto('/');
    const hero = page.locator('[data-player-variant="hero"]');
    // Wait for the camera fit (the board gets an explicit transform once fitted).
    await expect.poll(() => hero.locator('[data-drill-key=""] > *').first().evaluate((el) => (el as HTMLElement).style.transform)).toContain('scale');
    const px = await hero.locator('.cv-label').first().evaluate((el) => el.getBoundingClientRect().height);
    // A 13px title fitted into a ~690px card: at least half size.
    expect(px).toBeGreaterThanOrEqual(6.5);
  });

  test('has no zoom controls, tooltip or focusable nodes inside the hero', async ({ page }) => {
    await page.goto('/');
    const hero = page.locator('[data-player-variant="hero"]');
    await expect(hero.locator('svg[aria-label]').first()).toBeVisible();
    await page.waitForSelector('[data-hero-card] [data-sim-status]');
    await expect(hero.locator('.player-zoom-controls')).toHaveCount(0);
    await expect(hero.getByRole('button', { name: /zoom|fit/i })).toHaveCount(0);
    await expect(hero.locator('.player-tooltip')).toHaveCount(0);
    await expect(hero.locator('[tabindex="0"]')).toHaveCount(0);
  });

  test('clicking a node in the hero selects nothing', async ({ page }) => {
    await page.goto('/');
    const hero = page.locator('[data-player-variant="hero"]');
    await page.waitForSelector('[data-hero-card] [data-sim-status]');
    const box = (await hero.locator('[data-node-id]').first().boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(hero.locator('.is-selected')).toHaveCount(0);
    await expect(page).toHaveURL(/\/$/);
  });

  test('a wheel over the hero scrolls the page', async ({ page }) => {
    await page.goto('/');
    const hero = page.locator('[data-player-variant="hero"]');
    await page.waitForSelector('[data-hero-card] [data-sim-status]');
    const box = (await hero.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    const before = await page.evaluate(() => window.scrollY);
    await page.mouse.wheel(0, 400);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before);
  });

  test('nav links sit right after the wordmark', async ({ page }) => {
    await page.goto('/');
    const brand = (await page.locator('[data-nav-brand]').boundingBox())!;
    const links = (await page.locator('[data-nav-links]').boundingBox())!;
    const gap = links.x - (brand.x + brand.width);
    expect(gap).toBeGreaterThanOrEqual(0);
    expect(gap).toBeLessThanOrEqual(64);
  });

  test('no text in the hero card overflows its box', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-hero-card]')).toBeVisible();
    const overflows = await page.evaluate(() => {
      const card = document.querySelector('[data-hero-card]')!;
      const cardRect = card.getBoundingClientRect();
      const bad: string[] = [];
      // HTML text around the board: never clipped by its own box, never outside the card.
      for (const el of Array.from(card.querySelectorAll<HTMLElement>('*'))) {
        if (el instanceof SVGElement || el.closest('[data-player-variant="hero"]')) continue;
        const hasText = Array.from(el.childNodes).some((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim());
        if (!hasText) continue;
        const style = getComputedStyle(el);
        if (style.position === 'absolute' && el.classList.contains('sr-only')) continue;
        const r = el.getBoundingClientRect();
        if (style.textOverflow !== 'ellipsis' && el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0) bad.push(`clipped: ${el.textContent}`);
        if (r.left < cardRect.left - 0.5 || r.right > cardRect.right + 0.5) bad.push(`outside card: ${el.textContent}`);
      }
      // SVG text on the board: inside the board's own box.
      const board = card.querySelector('[data-player-variant="hero"]')!.getBoundingClientRect();
      for (const t of Array.from(card.querySelectorAll('[data-player-variant="hero"] text'))) {
        const r = t.getBoundingClientRect();
        if (r.width === 0) continue;
        if (r.left < board.left - 0.5 || r.right > board.right + 0.5 || r.top < board.top - 0.5 || r.bottom > board.bottom + 0.5) {
          bad.push(`outside board: ${t.textContent}`);
        }
      }
      return bad;
    });
    expect(overflows).toEqual([]);
  });
});

test.describe('Home at 390', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('nothing overflows horizontally and the card is full width', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-hero-card]')).toBeVisible();
    const { scrollW, clientW } = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
    }));
    expect(scrollW).toBeLessThanOrEqual(clientW);
    const card = (await page.locator('[data-hero-card]').boundingBox())!;
    expect(card.x).toBeLessThanOrEqual(16.5);
    expect(card.x + card.width).toBeGreaterThanOrEqual(390 - 16.5);
    await expect(page.getByRole('button', { name: /open menu/i })).toBeVisible();
  });
});
