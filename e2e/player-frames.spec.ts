import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Group frames: a group's nodes are drawn inline on the one board, inside a
 * labelled dashed frame whose tab opens the group's own detail panel. There
 * is no collapsed card, no way into or out of a group, and the breadcrumb is
 * just Explore › the diagram title.
 */

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Geometry {
  frames: Array<{ id: string; body: Rect; tab: Rect | null }>;
  nodes: Array<{ id: string; body: Rect }>;
}

async function settle(page: Page) {
  await page.waitForTimeout(1500);
}

/** Every frame's and node's box in the board's own units (screen px divided by the camera scale). */
async function boardGeometry(page: Page): Promise<Geometry> {
  return page.evaluate(() => {
    const svg = document.querySelector<SVGSVGElement>('[data-board-level] svg')!;
    const svgRect = svg.getBoundingClientRect();
    const scale = svgRect.width / svg.viewBox.baseVal.width;
    const toBoard = (el: Element | null) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: (r.x - svgRect.x) / scale, y: (r.y - svgRect.y) / scale, w: r.width / scale, h: r.height / scale };
    };
    return {
      frames: [...svg.querySelectorAll('[data-frame-id]')].map((f) => ({
        id: f.getAttribute('data-frame-id')!,
        body: toBoard(f.querySelector('.cv-body'))!,
        tab: toBoard(f.querySelector('.cv-tab')),
      })),
      nodes: [...svg.querySelectorAll('[data-node-id]')].map((n) => ({
        id: n.getAttribute('data-node-id')!,
        body: toBoard(n.querySelector('.cv-inner .cv-body') ?? n.querySelector('.cv-body'))!,
      })),
    };
  });
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** The view data's own frames (`holds`) and drawn blocks, from the page's static JSON route. */
async function viewBoard(page: Page) {
  const res = await page.request.get('/solutions/url-shortener/diagram.json');
  expect(res.ok()).toBe(true);
  const view = await res.json();
  return view.board as { blocks: Array<{ id: string; box?: number[] }>; frames?: Array<{ id: string; holds: string[] }> };
}

