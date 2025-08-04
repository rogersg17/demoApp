/**
 * Performance Monitoring Service
 * Week 15-16: Performance & Scalability
 * 
 * Monitors and tracks:
 * - API response times
 * - Database query performance
 * - Test execution metrics
 * - System resource usage
 * - Real-time performance alerts
 */

import { EventEmitter } from 'events';
import * as os from 'os';
import { performance } from 'perf_hooks';
import redisCacheService from './redis-cache-service';

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags?: Record<string, string>;
}

interface ApiMetrics {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  timestamp: Date;
}

interface DatabaseMetrics {
  query: string;
  executionTime: number;
  resultCount?: number;
  timestamp: Date;
}

interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  timestamp: Date;
}

class PerformanceMonitoringService extends EventEmitter {
  private metrics: PerformanceMetric[] = [];
  private apiMetrics: ApiMetrics[] = [];
  private dbMetrics: DatabaseMetrics[] = [];
  private systemMetrics: SystemMetrics[] = [];
  private maxMetricsHistory = 1000;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private alertThresholds = {
    apiResponseTime: 1000, // 1 second
    dbQueryTime: 500, // 500ms
    cpuUsage: 80, // 80%
    memoryUsage: 85 // 85%
  };

  constructor() {
    super();
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(intervalMs: number = 30000): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(() => {
      this.collectSystemMetrics();
      this.cleanupOldMetrics();
      this.checkAlerts();
    }, intervalMs);

    console.log('🚀 Performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    console.log('⏹️ Performance monitoring stopped');
  }

  /**
   * Record API performance metric
   */
  recordApiMetric(endpoint: string, method: string, responseTime: number, statusCode: number): void {
    const metric: ApiMetrics = {
      endpoint,
      method,
      responseTime,
      statusCode,
      timestamp: new Date()
    };

    this.apiMetrics.push(metric);
    this.trimArray(this.apiMetrics, this.maxMetricsHistory);

    // Cache frequently accessed endpoints
    if (this.isFrequentEndpoint(endpoint)) {
      redisCacheService.cacheMetrics(`api:${endpoint}:${method}`, {
        avgResponseTime: this.getAverageResponseTime(endpoint, method),
        lastResponseTime: responseTime,
        timestamp: new Date()
      }, 300); // 5 minutes TTL
    }

    // Check for performance alerts
    if (responseTime > this.alertThresholds.apiResponseTime) {
      this.emit('apiSlowResponse', {
        endpoint,
        method,
        responseTime,
        threshold: this.alertThresholds.apiResponseTime
      });
    }

    this.emit('apiMetric', metric);
  }

  /**
   * Record database query performance
   */
  recordDatabaseMetric(query: string, executionTime: number, resultCount?: number): void {
    const metric: DatabaseMetrics = {
      query: this.sanitizeQuery(query),
      executionTime,
      resultCount,
      timestamp: new Date()
    };

    this.dbMetrics.push(metric);
    this.trimArray(this.dbMetrics, this.maxMetricsHistory);

    // Check for slow queries
    if (executionTime > this.alertThresholds.dbQueryTime) {
      this.emit('slowQuery', {
        query: metric.query,
        executionTime,
        threshold: this.alertThresholds.dbQueryTime
      });
    }

    this.emit('databaseMetric', metric);
  }

  /**
   * Record custom performance metric
   */
  recordMetric(name: string, value: number, unit: string = 'ms', tags?: Record<string, string>): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date(),
      tags
    };

    this.metrics.push(metric);
    this.trimArray(this.metrics, this.maxMetricsHistory);

