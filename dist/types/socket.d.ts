import { Server as SocketIOServer, Socket } from 'socket.io';
import { User, ExecutionUpdate, RunnerHealthUpdate, TestExecution, TestRunner } from './api';
export interface ServerToClientEvents {
    'execution:update': (data: ExecutionUpdate) => void;
    'execution:started': (data: {
        execution_id: string;
        runner_id: number;
        timestamp: string;
    }) => void;
    'execution:completed': (data: {
        execution_id: string;
        status: string;
        results: any;
        timestamp: string;
    }) => void;
    'execution:failed': (data: {
        execution_id: string;
        error: string;
        timestamp: string;
    }) => void;
    'execution:cancelled': (data: {
        execution_id: string;
        timestamp: string;
    }) => void;
    'queue:updated': (data: {
        total_queued: number;
        running: number;
        timestamp: string;
    }) => void;
    'queue:item:added': (data: {
        execution: TestExecution;
        position: number;
        timestamp: string;
    }) => void;
    'queue:item:assigned': (data: {
        execution_id: string;
        runner_id: number;
        timestamp: string;
    }) => void;
    'runner:health:update': (data: RunnerHealthUpdate) => void;
    'runner:status:changed': (data: {
        runner_id: number;
        status: string;
        timestamp: string;
    }) => void;
    'runner:registered': (data: {
        runner: TestRunner;
        timestamp: string;
    }) => void;
    'runner:removed': (data: {
        runner_id: number;
        timestamp: string;
    }) => void;
    'system:metrics:update': (data: {
        metrics: any;
        timestamp: string;
    }) => void;
    'system:alert': (data: {
        level: 'info' | 'warning' | 'error';
        message: string;
        timestamp: string;
    }) => void;
    'dashboard:refresh': (data: {
        metrics: any;
        timestamp: string;
    }) => void;
    'connection:established': (data: {
        message: string;
        timestamp: string;
    }) => void;
    'error': (data: {
        error: string;
        timestamp: string;
    }) => void;
}
export interface ClientToServerEvents {
    'subscribe:executions': (callback?: (response: {
        success: boolean;
        message?: string;
    }) => void) => void;
    'subscribe:runners': (callback?: (response: {
        success: boolean;
        message?: string;
    }) => void) => void;
    'subscribe:queue': (callback?: (response: {
        success: boolean;
        message?: string;
    }) => void) => void;
    'subscribe:dashboard': (callback?: (response: {
        success: boolean;
        message?: string;
    }) => void) => void;
    'unsubscribe:executions': (callback?: (response: {
        success: boolean;
        message?: string;
    }) => void) => void;
    'unsubscribe:runners': (callback?: (response: {
        success: boolean;
        message?: string;
    }) => void) => void;
    'unsubscribe:queue': (callback?: (response: {
        success: boolean;
        message?: string;
    }) => void) => void;
    'unsubscribe:dashboard': (callback?: (response: {
        success: boolean;
        message?: string;
    }) => void) => void;
    'get:execution:status': (executionId: string, callback: (data: any) => void) => void;
    'get:runner:status': (runnerId: number, callback: (data: any) => void) => void;
    'get:queue:status': (callback: (data: any) => void) => void;
    'get:system:metrics': (callback: (data: any) => void) => void;
    'cancel:execution': (executionId: string, callback: (response: {
        success: boolean;
        message?: string;
    }) => void) => void;
    'pause:runner': (runnerId: number, callback: (response: {
        success: boolean;
        message?: string;
    }) => void) => void;
    'resume:runner': (runnerId: number, callback: (response: {
        success: boolean;
        message?: string;
    }) => void) => void;
    'authenticate': (token: string, callback: (response: {
        success: boolean;
        user?: User;
        message?: string;
    }) => void) => void;
    'ping': (callback: (response: string) => void) => void;
}
export interface InterServerEvents {
    'execution:broadcast': (data: ExecutionUpdate) => void;
    'runner:broadcast': (data: RunnerHealthUpdate) => void;
    'system:broadcast': (data: any) => void;
}
export interface SocketData {
    userId?: number;
    username?: string;
    authenticated: boolean;
    subscriptions: Set<string>;
    joinedAt: string;
    lastActivity: string;
}
export type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
export type TypedServer = SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
export interface WebSocketManager {
    server: TypedServer;
    handleConnection(socket: TypedSocket): void;
    handleDisconnection(socket: TypedSocket): void;
    broadcastExecutionUpdate(update: ExecutionUpdate): void;
    broadcastRunnerHealth(update: RunnerHealthUpdate): void;
    broadcastQueueUpdate(data: any): void;
    broadcastSystemMetrics(metrics: any): void;
    broadcastSystemAlert(level: 'info' | 'warning' | 'error', message: string): void;
    joinRoom(socket: TypedSocket, room: string): void;
    leaveRoom(socket: TypedSocket, room: string): void;
    broadcastToRoom(room: string, event: keyof ServerToClientEvents, data: any): void;
    authenticateSocket(socket: TypedSocket, token: string): Promise<boolean>;
    getConnectionStats(): {
        totalConnections: number;
        authenticatedConnections: number;
        subscriptionCounts: Record<string, number>;
    };
}
export type WebSocketEventType = 'execution:update' | 'execution:started' | 'execution:completed' | 'execution:failed' | 'execution:cancelled' | 'queue:updated' | 'queue:item:added' | 'queue:item:assigned' | 'runner:health:update' | 'runner:status:changed' | 'runner:registered' | 'runner:removed' | 'system:metrics:update' | 'system:alert' | 'dashboard:refresh';
export type WebSocketRoom = 'executions' | 'runners' | 'queue' | 'dashboard' | 'system' | `execution:${string}` | `runner:${number}`;
export interface WebSocketMessage<T = any> {
    type: WebSocketEventType;
    data: T;
    timestamp: string;
    room?: WebSocketRoom;
    userId?: number;
}
//# sourceMappingURL=socket.d.ts.map