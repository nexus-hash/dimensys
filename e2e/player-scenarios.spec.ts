import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Scenario playback on /solutions/url-shortener: the rail's Scenarios
 * section starts the cache-outage story, its narration plays in order in
 * the dock, the checkpoint pauses the run and asks what to do, each answer
 * plays its outcome and then the reveal, the scrubber carries the story's
 * event ticks and checkpoint diamond, and it all works from the keyboard
 * and, on phone, from the bottom sheet.
 */

const DIAGRAM = 'url-shortener';
const STORY = 'cache-outage';
const READY_TIMEOUT = 20000;

interface Ask {
  id: string;
  t: number;
  md: string;
  picks: Array<{ id: string; text: string; then: string }>;
  truth?: string;
}
interface Play {
  id: string;
  text: string;
  genre: string;
  secs?: number;
  beats: Array<{ t: number }>;
  captions: Array<{ t: number; md: string }>;
  asks: Ask[];
}

let story: Play;

test.beforeAll(async ({ request }) => {
  const res = await request.get(`/solutions/${DIAGRAM}/diagram.json`);
  expect(res.ok()).toBe(true);
  const view = (await res.json()) as { plays: Play[] };
  story = view.plays.find((p) => p.id === STORY)!;
  expect(story).toBeTruthy();
  expect(story.captions.length).toBeGreaterThanOrEqual(3);
  expect(story.asks.length).toBeGreaterThanOrEqual(1);
  expect(story.asks[0].picks.length).toBeGreaterThanOrEqual(2);
  expect(story.asks[0].picks.length).toBeLessThanOrEqual(3);
  expect(story.asks[0].truth).toBeTruthy();
});

const root = (page: Page) => page.locator('[data-player-root]');
const narration = (page: Page) => page.locator('.player-canvas-area [data-story-narration]');
const card = (page: Page) => page.locator(`[data-checkpoint="${story.asks[0].id}"]`);
const railOption = (page: Page, id: string) => page.locator(`.player-rail [data-scenario="${id}"] .story-opt`);

