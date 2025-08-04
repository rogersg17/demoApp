import { TypedServer, TypedSocket, WebSocketManager, ExecutionUpdate, RunnerHealthUpdate } from '../types';
export declare class EnhancedWebSocketService implements WebSocketManager {
    server: TypedServer;
    private connectedClients;
    private roomSubscriptions;
    constructor(io: TypedServer);
    private setupConnectionHandlers;
    handleConnection(socket: TypedSocket): void;
    handleDisconnection(socket: TypedSocket): void;
    private setupSocketEventHandlers;
    broadcastExecutionUpdate(update: ExecutionUpdate): void;
    broadcastRunnerHealth(update: RunnerHealthUpdate): void;
    broadcastQueueUpdate(data: any): void;
    broadcastSystemMetrics(metrics: any): void;
    broadcastSystemAlert(level: 'info' | 'warning' | 'error', message: string): void;
    joinRoom(socket: TypedSocket, room: string): void;
    leaveRoom(socket: TypedSocket, room: string): void;
    broadcastToRoom(room: string, event: keyof import('../types').ServerToClientEvents, data: any): void;
    authenticateSocket(socket: TypedSocket, token: string): Promise<boolean>;
    getConnectionStats(): {
        totalConnections: number;
        authenticatedConnections: number;
        subscriptionCounts: Record<string, number>;
    };
    cleanup(): Promise<void>;
    getHealthStatus(): {
        status: string;
        connections: number;
        rooms: number;
        timestamp: string;
    };
}
//# sourceMappingURL=enhanced-websocket-service.d.ts.map