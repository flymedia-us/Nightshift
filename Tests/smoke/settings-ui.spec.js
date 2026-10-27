import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import policy from '../../Nightshift Extension/Resources/theme-policy.js';

const resources = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../Nightshift Extension/Resources');

async function extensionPage(context, name, service, tabURL = 'https://example.com/page') {
  const page = await context.newPage();
  await page.route('https://nightshift.test/**', async (route) => {
    const name = path.basename(new URL(route.request().url()).pathname);
    const body = await readFile(path.join(resources, name));
    const contentType = name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : name.endsWith('.png') ? 'image/png' : 'text/html';
    await route.fulfill({ body, contentType });
  });
  await page.exposeFunction('settingsTransport', service);
  await page.addInitScript(({ tabURL }) => {
    let cache = {};
    const listeners = [];
    window.browser = {
      storage: {
        local: { async get(defaults) { return { ...defaults, ...cache }; } },
        onChanged: { addListener(listener) { listeners.push(listener); } },
      },
      tabs: {
        async query() { return [{ url: tabURL }]; },
        async create({ url }) { window.optionsOpened = url; },
      },
      runtime: {
        getURL(path) { return `https://nightshift.test/${path}`; },
        async sendMessage(message) {
          const next = await window.settingsTransport(message);
          const changes = Object.fromEntries(Object.entries(next).filter(([key, value]) => JSON.stringify(cache[key]) !== JSON.stringify(value))
            .map(([key, newValue]) => [key, { newValue }]));
          cache = next;
          if (Object.keys(changes).length) listeners.forEach((listener) => listener(changes, 'local'));
          return next;
        },
      },
    };
  }, { tabURL });
  await page.goto(`https://nightshift.test/${name}`);
  return page;
}

function service(initial = {}) {
  let settings = policy.normalizeSettings(initial);
  return async (message) => {
    if (message.type === 'updateSettings') settings = policy.applyChange(settings, message.change);
    return settings;
  };
}

async function expectExtensionAppearance(page, dark) {
  // Inspect rendered colors, not merely a class or color-scheme declaration.
  await expect.poll(() => page.evaluate((dark) => {
    const brightness = (color) => {
      const components = color.match(/[\d.]+/g).slice(0, 3).map(Number);
      return components.reduce((sum, value) => sum + value, 0) / 3;
    };
    const body = getComputedStyle(document.body);
    const field = document.querySelector('#excluded-site-host');
    const input = field ? getComputedStyle(field) : body;
    return dark
      ? brightness(body.backgroundColor) < 80 && brightness(body.color) > 180 && brightness(input.backgroundColor) < 80
      : brightness(body.backgroundColor) > 200 && brightness(body.color) < 80 && brightness(input.backgroundColor) > 200;
  }, dark)).toBe(true);
}

for (const name of ['popup.html', 'options.html']) {
for (const system of ['light', 'dark']) {
  test(`${name} renders Nightshift's appearance independently of a ${system} system`, async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: system });
    try {
      const shared = service({ globalMode: 'dark' });
      const page = await extensionPage(context, name, shared);
      await expectExtensionAppearance(page, true);
      await page.getByRole('radio', { name: /Always Light/ }).check();
      await expectExtensionAppearance(page, false);
      await page.getByRole('radio', { name: /System/ }).check();
      await expectExtensionAppearance(page, system === 'dark');
      await page.emulateMedia({ colorScheme: system === 'dark' ? 'light' : 'dark' });
      await expectExtensionAppearance(page, system !== 'dark');
      await page.getByRole('radio', { name: /Always Dark/ }).check();
      await expectExtensionAppearance(page, true);
      const reopened = await extensionPage(context, name, shared);
      await expectExtensionAppearance(reopened, true);
    } finally {
      await context.close();
    }
  });
}
}

test('popup supports keyboard mode changes, protected pages, and settings discovery', async ({ context }) => {
  const page = await extensionPage(context, 'popup.html', service(), 'safari://settings');
  await expect(page.getByRole('radio', { name: /System/ })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: /Enable on this website/ })).toBeDisabled();
  const dark = page.getByRole('radio', { name: /Always Dark/ });
  await dark.focus();
  await page.keyboard.press('Space');
  await expect(dark).toBeChecked();
  await expect(page.getByRole('status')).toHaveText('Saved');
  await expectExtensionAppearance(page, true);
  await expect(page.getByRole('button', { name: 'Manage excluded websites…' })).toHaveCount(0);
  const settings = page.getByRole('button', { name: 'Open Nightshift settings' });
  await settings.focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => window.optionsOpened)).toBe('https://nightshift.test/options.html');
});

