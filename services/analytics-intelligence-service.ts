/**
 * Advanced Intelligence & Analytics Platform (Week 19-20)
 * Heuristic + extensible framework (no heavy ML runtime yet) providing:
 *  - Failure pattern recognition
 *  - Reliability & predictive scoring
 *  - Cross-platform correlation & benchmarking
 *  - Test prioritization suggestions
 *  - Cost & performance insights (estimates)
 *  - Notification routing decisions
 *  - Remediation suggestion heuristics
 */
import { EventEmitter } from 'events';
import type sqlite3 from 'sqlite3';
import GitHubApiService from './github-api-service';

export interface FailurePatternSummary {
  testName: string;
  totalOccurrences: number;
  failureCount: number;
  firstSeen: string;
  lastSeen: string;
  failureRate: number; // 0-1
  pattern: 'flaky' | 'persistent' | 'new' | 'intermittent' | 'stable';
  reliabilityScore: number; // 0-100 (higher = better)
  trend: 'improving' | 'worsening' | 'stable';
}

export interface PrioritizedTestSuggestion {
  testName: string;
  suggestedPriority: number; // lower number = earlier
  rationale: string[];
  reliabilityScore: number;
  failureRate: number;
}

export interface PlatformBenchmark {
  platform: string;
  successRate?: number;
  avgDurationMs?: number;
  totalExecutions?: number;
  failureRate?: number;
  costEstimate?: number;
}

interface CacheEntry<T> { value: T; expiresAt: number; }

export class AnalyticsIntelligenceService extends EventEmitter {
  private db: sqlite3.Database;
  private github?: GitHubApiService;
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTtl = 30_000;

  constructor(db: sqlite3.Database) {
    super();
    this.db = db;
    this.initGithub();
  }

  private initGithub(): void {
    const { GITHUB_TOKEN: token, GITHUB_OWNER: owner, GITHUB_REPO: repo } = process.env;
    if (token && owner && repo) {
      try { this.github = new GitHubApiService({ token, owner, repo }); } catch { /* ignore */ }
    }
  }

