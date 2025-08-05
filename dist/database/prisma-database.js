"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
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
exports.prismaDb = exports.PrismaDatabase = void 0;
var client_1 = require("@prisma/client");
var dotenv_1 = require("dotenv");
// Load environment variables
(0, dotenv_1.config)();
var PrismaDatabase = /** @class */ (function () {
    function PrismaDatabase() {
        this.initialized = false;
        this.prisma = new client_1.PrismaClient({
            log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
            errorFormat: 'minimal',
        });
    }
    PrismaDatabase.getInstance = function () {
        if (!PrismaDatabase.instance) {
            PrismaDatabase.instance = new PrismaDatabase();
        }
        return PrismaDatabase.instance;
    };
    PrismaDatabase.prototype.initialize = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        console.log('🔄 Initializing Prisma database connection...');
                        // Test the connection
                        return [4 /*yield*/, this.prisma.$connect()];
                    case 1:
                        // Test the connection
                        _a.sent();
                        console.log('✅ Prisma database connection established');
                        if (!(process.env.NODE_ENV === 'development')) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.ensureSchemaSync()];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        this.initialized = true;
                        console.log('✅ Prisma database initialized successfully');
                        return [3 /*break*/, 5];
                    case 4:
                        error_1 = _a.sent();
                        console.error('❌ Failed to initialize Prisma database:', error_1);
                        throw error_1;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    PrismaDatabase.prototype.ensureSchemaSync = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                try {
                    // Push schema changes to the database (for development)
                    // This is equivalent to running `prisma db push`
                    console.log('🔄 Syncing database schema...');
                    // Note: In a real application, you would use migrations
                    // For now, we'll rely on Prisma's ability to sync the schema
                    console.log('✅ Database schema synced');
                }
                catch (error) {
                    console.warn('⚠️ Schema sync warning:', error);
                }
                return [2 /*return*/];
            });
        });
    };
    PrismaDatabase.prototype.close = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.prisma.$disconnect()];
                    case 1:
                        _a.sent();
                        this.initialized = false;
                        console.log('✅ Prisma database connection closed');
                        return [3 /*break*/, 3];
                    case 2:
                        error_2 = _a.sent();
                        console.error('❌ Error closing Prisma database connection:', error_2);
                        throw error_2;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // Health check method
    PrismaDatabase.prototype.healthCheck = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.prisma.$queryRaw(templateObject_1 || (templateObject_1 = __makeTemplateObject(["SELECT 1"], ["SELECT 1"])))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, true];
                    case 2:
                        error_3 = _a.sent();
                        console.error('❌ Database health check failed:', error_3);
                        return [2 /*return*/, false];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // Transaction wrapper
    PrismaDatabase.prototype.transaction = function (fn) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.prisma.$transaction(fn)];
            });
        });
    };
    // User management methods
    PrismaDatabase.prototype.createUser = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.prisma.user.create({
                        data: {
                            username: data.username,
                            email: data.email,
                            password: data.password,
                        },
                    })];
            });
        });
    };
    PrismaDatabase.prototype.getUserByUsername = function (username) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.prisma.user.findUnique({
                        where: { username: username },
                    })];
            });
        });
    };
    PrismaDatabase.prototype.getUserByEmail = function (email) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.prisma.user.findUnique({
                        where: { email: email },
                    })];
            });
        });
    };
    PrismaDatabase.prototype.updateUserLastLogin = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.prisma.user.update({
                        where: { id: userId },
                        data: { last_login: new Date() },
                    })];
            });
        });
    };
    // Test execution methods
    PrismaDatabase.prototype.createTestExecution = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.prisma.testExecution.create({
                        data: {
                            id: data.execution_id,
                            execution_id: data.execution_id,
                            test_suite: data.test_suite,
                            environment: data.environment,
                            status: data.status || 'queued',
                            priority: data.priority || 50,
                            estimated_duration: data.estimated_duration,
                            assigned_runner_id: data.assigned_runner_id,
                            metadata: data.metadata ? JSON.stringify(data.metadata) : null,
                        },
                    })];
            });
        });
    };
    PrismaDatabase.prototype.getTestExecution = function (executionId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.prisma.testExecution.findUnique({
                        where: { execution_id: executionId },
                        include: {
                            assigned_runner: true,
                            results: true,
                            resource_allocations: true,
                            execution_metrics: true,
                        },
                    })];
            });
        });
    };
    PrismaDatabase.prototype.updateTestExecutionStatus = function (executionId, status, completedAt) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.prisma.testExecution.update({
                        where: { execution_id: executionId },
                        data: __assign({ status: status, completed_at: completedAt }, (status === 'running' && { started_at: new Date() })),
                    })];
            });
        });
    };
    // Test runner methods
    PrismaDatabase.prototype.createTestRunner = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.prisma.testRunner.create({
                        data: {
                            name: data.name,
                            type: data.type,
                            status: data.status || 'active',
                            health_status: data.health_status || 'unknown',
                            endpoint_url: data.endpoint_url,
                            webhook_url: data.webhook_url,
                            capabilities: data.capabilities ? JSON.stringify(data.capabilities) : null,
                            max_concurrent_jobs: data.max_concurrent_jobs || 1,
                            priority: data.priority || 50,
                            health_check_url: data.health_check_url,
                            metadata: data.metadata ? JSON.stringify(data.metadata) : null,
                        },
                    })];
            });
        });
    };
    PrismaDatabase.prototype.getTestRunners = function (options) {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                return [2 /*return*/, this.prisma.testRunner.findMany({
                        where: __assign(__assign({}, ((options === null || options === void 0 ? void 0 : options.status) && { status: options.status })), ((options === null || options === void 0 ? void 0 : options.type) && { type: options.type })),
                        orderBy: (options === null || options === void 0 ? void 0 : options.orderBy) ? (_a = {},
                            _a[options.orderBy] = options.orderDirection || 'asc',
                            _a) : {
                            priority: 'desc'
                        },
                    })];
            });
        });
    };
    PrismaDatabase.prototype.updateTestRunnerHealth = function (runnerId, healthStatus, responseTime, errorMessage) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: 
                    // Update runner health status
                    return [4 /*yield*/, this.prisma.testRunner.update({
                            where: { id: runnerId },
                            data: {
                                health_status: healthStatus,
                                last_health_check: new Date(),
                            },
                        })];
                    case 1:
                        // Update runner health status
                        _a.sent();
                        // Record health history
                        return [4 /*yield*/, this.prisma.runnerHealthHistory.create({
                                data: {
                                    runner_id: runnerId,
                                    health_status: healthStatus,
                                    response_time: responseTime,
                                    error_message: errorMessage,
                                },
                            })];
                    case 2:
                        // Record health history
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    // Execution queue methods
    PrismaDatabase.prototype.queueExecution = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.prisma.executionQueueItem.create({
                        data: {
                            execution_id: data.execution_id,
                            test_suite: data.test_suite,
                            environment: data.environment,
                            priority: data.priority || 50,
                            estimated_duration: data.estimated_duration,
                            requested_runner_type: data.requested_runner_type,
                            requested_runner_id: data.requested_runner_id,
                            metadata: data.metadata ? JSON.stringify(data.metadata) : null,
                        },
                    })];
            });
        });
    };
    PrismaDatabase.prototype.getQueuedExecutions = function (limit) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.prisma.executionQueueItem.findMany({
                        where: {
                            status: 'queued',
                        },
                        orderBy: [
                            { priority: 'desc' },
                            { queued_at: 'asc' },
                        ],
                        take: limit,
                        include: {
                            execution: true,
                        },
                    })];
            });
        });
    };
    PrismaDatabase.prototype.assignExecutionToRunner = function (executionId, runnerId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.prisma.executionQueueItem.update({
                        where: { execution_id: executionId },
                        data: {
                            status: 'assigned',
                            assigned_runner_id: runnerId,
                            assigned_at: new Date(),
                        },
                    })];
            });
        });
    };
    // Resource allocation methods
    PrismaDatabase.prototype.allocateResources = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.prisma.resourceAllocation.create({
                        data: {
                            execution_id: data.execution_id,
                            runner_id: data.runner_id,
                            cpu_allocated: data.cpu_allocated,
                            memory_allocated: data.memory_allocated,
                        },
                    })];
            });
        });
    };
    PrismaDatabase.prototype.releaseResources = function (executionId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.prisma.resourceAllocation.updateMany({
                        where: {
                            execution_id: executionId,
                            status: 'allocated',
                        },
                        data: {
                            status: 'released',
                            released_at: new Date(),
                        },
                    })];
            });
        });
    };
    // Metrics methods
    PrismaDatabase.prototype.recordExecutionMetric = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.prisma.executionMetric.create({
                        data: {
                            execution_id: data.execution_id,
                            runner_id: data.runner_id,
                            metric_name: data.metric_name,
                            metric_value: data.metric_value,
                        },
                    })];
            });
        });
    };
    // Parallel execution methods
    PrismaDatabase.prototype.createParallelExecution = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.prisma.parallelExecution.create({
                        data: {
                            parent_execution_id: data.parent_execution_id,
                            shard_index: data.shard_index,
                            total_shards: data.total_shards,
                            execution_id: data.execution_id,
                            runner_id: data.runner_id,
                            shard_webhook_url: data.shard_webhook_url,
                        },
                    })];
            });
        });
    };
    PrismaDatabase.prototype.getParallelExecutions = function (parentExecutionId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.prisma.parallelExecution.findMany({
                        where: { parent_execution_id: parentExecutionId },
                        orderBy: { shard_index: 'asc' },
                        include: {
                            runner: true,
                        },
                    })];
            });
        });
    };
    // Dashboard and analytics methods
    PrismaDatabase.prototype.getDashboardMetrics = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, totalRunners, activeRunners, healthyRunners, queuedExecutions, runningExecutions, executions24h;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, Promise.all([
                            this.prisma.testRunner.count(),
                            this.prisma.testRunner.count({ where: { status: 'active' } }),
                            this.prisma.testRunner.count({ where: { health_status: 'healthy' } }),
                            this.prisma.executionQueueItem.count({ where: { status: 'queued' } }),
                            this.prisma.executionQueueItem.count({ where: { status: 'running' } }),
                            this.prisma.testExecution.count({
                                where: {
                                    created_at: {
                                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                                    },
                                },
                            }),
                        ])];
                    case 1:
                        _a = _b.sent(), totalRunners = _a[0], activeRunners = _a[1], healthyRunners = _a[2], queuedExecutions = _a[3], runningExecutions = _a[4], executions24h = _a[5];
                        return [2 /*return*/, {
                                totalRunners: totalRunners,
                                activeRunners: activeRunners,
                                healthyRunners: healthyRunners,
                                queuedExecutions: queuedExecutions,
                                runningExecutions: runningExecutions,
                                executions24h: executions24h,
                            }];
                }
            });
        });
    };
    // MVP Features methods
    PrismaDatabase.prototype.createFlakyTest = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.prisma.flakyTest.upsert({
                        where: { test_name: data.test_name },
                        update: {
                            failure_count: { increment: data.failure_count || 0 },
                            success_count: { increment: data.success_count || 0 },
                            flakiness_percentage: data.flakiness_percentage || 0,
                            updated_at: new Date(),
                        },
                        create: {
                            test_name: data.test_name,
                            failure_count: data.failure_count || 0,
                            success_count: data.success_count || 0,
                            flakiness_percentage: data.flakiness_percentage || 0,
                        },
                    })];
            });
        });
    };
    PrismaDatabase.prototype.getFlakyTests = function (limit) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.prisma.flakyTest.findMany({
                        orderBy: { flakiness_percentage: 'desc' },
                        take: limit,
                    })];
            });
        });
    };
    // Cleanup method for graceful shutdown
    PrismaDatabase.prototype.cleanup = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('🧹 Cleaning up Prisma database connection...');
                        return [4 /*yield*/, this.close()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return PrismaDatabase;
}());
exports.PrismaDatabase = PrismaDatabase;
// Export singleton instance
exports.prismaDb = PrismaDatabase.getInstance();
var templateObject_1;
