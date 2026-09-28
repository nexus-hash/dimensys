import { test, expect, type Page } from '@playwright/test';

/**
 * GEOM: two acceptance checks on the real, rendered player.
 *
 * 1. No label pill overlaps a node's own rect (including its replica stack
 *    cards), a frame's tab or a frame's border — the engine now inflates its placement
 *    obstacles by each node's decoration extent and emits the pill's own
 *    real size (`cap.sz`) instead of the player re-estimating it, so the
 *    two numbers can no longer drift apart.
 * 2. Nothing is clipped except the canvas region itself (`.player-board-wrap`)
 *    — the board wrapper and its `<svg>` no longer clip on their own, so a
 *    node (and its decorations) sitting at the diagram's own edge stays
 *    fully visible once panned/zoomed into view, rather than being cut by
 *    a second clip stacked on top of the region.
 */

async function settle(page: Page) {
  await page.waitForTimeout(1500);
}

/** Every element's own DOM rect is disjoint from every other's (no two overlap), by axis-aligned bounding box. */
function disjoint(a: { x: number; y: number; width: number; height: number }, b: typeof a): boolean {
  return a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;
}

async function checkLabelsClearOfNodesAndFrames(page: Page) {
  const root = page.locator('[data-board-level]');
  const pills = root.locator('.cv-link-label rect');
  const pillCount = await pills.count();
  expect(pillCount).toBeGreaterThan(0);

  const nodeBoxes: Array<{ x: number; y: number; width: number; height: number }> = [];
  const nodes = root.locator('[data-node-id]');
  for (let i = 0; i < (await nodes.count()); i++) {
    const box = await nodes.nth(i).boundingBox();
    if (box) nodeBoxes.push(box);
  }
  // A frame's tab is an obstacle like a node; its border may hold a pill fully inside or fully outside, never across it.
  const frameBoxes: Array<{ x: number; y: number; width: number; height: number }> = [];
  const frames = root.locator('[data-frame-id]');
  for (let i = 0; i < (await frames.count()); i++) {
    const body = await frames.nth(i).locator('.cv-body').boundingBox();
    if (body) frameBoxes.push(body);
    const tab = await frames.nth(i).locator('.cv-tab').boundingBox();
    if (tab) nodeBoxes.push(tab);
  }

  for (let i = 0; i < pillCount; i++) {
    const pillBox = await pills.nth(i).boundingBox();
    if (!pillBox) continue;
    for (const nodeBox of nodeBoxes) {
      expect(disjoint(pillBox, nodeBox), `pill ${i} vs a node rect or frame tab`).toBe(true);
    }
    for (const f of frameBoxes) {
      const inside = pillBox.x >= f.x && pillBox.y >= f.y && pillBox.x + pillBox.width <= f.x + f.width && pillBox.y + pillBox.height <= f.y + f.height;
      expect(disjoint(pillBox, f) || inside, `pill ${i} straddles a frame border`).toBe(true);
    }
  }
}

