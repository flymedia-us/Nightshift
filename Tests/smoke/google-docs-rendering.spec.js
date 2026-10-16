import { expect, test } from '@playwright/test';
import { PNG } from 'pngjs';
import { installNightshift } from './theme-helper.js';

const fixture = `
  <style>
    body { background: white; color: black; }
    canvas { display: block; width: 120px; height: 40px; }
    #docs-editor { background: white; }
    #photo { width: 120px; height: 40px; background-image: linear-gradient(red, blue); }
  </style>
  <div id="docs-editor"><canvas id="docs" class="kix-canvas-tile-content" width="120" height="40"></canvas><div id="photo"></div></div>
  <div class="grid-container"><div id="0-grid-table-container"><canvas id="sheet" width="120" height="40"></canvas></div></div>
  <canvas id="ordinary" width="120" height="40"></canvas>
  <div id="t-formula-bar-input"><div class="cell-input" contenteditable="true">Default ink</div></div>
  <div id="edit-ink" class="cell-input" contenteditable="true" style="color: black">Original ink</div>
  <div id="color-swatch" class="goog-palette-colorswatch" style="background-color: red; width: 20px; height: 20px"></div>
`;

async function colors(page, id) {
  const png = PNG.sync.read(await page.locator(`#${id}`).screenshot());
  const pixel = (x, y) => [...png.data.subarray((y * png.width + x) * 4, (y * png.width + x) * 4 + 3)];
  return { background: pixel(Math.floor(png.width / 4), Math.floor(png.height / 2)), text: pixel(Math.floor(png.width * 3 / 4), Math.floor(png.height / 2)) };
}

async function setup(page, host = 'docs.google.com') {
  await page.route(`https://${host}/**`, route => route.fulfill({ contentType: 'text/html', body: fixture }));
  await page.goto(`https://${host}/document/d/nightshift-fixture/edit`);
  await page.evaluate(() => {
    for (const canvas of document.querySelectorAll('canvas')) {
      const ctx = canvas.getContext('2d');
      // Docs tiles can have transparent page backgrounds; Sheets paints white.
      if (canvas.id !== 'docs') {
        ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 120, 40);
      }
      ctx.fillStyle = 'black'; ctx.fillRect(60, 0, 60, 40);
    }
  });
  await installNightshift(page);
}

test('Docs text and Sheets cells gain contrast, update dynamically, and restore in Light mode', async ({ page }) => {
  await setup(page);
  await expect(page.locator('html')).toHaveAttribute('data-nightshift-google-docs', '');
  await expect(page.locator('html')).toHaveAttribute('data-nightshift-active', '');
  await expect(page.locator('html')).toHaveCSS('filter', 'none');
  await expect(page.locator('#docs-editor')).toHaveCSS('filter', 'none');
  await expect(page.locator('#photo')).toHaveCSS('filter', 'none');
  await expect(page.locator('#ordinary')).toHaveCSS('filter', 'none');
  for (const id of ['docs', 'sheet']) {
    const dark = await colors(page, id);
    expect(Math.max(...dark.background)).toBeLessThan(60);
    expect(Math.min(...dark.text)).toBeGreaterThan(210);
  }
  expect(await colors(page, 'ordinary')).toEqual({ background: [255, 255, 255], text: [0, 0, 0] });
  const photo = await page.locator('#photo').screenshot();
  // Sheets reads these computed colors into cell formatting. The visual filter
  // must leave their source ink and swatches intact, including after typing.
  await expect(page.locator('#edit-ink')).toHaveCSS('color', 'rgb(0, 0, 0)');
  await expect(page.locator('#t-formula-bar-input .cell-input')).toHaveCSS('color', 'rgb(0, 0, 0)');
  await expect(page.locator('#edit-ink')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(page.locator('#edit-ink')).toHaveCSS('filter', 'invert(1) hue-rotate(180deg) contrast(0.74)');
  await expect(page.locator('#color-swatch')).toHaveCSS('background-color', 'rgb(255, 0, 0)');
  await page.locator('#edit-ink').fill('New ink');
  await expect(page.locator('#edit-ink')).toHaveCSS('color', 'rgb(0, 0, 0)');
  await page.evaluate(() => {
    const tile = document.querySelector('#sheet').cloneNode(); tile.id = 'dynamic';
    document.getElementById('0-grid-table-container').append(tile);
    const ctx = tile.getContext('2d');
    ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 120, 40);
    ctx.fillStyle = 'black'; ctx.fillRect(60, 0, 60, 40);
  });
  expect(await colors(page, 'dynamic')).toEqual(await colors(page, 'sheet'));
  await page.evaluate(() => window.setNightshiftTestMode('light'));
  for (const id of ['docs', 'sheet', 'dynamic']) {
    await expect(page.locator(`#${id}`)).toHaveCSS('filter', 'none');
    expect(await colors(page, id)).toEqual({ background: [255, 255, 255], text: [0, 0, 0] });
  }
  expect((await page.locator('#photo').screenshot()).equals(photo)).toBe(true);
  await page.evaluate(() => window.setNightshiftTestMode('dark'));
  expect(Math.min(...(await colors(page, 'sheet')).text)).toBeGreaterThan(210);
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('#sheet')).toHaveCSS('filter', 'none');
});

test('matching editor class names on another host never filter canvases', async ({ page }) => {
  await setup(page, 'docs.google.com.evil.example');
  await expect(page.locator('html')).not.toHaveAttribute('data-nightshift-google-docs');
  for (const id of ['docs', 'sheet', 'ordinary']) await expect(page.locator(`#${id}`)).toHaveCSS('filter', 'none');
});
