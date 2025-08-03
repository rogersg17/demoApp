const crypto = require('crypto');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const EventEmitter = require('events');

/**
 * Git Integration Service
 * Handles Git webhook processing, repository scanning, and change detection
 * Part of ADR-001 implementation for test code and metadata separation
 */
class GitIntegrationService extends EventEmitter {
  constructor(database) {
    super();
    this.db = database;
    this.repositories = new Map();
  }

  /**
   * Register a Git repository for monitoring
   */
  async registerRepository(repositoryConfig) {
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
  async processWebhook(headers, payload, repositoryId) {
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
  verifyWebhookSignature(payload, signature, secret) {
    if (!signature || !secret) return false;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
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
  parseWebhookPayload(payload, headers) {
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
  detectGitProvider(userAgent, headers) {
    if (headers['x-github-event']) return 'github';
    if (headers['x-gitlab-event']) return 'gitlab';
    if (userAgent.includes('Bitbucket')) return 'bitbucket';
    return 'generic';
  }

  /**
   * Check if webhook contains test file changes
   */
  hasTestFileChanges(webhookData) {
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

      if (allFiles.some(file => testFilePatterns.some(pattern => pattern.test(file)))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Process test file changes from webhook
   */
  async processTestFileChanges(repositoryId, webhookData) {
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
  extractTestFileChanges(webhookData) {
    const changes = [];
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
  async processTestFileChange(repositoryId, change) {
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
  async handleTestFileAdded(repositoryId, change) {
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
  async handleTestFileModified(repositoryId, change) {
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
  async handleTestFileRemoved(repositoryId, change) {
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
  async getRepository(repositoryId) {
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
  async updateRepository(repositoryId, updates) {
    return await this.db.updateGitRepository(repositoryId, updates);
  }

  /**
   * Remove repository registration
   */
  async removeRepository(repositoryId) {
    // Remove from memory
    this.repositories.delete(repositoryId);
    
    // Remove from database
    return await this.db.deleteGitRepository(repositoryId);
  }
}

module.exports = GitIntegrationService;
