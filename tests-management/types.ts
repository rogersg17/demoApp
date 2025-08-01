// Type definitions for test management application

export interface Test {
  id: number;
  name: string;
  file: string;
  suite: string;
  status: TestStatus;
  duration: string;
  lastRun: string | null;
  tags: string[];
}

export type TestStatus = 'not-run' | 'passed' | 'failed' | 'skipped' | 'running';

export interface TestResults {
  totalTests: number;
  passingTests: number;
  failingTests: number;
  lastRun: string | null;
  tests?: Test[];
}

export interface ExecutionResults {
  passed: number;
  failed: number;
  total: number;
  skipped?: number;
}

export interface TestExecution {
  id: string;
  status: ExecutionStatus;
  startTime: Date;
  endTime?: Date;
  results?: PlaywrightResults;
  stdout?: string;
  stderr?: string;
  error?: string;
}

export type ExecutionStatus = 'running' | 'completed' | 'failed';

export interface PlaywrightResults {
  total: number;
  passed: number;
  failed: number;
  skipped?: number;
  duration?: string;
  tests?: PlaywrightTestResult[];
}

export interface PlaywrightTestResult {
  title: string;
  status: 'passed' | 'failed' | 'skipped';
  duration?: number;
  error?: string;
}

export interface TestFile {
  name: string;
  suite: string;
  tags?: string[];
}

export interface NotificationConfig {
  message: string;
  type?: NotificationType;
}

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface FilterConfig {
  statusFilter: string;
  suiteFilter: string;
  searchTerm: string;
}

export interface UIElements {
  statusFilter: HTMLSelectElement;
  suiteFilter: HTMLSelectElement;
  searchInput: HTMLInputElement;
  runAllTestsBtn: HTMLButtonElement;
  runSelectedTestsBtn: HTMLButtonElement;
  selectAllTests: HTMLInputElement;
  refreshBtn: HTMLButtonElement;
  testTableBody: HTMLTableSectionElement;
  totalTests: HTMLElement;
  passingTests: HTMLElement;
  failingTests: HTMLElement;
  lastRun: HTMLElement;
  testProgress: HTMLElement;
  progressText: HTMLElement;
  progressTime: HTMLElement;
  progressFill: HTMLElement;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface TestRunRequest {
  testFiles: string[];
  suite: string;
  grep?: string;
}

export interface TestRunResponse {
  executionId: string;
  message?: string;
}

// Global state interface
export interface TestManagerState {
  allTests: Test[];
  currentTests: Test[];
  testResults: TestResults | null;
  currentExecutionTestIds: string[];
  latestExecutionResults: ExecutionResults;
  isRunning: boolean;
  ui: Partial<UIElements>;
  executionStartTime: string | null;
  pollCount: number;
  refreshInterval: number | null;
}

// Utility type for DOM element queries
export type ElementQuery<T extends HTMLElement = HTMLElement> = T | null;

// Type guards
export function isTestStatus(value: string): value is TestStatus {
  return ['not-run', 'passed', 'failed', 'skipped', 'running'].includes(value);
}

export function isNotificationType(value: string): value is NotificationType {
  return ['info', 'success', 'warning', 'error'].includes(value);
}

export function isExecutionStatus(value: string): value is ExecutionStatus {
  return ['running', 'completed', 'failed'].includes(value);
}

// Utility types for error handling
export interface TestManagerError extends Error {
  code?: string;
  details?: Record<string, any>;
}

export class TestExecutionError extends Error implements TestManagerError {
  code: string;
  details?: Record<string, any>;

  constructor(message: string, code: string = 'EXECUTION_ERROR', details?: Record<string, any>) {
    super(message);
    this.name = 'TestExecutionError';
    this.code = code;
    this.details = details;
  }
}

export class ApiError extends Error implements TestManagerError {
  code: string;
  status?: number;
  details?: Record<string, any>;

  constructor(message: string, status?: number, code: string = 'API_ERROR', details?: Record<string, any>) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}
