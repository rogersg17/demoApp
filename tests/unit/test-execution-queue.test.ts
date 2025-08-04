import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Import the service (need to use require for CommonJS module)
const TestExecutionQueue = require('../../services/test-execution-queue.js');

describe('TestExecutionQueue', () => {
  let queue: any;

  beforeEach(() => {
    queue = new TestExecutionQueue();
  });

  afterEach(() => {
    if (queue && typeof queue.destroy === 'function') {
      queue.destroy();
    }
  });

  describe('queueExecution', () => {
    it('should queue a new test execution with valid data', () => {
      const requestData = {
        testFiles: ['test1.spec.ts', 'test2.spec.ts'],
        suite: 'integration',
        userId: 'user123',
        priority: 'high',
        environment: 'staging'
      };

      const executionId = queue.queueExecution(requestData);

      expect(executionId).toMatch(/^exec_\d+_[a-f0-9]{8}$/);
      expect(queue.queue.has(executionId)).toBe(true);
      expect(queue.activeExecutions.has(executionId)).toBe(true);

      const execution = queue.queue.get(executionId);
      expect(execution).toMatchObject({
        id: executionId,
        status: 'queued',
        priority: 'high',
        requestedBy: 'user123',
        testFiles: ['test1.spec.ts', 'test2.spec.ts'],
        suite: 'integration',
        environment: 'staging'
      });
      expect(execution.createdAt).toBeDefined();
      expect(execution.updatedAt).toBeDefined();
    });

    it('should use default values for optional fields', () => {
      const requestData = {
        testFiles: ['test.spec.ts'],
        userId: 'user123'
      };

      const executionId = queue.queueExecution(requestData);
      const execution = queue.queue.get(executionId);

      expect(execution.priority).toBe('normal');
      expect(execution.suite).toBe('default');
      expect(execution.environment).toBe('default');
      expect(execution.targetRunner).toBe('auto');
    });

    it('should emit "executionQueued" event', (done) => {
      const requestData = {
        testFiles: ['test.spec.ts'],
        userId: 'user123'
      };

      queue.on('executionQueued', (execution: any) => {
        expect(execution.status).toBe('queued');
        expect(execution.testFiles).toEqual(['test.spec.ts']);
        done();
      });

      queue.queueExecution(requestData);
    });
  });

  describe('updateExecutionStatus', () => {
    it('should update execution status successfully', () => {
      const requestData = {
        testFiles: ['test.spec.ts'],
        userId: 'user123'
      };

      const executionId = queue.queueExecution(requestData);
      const updated = queue.updateExecutionStatus(executionId, 'running', {
        startedAt: new Date().toISOString(),
        runnerId: 'runner-001'
      });

      expect(updated).toBe(true);
      const execution = queue.queue.get(executionId);
      expect(execution.status).toBe('running');
      expect(execution.startedAt).toBeDefined();
      expect(execution.runnerId).toBe('runner-001');
    });

    it('should return false for non-existent execution', () => {
      const updated = queue.updateExecutionStatus('invalid-id', 'running');
      expect(updated).toBe(false);
    });

    it('should emit "executionUpdated" event', (done) => {
      const requestData = {
        testFiles: ['test.spec.ts'],
        userId: 'user123'
      };

      const executionId = queue.queueExecution(requestData);

      queue.on('executionUpdated', (execution: any) => {
        expect(execution.status).toBe('running');
        expect(execution.id).toBe(executionId);
        done();
      });

      queue.updateExecutionStatus(executionId, 'running');
    });
  });

  describe('completeExecution', () => {
    it('should complete execution and move to history', () => {
      const requestData = {
        testFiles: ['test.spec.ts'],
        userId: 'user123'
      };

      const executionId = queue.queueExecution(requestData);
      const results = {
        passed: 5,
        failed: 1,
        skipped: 0,
        duration: 30000
      };

      const completed = queue.completeExecution(executionId, 'completed', results);

      expect(completed).toBe(true);
      expect(queue.activeExecutions.has(executionId)).toBe(false);
      expect(queue.executionHistory.length).toBe(1);

      const historyEntry = queue.executionHistory[0];
      expect(historyEntry.status).toBe('completed');
      expect(historyEntry.results).toEqual(results);
      expect(historyEntry.completedAt).toBeDefined();
    });

    it('should maintain history size limit', () => {
      // Set a small history limit for testing
      queue.maxHistorySize = 2;

      for (let i = 0; i < 5; i++) {
        const executionId = queue.queueExecution({
          testFiles: [`test${i}.spec.ts`],
          userId: 'user123'
        });
        queue.completeExecution(executionId, 'completed', { passed: 1 });
      }

      expect(queue.executionHistory.length).toBe(2);
    });

    it('should emit "executionCompleted" event', (done) => {
      const requestData = {
        testFiles: ['test.spec.ts'],
        userId: 'user123'
      };

      const executionId = queue.queueExecution(requestData);

      queue.on('executionCompleted', (execution: any) => {
        expect(execution.status).toBe('completed');
        expect(execution.id).toBe(executionId);
        done();
      });

      queue.completeExecution(executionId, 'completed', { passed: 1 });
    });
  });

  describe('getQueueStatus', () => {
    it('should return correct queue statistics', () => {
      // Add some executions
      queue.queueExecution({ testFiles: ['test1.spec.ts'], userId: 'user1' });
      const id2 = queue.queueExecution({ testFiles: ['test2.spec.ts'], userId: 'user2' });
      const id3 = queue.queueExecution({ testFiles: ['test3.spec.ts'], userId: 'user3' });

      // Update statuses
      queue.updateExecutionStatus(id2, 'running');
      queue.completeExecution(id3, 'completed', { passed: 1 });

      const status = queue.getQueueStatus();

      expect(status).toMatchObject({
        totalQueued: 1,
        totalRunning: 1,
        totalCompleted: 1,
        queueLength: 2,
        historyLength: 1
      });
      expect(status.uptime).toBeGreaterThan(0);
    });
  });

  describe('cancelExecution', () => {
    it('should cancel queued execution', () => {
      const executionId = queue.queueExecution({
        testFiles: ['test.spec.ts'],
        userId: 'user123'
      });

      const cancelled = queue.cancelExecution(executionId, 'Cancelled by user');

      expect(cancelled).toBe(true);
      const execution = queue.activeExecutions.get(executionId);
      expect(execution.status).toBe('cancelled');
      expect(execution.cancellationReason).toBe('Cancelled by user');
    });

    it('should return false for non-existent execution', () => {
      const cancelled = queue.cancelExecution('invalid-id', 'Test');
      expect(cancelled).toBe(false);
    });

    it('should not cancel completed executions', () => {
      const executionId = queue.queueExecution({
        testFiles: ['test.spec.ts'],
        userId: 'user123'
      });

      queue.completeExecution(executionId, 'completed', { passed: 1 });
      const cancelled = queue.cancelExecution(executionId, 'Test');

      expect(cancelled).toBe(false);
    });
  });

  describe('getNextExecution', () => {
    it('should return highest priority queued execution', () => {
      const lowId = queue.queueExecution({
        testFiles: ['test1.spec.ts'],
        userId: 'user1',
        priority: 'low'
      });
      const highId = queue.queueExecution({
        testFiles: ['test2.spec.ts'],
        userId: 'user2',
        priority: 'high'
      });
      const normalId = queue.queueExecution({
        testFiles: ['test3.spec.ts'],
        userId: 'user3',
        priority: 'normal'
      });

      const next = queue.getNextExecution();

      expect(next.id).toBe(highId);
      expect(next.priority).toBe('high');
    });

    it('should return null when no queued executions exist', () => {
      const next = queue.getNextExecution();
      expect(next).toBeNull();
    });

    it('should skip running executions', () => {
      const id1 = queue.queueExecution({
        testFiles: ['test1.spec.ts'],
        userId: 'user1'
      });
      const id2 = queue.queueExecution({
        testFiles: ['test2.spec.ts'],
        userId: 'user2'
      });

      queue.updateExecutionStatus(id1, 'running');
      const next = queue.getNextExecution();

      expect(next.id).toBe(id2);
    });
  });
});