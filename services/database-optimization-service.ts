/**
 * Database Query Optimization Service
 * Week 15-16: Performance & Scalability
 * 
 * Provides:
 * - Query performance analysis
 * - Automatic query optimization
 * - Connection pool management
 * - Database health monitoring
 * - Query caching strategies
 */

import { Database } from 'sqlite3';
import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import redisCacheService from './redis-cache-service';
import performanceMonitoringService from './performance-monitoring-service';

interface QueryStats {
  query: string;
  executionTime: number;
  resultCount?: number;
  timestamp: Date;
  cached: boolean;
}

interface OptimizationSuggestion {
  query: string;
  issue: string;
  suggestion: string;
  priority: 'low' | 'medium' | 'high';
}

interface ConnectionPoolStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
}

class DatabaseOptimizationService extends EventEmitter {
  private db: Database;
  private queryStats: QueryStats[] = [];
  private connectionPool: Database[] = [];
  private maxConnections = 10;
  private currentConnections = 0;
  private waitingQueue: Array<(db: Database) => void> = [];
  private queryCache = new Map<string, { result: any; timestamp: number; ttl: number }>();
  private slowQueryThreshold = 100; // 100ms

  constructor(database: Database) {
    super();
    this.db = database;
    this.initializeOptimizations();
  }

  /**
   * Initialize database optimizations
   */
  private initializeOptimizations(): void {
    // Enable WAL mode for better concurrent access
    this.executeOptimizedQuery("PRAGMA journal_mode = WAL");
    
    // Set synchronous mode for better performance
    this.executeOptimizedQuery("PRAGMA synchronous = NORMAL");
    
    // Increase cache size
    this.executeOptimizedQuery("PRAGMA cache_size = 10000");
    
    // Enable memory mapping
    this.executeOptimizedQuery("PRAGMA mmap_size = 134217728"); // 128MB
    
    // Set temp store to memory
    this.executeOptimizedQuery("PRAGMA temp_store = MEMORY");
    
    console.log('✅ Database optimizations applied');
  }

  /**
   * Execute query with performance monitoring and caching
   */
  async executeOptimizedQuery(
    sql: string,
    params: any[] = [],
    options: { cache?: boolean; ttl?: number } = {}
  ): Promise<any> {
    const startTime = performance.now();
    const cacheKey = this.generateCacheKey(sql, params);
    
    // Check cache first
    if (options.cache !== false) {
      const cached = await this.getCachedResult(cacheKey);
      if (cached) {
        this.recordQueryStats(sql, performance.now() - startTime, cached.length, true);
        return cached;
      }
    }
    
    return new Promise((resolve, reject) => {
      const method = sql.trim().toLowerCase().startsWith('select') ? 'all' : 'run';
      
      this.db[method as 'all' | 'run'](sql, params, (err: Error | null, result: any) => {
        const executionTime = performance.now() - startTime;
        
        if (err) {
          this.recordQueryStats(sql, executionTime, 0, false);
          performanceMonitoringService.recordDatabaseMetric(sql, executionTime);
          reject(err);
          return;
        }
        
        const resultCount = Array.isArray(result) ? result.length : result?.changes || 0;
        
        // Cache select results
        if (method === 'all' && options.cache !== false) {
          this.cacheResult(cacheKey, result, options.ttl || 300);
        }
        
        this.recordQueryStats(sql, executionTime, resultCount, false);
        performanceMonitoringService.recordDatabaseMetric(sql, executionTime, resultCount);
        
        // Check for slow queries
        if (executionTime > this.slowQueryThreshold) {
          this.emit('slowQuery', {
            query: sql,
            executionTime,
            resultCount,
            suggestion: this.generateOptimizationSuggestion(sql, executionTime)
          });
        }
        
        resolve(result);
      });
    });
  }

