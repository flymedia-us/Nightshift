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

test('popup supports keyboard mode changes, protected pages, and settings discovery', async ({ context }) => {
  const page = await extensionPage(context, 'popup.html', service(), 'safari://settings');
  await expect(page.getByRole('radio', { name: /System/ })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: /Enable on this website/ })).toBeDisabled();
  const dark = page.getByRole('radio', { name: /Always Dark/ });
  await dark.focus();
  await page.keyboard.press('Space');
  await expect(dark).toBeChecked();
  await expect(page.getByRole('status')).toHaveText('Saved');
  const manage = page.getByRole('button', { name: 'Manage excluded websites…' });
  await manage.focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => window.optionsOpened)).toBe('https://nightshift.test/options.html');
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
  await expect(page.locator('.site-name')).toHaveText('example.com:8443');
  await expect(page.getByRole('status')).toHaveText('Website excluded');
  const reopened = await extensionPage(context, 'options.html', shared);
  await expect(reopened.locator('.site-name')).toHaveText('example.com:8443');
  await reopened.getByRole('button', { name: 'Remove example.com:8443 from excluded websites' }).click();
  await expect(reopened.getByText('No excluded websites')).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByText('No excluded websites')).toBeVisible();
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
    await popup.getByRole('checkbox', { name: /Enable on this website/ }).uncheck();
    await expect(popup.getByRole('status')).toHaveText('Saved');
    await options.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(options.locator('.site-name')).toHaveText(['example.com', 'saved.example']);
  } finally {
    await first.close();
    await second.close();
  }
});

test('the settings popup reports delayed cross-profile sync and recovers from save errors', async ({ context }) => {
  let fail = false;
  const page = await extensionPage(context, 'popup.html', async (message) => {
    if (fail && message.type === 'updateSettings') throw new Error('Storage unavailable');
    return { ...policy.normalizeSettings({ globalMode: message.change?.mode }), syncPending: message.type === 'updateSettings' };
  });
  await page.getByRole('radio', { name: /Always Dark/ }).check();
  await expect(page.getByRole('status')).toContainText('sharing with other profiles will retry');
  fail = true;
  await page.getByRole('radio', { name: /Always Light/ }).click();
  await expect(page.getByRole('status')).toContainText("Couldn't save");
  await expect(page.getByRole('radio', { name: /Always Dark/ })).toBeChecked();
});
