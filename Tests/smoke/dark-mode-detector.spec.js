import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const resources = path.resolve(here, '../../Nightshift Extension/Resources');
const knownSitesSource = await readFile(path.join(resources, 'known-dark-sites.js'), 'utf8');
const detectorSource = await readFile(path.join(resources, 'native-dark-mode-detector.js'), 'utf8');

const cases = [
  {
    name: 'Cornell News remains eligible while rendered light',
    url: 'https://news.cornell.edu/',
    colorScheme: 'light',
    expectedDark: false,
  },
  {
    name: 'YouTube is detected when its dark theme is active',
    url: 'https://www.youtube.com/',
    colorScheme: 'dark',
    expectedDark: true,
  },
];

for (const site of cases) {
  test(site.name, async ({ page }) => {
    await page.emulateMedia({ colorScheme: site.colorScheme });
    const response = await page.goto(site.url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    expect(response).not.toBeNull();
    expect(response.status()).toBeLessThan(500);
    await page.waitForTimeout(1_000);
    // Evaluate in Playwright's isolated execution channel so the test also works
    // on pages, such as YouTube, that require Trusted Types for injected scripts.
    await page.evaluate(([knownSource, nativeDetectorSource]) => {
      // eslint-disable-next-line no-eval
      eval(knownSource);
      // eslint-disable-next-line no-eval
      eval(nativeDetectorSource);
    }, [knownSitesSource, detectorSource]);

    const detected = await page.evaluate(() => (
      window.NightshiftNativeDarkModeDetector.hasNativeDarkAppearance(document, location.host)
    ));
    expect(detected).toBe(site.expectedDark);
  });
}
