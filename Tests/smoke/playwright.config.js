import { defineConfig, devices } from '@playwright/test';
import os from 'node:os';

const requestedHeaded = process.env.NIGHTSHIFT_SMOKE_HEADED;
const runningOnMacOS27OrLater =
  process.platform === 'darwin' && Number.parseInt(os.release(), 10) >= 27;

// Playwright's macOS WebKit headless binary aborts during NSApplication setup
// on macOS 27. Keep smoke tests reliable locally while retaining an explicit
// headless override for environments where that WebKit mode is supported.
const headed =
  requestedHeaded === '1' ||
  (requestedHeaded !== '0' && runningOnMacOS27OrLater);

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.js',
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  outputDir: '../../.build/playwright',
  reporter: [['list']],
  use: {
    ...devices['Desktop Safari'],
    colorScheme: 'light',
    headless: !headed,
    ignoreHTTPSErrors: false,
    locale: 'en-US',
    reducedMotion: 'reduce',
    screenshot: 'off',
    trace: 'retain-on-failure',
  },
});
