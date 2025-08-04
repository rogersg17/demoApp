// Main Types Index - Re-export all types for easy importing
export type {
  ApiResponse,
  ApiError,
  User,
  LoginRequest,
  LoginResponse,
  TestExecution,
  TestResult,
  TestRunner,
  ResourceAllocation,
  ExecutionQueueItem,
  ParallelExecution,
  DashboardMetrics,
  RunnerSummary,
  QueueSummary,
  SystemMetrics,
  ExecutionUpdate,
  RunnerHealthUpdate,
  ServerConfig,
  DatabaseConfig,
  WebhookPayload,
  ParallelWebhookPayload,
  LoadBalancingRule,
  HealthCheckResponse
} from './api';

export type {
  AuthenticatedRequest,
  ApiRequest,
  ApiResponse as TypedApiResponse,
  AsyncMiddleware,
  AuthMiddleware,
  RouteHandler,
  AuthenticatedRouteHandler,
  ErrorHandler,
  SessionData,
  ExecutionParams,
  RunnerParams,
  UserParams
} from './express';

export type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
  TypedSocket,
  TypedServer,
  WebSocketManager,
  WebSocketEventType,
  WebSocketRoom,
  WebSocketMessage as SocketWebSocketMessage
} from './socket';

// Common utility types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type AsyncFunction<T = void, P extends any[] = any[]> = (...args: P) => Promise<T>;
export type Callback<T = void> = (error?: Error | null, result?: T) => void;

// Database related types
export type DatabaseConnection = any; // SQLite3 connection type
export type QueryResult<T = any> = T[];
export type QueryCallback<T = any> = (error: Error | null, result?: T) => void;

// Environment types
export type NodeEnv = 'development' | 'production' | 'test';

// Status types
export type Status = 'active' | 'inactive' | 'error' | 'maintenance';
export type HealthStatus = 'healthy' | 'unhealthy' | 'unknown';
export type ExecutionStatus = 'queued' | 'assigned' | 'running' | 'completed' | 'failed' | 'cancelled';

// Priority levels
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type PriorityNumber = 1 | 2 | 3 | 4 | 5;

// Time-related types
export type Timestamp = string; // ISO string
export type Duration = number; // milliseconds
export type TimeUnit = 'seconds' | 'minutes' | 'hours' | 'days';

// Generic API response wrapper
export type APIResponse<T> = {
  success: true;
  data: T;
  message?: string;
} | {
  success: false;
  error: string;
  details?: string;
};

// Configuration validation types
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// Pagination types
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Filter and sort types
export interface FilterParams {
  [key: string]: string | number | boolean | string[] | number[];
}

export interface SortParams {
  field: string;
  order: 'asc' | 'desc';
}

// Event emitter types
export interface EventData {
  [key: string]: any;
}

export type EventListener<T = EventData> = (data: T) => void | Promise<void>;

// Logger types
export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Timestamp;
  context?: Record<string, any>;
  error?: Error;
}

// Cache types
export interface CacheOptions {
  ttl?: number; // time to live in seconds
  max?: number; // maximum number of items
}

export type CacheKey = string;
export type CacheValue = any;

// Service interfaces
export interface Service {
  name: string;
  initialized: boolean;
  initialize(): Promise<void>;
  cleanup(): Promise<void>;
}

// Plugin/Extension types
export interface Plugin {
  name: string;
  version: string;
  enabled: boolean;
  install(): Promise<void>;
  uninstall(): Promise<void>;
}

// Metrics and monitoring types
export interface Metric {
  name: string;
  value: number;
  unit?: string;
  timestamp: Timestamp;
  labels?: Record<string, string>;
}

export interface Alert {
  id: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: Timestamp;
  resolved: boolean;
  resolvedAt?: Timestamp;
}