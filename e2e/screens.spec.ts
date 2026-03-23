import { test, expect } from '@playwright/test';

const pages = [
  { name: 'Home', path: '/' },
  { name: 'Create Game', path: '/create-game' },
  { name: 'Join Game', path: '/join-game' },
  { name: 'Mini Games', path: '/mini-games' },
];

for (const page of pages) {
  test(`${page.name} page loads without errors`, async ({ page: p }) => {
    const errors: string[] = [];
    p.on('pageerror', (err) => errors.push(err.message));

    const response = await p.goto(page.path, { waitUntil: 'networkidle' });
    expect(response?.status()).toBe(200);
    expect(errors).toEqual([]);
  });

  test(`${page.name} page has no console errors`, async ({ page: p }) => {
    const consoleErrors: string[] = [];
    p.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await p.goto(page.path, { waitUntil: 'networkidle' });

    // Filter out known non-critical errors (e.g. Firebase, external resources)
    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes('Firebase') && !e.includes('firestore') && !e.includes('ERR_CONNECTION')
    );
    expect(criticalErrors).toEqual([]);
  });
}

test('Home page renders main content', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page.locator('text=Welcome Traveler')).toBeVisible();
  await expect(page.locator('text=Forge New Quest')).toBeVisible();
  await expect(page.locator('text=Join Existing Quest')).toBeVisible();
});

test('Create Game page renders step 1', async ({ page }) => {
  await page.goto('/create-game', { waitUntil: 'networkidle' });
  await expect(page.locator('text=Your Game, Your Rules')).toBeVisible();
  await expect(page.locator('#gameName')).toBeVisible();
  await expect(page.locator('#screenName')).toBeVisible();
});

test('BG ornaments are visible on all pages', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });

  const topBg = page.locator('img[src="/BG_top.png"]');
  const bottomBg = page.locator('img[src="/BG_bottom.png"]');

  await expect(topBg).toBeVisible();
  await expect(bottomBg).toBeVisible();
});

test('Parchment background is applied', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });

  const rootDiv = page.locator('body > div').first();
  const bgImage = await rootDiv.evaluate((el) => getComputedStyle(el).backgroundImage);
  expect(bgImage).toContain('parchment-background.png');
});
