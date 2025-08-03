// Simple test to verify the API functionality
console.log('Testing the Run Selected functionality...');

// Simulate the request that would be sent when running selected tests
const testRequest = {
    testFiles: ['jira-demo.spec.ts'],
    suite: 'selected'
};

console.log('Request payload:', testRequest);

// Test if the server can handle this request structure
const fs = require('fs');
const path = require('path');

// Check if the test files exist
const testsDir = path.join(__dirname, 'tests');
console.log('Tests directory:', testsDir);

if (fs.existsSync(testsDir)) {
    const files = fs.readdirSync(testsDir);
    console.log('Available test files:', files.filter(f => f.endsWith('.spec.ts')));
} else {
    console.log('Tests directory not found!');
}
