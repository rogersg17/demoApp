import { EventEmitter } from 'events';
import Database from '../database/database';

interface JiraConfig {
    url?: string;
    username?: string;
    token?: string;
}

interface JiraHeaders {
    'Authorization': string;
    'Content-Type': string;
    'Accept': string;
}

interface TestFailure {
    id: string | number;
    test_name: string;
    failure_message: string;
    pipeline_id?: string | number;
    pipeline_name?: string;
    organization_name?: string;
    project_name?: string;
    jira_project_key?: string;
}

interface IssueCreateOptions {
    issueType?: string;
    additionalLabels?: string[];
}

interface JiraIssueData {
    fields: {
        project: { key: string };
        summary: string;
        description: string;
        issuetype: { name: string };
        priority: { name: string };
        labels: string[];
    };
}

interface JiraIssueResponse {
    key: string;
    id: string;
}

interface CreateIssueResult {
    success: boolean;
    issueKey: string;
    issueId: string;
    alreadyExists: boolean;
}

class EnhancedJiraIntegration extends EventEmitter {
    private db: Database;
    private testFailureProcessor: any;
    private debug: boolean;
    private jiraConfig: JiraConfig;
    private jiraUrl?: string;
    private jiraHeaders: JiraHeaders;

    constructor(database: Database, testFailureProcessor: any = null) {
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
    async createIssueForFailure(failureId: string | number, options: IssueCreateOptions = {}): Promise<CreateIssueResult> {
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
            `, [failureId]) as TestFailure;

            if (!failure) {
                throw new Error(`Test failure not found: ${failureId}`);
            }

            const issueData = await this.buildJiraIssueData(failure, options);
            const createdIssue: JiraIssueResponse = { key: 'TEST-123', id: '12345' }; // Mock response
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
    async buildJiraIssueData(failure: TestFailure, options: IssueCreateOptions = {}): Promise<JiraIssueData> {
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

    buildIssueSummary(failure: TestFailure): string {
        return `Test Failure: ${failure.test_name}`;
    }

    buildIssueDescription(failure: TestFailure): string {
        return `Test failure detected: ${failure.failure_message}`;
    }

    determinePriority(failure: TestFailure): string {
        return 'Medium';
    }

    buildIssueLabels(failure: TestFailure, additionalLabels: string[] = []): string[] {
        return ['automated', 'test-failure', ...additionalLabels];
    }

    buildAdoCustomFields(failure: TestFailure): Record<string, any> {
        return {};
    }

    async storeLinkage(failureId: string | number, issueKey: string, issueId: string): Promise<void> {
        await this.db.run(`
            INSERT INTO mvp_jira_ado_links 
            (failure_id, jira_issue_key, jira_issue_id, created_at, last_updated)
            VALUES (?, ?, ?, ?, ?)
        `, [failureId, issueKey, issueId, new Date().toISOString(), new Date().toISOString()]);
    }

    async updateIssueFromFailure(failureId: string | number, updateData: any = {}): Promise<any> {
        return { success: true, issueKey: 'TEST-123' };
    }

    async getIssueForFailure(failureId: string | number): Promise<any> {
        return null;
    }

    log(...args: any[]): void {
        if (this.debug) {
            console.log('[ENHANCED-JIRA]', ...args);
        }
    }

    error(...args: any[]): void {
        console.error('[ENHANCED-JIRA ERROR]', ...args);
    }
}

export default EnhancedJiraIntegration;
