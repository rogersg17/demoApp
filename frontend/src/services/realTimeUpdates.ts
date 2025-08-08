import { io, Socket } from 'socket.io-client';
import type { StatusUpdate } from '../components/notifications/StatusNotification';
import type { ProgressStatus } from '../components/progress/ProgressIndicator';

export interface RealTimeUpdate {
  type: 'test_started' | 'test_completed' | 'test_failed' | 'build_started' | 'build_progress' | 'build_completed' | 'deployment_started' | 'deployment_progress' | 'deployment_completed' | 'system_status' | 'user_action';
  data: any;
  timestamp: string;
  source?: string;
}

export interface TestProgressUpdate {
  testId: string;
  testName: string;
  status: ProgressStatus;
  progress?: number;
  message?: string;
  duration?: number;
  results?: {
    passed: number;
    failed: number;
    skipped: number;
    total: number;
  };
}

export interface BuildProgressUpdate {
  buildId: string;
  projectName: string;
  status: ProgressStatus;
  progress: number;
  stage: string;
  message?: string;
  duration?: number;
  logs?: string[];
}

export interface DeploymentProgressUpdate {
  deploymentId: string;
  environment: string;
  status: ProgressStatus;
  progress: number;
  stage: string;
  message?: string;
  duration?: number;
  url?: string;
}

export interface SystemStatusUpdate {
  component: string;
  status: 'healthy' | 'warning' | 'error' | 'maintenance';
  message?: string;
  metrics?: Record<string, number>;
}

