import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    viewport: { width: 1280, height: 800 }
  },
  reporter: [['list'], ['html', { outputFolder: 'tests/e2e/report', open: 'never' }]]
})
