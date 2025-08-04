import { test, expect } from '@playwright/test';

test('Debug React App', async ({ page }) => {
  await page.goto('http://localhost:3000/login');
  await page.waitForLoadState('networkidle');
  
  // Take a screenshot
  await page.screenshot({ path: 'debug-react-login.png', fullPage: true });
  
  // Print page title and URL
  console.log('Page title:', await page.title());
  console.log('Page URL:', page.url());
  
  // Print page content
  const content = await page.content();
  console.log('Page content length:', content.length);
  
  // Check if there are any errors in console
  const logs = [];
  page.on('console', msg => logs.push(msg.text()));
  await page.reload();
  await page.waitForLoadState('networkidle');
  
  console.log('Console logs:', logs);
  
  // Check if login elements exist with different selectors
  const h1Elements = await page.locator('h1').count();
  console.log('Number of h1 elements:', h1Elements);
  
  const inputElements = await page.locator('input').count();
  console.log('Number of input elements:', inputElements);
  
  const buttonElements = await page.locator('button').count();
  console.log('Number of button elements:', buttonElements);
});
