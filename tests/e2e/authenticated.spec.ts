import { test, expect } from '@playwright/test';

// This spec assumes globalSetup stored an authenticated storageState
// It navigates to the Tests page and verifies content loads

test('login session persists and Tests page loads', async ({ page, baseURL }) => {
  const url = baseURL || 'http://localhost:5173';

  // Open app (will likely land on dashboard after auth)
  await page.goto(url);

  // Wait for authenticated UI (header shows Welcome, admin!)
  await expect(page.getByText(/welcome,\s*admin!?/i)).toBeVisible({ timeout: 15000 });

  // Navigate to Tests via sidebar (more stable) or direct route
  const sidebarTests = page.locator('nav .nav-link[title="Test Management"]');
  if (await sidebarTests.isVisible().catch(() => false)) {
    await sidebarTests.click();
  } else {
    await page.goto(`${url}/tests`);
  }

  // UI heading can vary; accept a broad match
  const headingVisible = await page.getByRole('heading', { name: /tests|test management/i }).first().isVisible().catch(() => false);
  expect(headingVisible).toBeTruthy();

  // Ensure table/content loads
  const testsTable = page.locator('.tests-table');
  const tableVisible = (await testsTable.isVisible().catch(() => false)) || (await page.getByRole('table').first().isVisible().catch(() => false));
  expect(tableVisible).toBeTruthy();

  // Optional: look for at least one row/cell
  const rows = page.locator('.tests-table tbody tr, table.tests-table tbody tr, table tbody tr');
  await expect(rows.first()).toBeVisible();
});
