import { defineConfig, devices } from '@playwright/test';

const headed = process.env.NIGHTSHIFT_SMOKE_HEADED === '1';

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
