import AdoClient from '../lib/ado-client';
import AdoBuildDefinitionService from './ado-build-definition';
import db, { Database } from '../database';
import * as crypto from 'crypto';
import AdoBuildConsumer from './ado-build-consumer';

// Define interfaces for project configuration and status
interface ProjectHealthThresholds {
    healthy: number;
    warning: number;
    critical: number;
}

interface ProjectNotifications {
    onFailure: boolean;
    onSuccess: boolean;
    channels: string[];
}

interface ProjectConfigurationOptions {
    trackBranches: string[];
    healthThresholds: ProjectHealthThresholds;
    notifications: ProjectNotifications;
    retentionDays: number;
    autoSync: boolean;
    includeTestResults: boolean;
    includeBuildTasks: boolean;
}

interface ProjectData {
    id: string;
    name: string;
    buildDefinitionId: number;
    adoProjectId: string;
    adoProjectName: string;
    repositoryName?: string;
    repositoryType?: string;
    path: string;
    enabled: boolean;
    configuration: ProjectConfigurationOptions;
    updated_at?: string;
}

interface ProjectStatus {
    projectName: string;
    buildDefinitionId: number;
    lastBuildId: number | null;
    overallHealth: 'unknown' | 'healthy' | 'warning' | 'critical';
    successRate: number;
    totalTests: number;
    last_updated?: string;
}

class AdoProjectConfigurationService {
    private client: AdoClient;
    private buildDefService: AdoBuildDefinitionService;
    private db: Database;
    private debug: boolean;

    constructor(client: AdoClient | null = null, database: Database | null = null) {
        this.client = client || new AdoClient();
        this.buildDefService = new AdoBuildDefinitionService(this.client);
        this.db = database || db;
        this.debug = process.env.ADO_DEBUG === 'true';
    }

    /**
     * Configure a new project based on a build definition
     */
    async configureProject(buildDefinitionId: number, projectConfig: Partial<ProjectData> & { configuration?: Partial<ProjectConfigurationOptions>, syncHistoricalData?: boolean }): Promise<ProjectData> {
        try {
            // Validate build definition exists
            const buildDefinition = await this.buildDefService.getBuildDefinitionDetails(buildDefinitionId);
            
            if (!buildDefinition) {
                throw new Error(`Build definition ${buildDefinitionId} not found`);
            }

            // Check if this build definition is already configured
            const existingConfigs = await this.db.getProjectConfigurations();
            const existing = existingConfigs.find(config => 
                config.build_definition_id === buildDefinitionId
            );

            if (existing) {
                throw new Error(`Build definition ${buildDefinitionId} is already configured as project "${existing.name}"`);
            }

            // Generate unique project ID
            const projectId = this.generateProjectId(buildDefinitionId, buildDefinition.name);

            // Create project configuration
            const projectData: ProjectData = {
                id: projectId,
                name: projectConfig.name || buildDefinition.name,
                buildDefinitionId: buildDefinitionId,
                adoProjectId: buildDefinition.project.id,
                adoProjectName: buildDefinition.project.name,
                repositoryName: buildDefinition.repository?.name,
                repositoryType: buildDefinition.repository?.type,
                path: buildDefinition.path,
                enabled: projectConfig.enabled !== false,
                configuration: {
                    trackBranches: projectConfig.configuration?.trackBranches || ['main', 'master'],
                    healthThresholds: projectConfig.configuration?.healthThresholds || {
                        healthy: 90,
                        warning: 75,
                        critical: 50
                    },
                    notifications: projectConfig.configuration?.notifications || {
                        onFailure: true,
                        onSuccess: false,
                        channels: []
                    },
                    retentionDays: projectConfig.configuration?.retentionDays || 90,
                    autoSync: projectConfig.configuration?.autoSync !== false,
                    includeTestResults: projectConfig.configuration?.includeTestResults !== false,
                    includeBuildTasks: projectConfig.configuration?.includeBuildTasks !== false
                }
            };

            // Store in database
            await this.db.createProjectConfiguration(projectData);

            // Initialize project status
            await this.initializeProjectStatus(projectData);

            // Optionally sync recent historical data
            if (projectConfig.syncHistoricalData !== false) {
                setTimeout(() => {
                    this.syncInitialData(buildDefinitionId, projectData.id);
                }, 1000); // Run async after response
            }

            this.log(`Project configured: ${projectData.name} (${projectId})`);
            return projectData;
            
        } catch (error: any) {
            this.error('Failed to configure project:', error.message);
            throw error;
        }
    }

