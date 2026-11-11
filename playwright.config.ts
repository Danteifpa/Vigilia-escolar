import { defineConfig, devices } from '@playwright/test';

/**
 * Testes ponta a ponta contra um Supabase LOCAL (`npx supabase start`) já
 * populado (`npm run dev:usuarios`). No CI rodam no job "e2e".
 */
const porta = Number(process.env.PORTA_E2E ?? 3000);

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${porta}`,
    locale: 'pt-BR',
    timezoneId: 'America/Belem',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run start -- -p ${porta}`,
    url: `http://localhost:${porta}/entrar`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
