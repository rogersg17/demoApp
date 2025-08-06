import AdoClient from '../lib/ado-client';
import { BuildApi } from 'azure-devops-node-api/BuildApi';
import { Build, BuildDefinition, BuildDefinitionReference, DefinitionQueryOrder } from 'azure-devops-node-api/interfaces/BuildInterfaces';

class AdoBuildDefinitionService {
    private client: AdoClient;
    private debug: boolean;

    constructor(client: AdoClient | null = null) {
        this.client = client || new AdoClient();
        this.debug = process.env.ADO_DEBUG === 'true';
    }

    /**
     * Get all build definitions from Azure DevOps
     */
    async getBuildDefinitions(projectId: string | null = null): Promise<any[]> {
        try {
            const project = projectId || this.client.getProjectId();
            const buildApi: BuildApi = await this.client.getBuildApi();
            
            const definitions: BuildDefinitionReference[] = await buildApi.getDefinitions(
                project,
                undefined, // name filter
                undefined, // repositoryId
                undefined, // repositoryType
                DefinitionQueryOrder.None, // queryOrder
                undefined, // top
                undefined, // continuationToken
                undefined, // minMetricsTime
                undefined, // definitionIds
                undefined, // path
                undefined, // builtAfter
                undefined, // notBuiltAfter
                true  // includeAllProperties
            );

            this.log(`Found ${definitions.length} build definitions in project ${project}`);

            return definitions.map(def => {
                const buildDef = def as BuildDefinition;
                return {
                    id: def.id,
                    name: def.name,
                    path: def.path,
                    repository: {
                        id: buildDef.repository?.id,
                        name: buildDef.repository?.name,
                        type: buildDef.repository?.type,
                        url: buildDef.repository?.url
                    },
                    project: {
                        id: def.project?.id,
                        name: def.project?.name
                    },
                    process: {
                        type: (def as BuildDefinition).process?.type,
                        yamlFilename: ((def as BuildDefinition).process as any)?.yamlFilename
                    },
                    queue: (def as BuildDefinition).queue,
                    triggers: (def as BuildDefinition).triggers,
                    lastBuild: (def as BuildDefinition).latestBuild ? {
                        id: (def as BuildDefinition).latestBuild?.id,
                        buildNumber: (def as BuildDefinition).latestBuild?.buildNumber,
                        status: (def as BuildDefinition).latestBuild?.status,
                        result: (def as BuildDefinition).latestBuild?.result,
                        startTime: (def as BuildDefinition).latestBuild?.startTime,
                        finishTime: (def as BuildDefinition).latestBuild?.finishTime
                    } : null,
                    lastCompletedBuild: (def as BuildDefinition).latestCompletedBuild ? {
                        id: (def as BuildDefinition).latestCompletedBuild?.id,
                        buildNumber: (def as BuildDefinition).latestCompletedBuild?.buildNumber,
                        status: (def as BuildDefinition).latestCompletedBuild?.status,
                        result: (def as BuildDefinition).latestCompletedBuild?.result,
                        startTime: (def as BuildDefinition).latestCompletedBuild?.startTime,
                        finishTime: (def as BuildDefinition).latestCompletedBuild?.finishTime
                    } : null,
                    createdDate: def.createdDate,
                    authoredBy: def.authoredBy ? {
                        displayName: def.authoredBy.displayName,
                        uniqueName: def.authoredBy.uniqueName
                    } : null
                }
            });
        } catch (error: any) {
            this.error('Failed to get build definitions:', error.message);
            throw error;
        }
    }

    /**
     * Get detailed information about a specific build definition
     */
    async getBuildDefinitionDetails(definitionId: number, projectId: string | null = null): Promise<any> {
        try {
            const project = projectId || this.client.getProjectId();
            const buildApi: BuildApi = await this.client.getBuildApi();
            
            const definition: BuildDefinition = await buildApi.getDefinition(project, definitionId);
            
            this.log(`Retrieved details for build definition ${definitionId}`);
            
            return {
                id: definition.id,
                name: definition.name,
                description: definition.description,
                path: definition.path,
                repository: definition.repository,
                project: definition.project,
                process: definition.process,
                queue: definition.queue,
                triggers: definition.triggers,
                variables: definition.variables,
                demands: definition.demands,
                options: definition.options,
                retentionRules: definition.retentionRules,
                tags: definition.tags,
                properties: definition.properties,
                authoredBy: definition.authoredBy,
                createdDate: definition.createdDate,
                revision: definition.revision,
                uri: definition.uri,
                url: definition.url
            };
        } catch (error: any) {
            this.error(`Failed to get build definition details for ${definitionId}:`, error.message);
            throw error;
        }
    }