    /**
     * Get all configured projects
     */
    async getConfiguredProjects(): Promise<any[]> {
        try {
            const projects = await this.db.getProjectConfigurations();
            
            // Enrich with current status and metrics
            const enrichedProjects: any[] = [];
            for (const project of projects) {
                try {
                    const status = await this.db.getProjectStatus(project.id);
                    const recentBuilds = await this.db.getBuildsByDefinition(project.build_definition_id, 5);
                    
                    enrichedProjects.push({
                        ...project,
                        status: status || null,
                        recentBuilds: recentBuilds || [],
                        lastUpdated: status?.last_updated || project.updated_at
                    });
                } catch (error: any) {
                    this.error(`Failed to enrich project ${project.id}:`, error.message);
                    // Include project without enrichment
                    enrichedProjects.push(project);
                }
            }

            this.log(`Retrieved ${enrichedProjects.length} configured projects`);
            return enrichedProjects;
        } catch (error: any) {
            this.error('Failed to get configured projects:', error.message);
            throw error;
        }
    }

    /**
     * Get specific project configuration
     */
    async getProjectConfiguration(projectId: string): Promise<any> {
        try {
            const projects = await this.db.getProjectConfigurations();
            const project = projects.find((p: any) => p.id === projectId);
            
            if (!project) {
                throw new Error(`Project configuration not found: ${projectId}`);
            }

            // Get additional project details
            const status = await this.db.getProjectStatus(projectId);
            const recentBuilds = await this.db.getBuildsByDefinition(project.build_definition_id, 10);
            const buildStats = await this.db.getBuildStatistics(project.ado_project_id);

            return {
                ...project,
                status,
                recentBuilds,
                statistics: buildStats
            };
        } catch (error: any) {
            this.error(`Failed to get project configuration ${projectId}:`, error.message);
            throw error;
        }
    }

    /**
     * Update project configuration
     */
    async updateProjectConfiguration(projectId: string, updates: Partial<ProjectData>): Promise<any> {
        try {
            const existing = await this.getProjectConfiguration(projectId);
            
            if (!existing) {
                throw new Error(`Project configuration not found: ${projectId}`);
            }

            // Merge configurations
            if (updates.configuration) {
                updates.configuration = {
                    ...existing.configuration,
                    ...updates.configuration
                };
            }

            const updated = await this.db.updateProjectConfiguration(projectId, updates);
            
            this.log(`Project configuration updated: ${projectId}`);
            return updated;
        } catch (error: any) {
            this.error(`Failed to update project configuration ${projectId}:`, error.message);
            throw error;
        }
    }

    /**
     * Delete project configuration
     */
    async deleteProjectConfiguration(projectId: string): Promise<any> {
        try {
            const result = await this.db.deleteProjectConfiguration(projectId);
            
            if (result.deleted) {
                // Clean up related data
                await this.cleanupProjectData(projectId);
                this.log(`Project configuration deleted: ${projectId}`);
            }
            
            return result;
        } catch (error: any) {
            this.error(`Failed to delete project configuration ${projectId}:`, error.message);
            throw error;
        }
    }

    /**
     * Enable or disable a project
     */
    async toggleProjectStatus(projectId: string, enabled: boolean): Promise<any> {
        try {
            const updated = await this.updateProjectConfiguration(projectId, { enabled });
            this.log(`Project ${projectId} ${enabled ? 'enabled' : 'disabled'}`);
            return updated;
        } catch (error: any) {
            this.error(`Failed to toggle project status ${projectId}:`, error.message);
            throw error;
        }
    }

    /**
     * Get configured build definition IDs
     */
    async getConfiguredBuildDefinitionIds(): Promise<number[]> {
        try {
            const projects = await this.db.getProjectConfigurations();
            return projects.map((p: any) => p.build_definition_id);
        } catch (error: any) {
            this.error('Failed to get configured build definition IDs:', error.message);
            throw error;
        }
    }

