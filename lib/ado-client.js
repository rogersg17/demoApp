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