export class RealTimeUpdateService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private statusUpdateCallbacks: Set<(update: StatusUpdate) => void> = new Set();

  private url?: string;

  constructor(url?: string) {
    this.url = url;
    this.connect();
  }

  private connect() {
    try {
      this.socket = io(this.url || window.location.origin, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        forceNew: true,
      });

      this.socket.on('connect', () => {
        console.log('Real-time updates connected');
        this.reconnectAttempts = 0;
        this.notifyStatusUpdate({
          type: 'success',
          title: 'Connected to real-time updates',
          message: 'You will now receive live progress updates',
          autoHide: true
        });
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Real-time updates disconnected:', reason);
        this.notifyStatusUpdate({
          type: 'warning',
          title: 'Real-time updates disconnected',
          message: 'Attempting to reconnect...',
          autoHide: false
        });
        this.handleReconnect();
      });

      this.socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        this.handleReconnect();
      });

      // Set up event listeners
      this.setupEventListeners();

    } catch (error) {
      console.error('Failed to connect to real-time updates:', error);
      this.handleReconnect();
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      setTimeout(() => {
        console.log(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
        this.connect();
      }, delay);
    } else {
      this.notifyStatusUpdate({
        type: 'error',
        title: 'Connection failed',
        message: 'Unable to connect to real-time updates. Please refresh the page.',
        persistent: true
      });
    }
  }

  private setupEventListeners() {
    if (!this.socket) return;

    // Test execution events
    this.socket.on('test:started', (data: TestProgressUpdate) => {
      this.notifyStatusUpdate({
        type: 'progress',
        title: `Test Started: ${data.testName}`,
        message: 'Test execution in progress...',
        progress: 0,
        status: 'running'
      });
      this.emit('test:started', data);
    });

    this.socket.on('test:progress', (data: TestProgressUpdate) => {
      this.notifyStatusUpdate({
        type: 'progress',
        title: `Running: ${data.testName}`,
        message: data.message,
        progress: data.progress,
        status: data.status
      });
      this.emit('test:progress', data);
    });

    this.socket.on('test:completed', (data: TestProgressUpdate) => {
      const success = data.status === 'completed';
      this.notifyStatusUpdate({
        type: success ? 'success' : 'error',
        title: `Test ${success ? 'Passed' : 'Failed'}: ${data.testName}`,
        message: data.message,
        duration: data.duration,
        details: data.results ? [
          `Passed: ${data.results.passed}`,
          `Failed: ${data.results.failed}`,
          `Skipped: ${data.results.skipped}`,
          `Total: ${data.results.total}`
        ] : undefined
      });
      this.emit('test:completed', data);
    });

    // Build events
    this.socket.on('build:started', (data: BuildProgressUpdate) => {
      this.notifyStatusUpdate({
        type: 'progress',
        title: `Build Started: ${data.projectName}`,
        message: `Starting ${data.stage}...`,
        progress: 0,
        status: 'running'
      });
      this.emit('build:started', data);
    });

    this.socket.on('build:progress', (data: BuildProgressUpdate) => {
      this.notifyStatusUpdate({
        type: 'progress',
        title: `Building: ${data.projectName}`,
        message: `${data.stage}: ${data.message}`,
        progress: data.progress,
        status: data.status
      });
      this.emit('build:progress', data);
    });

    this.socket.on('build:completed', (data: BuildProgressUpdate) => {
      const success = data.status === 'completed';
      this.notifyStatusUpdate({
        type: success ? 'success' : 'error',
        title: `Build ${success ? 'Successful' : 'Failed'}: ${data.projectName}`,
        message: data.message,
        duration: data.duration,
        details: data.logs?.slice(-3) // Show last 3 log lines
      });
      this.emit('build:completed', data);
    });

    // Deployment events
    this.socket.on('deployment:started', (data: DeploymentProgressUpdate) => {
      this.notifyStatusUpdate({
        type: 'progress',
        title: `Deployment Started`,
        message: `Deploying to ${data.environment}...`,
        progress: 0,
        status: 'running'
      });
      this.emit('deployment:started', data);
    });

    this.socket.on('deployment:progress', (data: DeploymentProgressUpdate) => {
      this.notifyStatusUpdate({
        type: 'progress',
        title: `Deploying to ${data.environment}`,
        message: `${data.stage}: ${data.message}`,
        progress: data.progress,
        status: data.status
      });
      this.emit('deployment:progress', data);
    });

    this.socket.on('deployment:completed', (data: DeploymentProgressUpdate) => {
      const success = data.status === 'completed';
      this.notifyStatusUpdate({
        type: success ? 'success' : 'error',
        title: `Deployment ${success ? 'Successful' : 'Failed'}`,
        message: success ? `Successfully deployed to ${data.environment}` : data.message,
        duration: data.duration,
        actions: success && data.url ? [{
          label: 'View Deployment',
          action: () => window.open(data.url, '_blank'),
          variant: 'contained'
        }] : undefined
      });
      this.emit('deployment:completed', data);
    });

    // System status events
    this.socket.on('system:status', (data: SystemStatusUpdate) => {
      if (data.status === 'error') {
        this.notifyStatusUpdate({
          type: 'error',
          title: `System Alert: ${data.component}`,
          message: data.message,
          persistent: true
        });
      } else if (data.status === 'warning') {
        this.notifyStatusUpdate({
          type: 'warning',
          title: `${data.component} Warning`,
          message: data.message
        });
      }
      this.emit('system:status', data);
    });

    // Generic real-time updates
    this.socket.on('realtime:update', (data: RealTimeUpdate) => {
      this.emit('realtime:update', data);
    });
  }

  // Event subscription methods
  public on(event: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        eventListeners.delete(callback);
        if (eventListeners.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  private emit(event: string, data: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Status update notification methods
  public onStatusUpdate(callback: (update: StatusUpdate) => void): () => void {
    this.statusUpdateCallbacks.add(callback);
    return () => {
      this.statusUpdateCallbacks.delete(callback);
    };
  }

  private notifyStatusUpdate(update: Omit<StatusUpdate, 'id' | 'timestamp'>) {
    const fullUpdate: StatusUpdate = {
      ...update,
      id: `rt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    this.statusUpdateCallbacks.forEach(callback => {
      try {
        callback(fullUpdate);
      } catch (error) {
        console.error('Error in status update callback:', error);
      }
    });
  }

  // Manual trigger methods (for testing/demo purposes)
  public triggerTestExecution(testName: string) {
    if (this.socket?.connected) {
      this.socket.emit('trigger:test', { testName });
    }
  }

  public triggerBuild(projectName: string) {
    if (this.socket?.connected) {
      this.socket.emit('trigger:build', { projectName });
    }
  }

  public triggerDeployment(environment: string) {
    if (this.socket?.connected) {
      this.socket.emit('trigger:deployment', { environment });
    }
  }

  // Connection management
  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
    this.statusUpdateCallbacks.clear();
  }

  public reconnect() {
    this.disconnect();
    this.reconnectAttempts = 0;
    this.connect();
  }
}

// Singleton instance
export const realTimeUpdates = new RealTimeUpdateService();
export default realTimeUpdates;