    /**
     * Search build definitions by name or path
     */
    async searchBuildDefinitions(searchTerm: string, projectId: string | null = null): Promise<any[]> {
        try {
            const allDefinitions = await this.getBuildDefinitions(projectId);
            
            if (!searchTerm) {
                return allDefinitions;
            }

            const searchLower = searchTerm.toLowerCase();
            const filtered = allDefinitions.filter(def => 
                def.name.toLowerCase().includes(searchLower) ||
                def.path.toLowerCase().includes(searchLower) ||
                (def.repository.name && def.repository.name.toLowerCase().includes(searchLower))
            );

            this.log(`Search for "${searchTerm}" returned ${filtered.length} results`);
            return filtered;
        } catch (error: any) {
            this.error('Failed to search build definitions:', error.message);
            throw error;
        }
    }

    /**
     * Get build definitions grouped by repository
     */
    async getBuildDefinitionsByRepository(projectId: string | null = null): Promise<{[key: string]: any[]}> {
        try {
            const definitions = await this.getBuildDefinitions(projectId);
            
            const grouped = definitions.reduce((acc, def) => {
                const repoName = def.repository?.name || 'Unknown Repository';
                if (!acc[repoName]) {
                    acc[repoName] = [];
                }
                acc[repoName].push(def);
                return acc;
            }, {} as {[key: string]: any[]});

            this.log(`Grouped ${definitions.length} definitions by repository`);
            return grouped;
        } catch (error: any) {
            this.error('Failed to group build definitions by repository:', error.message);
            throw error;
        }
    }

    /**
     * Get build definitions grouped by path/folder
     */
    async getBuildDefinitionsByPath(projectId: string | null = null): Promise<{[key: string]: any[]}> {
        try {
            const definitions = await this.getBuildDefinitions(projectId);
            
            const grouped = definitions.reduce((acc, def) => {
                const path = def.path || '\\';
                if (!acc[path]) {
                    acc[path] = [];
                }
                acc[path].push(def);
                return acc;
            }, {} as {[key: string]: any[]});

            this.log(`Grouped ${definitions.length} definitions by path`);
            return grouped;
        } catch (error: any) {
            this.error('Failed to group build definitions by path:', error.message);
            throw error;
        }
    }

