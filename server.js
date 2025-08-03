const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const { spawn } = require('child_process');
const fs = require('fs');
const fsPromises = require('fs').promises;
const Database = require('./database/database');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Security packages
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const morgan = require('morgan');
const compression = require('compression');
const FileStore = require('session-file-store')(session);
const xss = require('xss');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const server = createServer(app);

// Enhanced CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000').split(',');
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
  optionsSuccessStatus: 200
};

const io = new Server(server, {
  cors: corsOptions
});

const PORT = process.env.PORT || 5173;

// Initialize database
const db = new Database();

// Enhanced helper function to emit test updates with better targeting
function emitTestUpdate(testId, update) {
  const payload = {
    testId,
    timestamp: new Date().toISOString(),
    ...update
  };
  
  // Emit to test execution room
  io.to(`test-${testId}`).emit('testUpdate', payload);
  
  // Also emit logs to log subscribers if it's a log update
  if (update.type === 'log-update') {
    io.to(`logs-${testId}`).emit('logUpdate', {
      testId,
      timestamp: payload.timestamp,
      source: update.source,
      content: update.content,
      level: update.level || 'info',
      currentTest: update.currentTest
    });
  }
  
  console.log(`📡 Emitted ${update.type} for test ${testId} to ${io.sockets.adapter.rooms.get(`test-${testId}`)?.size || 0} clients`);
}

// Initialize test execution orchestration (outside MVP services to ensure availability)
const TestExecutionQueue = require('./services/test-execution-queue');
const testQueue = new TestExecutionQueue();

// Initialize MVP services (Week 3, 4 & 5)
let mvpAdoConfigService = null;
let mvpPipelineMonitorService = null;
let testFailureProcessor = null;
let enhancedJiraIntegration = null;
let mvpWebSocketService = null;
let mvpJiraAdoBridge = null;
let adoTestCorrelation = null;
let duplicateDetector = null;