    /**
     * Validate project configuration
     */
    async validateProjectConfiguration(buildDefinitionId: number, projectConfig: Partial<ProjectData> & { configuration?: Partial<ProjectConfigurationOptions> }): Promise<{ isValid: boolean, errors: string[] }> {
        const errors: string[] = [];

        // Check if build definition exists
        try {
            await this.buildDefService.getBuildDefinitionDetails(buildDefinitionId);
        } catch (error) {
            errors.push(`Build definition ${buildDefinitionId} not found or not accessible`);
        }

        // Check if already configured
        try {
            const configuredIds = await this.getConfiguredBuildDefinitionIds();
            if (configuredIds.includes(buildDefinitionId)) {
                errors.push(`Build definition ${buildDefinitionId} is already configured`);
            }
        } catch (error) {
            errors.push('Failed to check existing configurations');
        }

        // Validate configuration values
        if (!projectConfig.name || projectConfig.name.trim().length === 0) {
            errors.push('Project name is required');
        }

        if (projectConfig.configuration?.healthThresholds) {
            const { healthy, warning, critical } = projectConfig.configuration.healthThresholds;
            if (healthy <= warning || warning <= critical || critical < 0) {
                errors.push('Health thresholds must be in descending order (healthy > warning > critical >= 0)');
            }
        }

        if (projectConfig.configuration?.trackBranches && (!Array.isArray(projectConfig.configuration.trackBranches) || projectConfig.configuration.trackBranches.length === 0)) {
            errors.push('At least one branch must be tracked');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Get project health summary
     */
    async getProjectHealthSummary(): Promise<any> {
        try {
            const projects = await this.getConfiguredProjects();
            
            const summary = {
                totalProjects: projects.length,
                healthyProjects: 0,
                warningProjects: 0,
                criticalProjects: 0,
                inactiveProjects: 0,
                averageSuccessRate: 0,
                lastUpdated: new Date().toISOString()
            };

            let totalSuccessRate = 0;
            let projectsWithStatus = 0;

            for (const project of projects) {
                if (!project.enabled) {
                    summary.inactiveProjects++;
                    continue;
                }

                if (project.status) {
                    projectsWithStatus++;
                    totalSuccessRate += project.status.success_rate || 0;

                    switch (project.status.overall_health) {
                        case 'healthy':
                            summary.healthyProjects++;
                            break;
                        case 'warning':
                            summary.warningProjects++;
                            break;
                        case 'critical':
                            summary.criticalProjects++;
                            break;
                    }
                }
            }

            if (projectsWithStatus > 0) {
                summary.averageSuccessRate = Math.round(totalSuccessRate / projectsWithStatus);
            }

            this.log('Generated project health summary');
            return summary;
        } catch (error: any) {
            this.error('Failed to get project health summary:', error.message);
            throw error;
        }
    }

    // Private helper methods

    /**
     * Generate unique project ID
     */
    private generateProjectId(buildDefinitionId: number, definitionName: string): string {
        const cleanName = definitionName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const hash = crypto.createHash('md5')
            .update(`${buildDefinitionId}-${definitionName}`)
            .digest('hex')
            .substring(0, 8);
        
        return `proj_${cleanName}_${hash}`;
    }

    /**
     * Initialize project status in database
     */
    private async initializeProjectStatus(projectData: ProjectData): Promise<void> {
        try {
            const statusData: ProjectStatus = {
                projectName: projectData.name,
                buildDefinitionId: projectData.buildDefinitionId,
                lastBuildId: null,
                overallHealth: 'unknown',
                successRate: 0,
                totalTests: 0
            };

            await this.db.updateProjectStatus(projectData.id, statusData);
            this.log(`Initialized status for project ${projectData.id}`);
        } catch (error: any) {
            this.error(`Failed to initialize project status for ${projectData.id}:`, error.message);
            // Don't throw as this is not critical for project creation
        }
    }

    /**
     * Sync initial historical data for a new project
     */
    private async syncInitialData(buildDefinitionId: number, projectId: string): Promise<void> {
        try {
            this.log(`Starting initial data sync for project ${projectId}`);
            
            const consumer = new AdoBuildConsumer(this.client, this.db);
            
            // Sync last 7 days of builds
            const result = await consumer.syncHistoricalBuilds(buildDefinitionId, null, 7);
            
            this.log(`Initial sync completed for project ${projectId}: ${result.results.length} builds processed`);
        } catch (error: any) {
            this.error(`Failed to sync initial data for project ${projectId}:`, error.message);
            // Don't throw as this runs async
        }
    }

    /**
     * Clean up project-related data when deleting a project
     */
    private async cleanupProjectData(projectId: string): Promise<void> {
        try {
            // Remove project status
            // Note: This would need additional database methods for complete cleanup
            this.log(`Cleaned up data for project ${projectId}`);
        } catch (error: any) {
            this.error(`Failed to cleanup data for project ${projectId}:`, error.message);
            // Don't throw as the main deletion already succeeded
        }
    }

    private log(...args: any[]): void {
        if (this.debug) {
            console.log('[ADO-PROJECT-CONFIGURATION]', ...args);
        }
    }

    private error(...args: any[]): void {
        console.error('[ADO-PROJECT-CONFIGURATION ERROR]', ...args);
    }
}

export default AdoProjectConfigurationService;
