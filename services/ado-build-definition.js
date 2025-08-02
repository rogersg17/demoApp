const AdoClient = require('../lib/ado-client');

class AdoBuildDefinitionService {
    constructor(client = null) {
        this.client = client || new AdoClient();
        this.debug = process.env.ADO_DEBUG === 'true';
    }

    /**
     * Get all build definitions from Azure DevOps
     */
    async getBuildDefinitions(projectId = null) {
        try {
            const project = projectId || this.client.projectId;
            const buildApi = await this.client.getBuildApi();
            
            const definitions = await buildApi.getDefinitions(
                project,
                null, // name filter
                null, // repositoryId
                null, // repositoryType
                null, // queryOrder
                null, // top
                null, // continuationToken
                null, // minMetricsTime
                null, // definitionIds
                null, // path
                null, // builtAfter
                null, // notBuiltAfter
                true  // includeAllProperties
            );

            this.log(`Found ${definitions.length} build definitions in project ${project}`);

            return definitions.map(def => ({
                id: def.id,
                name: def.name,
                path: def.path,
                repository: {
                    id: def.repository?.id,
                    name: def.repository?.name,
                    type: def.repository?.type,
                    url: def.repository?.url
                },
                project: {
                    id: def.project?.id,
                    name: def.project?.name
                },
                process: {
                    type: def.process?.type,
                    yamlFilename: def.process?.yamlFilename
                },
                queue: def.queue,
                triggers: def.triggers,
                lastBuild: def.latestBuild ? {
                    id: def.latestBuild.id,
                    buildNumber: def.latestBuild.buildNumber,
                    status: def.latestBuild.status,
                    result: def.latestBuild.result,
                    startTime: def.latestBuild.startTime,
                    finishTime: def.latestBuild.finishTime
                } : null,
                lastCompletedBuild: def.latestCompletedBuild ? {
                    id: def.latestCompletedBuild.id,
                    buildNumber: def.latestCompletedBuild.buildNumber,
                    status: def.latestCompletedBuild.status,
                    result: def.latestCompletedBuild.result,
                    startTime: def.latestCompletedBuild.startTime,
                    finishTime: def.latestCompletedBuild.finishTime
                } : null,
                createdDate: def.createdDate,
                authoredBy: def.authoredBy ? {
                    displayName: def.authoredBy.displayName,
                    uniqueName: def.authoredBy.uniqueName
                } : null
            }));
        } catch (error) {
            this.error('Failed to get build definitions:', error.message);
            throw error;
        }
    }

    /**
     * Get detailed information about a specific build definition
     */
    async getBuildDefinitionDetails(definitionId, projectId = null) {
        try {
            const project = projectId || this.client.projectId;
            const buildApi = await this.client.getBuildApi();
            
            const definition = await buildApi.getDefinition(project, definitionId);
            
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
        } catch (error) {
            this.error(`Failed to get build definition details for ${definitionId}:`, error.message);
            throw error;
        }
    }

    /**
     * Search build definitions by name or path
     */
    async searchBuildDefinitions(searchTerm, projectId = null) {
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
        } catch (error) {
            this.error('Failed to search build definitions:', error.message);
            throw error;
        }
    }

    /**
     * Get build definitions grouped by repository
     */
    async getBuildDefinitionsByRepository(projectId = null) {
        try {
            const definitions = await this.getBuildDefinitions(projectId);
            
            const grouped = definitions.reduce((acc, def) => {
                const repoName = def.repository?.name || 'Unknown Repository';
                if (!acc[repoName]) {
                    acc[repoName] = [];
                }
                acc[repoName].push(def);
                return acc;
            }, {});

            this.log(`Grouped ${definitions.length} definitions by repository`);
            return grouped;
        } catch (error) {
            this.error('Failed to group build definitions by repository:', error.message);
            throw error;
        }
    }

    /**
     * Get build definitions grouped by path/folder
     */
    async getBuildDefinitionsByPath(projectId = null) {
        try {
            const definitions = await this.getBuildDefinitions(projectId);
            
            const grouped = definitions.reduce((acc, def) => {
                const path = def.path || '\\';
                if (!acc[path]) {
                    acc[path] = [];
                }
                acc[path].push(def);
                return acc;
            }, {});

            this.log(`Grouped ${definitions.length} definitions by path`);
            return grouped;
        } catch (error) {
            this.error('Failed to group build definitions by path:', error.message);
            throw error;
        }
    }

    /**
     * Get build definition statistics and metrics
     */
    async getBuildDefinitionMetrics(definitionId, projectId = null, days = 30) {
        try {
            const project = projectId || this.client.projectId;
            const buildApi = await this.client.getBuildApi();
            
            // Get recent builds for this definition
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - days);
            
            const builds = await buildApi.getBuilds(
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
                successfulBuilds: builds.filter(b => b.result === 'succeeded').length,
                failedBuilds: builds.filter(b => b.result === 'failed').length,
                partiallySucceededBuilds: builds.filter(b => b.result === 'partiallySucceeded').length,
                canceledBuilds: builds.filter(b => b.result === 'canceled').length,
                successRate: builds.length > 0 ? 
                    Math.round((builds.filter(b => b.result === 'succeeded').length / builds.length) * 100) : 0,
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
        } catch (error) {
            this.error(`Failed to get metrics for definition ${definitionId}:`, error.message);
            throw error;
        }
    }

    /**
     * Get build history for a definition with pagination
     */
    async getBuildHistory(definitionId, projectId = null, options = {}) {
        try {
            const project = projectId || this.client.projectId;
            const buildApi = await this.client.getBuildApi();
            
            const {
                top = 50,
                statusFilter = undefined,
                resultFilter = undefined,
                reasonFilter = undefined,
                minTime = undefined,
                maxTime = undefined
            } = options;

            const builds = await buildApi.getBuilds(
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
        } catch (error) {
            this.error(`Failed to get build history for definition ${definitionId}:`, error.message);
            throw error;
        }
    }

    /**
     * Check if build definitions are actively used
     */
    async getActiveDefinitions(projectId = null, days = 30) {
        try {
            const definitions = await this.getBuildDefinitions(projectId);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);

            const activeDefinitions = [];
            
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
        } catch (error) {
            this.error('Failed to get active definitions:', error.message);
            throw error;
        }
    }

    // Helper methods
    calculateDuration(startTime, finishTime) {
        if (!startTime || !finishTime) return 0;
        return Math.round((new Date(finishTime) - new Date(startTime)) / 1000);
    }

    calculateAverageDuration(builds) {
        if (!builds || builds.length === 0) return 0;
        
        const completedBuilds = builds.filter(b => b.finishTime && b.startTime);
        if (completedBuilds.length === 0) return 0;
        
        const totalDuration = completedBuilds.reduce((sum, build) => {
            return sum + this.calculateDuration(build.startTime, build.finishTime);
        }, 0);
        
        return Math.round(totalDuration / completedBuilds.length);
    }

    calculateBuildFrequency(builds, days) {
        if (!builds || builds.length === 0) return 0;
        return Math.round((builds.length / days) * 10) / 10; // builds per day, rounded to 1 decimal
    }

    log(...args) {
        if (this.debug) {
            console.log('[ADO-BUILD-DEFINITION-SERVICE]', ...args);
        }
    }

    error(...args) {
        console.error('[ADO-BUILD-DEFINITION-SERVICE ERROR]', ...args);
    }
}

module.exports = AdoBuildDefinitionService;