// Quick test script to verify the test execution API
const fetch = require('node-fetch');

async function testAPI() {
    try {
        console.log('🧪 Testing the test execution API...\n');
        
        // 0. First authenticate
        console.log('0. Authenticating...');
        const loginResponse = await fetch('http://localhost:5173/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });
        const loginData = await loginResponse.json();
        
        if (!loginData.success) {
            throw new Error('Login failed');
        }
        
        console.log(`   ✅ Logged in as ${loginData.user.username}\n`);
        
        // Extract session cookie
        const setCookieHeader = loginResponse.headers.get('set-cookie');
        const sessionCookie = setCookieHeader ? setCookieHeader.split(';')[0] : '';
        
        // 1. First get the tests list
        console.log('1. Fetching tests list...');
        const testsResponse = await fetch('http://localhost:5173/api/tests', {
            headers: { 'Cookie': sessionCookie }
        });
        const testsData = await testsResponse.json();
        console.log(`   Found ${testsData.totalTests} tests\n`);
        
        // 2. Start a test execution (run just a simple test)
        console.log('2. Starting test execution...');
        const runResponse = await fetch('http://localhost:5173/api/tests/run', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Cookie': sessionCookie
            },
            body: JSON.stringify({
                testIds: ['login-functional.spec.ts_0'] // Run TC001
            })
        });
        const runData = await runResponse.json();
        console.log(`   Execution started with ID: ${runData.executionId}\n`);
        
        // 3. Monitor the execution
        console.log('3. Monitoring execution...');
        let completed = false;
        let attempts = 0;
        const maxAttempts = 30; // 1 minute max
        
        while (!completed && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
            attempts++;
            
            const statusResponse = await fetch(`http://localhost:5173/api/tests/results/${runData.executionId}`, {
                headers: { 'Cookie': sessionCookie }
            });
            const statusData = await statusResponse.json();
            
            console.log(`   Attempt ${attempts}: Status = ${statusData.status}`);
            
            if (statusData.status === 'completed') {
                completed = true;
                console.log('\n✅ Test execution completed!');
                console.log('Results:', JSON.stringify(statusData.results, null, 2));
            } else if (statusData.status === 'failed') {
                completed = true;
                console.log('\n❌ Test execution failed!');
                console.log('Error:', statusData.error);
            }
        }
        
        if (!completed) {
            console.log('\n⏰ Test execution timeout - still running');
        }
        
    } catch (error) {
        console.error('❌ API test failed:', error.message);
    }
}

testAPI();
