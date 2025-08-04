const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('Navigating to http://localhost:5173/');
    await page.goto('http://localhost:5173/');
    
    console.log('Page title:', await page.title());
    console.log('Page URL:', page.url());
    
    // Take a screenshot
    await page.screenshot({ path: 'debug-screenshot.png' });
    console.log('Screenshot saved as debug-screenshot.png');
    
    // Check for any console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser console error:', msg.text());
      }
    });
    
    // Wait a moment to see the page
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('Error navigating to page:', error);
  }
  
  await browser.close();
})();
