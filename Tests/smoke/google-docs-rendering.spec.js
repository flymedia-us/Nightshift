import { expect, test } from '@playwright/test';
import { installNightshift } from './theme-helper.js';

test('document canvases retain their pixels while the interface darkens', async ({ page }) => {
  await page.setContent(`
    <style>body { background: white; color: black; }</style>
    <div id="docs-editor"><canvas width="120" height="40"></canvas></div>
    <canvas id="ordinary-canvas" width="120" height="40"></canvas>
  `);
  await installNightshift(page);
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-nightshift-active', '');
    document.documentElement.setAttribute('data-nightshift-google-docs', '');
  });

  const filters = await page.evaluate(() => ({
    root: getComputedStyle(document.documentElement).filter,
    docsCanvas: getComputedStyle(document.querySelector('#docs-editor canvas')).filter,
    ordinaryCanvas: getComputedStyle(document.querySelector('#ordinary-canvas')).filter,
  }));

  expect(filters.root).toBe('none');
  expect(filters.docsCanvas).toBe('none');
  expect(filters.ordinaryCanvas).toBe('none');
  await expect(page.locator('body')).not.toHaveCSS('background-color', 'rgb(255, 255, 255)');
});
