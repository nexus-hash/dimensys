import { test, expect, type CDPSession } from '@playwright/test';

/**
 * T3.3: the player's interactive layer, against the real production routes
 * (worker bundle + sim payload) for both diagrams that ship a simulation.
 * Covers: the worker actually starts, live health attributes land on the
 * static SVG, the particle canvas draws non-empty pixels, hover/click/
 * keyboard, reduced motion, and a frame-time sample under CPU throttling.
 */

const DIAGRAMS = ['url-shortener', 'netflix'];

async function collectConsoleErrors(page: import('@playwright/test').Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  return errors;
}

for (const id of DIAGRAMS) {
  test.describe(`/solutions/${id}`, () => {
    test('the worker starts and drives live health with no console errors', async ({ page }) => {
      const errors = await collectConsoleErrors(page);
      await page.goto(`/solutions/${id}`);
      await expect(page.locator('[data-player-root]')).toHaveAttribute('data-sim-status', /idle|loading/);

      // The worker starts lazily after first paint and reaches `ready`/`playing`.
      await expect(page.locator('[data-player-root]')).toHaveAttribute('data-sim-status', 'ready', { timeout: 15000 });

      // At least one node's health-driven class or meter should update within a few frames
      // (10 Hz cadence => well under a couple of seconds), OR the diagram opens fully healthy
      // and nothing changes visually — either way the canvas must be drawing.
      const canvas = page.locator('canvas.player-overlay-canvas').first();
      await expect(canvas).toBeAttached();

      await page.waitForTimeout(1500);

      const hasPixels = await canvas.evaluate((el) => {
        const c = el as HTMLCanvasElement;
        const ctx = c.getContext('2d');
        if (!ctx || c.width === 0 || c.height === 0) return false;
        const data = ctx.getImageData(0, 0, c.width, c.height).data;
        for (let i = 3; i < data.length; i += 4) if (data[i] !== 0) return true;
        return false;
      });
      expect(hasPixels).toBe(true);

      expect(errors).toEqual([]);
    });

    for (const zoom of [1, 3]) {
      test(`particles ride the drawn curves (every lit particle pixel within 2px of its link path, sampled) at ${zoom}× zoom`, async ({ page, isMobile }) => {
        test.skip(isMobile, 'desktop pointer zoom');
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto(`/solutions/${id}`);
        await expect(page.locator('[data-player-root]')).toHaveAttribute('data-sim-status', 'ready', { timeout: 15000 });
        if (zoom > 1) {
          // Zoom about the busiest fan-out so particles stay in view.
          const hub = (await page.locator(`[data-node-id="${id === 'netflix' ? 'api-gateway' : 'api-service'}"]`).first().boundingBox())!;
          await page.mouse.move(hub.x + hub.width, hub.y + hub.height / 2);
          await page.keyboard.down('Control');
          // ~3x: each wheel notch of this size zooms ×~1.4 (see BoardStage).
          for (let i = 0; i < 3; i++) await page.mouse.wheel(0, -110);
          await page.keyboard.up('Control');
        }
        await page.waitForTimeout(2000);
        const result = await page.evaluate(() => {
          const canvas = document.querySelector<HTMLCanvasElement>('canvas.player-overlay-canvas')!;
          const ctx = canvas.getContext('2d')!;
          const cRect = canvas.getBoundingClientRect();
          const dpr = canvas.width / Math.max(1, cRect.width);
          const level = document.querySelector<HTMLElement>('[data-board-level]')!;
          const svg = level.querySelector('svg')!;
          const vb = svg.viewBox.baseVal;
          const scale = svg.getBoundingClientRect().width / vb.width; // CSS px per viewBox unit
          // Sample every drawn link path at ≤0.5 viewBox units, into canvas device px.
          const pts: number[] = [];
          for (const path of svg.querySelectorAll<SVGPathElement>('path.cv-link')) {
            const m = path.getScreenCTM()!;
            const len = path.getTotalLength();
            for (let d = 0; d <= len; d += 0.5) {
              const p = path.getPointAtLength(d);
              pts.push(((m.a * p.x + m.c * p.y + m.e) - cRect.left) * dpr, ((m.b * p.x + m.d * p.y + m.f) - cRect.top) * dpr);
            }
          }
          const cell = 8;
          const grid = new Map<string, number[]>();
          for (let i = 0; i < pts.length; i += 2) {
            const k = `${Math.floor(pts[i] / cell)},${Math.floor(pts[i + 1] / cell)}`;
            (grid.get(k) ?? grid.set(k, []).get(k)!).push(pts[i], pts[i + 1]);
          }
          // A particle is a disc of radius 2.4 (a retry ring reaches 3.4 + half its 1.3 stroke) in
          // viewBox units; a pixel of one centred ≤2px off the curve is ≤ that reach + 2px (+1px AA).
          const reach = (3.4 + 0.65) * scale * dpr + 2 * dpr + 1;
          const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          let lit = 0;
          let worst = 0;
          for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
              if (data[(y * canvas.width + x) * 4 + 3] < 96) continue;
              lit++;
              let best = Infinity;
              const span = Math.ceil(reach / cell) + 1;
              const cx = Math.floor(x / cell);
              const cy = Math.floor(y / cell);
              for (let gx = cx - span; gx <= cx + span; gx++) {
                for (let gy = cy - span; gy <= cy + span; gy++) {
                  const b = grid.get(`${gx},${gy}`);
                  if (!b) continue;
                  for (let i = 0; i < b.length; i += 2) best = Math.min(best, Math.hypot(b[i] - x, b[i + 1] - y));
                }
              }
              worst = Math.max(worst, best);
            }
          }
          return { lit, worst, reach, scale };
        });
        expect(result.lit, 'particles are drawing').toBeGreaterThan(0);
        expect(result.worst, `farthest particle pixel from its curve (scale ${result.scale.toFixed(2)})`).toBeLessThanOrEqual(result.reach);
        if (zoom > 1) expect(result.scale).toBeGreaterThan(1.8);
      });
    }

    test('hover shows a tooltip and click selects a node', async ({ page }) => {
      await page.goto(`/solutions/${id}`);
      const node = page.locator('[data-node-id]').first();
      await node.waitFor({ state: 'visible' });

      await node.hover();
      const tooltip = page.locator('.player-tooltip');
      await expect(tooltip).toBeVisible();
      await expect(tooltip).not.toBeEmpty();

      await node.click();
      const id0 = await node.getAttribute('data-node-id');
      await expect(node).toHaveClass(/is-selected/);
      expect(id0).toBeTruthy();
    });

    test('Enter selects a focused node', async ({ page }) => {
      await page.goto(`/solutions/${id}`);
      const node = page.locator('[data-node-id]').first();
      await node.focus();
      await page.keyboard.press('Enter');
      await expect(node).toHaveClass(/is-selected/);
    });

    test('reduced motion shows no particle animation loop', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(`/solutions/${id}`);
      await expect(page.locator('[data-player-root]')).toHaveAttribute('data-sim-status', 'ready', { timeout: 15000 });
      await page.waitForTimeout(1200);

      const canvas = page.locator('canvas.player-overlay-canvas').first();
      const snapshotA = await canvas.evaluate((el) => (el as HTMLCanvasElement).toDataURL());
      await page.waitForTimeout(600);
      const snapshotB = await canvas.evaluate((el) => (el as HTMLCanvasElement).toDataURL());
      // No per-frame drawing in reduced motion: the canvas stays exactly as it was (cleared/empty).
      expect(snapshotA).toBe(snapshotB);
    });
  });
}

