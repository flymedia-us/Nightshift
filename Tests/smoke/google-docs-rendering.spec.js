import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(here, '../..');
const stylesheet = await readFile(
  path.join(repositoryRoot, 'Nightshift Extension/Resources/nightshift.css'),
  'utf8',
);

test('Google Docs uses the shared dark-gray filter without double-inverting its canvases', async ({ page }) => {
  await page.setContent(`
    <div id="docs-editor"><canvas width="120" height="40"></canvas></div>
    <canvas id="ordinary-canvas" width="120" height="40"></canvas>
  `);
  await page.addStyleTag({ content: stylesheet });
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-nightshift-active', '');
    document.documentElement.setAttribute('data-nightshift-google-docs', '');
  });

  const filters = await page.evaluate(() => ({
    root: getComputedStyle(document.documentElement).filter,
    docsCanvas: getComputedStyle(document.querySelector('#docs-editor canvas')).filter,
    ordinaryCanvas: getComputedStyle(document.querySelector('#ordinary-canvas')).filter,
  }));

  expect(filters.root).toContain('invert(0.85)');
  expect(filters.docsCanvas).toBe('none');
  expect(filters.ordinaryCanvas).toContain('invert');
});
