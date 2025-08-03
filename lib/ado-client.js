const { WebApi, getPersonalAccessTokenHandler } = require('azure-devops-node-api');

class AdoClient {
    constructor(options = {}) {
        this.orgUrl = options.orgUrl || process.env.ADO_ORGANIZATION;
        this.pat = options.pat || process.env.ADO_PAT;
        this.projectId = options.projectId || process.env.ADO_PROJECT;
        
        if (!this.orgUrl || !this.pat) {
            throw new Error('Azure DevOps organization URL and PAT are required');
        }
        
        this.authHandler = getPersonalAccessTokenHandler(this.pat);
        this.connection = new WebApi(this.orgUrl, this.authHandler);
        this.debug = process.env.ADO_DEBUG === 'true';
    }

    /**
     * Get Work Item Tracking API client
     */
    async getWorkItemTrackingApi() {
        return await this.connection.getWorkItemTrackingApi();
    }

    /**
     * Get Test Management API client
     */
    async getTestApi() {
        return await this.connection.getTestApi();
    }

    /**
     * Get Build API client
     */
    async getBuildApi() {
        return await this.connection.getBuildApi();
    }

    /**
     * Get Release API client
     */
    async getReleaseApi() {
        return await this.connection.getReleaseApi();
    }

    /**
     * Get Git API client
     */
    async getGitApi() {
        return await this.connection.getGitApi();
    }

