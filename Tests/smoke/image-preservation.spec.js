import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { installNightshift } from './theme-helper.js';
import { PNG } from 'pngjs';

function pixels(buffer) {
  const image = PNG.sync.read(buffer);
  // WebKit rounds element screenshot bounds to device pixels. Exclude the
  // two-pixel edge that can contain surrounding page background.
  const interior = new PNG({ width: image.width - 4, height: image.height - 4 });
  PNG.bitblt(image, interior, 2, 2, interior.width, interior.height, 0, 0);
  return interior.data;
}

const fixtureURL = 'https://nightshift-fixture.example/';
test.beforeEach(async ({ page }) => {
  await page.route(`${fixtureURL}**`, async (route) => {
    const request = new URL(route.request().url()).pathname.slice(1);
    const file = ['photo.svg', 'styles/photos.css'].includes(request) ? request : 'image-preservation.html';
    await route.fulfill({
      contentType: file.endsWith('.svg') ? 'image/svg+xml' : file.endsWith('.css') ? 'text/css' : 'text/html',
      body: await readFile(new URL(`fixtures/${file}`, import.meta.url)),
    });
  });
  await page.goto(fixtureURL);
  await page.waitForFunction(() => document.querySelector('#image').complete);
});

test('photos keep their rendered pixels while interface colors darken and restore', async ({ page }, testInfo) => {
  const ids = ['css-photo', 'inline-photo', 'variable-photo', 'pseudo-photo', 'image', 'canvas', 'external-photo'];
  const before = await Promise.all(ids.map(id => page.locator(`#${id}`).screenshot()));
  const originalSurface = await page.locator('#light-surface').evaluate(el => getComputedStyle(el).backgroundColor);
  await installNightshift(page);
  await expect(page.locator('html')).toHaveAttribute('data-nightshift-active', '');
  await expect(page.locator('#light-surface')).not.toHaveCSS('background-color', originalSurface);
  await expect(page.locator('html')).toHaveCSS('filter', 'none');
  await expect(page.locator('#site-effect')).toHaveCSS('filter', 'brightness(0.8)');
  await expect(page.locator('#external-photo')).toHaveCSS('background-image', `url("${fixtureURL}photo.svg")`);
  for (let i = 0; i < ids.length; i++) {
    await expect(page.locator(`#${ids[i]}`)).toHaveCSS('filter', 'none');
    const after = await page.locator(`#${ids[i]}`).screenshot();
    await testInfo.attach(`${ids[i]}-before`, { body: before[i], contentType: 'image/png' });
    await testInfo.attach(`${ids[i]}-after`, { body: after, contentType: 'image/png' });
    expect(pixels(after).equals(pixels(before[i])), `${ids[i]} pixels changed`).toBe(true);
  }
  expect(await page.evaluate(() => window.chrome.runtime.sendMessage === window.originalNightshiftTestTransport)).toBe(true);
  expect(await page.evaluate(() => CSSStyleSheet.prototype.insertRule === window.originalNightshiftInsertRule)).toBe(true);
  await page.click('#add-content');
  await expect(page.locator('#dynamic .panel')).not.toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(page.locator('#dynamic .panel')).not.toHaveCSS('color', 'rgb(17, 17, 17)');
  await page.evaluate(() => window.setNightshiftTestMode('light'));
  await expect(page.locator('html')).not.toHaveAttribute('data-nightshift-active', '');
  await expect(page.locator('#light-surface')).toHaveCSS('background-color', originalSurface);
  await expect(page.locator('#dynamic .panel')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  for (let i = 0; i < ids.length; i++) expect(pixels(await page.locator(`#${ids[i]}`).screenshot()).equals(pixels(before[i]))).toBe(true);
  await page.evaluate(() => window.setNightshiftTestMode('dark'));
  await expect(page.locator('#light-surface')).not.toHaveCSS('background-color', originalSurface);
});
