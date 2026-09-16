import { expect, test } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(here, '../..');
const stylesheetPath = path.join(
  repositoryRoot,
  'Nightshift Extension/Resources/nightshift.css',
);
const screenshotDirectory = path.join(repositoryRoot, '.build/smoke');
const requestedSite = process.env.NIGHTSHIFT_SMOKE_SITE?.trim().toLowerCase();

const sites = [
  {
    name: 'google',
    url: 'https://www.google.com/search?q=nightshift+safari+extension',
  },
  {
    name: 'wikipedia',
    url: 'https://en.wikipedia.org/wiki/Dark_mode',
  },
  {
    name: 'github',
    url: 'https://github.com/unmade/Nightshift',
  },
  {
    name: 'stackoverflow',
    url: 'https://stackoverflow.com/questions',
  },
  {
    name: 'youtube',
    url: 'https://www.youtube.com/',
  },
].filter(({ name }) => !requestedSite || name === requestedSite);

if (requestedSite && sites.length === 0) {
  throw new Error(`Unknown NIGHTSHIFT_SMOKE_SITE: ${requestedSite}`);
}

const stylesheet = await readFile(stylesheetPath, 'utf8');

for (const site of sites) {
  test(`${site.name} accepts the Nightshift treatment`, async ({ page }) => {
    const response = await page.goto(site.url, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });

    expect(response, `${site.name} did not return a document response`).not.toBeNull();
    expect(response.status(), `${site.name} returned HTTP ${response.status()}`).toBeLessThan(500);

    // Let client-side redirects and challenge pages settle before simulating the
    // content script. Otherwise a site can replace the document after injection.
    await page.waitForTimeout(750);
    await page.addStyleTag({ content: stylesheet });
    await page.evaluate(() => document.documentElement.setAttribute('data-nightshift-active', ''));

    const result = await page.evaluate(() => {
      const root = document.documentElement;
      const mediaSelector = 'img, video, canvas, svg, [role="img"]';
      const visibleMedia = [...document.querySelectorAll(mediaSelector)].find((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 8 && rect.height > 8 && style.visibility !== 'hidden';
      });

      return {
        active: root.hasAttribute('data-nightshift-active'),
        rootFilter: getComputedStyle(root).filter,
        mediaFilter: visibleMedia ? getComputedStyle(visibleMedia).filter : null,
        title: document.title,
        horizontalOverflow: root.scrollWidth - root.clientWidth,
      };
    });

    expect(result.title, `${site.name} rendered no page title`).not.toBe('');
    expect(result.active).toBe(true);
    expect(result.rootFilter).toContain('invert');
    if (result.mediaFilter !== null) {
      expect(result.mediaFilter).toContain('invert');
    }
    expect(result.horizontalOverflow, 'Nightshift introduced substantial horizontal overflow').toBeLessThan(4);

    await mkdir(screenshotDirectory, { recursive: true });
    await page.screenshot({
      path: path.join(screenshotDirectory, `${site.name}.png`),
      fullPage: false,
    });
  });
}
