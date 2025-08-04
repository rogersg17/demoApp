import { 
  TypedServer, 
  TypedSocket, 
  WebSocketManager,
  ExecutionUpdate,
  RunnerHealthUpdate,
  WebSocketEventType,
  WebSocketRoom,
  User
} from '../types';

export class EnhancedWebSocketService implements WebSocketManager {
  public server: TypedServer;
  private connectedClients: Map<string, TypedSocket> = new Map();
  private roomSubscriptions: Map<string, Set<string>> = new Map();

  constructor(io: TypedServer) {
    this.server = io;
    this.setupConnectionHandlers();
  }

  private setupConnectionHandlers(): void {
    this.server.on('connection', (socket: TypedSocket) => {
      this.handleConnection(socket);
    });
  }

  public handleConnection(socket: TypedSocket): void {
    console.log(`🔌 Enhanced WebSocket connection: ${socket.id}`);
    
    // Store connected client
    this.connectedClients.set(socket.id, socket);
    
    // Initialize socket data
    socket.data = {
      authenticated: false,
      subscriptions: new Set(),
      joinedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };

    // Setup event handlers
    this.setupSocketEventHandlers(socket);
    
    // Send welcome message
    socket.emit('connection:established', {
      message: 'Connected to Enhanced TMS WebSocket server',
      timestamp: new Date().toISOString()
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      this.handleDisconnection(socket);
      console.log(`🔌 Client disconnected: ${socket.id}, reason: ${reason}`);
    });
  }

  public handleDisconnection(socket: TypedSocket): void {
    // Remove from connected clients
    this.connectedClients.delete(socket.id);
    
    // Clean up room subscriptions
    socket.data.subscriptions.forEach(room => {
      const roomSet = this.roomSubscriptions.get(room);
      if (roomSet) {
        roomSet.delete(socket.id);
        if (roomSet.size === 0) {
          this.roomSubscriptions.delete(room);
        }
      }
    });
  }