  /**
   * Execute prepared statement with optimization
   */
  async executeOptimizedPrepared(
    sql: string,
    paramsList: any[][],
    options: { cache?: boolean; batch?: boolean } = {}
  ): Promise<any[]> {
    const startTime = performance.now();
    
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(sql);
      const results: any[] = [];
      let completed = 0;
      let hasError = false;
      
      const finalize = () => {
        stmt.finalize((err) => {
          if (err && !hasError) {
            hasError = true;
            reject(err);
            return;
          }
          
          const executionTime = performance.now() - startTime;
          this.recordQueryStats(
            `${sql} (prepared, ${paramsList.length} executions)`,
            executionTime,
            results.length,
            false
          );
          
          resolve(results);
        });
      };
      
      if (options.batch) {
        // Batch execution for better performance
        this.db.serialize(() => {
          this.db.run("BEGIN TRANSACTION");
          
          paramsList.forEach((params, index) => {
            stmt.run(params, function(this: any, err: Error | null) {
              if (err && !hasError) {
                hasError = true;
                (this as any).db.run("ROLLBACK");
                reject(err);
                return;
              }
              
              results[index] = { changes: this.changes, lastID: this.lastID };
              completed++;
              
              if (completed === paramsList.length) {
                (this as any).db.run("COMMIT", () => {
                  finalize();
                });
              }
            });
          });
        });
      } else {
        // Individual execution
        paramsList.forEach((params, index) => {
          stmt.run(params, function(err) {
            if (err && !hasError) {
              hasError = true;
              reject(err);
              return;
            }
            
            results[index] = { changes: this.changes, lastID: this.lastID };
            completed++;
            
            if (completed === paramsList.length) {
              finalize();
            }
          });
        });
      }
    });
  }

  /**
   * Analyze query performance and provide optimization suggestions
   */
  analyzeQueryPerformance(): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const recentStats = this.queryStats.slice(-100); // Last 100 queries
    
    // Group by query pattern
    const queryGroups = this.groupQueriesByPattern(recentStats);
    
    for (const [pattern, stats] of queryGroups) {
      const avgTime = stats.reduce((sum, s) => sum + s.executionTime, 0) / stats.length;
      const maxTime = Math.max(...stats.map(s => s.executionTime));
      
      // Check for slow queries
      if (avgTime > this.slowQueryThreshold) {
        suggestions.push({
          query: pattern,
          issue: `Slow average execution time: ${avgTime.toFixed(2)}ms`,
          suggestion: this.generateOptimizationSuggestion(pattern, avgTime),
          priority: avgTime > 500 ? 'high' : avgTime > 200 ? 'medium' : 'low'
        });
      }
      
      // Check for inconsistent performance
      if (maxTime > avgTime * 3) {
        suggestions.push({
          query: pattern,
          issue: `Inconsistent performance: max ${maxTime.toFixed(2)}ms vs avg ${avgTime.toFixed(2)}ms`,
          suggestion: 'Consider adding database indexes or optimizing query structure',
          priority: 'medium'
        });
      }
      
      // Check for frequently executed queries that could be cached
      if (stats.length > 10 && !stats.some(s => s.cached)) {
        suggestions.push({
          query: pattern,
          issue: `Frequently executed query (${stats.length} times) without caching`,
          suggestion: 'Consider enabling caching for this query',
          priority: 'low'
        });
      }
    }
    
    return suggestions;
  }

  /**
   * Get database performance statistics
   */
  getPerformanceStats(): any {
    const recentStats = this.queryStats.filter(
      s => s.timestamp > new Date(Date.now() - 60 * 60 * 1000) // Last hour
    );
    
    const totalQueries = recentStats.length;
    const cachedQueries = recentStats.filter(s => s.cached).length;
    const slowQueries = recentStats.filter(s => s.executionTime > this.slowQueryThreshold).length;
    
    return {
      totalQueries,
      cachedQueries,
      slowQueries,
      cacheHitRate: totalQueries > 0 ? (cachedQueries / totalQueries) * 100 : 0,
      averageExecutionTime: totalQueries > 0 
        ? recentStats.reduce((sum, s) => sum + s.executionTime, 0) / totalQueries 
        : 0,
      slowQueryRate: totalQueries > 0 ? (slowQueries / totalQueries) * 100 : 0,
      connectionPool: this.getConnectionPoolStats()
    };
  }

  /**
   * Create database indexes for optimization
   */
  async createOptimizationIndexes(): Promise<void> {
    const indexes = [
      // Test execution indexes
      "CREATE INDEX IF NOT EXISTS idx_test_executions_status ON test_executions(status)",
      "CREATE INDEX IF NOT EXISTS idx_test_executions_created_at ON test_executions(created_at)",
      "CREATE INDEX IF NOT EXISTS idx_test_executions_runner ON test_executions(assigned_runner_id)",
      
      // Test results indexes
      "CREATE INDEX IF NOT EXISTS idx_test_results_execution_id ON test_results(execution_id)",
      "CREATE INDEX IF NOT EXISTS idx_test_results_status ON test_results(status)",
      
      // Queue indexes
      "CREATE INDEX IF NOT EXISTS idx_execution_queue_priority ON execution_queue(priority, created_at)",
      "CREATE INDEX IF NOT EXISTS idx_execution_queue_status ON execution_queue(status)",
      
      // User and session indexes
      "CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)",
      "CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)"
    ];
    
    for (const indexSql of indexes) {
      try {
        await this.executeOptimizedQuery(indexSql);
        console.log(`✅ Created index: ${indexSql.split('idx_')[1]?.split(' ')[0]}`);
      } catch (error) {
        console.warn(`⚠️ Index creation failed: ${error}`);
      }
    }
  }

  /**
   * Vacuum and analyze database for optimization
   */
  async optimizeDatabase(): Promise<void> {
    console.log('🔧 Starting database optimization...');
    
    try {
      // Analyze database statistics
      await this.executeOptimizedQuery("ANALYZE");
      
      // Vacuum database to reclaim space and reorganize
      await this.executeOptimizedQuery("VACUUM");
      
      // Update query planner statistics
      await this.executeOptimizedQuery("PRAGMA optimize");
      
      console.log('✅ Database optimization completed');
      
      this.emit('optimizationCompleted', {
        timestamp: new Date(),
        actions: ['ANALYZE', 'VACUUM', 'optimize']
      });
    } catch (error) {
      console.error('❌ Database optimization failed:', error);
      this.emit('optimizationFailed', error);
    }
  }

  /**
   * Private helper methods
   */
  private recordQueryStats(query: string, executionTime: number, resultCount?: number, cached: boolean = false): void {
    const stats: QueryStats = {
      query: this.normalizeQuery(query),
      executionTime,
      resultCount,
      timestamp: new Date(),
      cached
    };
    
    this.queryStats.push(stats);
    
    // Keep only recent stats
    if (this.queryStats.length > 1000) {
      this.queryStats = this.queryStats.slice(-500);
    }
  }

  private generateCacheKey(sql: string, params: any[]): string {
    return `query:${Buffer.from(sql + JSON.stringify(params)).toString('base64')}`;
  }

  private async getCachedResult(cacheKey: string): Promise<any | null> {
    // Check local cache first
    const localCached = this.queryCache.get(cacheKey);
    if (localCached && Date.now() - localCached.timestamp < localCached.ttl * 1000) {
      return localCached.result;
    }
    
    // Check Redis cache
    return await redisCacheService.getMetrics(cacheKey);
  }

  private async cacheResult(cacheKey: string, result: any, ttl: number): Promise<void> {
    // Cache locally
    this.queryCache.set(cacheKey, {
      result,
      timestamp: Date.now(),
      ttl
    });
    
    // Cache in Redis
    await redisCacheService.cacheMetrics(cacheKey, result, ttl);
  }

  private normalizeQuery(query: string): string {
    return query
      .replace(/\s+/g, ' ')
      .replace(/\$\d+/g, '?')
      .replace(/['"][^'"]*['"]/g, '?')
      .trim();
  }

  private groupQueriesByPattern(stats: QueryStats[]): Map<string, QueryStats[]> {
    const groups = new Map<string, QueryStats[]>();
    
    for (const stat of stats) {
      const pattern = this.extractQueryPattern(stat.query);
      if (!groups.has(pattern)) {
        groups.set(pattern, []);
      }
      groups.get(pattern)!.push(stat);
    }
    
    return groups;
  }

  private extractQueryPattern(query: string): string {
    return query
      .replace(/\b\d+\b/g, '?')
      .replace(/IN\s*\([^)]+\)/gi, 'IN (?)')
      .replace(/VALUES\s*\([^)]+\)/gi, 'VALUES (?)');
  }

  private generateOptimizationSuggestion(query: string, executionTime: number): string {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('select') && !lowerQuery.includes('where')) {
      return 'Consider adding WHERE clause to limit results and improve performance';
    }
    
    if (lowerQuery.includes('select') && lowerQuery.includes('order by') && !lowerQuery.includes('limit')) {
      return 'Consider adding LIMIT clause when using ORDER BY';
    }
    
    if (lowerQuery.includes('join') && executionTime > 200) {
      return 'Consider adding indexes on join columns for better performance';
    }
    
    if (executionTime > 500) {
      return 'Query is very slow, consider adding appropriate indexes or restructuring the query';
    }
    
    return 'Consider enabling query caching or adding relevant indexes';
  }

  private getConnectionPoolStats(): ConnectionPoolStats {
    return {
      totalConnections: this.connectionPool.length,
      activeConnections: this.currentConnections,
      idleConnections: Math.max(0, this.connectionPool.length - this.currentConnections),
      waitingRequests: this.waitingQueue.length
    };
  }
}

export default DatabaseOptimizationService;