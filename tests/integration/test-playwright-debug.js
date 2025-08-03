// Playwright script to test the Run Selected functionality
const { chromium } = require('playwright');

async function testRunSelected() {
    console.log('🎭 Starting Playwright test of Run Selected functionality...\n');
    
    const browser = await chromium.launch({ headless: false, slowMo: 1000 });
    const page = await browser.newPage();
    
    try {
        // 1. Login
        console.log('1. Navigating to login page...');
        await page.goto('http://localhost:3000/login/index.html');
        
        console.log('2. Logging in...');
        await page.fill('#username', 'admin');
        await page.fill('#password', 'admin123');
        await page.click('button[type="submit"]');
        
        // Wait for redirect
        await page.waitForTimeout(2000);
        
        // 3. Navigate to test management
        console.log('3. Navigating to test management...');
        await page.goto('http://localhost:3000/tests-management/index.html');
        
        // Wait for page to load
        await page.waitForTimeout(3000);
        
        // 4. Check if tests are loaded
        console.log('4. Checking if tests are loaded...');
        const testRows = await page.locator('.test-table tbody tr').count();
        console.log(`   Found ${testRows} test rows`);
        
        // 5. Select some checkboxes
        console.log('5. Selecting test checkboxes...');
        const checkboxes = page.locator('.test-checkbox');
        const checkboxCount = await checkboxes.count();
        console.log(`   Found ${checkboxCount} checkboxes`);
        
        if (checkboxCount > 0) {
            // Select first checkbox
            await checkboxes.first().check();
            console.log('   Checked first checkbox');
            
            // Wait a bit
            await page.waitForTimeout(1000);
            
            // Check if run selected button is enabled
            const runSelectedBtn = page.locator('#runSelectedTestsBtn');
            const isDisabled = await runSelectedBtn.getAttribute('disabled');
            console.log(`   Run Selected button disabled: ${isDisabled !== null}`);
            
            const buttonText = await runSelectedBtn.textContent();
            console.log(`   Button text: "${buttonText}"`);
            
            if (isDisabled === null) {
                console.log('6. Clicking Run Selected button...');
                
                // Listen for console logs
                page.on('console', msg => {
                    if (msg.type() === 'log' && msg.text().includes('🔥')) {
                        console.log(`   Browser console: ${msg.text()}`);
                    }
                });
                
                await runSelectedBtn.click();
                
                // Wait for any response
                await page.waitForTimeout(3000);
                
                console.log('   Button clicked successfully!');
            } else {
                console.log('   ❌ Button is still disabled');
            }
        } else {
            console.log('   ❌ No checkboxes found');
        }
        
    } catch (error) {
        console.error('❌ Error during test:', error.message);
    } finally {
        await browser.close();
    }
}

testRunSelected();
