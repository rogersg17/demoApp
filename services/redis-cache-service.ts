/**
 * Redis Cache Service for Test Results
 * Week 15-16: Performance & Scalability
 * 
 * Provides high-performance caching for:
 * - Test execution results
 * - Test metrics and analytics
 * - Orchestration queue data
 * - Real-time status updates
 */

import { createClient, RedisClientOptions } from 'redis';
import { EventEmitter } from 'events';

interface TestResult {
  executionId: string;
  status: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  timestamp: Date;
  metadata?: any;
}

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  compress?: boolean;
}

class RedisCacheService extends EventEmitter {
  private client: any;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  constructor() {
    super();
    const redisOptions: RedisClientOptions = {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries: number) => {
          if (retries > this.maxReconnectAttempts) {
            return new Error('Max reconnect attempts reached');
          }
          return Math.min(retries * 50, 5000);
        }
      }
    };

    this.client = createClient(redisOptions);

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      console.log('✅ Redis client connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connected');
    });

    this.client.on('error', (error: Error) => {
      console.error('❌ Redis client error:', error);
      this.isConnected = false;
      this.emit('error', error);
    });

    this.client.on('end', () => {
      console.log('⚠️ Redis client disconnected');
      this.isConnected = false;
      this.emit('disconnected');
    });

    this.client.on('reconnecting', () => {
      this.reconnectAttempts++;
      console.log(`🔄 Redis reconnecting (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('❌ Max Redis reconnection attempts reached');
        this.emit('maxReconnectAttemptsReached');
      }
    });
  }

  /**
   * Initialize Redis connection
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      await this.client.connect();
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.client.disconnect();
      this.isConnected = false;
    } catch (error) {
      console.error('Error disconnecting from Redis:', error);
    }
  }

  /**
   * Check if Redis is available
   */
  isAvailable(): boolean {
    return this.isConnected;
  }

  /**
   * Cache test execution results
   */
  async cacheTestResult(executionId: string, result: TestResult, options: CacheOptions = {}): Promise<boolean> {
    if (!this.isConnected) {
      console.warn('Redis not connected, skipping cache');
      return false;
    }

    try {
      const key = `test_result:${executionId}`;
      const value = JSON.stringify(result);
      const ttl = options.ttl || 3600; // Default 1 hour

      await this.client.setEx(key, ttl, value);
      
      // Also add to sorted set for chronological access
      await this.client.zAdd('test_results_timeline', {
        score: Date.now(),
        value: executionId
      });

      console.log(`📋 Cached test result: ${executionId}`);
      return true;
    } catch (error) {
      console.error('Error caching test result:', error);
      return false;
    }
  }

  /**
   * Retrieve cached test result
   */
  async getTestResult(executionId: string): Promise<TestResult | null> {
    if (!this.isConnected) {
      return null;
    }

    try {
      const key = `test_result:${executionId}`;
      const value = await this.client.get(key);
      
      if (!value) {
        return null;
      }

      return JSON.parse(value) as TestResult;
    } catch (error) {
      console.error('Error retrieving test result from cache:', error);
      return null;
    }
  }

  /**
   * Cache test metrics and analytics
   */
  async cacheMetrics(key: string, metrics: any, ttl: number = 300): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      const cacheKey = `metrics:${key}`;
      const value = JSON.stringify(metrics);
      
      await this.client.setEx(cacheKey, ttl, value);
      console.log(`📊 Cached metrics: ${key}`);
      return true;
    } catch (error) {
      console.error('Error caching metrics:', error);
      return false;
    }
  }

  /**
   * Retrieve cached metrics
   */
  async getMetrics(key: string): Promise<any | null> {
    if (!this.isConnected) {
      return null;
    }

    try {
      const cacheKey = `metrics:${key}`;
      const value = await this.client.get(cacheKey);
      
      if (!value) {
        return null;
      }

      return JSON.parse(value);
    } catch (error) {
      console.error('Error retrieving metrics from cache:', error);
      return null;
    }
  }

  /**
   * Cache queue status
   */
  async cacheQueueStatus(queueId: string, status: any, ttl: number = 60): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      const key = `queue_status:${queueId}`;
      const value = JSON.stringify(status);
      
      await this.client.setEx(key, ttl, value);
      return true;
    } catch (error) {
      console.error('Error caching queue status:', error);
      return false;
    }
  }

  /**
   * Get recent test results (last N results)
   */
  async getRecentTestResults(limit: number = 50): Promise<TestResult[]> {
    if (!this.isConnected) {
      return [];
    }

    try {
      // Get recent execution IDs from sorted set
      const executionIds = await this.client.zRange('test_results_timeline', 0, limit - 1, { REV: true });
      
      if (executionIds.length === 0) {
        return [];
      }

      // Get the actual results
      const results: TestResult[] = [];
      for (const executionId of executionIds) {
        const result = await this.getTestResult(executionId);
        if (result) {
          results.push(result);
        }
      }

      return results;
    } catch (error) {
      console.error('Error retrieving recent test results:', error);
      return [];
    }
  }

  /**
   * Cache real-time status update
   */
  async cacheStatusUpdate(executionId: string, status: string, metadata?: any): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      const key = `status:${executionId}`;
      const value = JSON.stringify({
        status,
        metadata,
        timestamp: new Date().toISOString()
      });
      
      await this.client.setEx(key, 900, value); // 15 minutes TTL
      
      // Publish to status updates channel
      await this.client.publish('status_updates', JSON.stringify({
        executionId,
        status,
        metadata,
        timestamp: new Date().toISOString()
      }));

      return true;
    } catch (error) {
      console.error('Error caching status update:', error);
      return false;
    }
  }

  /**
   * Subscribe to real-time status updates
   */
  async subscribeToStatusUpdates(callback: (update: any) => void): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }

    try {
      const subscriber = this.client.duplicate();
      await subscriber.connect();
      
      await subscriber.subscribe('status_updates', (message: string) => {
        try {
          const update = JSON.parse(message);
          callback(update);
        } catch (error) {
          console.error('Error parsing status update:', error);
        }
      });
    } catch (error) {
      console.error('Error subscribing to status updates:', error);
      throw error;
    }
  }

  /**
   * Clear expired cache entries
   */
  async clearExpiredEntries(): Promise<number> {
    if (!this.isConnected) {
      return 0;
    }

    try {
      // Remove old entries from timeline (older than 24 hours)
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      const removedCount = await this.client.zRemRangeByScore('test_results_timeline', 0, oneDayAgo);
      
      console.log(`🧹 Cleaned up ${removedCount} expired cache entries`);
      return removedCount;
    } catch (error) {
      console.error('Error clearing expired entries:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<any> {
    if (!this.isConnected) {
      return null;
    }

    try {
      const info = await this.client.info('memory');
      const keyspace = await this.client.info('keyspace');
      
      // Count our specific cache keys
      const testResultKeys = await this.client.keys('test_result:*');
      const metricsKeys = await this.client.keys('metrics:*');
      const statusKeys = await this.client.keys('status:*');
      
      return {
        connected: this.isConnected,
        memoryInfo: info,
        keyspaceInfo: keyspace,
        cachedResults: testResultKeys.length,
        cachedMetrics: metricsKeys.length,
        cachedStatuses: statusKeys.length,
        totalCacheKeys: testResultKeys.length + metricsKeys.length + statusKeys.length
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return null;
    }
  }
}

// Export singleton instance
export const redisCacheService = new RedisCacheService();
export default redisCacheService;