const { chromium } = require('playwright');

async function debugAppTests() {
  console.log('🚀 Starting browser automation to debug app tests...');
  
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to login page
    console.log('📝 Navigating to login page...');
    await page.goto('http://localhost:3000/login/index.html');
    await page.waitForLoadState('networkidle');

    // Login with admin credentials
    console.log('🔐 Logging in as admin...');
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    
    // Wait for redirect and ensure we're logged in
    await page.waitForURL('**/mainPage/**');
    console.log('✅ Successfully logged in and redirected to main page');

    // Navigate to Test Management
    console.log('🧪 Navigating to Test Management...');
    await page.goto('http://localhost:3000/tests-management/index.html');
    await page.waitForLoadState('networkidle');

    // Take a screenshot of the test management page
    await page.screenshot({ path: 'test-management-page.png', fullPage: true });
    console.log('📸 Screenshot saved: test-management-page.png');

    // Look for the "Run All Tests" button and click it
    console.log('🔍 Looking for Run All Tests button...');
    
    // Wait for the page to load completely
    await page.waitForTimeout(2000);
    
    // Check if there's a Run All Tests button
    const runTestsButton = await page.locator('text="Run All Tests"').first();
    const runTestsButtonVisible = await runTestsButton.isVisible().catch(() => false);
    
    if (runTestsButtonVisible) {
      console.log('✅ Found "Run All Tests" button, clicking it...');
      await runTestsButton.click();
      
      // Wait for test execution to start
      await page.waitForTimeout(3000);
      
      // Monitor for test results
      console.log('⏳ Waiting for test execution...');
      
      // Look for test results or status
      await page.waitForTimeout(10000); // Wait 10 seconds for tests to run
      
      // Take another screenshot after tests run
      await page.screenshot({ path: 'test-results-page.png', fullPage: true });
      console.log('📸 Test results screenshot saved: test-results-page.png');
      
      // Try to extract test results from the page
      const testResults = await page.evaluate(() => {
        // Look for elements that might contain test results
        const resultElements = document.querySelectorAll('[data-test-result], .test-result, .test-status');
        const results = [];
        
        resultElements.forEach(el => {
          results.push({
            text: el.textContent?.trim(),
            className: el.className,
            innerHTML: el.innerHTML
          });
        });
        
        return results;
      });
      
      console.log('📊 Test results found:', testResults);
      
    } else {
      console.log('❌ "Run All Tests" button not found');
      
      // Let's see what buttons/elements are available
      const allButtons = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button, input[type="button"], input[type="submit"], a');
        return Array.from(buttons).map(btn => ({
          text: btn.textContent?.trim(),
          type: btn.tagName,
          className: btn.className,
          id: btn.id
        }));
      });
      
      console.log('🔍 Available buttons/links on page:', allButtons);
    }

    // Let's also check the page source for any test-related functionality
    const pageContent = await page.content();
    
    // Look for any test-related JavaScript or API calls
    const hasTestFunctionality = pageContent.includes('test') || 
                                pageContent.includes('playwright') || 
                                pageContent.includes('exec') ||
                                pageContent.includes('spawn');
    
    console.log('🔍 Page has test functionality:', hasTestFunctionality);
    
    if (hasTestFunctionality) {
      // Check browser console for any errors
      const consoleLogs = [];
      page.on('console', msg => {
        consoleLogs.push(`${msg.type()}: ${msg.text()}`);
      });
      
      // Check network requests
      const networkRequests = [];
      page.on('request', request => {
        if (request.url().includes('test')) {
          networkRequests.push({
            url: request.url(),
            method: request.method()
          });
        }
      });
      
      await page.waitForTimeout(5000);
      
      console.log('📱 Console logs:', consoleLogs);
      console.log('🌐 Test-related network requests:', networkRequests);
    }

  } catch (error) {
    console.error('❌ Error during app testing:', error);
    await page.screenshot({ path: 'error-page.png', fullPage: true });
  } finally {
    await browser.close();
    console.log('🏁 Browser automation completed');
  }
}

// Run the debug script
debugAppTests().catch(console.error);
