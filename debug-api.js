const { chromium } = require('playwright');

async function debugApiCall() {
  console.log('🚀 Starting API debugging...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to login page and login
    console.log('🔐 Logging in...');
    await page.goto('http://localhost:3000/login/index.html');
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/mainPage/**');

    // Navigate to test management
    await page.goto('http://localhost:3000/tests-management/index.html');
    await page.waitForLoadState('networkidle');

    // Intercept API calls
    const apiCalls = [];
    page.on('response', async (response) => {
      if (response.url().includes('/api/tests')) {
        try {
          const responseData = await response.json();
          const callInfo = {
            url: response.url(),
            status: response.status(),
            data: responseData,
            timestamp: new Date().toLocaleTimeString()
          };
          apiCalls.push(callInfo);
          
          // Log only brief status for ongoing calls
          if (response.url().includes('/results/') && responseData.status === 'running') {
            process.stdout.write('⏳ ');
          } else {
            console.log(`\n� ${callInfo.timestamp} - ${response.url().split('/').pop()} (${response.status()})`);
          }
        } catch (error) {
          console.log(`\n❌ Error parsing response from ${response.url()}:`, error.message);
        }
      }
    });

    // Click Run All Tests
    console.log('\n🧪 Clicking Run All Tests...');
    await page.click('text="Run All Tests"');
    
    // Wait for the execution to complete with progress indication
    console.log('⏳ Waiting for test execution to complete...');
    await page.waitForTimeout(20000); // Wait 20 seconds
    
    console.log('\n\n' + '='.repeat(60));
    console.log('📋 EXECUTION SUMMARY');
    console.log('='.repeat(60));
    
    // Display all API calls in a clean format
    apiCalls.forEach((call, index) => {
      const urlPart = call.url.split('/').pop();
      console.log(`\n${index + 1}. ${call.timestamp} - ${urlPart}`);
      console.log(`   Status: ${call.status}`);
      
      if (call.data.status === 'completed' && call.data.results) {
        console.log(`   Results: ${call.data.results.passed} passed, ${call.data.results.failed} failed, ${call.data.results.total} total`);
      } else if (call.data.passingTests !== undefined) {
        console.log(`   Summary: ${call.data.passingTests} passing, ${call.data.failingTests} failing, ${call.data.totalTests} total`);
      } else if (call.data.status) {
        console.log(`   Status: ${call.data.status}`);
      }
    });
    
    console.log('\n' + '='.repeat(60));
    
    // Check if we can get the latest execution results
    const latestExecution = apiCalls.find(call => 
      call.url.includes('/api/tests/results/') && 
      call.data.status === 'completed'
    );
    
    if (latestExecution) {
      console.log('\n🎯 FINAL TEST RESULTS:');
      console.log(`   Total: ${latestExecution.data.results.total}`);
      console.log(`   Passed: ${latestExecution.data.results.passed}`);
      console.log(`   Failed: ${latestExecution.data.results.failed}`);
      console.log(`   Duration: ${latestExecution.data.results.duration}`);
    }
    
    // Check final API state
    const finalApiTest = apiCalls.find(call => call.url.endsWith('/api/tests'));
    if (finalApiTest) {
      console.log('\n📊 FINAL API STATE:');
      console.log(`   Passing Tests: ${finalApiTest.data.passingTests}`);
      console.log(`   Failing Tests: ${finalApiTest.data.failingTests}`);
      console.log(`   Last Run: ${finalApiTest.data.lastRun || 'Never'}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
}

debugApiCall().catch(console.error);
