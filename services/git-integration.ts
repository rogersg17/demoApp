import * as crypto from 'crypto';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import { promises as fs } from 'fs';
import { EventEmitter } from 'events';
import db from '../database';
import { Database } from '../database';

interface RepositoryConfig {
  name: string;
  url: string;
  defaultBranch?: string;
  webhookSecret?: string;
}

interface RepositoryInfo {
  id: string | number;
  name: string;
  url: string;
  defaultBranch: string;
  webhookSecret?: string;
  lastSync: Date;
}

interface CommitAuthor {
    name: string;
    email: string;
}

interface WebhookPayload {
  ref?: string;
  before?: string;
  after?: string;
  commits?: CommitInfo[];
  repository?: {
    name: string;
    url: string;
  };
  pusher?: {
    name: string;
    email: string;
  };
}

interface CommitInfo {
  id: string;
  message: string;
  timestamp: string;
  author: CommitAuthor;
  added: string[];
  removed: string[];
  modified: string[];
}

interface FileChange {
  path: string;
  type: 'added' | 'modified' | 'removed';
  content?: string;
}

interface ScanResult {
  testFiles: string[];
  sourceFiles: string[];
  changes: FileChange[];
  commit: string;
}

interface WebhookChange {
    type: 'added' | 'modified' | 'removed';
    file: string;
    commit: string;
    author: CommitAuthor;
    message: string;
    timestamp: string;
}

/**
 * Git Integration Service
 * Handles Git webhook processing, repository scanning, and change detection
 * Part of ADR-001 implementation for test code and metadata separation
 */
class GitIntegrationService extends EventEmitter {
  private db: Database;
  private repositories: Map<string | number, RepositoryInfo>;

  constructor() {
    super();
    this.db = db;
    this.repositories = new Map();
  }

  /**
   * Register a Git repository for monitoring
   */
  async registerRepository(repositoryConfig: RepositoryConfig): Promise<string | number> {
    const { name, url, defaultBranch = 'main', webhookSecret } = repositoryConfig;
    
    try {
      const repositoryId = await this.db.createGitRepository({
        name,
        url,
        default_branch: defaultBranch,
        webhook_secret: webhookSecret
      });

      this.repositories.set(repositoryId, {
        id: repositoryId,
        name,
        url,
        defaultBranch,
        webhookSecret,
        lastSync: new Date()
      });

      console.log(`✅ Registered Git repository: ${name} (ID: ${repositoryId})`);
      return repositoryId;
    } catch (error) {
      console.error(`❌ Failed to register repository ${name}:`, error);
      throw error;
    }
  }

  /**
   * Process incoming Git webhook
   */
  async processWebhook(headers: any, payload: any, repositoryId: number): Promise<any> {
    try {
      const repository = await this.db.getGitRepository(repositoryId);
      if (!repository) {
        throw new Error(`Repository not found: ${repositoryId}`);
      }

      // Verify webhook signature if secret is configured
      if (repository.webhook_secret) {
        const signature = headers['x-hub-signature-256'] || headers['x-gitlab-token'];
        if (!this.verifyWebhookSignature(payload, signature, repository.webhook_secret)) {
          throw new Error('Invalid webhook signature');
        }
      }

      // Parse webhook payload
      const webhookData = this.parseWebhookPayload(payload, headers);
      
      // Update repository last sync
      await this.db.updateGitRepositorySync(repositoryId);

      // Process changes if they affect test files
      if (this.hasTestFileChanges(webhookData)) {
        await this.processTestFileChanges(repositoryId, webhookData);
      }

      this.emit('webhook-processed', {
        repositoryId,
        webhookData,
        timestamp: new Date()
      });

      return { success: true, processed: true };
    } catch (error) {
      console.error('Webhook processing error:', error);
      throw error;
    }
  }