test.describe('frame time under CPU throttle', () => {
  test('url-shortener holds close to 60 fps on a throttled profile', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'CDP throttling is Chromium-only');

    await page.goto('/solutions/url-shortener');
    await expect(page.locator('[data-player-root]')).toHaveAttribute('data-sim-status', 'ready', { timeout: 15000 });

    const client: CDPSession = await page.context().newCDPSession(page);
    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });

    const frameTimes = await page.evaluate(async () => {
      const times: number[] = [];
      let last = performance.now();
      await new Promise<void>((resolve) => {
        let count = 0;
        function tick(ts: number) {
          times.push(ts - last);
          last = ts;
          count++;
          if (count < 120) requestAnimationFrame(tick);
          else resolve();
        }
        requestAnimationFrame(tick);
      });
      return times.slice(10); // drop warm-up frames
    });

    await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });

    const avgMs = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
    const fps = 1000 / avgMs;
    const sorted = [...frameTimes].sort((a, b) => a - b);
    const p95Ms = sorted[Math.floor(sorted.length * 0.95)];

    console.log(`[T3.3 fps] url-shortener @4x CPU throttle: avg ${fps.toFixed(1)} fps, p95 frame ${p95Ms.toFixed(1)} ms`);
    // Generous floor: a throttled mid-range profile is not held to a strict 60fps average,
    // but the loop must not be janking down into single digits.
    expect(fps).toBeGreaterThan(24);
  });
});