    /**
     * Get build definition statistics and metrics
     */
    async getBuildDefinitionMetrics(definitionId: number, projectId: string | null = null, days = 30): Promise<any> {
        try {
            const project = projectId || this.client.getProjectId();
            const buildApi: BuildApi = await this.client.getBuildApi();
            
            // Get recent builds for this definition
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - days);
            
            const builds: Build[] = await buildApi.getBuilds(
                project,
                [definitionId], // definitions
                undefined, // queues
                undefined, // buildNumber
                startDate,
                endDate,
                undefined, // requestedFor
                undefined, // reasonFilter
                undefined, // statusFilter
                undefined, // resultFilter
                undefined, // tagFilters
                undefined, // properties
                100 // top
            );

            // Calculate metrics
            const metrics = {
                definitionId,
                totalBuilds: builds.length,
                successfulBuilds: builds.filter(b => b.result === 4 /* succeeded */).length,
                failedBuilds: builds.filter(b => b.result === 8 /* failed */).length,
                partiallySucceededBuilds: builds.filter(b => b.result === 2 /* partiallySucceeded */).length,
                canceledBuilds: builds.filter(b => b.result === 32 /* canceled */).length,
                successRate: builds.length > 0 ? 
                    Math.round((builds.filter(b => b.result === 4).length / builds.length) * 100) : 0,
                averageDuration: this.calculateAverageDuration(builds),
                lastBuild: builds.length > 0 ? builds[0] : null,
                buildFrequency: this.calculateBuildFrequency(builds, days),
                timeRange: {
                    start: startDate,
                    end: endDate,
                    days
                }
            };

            this.log(`Calculated metrics for definition ${definitionId}: ${metrics.successRate}% success rate`);
            return metrics;
        } catch (error: any) {
            this.error(`Failed to get metrics for definition ${definitionId}:`, error.message);
            throw error;
        }
    }

    /**
     * Get build history for a definition with pagination
     */
    async getBuildHistory(definitionId: number, projectId: string | null = null, options: any = {}): Promise<any[]> {
        try {
            const project = projectId || this.client.getProjectId();
            const buildApi: BuildApi = await this.client.getBuildApi();
            
            const {
                top = 50,
                statusFilter = undefined,
                resultFilter = undefined,
                reasonFilter = undefined,
                minTime = undefined,
                maxTime = undefined
            } = options;

            const builds: Build[] = await buildApi.getBuilds(
                project,
                [definitionId],
                undefined, // queues
                undefined, // buildNumber
                minTime,
                maxTime,
                undefined, // requestedFor
                reasonFilter,
                statusFilter,
                resultFilter,
                undefined, // tagFilters
                undefined, // properties
                top
            );

            this.log(`Retrieved ${builds.length} builds for definition ${definitionId}`);
            
            return builds.map(build => ({
                id: build.id,
                buildNumber: build.buildNumber,
                status: build.status,
                result: build.result,
                startTime: build.startTime,
                finishTime: build.finishTime,
                duration: this.calculateDuration(build.startTime, build.finishTime),
                sourceBranch: build.sourceBranch,
                sourceVersion: build.sourceVersion,
                requestedBy: build.requestedBy ? {
                    displayName: build.requestedBy.displayName,
                    uniqueName: build.requestedBy.uniqueName
                } : null,
                requestedFor: build.requestedFor ? {
                    displayName: build.requestedFor.displayName,
                    uniqueName: build.requestedFor.uniqueName
                } : null,
                reason: build.reason,
                tags: build.tags,
                uri: build.uri,
                url: build.url
            }));
        } catch (error: any) {
            this.error(`Failed to get build history for definition ${definitionId}:`, error.message);
            throw error;
        }
    }

    /**
     * Check if build definitions are actively used
     */
    async getActiveDefinitions(projectId: string | null = null, days = 30): Promise<any[]> {
        try {
            const definitions = await this.getBuildDefinitions(projectId);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);

            const activeDefinitions: any[] = [];
            
            for (const def of definitions) {
                if (def.lastBuild && new Date(def.lastBuild.startTime) > cutoffDate) {
                    const metrics = await this.getBuildDefinitionMetrics(def.id, projectId, days);
                    activeDefinitions.push({
                        ...def,
                        metrics
                    });
                }
            }

            this.log(`Found ${activeDefinitions.length} active definitions out of ${definitions.length} total`);
            return activeDefinitions;
        } catch (error: any) {
            this.error('Failed to get active definitions:', error.message);
            throw error;
        }
    }

    // Helper methods
    private calculateDuration(startTime: Date | undefined, finishTime: Date | undefined): number {
        if (!startTime || !finishTime) return 0;
        return Math.round((new Date(finishTime).getTime() - new Date(startTime).getTime()) / 1000);
    }

    private calculateAverageDuration(builds: Build[]): number {
        if (!builds || builds.length === 0) return 0;
        
        const completedBuilds = builds.filter(b => b.finishTime && b.startTime);
        if (completedBuilds.length === 0) return 0;
        
        const totalDuration = completedBuilds.reduce((sum, build) => {
            return sum + this.calculateDuration(build.startTime, build.finishTime);
        }, 0);
        
        return Math.round(totalDuration / completedBuilds.length);
    }

    private calculateBuildFrequency(builds: Build[], days: number): number {
        if (!builds || builds.length === 0) return 0;
        return Math.round((builds.length / days) * 10) / 10; // builds per day, rounded to 1 decimal
    }

    private log(...args: any[]): void {
        if (this.debug) {
            console.log('[ADO-BUILD-DEFINITION-SERVICE]', ...args);
        }
    }

    private error(...args: any[]): void {
        console.error('[ADO-BUILD-DEFINITION-SERVICE ERROR]', ...args);
    }
}

export default AdoBuildDefinitionService;
