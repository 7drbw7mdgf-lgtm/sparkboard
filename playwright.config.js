import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure' },
  webServer: {
    command: 'node tests/browser/serve.cjs',
    url: 'http://127.0.0.1:4173/sai/',
    reuseExistingServer: !process.env.CI,
  },
});
