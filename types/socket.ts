// Socket.IO Type Definitions
import { Server as SocketIOServer, Socket } from 'socket.io';
import { User, ExecutionUpdate, RunnerHealthUpdate, TestExecution, TestRunner } from './api';

// Server-to-Client Events
export interface ServerToClientEvents {
  // Execution Events
  'execution:update': (data: ExecutionUpdate) => void;
  'execution:started': (data: { execution_id: string; runner_id: number; timestamp: string }) => void;
  'execution:completed': (data: { execution_id: string; status: string; results: any; timestamp: string }) => void;
  'execution:failed': (data: { execution_id: string; error: string; timestamp: string }) => void;
  'execution:cancelled': (data: { execution_id: string; timestamp: string }) => void;
  
  // Queue Events
  'queue:updated': (data: { total_queued: number; running: number; timestamp: string }) => void;
  'queue:item:added': (data: { execution: TestExecution; position: number; timestamp: string }) => void;
  'queue:item:assigned': (data: { execution_id: string; runner_id: number; timestamp: string }) => void;
  
  // Runner Events
  'runner:health:update': (data: RunnerHealthUpdate) => void;
  'runner:status:changed': (data: { runner_id: number; status: string; timestamp: string }) => void;
  'runner:registered': (data: { runner: TestRunner; timestamp: string }) => void;
  'runner:removed': (data: { runner_id: number; timestamp: string }) => void;
  
  // System Events
  'system:metrics:update': (data: { metrics: any; timestamp: string }) => void;
  'system:alert': (data: { level: 'info' | 'warning' | 'error'; message: string; timestamp: string }) => void;
  
  // Dashboard Events
  'dashboard:refresh': (data: { metrics: any; timestamp: string }) => void;
  
  // Connection Events
  'connection:established': (data: { message: string; timestamp: string }) => void;
  'error': (data: { error: string; timestamp: string }) => void;
}

// Client-to-Server Events
export interface ClientToServerEvents {
  // Subscription Events
  'subscribe:executions': (callback?: (response: { success: boolean; message?: string }) => void) => void;
  'subscribe:runners': (callback?: (response: { success: boolean; message?: string }) => void) => void;
  'subscribe:queue': (callback?: (response: { success: boolean; message?: string }) => void) => void;
  'subscribe:dashboard': (callback?: (response: { success: boolean; message?: string }) => void) => void;
  
  'unsubscribe:executions': (callback?: (response: { success: boolean; message?: string }) => void) => void;
  'unsubscribe:runners': (callback?: (response: { success: boolean; message?: string }) => void) => void;
  'unsubscribe:queue': (callback?: (response: { success: boolean; message?: string }) => void) => void;
  'unsubscribe:dashboard': (callback?: (response: { success: boolean; message?: string }) => void) => void;
  
  // Request Events
  'get:execution:status': (executionId: string, callback: (data: any) => void) => void;
  'get:runner:status': (runnerId: number, callback: (data: any) => void) => void;
  'get:queue:status': (callback: (data: any) => void) => void;
  'get:system:metrics': (callback: (data: any) => void) => void;
  
  // Control Events
  'cancel:execution': (executionId: string, callback: (response: { success: boolean; message?: string }) => void) => void;
  'pause:runner': (runnerId: number, callback: (response: { success: boolean; message?: string }) => void) => void;
  'resume:runner': (runnerId: number, callback: (response: { success: boolean; message?: string }) => void) => void;
  
  // Authentication Events
  'authenticate': (token: string, callback: (response: { success: boolean; user?: User; message?: string }) => void) => void;
  'ping': (callback: (response: string) => void) => void;
}

// Inter-server Events (for clustering)
export interface InterServerEvents {
  'execution:broadcast': (data: ExecutionUpdate) => void;
  'runner:broadcast': (data: RunnerHealthUpdate) => void;
  'system:broadcast': (data: any) => void;
}

// Socket Data (attached to each socket)
export interface SocketData {
  userId?: number;
  username?: string;
  authenticated: boolean;
  subscriptions: Set<string>;
  joinedAt: string;
  lastActivity: string;
}

// Typed Socket
export type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

// Typed Server
export type TypedServer = SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

// WebSocket Manager Interface
export interface WebSocketManager {
  server: TypedServer;
  
  // Connection Management
  handleConnection(socket: TypedSocket): void;
  handleDisconnection(socket: TypedSocket): void;
  
  // Broadcast Methods
  broadcastExecutionUpdate(update: ExecutionUpdate): void;
  broadcastRunnerHealth(update: RunnerHealthUpdate): void;
  broadcastQueueUpdate(data: any): void;
  broadcastSystemMetrics(metrics: any): void;
  broadcastSystemAlert(level: 'info' | 'warning' | 'error', message: string): void;
  
  // Room Management
  joinRoom(socket: TypedSocket, room: string): void;
  leaveRoom(socket: TypedSocket, room: string): void;
  broadcastToRoom(room: string, event: keyof ServerToClientEvents, data: any): void;
  
  // Authentication
  authenticateSocket(socket: TypedSocket, token: string): Promise<boolean>;
  
  // Statistics
  getConnectionStats(): {
    totalConnections: number;
    authenticatedConnections: number;
    subscriptionCounts: Record<string, number>;
  };
}

// WebSocket Event Types
export type WebSocketEventType = 
  | 'execution:update'
  | 'execution:started'
  | 'execution:completed'
  | 'execution:failed'
  | 'execution:cancelled'
  | 'queue:updated'
  | 'queue:item:added'
  | 'queue:item:assigned'
  | 'runner:health:update'
  | 'runner:status:changed'
  | 'runner:registered'
  | 'runner:removed'
  | 'system:metrics:update'
  | 'system:alert'
  | 'dashboard:refresh';

// WebSocket Room Types
export type WebSocketRoom = 
  | 'executions'
  | 'runners'
  | 'queue'
  | 'dashboard'
  | 'system'
  | `execution:${string}`
  | `runner:${number}`;

// WebSocket Message Interface
export interface WebSocketMessage<T = any> {
  type: WebSocketEventType;
  data: T;
  timestamp: string;
  room?: WebSocketRoom;
  userId?: number;
}