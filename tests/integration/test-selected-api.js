// Test script to verify the Run Selected functionality
const http = require('http');

// Store cookies for session management
let cookies = '';

function makeRequest(options, data) {
    return new Promise((resolve, reject) => {
        // Add cookies to the request
        if (cookies) {
            options.headers = options.headers || {};
            options.headers['Cookie'] = cookies;
        }
        
        const req = http.request(options, (res) => {
            // Store cookies from response
            if (res.headers['set-cookie']) {
                cookies = res.headers['set-cookie'].map(cookie => cookie.split(';')[0]).join('; ');
            }
            
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    resolve(body);
                }
            });
        });
        
        req.on('error', reject);
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function testAPI() {
    console.log('🧪 Testing Run Selected API functionality...\n');
    
    try {
        // 0. Login first
        console.log('0. Logging in...');
        const loginOptions = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        const loginData = {
            username: 'admin',
            password: 'admin123'
        };
        
        const loginResult = await makeRequest(loginOptions, loginData);
        console.log(`   Login result: ${loginResult.success ? 'Success' : 'Failed'}\n`);
        
        if (!loginResult.success) {
            console.log('❌ Login failed, cannot proceed with tests');
            return;
        }
        // 1. Test getting tests list
        console.log('1. Fetching tests list...');
        const testsOptions = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/tests',
            method: 'GET'
        };
        
        const testsResult = await makeRequest(testsOptions);
        console.log(`   Found ${testsResult.totalTests} tests`);
        console.log(`   Sample test files: ${testsResult.tests ? testsResult.tests.slice(0, 3).map(t => t.file).join(', ') : 'none'}\n`);
        
        // 2. Test running selected tests
        console.log('2. Testing run selected API...');
        const runOptions = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/tests/run',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        const runData = {
            testFiles: ['jira-demo.spec.ts'],
            suite: 'selected'
        };
        
        console.log(`   Sending request with data:`, runData);
        const runResult = await makeRequest(runOptions, runData);
        console.log(`   Response:`, runResult);
        
        if (runResult.executionId) {
            console.log(`   ✅ Test execution started with ID: ${runResult.executionId}`);
            
            // 3. Check execution status
            console.log('\n3. Checking execution status...');
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
            
            const statusOptions = {
                hostname: 'localhost',
                port: 3000,
                path: `/api/tests/results/${runResult.executionId}`,
                method: 'GET'
            };
            
            const statusResult = await makeRequest(statusOptions);
            console.log(`   Status: ${statusResult.status}`);
            console.log(`   Results:`, statusResult.results || 'In progress');
        } else {
            console.log('   ❌ No execution ID returned');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testAPI();
