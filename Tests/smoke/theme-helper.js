import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const resources = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../Nightshift Extension/Resources');
const scripts = ['theme-policy.js', 'settings-store.js', 'manual-dark-sites.js', 'known-dark-sites.js', 'darkreader.js', 'theme-engine.js', 'content.js'];
const sources = await Promise.all(scripts.map((name) => readFile(path.join(resources, name), 'utf8')));
const css = await readFile(path.join(resources, 'nightshift.css'), 'utf8');

export async function installNightshift(page) {
  await page.addStyleTag({ content: css });
  await page.evaluate((sources) => {
    let listener;
    const settings = { globalMode: 'dark', enabledSites: [location.hostname], disabledSites: [], autoDisabledSites: [] };
    window.browser = {
      storage: {
        local: { get: async () => settings, set: async (value) => Object.assign(settings, value) },
        onChanged: { addListener(value) { listener = value; } },
      },
      runtime: { async sendMessage(message) {
        if (message.type === 'loadThemeStylesheet') {
          return { css: await (await fetch(message.url)).text() };
        }
        return settings;
      } },
    };
    window.setNightshiftTestMode = (mode) => {
      settings.globalMode = mode;
      listener({ globalMode: { newValue: mode } }, 'local');
    };
    window.originalNightshiftTestTransport = window.browser.runtime.sendMessage;
    window.originalNightshiftInsertRule = CSSStyleSheet.prototype.insertRule;
    window.chrome = { runtime: { sendMessage: window.originalNightshiftTestTransport, onMessage: { addListener() {} } } };
    for (const source of sources) {
      // Use the execution channel so tests also work under a page's script CSP.
      (0, eval)(source);
    }
  }, sources);
}
