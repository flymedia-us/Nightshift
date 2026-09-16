import { webkit } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const artworkDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.dirname(artworkDirectory);

const extensionIconSizes = [48, 64, 96, 128, 256, 512];
const toolbarIconSizes = [16, 19, 32, 38];

async function render(svgName, size, outputPaths, browser) {
  const svg = await readFile(path.join(artworkDirectory, svgName), 'utf8');
  const page = await browser.newPage({ viewport: { width: size, height: size } });

  await page.setContent(`
    <!doctype html>
    <style>
      html, body { width: 100%; height: 100%; margin: 0; background: transparent; }
      svg { display: block; width: 100%; height: 100%; }
    </style>
    ${svg}
  `);

  const png = await page.screenshot({ omitBackground: true });
  for (const outputPath of outputPaths) {
    await writeFile(outputPath, png);
  }

  await page.close();
}

const browser = await webkit.launch();

try {
  const extensionDirectory = path.join(repositoryRoot, 'Nightshift Extension/Resources');
  for (const size of extensionIconSizes) {
    await render(
      'Nightshift-AppIcon.svg',
      size,
      [path.join(extensionDirectory, `icon-${size}.png`)],
      browser,
    );
  }

  for (const size of toolbarIconSizes) {
    await render(
      'Nightshift-Toolbar.svg',
      size,
      [path.join(extensionDirectory, `toolbar-${size}.png`)],
      browser,
    );
  }

  await render(
    'Nightshift-IconComposer-Crescent.svg',
    1024,
    [
      path.join(artworkDirectory, 'IconComposer-Crescent-1024.png'),
      path.join(repositoryRoot, 'Nightshift/Nightshift.icon/Assets/IconComposer-Crescent-1024.png'),
    ],
    browser,
  );
} finally {
  await browser.close();
}
