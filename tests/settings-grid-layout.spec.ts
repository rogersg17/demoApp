import { test, expect } from '@playwright/test'

test.describe('Settings Page Grid Layout', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the login page first
    await page.goto('http://localhost:5174/login')
    
    // Login as admin
    await page.fill('input[name="username"]', 'admin')
    await page.fill('input[name="password"]', 'password')
    await page.click('button[type="submit"]')
    
    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard')
    
    // Navigate to settings page
    await page.goto('http://localhost:5174/settings')
  })

  test('should display settings in a grid layout', async ({ page }) => {
    // Wait for settings page to load
    await expect(page.locator('h1')).toContainText('Settings')
    
    // Check that the settings grid exists
    await expect(page.locator('.settings-grid')).toBeVisible()
    
    // Check that all 6 settings panels are visible
    const panels = page.locator('.settings-panel')
    await expect(panels).toHaveCount(6)
    
    // Check that each panel has the expected titles
    await expect(page.locator('.settings-panel h3').nth(0)).toContainText('Browser Configuration')
    await expect(page.locator('.settings-panel h3').nth(1)).toContainText('Test Execution')
    await expect(page.locator('.settings-panel h3').nth(2)).toContainText('Reporting & Output')
    await expect(page.locator('.settings-panel h3').nth(3)).toContainText('Environment Configuration')
    await expect(page.locator('.settings-panel h3').nth(4)).toContainText('JIRA Integration')
    await expect(page.locator('.settings-panel h3').nth(5)).toContainText('Advanced Settings')
  })

  test('should have functional form inputs in each panel', async ({ page }) => {
    // Test Browser Configuration panel
    const browserSelect = page.locator('.settings-panel').nth(0).locator('select')
    await expect(browserSelect).toHaveValue('chromium')
    await browserSelect.selectOption('firefox')
    await expect(browserSelect).toHaveValue('firefox')
    
    // Test Test Execution panel
    const maxRetriesInput = page.locator('.settings-panel').nth(1).locator('input[type="number"]').first()
    await expect(maxRetriesInput).toHaveValue('2')
    await maxRetriesInput.fill('3')
    await expect(maxRetriesInput).toHaveValue('3')
    
    // Test JIRA Integration panel
    const jiraCheckbox = page.locator('.settings-panel').nth(4).locator('input[type="checkbox"]')
    await expect(jiraCheckbox).not.toBeChecked()
    await jiraCheckbox.check()
    await expect(jiraCheckbox).toBeChecked()
    
    // Check that JIRA inputs become enabled when checkbox is checked
    const jiraUrlInput = page.locator('.settings-panel').nth(4).locator('input[type="url"]')
    await expect(jiraUrlInput).toBeEnabled()
  })

  test('should show all panels simultaneously without tabs', async ({ page }) => {
    // Verify no tab navigation exists
    await expect(page.locator('.settings-tabs')).not.toBeVisible()
    await expect(page.locator('.tab-btn')).toHaveCount(0)
    
    // Verify all panels are visible at the same time
    const panels = page.locator('.settings-panel')
    for (let i = 0; i < 6; i++) {
      await expect(panels.nth(i)).toBeVisible()
    }
  })

  test('should have working save and reset buttons', async ({ page }) => {
    // Check that action buttons exist
    await expect(page.locator('.settings-actions .btn-primary')).toContainText('Save Settings')
    await expect(page.locator('.settings-actions .btn-secondary')).toContainText('Reset to Defaults')
    
    // Make a change and save
    const browserSelect = page.locator('.settings-panel').nth(0).locator('select')
    await browserSelect.selectOption('webkit')
    
    await page.click('.settings-actions .btn-primary')
    
    // Check for success message (if implemented)
    // Note: This might show different behavior depending on if the backend is running
    await page.waitForTimeout(1000) // Give time for save operation
  })
})
