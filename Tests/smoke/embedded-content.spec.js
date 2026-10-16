import { expect, test } from '@playwright/test';
import { installNightshift } from './theme-helper.js';

test('cross-origin frames darken, honor the parent exclusion, and preserve media and positioning', async ({ page }) => {
  await page.route('https://*.nightshift.test/**', async (route) => {
    const parent = new URL(route.request().url()).hostname === 'parent.nightshift.test';
    await route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><head><style>
      body { background: white; color: black; } .panel { background: #fff; color: #111; }
      .sticky { position: sticky; top: 0; } svg { width: 40px; height: 40px; }
      </style></head><body>
      <div class="panel sticky">Sticky navigation</div>
      <svg viewBox="0 0 40 40"><path fill="#ff6600" d="M0 0H40V40H0Z"/></svg>
      <video poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Crect width='20' height='20' fill='red'/%3E%3C/svg%3E"></video>
      <input aria-label="Embedded form" value="Original text">
      ${parent ? '<iframe src="https://embed.nightshift.test/frame"></iframe>' : ''}
      </body></html>` });
  });
  await page.goto('https://parent.nightshift.test/');
  const frame = page.frames().find((frame) => frame.url().includes('embed.nightshift.test'));
  expect(frame).toBeTruthy();
  for (const target of [page, frame]) {
    await installNightshift(target, { tabHost: 'parent.nightshift.test' });
    await expect(target.locator('html')).toHaveAttribute('data-nightshift-active', '');
    await expect(target.locator('.panel')).not.toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(target.locator('.sticky')).toHaveCSS('position', 'sticky');
    await expect(target.locator('svg path')).toHaveCSS('fill', 'rgb(255, 102, 0)');
    await expect(target.locator('video')).toHaveCSS('filter', 'none');
    await target.getByRole('textbox').fill('Typed text');
    await expect(target.getByRole('textbox')).toHaveValue('Typed text');
  }
  for (const target of [page, frame]) {
    await target.evaluate(() => window.setNightshiftTestSettings({ disabledSites: ['parent.nightshift.test'] }));
    await expect(target.locator('html')).not.toHaveAttribute('data-nightshift-active', '');
    await expect(target.locator('.panel')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(target.getByRole('textbox')).toHaveValue('Typed text');
  }
});
