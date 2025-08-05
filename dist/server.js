"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.serverConfig = exports.orchestrationServices = exports.mvpServices = exports.prismaDb = exports.db = exports.io = exports.server = exports.app = void 0;
exports.emitTestUpdate = emitTestUpdate;
var express_1 = require("express");
var path_1 = require("path");
var express_session_1 = require("express-session");
var http_1 = require("http");
var socket_io_1 = require("socket.io");
// Security packages
var helmet_1 = require("helmet");
var cors_1 = require("cors");
var express_rate_limit_1 = require("express-rate-limit");
var morgan_1 = require("morgan");
var compression_1 = require("compression");
var session_file_store_1 = require("session-file-store");
var crypto_1 = require("crypto");
var dotenv_1 = require("dotenv");
// Import services
var Database = require('./database/database');
var prisma_database_1 = require("./database/prisma-database");
Object.defineProperty(exports, "prismaDb", { enumerable: true, get: function () { return prisma_database_1.prismaDb; } });
// Configure environment
(0, dotenv_1.config)();
// Create Express app and HTTP server
var app = (0, express_1.default)();
exports.app = app;
var server = (0, http_1.createServer)(app);
exports.server = server;
// Enhanced CORS configuration
var corsOptions = {
    origin: function (origin, callback) {
        var allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000').split(',');
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
var io = new socket_io_1.Server(server, {
    cors: corsOptions
});
exports.io = io;
var PORT = process.env.PORT || 3000;
// Initialize databases (legacy and new Prisma)
var db = new Database();
exports.db = db;
// Prisma database is initialized as singleton
// Server configuration
var serverConfig = {
    port: parseInt(process.env.PORT || '3000'),
    sessionSecret: process.env.SESSION_SECRET || crypto_1.default.randomBytes(32).toString('hex'),
    corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000').split(','),
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    webhookToken: process.env.TMS_WEBHOOK_TOKEN
};
exports.serverConfig = serverConfig;
// Enhanced helper function to emit test updates with better targeting
function emitTestUpdate(testId, update) {
    var _a;
    var payload = __assign({ execution_id: testId, status: update.status || 'running', timestamp: new Date().toISOString() }, update);
    // Emit to test execution room
    io.to("test-".concat(testId)).emit('execution:update', payload);
    // Also emit to execution specific events based on status
    if (update.status === 'completed') {
        io.to("test-".concat(testId)).emit('execution:completed', {
            execution_id: testId,
            status: update.status,
            results: update,
            timestamp: payload.timestamp
        });
    }
    else if (update.status === 'failed') {
        io.to("test-".concat(testId)).emit('execution:failed', {
            execution_id: testId,
            error: update.message || 'Unknown error',
            timestamp: payload.timestamp
        });
    }
    console.log("\uD83D\uDCE1 Emitted ".concat(update.status, " update for test ").concat(testId, " to ").concat(((_a = io.sockets.adapter.rooms.get("test-".concat(testId))) === null || _a === void 0 ? void 0 : _a.size) || 0, " clients"));
}
// Initialize test execution orchestration
var testQueue = null;
try {
    var TestExecutionQueue = require('./services/test-execution-queue');
    testQueue = new TestExecutionQueue();
}
catch (error) {
    console.warn('⚠️ Test execution queue service not available:', error);
}
// Initialize MVP services with error handling
var mvpServices = {};
exports.mvpServices = mvpServices;
try {
    // Week 3 services
    var MVPAdoConfigService = require('./services/mvp-ado-config');
    var MVPPipelineMonitorService = require('./services/mvp-pipeline-monitor');
    mvpServices.adoConfig = new MVPAdoConfigService();
    mvpServices.pipelineMonitor = new MVPPipelineMonitorService();
    // Week 4 services
    var TestFailureProcessor = require('./services/test-failure-processor');
    var EnhancedJiraIntegration = require('./services/enhanced-jira-integration');
    var MVPWebSocketService = require('./websocket/mvp-updates');
    mvpServices.testFailureProcessor = new TestFailureProcessor();
    mvpServices.jiraIntegration = new EnhancedJiraIntegration();
    mvpServices.webSocket = new MVPWebSocketService();
    // Week 5 services
    var MVPJiraAdoBridge = require('./services/mvp-jira-ado-bridge');
    var AdoTestCorrelation = require('./utils/ado-test-correlation');
    var DuplicateDetector = require('./services/duplicate-detector');
    mvpServices.jiraAdoBridge = new MVPJiraAdoBridge();
    mvpServices.adoTestCorrelation = new AdoTestCorrelation();
    mvpServices.duplicateDetector = new DuplicateDetector();
    console.log('✅ MVP services initialized successfully');
}
catch (error) {
    console.warn('⚠️ Some MVP services may not be available:', error);
}
// Initialize Enhanced Orchestration services (Week 11)
var orchestrationServices = {};
exports.orchestrationServices = orchestrationServices;
try {
    var EnhancedOrchestrationService = require('./services/enhanced-orchestration-service');
    var ResourceAllocationService = require('./services/resource-allocation-service');
    var ParallelExecutionCoordinator = require('./services/parallel-execution-coordinator');
    orchestrationServices.orchestration = new EnhancedOrchestrationService();
    orchestrationServices.resourceAllocation = new ResourceAllocationService();
    orchestrationServices.parallelExecution = new ParallelExecutionCoordinator();
    console.log('✅ Enhanced orchestration services initialized successfully');
}
catch (error) {
    console.warn('⚠️ Enhanced orchestration services may not be available:', error);
}
// File store configuration for sessions
var FileStoreSession = (0, session_file_store_1.default)(express_session_1.default);
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
var limiter = (0, express_rate_limit_1.default)({
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
io.on('connection', function (socket) {
    console.log("\uD83D\uDD0C Client connected: ".concat(socket.id));
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
    socket.on('authenticate', function (token, callback) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            try {
                // TODO: Implement proper token validation
                // For now, we'll use session-based auth
                socket.data.authenticated = true;
                callback({ success: true, message: 'Authenticated successfully' });
            }
            catch (error) {
                callback({ success: false, message: 'Authentication failed' });
            }
            return [2 /*return*/];
        });
    }); });
    // Handle subscriptions
    socket.on('subscribe:executions', function (callback) {
        socket.join('executions');
        socket.data.subscriptions.add('executions');
        callback === null || callback === void 0 ? void 0 : callback({ success: true, message: 'Subscribed to execution updates' });
    });
    socket.on('subscribe:runners', function (callback) {
        socket.join('runners');
        socket.data.subscriptions.add('runners');
        callback === null || callback === void 0 ? void 0 : callback({ success: true, message: 'Subscribed to runner updates' });
    });
    socket.on('subscribe:queue', function (callback) {
        socket.join('queue');
        socket.data.subscriptions.add('queue');
        callback === null || callback === void 0 ? void 0 : callback({ success: true, message: 'Subscribed to queue updates' });
    });
    socket.on('subscribe:dashboard', function (callback) {
        socket.join('dashboard');
        socket.data.subscriptions.add('dashboard');
        callback === null || callback === void 0 ? void 0 : callback({ success: true, message: 'Subscribed to dashboard updates' });
    });
    // Handle ping
    socket.on('ping', function (callback) {
        callback('pong');
    });
    // Handle disconnection
    socket.on('disconnect', function (reason) {
        console.log("\uD83D\uDD0C Client disconnected: ".concat(socket.id, ", reason: ").concat(reason));
    });
});
// Start server if this file is run directly
if (require.main === module) {
    startServer();
}
function startServer() {
    return __awaiter(this, void 0, void 0, function () {
        var error_1;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 4, , 5]);
                    // Initialize databases
                    // Legacy database initializes itself in constructor
                    console.log('✅ Legacy database initialized');
                    return [4 /*yield*/, prisma_database_1.prismaDb.initialize()];
                case 1:
                    _c.sent();
                    console.log('✅ Prisma database initialized');
                    if (!orchestrationServices.orchestration) return [3 /*break*/, 3];
                    return [4 /*yield*/, ((_b = (_a = orchestrationServices.orchestration).initialize) === null || _b === void 0 ? void 0 : _b.call(_a))];
                case 2:
                    _c.sent();
                    _c.label = 3;
                case 3:
                    // Setup routes (these will be loaded after this file)
                    setupRoutes();
                    // Start the server
                    server.listen(PORT, function () {
                        console.log("\uD83D\uDE80 TMS Server running on port ".concat(PORT));
                        console.log("\uD83D\uDCF1 WebSocket server ready for connections");
                        console.log("\uD83C\uDF10 CORS enabled for: ".concat(serverConfig.corsOrigins.join(', ')));
                        if (process.env.NODE_ENV === 'production') {
                            console.log('🔒 Running in production mode with enhanced security');
                        }
                        else {
                            console.log('🔧 Running in development mode');
                        }
                    });
                    return [3 /*break*/, 5];
                case 4:
                    error_1 = _c.sent();
                    console.error('❌ Failed to start server:', error_1);
                    process.exit(1);
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    });
}
function setupRoutes() {
    try {
        // Setup API documentation with Swagger
        try {
            var setupSwagger = require('./lib/swagger').setupSwagger;
            setupSwagger(app);
        }
        catch (e) {
            console.warn('⚠️ Swagger documentation not available:', e instanceof Error ? e.message : String(e));
        }
        // Load route modules
        var authModule = require('./routes/auth.ts');
        var authRoutes = authModule.default;
        var testRoutes = require('./routes/tests');
        var gitRoutes = require('./routes/git');
        var usersModule = require('./routes/users.ts');
        var usersRoutes = usersModule.default;
        // Initialize auth routes with database
        authModule.setDatabase(db.db);
        // Initialize users routes with database
        usersModule.setDatabase(db.db);
        // Initialize test routes with database
        testRoutes.setDatabase(db);
        // Initialize git routes with database
        gitRoutes.setDatabase(db);
        // Week 3+ routes
        try {
            var mvpAdoConfigRoutes = require('./routes/mvp-ado-config');
            app.use('/api/mvp/ado-config', mvpAdoConfigRoutes);
        }
        catch (e) {
            console.warn('MVP ADO Config routes not available');
        }
        try {
            var testResultProcessingRoutes = require('./routes/test-result-processing');
            app.use('/api/test-processing', testResultProcessingRoutes);
        }
        catch (e) {
            console.warn('Test result processing routes not available');
        }
        try {
            var workflowAutomationRoutes = require('./routes/workflow-automation');
            app.use('/api/workflow', workflowAutomationRoutes);
        }
        catch (e) {
            console.warn('Workflow automation routes not available');
        }
        try {
            var mvpDashboardRoutes = require('./routes/mvp-dashboard');
            app.use('/mvp', mvpDashboardRoutes);
        }
        catch (e) {
            console.warn('MVP dashboard routes not available');
        }
        // Azure DevOps routes
        try {
            var adoWebhooksRouter = require('./routes/ado-webhooks');
            var adoProjectConfigRouter = require('./routes/ado-project-config.ts').default;
            var adoDashboardRouter = require('./routes/ado-dashboard');
            var adoTestRouter = require('./routes/ado-test.ts').default;
            // Store io instance for webhook access
            app.set('io', io);
            app.use('/api/ado/webhooks', adoWebhooksRouter);
            app.use('/api/ado', adoProjectConfigRouter);
            app.use('/api/ado', adoTestRouter);
            app.use('/api/ado/dashboard', adoDashboardRouter);
        }
        catch (e) {
            console.warn('Azure DevOps routes not available');
        }
        // Week 9+ orchestration routes
        try {
            var testWebhookRoutes = require('./routes/test-webhooks');
            app.use('/api/webhooks', testWebhookRoutes);
        }
        catch (e) {
            console.warn('Webhook routes not available');
        }
        // Week 11 enhanced orchestration routes
        try {
            var enhancedOrchestrationRoutes = require('./routes/enhanced-orchestration-api');
            var enhancedOrchestrationDashboard = require('./routes/enhanced-orchestration-dashboard');
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
        app.use('/api/users', usersRoutes);
        // Settings routes
        try {
            var settingsRoutes = require('./routes/settings');
            app.use('/api/settings', settingsRoutes);
        }
        catch (e) {
            console.warn('Settings routes not available');
        }
        // Health check endpoint
        app.get('/api/health', function (req, res) {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                version: process.env.npm_package_version || '1.0.0'
            });
        });
        // Catch-all route for SPA
        app.get('*', function (req, res) {
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
function gracefulShutdown(signal) {
    return __awaiter(this, void 0, void 0, function () {
        var error_2;
        var _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    console.log("\n\uD83D\uDED1 Received ".concat(signal, ", shutting down gracefully..."));
                    _d.label = 1;
                case 1:
                    _d.trys.push([1, 11, , 12]);
                    // Close WebSocket connections
                    io.close();
                    console.log('✅ WebSocket server closed');
                    // Close HTTP server
                    server.close(function () {
                        console.log('✅ HTTP server closed');
                    });
                    if (!((_a = orchestrationServices.orchestration) === null || _a === void 0 ? void 0 : _a.cleanup)) return [3 /*break*/, 3];
                    return [4 /*yield*/, orchestrationServices.orchestration.cleanup()];
                case 2:
                    _d.sent();
                    _d.label = 3;
                case 3:
                    if (!((_b = orchestrationServices.resourceAllocation) === null || _b === void 0 ? void 0 : _b.cleanup)) return [3 /*break*/, 5];
                    return [4 /*yield*/, orchestrationServices.resourceAllocation.cleanup()];
                case 4:
                    _d.sent();
                    _d.label = 5;
                case 5:
                    if (!((_c = orchestrationServices.parallelExecution) === null || _c === void 0 ? void 0 : _c.cleanup)) return [3 /*break*/, 7];
                    return [4 /*yield*/, orchestrationServices.parallelExecution.cleanup()];
                case 6:
                    _d.sent();
                    _d.label = 7;
                case 7:
                    console.log('✅ Services cleaned up');
                    if (!db.close) return [3 /*break*/, 9];
                    return [4 /*yield*/, db.close()];
                case 8:
                    _d.sent();
                    console.log('✅ Legacy database connection closed');
                    _d.label = 9;
                case 9: return [4 /*yield*/, prisma_database_1.prismaDb.cleanup()];
                case 10:
                    _d.sent();
                    console.log('✅ Prisma database connection closed');
                    console.log('🎉 Graceful shutdown complete');
                    process.exit(0);
                    return [3 /*break*/, 12];
                case 11:
                    error_2 = _d.sent();
                    console.error('❌ Error during shutdown:', error_2);
                    process.exit(1);
                    return [3 /*break*/, 12];
                case 12: return [2 /*return*/];
            }
        });
    });
}
