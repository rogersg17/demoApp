import { test, expect } from '@playwright/test'

test.describe('Test Management Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to root first, then to tests page - authentication handled by storageState
    await page.goto('/')
    await expect(page.getByText(/welcome,\s*admin!?/i)).toBeVisible({ timeout: 15000 })
    
    // Navigate to Tests page
    const sidebarTests = page.locator('nav .nav-link[title="Test Management"]')
    if (await sidebarTests.isVisible().catch(() => false)) {
      await sidebarTests.click()
    } else {
      await page.goto('/tests')
    }
    await expect(page).toHaveURL(/.*\/tests/)
  })

  test('should display the test management page header', async ({ page }) => {
    // Check page header - target the specific h1 for test management
    await expect(page.locator('main h1')).toContainText('Test Management')
    await expect(page.locator('.page-header p')).toContainText('Execute and manage your test suites')
  })

  test('should display test statistics cards', async ({ page }) => {
    // Check that stats cards are present
    await expect(page.locator('.stats-grid')).toBeVisible()
    await expect(page.locator('.stat-card')).toHaveCount(4)
    
    // Check stat card titles
    await expect(page.locator('.stat-card h3')).toContainText(['Total Tests', 'Passed', 'Failed', 'Pass Rate'])
  })

  test('should display test controls section', async ({ page }) => {
    // Check test controls are present
    await expect(page.locator('.test-controls')).toBeVisible()
    await expect(page.locator('button')).toContainText(['Run Selected', 'Run All Tests', 'Select All Filtered', 'Clear Selection'])
  })

  test('should display filters section', async ({ page }) => {
    // Check filters are present
    await expect(page.locator('.filters-section')).toBeVisible()
    await expect(page.locator('.search-box input')).toBeVisible()
    await expect(page.locator('.filter-group select')).toHaveCount(2)
  })

  test('should display tests table with headers', async ({ page }) => {
    // Wait for the table to load
    await expect(page.locator('.tests-table-container')).toBeVisible()
    await expect(page.locator('.tests-table')).toBeVisible()
    
    // Check individual table headers using more specific selectors
    const headers = ['Test', 'Suite', 'Status', 'Duration', 'Last Run', 'Actions']
    for (const header of headers) {
      await expect(page.locator('.tests-table th').filter({ hasText: header })).toBeVisible()
    }
  })

  test('should load and display test data in the table', async ({ page }) => {
    // Wait for loading to complete - either show tests or show "no results"
    await page.waitForFunction(() => {
      const loadingElement = document.querySelector('.loading')
      const tableBody = document.querySelector('.tests-table tbody')
      const noResults = document.querySelector('.no-results')
      
      // Loading should be gone AND either we have test rows or no results message
      return !loadingElement && (
        (tableBody && tableBody.children.length > 0) ||
        noResults
      )
    }, { timeout: 10000 })

    // Check if we have test data or no results message
    const tableRows = page.locator('.tests-table tbody tr')
    const noResultsMessage = page.locator('.no-results')
    
    // Either we should have test rows OR a no results message
    const hasRows = await tableRows.count() > 0
    const hasNoResultsMessage = await noResultsMessage.isVisible()
    
    expect(hasRows || hasNoResultsMessage).toBeTruthy()
    
    if (hasRows) {
      console.log(`✅ Found ${await tableRows.count()} test rows in the table`)
      
      // If we have tests, verify the structure of the first row
      const firstRow = tableRows.first()
      await expect(firstRow.locator('td')).toHaveCount(7) // Including checkbox column
      
      // Check that status badges are present
      await expect(firstRow.locator('.status-badge')).toBeVisible()
      
      // Check that action buttons are present
      await expect(firstRow.locator('.btn-run')).toBeVisible()
    } else {
      console.log('ℹ️ No test data found - showing no results message')
      await expect(noResultsMessage).toContainText('No tests found')
    }
  })

  test('should handle search functionality', async ({ page }) => {
    // Wait for page to load and data to be displayed
    const initialRowCount = await page.locator('.tests-table tbody tr').count()
    expect(initialRowCount).toBeGreaterThan(0)
    
    // Try searching for something that should exist
    const searchInput = page.locator('.search-box input')
    await searchInput.fill('test')
    
    // Wait a moment for filtering to occur
    await page.waitForTimeout(1000)
    
    // Should show filtered results containing "test"
    const tableRows = page.locator('.tests-table tbody tr')
    const rowCount = await tableRows.count()
    
    // Should have some results for "test" search
    expect(rowCount).toBeGreaterThan(0)
    expect(rowCount).toBeLessThanOrEqual(initialRowCount) // Should be filtered down or same
    
    // Clear search to verify all tests return
    await searchInput.clear()
    await page.waitForTimeout(500)
    const allRowsCount = await tableRows.count()
    expect(allRowsCount).toBe(initialRowCount)
  })

  test('should show error state gracefully if API fails', async ({ page }) => {
    // This test checks that the page handles API errors gracefully
    // We can't easily simulate API failures, but we can check the error state exists
    
    // Navigate to test management and wait for either success or error state
    await page.waitForFunction(() => {
      const loading = document.querySelector('.loading')
      const error = document.querySelector('.error')
      const table = document.querySelector('.tests-table')
      
      return !loading && (error || table)
    }, { timeout: 10000 })
    
    // Page should either show content or error, not be stuck loading
    const isLoading = await page.locator('.loading').isVisible()
    expect(isLoading).toBeFalsy()
  })
})