/** Plain text of an inline-markdown string, for `toContainText`. */
const plain = (md: string) => md.replace(/\*\*|`|\*/g, '');
/** The first words of a text: enough to identify it, short enough not to cross a line wrap oddly. */
const head = (md: string) => plain(md).split(' ').slice(0, 6).join(' ');

async function open(page: Page, path = `/solutions/${DIAGRAM}`) {
  await page.goto(path);
  await expect(root(page)).toHaveAttribute('data-sim-status', 'ready', { timeout: READY_TIMEOUT });
}

async function simTime(page: Page): Promise<string> {
  return (await page.locator('.player-canvas-area .player-time').first().innerText()).split('/')[0].trim();
}

/** Starts the story from the rail at 4× speed. */
async function startStory(page: Page) {
  await railOption(page, STORY).click();
  await expect(railOption(page, STORY)).toHaveAttribute('aria-current', 'true');
  await expect(root(page)).toHaveAttribute('data-sim-status', 'ready', { timeout: READY_TIMEOUT });
  await expect(page.locator('.player-canvas-area .player-scrubber')).toBeVisible();
  await page.keyboard.press(']');
  await page.keyboard.press(']');
}

/** Scrubs to the end: the seek stops at the unanswered checkpoint and opens it. */
async function jumpToCheckpoint(page: Page) {
  const thumb = page.locator('.player-canvas-area .player-scrubber [role="slider"]');
  await thumb.focus();
  await page.keyboard.press('End');
  await expect(card(page)).toBeVisible();
}

test.describe('scenarios (desktop)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('the rail lists free play and the authored scenarios; free play is live', async ({ page }) => {
    await open(page);
    await expect(railOption(page, 'free')).toHaveAttribute('aria-current', 'true');
    await expect(railOption(page, STORY)).toContainText(story.text);
    await expect(page.locator('.player-canvas-area .player-tl-live')).toBeVisible();
    await expect(narration(page)).toHaveCount(0);
  });

  test('the cache-outage story plays its narration in order, then the checkpoint pauses it', async ({ page }) => {
    await open(page);
    await page.evaluate(() => {
      const seen: string[] = [];
      (window as unknown as { __narr: string[] }).__narr = seen;
      const note = () => {
        const el = document.querySelector('.player-canvas-area [data-story-narration]');
        const key = el?.getAttribute('data-entry');
        if (key && seen[seen.length - 1] !== key) seen.push(key);
      };
      new MutationObserver(note).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-entry'] });
    });
    await startStory(page);
    await expect(narration(page)).toBeVisible();
    await expect(page.locator('.player-canvas-area [data-narration-slot]')).toHaveAttribute('aria-live', 'polite');

    // Plays up to the checkpoint on its own (~8 s at 4×) and pauses there.
    await expect(card(page)).toBeVisible({ timeout: 30000 });
    await expect(narration(page)).toHaveCount(0);
    await expect(page.locator('.player-canvas-area [aria-label="Play (Space)"]')).toBeVisible();
    const at = await simTime(page);
    expect(at).toBe('00:30');
    await page.waitForTimeout(1200);
    expect(await simTime(page)).toBe(at);
    await expect(page.locator(`.player-rail [data-scenario="${STORY}"] .story-status`)).toHaveAttribute('data-state', 'checkpoint');

    // Every caption before the checkpoint showed, in authored order.
    const seen = await page.evaluate(() => (window as unknown as { __narr: string[] }).__narr);
    const captions = seen.filter((k) => /^c\d+$/.test(k)).map((k) => Number(k.slice(1)));
    const due = story.captions.filter((c) => c.t < story.asks[0].t).length;
    expect(captions).toEqual(Array.from({ length: due }, (_, i) => i));

    // The card: the question, the choices, keep watching.
    await expect(card(page)).toContainText(plain(story.asks[0].md));
    await expect(card(page).locator('[data-choice]')).toHaveCount(story.asks[0].picks.length);
    await expect(card(page).getByRole('button', { name: 'Keep watching' })).toBeVisible();
  });

  for (let i = 0; i < 3; i++) {
    test(`choice ${i + 1} plays its outcome, then the reveal`, async ({ page }) => {
      test.skip(i >= story.asks[0].picks.length, 'fewer choices');
      const ask = story.asks[0];
      const pick = ask.picks[i];
      await open(page);
      await startStory(page);
      await jumpToCheckpoint(page);
      await card(page).locator(`[data-choice="${pick.id}"]`).click();
      await expect(card(page)).toHaveCount(0);
      await expect(narration(page)).toHaveAttribute('data-kind', 'outcome');
      await expect(narration(page)).toContainText(pick.text);
      await expect(narration(page)).toContainText(head(pick.then));
      // The run plays on.
      await expect.poll(() => simTime(page)).not.toBe('00:30');
      await expect(narration(page)).toHaveAttribute('data-kind', 'reveal', { timeout: 15000 });
      await expect(narration(page)).toContainText(head(ask.truth!));
      await expect(page.locator('.player-canvas-area [data-timeline-marks] [data-mark="ask"]')).toHaveAttribute('data-done', 'true');
    });
  }

  test('values in the narration are set in mono tabular figures', async ({ page }) => {
    await open(page);
    await startStory(page);
    await expect(narration(page)).toHaveAttribute('data-entry', 'c0', { timeout: 15000 });
    const v = narration(page).locator('b.v').first();
    await expect(v).toBeVisible();
    const style = await v.evaluate((el) => ({ fam: getComputedStyle(el).fontFamily, num: getComputedStyle(el).fontVariantNumeric }));
    expect(style.num).toContain('tabular-nums');
    expect(style.fam.toLowerCase()).toMatch(/mono/);
  });

  test('the scrubber shows the story events as ticks and the checkpoint as a diamond', async ({ page }) => {
    await open(page);
    await startStory(page);
    const marks = page.locator('.player-canvas-area [data-timeline-marks]');
    await expect(marks.locator('[data-mark="beat"]')).toHaveCount(story.beats.length);
    await expect(marks.locator('[data-mark="ask"]')).toHaveCount(story.asks.length);
    const left = await marks.locator('[data-mark="ask"]').evaluate((el) => (el as HTMLElement).style.left);
    expect(parseFloat(left)).toBeCloseTo((story.asks[0].t / story.secs!) * 100, 1);
  });

  test('seeking past an unanswered checkpoint stops at it; after answering, seeking runs past it', async ({ page }) => {
    await open(page);
    await startStory(page);
    await jumpToCheckpoint(page);
    expect(await simTime(page)).toBe('00:30');
    await card(page).locator('[data-choice]').first().click();
    await expect(card(page)).toHaveCount(0);
    const thumb = page.locator('.player-canvas-area .player-scrubber [role="slider"]');
    await thumb.focus();
    await page.keyboard.press('End');
    await expect.poll(() => simTime(page)).toBe('01:30');
    await expect(card(page)).toHaveCount(0);
    await expect(narration(page)).toHaveAttribute('data-done', 'true');
    await expect(narration(page).getByRole('button', { name: 'Replay' })).toBeVisible();
  });

  test('keyboard only: start, answer with a number key, focus comes back', async ({ page }) => {
    await open(page);
    const option = railOption(page, STORY);
    await option.focus();
    await page.keyboard.press('Enter');
    await expect(option).toHaveAttribute('aria-current', 'true');
    await expect(root(page)).toHaveAttribute('data-sim-status', 'ready', { timeout: READY_TIMEOUT });
    await option.focus();
    await page.keyboard.press(']');
    await page.keyboard.press(']');
    await expect(card(page)).toBeVisible({ timeout: 30000 });
    // Focus moved into the card, on the first choice.
    await expect(card(page).locator('[data-choice]').first()).toBeFocused();
    // Tab reaches the other choices and Keep watching.
    await page.keyboard.press('Tab');
    await expect(card(page).locator('[data-choice]').nth(1)).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    // The number key answers (and doesn't switch modes).
    await page.keyboard.press('2');
    await expect(card(page)).toHaveCount(0);
    await expect(root(page)).toHaveAttribute('data-player-mode', 'explore');
    await expect(narration(page)).toContainText(story.asks[0].picks[1].text);
    // Focus is back where it was before the card opened.
    await expect(option).toBeFocused();
  });

  test('keyboard only: Enter on a focused choice answers it', async ({ page }) => {
    await open(page);
    await startStory(page);
    await jumpToCheckpoint(page);
    await expect(card(page).locator('[data-choice]').first()).toBeFocused();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await expect(card(page)).toHaveCount(0);
    await expect(narration(page)).toContainText(story.asks[0].picks[1].text);
    // Focus went back to the scrubber it came from.
    await expect(page.locator('.player-canvas-area .player-scrubber [role="slider"]')).toBeFocused();
  });

  test('keep watching passes the checkpoint unchanged and still reveals', async ({ page }) => {
    await open(page);
    await startStory(page);
    await jumpToCheckpoint(page);
    await card(page).getByRole('button', { name: 'Keep watching' }).click();
    await expect(card(page)).toHaveCount(0);
    await expect(narration(page)).toHaveAttribute('data-kind', 'reveal');
  });

  test('a walkthrough takes the narration slot; free play puts the live clock back', async ({ page }) => {
    await open(page);
    await startStory(page);
    await expect(narration(page)).toBeVisible();
    await page.locator('.player-rail [data-walkthrough] .wt-opt').first().click();
    await expect(root(page)).toHaveAttribute('data-player-mode', 'walkthrough');
    await expect(page.locator('.player-canvas-area [data-walkthrough-narration]')).toBeVisible();
    await expect(narration(page)).toHaveCount(0);
    await railOption(page, 'free').click();
    await expect(root(page)).toHaveAttribute('data-player-mode', 'explore');
    await expect(railOption(page, 'free')).toHaveAttribute('aria-current', 'true');
    await expect(page.locator('.player-canvas-area .player-tl-live')).toBeVisible({ timeout: READY_TIMEOUT });
    await expect(narration(page)).toHaveCount(0);
  });

  test('netflix: the edge-outage story plays its narration', async ({ page }) => {
    await open(page, '/solutions/netflix');
    const opt = page.locator('.player-rail [data-scenario="edge-outage"] .story-opt');
    await opt.click();
    await expect(opt).toHaveAttribute('aria-current', 'true');
    await expect(narration(page)).toHaveAttribute('data-entry', 'c0', { timeout: 20000 });
    await expect(page.locator('.player-canvas-area [data-timeline-marks] [data-mark="beat"]')).not.toHaveCount(0);
  });
});

test.describe('scenarios (phone)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the story starts from the sheet and its checkpoint opens there', async ({ page }) => {
    await open(page);
    const sheet = page.locator('[role="dialog"]');
    await sheet.getByRole('tab', { name: 'Scenarios' }).click();
    await sheet.locator(`[data-scenario="${STORY}"] .story-opt`).click();
    await expect(root(page)).toHaveAttribute('data-sim-status', 'ready', { timeout: READY_TIMEOUT });
    await expect(page.locator('[data-dock="board"] [data-story-narration]')).toBeVisible({ timeout: 15000 });
    await jumpToCheckpoint(page);
    await expect(sheet.locator(`[data-checkpoint]`)).toBeVisible();
    await expect(page.locator('.player-canvas-area [data-checkpoint]')).toHaveCount(0);
    await expect(sheet.getByRole('tab', { name: 'Scenarios' })).toHaveAttribute('aria-selected', 'true');
    await expect(sheet.locator('[data-choice]').first()).toBeFocused();
    await sheet.locator('[data-choice]').last().click();
    await expect(sheet.locator('[data-checkpoint]')).toHaveCount(0);
    await expect(page.locator('[data-dock="board"] [data-story-narration]')).toHaveAttribute('data-kind', 'outcome');
  });
});

/** axe, every rule, with the checkpoint card open, at the three reference widths in both themes. */
test.describe('checkpoint axe (light + dark)', () => {
  for (const scheme of ['light', 'dark'] as const) {
    for (const [name, viewport] of [
      ['1440', { width: 1440, height: 900 }],
      ['834', { width: 834, height: 1112 }],
      ['390', { width: 390, height: 844 }],
    ] as const) {
      test(`0 axe violations at ${name}, ${scheme}`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme });
        await page.setViewportSize(viewport);
        await open(page);
        await expect(page.locator('html')).toHaveAttribute('data-theme', scheme);
        if (viewport.width < 640) {
          const sheet = page.locator('[role="dialog"]');
          await sheet.getByRole('tab', { name: 'Scenarios' }).click();
          await sheet.locator(`[data-scenario="${STORY}"] .story-opt`).click();
        } else if (viewport.width < 1024) {
          await page.getByRole('button', { name: 'Toggle left rail' }).click();
          await page.locator(`.player-rail [data-scenario="${STORY}"] .story-opt`).click();
          await page.keyboard.press('Control+b');
        } else {
          await railOption(page, STORY).click();
        }
        await expect(root(page)).toHaveAttribute('data-sim-status', 'ready', { timeout: READY_TIMEOUT });
        await jumpToCheckpoint(page);
        await page.waitForTimeout(800);
        const results = await new AxeBuilder({ page }).analyze();
        if (results.violations.length > 0) console.log(name, scheme, JSON.stringify(results.violations, null, 2));
        expect(results.violations).toEqual([]);
      });
    }
  }
});