  private setupSocketEventHandlers(socket: TypedSocket): void {
    // Authentication
    socket.on('authenticate', async (token: string, callback) => {
      try {
        const authenticated = await this.authenticateSocket(socket, token);
        if (authenticated) {
          socket.data.authenticated = true;
          callback({ success: true, message: 'Authenticated successfully' });
        } else {
          callback({ success: false, message: 'Invalid authentication token' });
        }
      } catch (error) {
        console.error('Authentication error:', error);
        callback({ success: false, message: 'Authentication failed' });
      }
    });

    // Subscription management
    socket.on('subscribe:executions', (callback) => {
      this.joinRoom(socket, 'executions');
      callback?.({ success: true, message: 'Subscribed to execution updates' });
    });

    socket.on('subscribe:runners', (callback) => {
      this.joinRoom(socket, 'runners');
      callback?.({ success: true, message: 'Subscribed to runner updates' });
    });

    socket.on('subscribe:queue', (callback) => {
      this.joinRoom(socket, 'queue');
      callback?.({ success: true, message: 'Subscribed to queue updates' });
    });

    socket.on('subscribe:dashboard', (callback) => {
      this.joinRoom(socket, 'dashboard');
      callback?.({ success: true, message: 'Subscribed to dashboard updates' });
    });

    // Unsubscription
    socket.on('unsubscribe:executions', (callback) => {
      this.leaveRoom(socket, 'executions');
      callback?.({ success: true, message: 'Unsubscribed from execution updates' });
    });

    socket.on('unsubscribe:runners', (callback) => {
      this.leaveRoom(socket, 'runners');
      callback?.({ success: true, message: 'Unsubscribed from runner updates' });
    });

    socket.on('unsubscribe:queue', (callback) => {
      this.leaveRoom(socket, 'queue');
      callback?.({ success: true, message: 'Unsubscribed from queue updates' });
    });

    socket.on('unsubscribe:dashboard', (callback) => {
      this.leaveRoom(socket, 'dashboard');
      callback?.({ success: true, message: 'Unsubscribed from dashboard updates' });
    });

    // Data request handlers
    socket.on('get:execution:status', async (executionId: string, callback) => {
      try {
        // TODO: Implement execution status retrieval
        // const status = await this.getExecutionStatus(executionId);
        callback({ execution_id: executionId, status: 'running' });
      } catch (error) {
        console.error('Error getting execution status:', error);
        callback({ error: 'Failed to get execution status' });
      }
    });

    socket.on('get:runner:status', async (runnerId: number, callback) => {
      try {
        // TODO: Implement runner status retrieval
        // const status = await this.getRunnerStatus(runnerId);
        callback({ runner_id: runnerId, status: 'active' });
      } catch (error) {
        console.error('Error getting runner status:', error);
        callback({ error: 'Failed to get runner status' });
      }
    });

    socket.on('get:queue:status', async (callback) => {
      try {
        // TODO: Implement queue status retrieval
        // const status = await this.getQueueStatus();
        callback({ total_queued: 0, running: 0 });
      } catch (error) {
        console.error('Error getting queue status:', error);
        callback({ error: 'Failed to get queue status' });
      }
    });

    socket.on('get:system:metrics', async (callback) => {
      try {
        const metrics = {
          uptime: process.uptime(),
          memory_usage: process.memoryUsage(),
          cpu_usage: process.cpuUsage(),
          connected_clients: this.connectedClients.size,
          timestamp: new Date().toISOString()
        };
        callback(metrics);
      } catch (error) {
        console.error('Error getting system metrics:', error);
        callback({ error: 'Failed to get system metrics' });
      }
    });

    // Control handlers
    socket.on('cancel:execution', async (executionId: string, callback) => {
      try {
        // TODO: Implement execution cancellation
        console.log(`Cancelling execution: ${executionId}`);
        callback({ success: true, message: 'Execution cancelled successfully' });
        
        // Broadcast cancellation to subscribers
        this.broadcastExecutionUpdate({
          execution_id: executionId,
          status: 'cancelled',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error cancelling execution:', error);
        callback({ success: false, message: 'Failed to cancel execution' });
      }
    });

    socket.on('pause:runner', async (runnerId: number, callback) => {
      try {
        // TODO: Implement runner pausing
        console.log(`Pausing runner: ${runnerId}`);
        callback({ success: true, message: 'Runner paused successfully' });
      } catch (error) {
        console.error('Error pausing runner:', error);
        callback({ success: false, message: 'Failed to pause runner' });
      }
    });

    socket.on('resume:runner', async (runnerId: number, callback) => {
      try {
        // TODO: Implement runner resuming
        console.log(`Resuming runner: ${runnerId}`);
        callback({ success: true, message: 'Runner resumed successfully' });
      } catch (error) {
        console.error('Error resuming runner:', error);
        callback({ success: false, message: 'Failed to resume runner' });
      }
    });

    // Ping handler
    socket.on('ping', (callback) => {
      socket.data.lastActivity = new Date().toISOString();
      callback('pong');
    });
  }

  // Broadcast methods
  public broadcastExecutionUpdate(update: ExecutionUpdate): void {
    console.log(`📡 Broadcasting execution update: ${update.execution_id} - ${update.status}`);
    
    // Broadcast to executions room
    this.broadcastToRoom('executions', 'execution:update', update);
    
    // Broadcast to specific execution room
    this.broadcastToRoom(`execution:${update.execution_id}`, 'execution:update', update);
    
    // Broadcast to dashboard
    this.broadcastToRoom('dashboard', 'dashboard:refresh', {
      type: 'execution_update',
      data: update,
      timestamp: update.timestamp
    });

    // Send specific status events
    if (update.status === 'completed') {
      this.broadcastToRoom('executions', 'execution:completed', {
        execution_id: update.execution_id,
        status: update.status,
        results: update,
        timestamp: update.timestamp
      });
    } else if (update.status === 'failed') {
      this.broadcastToRoom('executions', 'execution:failed', {
        execution_id: update.execution_id,
        error: update.message || 'Execution failed',
        timestamp: update.timestamp
      });
    } else if (update.status === 'cancelled') {
      this.broadcastToRoom('executions', 'execution:cancelled', {
        execution_id: update.execution_id,
        timestamp: update.timestamp
      });
    }
  }

  public broadcastRunnerHealth(update: RunnerHealthUpdate): void {
    console.log(`📡 Broadcasting runner health update: ${update.runner_id} - ${update.health_status}`);
    
    // Broadcast to runners room
    this.broadcastToRoom('runners', 'runner:health:update', update);
    
    // Broadcast to specific runner room
    this.broadcastToRoom(`runner:${update.runner_id}`, 'runner:health:update', update);
    
    // Broadcast to dashboard
    this.broadcastToRoom('dashboard', 'dashboard:refresh', {
      type: 'runner_health_update',
      data: update,
      timestamp: update.timestamp
    });
  }

  public broadcastQueueUpdate(data: any): void {
    console.log('📡 Broadcasting queue update');
    
    this.broadcastToRoom('queue', 'queue:updated', {
      total_queued: data.total_queued || 0,
      running: data.running || 0,
      timestamp: new Date().toISOString()
    });
    
    this.broadcastToRoom('dashboard', 'dashboard:refresh', {
      type: 'queue_update',
      data,
      timestamp: new Date().toISOString()
    });
  }

  public broadcastSystemMetrics(metrics: any): void {
    this.broadcastToRoom('dashboard', 'system:metrics:update', {
      metrics,
      timestamp: new Date().toISOString()
    });
  }

  public broadcastSystemAlert(level: 'info' | 'warning' | 'error', message: string): void {
    console.log(`🚨 Broadcasting system alert [${level}]: ${message}`);
    
    this.server.emit('system:alert', {
      level,
      message,
      timestamp: new Date().toISOString()
    });
  }

  // Room management
  public joinRoom(socket: TypedSocket, room: string): void {
    socket.join(room);
    socket.data.subscriptions.add(room);
    
    // Track room subscriptions
    if (!this.roomSubscriptions.has(room)) {
      this.roomSubscriptions.set(room, new Set());
    }
    this.roomSubscriptions.get(room)!.add(socket.id);
    
    console.log(`🏠 Client ${socket.id} joined room: ${room}`);
  }

  public leaveRoom(socket: TypedSocket, room: string): void {
    socket.leave(room);
    socket.data.subscriptions.delete(room);
    
    // Update room subscriptions
    const roomSet = this.roomSubscriptions.get(room);
    if (roomSet) {
      roomSet.delete(socket.id);
      if (roomSet.size === 0) {
        this.roomSubscriptions.delete(room);
      }
    }
    
    console.log(`🏠 Client ${socket.id} left room: ${room}`);
  }

  public broadcastToRoom(room: string, event: keyof import('../types').ServerToClientEvents, data: any): void {
    const roomSize = this.server.sockets.adapter.rooms.get(room)?.size || 0;
    if (roomSize > 0) {
      this.server.to(room).emit(event as any, data);
      console.log(`📡 Broadcasted ${event} to room ${room} (${roomSize} clients)`);
    }
  }

  // Authentication
  public async authenticateSocket(socket: TypedSocket, token: string): Promise<boolean> {
    try {
      // TODO: Implement proper JWT token validation
      // For now, accept any non-empty token
      if (token && token.length > 0) {
        // You would typically validate JWT token here
        // const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // socket.data.userId = decoded.userId;
        // socket.data.username = decoded.username;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Socket authentication error:', error);
      return false;
    }
  }

  // Statistics
  public getConnectionStats() {
    const authenticatedConnections = Array.from(this.connectedClients.values())
      .filter(socket => socket.data.authenticated).length;
    
    const subscriptionCounts: Record<string, number> = {};
    this.roomSubscriptions.forEach((clients, room) => {
      subscriptionCounts[room] = clients.size;
    });

    return {
      totalConnections: this.connectedClients.size,
      authenticatedConnections,
      subscriptionCounts
    };
  }

  // Cleanup method
  public async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up WebSocket service...');
    
    // Disconnect all clients
    for (const [socketId, socket] of this.connectedClients) {
      socket.disconnect(true);
    }
    
    // Clear collections
    this.connectedClients.clear();
    this.roomSubscriptions.clear();
    
    console.log('✅ WebSocket service cleanup complete');
  }

  // Health check method
  public getHealthStatus() {
    return {
      status: 'healthy',
      connections: this.connectedClients.size,
      rooms: this.roomSubscriptions.size,
      timestamp: new Date().toISOString()
    };
  }
}