  /** FAILURE PATTERN RECOGNITION **/
  async getFailurePatterns(limit = 100): Promise<FailurePatternSummary[]> {
    return this.getOrSet('failurePatterns', this.defaultTtl, async () => {
      // 1) Aggregate executions from ADO test details (includes passing tests)
      const detailRows = await this.all<any>(
        `SELECT 
            COALESCE(NULLIF(TRIM(test_case_title), ''), 'Unknown Test') AS test_name,
            COUNT(*) AS executions,
            SUM(CASE WHEN LOWER(COALESCE(outcome, '')) IN ('failed','error','timeout') THEN 1 ELSE 0 END) AS failures,
            MIN(created_at) AS firstSeen,
            MAX(created_at) AS lastSeen
         FROM ado_test_details
         GROUP BY COALESCE(NULLIF(TRIM(test_case_title), ''), 'Unknown Test')`
      );

      // Map from ADO details (authoritative when present)
      const byName = new Map<string, FailurePatternSummary>();
      for (const r of detailRows) {
        const total = Number(r.executions) || 0;
        const fails = Number(r.failures) || 0;
        const failureRate = total > 0 ? fails / total : 0;
        let pattern: FailurePatternSummary['pattern'] = 'stable';
        if (total === 1 && r.lastSeen && (Date.now() - Date.parse(r.lastSeen)) < 24*3600*1000) pattern = 'new';
        else if (failureRate >= 0.8) pattern = 'persistent';
        else if (failureRate >= 0.4) pattern = 'intermittent';
        else if (failureRate > 0 && failureRate < 0.4) pattern = 'flaky';

        const reliabilityScore = Math.max(0, Math.round((1 - failureRate) * 100));
        // Trend based on failure counts in 7d windows derived from failures table if available
        let trend: FailurePatternSummary['trend'] = 'stable';
        try {
          const recent = await this.get<any>(`SELECT COUNT(*) as c FROM mvp_test_failures WHERE test_name=? AND created_at > datetime('now','-7 days')`, [r.test_name]);
          const prior = await this.get<any>(`SELECT COUNT(*) as c FROM mvp_test_failures WHERE test_name=? AND created_at BETWEEN datetime('now','-14 days') AND datetime('now','-7 days')`, [r.test_name]);
          if (recent && prior) {
            if (recent.c > prior.c) trend = 'worsening';
            else if (recent.c < prior.c) trend = 'improving';
          }
        } catch { /* if table absent or empty, keep stable */ }

        byName.set(r.test_name, {
          testName: r.test_name,
          totalOccurrences: total,
          failureCount: fails,
          firstSeen: r.firstSeen || new Date().toISOString(),
          lastSeen: r.lastSeen || new Date().toISOString(),
          failureRate,
          pattern,
          reliabilityScore,
          trend
        });
      }

      // 2) Supplement with legacy failures table for tests not present in ADO details
      try {
        const failRows = await this.all<any>(`SELECT test_name, 
            COUNT(*) as occurrences,
            SUM(CASE WHEN failure_type IS NOT NULL THEN 1 ELSE 0 END) as failures,
            MIN(created_at) as firstSeen,
            MAX(created_at) as lastSeen
          FROM mvp_test_failures
          GROUP BY test_name`);
        for (const r of failRows) {
          if (byName.has(r.test_name)) continue; // ADO details already captured totals
          const total = Number(r.occurrences) || 0;
          const fails = Number(r.failures) || 0;
          const failureRate = total > 0 ? fails / total : 0;
          let pattern: FailurePatternSummary['pattern'] = 'stable';
          if (total === 1 && r.lastSeen && (Date.now() - Date.parse(r.lastSeen)) < 24*3600*1000) pattern = 'new';
          else if (failureRate >= 0.8) pattern = 'persistent';
          else if (failureRate >= 0.4) pattern = 'intermittent';
          else if (failureRate > 0 && failureRate < 0.4) pattern = 'flaky';
          const reliabilityScore = Math.max(0, Math.round((1 - failureRate) * 100));
          // Trend via 7d vs prior 7d in the same table
          let trend: FailurePatternSummary['trend'] = 'stable';
          try {
            const recent = await this.get<any>(`SELECT COUNT(*) as c FROM mvp_test_failures WHERE test_name=? AND created_at > datetime('now','-7 days')`, [r.test_name]);
            const prior = await this.get<any>(`SELECT COUNT(*) as c FROM mvp_test_failures WHERE test_name=? AND created_at BETWEEN datetime('now','-14 days') AND datetime('now','-7 days')`, [r.test_name]);
            if (recent && prior) {
              if (recent.c > prior.c) trend = 'worsening';
              else if (recent.c < prior.c) trend = 'improving';
            }
          } catch { /* ignore */ }
          byName.set(r.test_name, {
            testName: r.test_name,
            totalOccurrences: total,
            failureCount: fails,
            firstSeen: r.firstSeen,
            lastSeen: r.lastSeen,
            failureRate,
            pattern,
            reliabilityScore,
            trend
          });
        }
      } catch { /* table may be empty; ignore */ }

      // 3) Sort: failures desc, executions desc, then name; limit
      const patterns = Array.from(byName.values())
        .sort((a, b) => (b.failureCount - a.failureCount) || (b.totalOccurrences - a.totalOccurrences) || a.testName.localeCompare(b.testName))
        .slice(0, limit);
      return patterns;
    });
  }

  async analyzeSpecificTest(testName: string): Promise<FailurePatternSummary | null> {
    const all = await this.getFailurePatterns();
    return all.find(p => p.testName === testName) || null;
  }

  /** PREDICTIVE RELIABILITY (Heuristic)**/
  async predictReliability(testName: string): Promise<{ testName: string; predictedFailureProbability: number; reliabilityScore: number; basis: string[]; }> {
    const pattern = await this.analyzeSpecificTest(testName);
    if (!pattern) return { testName, predictedFailureProbability: 0.05, reliabilityScore: 95, basis: ['No historical failure data – default baseline applied'] };
    // Heuristic: use failureRate weighted by trend
    let prob = pattern.failureRate;
    if (pattern.trend === 'worsening') prob *= 1.15;
    if (pattern.trend === 'improving') prob *= 0.85;
    prob = Math.min(0.99, Math.max(0.01, prob));
    const reliabilityScore = Math.round((1 - prob) * 100);
    const basis = [
      `Historical failure rate ${(pattern.failureRate*100).toFixed(1)}%`,
      `Trend ${pattern.trend}`,
      `Pattern ${pattern.pattern}`
    ];
    return { testName, predictedFailureProbability: Math.round(prob*10000)/10000, reliabilityScore, basis };
  }

  /**
   * Phase 4: Advanced Analytics (Weeks 13-16)
   * Adds deeper historical reliability scoring, performance trend analysis, and automated failure categorization.
   */
  async getHistoricalReliability(testName: string, days = 30): Promise<{ testName: string; windowDays: number; daily: { date: string; failures: number; executions: number; failureRate: number }[]; overallFailureRate: number; }> {
    const rows = await this.all<any>(`SELECT DATE(created_at) as d,
        COUNT(*) as executions,
        SUM(CASE WHEN failure_type IS NOT NULL THEN 1 ELSE 0 END) as failures
      FROM mvp_test_failures
      WHERE test_name = ? AND created_at >= datetime('now', ?)
      GROUP BY DATE(created_at)
      ORDER BY d ASC`, [testName, `-${days} days`]);
    const daily = rows.map(r => ({ date: r.d, failures: r.failures, executions: r.executions, failureRate: r.failures / r.executions }));
    const totalFailures = daily.reduce((a,c)=> a + c.failures, 0);
    const totalExecs = daily.reduce((a,c)=> a + c.executions, 0) || 1;
    return { testName, windowDays: days, daily, overallFailureRate: totalFailures / totalExecs };
  }

  async getPerformanceTrends(days = 30): Promise<{ date: string; totalFailures: number; uniqueTests: number; persistentFailures: number; newFailures: number; }> {
    // Aggregate failures per day and classify new vs persistent (appeared before window)
    let rows: any[] = []
    try {
      rows = await this.all<any>(`SELECT DATE(created_at) as d, COUNT(*) as totalFailures, COUNT(DISTINCT test_name) as uniqueTests
        FROM mvp_test_failures
        WHERE created_at >= datetime('now', ?)
        GROUP BY DATE(created_at)
        ORDER BY d ASC`, [`-${days} days`]);
    } catch { rows = [] }

    // If no failures available, synthesize trend timeline from ado_test_results (executions only)
    if (!rows.length) {
      const execRows = await this.all<any>(`SELECT DATE(created_at) as d, COUNT(*) as runs
        FROM ado_test_results
        WHERE created_at >= datetime('now', ?)
        GROUP BY DATE(created_at)
        ORDER BY d ASC`, [`-${days} days`]);
      return execRows.map(r => ({ date: r.d, totalFailures: 0, uniqueTests: 0, persistentFailures: 0, newFailures: 0 })) as any
    }

    // Determine persistent vs new by checking earliest occurrence
    const enriched = [] as { date: string; totalFailures: number; uniqueTests: number; persistentFailures: number; newFailures: number }[];
    for (const r of rows) {
      const dayTests = await this.all<any>(`SELECT DISTINCT test_name FROM mvp_test_failures WHERE DATE(created_at)=?`, [r.d]);
      let persistent = 0; let newly = 0;
      for (const t of dayTests) {
        const first = await this.get<any>(`SELECT DATE(created_at) as first FROM mvp_test_failures WHERE test_name=? ORDER BY created_at ASC LIMIT 1`, [t.test_name]);
        if (first && first.first === r.d) newly++; else persistent++;
      }
      enriched.push({ date: r.d, totalFailures: r.totalFailures, uniqueTests: r.uniqueTests, persistentFailures: persistent, newFailures: newly });
    }
    return enriched as any;
  }

  async categorizeFailure(testName: string): Promise<{ testName: string; category: string; confidence: number; basis: string[] }> {
    const pattern = await this.analyzeSpecificTest(testName);
    if (!pattern) return { testName, category: 'unknown', confidence: 0.2, basis: ['No historical data'] };
    // Simple heuristic categorization based on failure rate + trend + pattern label
    let category = 'stable';
    if (pattern.pattern === 'persistent') category = 'infrastructure';
    else if (pattern.pattern === 'flaky') category = 'flaky';
    else if (pattern.trend === 'worsening' && pattern.failureRate > 0.3) category = 'regression';
    else if (pattern.pattern === 'new') category = 'new';
    const confidence = Math.min(0.95, 0.4 + (1 - pattern.failureRate) * 0.3 + (pattern.trend === 'worsening' ? 0.15 : 0));
    const basis = [
      `Pattern=${pattern.pattern}`,
      `Trend=${pattern.trend}`,
      `FailureRate=${(pattern.failureRate*100).toFixed(1)}%`
    ];
    return { testName, category, confidence: Math.round(confidence*100)/100, basis };
  }

  async batchCategorize(limit = 100): Promise<{ testName: string; category: string; confidence: number }[]> {
    const patterns = await this.getFailurePatterns(limit);
    const results: { testName: string; category: string; confidence: number }[] = [];
    for (const p of patterns) {
      const cat = await this.categorizeFailure(p.testName);
      results.push({ testName: p.testName, category: cat.category, confidence: cat.confidence });
    }
    return results;
  }

  /** TEST PRIORITIZATION **/
  async getPrioritizedTests(limit = 50): Promise<PrioritizedTestSuggestion[]> {
    const patterns = await this.getFailurePatterns(limit*2);
    const suggestions: PrioritizedTestSuggestion[] = patterns.map(p => ({
      testName: p.testName,
      reliabilityScore: p.reliabilityScore,
      failureRate: p.failureRate,
      suggestedPriority: this.computePriority(p),
      rationale: this.buildPriorityRationale(p)
    }));
    return suggestions.sort((a,b) => a.suggestedPriority - b.suggestedPriority).slice(0, limit);
  }

  private computePriority(p: FailurePatternSummary): number {
    // Lower value means earlier execution
    let base = 100;
    base -= (1 - p.reliabilityScore/100) * 40; // more failures => higher priority
    if (p.pattern === 'persistent') base -= 20;
    if (p.pattern === 'flaky') base -= 10; // want earlier to detect instability
    if (p.trend === 'worsening') base -= 10;
    return Math.max(1, Math.round(base));
  }

  private buildPriorityRationale(p: FailurePatternSummary): string[] {
    const r: string[] = [];
    if (p.pattern === 'persistent') r.push('Persistent failure pattern');
    if (p.pattern === 'flaky') r.push('Flaky behavior detected');
    if (p.trend === 'worsening') r.push('Worsening recent trend');
    if (p.reliabilityScore < 70) r.push('Low reliability score');
    if (!r.length) r.push('Baseline ordering');
    return r;
  }

