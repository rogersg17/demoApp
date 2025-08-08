import { test, expect } from '@playwright/test'

test.describe('Navigation Debug Test', () => {
  test('should navigate to test management page', async ({ page }) => {
    // Listen for console messages
    page.on('console', msg => {
      console.log(`Browser console [${msg.type()}]:`, msg.text())
    })

    // Listen for page errors
    page.on('pageerror', error => {
      console.log('Page error:', error.message)
    })

    // Navigate to root first - authentication handled by storageState
    await page.goto('/')
    await expect(page.getByText(/welcome,\s*admin!?/i)).toBeVisible({ timeout: 15000 })
    
    // Take a screenshot before navigation
    await page.screenshot({ path: 'before-navigation.png' })
    
    // Check if the Tests link is present
    const testsLink = page.locator('nav a[href="/tests"]')
    await expect(testsLink).toBeVisible()
    
    // Click on the Tests link
    await testsLink.click()
    
    // Wait for navigation
    await page.waitForURL('**/tests')
    await expect(page).toHaveURL(/.*\/tests/)
    
    // Wait a bit for the page to render and console logs
    await page.waitForTimeout(3000)
    
    // Take a screenshot after navigation
    await page.screenshot({ path: 'after-navigation.png' })
    
    // Check what's actually on the page
    const pageContent = await page.textContent('body')
    console.log('Page content:', pageContent?.substring(0, 1000))
    
    // Check if there are any React elements
    const appMain = await page.locator('.app-main').textContent()
    console.log('App main content:', appMain?.substring(0, 500))
    
    // Check for specific elements
    const hasTestContainer = await page.locator('.test-management-container').count()
    console.log('Test container count:', hasTestContainer)
    
    const hasLoading = await page.locator('.loading').count()
    console.log('Loading element count:', hasLoading)
    
    const hasError = await page.locator('.error').count()
    console.log('Error element count:', hasError)
    
    // Take final screenshot
    await page.screenshot({ path: 'final-page.png' })
  })
})