try {
  // Week 3 services
  const MVPAdoConfigService = require('./services/mvp-ado-config');
  const MVPPipelineMonitorService = require('./services/mvp-pipeline-monitor');
  
  // Week 4 services
  const TestFailureProcessor = require('./services/test-failure-processor');
  const EnhancedJiraIntegration = require('./services/enhanced-jira-integration');
  const MVPWebSocketService = require('./websocket/mvp-updates');
  
  // Week 5 services
  const MVPJiraAdoBridge = require('./services/mvp-jira-ado-bridge');
  const AdoTestCorrelation = require('./utils/ado-test-correlation');
  const DuplicateDetector = require('./services/duplicate-detector');
  
  // Test execution orchestration services
  const TestExecutionQueue = require('./services/test-execution-queue');
  
  // Initialize services
  mvpAdoConfigService = new MVPAdoConfigService(db);
  mvpPipelineMonitorService = new MVPPipelineMonitorService(db, mvpAdoConfigService);
  testFailureProcessor = new TestFailureProcessor(db);
  enhancedJiraIntegration = new EnhancedJiraIntegration(db, testFailureProcessor);
  mvpWebSocketService = new MVPWebSocketService(io);
  
  // Initialize Week 5 services
  adoTestCorrelation = new AdoTestCorrelation(db.getDatabase());
  duplicateDetector = new DuplicateDetector(db.getDatabase());
  mvpJiraAdoBridge = new MVPJiraAdoBridge(db.getDatabase(), {
    testFailureProcessor,
    enhancedJiraIntegration,
    adoTestCorrelation,
    duplicateDetector
  });
  
  // Set up service dependencies
  mvpWebSocketService.setServices({
    pipelineMonitor: mvpPipelineMonitorService,
    testFailureProcessor: testFailureProcessor,
    configService: mvpAdoConfigService,
    jiraAdoBridge: mvpJiraAdoBridge
  });
  
  // Set up cross-service communication
  testFailureProcessor.setJiraIntegration(enhancedJiraIntegration);
  
  // Set up Week 5 JIRA-ADO Bridge integration
  if (mvpPipelineMonitorService && mvpJiraAdoBridge) {
    mvpPipelineMonitorService.on('build_completed', async (buildData) => {
      try {
        await mvpJiraAdoBridge.processBuildCompletion(buildData);
      } catch (error) {
        console.error('Error processing build completion in JIRA-ADO bridge:', error);
      }
    });
  }
  
  // Set up WebSocket integration for Week 3 pipeline monitoring
  if (mvpPipelineMonitorService) {
    mvpPipelineMonitorService.on('test_failures_detected', (data) => {
      mvpWebSocketService.emitTestFailuresDetected(data);
    });

    mvpPipelineMonitorService.on('monitoring_started', (data) => {
      mvpWebSocketService.emitMonitoringServiceStatusChanged({ status: 'started', ...data });
    });

    mvpPipelineMonitorService.on('monitoring_stopped', (data) => {
      mvpWebSocketService.emitMonitoringServiceStatusChanged({ status: 'stopped', ...data });
    });

    mvpPipelineMonitorService.on('monitoring_error', (data) => {
      mvpWebSocketService.emitMonitoringServiceStatusChanged({ status: 'error', ...data });
    });

    mvpPipelineMonitorService.on('build_completed', (data) => {
      mvpWebSocketService.emitBuildCompleted(data);
    });
  }
  
  // Set up WebSocket integration for Week 4 test processing
  if (testFailureProcessor) {
    testFailureProcessor.on('processing_started', (data) => {
      mvpWebSocketService.emitBuildProcessingStarted(data);
    });

    testFailureProcessor.on('processing_completed', (data) => {
      mvpWebSocketService.emitBuildProcessingCompleted(data);
    });

    testFailureProcessor.on('processing_failed', (data) => {
      mvpWebSocketService.emitBuildProcessingFailed(data);
    });

    testFailureProcessor.on('failures_detected', (data) => {
      mvpWebSocketService.emitTestFailuresDetected(data);
    });
  }
  
  // Set up WebSocket integration for JIRA events
  if (enhancedJiraIntegration) {
    enhancedJiraIntegration.on('issue_created', (data) => {
      mvpWebSocketService.emitJiraIssueCreated(data);
    });

    enhancedJiraIntegration.on('issue_updated', (data) => {
      mvpWebSocketService.emitJiraIssueUpdated(data);
    });
  }
  
  // Set up WebSocket integration for Week 5 JIRA-ADO Bridge
  if (mvpJiraAdoBridge) {
    mvpJiraAdoBridge.on('workflow_executed', (data) => {
      mvpWebSocketService.emitWorkflowExecuted(data);
    });

    mvpJiraAdoBridge.on('duplicate_detected', (data) => {
      mvpWebSocketService.emitDuplicateDetected(data);
    });

    mvpJiraAdoBridge.on('correlation_completed', (data) => {
      mvpWebSocketService.emitCorrelationCompleted(data);
    });
  }
  
  console.log('✅ MVP services (Week 3, 4 & 5) initialized successfully');
} catch (error) {
  console.warn('⚠️ MVP services not available:', error.message);
}

// Set up test execution queue webhook routes and event listeners (outside MVP try block to ensure availability)
const testWebhookRoutes = require('./routes/test-webhooks')(testQueue, emitTestUpdate);
app.use('/api/webhooks', testWebhookRoutes);

// Set up event listeners for test queue
testQueue.on('execution-queued', (execution) => {
  emitTestUpdate(execution.id, {
    type: 'execution-queued',
    status: 'queued',
    execution: execution
  });
});

testQueue.on('execution-running', (execution) => {
  emitTestUpdate(execution.id, {
    type: 'execution-running',
    status: 'running',
    execution: execution
  });
});

testQueue.on('execution-completed', (execution) => {
  emitTestUpdate(execution.id, {
    type: 'execution-completed',
    status: 'completed',
    execution: execution
  });
});

testQueue.on('execution-failed', (execution) => {
  emitTestUpdate(execution.id, {
    type: 'execution-failed',
    status: 'failed',
    execution: execution
  });
});

