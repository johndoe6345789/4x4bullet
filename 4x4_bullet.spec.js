const { test, expect } = require('@playwright/test');
const path = require('path');

const FILE_URL = 'file://' + path.resolve(__dirname, '4x4_bullet.html');

test('Ammo.js loads and Bullet physics world initializes', async ({ page }) => {
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  await page.goto(FILE_URL);

  // Wait for ammo.js to load and boot() to finish — loading screen should disappear
  await expect(page.locator('#loading')).toBeHidden({ timeout: 20000 });

  // Title screen should be visible after loading completes
  await expect(page.locator('#title')).toBeVisible();
  await expect(page.locator('#title h1')).toHaveText('DIRT KINGS');

  // No JS errors during init
  expect(errors).toEqual([]);
});

test('Clicking IGNITION starts the game loop', async ({ page }) => {
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  await page.goto(FILE_URL);
  await expect(page.locator('#loading')).toBeHidden({ timeout: 20000 });

  // Click the start button
  await page.click('#title button');

  // Title should disappear, HUD should be visible
  await expect(page.locator('#title')).toBeHidden();
  await expect(page.locator('#hud')).toBeVisible();

  // Speed display should be updating (starts at 0)
  await expect(page.locator('#speed-num')).toHaveText('0');

  // No JS errors
  expect(errors).toEqual([]);
});

test('Vehicle responds to keyboard input without errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  await page.goto(FILE_URL);
  await expect(page.locator('#loading')).toBeHidden({ timeout: 20000 });
  await page.click('#title button');
  await expect(page.locator('#title')).toBeHidden();

  // Press W (throttle) and wait for speed to rise
  await page.keyboard.down('KeyW');

  // Poll until speed > 0 or timeout
  await expect(async () => {
    const speed = parseInt(await page.locator('#speed-num').textContent(), 10);
    expect(speed).toBeGreaterThan(0);
  }).toPass({ timeout: 8000 });

  await page.keyboard.up('KeyW');
  const speed = parseInt(await page.locator('#speed-num').textContent(), 10);
  expect(speed).toBeGreaterThan(0);

  // Gear should have shifted from initial
  const gear = await page.locator('#gear-display').textContent();
  expect(parseInt(gear, 10)).toBeGreaterThanOrEqual(1);

  // No JS errors during driving
  expect(errors).toEqual([]);
});
