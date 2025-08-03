const EventEmitter = require('events');

class MVPWebSocketService extends EventEmitter {
    constructor(io) {
        super();
        this.io = io;
        this.debug = process.env.DEBUG_WEBSOCKET === 'true';
        
        // Keep track of connected clients and their subscriptions
        this.connectedClients = new Map(); // socketId -> client info
        this.subscriptions = new Map(); // subscription type -> Set of socket IDs
        
        this.setupEventHandlers();
        this.log('MVP WebSocket service initialized');
    }

    /**
     * Setup event handlers for different types of updates
     */
    setupEventHandlers() {
        // Pipeline monitoring events
        this.on('pipelineStatusChanged', (data) => {
            this.broadcastToSubscribers('pipeline-monitoring', 'pipelineStatusUpdate', data);
        });

        this.on('buildCompleted', (data) => {
            this.broadcastToSubscribers('build-monitoring', 'buildCompleted', data);
            this.broadcastToSubscribers('pipeline-monitoring', 'buildCompleted', data);
        });

        this.on('testFailuresDetected', (data) => {
            this.broadcastToSubscribers('failure-monitoring', 'testFailuresDetected', data);
            this.broadcastToSubscribers('pipeline-monitoring', 'testFailuresDetected', data);
        });

        // JIRA integration events
        this.on('jiraIssueCreated', (data) => {
            this.broadcastToSubscribers('jira-monitoring', 'jiraIssueCreated', data);
            this.broadcastToSubscribers('failure-monitoring', 'jiraIssueCreated', data);
        });

        this.on('jiraIssueUpdated', (data) => {
            this.broadcastToSubscribers('jira-monitoring', 'jiraIssueUpdated', data);
        });

        // Processing events
        this.on('buildProcessingStarted', (data) => {
            this.broadcastToSubscribers('processing-monitoring', 'buildProcessingStarted', data);
        });

        this.on('buildProcessingCompleted', (data) => {
            this.broadcastToSubscribers('processing-monitoring', 'buildProcessingCompleted', data);
        });

        this.on('buildProcessingFailed', (data) => {
            this.broadcastToSubscribers('processing-monitoring', 'buildProcessingFailed', data);
        });

        // Health monitoring events
        this.on('pipelineHealthChanged', (data) => {
            this.broadcastToSubscribers('health-monitoring', 'pipelineHealthChanged', data);
            this.broadcastToSubscribers('pipeline-monitoring', 'pipelineHealthChanged', data);
        });

        // System events
        this.on('monitoringServiceStatusChanged', (data) => {
            this.broadcastToSubscribers('system-monitoring', 'monitoringServiceStatusChanged', data);
            this.broadcastToSubscribers('pipeline-monitoring', 'monitoringServiceStatusChanged', data);
        });
    }

    /**
     * Handle new client connection
     */
    handleConnection(socket) {
        const clientInfo = {
            id: socket.id,
            connectedAt: new Date(),
            subscriptions: new Set(),
            userAgent: socket.handshake.headers['user-agent'],
            ip: socket.handshake.address
        };

        this.connectedClients.set(socket.id, clientInfo);
        this.log(`Client connected: ${socket.id}`);

        // Handle subscription requests
        socket.on('subscribe', (subscriptionType) => {
            this.handleSubscription(socket, subscriptionType);
        });

        socket.on('unsubscribe', (subscriptionType) => {
            this.handleUnsubscription(socket, subscriptionType);
        });

        // Handle specific subscription types
        socket.on('subscribePipelineMonitoring', () => {
            this.handleSubscription(socket, 'pipeline-monitoring');
        });

        socket.on('subscribeFailureMonitoring', () => {
            this.handleSubscription(socket, 'failure-monitoring');
        });

        socket.on('subscribeBuildMonitoring', (data) => {
            const subscriptionType = data.pipelineId 
                ? `build-monitoring-${data.pipelineId}`
                : 'build-monitoring';
            this.handleSubscription(socket, subscriptionType);
        });

        socket.on('subscribeJiraMonitoring', () => {
            this.handleSubscription(socket, 'jira-monitoring');
        });

        socket.on('subscribeProcessingMonitoring', () => {
            this.handleSubscription(socket, 'processing-monitoring');
        });

        socket.on('subscribeHealthMonitoring', () => {
            this.handleSubscription(socket, 'health-monitoring');
        });

        socket.on('subscribeSystemMonitoring', () => {
            this.handleSubscription(socket, 'system-monitoring');
        });

        // Handle status requests
        socket.on('requestPipelineStatus', async () => {
            try {
                const status = await this.getCurrentPipelineStatus();
                socket.emit('pipelineStatusUpdate', status);
            } catch (error) {
                this.error('Failed to get pipeline status:', error);
            }
        });

        socket.on('requestRecentFailures', async (data) => {
            try {
                const failures = await this.getRecentFailures(data);
                socket.emit('recentFailuresUpdate', failures);
            } catch (error) {
                this.error('Failed to get recent failures:', error);
            }
        });

        socket.on('requestHealthSummary', async () => {
            try {
                const health = await this.getHealthSummary();
                socket.emit('healthSummaryUpdate', health);
            } catch (error) {
                this.error('Failed to get health summary:', error);
            }
        });

        // Handle disconnection
        socket.on('disconnect', () => {
            this.handleDisconnection(socket);
        });

        // Send initial connection confirmation
        socket.emit('connected', {
            clientId: socket.id,
            timestamp: new Date().toISOString(),
            availableSubscriptions: [
                'pipeline-monitoring',
                'failure-monitoring', 
                'build-monitoring',
                'jira-monitoring',
                'processing-monitoring',
                'health-monitoring',
                'system-monitoring'
            ]
        });
    }