  /**
   * Verify webhook signature for security
   */
  verifyWebhookSignature(payload: any, signature: string, secret: string) {
    if (!signature || !secret) return false;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload), 'utf8')
      .digest('hex');

    const providedSignature = signature.replace('sha256=', '');
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(providedSignature, 'hex')
    );
  }

  /**
   * Parse webhook payload from different Git providers
   */
  parseWebhookPayload(payload: any, headers: any) {
    const userAgent = headers['user-agent'] || '';
    const eventType = headers['x-github-event'] || headers['x-gitlab-event'] || 'push';

    let data;
    try {
      data = typeof payload === 'string' ? JSON.parse(payload) : payload;
    } catch (error) {
      throw new Error('Invalid JSON payload');
    }

    // Normalize webhook data across different providers
    return {
      provider: this.detectGitProvider(userAgent, headers),
      eventType,
      repository: data.repository,
      commits: data.commits || [],
      ref: data.ref,
      before: data.before,
      after: data.after,
      pusher: data.pusher || data.user_name,
      timestamp: new Date(data.timestamp || Date.now())
    };
  }

  /**
   * Detect Git provider from webhook headers
   */
  detectGitProvider(userAgent: string, headers: any) {
    if (headers['x-github-event']) return 'github';
    if (headers['x-gitlab-event']) return 'gitlab';
    if (userAgent.includes('Bitbucket')) return 'bitbucket';
    return 'generic';
  }

  /**
   * Check if webhook contains test file changes
   */
  hasTestFileChanges(webhookData: any) {
    const testFilePatterns = [
      /\.spec\.(js|ts|jsx|tsx)$/,
      /\.test\.(js|ts|jsx|tsx)$/,
      /tests?\//,
      /__tests__\//,
      /\.e2e\.(js|ts)$/
    ];

    for (const commit of webhookData.commits) {
      const allFiles = [
        ...(commit.added || []),
        ...(commit.modified || []),
        ...(commit.removed || [])
      ];

      if (allFiles.some((file: string) => testFilePatterns.some(pattern => pattern.test(file)))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Process test file changes from webhook
   */
  async processTestFileChanges(repositoryId: number, webhookData: any) {
    try {
      const changes = this.extractTestFileChanges(webhookData);
      
      console.log(`📁 Processing ${changes.length} test file changes for repository ${repositoryId}`);

      for (const change of changes) {
        await this.processTestFileChange(repositoryId, change);
      }

      this.emit('test-files-changed', {
        repositoryId,
        changes,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Error processing test file changes:', error);
      throw error;
    }
  }

  /**
   * Extract test file changes from webhook data
   */
  extractTestFileChanges(webhookData: any): WebhookChange[] {
    const changes: WebhookChange[] = [];
    const testFilePatterns = [
      /\.spec\.(js|ts|jsx|tsx)$/,
      /\.test\.(js|ts|jsx|tsx)$/,
      /tests?\//,
      /__tests__\//,
      /\.e2e\.(js|ts)$/
    ];

    for (const commit of webhookData.commits) {
      // Added files
      for (const file of commit.added || []) {
        if (testFilePatterns.some(pattern => pattern.test(file))) {
          changes.push({
            type: 'added',
            file,
            commit: commit.id,
            author: commit.author,
            message: commit.message,
            timestamp: commit.timestamp
          });
        }
      }

      // Modified files
      for (const file of commit.modified || []) {
        if (testFilePatterns.some(pattern => pattern.test(file))) {
          changes.push({
            type: 'modified',
            file,
            commit: commit.id,
            author: commit.author,
            message: commit.message,
            timestamp: commit.timestamp
          });
        }
      }

      // Removed files
      for (const file of commit.removed || []) {
        if (testFilePatterns.some(pattern => pattern.test(file))) {
          changes.push({
            type: 'removed',
            file,
            commit: commit.id,
            author: commit.author,
            message: commit.message,
            timestamp: commit.timestamp
          });
        }
      }
    }

    return changes;
  }

  /**
   * Process individual test file change
   */
  async processTestFileChange(repositoryId: number, change: WebhookChange) {
    try {
      switch (change.type) {
        case 'added':
          await this.handleTestFileAdded(repositoryId, change);
          break;
        case 'modified':
          await this.handleTestFileModified(repositoryId, change);
          break;
        case 'removed':
          await this.handleTestFileRemoved(repositoryId, change);
          break;
      }
    } catch (error) {
      console.error(`Error processing ${change.type} test file ${change.file}:`, error);
    }
  }

  /**
   * Handle new test file addition
   */
  async handleTestFileAdded(repositoryId: number, change: WebhookChange) {
    console.log(`➕ Test file added: ${change.file}`);
    
    // Emit event for test discovery service to scan the new file
    this.emit('test-file-added', {
      repositoryId,
      filePath: change.file,
      commit: change.commit,
      author: change.author,
      timestamp: change.timestamp
    });
  }

  /**
   * Handle test file modification
   */
  async handleTestFileModified(repositoryId: number, change: WebhookChange) {
    console.log(`📝 Test file modified: ${change.file}`);
    
    // Emit event for test discovery service to rescan the file
    this.emit('test-file-modified', {
      repositoryId,
      filePath: change.file,
      commit: change.commit,
      author: change.author,
      timestamp: change.timestamp
    });
  }

  /**
   * Handle test file removal
   */
  async handleTestFileRemoved(repositoryId: number, change: WebhookChange) {
    console.log(`🗑️ Test file removed: ${change.file}`);
    
    // Mark associated test metadata as inactive
    await this.db.deactivateTestsByFilePath(repositoryId, change.file);
    
    this.emit('test-file-removed', {
      repositoryId,
      filePath: change.file,
      commit: change.commit,
      author: change.author,
      timestamp: change.timestamp
    });
  }

  /**
   * Get repository information
   */
  async getRepository(repositoryId: number) {
    return await this.db.getGitRepository(repositoryId);
  }

  /**
   * List all registered repositories
   */
  async listRepositories() {
    return await this.db.getAllGitRepositories();
  }

  /**
   * Update repository configuration
   */
  async updateRepository(repositoryId: number, updates: any) {
    return await this.db.updateGitRepository(repositoryId, updates);
  }

  /**
   * Remove repository registration
   */
  async removeRepository(repositoryId: number) {
    // Remove from memory
    this.repositories.delete(repositoryId);
    
    // Remove from database
    return await this.db.deleteGitRepository(repositoryId);
  }
}

export default GitIntegrationService;