    this.emit('customMetric', metric);
  }

  /**
   * Create a timer for measuring execution time
   */
  createTimer(name: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      this.recordMetric(name, duration, 'ms');
      return duration;
    };
  }

  /**
   * Middleware for measuring API response times
   */
  createApiMiddleware() {
    return (req: any, res: any, next: any) => {
      const startTime = performance.now();
      
      res.on('finish', () => {
        const responseTime = performance.now() - startTime;
        this.recordApiMetric(
          req.route?.path || req.path,
          req.method,
          responseTime,
          res.statusCode
        );
      });
      
      next();
    };
  }

  /**
   * Collect system performance metrics
   */
  private collectSystemMetrics(): void {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    // Calculate CPU usage (simplified)
    const cpuUsage = this.calculateCpuUsage(cpus);

    const systemMetric: SystemMetrics = {
      cpuUsage,
      memoryUsage: {
        used: usedMem,
        total: totalMem,
        percentage: (usedMem / totalMem) * 100
      },
      timestamp: new Date()
    };

    this.systemMetrics.push(systemMetric);
    this.trimArray(this.systemMetrics, this.maxMetricsHistory);

    // Cache system metrics
    redisCacheService.cacheMetrics('system:current', systemMetric, 60);

    this.emit('systemMetric', systemMetric);
  }

  /**
   * Calculate CPU usage percentage
   */
  private calculateCpuUsage(cpus: os.CpuInfo[]): number {
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof os.CpuTimes];
      }
      totalIdle += cpu.times.idle;
    });

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    
    return 100 - ~~(100 * idle / total);
  }

  /**
   * Check for performance alerts
   */
  private checkAlerts(): void {
    const latestSystem = this.systemMetrics[this.systemMetrics.length - 1];
    if (!latestSystem) return;

    // CPU usage alert
    if (latestSystem.cpuUsage > this.alertThresholds.cpuUsage) {
      this.emit('highCpuUsage', {
        usage: latestSystem.cpuUsage,
        threshold: this.alertThresholds.cpuUsage
      });
    }

    // Memory usage alert
    if (latestSystem.memoryUsage.percentage > this.alertThresholds.memoryUsage) {
      this.emit('highMemoryUsage', {
        usage: latestSystem.memoryUsage.percentage,
        threshold: this.alertThresholds.memoryUsage
      });
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): any {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Filter recent metrics
    const recentApiMetrics = this.apiMetrics.filter(m => m.timestamp >= oneHourAgo);
    const recentDbMetrics = this.dbMetrics.filter(m => m.timestamp >= oneHourAgo);
    const recentSystemMetrics = this.systemMetrics.filter(m => m.timestamp >= oneHourAgo);

    return {
      api: {
        totalRequests: recentApiMetrics.length,
        averageResponseTime: this.calculateAverage(recentApiMetrics.map(m => m.responseTime)),
        slowRequests: recentApiMetrics.filter(m => m.responseTime > this.alertThresholds.apiResponseTime).length,
        errorRate: recentApiMetrics.filter(m => m.statusCode >= 400).length / recentApiMetrics.length * 100
      },
      database: {
        totalQueries: recentDbMetrics.length,
        averageQueryTime: this.calculateAverage(recentDbMetrics.map(m => m.executionTime)),
        slowQueries: recentDbMetrics.filter(m => m.executionTime > this.alertThresholds.dbQueryTime).length
      },
      system: {
        currentCpuUsage: recentSystemMetrics.length > 0 ? recentSystemMetrics[recentSystemMetrics.length - 1].cpuUsage : 0,
        currentMemoryUsage: recentSystemMetrics.length > 0 ? recentSystemMetrics[recentSystemMetrics.length - 1].memoryUsage.percentage : 0,
        averageCpuUsage: this.calculateAverage(recentSystemMetrics.map(m => m.cpuUsage)),
        averageMemoryUsage: this.calculateAverage(recentSystemMetrics.map(m => m.memoryUsage.percentage))
      },
      timestamps: {
        lastUpdate: now,
        monitoringPeriod: oneHourAgo
      }
    };
  }

  /**
   * Get detailed API metrics
   */
  getApiMetrics(hours: number = 1): any {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const metrics = this.apiMetrics.filter(m => m.timestamp >= cutoff);

    const byEndpoint = metrics.reduce((acc, metric) => {
      const key = `${metric.method} ${metric.endpoint}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(metric);
      return acc;
    }, {} as Record<string, ApiMetrics[]>);

    return Object.entries(byEndpoint).map(([endpoint, metrics]) => ({
      endpoint,
      requestCount: metrics.length,
      averageResponseTime: this.calculateAverage(metrics.map(m => m.responseTime)),
      minResponseTime: Math.min(...metrics.map(m => m.responseTime)),
      maxResponseTime: Math.max(...metrics.map(m => m.responseTime)),
      errorRate: metrics.filter(m => m.statusCode >= 400).length / metrics.length * 100
    }));
  }

  /**
   * Utility methods
   */
  private trimArray<T>(array: T[], maxLength: number): void {
    if (array.length > maxLength) {
      array.splice(0, array.length - maxLength);
    }
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private sanitizeQuery(query: string): string {
    // Remove sensitive data and normalize
    return query.replace(/(['"])[^'"]*\1/g, '?').substring(0, 100);
  }

  private isFrequentEndpoint(endpoint: string): boolean {
    const frequentEndpoints = ['/api/auth/status', '/api/tests/queue/status', '/api/health'];
    return frequentEndpoints.includes(endpoint);
  }

  private getAverageResponseTime(endpoint: string, method: string): number {
    const metrics = this.apiMetrics
      .filter(m => m.endpoint === endpoint && m.method === method)
      .slice(-10); // Last 10 requests
    
    return this.calculateAverage(metrics.map(m => m.responseTime));
  }

  private cleanupOldMetrics(): void {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    this.apiMetrics = this.apiMetrics.filter(m => m.timestamp >= oneDayAgo);
    this.dbMetrics = this.dbMetrics.filter(m => m.timestamp >= oneDayAgo);
    this.systemMetrics = this.systemMetrics.filter(m => m.timestamp >= oneDayAgo);
    this.metrics = this.metrics.filter(m => m.timestamp >= oneDayAgo);
  }

  /**
   * Update alert thresholds
   */
  updateAlertThresholds(thresholds: Partial<typeof this.alertThresholds>): void {
    this.alertThresholds = { ...this.alertThresholds, ...thresholds };
  }

  /**
   * Export metrics for external monitoring systems
   */
  exportMetrics(): any {
    return {
      metrics: this.metrics,
      apiMetrics: this.apiMetrics,
      databaseMetrics: this.dbMetrics,
      systemMetrics: this.systemMetrics,
      stats: this.getPerformanceStats()
    };
  }
}

// Export singleton instance
export const performanceMonitoringService = new PerformanceMonitoringService();
export default performanceMonitoringService;