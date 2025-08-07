/**
 * Multi-Platform Dashboard Service (Week 18)
 * -------------------------------------------------------------
 * Provides a unified, read-only aggregation layer combining:
 *  - Azure DevOps pipeline + test failure data (SQLite)
 *  - GitHub Actions workflow run analytics (GitHubApiService)
 *  - (Extensible) Future GitLab / Jenkins sources
 *
 * Key Responsibilities (Initial Week 18 Scope):
 *  1. Unified platform summary (health + recent failures)
 *  2. Cross-platform failure correlation (basic heuristic)
 *  3. Reliability scoring (simple deterministic model – placeholder for AI phase)
 *  4. Real-time update events for dashboard subscribers
 *
 * Design Notes:
 *  - Non-blocking: all external calls guarded & fail-soft
 *  - Caching: lightweight in‑memory cache to avoid excessive queries
 *  - Extensible: add new platform collectors without changing public contract
 */
import { EventEmitter } from 'events';
import type sqlite3 from 'sqlite3';
import GitHubApiService from './github-api-service';

export interface PlatformSummaryItem {
  platform: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  totalExecutions?: number;
  successful?: number;
  failed?: number;
  successRate?: number;
  averageDurationMs?: number;
  recentFailures?: number;
  lastActivity?: string | null;
  details?: Record<string, any>;
}

export interface UnifiedDashboardSummary {
  generatedAt: string;
  platforms: PlatformSummaryItem[];
  aggregate: {
    totalPlatforms: number;
    healthyPlatforms: number;
    totalRecentFailures: number;
    overallSuccessRate?: number;
  };
}

export interface CorrelatedFailure {
  testName: string;
  occurrences: Array<{
    platform: string;
    buildOrRunId: string;
    status: string;
    failureType?: string;
    failureMessage?: string;
    timestamp: string;
    branch?: string;
    url?: string;
  }>;
  reliabilityScore: number; // 0-100 (higher = more reliable)
  failureRate: number; // percentage of failures among observed executions
}

interface CacheEntry<T> { value: T; expiresAt: number; }

export class MultiPlatformDashboardService extends EventEmitter {
  private db: sqlite3.Database;
  private github?: GitHubApiService;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private refreshIntervalMs = 30_000; // 30s
  private timer?: NodeJS.Timeout;
  private initialized = false;

  constructor(db: sqlite3.Database) {
    super();
    this.db = db;
    this.initializeGitHub();
  }

  private initializeGitHub(): void {
    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    if (token && owner && repo) {
      try {
        this.github = new GitHubApiService({ token, owner, repo });
        console.log('✅ Multi-Platform Dashboard: GitHub integration enabled');
      } catch (e) {
        console.warn('⚠️ Failed to initialize GitHub integration for dashboard:', e instanceof Error ? e.message : e);
      }
    } else {
      console.warn('ℹ️ Multi-Platform Dashboard: GitHub environment variables not fully set; skipping GitHub summary');
    }
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.refreshAndEmit();
    this.timer = setInterval(() => this.refreshAndEmit().catch(() => {}), this.refreshIntervalMs);
    this.initialized = true;
  }

  async cleanup(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
  }

  /** PUBLIC API **/
  async getUnifiedSummary(force = false): Promise<UnifiedDashboardSummary> {
    return this.getOrSetCache('unifiedSummary', 15_000, async () => {
      const platformItems: PlatformSummaryItem[] = [];

      // Azure DevOps (from local DB tables)
      const ado = await this.getAdoSummary();
      platformItems.push(ado);

      // GitHub Actions (optional)
      if (this.github) {
        try {
          const gh = await this.getGithubSummary();
          platformItems.push(gh);
        } catch (e) {
          platformItems.push({ platform: 'github_actions', status: 'unhealthy', details: { error: (e as Error).message } });
        }
      }

      const healthy = platformItems.filter(p => p.status === 'healthy').length;
      const totalRecentFailures = platformItems.reduce((acc, p) => acc + (p.recentFailures || 0), 0);
      const successRates = platformItems.filter(p => typeof p.successRate === 'number').map(p => p.successRate as number);
      const overallSuccess = successRates.length ? successRates.reduce((a, b) => a + b, 0) / successRates.length : undefined;

      return {
        generatedAt: new Date().toISOString(),
        platforms: platformItems,
        aggregate: {
          totalPlatforms: platformItems.length,
            healthyPlatforms: healthy,
            totalRecentFailures,
            overallSuccessRate: overallSuccess ? Math.round(overallSuccess * 100) / 100 : undefined
        }
      };
    }, force);
  }

