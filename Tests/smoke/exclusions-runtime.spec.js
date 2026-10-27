import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const resources = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../Nightshift Extension/Resources');
const sources = await Promise.all(['theme-policy.js', 'settings-store.js', 'manual-dark-sites.js', 'known-dark-sites.js', 'content.js'].map((name) => readFile(path.join(resources, name), 'utf8')));

async function install(page, url, initial = {}) {
  await page.route(url, (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><style>body { background: black; color: white }</style></head><body>Already dark-looking page</body></html>' }));
  await page.goto(url);
  await page.evaluate(({ sources, initial }) => {
    let settings = { globalMode: 'dark', disabledSites: [], enabledSites: [], autoDisabledSites: [], ...initial };
    let listener;
    window.savedExclusions = [];
    window.browser = { storage: {
      local: {
        async get() { return settings; },
        async set(next) {
          const changes = Object.fromEntries(Object.entries(next).map(([key, newValue]) => [key, { newValue }]));
          settings = next;
          window.savedExclusions.push(next.autoDisabledSites);
          listener(changes, 'local');
        },
      },
      onChanged: { addListener(value) { listener = value; } },
    } };
    window.NightshiftThemeEngine = { setActive() {} };
    for (const source of sources) (0, eval)(source);
  }, { sources, initial });
}

test('only a known live site marker creates a detection, and its removal restores theming', async ({ page }) => {
  await install(page, 'https://www.youtube.com/');
  await expect(page.locator('html')).toHaveAttribute('data-nightshift-active', '');
  await page.evaluate(() => document.documentElement.setAttribute('dark', ''));
  await expect(page.locator('html')).not.toHaveAttribute('data-nightshift-active', '');
  await expect.poll(() => page.evaluate(() => window.savedExclusions.at(-1))).toEqual(['www.youtube.com']);
  await page.evaluate(() => document.documentElement.removeAttribute('dark'));
  await expect(page.locator('html')).toHaveAttribute('data-nightshift-active', '');
  await expect.poll(() => page.evaluate(() => window.savedExclusions.at(-1))).toEqual([]);
});

test('stale caches and arbitrary dark pages never create false detections', async ({ page }) => {
  await install(page, 'https://unlisted.publicdomain.org/', { autoDisabledSites: ['unlisted.publicdomain.org'] });
  await expect(page.locator('html')).toHaveAttribute('data-nightshift-active', '');
  await page.evaluate(() => document.documentElement.setAttribute('dark', ''));
  await expect.poll(() => page.evaluate(() => window.savedExclusions.at(-1))).toEqual([]);
  await expect(page.locator('html')).toHaveAttribute('data-nightshift-active', '');
});

test('user overrides bundled exclusions and manual exclusions win', async ({ page }) => {
  await install(page, 'https://chatgpt.com/', { enabledSites: ['chatgpt.com'], disabledSites: ['chatgpt.com'] });
  await expect(page.locator('html')).not.toHaveAttribute('data-nightshift-active', '');
  await expect.poll(() => page.evaluate(() => window.savedExclusions.length)).toBe(0);
});

test('an explicit enable bypasses the Nightshift master list without creating a detection', async ({ page }) => {
  await install(page, 'https://chatgpt.com/', { enabledSites: ['chatgpt.com'] });
  await expect(page.locator('html')).toHaveAttribute('data-nightshift-active', '');
  await expect.poll(() => page.evaluate(() => window.savedExclusions.length)).toBe(0);
});
