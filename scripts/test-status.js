#!/usr/bin/env node

/**
 * Simple test status script for application integration
 * Returns test results in a simple, parseable format
 */

const { spawn } = require('child_process');

function runTests() {
  return new Promise((resolve, reject) => {
    const testProcess = spawn('npx', ['playwright', 'test', '--reporter=json', '--config=playwright.config.ts'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    });

    let stdout = '';
    let stderr = '';

    testProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    testProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    testProcess.on('close', (code) => {
      try {
        if (stdout.trim()) {
          const result = JSON.parse(stdout);
          const summary = {
            success: code === 0,
            exitCode: code,
            stats: result.stats || {},
            passed: result.stats?.expected || 0,
            failed: result.stats?.unexpected || 0,
            skipped: result.stats?.skipped || 0,
            duration: result.stats?.duration || 0,
            timestamp: new Date().toISOString(),
            errors: result.errors || []
          };
          
          console.log(JSON.stringify(summary, null, 2));
          resolve(summary);
        } else {
          const summary = {
            success: false,
            exitCode: code,
            error: 'No test output received',
            stderr: stderr
          };
          console.log(JSON.stringify(summary, null, 2));
          resolve(summary);
        }
      } catch (error) {
        const summary = {
          success: false,
          exitCode: code,
          error: 'Failed to parse test results',
          parseError: error.message,
          stderr: stderr
        };
        console.log(JSON.stringify(summary, null, 2));
        resolve(summary);
      }
    });

    testProcess.on('error', (error) => {
      const summary = {
        success: false,
        error: 'Failed to start test process',
        details: error.message
      };
      console.log(JSON.stringify(summary, null, 2));
      reject(error);
    });
  });
}

// Run tests if this script is called directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };
