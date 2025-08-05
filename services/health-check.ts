/**
 * Production Health Check Service
 * Comprehensive health monitoring for production deployment
 */

import * as sqlite3 from 'sqlite3';
import * as fs from 'fs';
import * as path from 'path';

interface HealthCheckResult {
    status: 'healthy' | 'warning' | 'degraded' | 'error';
    message: string;
    error?: string;
    details?: any;
}

interface HealthReport {
    status: 'healthy' | 'warning' | 'degraded' | 'error';
    timestamp: string;
    version?: string;
    environment?: string;
    checks: {
        database?: HealthCheckResult;
        memory?: HealthCheckResult;
        system?: HealthCheckResult;
        disk?: HealthCheckResult;
        externalServices?: HealthCheckResult;
    };
    message?: string;
    error?: string;
}

interface ServiceInfo {
    name: string;
    status: string;
    url: string;
}

class HealthCheckService {
    private dbPath: string;
    private startTime: number;
    private healthHistory: HealthReport[];
    private maxHistorySize: number;

    constructor() {
        this.dbPath = process.env.DATABASE_PATH || './database/app.db';
        this.startTime = Date.now();
        this.healthHistory = [];
        this.maxHistorySize = 100;
    }

    // Database health check
    async checkDatabase(): Promise<HealthCheckResult> {
        return new Promise((resolve) => {
            const db = new sqlite3.Database(this.dbPath, sqlite3.OPEN_READONLY, (err) => {
                if (err) {
                    resolve({
                        status: 'error',
                        message: 'Database connection failed',
                        error: err.message
                    });
                    return;
                }

                // Check database integrity
                db.get("PRAGMA integrity_check", (err: Error | null, row: any) => {
                    db.close();
                    
                    if (err) {
                        resolve({
                            status: 'error',
                            message: 'Database integrity check failed',
                            error: err.message
                        });
                        return;
                    }

                    if (row && row.integrity_check === 'ok') {
                        resolve({
                            status: 'healthy',
                            message: 'Database accessible and integrity verified'
                        });
                    } else {
                        resolve({
                            status: 'degraded',
                            message: 'Database integrity issues detected'
                        });
                    }
                });
            });
        });
    }

    // Memory usage check
    checkMemory(): HealthCheckResult {
        const usage = process.memoryUsage();
        const totalMB = Math.round(usage.heapTotal / 1024 / 1024);
        const usedMB = Math.round(usage.heapUsed / 1024 / 1024);
        const externalMB = Math.round(usage.external / 1024 / 1024);
        
        const memoryThreshold = 512; // MB
        const status = totalMB > memoryThreshold ? 'warning' : 'healthy';
        
        return {
            status,
            message: `Memory usage: ${usedMB}MB used, ${totalMB}MB total`,
            details: {
                heapUsed: usedMB,
                heapTotal: totalMB,
                external: externalMB,
                rss: Math.round(usage.rss / 1024 / 1024)
            }
        };
    }

    // CPU and uptime check
    checkSystem(): HealthCheckResult {
        const uptime = Date.now() - this.startTime;
        const uptimeHours = Math.round(uptime / (1000 * 60 * 60) * 100) / 100;
        
        return {
            status: 'healthy',
            message: `System running for ${uptimeHours} hours`,
            details: {
                uptime: uptime,
                uptimeHours: uptimeHours,
                nodeVersion: process.version,
                platform: process.platform
            }
        };
    }

    // Disk space check
    checkDisk(): HealthCheckResult {
        try {
            const stats = fs.statSync(this.dbPath);
            const sizeKB = Math.round(stats.size / 1024);
            
            // Check if logs directory exists and get size
            const logsDir = process.env.LOG_FILE ? path.dirname(process.env.LOG_FILE) : './logs';
            let logsSizeKB = 0;
            
            try {
                if (fs.existsSync(logsDir)) {
                    const logFiles = fs.readdirSync(logsDir);
                    logsSizeKB = logFiles.reduce((total, file) => {
                        const filePath = path.join(logsDir, file);
                        const fileStats = fs.statSync(filePath);
                        return total + fileStats.size;
                    }, 0) / 1024;
                }
            } catch (e) {
                // Ignore log directory check errors
            }

            return {
                status: 'healthy',
                message: `Database: ${sizeKB}KB, Logs: ${Math.round(logsSizeKB)}KB`,
                details: {
                    databaseSizeKB: sizeKB,
                    logsSizeKB: Math.round(logsSizeKB)
                }
            };
        } catch (error) {
            return {
                status: 'error',
                message: 'Disk space check failed',
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    // External services connectivity check
    async checkExternalServices(): Promise<HealthCheckResult> {
        const services: ServiceInfo[] = [];

        // Check if environment variables for external services are set
        if (process.env.JIRA_URL) {
            services.push({
                name: 'JIRA',
                status: 'configured',
                url: process.env.JIRA_URL
            });
        }

        if (process.env.ADO_ORGANIZATION_URL) {
            services.push({
                name: 'Azure DevOps',
                status: 'configured',
                url: process.env.ADO_ORGANIZATION_URL
            });
        }

        return {
            status: services.length > 0 ? 'healthy' : 'warning',
            message: `${services.length} external service(s) configured`,
            details: { services }
        };
    }

    // Overall system health check
    async performHealthCheck(): Promise<HealthReport> {
        const timestamp = new Date().toISOString();
        const checks: HealthReport['checks'] = {};

        try {
            // Run all health checks
            checks.database = await this.checkDatabase();
            checks.memory = this.checkMemory();
            checks.system = this.checkSystem();
            checks.disk = this.checkDisk();
            checks.externalServices = await this.checkExternalServices();

            // Determine overall status
            const statuses = Object.values(checks).map(check => check?.status);
            let overallStatus: HealthReport['status'] = 'healthy';

            if (statuses.includes('error')) {
                overallStatus = 'error';
            } else if (statuses.includes('degraded')) {
                overallStatus = 'degraded';
            } else if (statuses.includes('warning')) {
                overallStatus = 'warning';
            }

            const healthResult: HealthReport = {
                status: overallStatus,
                timestamp,
                version: process.env.npm_package_version || '1.0.0',
                environment: process.env.NODE_ENV || 'development',
                checks
            };

            // Store in history
            this.healthHistory.unshift(healthResult);
            if (this.healthHistory.length > this.maxHistorySize) {
                this.healthHistory.pop();
            }

            return healthResult;
        } catch (error) {
            return {
                status: 'error',
                timestamp,
                message: 'Health check failed',
                error: error instanceof Error ? error.message : String(error),
                checks
            };
        }
    }

    // Get health history
    getHealthHistory(): HealthReport[] {
        return this.healthHistory;
    }

    // Get metrics for monitoring
    getMetrics(): any {
        const latest = this.healthHistory[0];
        if (!latest) return null;

        return {
            status: latest.status,
            uptime: latest.checks.system?.details?.uptime || 0,
            memory_used_mb: latest.checks.memory?.details?.heapUsed || 0,
            memory_total_mb: latest.checks.memory?.details?.heapTotal || 0,
            database_size_kb: latest.checks.disk?.details?.databaseSizeKB || 0,
            timestamp: latest.timestamp
        };
    }
}

export default HealthCheckService;