test.describe('player group frames (url-shortener)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/solutions/url-shortener');
    await expect(page.locator('[data-board-level] svg').first()).toBeVisible();
    await settle(page);
  });

  test('every node, a group’s children included, is rendered in the one main view', async ({ page }) => {
    const board = await viewBoard(page);
    expect(board.frames?.length ?? 0).toBeGreaterThan(0);
    await expect(page.locator('[data-board-level]')).toHaveCount(1);
    for (const block of board.blocks.filter((b) => b.box)) {
      await expect(page.locator(`[data-board-level] [data-node-id="${block.id}"]`)).toBeVisible();
    }
    for (const frame of board.frames!) {
      await expect(page.locator(`[data-frame-id="${frame.id}"]`)).toBeVisible();
      for (const id of frame.holds) await expect(page.locator(`[data-board-level] [data-node-id="${id}"]`)).toBeVisible();
    }
  });

  test('each frame’s box contains all its children with at least 12px padding', async ({ page }) => {
    const board = await viewBoard(page);
    const geo = await boardGeometry(page);
    for (const frame of board.frames!) {
      const f = geo.frames.find((g) => g.id === frame.id)!.body;
      for (const id of frame.holds) {
        const n = geo.nodes.find((g) => g.id === id)!.body;
        const pad = Math.min(n.x - f.x, n.y - f.y, f.x + f.w - (n.x + n.w), f.y + f.h - (n.y + n.h));
        expect(pad, `${id} inside ${frame.id}`).toBeGreaterThanOrEqual(12 - 0.5);
      }
    }
  });

  test('no node overlaps a frame (or its tab) it isn’t inside', async ({ page }) => {
    const board = await viewBoard(page);
    const geo = await boardGeometry(page);
    for (const frame of board.frames!) {
      const g = geo.frames.find((x) => x.id === frame.id)!;
      for (const node of geo.nodes) {
        if (frame.holds.includes(node.id)) continue;
        expect(overlaps(node.body, g.body), `${node.id} vs frame ${frame.id}`).toBe(false);
        if (g.tab) expect(overlaps(node.body, g.tab), `${node.id} vs tab of ${frame.id}`).toBe(false);
      }
    }
  });

  test('the breadcrumb has exactly 2 items: Explore › the diagram title', async ({ page }) => {
    const items = page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('listitem');
    await expect(items).toHaveCount(2);
    await expect(items.nth(1)).toHaveText('URL Shortener System Design');
  });

  test('no drill or expand control exists; the tab is the frame’s only control', async ({ page }) => {
    await expect(page.locator('[data-subsystem-tab-id], [data-child-ids], .cv-expand, .cv-subsystem-card, [data-drill-key]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /enter .* subsystem|expand|drill/i })).toHaveCount(0);
    const frame = page.locator('[data-frame-id]').first();
    await expect(frame.locator('[tabindex]')).toHaveCount(1);
    await expect(frame.getByRole('button', { name: 'Key Generation Service details' })).toHaveAttribute('tabindex', '0');
    expect(await frame.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none');
    expect(await frame.locator('.cv-body').evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none');
  });

  test('keyboard focus reaches the frame’s tab before the nodes inside it', async ({ page }) => {
    const order = await page.evaluate(() =>
      [...document.querySelectorAll('[data-board-level] svg [tabindex="0"]')].map((el) => el.getAttribute('data-frame-tab') ?? el.getAttribute('data-node-id')),
    );
    const tabAt = order.indexOf('kgs-service');
    expect(tabAt).toBeGreaterThanOrEqual(0);
    expect(tabAt).toBeLessThan(order.indexOf('kgs-worker'));
    expect(tabAt).toBeLessThan(order.indexOf('kgs-db'));
  });

  test('clicking inside the frame’s empty area does not select the group', async ({ page }) => {
    const body = (await page.locator('[data-frame-id="kgs-service"] .cv-body').boundingBox())!;
    // The bottom-left padding strip: inside the border, clear of every node and link.
    await page.mouse.click(body.x + 6, body.y + body.height - 6);
    await page.waitForTimeout(300);
    await expect(page.locator('[data-frame-id="kgs-service"]')).not.toHaveClass(/is-selected/);
    await expect(page.getByRole('complementary', { name: 'Inspector' })).toHaveCount(0);
  });

  test.describe('selecting the group (desktop inspector)', () => {
    test.skip(({ isMobile }) => isMobile, 'the phone sheet hosts the inspector on mobile; covered by the inspector spec');

    async function expectGroupInspector(page: Page) {
      const inspector = page.getByRole('complementary', { name: 'Inspector' });
      await expect(inspector).toBeVisible();
      await expect(inspector.getByRole('heading', { name: 'Key Generation Service' })).toBeVisible();
      const tabs = inspector.getByRole('tablist', { name: 'Key Generation Service detail tabs' }).getByRole('tab');
      await expect(tabs).toHaveCount(3);
      expect((await tabs.allTextContents()).map((t) => t.trim()).sort()).toEqual(['Architecture', 'Operations', 'Overview']);
      await expect(inspector.getByText('Batch Allocation Spec')).toBeVisible();
      await expect(page.locator('[data-frame-id="kgs-service"]')).toHaveClass(/is-selected/);
    }

    test('clicking the tab opens the inspector with the group’s title and its tabs', async ({ page }) => {
      await page.getByRole('button', { name: 'Key Generation Service details' }).click();
      await expectGroupInspector(page);
    });

    test('the tab works from the keyboard (Enter and Space)', async ({ page }) => {
      const tab = page.getByRole('button', { name: 'Key Generation Service details' });
      await tab.focus();
      await page.keyboard.press('Enter');
      await expectGroupInspector(page);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('complementary', { name: 'Inspector' })).toHaveCount(0);
      await tab.focus();
      await page.keyboard.press(' ');
      await expectGroupInspector(page);
    });

    test('selecting a node clears the group, and selecting the group clears the node', async ({ page }) => {
      await page.getByRole('button', { name: 'Key Generation Service details' }).click();
      await expect(page.locator('[data-frame-id="kgs-service"]')).toHaveClass(/is-selected/);
      await page.locator('[data-node-id="kgs-worker"]').click();
      await expect(page.locator('[data-node-id="kgs-worker"]')).toHaveClass(/is-selected/);
      await expect(page.locator('[data-frame-id="kgs-service"]')).not.toHaveClass(/is-selected/);
      await page.getByRole('button', { name: 'Key Generation Service details' }).click();
      await expect(page.locator('[data-frame-id="kgs-service"]')).toHaveClass(/is-selected/);
      await expect(page.locator('[data-node-id="kgs-worker"]')).not.toHaveClass(/is-selected/);
    });
  });

  test('a framed child is an ordinary node: clicking it selects it on the same board', async ({ page, isMobile }) => {
    test.skip(isMobile, 'selection opens the phone sheet on mobile; covered by the inspector spec');
    const board = await viewBoard(page);
    const child = board.frames![0].holds[0];
    await page.locator(`[data-node-id="${child}"]`).click();
    await expect(page.getByRole('complementary', { name: 'Inspector' })).toBeVisible();
    await expect(page.locator('[data-board-level]')).toHaveCount(1);
  });
});

test.describe('player group frames — axe', () => {
  for (const theme of ['dark', 'light'] as const) {
    for (const [name, viewport] of [
      ['1440', { width: 1440, height: 900 }],
      ['834', { width: 834, height: 1112 }],
      ['390', { width: 390, height: 844 }],
    ] as const) {
      test(`zero axe violations at ${name}, ${theme}`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: theme });
        await page.setViewportSize(viewport);
        await page.goto('/solutions/url-shortener');
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        await settle(page);
        const results = await new AxeBuilder({ page }).analyze();
        if (results.violations.length > 0) console.log(JSON.stringify(results.violations, null, 2));
        expect(results.violations).toEqual([]);
        // And with the group selected (its tab focused, its panel open).
        const tab = page.getByRole('button', { name: 'Key Generation Service details' });
        await tab.focus();
        await page.keyboard.press('Enter');
        await expect(page.locator('[data-frame-id="kgs-service"]')).toHaveClass(/is-selected/);
        await settle(page);
        const selected = await new AxeBuilder({ page }).analyze();
        if (selected.violations.length > 0) console.log(JSON.stringify(selected.violations, null, 2));
        expect(selected.violations).toEqual([]);
      });
    }
  }
});