  async correlateTest(testName: string): Promise<CorrelatedFailure | null> {
    if (!testName) return null;
    // Pull ADO failures matching test name (simple LIKE match)
    const adoRows = await this.all<any>(`SELECT id, test_name, failure_type, failure_message, ado_build_id, ado_build_number, created_at, branch_name, ado_build_url FROM mvp_test_failures WHERE test_name LIKE ? ORDER BY created_at DESC LIMIT 25`, [testName]);

    // GitHub: no granular test records yet; placeholder using workflow runs w/ failure conclusion containing testName substring in title (heuristic)
    let ghRuns: any[] = [];
    if (this.github) {
      try {
        const runs = await this.github.getWorkflowRuns({ per_page: 50 });
        ghRuns = runs.filter(r => (r.display_title || '').toLowerCase().includes(testName.toLowerCase()) || (r.name || '').toLowerCase().includes(testName.toLowerCase()));
      } catch { /* ignore */ }
    }

    if (!adoRows.length && !ghRuns.length) return null;

    const occurrences: CorrelatedFailure['occurrences'] = [];
    for (const row of adoRows) {
      occurrences.push({
        platform: 'azure_devops',
        buildOrRunId: String(row.ado_build_id),
        status: 'failed',
        failureType: row.failure_type,
        failureMessage: row.failure_message,
        timestamp: row.created_at,
        branch: row.branch_name,
        url: row.ado_build_url
      });
    }
    for (const run of ghRuns) {
      occurrences.push({
        platform: 'github_actions',
        buildOrRunId: String(run.id),
        status: run.conclusion || run.status,
        timestamp: run.created_at,
        branch: run.head_branch,
        url: run.html_url
      });
    }

    // Reliability scoring heuristic: fewer failures relative to total observations → higher score.
    const failureCount = occurrences.filter(o => o.status === 'failed' || o.status === 'failure').length;
    const totalObs = occurrences.length || 1;
    const failureRate = failureCount / totalObs;
    const reliabilityScore = Math.max(0, Math.round((1 - failureRate) * 100));

    return {
      testName,
      occurrences,
      reliabilityScore,
      failureRate: Math.round(failureRate * 10000) / 100 // percentage w/ 2 decimals
    };
  }

  /** INTERNAL HELPERS **/
  private async refreshAndEmit(): Promise<void> {
    try {
      const summary = await this.getUnifiedSummary(true);
      this.emit('update', summary);
    } catch (e) {
      // Silently ignore to avoid crashing interval
    }
  }

  private async getAdoSummary(): Promise<PlatformSummaryItem> {
    try {
      // Pipeline health view may not exist in fresh DB; guard with try
      const rows = await this.all<any>(`SELECT * FROM mvp_pipeline_health_summary LIMIT 50`);
      const recentFailures24h = rows.reduce((acc, r) => acc + (r.failures_24h || 0), 0);
      const totalFailures7d = rows.reduce((acc, r) => acc + (r.failures_7d || 0), 0);

      // Derive success rate approximation using ado_builds table
      const buildStats = await this.get<any>(`SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN result = 'succeeded' THEN 1 ELSE 0 END) as succeeded,
          SUM(CASE WHEN result = 'failed' THEN 1 ELSE 0 END) as failed
        FROM ado_builds WHERE created_at > datetime('now','-7 days')`);

      let successRate: number | undefined;
      if (buildStats && buildStats.total > 0) {
        successRate = (buildStats.succeeded / buildStats.total) * 100;
      }

      return {
        platform: 'azure_devops',
        status: 'healthy',
        totalExecutions: buildStats?.total || 0,
        successful: buildStats?.succeeded || 0,
        failed: buildStats?.failed || 0,
        successRate: successRate ? Math.round(successRate * 100) / 100 : undefined,
        recentFailures: recentFailures24h,
        lastActivity: rows[0]?.last_failure_at || null,
        details: {
          pipelinesMonitored: rows.length,
          totalFailures7d,
          recentFailures24h
        }
      };
    } catch (e) {
      return { platform: 'azure_devops', status: 'unhealthy', details: { error: (e as Error).message } };
    }
  }

  private async getGithubSummary(): Promise<PlatformSummaryItem> {
    if (!this.github) throw new Error('GitHub service not configured');
    try {
      const stats = await this.github.getWorkflowStatistics('week');
      return {
        platform: 'github_actions',
        status: 'healthy',
        totalExecutions: stats.totalRuns,
        successful: stats.successfulRuns,
        failed: stats.failedRuns,
        successRate: stats.successRate,
        averageDurationMs: Math.round(stats.averageDuration),
        recentFailures: stats.failedRuns, // simplification
        lastActivity: new Date().toISOString(),
        details: {
          timeframe: '7d',
          averageDurationMs: Math.round(stats.averageDuration)
        }
      };
    } catch (e) {
      return { platform: 'github_actions', status: 'unhealthy', details: { error: (e as Error).message } };
    }
  }

  /** SQLite promisified helpers **/
  private all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows as T[]);
      });
    });
  }
  private get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve(row as T);
      });
    });
  }

  private async getOrSetCache<T>(key: string, ttlMs: number, factory: () => Promise<T>, force = false): Promise<T> {
    if (!force) {
      const existing = this.cache.get(key);
      if (existing && existing.expiresAt > Date.now()) return existing.value as T;
    }
    const value = await factory();
    this.cache.set(key, { value, expiresAt: Date.now() + ttlMs });
    return value;
  }
}

export default MultiPlatformDashboardService;