test.describe('player label geometry (GEOM)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('every label pill is disjoint from every node rect (incl. stack cards) frame tab and frame border, at default fit', async ({ page }) => {
    await page.goto('/solutions/url-shortener');
    await settle(page);
    await checkLabelsClearOfNodesAndFrames(page);
  });

  test('same, at ~200% zoom', async ({ page }) => {
    await page.goto('/solutions/url-shortener');
    await settle(page);
    const wrap = (await page.locator('.player-board-wrap').boundingBox())!;
    const cursor = { x: wrap.x + wrap.width / 2, y: wrap.y + wrap.height / 2 };
    await page.mouse.move(cursor.x, cursor.y);
    await page.keyboard.down('Control');
    await page.mouse.wheel(0, -170); // ~2x
    await page.keyboard.up('Control');
    await settle(page);
    await checkLabelsClearOfNodesAndFrames(page);
  });

  test('the board wrapper and its svg no longer clip on their own (GEOM part 1)', async ({ page }) => {
    await page.goto('/solutions/url-shortener');
    await settle(page);
    const wrapperOverflow = await page.locator('[data-board-level] > div').first().evaluate((el) => getComputedStyle(el).overflow);
    const svgOverflow = await page.locator('[data-board-level] svg').first().evaluate((el) => getComputedStyle(el).overflow);
    expect(wrapperOverflow).toBe('visible');
    expect(svgOverflow).toBe('visible');
    // The region itself is still the only clip.
    const regionOverflow = await page.locator('.player-board-wrap').evaluate((el) => getComputedStyle(el).overflow);
    expect(regionOverflow).toBe('hidden');
  });

  test('a node sitting at the diagram\'s own edge (Analytics Worker, board-flush) stays fully visible once panned into view, not clipped by a second box on top of the region', async ({ page }) => {
    await page.goto('/solutions/url-shortener');
    await settle(page);

    // Zoom in hard on the node, then select it (T3.16 selection scrolls/keeps
    // it reachable) so we can read its rendered rect including the stack.
    const node = page.locator('[data-node-id="analytics-worker"]');
    await node.scrollIntoViewIfNeeded();
    await node.click();
    await settle(page);
    const wrap = (await page.locator('.player-board-wrap').boundingBox())!;
    const cursor = { x: wrap.x + wrap.width / 2, y: wrap.y + wrap.height / 2 };
    await page.mouse.move(cursor.x, cursor.y);
    await page.keyboard.down('Control');
    await page.mouse.wheel(0, -170);
    await page.keyboard.up('Control');
    await settle(page);

    const box = await node.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;
    // The bottom-right corner of the node's own rendered group (stack cards
    // included — `Node` draws them inside the same `[data-node-id]` group)
    // must actually be painted there, not visually cut by an ancestor's
    // `overflow: hidden` — `elementFromPoint` resolves to whatever's really
    // on top at that point, so a clipped-away element never comes back.
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    // Only assert when the node's own center is still inside the visible
    // canvas region (otherwise there's nothing at that point to find at all
    // — this test cares about *clipping*, not about panning it further).
    if (cx >= wrap.x && cx <= wrap.x + wrap.width && cy >= wrap.y && cy <= wrap.y + wrap.height) {
      const found = await page.evaluate(
        ([x, y, id]) => {
          const el = document.elementFromPoint(x, y);
          return !!el?.closest(`[data-node-id="${id}"]`);
        },
        [cx, cy, 'analytics-worker'] as const,
      );
      expect(found).toBe(true);
    }
  });

  for (const id of ['url-shortener', 'netflix']) {
    test(`${id}: no node title or sub-label truncates at default fit`, async ({ page }) => {
      await page.goto(`/solutions/${id}`);
      await settle(page);
      const texts = await page.locator('[data-board-level] [data-node-id] :is(.cv-label, .cv-sub)').allTextContents();
      expect(texts.length).toBeGreaterThan(0);
      expect(texts.filter((t) => t.includes('…'))).toEqual([]);
    });

    for (const zoom of ['fit', '3x'] as const) {
      test(`${id}: every node's text sits inside its padding box, and the meter value never overlaps its bar (${zoom})`, async ({ page }) => {
        await page.goto(`/solutions/${id}`);
        await settle(page);
        if (zoom === '3x') {
          const wrap = (await page.locator('.player-board-wrap').boundingBox())!;
          await page.mouse.move(wrap.x + wrap.width / 2, wrap.y + wrap.height / 2);
          await page.keyboard.down('Control');
          for (let i = 0; i < 3; i++) await page.mouse.wheel(0, -110);
          await page.keyboard.up('Control');
          await settle(page);
        }
        const problems = await page.evaluate(() => {
          const out: string[] = [];
          const level = document.querySelector('[data-board-level]')!;
          for (const g of level.querySelectorAll<SVGGElement>('[data-node-id]')) {
            const body = g.querySelector<SVGRectElement>('.cv-body');
            if (!body) continue;
            const b = body.getBoundingClientRect();
            const s = b.width / body.width.baseVal.value; // CSS px per unit
            const pad = 12 * s;
            const tol = 0.75;
            for (const t of g.querySelectorAll<SVGTextElement>('.cv-label, .cv-sub, .cv-mtext')) {
              if (!t.textContent) continue;
              const r = t.getBoundingClientRect();
              if (r.left < b.left + pad - tol || r.right > b.right - pad + tol || r.top < b.top - tol || r.bottom > b.bottom + tol) {
                out.push(`${g.dataset.nodeId} ${t.getAttribute('class')} "${t.textContent}" outside padding box`);
              }
            }
            const track = g.querySelector<SVGRectElement>('.cv-mtrack');
            const value = g.querySelector<SVGTextElement>('.cv-mtext');
            if (track && value && value.textContent) {
              const tr = track.getBoundingClientRect();
              const vr = value.getBoundingClientRect();
              if (tr.right > vr.left - 0.5) out.push(`${g.dataset.nodeId} meter bar reaches its value (${tr.right} > ${vr.left})`);
            }
          }
          return out;
        });
        expect(problems).toEqual([]);
      });
    }

    test(`${id}: every label pill is painted after every link of its level (no line crosses a pill's text)`, async ({ page }) => {
      await page.goto(`/solutions/${id}`);
      await settle(page);
      const late = await page.evaluate(() => {
        const svg = document.querySelector('[data-board-level] svg')!;
        const all = [...svg.querySelectorAll('[data-link-id], [data-link-label-for]')];
        const lastLink = Math.max(...all.map((el, i) => (el.hasAttribute('data-link-id') ? i : -1)));
        const firstPill = all.findIndex((el) => el.hasAttribute('data-link-label-for'));
        const fill = getComputedStyle(svg.querySelector('.cv-link-label rect')!).fill;
        return { ordered: firstPill > lastLink, fill };
      });
      expect(late.ordered).toBe(true);
      // Opaque fill: no alpha channel in the resolved color.
      expect(late.fill).toMatch(/^rgb\(/);
    });
  }
});