test('settings separate all four layers, export only public manual sites, and handle false positives', async ({ context }) => {
  const shared = service({ disabledSites: ['www.samfriedman.art', 'localhost:3000', '192.168.50.249:8000'], autoDisabledSites: ['www.youtube.com', 'photopea.com', 'docs.google.com'] });
  const page = await extensionPage(context, 'options.html', shared);
  for (const title of ['Your manual exclusions', 'Auto-detected exclusions', 'Nightshift exclusion list', 'Dark Reader exclusion list']) {
    await expect(page.getByRole('heading', { name: title, exact: title !== 'Auto-detected exclusions' })).toBeVisible();
  }
  await expect(page.locator('#excluded-sites .site-name')).toHaveText(['192.168.50.249:8000', 'localhost:3000', 'www.samfriedman.art']);
  await expect(page.locator('#detected-sites .site-name')).toHaveText(['www.youtube.com']);
  await page.locator('#export-section summary').click();
  await expect(page.getByRole('textbox', { name: 'Public manual exclusions' })).toHaveValue('www.samfriedman.art');
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { async writeText(value) { window.copiedPublicExclusions = value; } } }));
  await page.getByRole('button', { name: 'Copy public exclusions' }).click();
  await expect.poll(() => page.evaluate(() => window.copiedPublicExclusions)).toBe('www.samfriedman.art');
  await page.evaluate(() => { navigator.clipboard.writeText = async () => { throw new Error('Clipboard denied'); }; });
  await page.getByRole('button', { name: 'Copy public exclusions' }).click();
  await expect(page.getByRole('textbox', { name: 'Public manual exclusions' })).toBeFocused();
  await expect(page.getByRole('status')).toHaveText('Select and copy the public exclusions above.');
  await page.locator('#nightshift-registry summary').click();
  await page.getByRole('searchbox', { name: 'Search Nightshift list' }).fill('samfriedman');
  await expect(page.locator('#nightshift-sites .site-name')).toHaveText(['www.samfriedman.art']);
  await page.locator('#dark-reader-registry summary').click();
  await page.getByRole('searchbox', { name: 'Search Dark Reader list' }).fill('photopea');
  await expect(page.locator('#dark-reader-sites .site-name')).toHaveText(['photopea.com']);
  await page.getByRole('button', { name: 'Override exclusion for www.youtube.com' }).click();
  await expect(page.getByText('No auto-detected exclusions')).toBeVisible();
  await page.locator('#enabled-overrides summary').click();
  await expect(page.locator('#enabled-sites .site-name')).toHaveText(['www.youtube.com']);
  await page.getByRole('button', { name: 'Use automatic rules for www.youtube.com' }).click();
  await expect(page.getByText('No enabled overrides')).toBeVisible();
  const reopened = await extensionPage(context, 'options.html', shared);
  await expect(reopened.locator('#excluded-sites .site-name')).toHaveText(['192.168.50.249:8000', 'localhost:3000', 'www.samfriedman.art']);
  await expect(reopened.locator('#detected-sites .site-name')).toHaveCount(0);
});

test('excluded sites validate, normalize, persist across pages, and render addresses as text', async ({ context }) => {
  const shared = service();
  const page = await extensionPage(context, 'options.html', shared);
  const host = page.getByRole('textbox', { name: 'Website address' });
  const add = page.getByRole('button', { name: 'Exclude website' });
  await host.fill('file:///private/test');
  await add.click();
  await expect(page.getByRole('status')).toHaveText('Enter a valid website address');
  await expect(host).toBeFocused();
  await host.fill('https://EXAMPLE.com:8443/path?x=1');
  await page.keyboard.press('Enter');
  await expect(page.locator('#excluded-sites .site-name')).toHaveText('example.com:8443');
  await expect(page.getByRole('status')).toHaveText('Website excluded');
  const reopened = await extensionPage(context, 'options.html', shared);
  await expect(reopened.locator('#excluded-sites .site-name')).toHaveText('example.com:8443');
  await reopened.getByRole('button', { name: 'Remove example.com:8443 from excluded websites' }).click();
  await expect(reopened.getByText('No manual exclusions')).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByText('No manual exclusions')).toBeVisible();
});

