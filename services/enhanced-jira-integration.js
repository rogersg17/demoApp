const EventEmitter = require('events');

class EnhancedJiraIntegration extends EventEmitter {
    constructor(database, testFailureProcessor = null) {
        super();
        this.db = database;
        this.testFailureProcessor = testFailureProcessor;
        this.debug = process.env.JIRA_DEBUG === 'true';
        
        // JIRA configuration
        this.jiraConfig = {
            url: process.env.JIRA_URL,
            username: process.env.JIRA_USERNAME,
            token: process.env.JIRA_API_TOKEN
        };
        
        if (!this.jiraConfig.url || !this.jiraConfig.username || !this.jiraConfig.token) {
            console.warn('⚠️ JIRA configuration incomplete. Set JIRA_URL, JIRA_USERNAME, and JIRA_API_TOKEN environment variables.');
        }
        
        this.jiraUrl = this.jiraConfig.url;
        this.jiraHeaders = {
            'Authorization': `Basic ${Buffer.from(`${this.jiraConfig.username}:${this.jiraConfig.token}`).toString('base64')}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        
        this.log('Enhanced JIRA Integration initialized');
    }

    /**
     * Create JIRA issue for test failure
     */
    async createIssueForFailure(failureId, options = {}) {
        try {
            const failure = await this.db.get(`
                SELECT 
                    tf.*,
                    pc.pipeline_name,
                    pc.organization_name,
                    pc.project_name,
                    pc.jira_project_key
                FROM mvp_test_failures tf
                LEFT JOIN mvp_pipeline_configs pc ON tf.pipeline_id = pc.id
                WHERE tf.id = ?
            `, [failureId]);

            if (!failure) {
                throw new Error(`Test failure not found: ${failureId}`);
            }

            const issueData = await this.buildJiraIssueData(failure, options);
            const createdIssue = { key: 'TEST-123', id: '12345' }; // Mock response
            await this.storeLinkage(failureId, createdIssue.key, createdIssue.id);

            this.emit('issue_created', {
                failureId,
                issueKey: createdIssue.key,
                issueId: createdIssue.id,
                testName: failure.test_name
            });

            return {
                success: true,
                issueKey: createdIssue.key,
                issueId: createdIssue.id,
                alreadyExists: false
            };

        } catch (error) {
            this.error('Failed to create JIRA issue for failure:', error);
            throw error;
        }
    }

    /**
     * Build JIRA issue data from test failure
     */
    async buildJiraIssueData(failure, options = {}) {
        const priority = this.determinePriority(failure);
        const labels = this.buildIssueLabels(failure, options.additionalLabels);
        
        return {
            fields: {
                project: { key: failure.jira_project_key || 'TEST' },
                summary: this.buildIssueSummary(failure),
                description: this.buildIssueDescription(failure),
                issuetype: { name: options.issueType || 'Bug' },
                priority: { name: priority },
                labels: labels
            }
        };
    }

    buildIssueSummary(failure) {
        return `Test Failure: ${failure.test_name}`;
    }

    buildIssueDescription(failure) {
        return `Test failure detected: ${failure.failure_message}`;
    }

    determinePriority(failure) {
        return 'Medium';
    }

    buildIssueLabels(failure, additionalLabels = []) {
        return ['automated', 'test-failure'];
    }

    buildAdoCustomFields(failure) {
        return {};
    }

    async storeLinkage(failureId, issueKey, issueId) {
        await this.db.run(`
            INSERT INTO mvp_jira_ado_links 
            (failure_id, jira_issue_key, jira_issue_id, created_at, last_updated)
            VALUES (?, ?, ?, ?, ?)
        `, [failureId, issueKey, issueId, new Date().toISOString(), new Date().toISOString()]);
    }

    async updateIssueFromFailure(failureId, updateData = {}) {
        return { success: true, issueKey: 'TEST-123' };
    }

    async getIssueForFailure(failureId) {
        return null;
    }

    log(...args) {
        if (this.debug) {
            console.log('[ENHANCED-JIRA]', ...args);
        }
    }

    error(...args) {
        console.error('[ENHANCED-JIRA ERROR]', ...args);
    }
}

module.exports = EnhancedJiraIntegration;
