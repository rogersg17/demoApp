const AdoClient = require('../lib/ado-client');

class MVPAdoConfigService {
    constructor(database) {
        this.db = database;
        this.debug = process.env.ADO_DEBUG === 'true';
    }

    /**
     * Get all pipeline configurations
     */
    async getPipelineConfigs(includeInactive = false) {
        return new Promise((resolve, reject) => {
            const query = includeInactive 
                ? 'SELECT * FROM mvp_pipeline_configs ORDER BY created_at DESC'
                : 'SELECT * FROM mvp_pipeline_configs WHERE active = 1 ORDER BY created_at DESC';

            this.db.db.all(query, (err, rows) => {
                if (err) {
                    this.error('Failed to get pipeline configs:', err);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    /**
     * Get a specific pipeline configuration
     */
    async getPipelineConfig(configId) {
        return new Promise((resolve, reject) => {
            this.db.db.get(
                'SELECT * FROM mvp_pipeline_configs WHERE id = ?',
                [configId],
                (err, row) => {
                    if (err) {
                        this.error('Failed to get pipeline config:', err);
                        reject(err);
                    } else {
                        resolve(row);
                    }
                }
            );
        });
    }

    /**
     * Create a new pipeline configuration
     */
    async createPipelineConfig(config, userId = null) {
        try {
            // Validate the configuration first
            const validation = await this.validatePipelineConfig(config);
            if (!validation.valid) {
                throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
            }

            return new Promise((resolve, reject) => {
                const {
                    name,
                    description,
                    ado_organization_url,
                    ado_project_id,
                    ado_project_name,
                    build_definition_id,
                    build_definition_name,
                    build_definition_path,
                    polling_interval_minutes = 5,
                    monitor_enabled = true,
                    failure_threshold = 1,
                    jira_project_key,
                    jira_issue_type = 'Bug',
                    auto_create_issues = true,
                    webhook_url,
                    notification_enabled = true
                } = config;

                const sql = `
                    INSERT INTO mvp_pipeline_configs (
                        name, description, ado_organization_url, ado_project_id, ado_project_name,
                        build_definition_id, build_definition_name, build_definition_path,
                        polling_interval_minutes, monitor_enabled, failure_threshold,
                        jira_project_key, jira_issue_type, auto_create_issues,
                        webhook_url, notification_enabled, created_by
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;

                const params = [
                    name, description, ado_organization_url, ado_project_id, ado_project_name,
                    build_definition_id, build_definition_name, build_definition_path,
                    polling_interval_minutes, monitor_enabled ? 1 : 0, failure_threshold,
                    jira_project_key, jira_issue_type, auto_create_issues ? 1 : 0,
                    webhook_url, notification_enabled ? 1 : 0, userId
                ];

                this.db.db.run(sql, params, function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({
                            id: this.lastID,
                            ...config,
                            created_at: new Date().toISOString()
                        });
                    }
                });
            });
        } catch (error) {
            this.error('Failed to create pipeline config:', error);
            throw error;
        }
    }

    /**
     * Update a pipeline configuration
     */
    async updatePipelineConfig(configId, updates, userId = null) {
        try {
            // Get existing config first
            const existing = await this.getPipelineConfig(configId);
            if (!existing) {
                throw new Error('Pipeline configuration not found');
            }

            // Merge updates with existing config
            const mergedConfig = { ...existing, ...updates };
            
            // Validate the merged configuration
            const validation = await this.validatePipelineConfig(mergedConfig);
            if (!validation.valid) {
                throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
            }

            return new Promise((resolve, reject) => {
                const updateFields = [];
                const params = [];

                // Build dynamic update query
                Object.keys(updates).forEach(key => {
                    if (key !== 'id' && key !== 'created_at' && key !== 'created_by') {
                        updateFields.push(`${key} = ?`);
                        params.push(updates[key]);
                    }
                });

                if (updateFields.length === 0) {
                    resolve(existing);
                    return;
                }

                updateFields.push('updated_at = CURRENT_TIMESTAMP');
                params.push(configId);

                const sql = `UPDATE mvp_pipeline_configs SET ${updateFields.join(', ')} WHERE id = ?`;

                this.db.db.run(sql, params, function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ ...existing, ...updates, updated_at: new Date().toISOString() });
                    }
                });
            });
        } catch (error) {
            this.error('Failed to update pipeline config:', error);
            throw error;
        }
    }

    /**
     * Delete a pipeline configuration
     */
    async deletePipelineConfig(configId) {
        return new Promise((resolve, reject) => {
            this.db.db.run(
                'DELETE FROM mvp_pipeline_configs WHERE id = ?',
                [configId],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ deleted: this.changes > 0, changes: this.changes });
                    }
                }
            );
        });
    }

    /**
     * Validate pipeline configuration
     */
    async validatePipelineConfig(config) {
        const errors = [];

        // Required fields validation
        if (!config.name) errors.push('Name is required');
        if (!config.ado_organization_url) errors.push('ADO organization URL is required');
        if (!config.ado_project_id) errors.push('ADO project ID is required');
        if (!config.ado_project_name) errors.push('ADO project name is required');
        if (!config.build_definition_id) errors.push('Build definition ID is required');
        if (!config.build_definition_name) errors.push('Build definition name is required');

        // Format validation
        if (config.ado_organization_url && !config.ado_organization_url.startsWith('https://')) {
            errors.push('ADO organization URL must start with https://');
        }

        if (config.polling_interval_minutes && (config.polling_interval_minutes < 1 || config.polling_interval_minutes > 60)) {
            errors.push('Polling interval must be between 1 and 60 minutes');
        }

        if (config.failure_threshold && config.failure_threshold < 1) {
            errors.push('Failure threshold must be at least 1');
        }

        // ADO connectivity validation (if we have enough info)
        if (config.ado_organization_url && config.ado_project_id && config.build_definition_id) {
            try {
                const result = await this.testAdoConnection(config);
                if (!result.success) {
                    errors.push(`ADO connection test failed: ${result.error}`);
                }
            } catch (error) {
                errors.push(`ADO connection test error: ${error.message}`);
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Test ADO connection for a configuration
     */
    async testAdoConnection(config) {
        try {
            const adoClient = new AdoClient({
                orgUrl: config.ado_organization_url,
                pat: process.env.ADO_PAT,
                projectId: config.ado_project_id
            });

            // Test basic connection
            const connectionTest = await adoClient.testConnection();
            if (!connectionTest.success) {
                return {
                    success: false,
                    error: `Connection failed: ${connectionTest.error}`
                };
            }

            // Test build definition access
            const buildDefTest = await adoClient.validateBuildDefinitionAccess(
                config.build_definition_id,
                config.ado_project_id
            );

            if (!buildDefTest.success) {
                return {
                    success: false,
                    error: `Build definition access failed: ${buildDefTest.error}`
                };
            }

            return {
                success: true,
                message: 'ADO connection and build definition access validated',
                details: {
                    definition: buildDefTest.definition,
                    recentBuildsCount: buildDefTest.recentBuildsCount
                }
            };
        } catch (error) {
            this.error('ADO connection test failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get ADO organizations (requires ADO PAT to be configured)
     */
    async getAdoOrganizations() {
        try {
            // Use a generic client to get organizations
            const adoClient = new AdoClient({
                orgUrl: process.env.ADO_ORGANIZATION || 'https://dev.azure.com/placeholder',
                pat: process.env.ADO_PAT
            });

            return await adoClient.getOrganizations();
        } catch (error) {
            this.error('Failed to get ADO organizations:', error);
            throw new Error(`Failed to get ADO organizations: ${error.message}`);
        }
    }

    /**
     * Get ADO projects for an organization
     */
    async getAdoProjects(organizationUrl) {
        try {
            const adoClient = new AdoClient({
                orgUrl: organizationUrl,
                pat: process.env.ADO_PAT
            });

            return await adoClient.getProjects();
        } catch (error) {
            this.error('Failed to get ADO projects:', error);
            throw new Error(`Failed to get ADO projects: ${error.message}`);
        }
    }

    /**
     * Get build definitions for a project
     */
    async getAdoBuildDefinitions(organizationUrl, projectId) {
        try {
            const adoClient = new AdoClient({
                orgUrl: organizationUrl,
                pat: process.env.ADO_PAT,
                projectId: projectId
            });

            return await adoClient.getBuildDefinitions(projectId);
        } catch (error) {
            this.error('Failed to get ADO build definitions:', error);
            throw new Error(`Failed to get ADO build definitions: ${error.message}`);
        }
    }

    /**
     * Update last monitored time for a pipeline config
     */
    async updateLastMonitoredTime(configId) {
        return new Promise((resolve, reject) => {
            this.db.db.run(
                'UPDATE mvp_pipeline_configs SET last_monitored_at = CURRENT_TIMESTAMP WHERE id = ?',
                [configId],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ updated: this.changes > 0 });
                    }
                }
            );
        });
    }

    /**
     * Get pipeline health summary
     */
    async getPipelineHealthSummary() {
        return new Promise((resolve, reject) => {
            this.db.db.all(
                'SELECT * FROM mvp_pipeline_health_summary',
                (err, rows) => {
                    if (err) {
                        this.error('Failed to get pipeline health summary:', err);
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                }
            );
        });
    }

    /**
     * Toggle pipeline monitoring
     */
    async togglePipelineMonitoring(configId, enabled) {
        return this.updatePipelineConfig(configId, { monitor_enabled: enabled ? 1 : 0 });
    }

    /**
     * Log debug information
     */
    log(...args) {
        if (this.debug) {
            console.log('[MVP-ADO-CONFIG]', ...args);
        }
    }

    /**
     * Log error information
     */
    error(...args) {
        console.error('[MVP-ADO-CONFIG ERROR]', ...args);
    }
}

module.exports = MVPAdoConfigService;