testQueue.on('execution-cancelled', (execution) => {
  emitTestUpdate(execution.id, {
    type: 'execution-cancelled',
    status: 'cancelled',
    execution: execution
  });
});

// Make database available to routes
app.locals.db = db;

// Store for active test executions
// Global variables for service instances

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(cors(corsOptions));
app.use(compression());
app.use(morgan('combined', {
  skip: function (req, res) { return res.statusCode < 400 }
}));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // Increased from 100 to 1000
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS) || 20, // Increased from 5 to 20
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(generalLimiter);

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Enhanced session configuration
app.use(session({
  store: new FileStore({
    path: './sessions',
    ttl: parseInt(process.env.SESSION_TTL) || 86400, // 24 hours
    retries: 3,
    logFn: function() {} // Disable file store logging
  }),
  secret: process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex'),
  resave: false,
  saveUninitialized: false,
  name: 'sessionId',
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: parseInt(process.env.SESSION_TTL) * 1000 || 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict'
  },
  genid: function(req) {
    return crypto.randomUUID();
  }
}));

// Serve React frontend static files
app.use(express.static(path.join(__dirname, 'frontend/dist')));

// Serve legacy static files for backwards compatibility
app.use('/legacy', express.static('.'));

// Route for root - serve React app
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
});

// Legacy routes for old frontend
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login/index.html'));
});

app.get('/login/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'login/index.html'));
});

app.get('/users/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'old-vanilla-pages/users/index.html'));
});

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Check session timeout
  const now = Date.now();
  const lastActivity = req.session.lastActivity || now;
  const sessionTimeout = parseInt(process.env.SESSION_TIMEOUT_MS) || 30 * 60 * 1000; // 30 minutes
  
  if (now - lastActivity > sessionTimeout) {
    req.session.destroy();
    return res.status(401).json({ error: 'Session expired' });
  }
  
  // Update last activity
  req.session.lastActivity = now;
  next();
};

// Input validation middleware
const loginValidation = [
  body('username')
    .trim()
    .isLength({ min: 1, max: 50 })
    .matches(/^[a-zA-Z0-9_.-]+$/)
    .withMessage('Username must be 1-50 characters and contain only letters, numbers, dots, dashes, and underscores'),
  body('password')
    .isLength({ min: 1, max: 128 })
    .withMessage('Password must be 1-128 characters')
];

const userValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .matches(/^[a-zA-Z0-9_.-]+$/)
    .withMessage('Username must be 3-50 characters and contain only letters, numbers, dots, dashes, and underscores'),
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('First name must be 1-50 characters and contain only letters, spaces, apostrophes, and hyphens'),
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Last name must be 1-50 characters and contain only letters, spaces, apostrophes, and hyphens'),
  body('password')
    .optional()
    .isLength({ min: 8, max: 128 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must be 8-128 characters with at least one lowercase, uppercase, digit, and special character'),
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department must be no more than 100 characters'),
  body('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('Role must be either user or admin')
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);
    return res.status(400).json({ error: 'Validation failed', details: errorMessages });
  }
  
  // Sanitize input to prevent XSS
  for (let key in req.body) {
    if (typeof req.body[key] === 'string') {
      req.body[key] = xss(req.body[key]);
    }
  }
  
  next();
};

