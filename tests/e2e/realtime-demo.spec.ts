import { test, expect } from '@playwright/test'

test.describe('Real-time Monitoring Demo', () => {
  test('Simple passing test', async ({ page }) => {
    console.log('Starting simple passing test...')
    
    await page.goto('/login')
    
    console.log('Navigated to login page')
    await page.waitForTimeout(2000) // Simulate some work
    
    await expect(page.locator('input[name="username"]')).toBeVisible()
    console.log('Username field is visible')
    
    await page.waitForTimeout(1000)
    console.log('Test completed successfully')
  })

  test('Test with some waiting', async ({ page }) => {
    console.log('Starting test with waiting...')
    
    await page.goto('/login')
    console.log('Page loaded')
    
    // Simulate longer test execution
    for (let i = 1; i <= 5; i++) {
      console.log(`Step ${i} of 5...`)
      await page.waitForTimeout(1000)
    }
    
    await expect(page.locator('form')).toBeVisible()
    console.log('Form is visible - test passed')
  })

  test('Intentional failure for demo', async ({ page }) => {
    console.log('Starting intentional failure test...')
    
    await page.goto('/login')
    console.log('Navigated to page')
    
    await page.waitForTimeout(2000)
    
    // This will fail intentionally
    await expect(page.locator('input[name="nonexistent"]')).toBeVisible({ timeout: 3000 })
    console.log('This should not be reached')
  })

  test('Quick test', async ({ page }) => {
    console.log('Starting quick test...')
    await page.goto('/')
    await expect(page).toHaveTitle(/Demo App/)
    console.log('Quick test completed')
  })
})