    /**
     * Test the connection to Azure DevOps
     */
    async testConnection() {
        try {
            const workItemApi = await this.getWorkItemTrackingApi();
            const projects = await workItemApi.getProjects();
            
            if (this.debug) {
                console.log('✅ ADO Connection successful');
                console.log('📁 Available projects:', projects.map(p => p.name).join(', '));
            }
            
            return {
                success: true,
                projects: projects.map(p => ({ id: p.id, name: p.name }))
            };
        } catch (error) {
            if (this.debug) {
                console.error('❌ ADO Connection failed:', error.message);
            }
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get project information
     */
    async getProject(projectName = null) {
        try {
            const workItemApi = await this.getWorkItemTrackingApi();
            const projects = await workItemApi.getProjects();
            
            if (projectName) {
                return projects.find(p => p.name === projectName || p.id === projectName);
            }
            
            return projects.find(p => p.name === this.projectId || p.id === this.projectId);
        } catch (error) {
            throw new Error(`Failed to get project: ${error.message}`);
        }
    }

    /**
     * Validate required scopes/permissions
     */
    async validatePermissions() {
        const validations = [];

        try {
            // Test Work Item access
            const workItemApi = await this.getWorkItemTrackingApi();
            await workItemApi.getWorkItemTypes(this.projectId);
            validations.push({ scope: 'Work Items', status: 'success' });
        } catch (error) {
            validations.push({ scope: 'Work Items', status: 'failed', error: error.message });
        }

        try {
            // Test Test Management access
            const testApi = await this.getTestApi();
            await testApi.getTestPlans(this.projectId);
            validations.push({ scope: 'Test Management', status: 'success' });
        } catch (error) {
            validations.push({ scope: 'Test Management', status: 'failed', error: error.message });
        }

        try {
            // Test Build access
            const buildApi = await this.getBuildApi();
            await buildApi.getBuilds(this.projectId, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 1);
            validations.push({ scope: 'Build', status: 'success' });
        } catch (error) {
            validations.push({ scope: 'Build', status: 'failed', error: error.message });
        }

        return validations;
    }

    /**
     * Get all build definitions for a project
     */
    async getBuildDefinitions(projectId = null) {
        try {
            const buildApi = await this.getBuildApi();
            const project = projectId || this.projectId;
            
            const definitions = await buildApi.getDefinitions(project);
            
            return definitions.map(def => ({
                id: def.id,
                name: def.name,
                path: def.path,
                type: def.type,
                quality: def.quality,
                project: {
                    id: def.project.id,
                    name: def.project.name
                },
                repository: def.repository ? {
                    id: def.repository.id,
                    name: def.repository.name,
                    type: def.repository.type,
                    url: def.repository.url
                } : null,
                queue: def.queue ? {
                    id: def.queue.id,
                    name: def.queue.name
                } : null,
                createdDate: def.createdDate,
                revision: def.revision,
                _links: def._links
            }));
        } catch (error) {
            this.error('Failed to get build definitions:', error.message);
            throw new Error(`Failed to get build definitions: ${error.message}`);
        }
    }

    /**
     * Get a specific build definition by ID
     */
    async getBuildDefinition(definitionId, projectId = null) {
        try {
            const buildApi = await this.getBuildApi();
            const project = projectId || this.projectId;
            
            const definition = await buildApi.getDefinition(project, definitionId);
            
            return {
                id: definition.id,
                name: definition.name,
                path: definition.path,
                type: definition.type,
                quality: definition.quality,
                project: {
                    id: definition.project.id,
                    name: definition.project.name
                },
                repository: definition.repository ? {
                    id: definition.repository.id,
                    name: definition.repository.name,
                    type: definition.repository.type,
                    url: definition.repository.url,
                    defaultBranch: definition.repository.defaultBranch
                } : null,
                process: definition.process,
                queue: definition.queue,
                variables: definition.variables,
                triggers: definition.triggers,
                createdDate: definition.createdDate,
                revision: definition.revision,
                _links: definition._links
            };
        } catch (error) {
            this.error(`Failed to get build definition ${definitionId}:`, error.message);
            throw new Error(`Failed to get build definition: ${error.message}`);
        }
    }

    /**
     * Get builds for a specific definition
     */
    async getBuildsForDefinition(definitionId, options = {}) {
        try {
            const buildApi = await this.getBuildApi();
            const project = options.projectId || this.projectId;
            
            const {
                top = 50,
                statusFilter = null,
                resultFilter = null,
                branchName = null,
                minTime = null,
                maxTime = null
            } = options;

            const builds = await buildApi.getBuilds(
                project,
                [definitionId], // definitions
                null, // queues
                null, // buildNumber
                minTime, // minTime
                maxTime, // maxTime
                null, // requestedFor
                null, // reasonFilter
                statusFilter, // statusFilter
                resultFilter, // resultFilter
                null, // tagFilters
                null, // properties
                top, // top
                null, // continuationToken
                null, // maxBuildsPerDefinition
                null, // deletedFilter
                null, // queryOrder
                branchName // branchName
            );

            return builds.map(build => ({
                id: build.id,
                buildNumber: build.buildNumber,
                status: build.status,
                result: build.result,
                queueTime: build.queueTime,
                startTime: build.startTime,
                finishTime: build.finishTime,
                url: build.url,
                definition: {
                    id: build.definition.id,
                    name: build.definition.name
                },
                project: {
                    id: build.project.id,
                    name: build.project.name
                },
                requestedFor: build.requestedFor,
                requestedBy: build.requestedBy,
                sourceBranch: build.sourceBranch,
                sourceVersion: build.sourceVersion,
                priority: build.priority,
                reason: build.reason,
                tags: build.tags || [],
                _links: build._links
            }));
        } catch (error) {
            this.error(`Failed to get builds for definition ${definitionId}:`, error.message);
            throw new Error(`Failed to get builds for definition: ${error.message}`);
        }
    }

    /**
     * Get a specific build by ID
     */
    async getBuild(buildId, projectId = null) {
        try {
            const buildApi = await this.getBuildApi();
            const project = projectId || this.projectId;
            
            const build = await buildApi.getBuild(project, buildId);
            
            return {
                id: build.id,
                buildNumber: build.buildNumber,
                status: build.status,
                result: build.result,
                queueTime: build.queueTime,
                startTime: build.startTime,
                finishTime: build.finishTime,
                url: build.url,
                definition: build.definition,
                project: build.project,
                requestedFor: build.requestedFor,
                requestedBy: build.requestedBy,
                sourceBranch: build.sourceBranch,
                sourceVersion: build.sourceVersion,
                priority: build.priority,
                reason: build.reason,
                validationResults: build.validationResults,
                plans: build.plans,
                logs: build.logs,
                repository: build.repository,
                keepForever: build.keepForever,
                retainedByRelease: build.retainedByRelease,
                triggeredByBuild: build.triggeredByBuild,
                tags: build.tags || [],
                _links: build._links
            };
        } catch (error) {
            this.error(`Failed to get build ${buildId}:`, error.message);
            throw new Error(`Failed to get build: ${error.message}`);
        }
    }

    /**
     * Get test results for a build
     */
    async getTestResultsForBuild(buildId, projectId = null) {
        try {
            const testApi = await this.getTestApi();
            const project = projectId || this.projectId;
            
            // First get test runs for the build
            const testRuns = await testApi.getTestRuns(project, buildId);
            
            const allResults = [];
            
            for (const run of testRuns) {
                const results = await testApi.getTestResults(project, run.id);
                
                for (const result of results) {
                    allResults.push({
                        id: result.id,
                        testCaseTitle: result.testCaseTitle,
                        automatedTestName: result.automatedTestName,
                        testCaseReferenceId: result.testCaseReferenceId,
                        outcome: result.outcome,
                        state: result.state,
                        priority: result.priority,
                        failureType: result.failureType,
                        errorMessage: result.errorMessage,
                        stackTrace: result.stackTrace,
                        startedDate: result.startedDate,
                        completedDate: result.completedDate,
                        durationInMs: result.durationInMs,
                        runBy: result.runBy,
                        testRun: {
                            id: run.id,
                            name: run.name,
                            url: run.url,
                            buildConfiguration: run.buildConfiguration
                        },
                        build: {
                            id: buildId
                        },
                        project: {
                            id: project
                        }
                    });
                }
            }
            
            return allResults;
        } catch (error) {
            this.error(`Failed to get test results for build ${buildId}:`, error.message);
            throw new Error(`Failed to get test results: ${error.message}`);
        }
    }

    /**
     * Test connection to ADO and validate build definition access
     */
    async validateBuildDefinitionAccess(definitionId, projectId = null) {
        try {
            const project = projectId || this.projectId;
            
            // Try to get the build definition
            const definition = await this.getBuildDefinition(definitionId, project);
            
            // Try to get recent builds
            const builds = await this.getBuildsForDefinition(definitionId, { 
                projectId: project, 
                top: 5 
            });
            
            this.log(`✅ Build definition access validated for ${definition.name}`);
            
            return {
                success: true,
                definition: definition,
                recentBuildsCount: builds.length,
                canAccessBuilds: true,
                canAccessTestResults: true // We'll validate this separately if needed
            };
        } catch (error) {
            this.error(`❌ Build definition access validation failed:`, error.message);
            
            return {
                success: false,
                error: error.message,
                canAccessBuilds: false,
                canAccessTestResults: false
            };
        }
    }

    /**
     * Get organizations accessible to the current user
     */
    async getOrganizations() {
        try {
            const coreApi = await this.connection.getCoreApi();
            const projects = await coreApi.getProjects();
            
            // Extract unique organizations from project URLs
            const organizations = new Set();
            
            for (const project of projects) {
                if (project.url) {
                    const match = project.url.match(/https:\/\/dev\.azure\.com\/([^\/]+)/);
                    if (match) {
                        organizations.add(match[1]);
                    }
                }
            }
            
            return Array.from(organizations).map(org => ({
                name: org,
                url: `https://dev.azure.com/${org}`
            }));
        } catch (error) {
            this.error('Failed to get organizations:', error.message);
            throw new Error(`Failed to get organizations: ${error.message}`);
        }
    }

    /**
     * Get projects for the current organization
     */
    async getProjects() {
        try {
            const coreApi = await this.connection.getCoreApi();
            const projects = await coreApi.getProjects();
            
            return projects.map(project => ({
                id: project.id,
                name: project.name,
                description: project.description,
                url: project.url,
                state: project.state,
                revision: project.revision,
                visibility: project.visibility,
                lastUpdateTime: project.lastUpdateTime
            }));
        } catch (error) {
            this.error('Failed to get projects:', error.message);
            throw new Error(`Failed to get projects: ${error.message}`);
        }
    }

    /**
     * Log debug information
     */
    log(...args) {
        if (this.debug) {
            console.log('[ADO-CLIENT]', ...args);
        }
    }

    /**
     * Log error information
     */
    error(...args) {
        console.error('[ADO-CLIENT ERROR]', ...args);
    }
}

module.exports = AdoClient;
