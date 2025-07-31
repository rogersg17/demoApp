// Quick test script to verify the test execution API
const fetch = require('node-fetch');

async function testAPI() {
    try {
        console.log('🧪 Testing the test execution API...\n');
        
        // 1. First get the tests list
        console.log('1. Fetching tests list...');
        const testsResponse = await fetch('http://localhost:3000/api/tests');
        const testsData = await testsResponse.json();
        console.log(`   Found ${testsData.totalTests} tests\n`);
        
        // 2. Start a test execution (run just the jira-demo.spec.ts file)
        console.log('2. Starting test execution...');
        const runResponse = await fetch('http://localhost:3000/api/tests/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                testFiles: ['jira-demo.spec.ts'],
                suite: 'api-test'
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
            
            const statusResponse = await fetch(`http://localhost:3000/api/tests/results/${runData.executionId}`);
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