    /**
     * Handle client subscription to a topic
     */
    handleSubscription(socket, subscriptionType) {
        const clientInfo = this.connectedClients.get(socket.id);
        if (!clientInfo) return;

        // Add to client's subscriptions
        clientInfo.subscriptions.add(subscriptionType);

        // Add to subscription tracking
        if (!this.subscriptions.has(subscriptionType)) {
            this.subscriptions.set(subscriptionType, new Set());
        }
        this.subscriptions.get(subscriptionType).add(socket.id);

        // Join socket room
        socket.join(subscriptionType);

        this.log(`Client ${socket.id} subscribed to ${subscriptionType}`);

        // Send confirmation
        socket.emit('subscribed', {
            subscriptionType: subscriptionType,
            timestamp: new Date().toISOString()
        });

        // Send initial data based on subscription type
        this.sendInitialData(socket, subscriptionType);
    }

    /**
     * Handle client unsubscription from a topic
     */
    handleUnsubscription(socket, subscriptionType) {
        const clientInfo = this.connectedClients.get(socket.id);
        if (!clientInfo) return;

        // Remove from client's subscriptions
        clientInfo.subscriptions.delete(subscriptionType);

        // Remove from subscription tracking
        if (this.subscriptions.has(subscriptionType)) {
            this.subscriptions.get(subscriptionType).delete(socket.id);
        }

        // Leave socket room
        socket.leave(subscriptionType);

        this.log(`Client ${socket.id} unsubscribed from ${subscriptionType}`);

        // Send confirmation
        socket.emit('unsubscribed', {
            subscriptionType: subscriptionType,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Handle client disconnection
     */
    handleDisconnection(socket) {
        const clientInfo = this.connectedClients.get(socket.id);
        if (!clientInfo) return;

        this.log(`Client disconnected: ${socket.id}`);

        // Remove from all subscriptions
        for (const subscriptionType of clientInfo.subscriptions) {
            if (this.subscriptions.has(subscriptionType)) {
                this.subscriptions.get(subscriptionType).delete(socket.id);
            }
        }

        // Remove client info
        this.connectedClients.delete(socket.id);
    }

    /**
     * Broadcast message to all subscribers of a specific type
     */
    broadcastToSubscribers(subscriptionType, eventName, data) {
        this.io.to(subscriptionType).emit(eventName, {
            ...data,
            timestamp: new Date().toISOString(),
            subscriptionType: subscriptionType
        });

        this.log(`Broadcast ${eventName} to ${subscriptionType} subscribers`);
    }

    /**
     * Send message to specific client
     */
    sendToClient(socketId, eventName, data) {
        this.io.to(socketId).emit(eventName, {
            ...data,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Send initial data when client subscribes
     */
    async sendInitialData(socket, subscriptionType) {
        try {
            switch (subscriptionType) {
                case 'pipeline-monitoring':
                    const pipelineStatus = await this.getCurrentPipelineStatus();
                    socket.emit('pipelineStatusUpdate', pipelineStatus);
                    break;

                case 'failure-monitoring':
                    const recentFailures = await this.getRecentFailures({ limit: 10 });
                    socket.emit('recentFailuresUpdate', recentFailures);
                    break;

                case 'health-monitoring':
                    const healthSummary = await this.getHealthSummary();
                    socket.emit('healthSummaryUpdate', healthSummary);
                    break;

                case 'build-monitoring':
                    // Send recent build statuses
                    break;

                default:
                    // No initial data for other subscription types
                    break;
            }
        } catch (error) {
            this.error(`Failed to send initial data for ${subscriptionType}:`, error);
        }
    }

    /**
     * Get current pipeline status (this would integrate with your services)
     */
    async getCurrentPipelineStatus() {
        // This would integrate with your pipeline monitor service
        // For now, return mock data
        return {
            isRunning: true,
            monitoredPipelines: 0,
            pipelines: []
        };
    }

    /**
     * Get recent failures (this would integrate with your services)
     */
    async getRecentFailures(options = {}) {
        // This would integrate with your test failure processor
        // For now, return mock data
        return {
            failures: [],
            total: 0
        };
    }

    /**
     * Get health summary (this would integrate with your services)
     */
    async getHealthSummary() {
        // This would integrate with your configuration service
        // For now, return mock data
        return {
            totalPipelines: 0,
            activePipelines: 0,
            failuresLast24h: 0
        };
    }

    /**
     * Public methods for external services to emit events
     */

    // Pipeline monitoring events
    emitPipelineStatusChanged(data) {
        this.emit('pipelineStatusChanged', data);
    }

    emitBuildCompleted(data) {
        this.emit('buildCompleted', data);
    }

    emitTestFailuresDetected(data) {
        this.emit('testFailuresDetected', data);
    }

    // JIRA events
    emitJiraIssueCreated(data) {
        this.emit('jiraIssueCreated', data);
    }

    emitJiraIssueUpdated(data) {
        this.emit('jiraIssueUpdated', data);
    }

    // Processing events
    emitBuildProcessingStarted(data) {
        this.emit('buildProcessingStarted', data);
    }

    emitBuildProcessingCompleted(data) {
        this.emit('buildProcessingCompleted', data);
    }

    emitBuildProcessingFailed(data) {
        this.emit('buildProcessingFailed', data);
    }

    // Health events
    emitPipelineHealthChanged(data) {
        this.emit('pipelineHealthChanged', data);
    }

    // System events
    emitMonitoringServiceStatusChanged(data) {
        this.emit('monitoringServiceStatusChanged', data);
    }

    /**
     * Get connection statistics
     */
    getConnectionStats() {
        const stats = {
            totalConnections: this.connectedClients.size,
            subscriptions: {},
            connectionsByType: {}
        };

        // Count subscriptions
        for (const [subscriptionType, socketIds] of this.subscriptions) {
            stats.subscriptions[subscriptionType] = socketIds.size;
        }

        // Analyze connections
        for (const [socketId, clientInfo] of this.connectedClients) {
            const userAgent = clientInfo.userAgent || 'unknown';
            let clientType = 'unknown';
            
            if (userAgent.includes('Chrome')) clientType = 'chrome';
            else if (userAgent.includes('Firefox')) clientType = 'firefox';
            else if (userAgent.includes('Safari')) clientType = 'safari';
            else if (userAgent.includes('Edge')) clientType = 'edge';

            stats.connectionsByType[clientType] = (stats.connectionsByType[clientType] || 0) + 1;
        }

        return stats;
    }

    /**
     * Set service dependencies for data retrieval
     */
    setServices(services) {
        this.services = services;
        
        // Override data retrieval methods if services are available
        if (services.pipelineMonitor) {
            this.getCurrentPipelineStatus = async () => {
                return services.pipelineMonitor.getMonitoringStatus();
            };
        }

        if (services.testFailureProcessor) {
            this.getRecentFailures = async (options = {}) => {
                // This would need to be implemented in the test failure processor
                return { failures: [], total: 0 };
            };
        }

        if (services.configService) {
            this.getHealthSummary = async () => {
                return await services.configService.getPipelineHealthSummary();
            };
        }
    }

    /**
     * Log debug information
     */
    log(...args) {
        if (this.debug) {
            console.log('[MVP-WEBSOCKET]', ...args);
        }
    }

    /**
     * Log error information
     */
    error(...args) {
        console.error('[MVP-WEBSOCKET ERROR]', ...args);
    }
}

module.exports = MVPWebSocketService;
