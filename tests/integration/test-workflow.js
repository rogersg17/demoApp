#!/usr/bin/env node

/**
 * Test script to simulate the user workflow in the Test Management app
 * This will login, navigate to test management, and run tests
 */

const { chromium } = require('playwright');

async function testWorkflow() {
  console.log('🎭 Starting Test Management workflow simulation...\n');
  
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const page = await browser.newPage();
  
  try {
    // 1. Navigate to login page
    console.log('1. 🔐 Navigating to login page...');
    await page.goto('http://localhost:3000/login/index.html');
    
    // 2. Login with admin credentials
    console.log('2. 👤 Logging in with admin credentials...');
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    
    // Wait for redirect
    await page.waitForTimeout(3000);
    
    // 3. Navigate to test management
    console.log('3. 🧪 Navigating to Test Management...');
    await page.goto('http://localhost:3000/tests-management/index.html');
    
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    // 4. Check page elements
    console.log('4. 🔍 Checking test management page elements...');
    const runAllBtn = await page.locator('#runAllTestsBtn');
    const runSelectedBtn = await page.locator('#runSelectedTestsBtn');
    
    if (await runAllBtn.isVisible()) {
      console.log('   ✅ Run All Tests button found');
    }
    
    if (await runSelectedBtn.isVisible()) {
      console.log('   ✅ Run Selected Tests button found');
    }
    
    // 5. Check test table
    console.log('5. 📊 Checking test table...');
    const testRows = await page.locator('.test-table tbody tr').count();
    console.log(`   Found ${testRows} test rows`);
    
    // 6. Run All Tests
    console.log('6. ▶️ Clicking Run All Tests...');
    await runAllBtn.click();
    
    // Wait for test execution
    console.log('7. ⏳ Waiting for test execution...');
    await page.waitForTimeout(5000);
    
    // Check for progress indicator
    const progressElement = await page.locator('#testProgress');
    if (await progressElement.isVisible()) {
      console.log('   ✅ Test execution progress indicator is visible');
      
      // Wait for completion (up to 2 minutes)
      for (let i = 0; i < 60; i++) {
        await page.waitForTimeout(2000);
        const progressText = await page.locator('#progressText').textContent();
        console.log(`   Progress: ${progressText}`);
        
        if (progressText && progressText.includes('completed')) {
          console.log('   ✅ Tests completed!');
          break;
        }
      }
    }
    
    // 8. Check results
    console.log('8. 📈 Checking test results...');
    const totalTests = await page.locator('#totalTests').textContent();
    const passingTests = await page.locator('#passingTests').textContent();
    const failingTests = await page.locator('#failingTests').textContent();
    
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passing Tests: ${passingTests}`);
    console.log(`   Failing Tests: ${failingTests}`);
    
    if (failingTests === '0') {
      console.log('   ✅ All tests are passing!');
    } else {
      console.log(`   ⚠️ Found ${failingTests} failing tests`);
    }
    
    console.log('\n🎉 Test workflow completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during test workflow:', error);
  } finally {
    await page.waitForTimeout(5000); // Keep browser open for observation
    await browser.close();
  }
}

// Run the test workflow
testWorkflow().catch(console.error);