test('settings appearance controls persist, share popup changes, and preserve website exclusions', async ({ context }) => {
  const shared = service({ globalMode: 'light', disabledSites: ['saved.example'] });
  const options = await extensionPage(context, 'options.html', shared);
  await expect(options.getByRole('heading', { name: 'Appearance', exact: true })).toBeVisible();
  await expect(options.getByRole('heading', { name: 'Excluded websites', exact: true })).toBeVisible();
  await expect(options.getByRole('radio', { name: /Always Light/ })).toBeChecked();
  await options.getByRole('radio', { name: /Always Dark/ }).check();
  await expect(options.locator('#appearance-status')).toHaveText('Saved');
  await expectExtensionAppearance(options, true);
  const popup = await extensionPage(context, 'popup.html', shared);
  await expect(popup.getByRole('radio', { name: /Always Dark/ })).toBeChecked();
  await expectExtensionAppearance(popup, true);
  await popup.getByRole('radio', { name: /Always Light/ }).check();
  await expect(popup.getByRole('status')).toHaveText('Saved');
  await expectExtensionAppearance(popup, false);
  await options.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(options.getByRole('radio', { name: /Always Light/ })).toBeChecked();
  await expectExtensionAppearance(options, false);
  await options.getByRole('radio', { name: /Always Dark/ }).check();
  await expect(options.locator('#appearance-status')).toHaveText('Saved');
  await popup.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(popup.getByRole('radio', { name: /Always Dark/ })).toBeChecked();
  await expectExtensionAppearance(popup, true);
  await options.getByRole('radio', { name: /System/ }).check();
  await expect(options.locator('#appearance-status')).toHaveText('Saved');
  const reopened = await extensionPage(context, 'options.html', shared);
  await expect(reopened.getByRole('radio', { name: /System/ })).toBeChecked();
  await expect(reopened.locator('#excluded-sites .site-name')).toHaveText('saved.example');
});

test('an open profile refreshes another profile’s edits and retains keyboard focus on unchanged refresh', async ({ browser }) => {
  const shared = service({ disabledSites: ['saved.example'] });
  const first = await browser.newContext();
  const second = await browser.newContext();
  try {
    const options = await extensionPage(first, 'options.html', shared);
    const remove = options.getByRole('button', { name: 'Remove saved.example from excluded websites' });
    await remove.focus();
    await options.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(remove).toBeFocused();
    const popup = await extensionPage(second, 'popup.html', shared);
    await expect(popup.locator('#site-domain')).toHaveText('example.com');
    await popup.getByRole('checkbox', { name: /Enable on this website/ }).uncheck();
    await expect(popup.getByRole('status')).toHaveText('Saved');
    await options.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(options.locator('#excluded-sites .site-name')).toHaveText(['example.com', 'saved.example']);
  } finally {
    await first.close();
    await second.close();
  }
});

for (const name of ['popup.html', 'options.html']) {
test(`${name} reports delayed cross-profile sync and recovers from appearance save errors`, async ({ context }) => {
  let fail = false;
  const page = await extensionPage(context, name, async (message) => {
    if (fail && message.type === 'updateSettings') throw new Error('Storage unavailable');
    return { ...policy.normalizeSettings({ globalMode: message.change?.mode }), syncPending: message.type === 'updateSettings' };
  });
  const status = name === 'popup.html' ? page.getByRole('status') : page.locator('#appearance-status');
  await page.getByRole('radio', { name: /Always Dark/ }).check();
  await expect(status).toContainText('sharing with other profiles will retry');
  await expectExtensionAppearance(page, true);
  fail = true;
  await page.getByRole('radio', { name: /Always Light/ }).click();
  await expect(status).toContainText("Couldn't save");
  await expect(page.getByRole('radio', { name: /Always Dark/ })).toBeChecked();
  await expectExtensionAppearance(page, true);
});
}