// Auth routes
app.post('/api/login', loginLimiter, loginValidation, handleValidationErrors, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Additional server-side validation
    if (!username || !password || username.length > 50 || password.length > 128) {
      return res.status(400).json({ error: 'Invalid input parameters' });
    }

    const user = await db.getUserByUsername(username);
    
    if (!user || !await bcrypt.compare(password, user.password)) {
      // Log failed login attempt
      console.warn(`Failed login attempt for username: ${username} from IP: ${req.ip}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.status !== 'active') {
      console.warn(`Login attempt for inactive user: ${username} from IP: ${req.ip}`);
      return res.status(403).json({ error: 'Account is not active' });
    }

    // Create session with additional security data
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;
    req.session.lastActivity = Date.now();
    req.session.loginTime = new Date().toISOString();
    req.session.ipAddress = req.ip;
    req.session.userAgent = req.get('User-Agent');
    
    // Update last login
    await db.updateUser(user.id, { last_login: new Date().toISOString() });
    
    // Log successful login
    console.log(`Successful login for user: ${username} from IP: ${req.ip}`);
    
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
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/logout', requireAuth, (req, res) => {
  try {
    const username = req.session.username;
    const loginTime = req.session.loginTime;
    const sessionDuration = Date.now() - new Date(loginTime).getTime();
    
    // Log logout event
    console.log(`User logout: ${username}, session duration: ${Math.round(sessionDuration / 1000)}s`);
    
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destruction error:', err);
        return res.status(500).json({ error: 'Logout failed' });
      }
      
      res.clearCookie('sessionId', {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });
      
      res.json({ success: true, message: 'Logout successful' });
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
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
    const executionHistory = testQueue.executionHistory;
    console.log(`🔍 Checking ${executionHistory.length} executions for latest results...`);
    
    for (const execution of executionHistory) {
      console.log(`📋 Execution ${execution.id}: status=${execution.status}, hasResults=${!!execution.results}`);
      if (execution.status === 'completed' && execution.results) {
        if (!latestExecution || new Date(execution.completedAt) > new Date(latestExecution.completedAt)) {
          latestExecution = execution;
          console.log(`✅ Found newer completed execution: ${execution.id}`);
        }
      }
    }
    
    if (latestExecution && latestExecution.results) {
      testResults.passingTests = latestExecution.results.passed;
      testResults.failingTests = latestExecution.results.failed;
      testResults.skippedTests = latestExecution.results.skipped;
      testResults.lastRun = latestExecution.completedAt;
      console.log('✅ Found latest execution results:', latestExecution.results);
    } else {
      // Try to load results from file (for persistence across server restarts)
      console.log('🔍 No in-memory results found, checking file...');
      try {
        const savedResults = JSON.parse(fs.readFileSync(path.join(__dirname, 'tests/test-data/results/latest-test-results.json'), 'utf8'));
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

// API Routes

// New orchestration-based test execution endpoint
app.post('/api/tests/run', requireAuth, async (req, res) => {
  try {
    const { testFiles, suite, grep, priority, targetRunner, environment, branch, commit, tags } = req.body;
    
    console.log('Test execution orchestration request received:', {
      testFiles,
      suite,
      grep,
      priority,
      targetRunner,
      testFilesCount: testFiles ? testFiles.length : 0
    });

    // Validate request
    if (!testFiles || !Array.isArray(testFiles) || testFiles.length === 0) {
      return res.status(400).json({ 
        error: 'testFiles array is required and must not be empty' 
      });
    }

    // Queue the execution request
    const execution = testQueue.queueExecution({
      testFiles,
      suite: suite || 'default',
      grep,
      priority: priority || 'normal',
      targetRunner: targetRunner || 'auto',
      environment: environment || 'default',
      branch: branch || 'main',
      commit,
      tags: tags || [],
      userId: req.session.userId,
      webhookUrl: `${req.protocol}://${req.get('host')}/api/webhooks/test-results`
    });

    // Immediately trigger the execution
    try {
      const triggerResult = await testQueue.triggerExecution(execution.id);
      
      res.json({
        success: true,
        executionId: execution.id,
        status: 'running',
        message: 'Test execution triggered successfully',
        estimatedDuration: execution.metadata.estimatedDuration,
        externalRunId: triggerResult.runId,
        externalRunUrl: triggerResult.runUrl,
        provider: triggerResult.provider
      });
      
    } catch (triggerError) {
      console.error('Failed to trigger execution:', triggerError);
      
      // Update execution status to failed
      testQueue.processFailure(execution.id, triggerError);
      
      res.status(500).json({
        success: false,
        executionId: execution.id,
        error: 'Failed to trigger test execution',
        details: triggerError.message
      });
    }

  } catch (error) {
    console.error('Error orchestrating test execution:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to orchestrate test execution',
      details: error.message
    });
  }
});

