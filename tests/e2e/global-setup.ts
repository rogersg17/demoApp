import { chromium, FullConfig } from '@playwright/test';
import fs from 'fs';

// Global setup logs in via UI and saves the authenticated storage state
export default async function globalSetup(config: FullConfig) {
  const baseURL = process.env.PW_BASE_URL || 'http://localhost:5173';
  const storageStatePath = 'tests/.auth/admin.json';

  // Ensure output directory exists
  fs.mkdirSync('tests/.auth', { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Navigate to login and perform UI login to capture session cookies
  await page.goto(`${baseURL}/login`);

  // Wait for form fields to appear and fill credentials
  await page.waitForSelector('#username');
  await page.fill('#username', 'admin');
  await page.fill('#password', 'admin123');

  // Click the Sign In button and await the login API success
  const [loginResponse] = await Promise.all([
    page.waitForResponse((resp) => resp.url().includes('/api/auth/login') && resp.status() === 200),
    page.getByRole('button', { name: /sign in/i }).click(),
  ]);

  if (!loginResponse || loginResponse.status() !== 200) {
    throw new Error('Login failed during global setup');
  }

  // Verify auth status and that app routes recognize it by opening root
  const statusOk = await page.request.get(`${baseURL}/api/auth/status`).then(r => r.ok());
  if (!statusOk) throw new Error('Auth status not OK after login');

  // Load root to let React app set its auth state and route to dashboard
  await page.goto(baseURL);
  await page.waitForURL(/\/dashboard/, { timeout: 15000 }).catch(() => {});

  await context.storageState({ path: storageStatePath });
  await browser.close();
}