  /** PLATFORM BENCHMARKING & COST **/
  async getPlatformBenchmarks(): Promise<PlatformBenchmark[]> {
    return this.getOrSet('platformBenchmarks', this.defaultTtl, async () => {
      const benchmarks: PlatformBenchmark[] = [];
      // Azure DevOps from ado_builds
      try {
        const buildStats = await this.get<any>(`SELECT COUNT(*) total, SUM(CASE WHEN result='succeeded' THEN 1 ELSE 0 END) succ, SUM(CASE WHEN result='failed' THEN 1 ELSE 0 END) fail, AVG(duration) avgDuration FROM ado_builds WHERE created_at > datetime('now','-30 days')`);
        if (buildStats && buildStats.total) {
          benchmarks.push({
            platform: 'azure_devops',
            totalExecutions: buildStats.total,
            successRate: buildStats.succ / buildStats.total * 100,
            failureRate: buildStats.fail / buildStats.total * 100,
            avgDurationMs: buildStats.avgDuration,
            costEstimate: this.estimateCost('azure_devops', buildStats.total, buildStats.avgDuration)
          });
        } else {
          // If no builds in window, try to infer from test results presence
          const testRuns = await this.get<any>(`SELECT COUNT(*) as r FROM ado_test_results WHERE created_at > datetime('now','-30 days')`);
          if (testRuns && testRuns.r) {
            benchmarks.push({ platform: 'azure_devops', totalExecutions: testRuns.r, successRate: 100, failureRate: 0 });
          }
        }
      } catch {/* ignore */}
      // GitHub Actions
      if (this.github) {
        try {
          const stats = await this.github.getWorkflowStatistics('month');
          benchmarks.push({
            platform: 'github_actions',
            totalExecutions: stats.totalRuns,
            successRate: stats.successRate,
            failureRate: stats.failedRuns && stats.totalRuns ? stats.failedRuns / stats.totalRuns * 100 : undefined,
            avgDurationMs: Math.round(stats.averageDuration),
            costEstimate: this.estimateCost('github_actions', stats.totalRuns, stats.averageDuration)
          });
        } catch {/* ignore */}
      }
      return benchmarks;
    });
  }

  private estimateCost(platform: string, totalExecutions: number, avgDurationMs?: number): number | undefined {
    if (!avgDurationMs || !totalExecutions) return undefined;
    // Simple CPU-minute pricing approximation (placeholder numbers)
    const minutes = (avgDurationMs / 1000 / 60) * totalExecutions;
    const ratePerMinute: Record<string, number> = {
      azure_devops: 0.008, // example
      github_actions: 0.01
    };
    const rate = ratePerMinute[platform] || 0.009;
    return Math.round(minutes * rate * 100) / 100;
  }

  /** NOTIFICATION ROUTING **/
  routeNotification(pattern: FailurePatternSummary): { channels: string[]; priority: 'low'|'normal'|'high'; rationale: string[] } {
    const channels = ['dashboard'];
    const rationale: string[] = [];
    let priority: 'low'|'normal'|'high' = 'normal';
    if (pattern.pattern === 'persistent') { channels.push('email'); priority='high'; rationale.push('Persistent failing test'); }
    if (pattern.pattern === 'flaky') { channels.push('slack'); rationale.push('Flaky test requires attention'); }
    if (pattern.trend === 'worsening') { channels.push('slack'); priority='high'; rationale.push('Worsening trend'); }
    if (pattern.reliabilityScore > 85) { priority='low'; rationale.push('High reliability'); }
    if (!rationale.length) rationale.push('Default routing');
    return { channels: Array.from(new Set(channels)), priority, rationale };
  }

  /** REMEDIATION SUGGESTIONS **/
  suggestRemediation(pattern: FailurePatternSummary): { suggestions: string[]; } {
    const s: string[] = [];
    if (pattern.pattern === 'flaky') s.push('Add retry annotation or stabilize async timing');
    if (pattern.pattern === 'persistent') s.push('Investigate recent code changes affecting this test area');
    if (pattern.failureRate > 0.5) s.push('Add targeted logging around failing assertions');
    if (pattern.trend === 'worsening') s.push('Escalate ownership to component team');
    if (!s.length) s.push('Monitor; no critical action required');
    return { suggestions: s };
  }

  /** UTILITIES **/
  private async getOrSet<T>(key: string, ttl: number, factory: () => Promise<T>): Promise<T> {
    const existing = this.cache.get(key);
    if (existing && existing.expiresAt > Date.now()) return existing.value as T;
    const value = await factory();
    this.cache.set(key, { value, expiresAt: Date.now() + ttl });
    return value;
  }

  private all<T=any>(sql: string, params: any[] = []): Promise<T[]> { return new Promise((res, rej) => this.db.all(sql, params, (e,r)=> e?rej(e):res(r as T[]))); }
  private get<T=any>(sql: string, params: any[] = []): Promise<T | undefined> { return new Promise((res, rej) => this.db.get(sql, params, (e,r)=> e?rej(e):res(r as T))); }
}

export default AnalyticsIntelligenceService;