// Get execution status (updated to work with new queue system)
app.get('/api/tests/results/:executionId', requireAuth, async (req, res) => {
  try {
    const { executionId } = req.params;
    
    const execution = testQueue.getExecutionStatus(executionId);
    
    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    res.json({
      executionId: execution.id,
      status: execution.status,
      createdAt: execution.createdAt,
      startTime: execution.triggeredAt,
      endTime: execution.completedAt,
      results: execution.results,
      error: execution.error,
      externalRunId: execution.externalRunId,
      externalRunUrl: execution.externalRunUrl,
      targetRunner: execution.targetRunner,
      metadata: execution.metadata,
      actualDuration: execution.actualDuration
    });
    
  } catch (error) {
    console.error('Error fetching execution status:', error);
    res.status(500).json({ error: 'Failed to fetch execution status' });
  }
});

// Get queue status
app.get('/api/tests/queue/status', requireAuth, async (req, res) => {
  try {
    const queueStatus = testQueue.getQueueStatus();
    
    res.json({
      success: true,
      queue: queueStatus,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching queue status:', error);
    res.status(500).json({ error: 'Failed to fetch queue status' });
  }
});

// Cancel execution
app.post('/api/tests/cancel/:executionId', requireAuth, async (req, res) => {
  try {
    const { executionId } = req.params;
    
    const execution = await testQueue.cancelExecution(executionId);
    
    res.json({
      success: true,
      executionId,
      status: execution.status,
      message: 'Execution cancelled successfully'
    });
    
  } catch (error) {
    console.error('Error cancelling execution:', error);
    res.status(500).json({ 
      error: 'Failed to cancel execution',
      details: error.message 
    });
  }
});

// Get execution history
app.get('/api/tests/history', requireAuth, async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    
    const history = testQueue.executionHistory
      .slice(offset, offset + limit)
      .map(execution => ({
        id: execution.id,
        status: execution.status,
        createdAt: execution.createdAt,
        completedAt: execution.completedAt,
        testFiles: execution.testFiles,
        results: execution.results,
        targetRunner: execution.targetRunner,
        actualDuration: execution.actualDuration,
        error: execution.error
      }));
    
    res.json({
      success: true,
      history,
      total: testQueue.executionHistory.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
  } catch (error) {
    console.error('Error fetching execution history:', error);
    res.status(500).json({ error: 'Failed to fetch execution history' });
  }
});

// Get list of all test executions
app.get('/api/tests/executions', requireAuth, async (req, res) => {
  try {
    const queueStatus = testQueue.getQueueStatus();
    const history = testQueue.executionHistory.slice(0, 20); // Last 20 executions
    
    const executions = [
      ...queueStatus.queued.map(exec => ({
        id: exec.id,
        status: 'queued',
        startTime: exec.createdAt,
        endTime: null,
        results: null
      })),
      ...queueStatus.running.map(exec => ({
        id: exec.id,
        status: 'running',
        startTime: exec.triggeredAt,
        endTime: null,
        results: null
      })),
      ...history.map(exec => ({
        id: exec.id,
        status: exec.status,
        startTime: exec.createdAt,
        endTime: exec.completedAt,
        results: exec.results
      }))
    ];
    
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

app.post('/api/users', requireAuth, userValidation, handleValidationErrors, async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, department, role, status } = req.body;
    
    // Check if user has admin privileges
    if (req.session.role !== 'admin') {
      return res.status(403).json({ error: 'Admin privileges required' });
    }
    
    // Validate required fields (additional server-side check)
    if (!username || !email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Additional security checks
    if (username.length > 50 || email.length > 255 || firstName.length > 50 || lastName.length > 50) {
      return res.status(400).json({ error: 'Input parameters exceed maximum length' });
    }
    
    // Create user
    const userId = await db.createUser({
      username,
      email,
      password,
      first_name: firstName,
      last_name: lastName,
      department: department || null,
      role: role || 'user',
      status: status || 'active'
    });
    
    // Log user creation
    console.log(`User created: ${username} by admin: ${req.session.username} from IP: ${req.ip}`);
    
    res.status(201).json({ id: userId, message: 'User created successfully' });
  } catch (error) {
    console.error('Error creating user:', error);
    if (error.message.includes('UNIQUE constraint failed')) {
      res.status(409).json({ error: 'Username or email already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

app.put('/api/users/:id', requireAuth, userValidation, handleValidationErrors, async (req, res) => {
  try {
    const { username, email, firstName, lastName, department, role, status } = req.body;
    
    // Check if user has admin privileges or is updating their own profile
    const isAdmin = req.session.role === 'admin';
    const isOwnProfile = parseInt(req.params.id) === req.session.userId;
    
    if (!isAdmin && !isOwnProfile) {
      return res.status(403).json({ error: 'Insufficient privileges' });
    }
    
    // Check if user exists
    const existingUser = await db.getUserById(req.params.id);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Non-admin users can only update certain fields
    const updateData = {};
    if (isAdmin) {
      updateData.username = username;
      updateData.email = email;
      updateData.first_name = firstName;
      updateData.last_name = lastName;
      updateData.department = department;
      updateData.role = role;
      updateData.status = status;
    } else {
      // Regular users can only update personal info
      updateData.email = email;
      updateData.first_name = firstName;
      updateData.last_name = lastName;
      updateData.department = department;
    }
    
    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });
    
    // Additional security checks
    if (updateData.username && updateData.username.length > 50) {
      return res.status(400).json({ error: 'Username exceeds maximum length' });
    }
    
    await db.updateUser(req.params.id, updateData);
    
    // Log user update
    console.log(`User updated: ${existingUser.username} by ${isAdmin ? 'admin' : 'user'}: ${req.session.username} from IP: ${req.ip}`);
    
    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    if (error.message.includes('UNIQUE constraint failed')) {
      res.status(409).json({ error: 'Username or email already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

app.delete('/api/users/:id', requireAuth, async (req, res) => {
  try {
    // Check if user has admin privileges
    if (req.session.role !== 'admin') {
      return res.status(403).json({ error: 'Admin privileges required' });
    }
    
    // Validate user ID parameter
    const userId = parseInt(req.params.id);
    if (isNaN(userId) || userId <= 0) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    // Check if user exists
    const existingUser = await db.getUserById(userId);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Prevent deletion of self (basic protection)
    if (userId === req.session.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    // Prevent deletion of other admins (add business logic as needed)
    if (existingUser.role === 'admin') {
      return res.status(400).json({ error: 'Cannot delete admin accounts' });
    }
    
    await db.deleteUser(userId);
    
    // Log user deletion
    console.log(`User deleted: ${existingUser.username} by admin: ${req.session.username} from IP: ${req.ip}`);
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
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

// Azure DevOps routes
try {
  const adoWebhooksRouter = require('./routes/ado-webhooks');
  const adoProjectConfigRouter = require('./routes/ado-project-config');
  const adoDashboardRouter = require('./routes/ado-dashboard');

  // Store io instance for webhook access
  app.set('io', io);

  app.use('/api/ado/webhooks', adoWebhooksRouter);
  app.use('/api/ado/project-config', adoProjectConfigRouter);
  app.use('/api/ado/dashboard', adoDashboardRouter);
} catch (error) {
  console.warn('⚠️ Azure DevOps routes not available:', error.message);
}

// MVP ADO Configuration routes (Week 3)
try {
  const { router: mvpAdoConfigRouter, setServices } = require('./routes/mvp-ado-config');
  
  // Set the services in the router
  if (mvpAdoConfigService && mvpPipelineMonitorService) {
    setServices(mvpAdoConfigService, mvpPipelineMonitorService);
  }
  
  app.use('/api/mvp', mvpAdoConfigRouter);
  console.log('✅ MVP ADO configuration routes loaded');
} catch (error) {
  console.warn('⚠️ MVP ADO configuration routes not available:', error.message);
}

// MVP Test Result Processing routes (Week 4)
try {
  const { router: testResultProcessingRouter, setServices: setProcessingServices } = require('./routes/test-result-processing');
  
  // Set the services in the router
  if (testFailureProcessor && enhancedJiraIntegration && mvpWebSocketService) {
    setProcessingServices(testFailureProcessor, enhancedJiraIntegration, mvpWebSocketService);
  }
  
  app.use('/api/test-results', testResultProcessingRouter);
  console.log('✅ MVP Test Result Processing routes loaded');
} catch (error) {
  console.warn('⚠️ MVP Test Result Processing routes not available:', error.message);
}

// ADR-001: Git Integration routes for TMS
try {
  const gitWebhooksRouter = require('./routes/git-webhooks');
  app.use('/api/git', gitWebhooksRouter);
  console.log('✅ Git integration routes loaded');
} catch (error) {
  console.warn('⚠️ Git integration routes not available:', error.message);
}

// Flaky Test Detection routes
try {
  const flakyTestRoutes = require('./routes/flakyTestRoutes');
  app.use('/api/flaky-tests', flakyTestRoutes);
  console.log('✅ Flaky Test Detection routes loaded successfully');
} catch (error) {
  console.warn('⚠️ Flaky Test Detection routes not loaded:', error.message);
}

// MVP Workflow Automation routes (Week 5)
try {
  const workflowAutomationRouter = require('./routes/workflow-automation');
  
  // Add database middleware for workflow routes
  workflowAutomationRouter.use((req, res, next) => {
    req.db = db.getDatabase();
    next();
  });
  
  app.use('/api/workflow', workflowAutomationRouter);
  console.log('✅ MVP Workflow Automation routes loaded');
} catch (error) {
  console.warn('⚠️ MVP Workflow Automation routes not available:', error.message);
}

// MVP Dashboard routes (Week 6)
try {
  // Add database middleware for all /api/mvp-dashboard routes
  app.use('/api/mvp-dashboard', (req, res, next) => {
    req.db = db.db; // Access the sqlite3 database instance
    next();
  });
  
  const mvpDashboardRouter = require('./routes/mvp-dashboard');
  app.use('/api/mvp-dashboard', mvpDashboardRouter);
  console.log('✅ MVP Dashboard routes loaded');
} catch (error) {
  console.warn('⚠️ MVP Dashboard routes not available:', error.message);
}

// Health Check Service and Routes (Week 8)
try {
  const HealthCheckService = require('./services/health-check');
  const healthCheckService = new HealthCheckService();
  
  // Health check endpoint
  app.get('/api/health', async (req, res) => {
    try {
      const health = await healthCheckService.performHealthCheck();
      const statusCode = health.status === 'healthy' ? 200 : 
                        health.status === 'warning' || health.status === 'degraded' ? 200 : 503;
      res.status(statusCode).json(health);
    } catch (error) {
      res.status(503).json({
        status: 'error',
        message: 'Health check failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Health history endpoint
  app.get('/api/health/history', (req, res) => {
    try {
      const history = healthCheckService.getHealthHistory();
      res.json({ history });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to retrieve health history',
        message: error.message
      });
    }
  });

  // Metrics endpoint for monitoring
  app.get('/api/metrics', (req, res) => {
    try {
      const metrics = healthCheckService.getMetrics();
      res.json(metrics || { message: 'No metrics available' });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to retrieve metrics',
        message: error.message
      });
    }
  });

  console.log('✅ Health Check service and routes loaded');
} catch (error) {
  console.warn('⚠️ Health Check service not available:', error.message);
}

// Catch-all route for SPA behavior
app.get('*', (req, res) => {
  // If the request is for a static file that doesn't exist, send 404
  if (req.path.includes('.')) {
    res.status(404).send('File not found');
  } else {
    // For all other routes, serve the React SPA index.html to enable client-side routing
    res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  
  // Use MVP WebSocket service for handling MVP-specific connections if available
  if (mvpWebSocketService) {
    mvpWebSocketService.handleConnection(socket);
  }
  
  // Handle test execution monitoring
  socket.on('joinTestExecution', (testId) => {
    socket.join(`test-${testId}`);
    console.log(`📊 Client joined test execution room: test-${testId}`);
    
    // Send current execution status if available
    const execution = testQueue.getExecutionStatus(testId);
    if (execution) {
      socket.emit('testUpdate', {
        testId,
        type: 'execution-status',
        status: execution.status,
        startTime: execution.createdAt,
        endTime: execution.completedAt,
        progress: execution.progress || { completed: 0, total: 0, currentTest: null },
        results: execution.results
      });
    }
  });
  
  // Handle leaving test execution monitoring
  socket.on('leaveTestExecution', (testId) => {
    socket.leave(`test-${testId}`);
    console.log(`📊 Client left test execution room: test-${testId}`);
  });
  
  // Handle request for execution history
  socket.on('getExecutionHistory', () => {
    const history = testQueue.executionHistory.slice(0, 20).map(execution => ({
      id: execution.id,
      status: execution.status,
      startTime: execution.createdAt,
      endTime: execution.completedAt,
      results: execution.results
    }));
    
    socket.emit('executionHistory', history);
  });
  
  // Handle live log subscription
  socket.on('subscribeLogs', (testId) => {
    socket.join(`logs-${testId}`);
    console.log(`📜 Client subscribed to logs for: test-${testId}`);
    
    // Send recent logs if execution exists
    const execution = testQueue.getExecutionStatus(testId);
    if (execution && execution.logs && execution.logs.length > 0) {
      const recentLogs = execution.logs.slice(-100); // Last 100 log entries
      socket.emit('logsHistory', {
        testId,
        logs: recentLogs.map((log, index) => ({
          id: index,
          timestamp: log.timestamp || new Date().toISOString(),
          source: log.source || 'stdout',
          content: log.content || log.message || String(log)
        }))
      });
    }
  });
  
  // Handle unsubscribing from logs
  socket.on('unsubscribeLogs', (testId) => {
    socket.leave(`logs-${testId}`);
    console.log(`📝 Client unsubscribed from logs for: test-${testId}`);
  });
  
  // Handle real-time activity tracking
  socket.on('userActivity', (activity) => {
    // Broadcast user activity to other connected clients
    socket.broadcast.emit('userActivity', {
      userId: socket.id,
      activity,
      timestamp: new Date().toISOString()
    });
  });

  // MVP Pipeline monitoring events
  socket.on('joinPipelineMonitoring', () => {
    socket.join('pipeline-monitoring');
    console.log(`🔧 Client joined pipeline monitoring room: ${socket.id}`);
  });

  socket.on('leavePipelineMonitoring', () => {
    socket.leave('pipeline-monitoring');
    console.log(`🔧 Client left pipeline monitoring room: ${socket.id}`);
  });

  socket.on('getPipelineStatus', async () => {
    try {
      if (mvpPipelineMonitorService) {
        const status = mvpPipelineMonitorService.getMonitoringStatus();
        socket.emit('pipelineStatus', status);
      }
    } catch (error) {
      console.error('Error getting pipeline status:', error);
    }
  });
  
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// Catch-all handler for React Router (SPA routing)
app.get('*', (req, res, next) => {
  // Skip API routes and legacy routes
  if (req.path.startsWith('/api/') || req.path.startsWith('/legacy/')) {
    return next();
  }
  
  // Serve React app for all other routes
  res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
});

server.listen(PORT, () => {
  console.log(`🚀 Demo App server running at http://localhost:${PORT}`);
  console.log(`⚛️  React Frontend: http://localhost:${PORT}`);
  console.log(`📱 Legacy Login: http://localhost:${PORT}/login/index.html`);
  console.log(`👥 Legacy User Management: http://localhost:${PORT}/users/index.html`);
  console.log(`📊 Analytics & Reports: http://localhost:${PORT}/reports/index.html`);
  console.log(`🧪 Test Management: http://localhost:${PORT}/tests-management/index.html`);
  console.log(`⚙️ Settings: http://localhost:${PORT}/settings/index.html`);
  console.log(`🔌 WebSocket server ready for real-time updates`);
  console.log(`🌐 Server configured for port: ${PORT} (React standard port)`);
  console.log('✨ Press Ctrl+C to stop the server');
});
