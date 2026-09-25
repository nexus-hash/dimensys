import { test, expect } from '@playwright/test';

test('homepage has Dimensys title or visible heading', async ({ page }) => {
  await page.goto('/');

  // Check for page title containing "Dimensys"
  const pageTitle = await page.title();
  const hasTitle = pageTitle.includes('Dimensys');

  // Also check if a heading with "Dimensys" or similar is visible
  const hasHeading = await page.locator('h1, h2').filter({ hasText: /dimensys|solutions|problems/i }).first().isVisible().catch(() => false);

  // At least one of these should be true
  expect(hasTitle || hasHeading).toBeTruthy();
});
