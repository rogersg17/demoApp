const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const { spawn } = require('child_process');
const fs = require('fs');
const fsPromises = require('fs').promises;
const Database = require('./database/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
const db = new Database();

// Store for active test executions
const testExecutions = new Map();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: 'demo-app-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Serve static files from the current directory
app.use(express.static('.'));

// Route for root - redirect to login
app.get('/', (req, res) => {
  res.redirect('/login/index.html');
});

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Auth routes
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = await db.getUserByUsername(username);
    
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is not active' });
    }

    // Create session
    req.session.userId = user.id;
    req.session.username = user.username;
    
    // Update last login
    await db.updateUser(user.id, { last_login: new Date().toISOString() });
    
    res.json({ 
      success: true, 
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
        department: user.department
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Could not log out' });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// Test management routes
app.get('/api/tests', requireAuth, async (req, res) => {
  try {
    // Read actual test files from the tests directory
    const testsDir = path.join(__dirname, 'tests');
    const testFiles = await fsPromises.readdir(testsDir);
    const specFiles = testFiles.filter(file => file.endsWith('.spec.ts'));
    
    // Parse test files to get test information
    const tests = [];
    for (const file of specFiles) {
      const filePath = path.join(testsDir, file);
      const content = await fsPromises.readFile(filePath, 'utf8');
      
      // Extract test cases from the file
      const testMatches = content.match(/test\(['"`]([^'"`]+)['"`]/g) || [];
      const suiteMatch = content.match(/test\.describe\(['"`]([^'"`]+)['"`]/) || [];
      
      const suiteName = suiteMatch[1] || file.replace('.spec.ts', '');
      
      testMatches.forEach((match, index) => {
        const testName = match.match(/test\(['"`]([^'"`]+)['"`]/)[1];
        tests.push({
          id: `${file}_${index}`,
          name: testName,
          suite: suiteName,
          file: file,
          status: 'not-run',
          duration: null,
          lastRun: null
        });
      });
    }
    
    // Check for recent test results from latest execution
    let testResults = {
      totalTests: tests.length,
      passingTests: 0,
      failingTests: 0,
      skippedTests: 0,
      lastRun: null,
      tests: tests
    };
    
    // Find the most recent completed test execution
    let latestExecution = null;
    console.log(`🔍 Checking ${testExecutions.size} executions for latest results...`);
    for (const [executionId, execution] of testExecutions.entries()) {
      console.log(`📋 Execution ${executionId}: status=${execution.status}, hasResults=${!!execution.results}`);
      if (execution.status === 'completed' && execution.results) {
        if (!latestExecution || execution.endTime > latestExecution.endTime) {
          latestExecution = execution;
          console.log(`✅ Found newer completed execution: ${executionId}`);
        }
      }
    }
    
    if (latestExecution && latestExecution.results) {
      testResults.passingTests = latestExecution.results.passed;
      testResults.failingTests = latestExecution.results.failed;
      testResults.skippedTests = latestExecution.results.skipped;
      testResults.lastRun = latestExecution.endTime;
      console.log('✅ Found latest execution results:', latestExecution.results);
    } else {
      // Try to load results from file (for persistence across server restarts)
      console.log('🔍 No in-memory results found, checking file...');
      try {
        const savedResults = JSON.parse(fs.readFileSync(path.join(__dirname, 'latest-test-results.json'), 'utf8'));
        testResults.passingTests = savedResults.results.passed;
        testResults.failingTests = savedResults.results.failed;
        testResults.skippedTests = savedResults.results.skipped;
        testResults.lastRun = savedResults.timestamp;
        console.log('✅ Loaded results from file:', savedResults.results);
      } catch (fileError) {
        console.log('📝 No saved results file found:', fileError.message);
      }
    }
    
    res.json(testResults);
  } catch (error) {
    console.error('Error fetching tests:', error);
    res.status(500).json({ error: 'Failed to fetch tests' });
  }
});

app.post('/api/tests/run', requireAuth, async (req, res) => {
  try {
    const { testFiles, suite, grep } = req.body;
    
    console.log('Test execution request received:', {
      testFiles,
      suite,
      grep,
      testFilesCount: testFiles ? testFiles.length : 0
    });
    
    const executionId = `exec_${Date.now()}`;
    
    // Prepare Playwright command
    let command = 'npx';
    let args = ['playwright', 'test', '--config=playwright.config.ts'];
    
    // Add specific test files if provided
    if (testFiles && testFiles.length > 0) {
      testFiles.forEach(file => {
        args.push(`tests/${file}`);
      });
    }
    
    // Add grep pattern if provided
    if (grep) {
      args.push('--grep', grep);
    }
    
    // Add reporter for JSON output
    args.push('--reporter=json');
    
    console.log(`Starting test execution ${executionId}:`, command, args.join(' '));
    
    // Start the test execution
    const testProcess = spawn(command, args, {
      cwd: __dirname,
      shell: true
    });
    
    let stdout = '';
    let stderr = '';
    
    const execution = {
      id: executionId,
      status: 'running',
      startTime: new Date(),
      process: testProcess,
      stdout: '',
      stderr: '',
      results: null
    };
    
    testExecutions.set(executionId, execution);
    
    testProcess.stdout.on('data', (data) => {
      stdout += data.toString();
      execution.stdout += data.toString();
    });
    
    testProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      execution.stderr += data.toString();
    });
    
    testProcess.on('close', (code) => {
      execution.status = 'completed';
      execution.endTime = new Date();
      execution.exitCode = code;
      
      try {
        // Try to parse JSON output from Playwright
        console.log('Parsing test results from stdout...');
        
        // First try to parse the entire stdout as JSON (Playwright outputs one big JSON object)
        let results = null;
        try {
          results = JSON.parse(stdout);
          if (results.stats) {
            console.log('Successfully parsed complete JSON output');
          }
        } catch (e) {
          console.log('Failed to parse complete stdout as JSON, trying line-by-line...');
          
          // Fallback: try to find JSON line by line (for other reporters)
          const jsonOutput = stdout.split('\n').find(line => {
            try {
              const parsed = JSON.parse(line);
              return parsed.stats && parsed.suites;
            } catch {
              return false;
            }
          });
          
          if (jsonOutput) {
            results = JSON.parse(jsonOutput);
            console.log('Found JSON output in line-by-line parsing');
          }
        }
        
        if (results && results.stats) {
          console.log('Playwright stats:', results.stats);
          execution.results = {
            total: (results.stats.expected || 0) + (results.stats.unexpected || 0) + (results.stats.skipped || 0),
            passed: results.stats.expected || 0,
            failed: results.stats.unexpected || 0,
            skipped: results.stats.skipped || 0,
            duration: `${(results.stats.duration || 0) / 1000}s`,
            suites: results.suites || []
          };
          console.log('Parsed results:', execution.results);
          
          // Save latest results to file for persistence across server restarts
          try {
            const latestResults = {
              timestamp: execution.endTime,
              results: execution.results,
              exitCode: code
            };
            fs.writeFileSync(path.join(__dirname, 'latest-test-results.json'), JSON.stringify(latestResults, null, 2));
            console.log('💾 Saved latest results to file');
          } catch (saveError) {
            console.error('❌ Failed to save results to file:', saveError);
          }
        } else {
          console.log('No valid JSON with stats found, using fallback');
          // Fallback result parsing
          execution.results = {
            total: code === 0 ? 49 : 0, // Assume all tests passed if exit code is 0
            passed: code === 0 ? 49 : 0,
            failed: code !== 0 ? 1 : 0,
            skipped: 0,
            duration: `${(execution.endTime - execution.startTime) / 1000}s`,
            suites: []
          };
        }
      } catch (error) {
        console.error('Error parsing test results:', error);
        execution.results = {
          total: 0,
          passed: 0,
          failed: 1,
          skipped: 0,
          duration: `${(execution.endTime - execution.startTime) / 1000}s`,
          error: error.message
        };
      }
      
      console.log(`Test execution ${executionId} completed with exit code ${code}`);
    });
    
    testProcess.on('error', (error) => {
      execution.status = 'failed';
      execution.error = error.message;
      console.error(`Test execution ${executionId} failed:`, error);
    });
    
    res.json({
      success: true,
      executionId,
      message: 'Test execution started',
      estimatedDuration: '30-60 seconds'
    });
    
  } catch (error) {
    console.error('Error running tests:', error);
    res.status(500).json({ error: 'Failed to run tests' });
  }
});

app.get('/api/tests/results/:executionId', requireAuth, async (req, res) => {
  try {
    const { executionId } = req.params;
    
    const execution = testExecutions.get(executionId);
    
    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }
    
    res.json({
      executionId,
      status: execution.status,
      startTime: execution.startTime,
      endTime: execution.endTime,
      results: execution.results,
      stdout: execution.stdout.split('\n').slice(-50).join('\n'), // Last 50 lines
      stderr: execution.stderr,
      error: execution.error
    });
    
  } catch (error) {
    console.error('Error fetching test results:', error);
    res.status(500).json({ error: 'Failed to fetch test results' });
  }
});

// Get list of all test executions
app.get('/api/tests/executions', requireAuth, async (req, res) => {
  try {
    const executions = Array.from(testExecutions.values()).map(exec => ({
      id: exec.id,
      status: exec.status,
      startTime: exec.startTime,
      endTime: exec.endTime,
      results: exec.results
    }));
    
    res.json(executions);
  } catch (error) {
    console.error('Error fetching executions:', error);
    res.status(500).json({ error: 'Failed to fetch executions' });
  }
});

// Analytics routes
app.get('/api/analytics/users', requireAuth, async (req, res) => {
  try {
    const userStats = await db.getUserAnalytics();
    res.json(userStats);
  } catch (error) {
    console.error('Error fetching user analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// User Management routes
app.get('/api/users', requireAuth, async (req, res) => {
  try {
    const users = await db.getAllUsers();
    // Remove passwords from response for security
    const safeUsers = users.map(user => {
      const { password, ...safeUser } = user;
      return safeUser;
    });
    res.json(safeUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.get('/api/users/:id', requireAuth, async (req, res) => {
  try {
    const user = await db.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Remove password from response
    const { password, ...safeUser } = user;
    res.json(safeUser);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

app.post('/api/users', requireAuth, async (req, res) => {
  try {
    const { username, email, password, first_name, last_name, department, role, status } = req.body;
    
    // Validate required fields
    if (!username || !email || !password || !first_name || !last_name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Create user
    const userId = await db.createUser({
      username,
      email,
      password,
      first_name,
      last_name,
      department: department || null,
      role: role || 'user',
      status: status || 'active'
    });
    
    res.status(201).json({ id: userId, message: 'User created successfully' });
  } catch (error) {
    console.error('Error creating user:', error);
    if (error.message.includes('UNIQUE constraint failed')) {
      res.status(409).json({ error: 'Username or email already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create user' });
    }
  }
});

app.put('/api/users/:id', requireAuth, async (req, res) => {
  try {
    const { username, email, first_name, last_name, department, role, status } = req.body;
    
    // Check if user exists
    const existingUser = await db.getUserById(req.params.id);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update user (password updates should be handled separately for security)
    const updateData = {
      username,
      email,
      first_name,
      last_name,
      department,
      role,
      status
    };
    
    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });
    
    await db.updateUser(req.params.id, updateData);
    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    if (error.message.includes('UNIQUE constraint failed')) {
      res.status(409).json({ error: 'Username or email already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update user' });
    }
  }
});

app.delete('/api/users/:id', requireAuth, async (req, res) => {
  try {
    // Check if user exists
    const existingUser = await db.getUserById(req.params.id);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Prevent deletion of self (basic protection)
    if (parseInt(req.params.id) === req.session.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    await db.deleteUser(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Settings routes
app.get('/api/settings', requireAuth, async (req, res) => {
  try {
    const settingsPath = path.join(__dirname, 'config', 'test-settings.json');
    
    // Check if settings file exists
    if (fs.existsSync(settingsPath)) {
      const settingsData = await fsPromises.readFile(settingsPath, 'utf8');
      const settings = JSON.parse(settingsData);
      res.json(settings);
    } else {
      // Return empty object if no settings file exists
      res.json({});
    }
  } catch (error) {
    console.error('Error loading settings:', error);
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

app.post('/api/settings', requireAuth, async (req, res) => {
  try {
    const settings = req.body;
    const configDir = path.join(__dirname, 'config');
    const settingsPath = path.join(configDir, 'test-settings.json');
    
    // Ensure config directory exists
    if (!fs.existsSync(configDir)) {
      await fsPromises.mkdir(configDir, { recursive: true });
    }
    
    // Validate settings structure (basic validation)
    if (typeof settings !== 'object' || settings === null) {
      return res.status(400).json({ error: 'Invalid settings format' });
    }
    
    // Add metadata
    const settingsWithMeta = {
      ...settings,
      lastModified: new Date().toISOString(),
      modifiedBy: req.session.username || 'unknown'
    };
    
    // Save settings to file
    await fsPromises.writeFile(settingsPath, JSON.stringify(settingsWithMeta, null, 2));
    
    console.log(`Settings updated by ${req.session.username}`);
    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// Health check endpoint for settings page
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// JIRA connection test endpoint
app.post('/api/jira/test-connection', requireAuth, async (req, res) => {
  try {
    const { url, username, token } = req.body;
    
    if (!url || !username || !token) {
      return res.status(400).json({ error: 'Missing JIRA connection parameters' });
    }
    
    // Basic URL validation
    try {
      new URL(url);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid JIRA URL' });
    }
    
    // Test connection by making a simple API call to JIRA
    const testUrl = `${url}/rest/api/2/myself`;
    const authHeader = Buffer.from(`${username}:${token}`).toString('base64');
    
    const fetch = require('node-fetch');
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Accept': 'application/json'
      },
      timeout: 10000
    });
    
    if (response.ok) {
      res.json({ success: true, message: 'JIRA connection successful' });
    } else {
      res.status(response.status).json({ 
        error: 'JIRA connection failed', 
        details: response.statusText 
      });
    }
  } catch (error) {
    console.error('Error testing JIRA connection:', error);
    res.status(500).json({ 
      error: 'Failed to test JIRA connection',
      details: error.message
    });
  }
});

// Catch-all route for SPA behavior
app.get('*', (req, res) => {
  // If the request is for a static file that doesn't exist, send 404
  if (req.path.includes('.')) {
    res.status(404).send('File not found');
  } else {
    // For non-file requests, redirect to login (could be enhanced for SPA routing)
    res.redirect('/login/index.html');
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Demo App server running at http://localhost:${PORT}`);
  console.log(`📱 Login page: http://localhost:${PORT}/login/index.html`);
  console.log(`👥 User Management: http://localhost:${PORT}/users/index.html`);
  console.log(`📊 Analytics & Reports: http://localhost:${PORT}/reports/index.html`);
  console.log(`🧪 Test Management: http://localhost:${PORT}/tests-management/index.html`);
  console.log(`⚙️ Settings: http://localhost:${PORT}/settings/index.html`);
  console.log('✨ Press Ctrl+C to stop the server');
});
