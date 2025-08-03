const { chromium } = require('playwright');

async function getTestResultsFromApp() {
  console.log('🚀 Getting test results from app...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Login
    await page.goto('http://localhost:3000/login/index.html');
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/mainPage/**');

    // Go to test management
    await page.goto('http://localhost:3000/tests-management/index.html');
    await page.waitForLoadState('networkidle');

    // Click Run All Tests
    await page.click('text="Run All Tests"');
    
    // Wait for execution to complete and get final results
    let finalResult = null;
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max wait
    
    while (attempts < maxAttempts && !finalResult) {
      await page.waitForTimeout(1000); // Wait 1 second
      
      // Check if we can find execution results on the page
      const resultElements = await page.evaluate(() => {
        // Look for any test result displays
        const elements = document.querySelectorAll('[data-test-results], .test-results, .execution-summary');
        const results = [];
        
        elements.forEach(el => {
          results.push({
            text: el.textContent?.trim(),
            innerHTML: el.innerHTML
          });
        });
        
        return results;
      });
      
      // Also check for any completed status indicators
      const statusText = await page.textContent('body').catch(() => '');
      
      if (statusText.includes('passed') || statusText.includes('failed') || statusText.includes('completed')) {
        finalResult = {
          statusFound: true,
          resultElements,
          bodyText: statusText.substring(0, 500) // First 500 chars
        };
      }
      
      attempts++;
    }
    
    console.log('📊 Final result from app:', finalResult);
    
    // Take a final screenshot
    await page.screenshot({ path: 'final-test-results.png', fullPage: true });
    console.log('📸 Final screenshot saved: final-test-results.png');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
}

getTestResultsFromApp().catch(console.error);
