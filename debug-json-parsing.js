const fs = require('fs');

// Test JSON parsing logic with the actual output
const testOutput = `                  "ok": true,
                  "tags": [],
                  "tests": [
                    {
        "timeout": 30000,
                      "annotations": [],
                      "expectedStatus": "passed",
                      "projectId": "chromium",
                      "projectName": "chromium",
                      "results": [
                        {
                          "workerIndex": 4,
                          "parallelIndex": 4,
                          "status": "passed",
,
                          "duration": 420,
                          "errors": [],
                          "stdout": [],
                          "stderr": [],
                          "retry": 0,
                          "startTime": "2025-07-31T20:22:15.760Z",
                          "annotations": [],
                          "attachments": []
                        }
                      ],
                 "status": "expected"
                    }
                  ],
                  "id": "dc05bca604861812ce2c-124d76debd4ddc5598f6f",
                  "file": "login-validation.spec.ts",
                  "line": 65,
                  "column": 9
      }
              ]
            }
          ]
        }
      ]
    }
  ],
  "errors": [],
  "stats": {
    "startTime": "2025-07-31T20:22:03.229Z",
    "duration": 14808.218,
    "expected": 48,
    "skipped": 0,
    "unexpected": 1,
    "flaky": 0
  }
}
`;

console.log('🔍 Testing JSON parsing logic...');

// Split into lines like the server does
const lines = testOutput.split('\n');
console.log(`📋 Total lines: ${lines.length}`);

// Test the server's detection logic
let foundJson = false;
let parsedResult = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  try {
    const parsed = JSON.parse(line);
    if (parsed.stats && parsed.suites) {
      console.log('✅ Found JSON with stats and suites:', {
        stats: parsed.stats,
        hasStats: !!parsed.stats,
        hasSuites: !!parsed.suites,
        suitesType: typeof parsed.suites,
        suitesLength: Array.isArray(parsed.suites) ? parsed.suites.length : 'not array'
      });
      foundJson = true;
      parsedResult = parsed;
      break;
    } else if (parsed.stats) {
      console.log('❓ Found JSON with stats but no suites:', {
        stats: parsed.stats,
        hasStats: !!parsed.stats,
        hasSuites: !!parsed.suites,
        keys: Object.keys(parsed)
      });
    } else if (parsed.suites) {
      console.log('❓ Found JSON with suites but no stats:', {
        hasSuites: !!parsed.suites,
        hasStats: !!parsed.stats,
        keys: Object.keys(parsed)
      });
    }
  } catch (e) {
    // Not JSON, skip
  }
}

if (!foundJson) {
  console.log('❌ No JSON found with both stats and suites');
  
  // Try to find any JSON with just stats
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    try {
      const parsed = JSON.parse(line);
      if (parsed.stats) {
        console.log('🔍 Found JSON with stats only:');
        console.log('📊 Stats:', parsed.stats);
        console.log('🗂️ All keys:', Object.keys(parsed));
        parsedResult = parsed;
        break;
      }
    } catch (e) {
      // Not JSON, skip
    }
  }
}

if (parsedResult) {
  const stats = parsedResult.stats;
  console.log('\n📈 Stats analysis:');
  console.log('  expected:', stats.expected, typeof stats.expected);
  console.log('  unexpected:', stats.unexpected, typeof stats.unexpected);
  console.log('  skipped:', stats.skipped, typeof stats.skipped);
  
  const calculatedResults = {
    total: (stats.expected || 0) + (stats.unexpected || 0) + (stats.skipped || 0),
    passed: stats.expected || 0,
    failed: stats.unexpected || 0,
    skipped: stats.skipped || 0
  };
  
  console.log('\n🧮 Calculated results:', calculatedResults);
} else {
  console.log('❌ No stats found at all');
}
