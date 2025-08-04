"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.serverConfig = exports.orchestrationServices = exports.mvpServices = exports.db = exports.io = exports.server = exports.app = void 0;
exports.emitTestUpdate = emitTestUpdate;
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const express_session_1 = __importDefault(require("express-session"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
// Security packages
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const session_file_store_1 = __importDefault(require("session-file-store"));
const crypto_1 = __importDefault(require("crypto"));
const dotenv_1 = require("dotenv");
// Import services
const Database = require('./database/database');
// Configure environment
(0, dotenv_1.config)();
// Create Express app and HTTP server
const app = (0, express_1.default)();
exports.app = app;
const server = (0, http_1.createServer)(app);
exports.server = server;
// Enhanced CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000').split(',');
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
    optionsSuccessStatus: 200
};
// Initialize Socket.IO with proper typing
const io = new socket_io_1.Server(server, {
    cors: corsOptions
});
exports.io = io;
const PORT = process.env.PORT || 5173;
// Initialize database
const db = new Database();
exports.db = db;
// Server configuration
const serverConfig = {
    port: parseInt(process.env.PORT || '5173'),
    sessionSecret: process.env.SESSION_SECRET || crypto_1.default.randomBytes(32).toString('hex'),
    corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000').split(','),
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    webhookToken: process.env.TMS_WEBHOOK_TOKEN
};
exports.serverConfig = serverConfig;
// Enhanced helper function to emit test updates with better targeting
function emitTestUpdate(testId, update) {
    const payload = {
        execution_id: testId,
        status: update.status || 'running',
        timestamp: new Date().toISOString(),
        ...update
    };
    // Emit to test execution room
    io.to(`test-${testId}`).emit('execution:update', payload);
    // Also emit to execution specific events based on status
    if (update.status === 'completed') {
        io.to(`test-${testId}`).emit('execution:completed', {
            execution_id: testId,
            status: update.status,
            results: update,
            timestamp: payload.timestamp
        });
    }
    else if (update.status === 'failed') {
        io.to(`test-${testId}`).emit('execution:failed', {
            execution_id: testId,
            error: update.message || 'Unknown error',
            timestamp: payload.timestamp
        });
    }
    console.log(`📡 Emitted ${update.status} update for test ${testId} to ${io.sockets.adapter.rooms.get(`test-${testId}`)?.size || 0} clients`);
}
// Initialize test execution orchestration
let testQueue = null;
try {
    const TestExecutionQueue = require('./services/test-execution-queue');
    testQueue = new TestExecutionQueue();
}
catch (error) {
    console.warn('⚠️ Test execution queue service not available:', error);
}
// Initialize MVP services with error handling
let mvpServices = {};
exports.mvpServices = mvpServices;
try {
    // Week 3 services
    const MVPAdoConfigService = require('./services/mvp-ado-config');
    const MVPPipelineMonitorService = require('./services/mvp-pipeline-monitor');
    mvpServices.adoConfig = new MVPAdoConfigService();
    mvpServices.pipelineMonitor = new MVPPipelineMonitorService();
    // Week 4 services
    const TestFailureProcessor = require('./services/test-failure-processor');
    const EnhancedJiraIntegration = require('./services/enhanced-jira-integration');
    const MVPWebSocketService = require('./websocket/mvp-updates');
    mvpServices.testFailureProcessor = new TestFailureProcessor();
    mvpServices.jiraIntegration = new EnhancedJiraIntegration();
    mvpServices.webSocket = new MVPWebSocketService();
    // Week 5 services
    const MVPJiraAdoBridge = require('./services/mvp-jira-ado-bridge');
    const AdoTestCorrelation = require('./utils/ado-test-correlation');
    const DuplicateDetector = require('./services/duplicate-detector');
    mvpServices.jiraAdoBridge = new MVPJiraAdoBridge();
    mvpServices.adoTestCorrelation = new AdoTestCorrelation();
    mvpServices.duplicateDetector = new DuplicateDetector();
    console.log('✅ MVP services initialized successfully');
}
catch (error) {
    console.warn('⚠️ Some MVP services may not be available:', error);
}
// Initialize Enhanced Orchestration services (Week 11)
let orchestrationServices = {};
exports.orchestrationServices = orchestrationServices;
try {
    const EnhancedOrchestrationService = require('./services/enhanced-orchestration-service');
    const ResourceAllocationService = require('./services/resource-allocation-service');
    const ParallelExecutionCoordinator = require('./services/parallel-execution-coordinator');
    orchestrationServices.orchestration = new EnhancedOrchestrationService();
    orchestrationServices.resourceAllocation = new ResourceAllocationService();
    orchestrationServices.parallelExecution = new ParallelExecutionCoordinator();
    console.log('✅ Enhanced orchestration services initialized successfully');
}
catch (error) {
    console.warn('⚠️ Enhanced orchestration services may not be available:', error);
}
// File store configuration for sessions
const FileStoreSession = (0, session_file_store_1.default)(express_session_1.default);
// Security middleware
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "ws:", "wss:"],
            fontSrc: ["'self'", "https://cdn.jsdelivr.net"],
        },
    },
    crossOriginEmbedderPolicy: false
}));
app.use((0, cors_1.default)(corsOptions));
app.use((0, compression_1.default)());
app.use((0, morgan_1.default)('combined'));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: serverConfig.rateLimitWindow,
    max: serverConfig.rateLimitMax,
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil(serverConfig.rateLimitWindow / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);
// Body parsing middleware
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Session configuration
app.use((0, express_session_1.default)({
    store: new FileStoreSession({
        path: './sessions',
        ttl: 86400,
        retries: 0
    }),
    secret: serverConfig.sessionSecret,
    resave: false,
    saveUninitialized: false,
    name: 'tms.sid',
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
    }
}));
// Serve static files
app.use(express_1.default.static('public', {
    maxAge: process.env.NODE_ENV === 'production' ? '1y' : '0',
    etag: true,
    lastModified: true
}));
// Authentication middleware
function requireAuth(req, res, next) {
    if (req.session && req.session.userId) {
        next();
    }
    else {
        res.status(401).json({ error: 'Authentication required' });
    }
}
// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);
    // Initialize socket data
    socket.data = {
        authenticated: false,
        subscriptions: new Set(),
        joinedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
    };
    // Send welcome message
    socket.emit('connection:established', {
        message: 'Connected to TMS WebSocket server',
        timestamp: new Date().toISOString()
    });
    // Handle authentication
    socket.on('authenticate', async (token, callback) => {
        try {
            // TODO: Implement proper token validation
            // For now, we'll use session-based auth
            socket.data.authenticated = true;
            callback({ success: true, message: 'Authenticated successfully' });
        }
        catch (error) {
            callback({ success: false, message: 'Authentication failed' });
        }
    });
    // Handle subscriptions
    socket.on('subscribe:executions', (callback) => {
        socket.join('executions');
        socket.data.subscriptions.add('executions');
        callback?.({ success: true, message: 'Subscribed to execution updates' });
    });
    socket.on('subscribe:runners', (callback) => {
        socket.join('runners');
        socket.data.subscriptions.add('runners');
        callback?.({ success: true, message: 'Subscribed to runner updates' });
    });
    socket.on('subscribe:queue', (callback) => {
        socket.join('queue');
        socket.data.subscriptions.add('queue');
        callback?.({ success: true, message: 'Subscribed to queue updates' });
    });
    socket.on('subscribe:dashboard', (callback) => {
        socket.join('dashboard');
        socket.data.subscriptions.add('dashboard');
        callback?.({ success: true, message: 'Subscribed to dashboard updates' });
    });
    // Handle ping
    socket.on('ping', (callback) => {
        callback('pong');
    });
    // Handle disconnection
    socket.on('disconnect', (reason) => {
        console.log(`🔌 Client disconnected: ${socket.id}, reason: ${reason}`);
    });
});
// Start server if this file is run directly
if (require.main === module) {
    startServer();
}
async function startServer() {
    try {
        // Initialize database
        await db.initialize();
        console.log('✅ Database initialized');
        // Initialize services
        if (orchestrationServices.orchestration) {
            await orchestrationServices.orchestration.initialize?.();
        }
        // Setup routes (these will be loaded after this file)
        setupRoutes();
        // Start the server
        server.listen(PORT, () => {
            console.log(`🚀 TMS Server running on port ${PORT}`);
            console.log(`📱 WebSocket server ready for connections`);
            console.log(`🌐 CORS enabled for: ${serverConfig.corsOrigins.join(', ')}`);
            if (process.env.NODE_ENV === 'production') {
                console.log('🔒 Running in production mode with enhanced security');
            }
            else {
                console.log('🔧 Running in development mode');
            }
        });
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}
function setupRoutes() {
    try {
        // Load route modules
        const authRoutes = require('./routes/auth');
        const testRoutes = require('./routes/tests');
        const gitRoutes = require('./routes/git');
        // Week 3+ routes
        try {
            const mvpAdoConfigRoutes = require('./routes/mvp-ado-config');
            app.use('/api/mvp/ado-config', mvpAdoConfigRoutes);
        }
        catch (e) {
            console.warn('MVP ADO Config routes not available');
        }
        try {
            const testResultProcessingRoutes = require('./routes/test-result-processing');
            app.use('/api/test-processing', testResultProcessingRoutes);
        }
        catch (e) {
            console.warn('Test result processing routes not available');
        }
        try {
            const workflowAutomationRoutes = require('./routes/workflow-automation');
            app.use('/api/workflow', workflowAutomationRoutes);
        }
        catch (e) {
            console.warn('Workflow automation routes not available');
        }
        try {
            const mvpDashboardRoutes = require('./routes/mvp-dashboard');
            app.use('/mvp', mvpDashboardRoutes);
        }
        catch (e) {
            console.warn('MVP dashboard routes not available');
        }
        // Week 9+ orchestration routes
        try {
            const testWebhookRoutes = require('./routes/test-webhooks');
            app.use('/api/webhooks', testWebhookRoutes);
        }
        catch (e) {
            console.warn('Webhook routes not available');
        }
        // Week 11 enhanced orchestration routes
        try {
            const enhancedOrchestrationRoutes = require('./routes/enhanced-orchestration-api');
            const enhancedOrchestrationDashboard = require('./routes/enhanced-orchestration-dashboard');
            app.use('/api/enhanced-orchestration', enhancedOrchestrationRoutes);
            app.use('/enhanced-orchestration', enhancedOrchestrationDashboard);
        }
        catch (e) {
            console.warn('Enhanced orchestration routes not available');
        }
        // Core routes
        app.use('/api/auth', authRoutes);
        app.use('/api/tests', testRoutes);
        app.use('/api/git', gitRoutes);
        // Health check endpoint
        app.get('/api/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                version: process.env.npm_package_version || '1.0.0'
            });
        });
        // Catch-all route for SPA
        app.get('*', (req, res) => {
            res.sendFile(path_1.default.join(__dirname, 'public', 'index.html'));
        });
        console.log('✅ Routes configured successfully');
    }
    catch (error) {
        console.error('❌ Error setting up routes:', error);
    }
}
// Graceful shutdown handling
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
async function gracefulShutdown(signal) {
    console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
    try {
        // Close WebSocket connections
        io.close();
        console.log('✅ WebSocket server closed');
        // Close HTTP server
        server.close(() => {
            console.log('✅ HTTP server closed');
        });
        // Cleanup services
        if (orchestrationServices.orchestration?.cleanup) {
            await orchestrationServices.orchestration.cleanup();
        }
        if (orchestrationServices.resourceAllocation?.cleanup) {
            await orchestrationServices.resourceAllocation.cleanup();
        }
        if (orchestrationServices.parallelExecution?.cleanup) {
            await orchestrationServices.parallelExecution.cleanup();
        }
        console.log('✅ Services cleaned up');
        // Close database connection
        if (db.close) {
            await db.close();
            console.log('✅ Database connection closed');
        }
        console.log('🎉 Graceful shutdown complete');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
    }
}
//# sourceMappingURL=server.js.map