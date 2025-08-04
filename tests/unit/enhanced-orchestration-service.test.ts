import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
const mockPrisma = {
  testExecution: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn()
  },
  testRunner: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn()
  },
  executionQueue: {
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  $disconnect: jest.fn()
} as any;

// Mock the prisma import
jest.mock('../../../lib/prisma', () => mockPrisma);

// Import the service after mocking
const EnhancedOrchestrationService = require('../../services/enhanced-orchestration-service.ts');

describe('EnhancedOrchestrationService', () => {
  let service: any;

  beforeEach(() => {
    service = new EnhancedOrchestrationService();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    if (service && typeof service.destroy === 'function') {
      await service.destroy();
    }
  });

  describe('createExecution', () => {
    it('should create a new test execution', async () => {
      const mockExecution = {
        id: 'test-exec-1',
        execution_id: 'exec_123',
        test_suite: 'integration',
        environment: 'staging',
        status: 'queued',
        priority: 3,
        created_at: new Date(),
        metadata: JSON.stringify({ tags: ['api'] })
      };

      mockPrisma.testExecution.create.mockResolvedValue(mockExecution);

      const executionData = {
        testSuite: 'integration',
        environment: 'staging',
        priority: 3,
        metadata: { tags: ['api'] }
      };

      const result = await service.createExecution(executionData);

      expect(mockPrisma.testExecution.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          test_suite: 'integration',
          environment: 'staging',
          status: 'queued',
          priority: 3
        })
      });
      expect(result).toEqual(mockExecution);
    });

    it('should handle database errors', async () => {
      mockPrisma.testExecution.create.mockRejectedValue(new Error('Database error'));

      const executionData = {
        testSuite: 'integration',
        environment: 'staging'
      };

      await expect(service.createExecution(executionData)).rejects.toThrow('Database error');
    });
  });

  describe('assignRunnerToExecution', () => {
    it('should assign an available runner to execution', async () => {
      const mockRunners = [
        {
          id: 1,
          name: 'runner-1',
          type: 'github-actions',
          status: 'active',
          health_status: 'healthy',
          max_concurrent_jobs: 5,
          priority: 10,
          current_job_count: 2
        },
        {
          id: 2,
          name: 'runner-2',
          type: 'azure-devops',
          status: 'active',
          health_status: 'healthy',
          max_concurrent_jobs: 3,
          priority: 5,
          current_job_count: 3
        }
      ];

      const mockExecution = {
        id: 'test-exec-1',
        status: 'queued',
        priority: 3
      };

      const mockUpdatedExecution = {
        ...mockExecution,
        assigned_runner_id: 1,
        status: 'assigned'
      };

      mockPrisma.testRunner.findMany.mockResolvedValue(mockRunners);
      mockPrisma.testExecution.findUnique.mockResolvedValue(mockExecution);
      mockPrisma.testExecution.update.mockResolvedValue(mockUpdatedExecution);

      const result = await service.assignRunnerToExecution('test-exec-1');

      expect(result.success).toBe(true);
      expect(result.assignedRunner.id).toBe(1); // Should pick runner-1 (has capacity)
      expect(mockPrisma.testExecution.update).toHaveBeenCalledWith({
        where: { id: 'test-exec-1' },
        data: {
          assigned_runner_id: 1,
          status: 'assigned',
          updated_at: expect.any(Date)
        }
      });
    });

    it('should return error when no runners available', async () => {
      const mockRunners = [
        {
          id: 1,
          name: 'runner-1',
          type: 'github-actions',
          status: 'active',
          health_status: 'healthy',
          max_concurrent_jobs: 3,
          priority: 10,
          current_job_count: 3 // At capacity
        }
      ];

      mockPrisma.testRunner.findMany.mockResolvedValue(mockRunners);
      mockPrisma.testExecution.findUnique.mockResolvedValue({
        id: 'test-exec-1',
        status: 'queued'
      });

      const result = await service.assignRunnerToExecution('test-exec-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No available runners');
    });
  });

  describe('getOrchestrationMetrics', () => {
    it('should return orchestration metrics', async () => {
      mockPrisma.testExecution.count.mockImplementation(({ where }) => {
        const statusCounts: { [key: string]: number } = {
          queued: 5,
          running: 3,
          completed: 12,
          failed: 2
        };
        return Promise.resolve(statusCounts[where?.status as string] || 0);
      });

      mockPrisma.testRunner.findMany.mockResolvedValue([
        {
          id: 1,
          status: 'active',
          health_status: 'healthy',
          max_concurrent_jobs: 5,
          current_job_count: 2
        },
        {
          id: 2,
          status: 'active',
          health_status: 'healthy',
          max_concurrent_jobs: 3,
          current_job_count: 1
        }
      ]);

      const metrics = await service.getOrchestrationMetrics();

      expect(metrics).toMatchObject({
        executions: {
          queued: 5,
          running: 3,
          completed: 12,
          failed: 2,
          total: 22
        },
        runners: {
          total: 2,
          active: 2,
          healthy: 2,
          totalCapacity: 8,
          currentLoad: 3,
          utilizationRate: expect.any(Number)
        }
      });
      expect(metrics.runners.utilizationRate).toBeCloseTo(37.5); // 3/8 * 100
    });
  });

  describe('scheduleExecution', () => {
    it('should schedule high priority executions first', async () => {
      const mockExecutions = [
        {
          id: 'exec-1',
          priority: 1,
          status: 'queued',
          created_at: new Date('2024-01-01T10:00:00Z')
        },
        {
          id: 'exec-2',
          priority: 5,
          status: 'queued',
          created_at: new Date('2024-01-01T09:00:00Z')
        },
        {
          id: 'exec-3',
          priority: 3,
          status: 'queued',
          created_at: new Date('2024-01-01T11:00:00Z')
        }
      ];

      mockPrisma.testExecution.findMany.mockResolvedValue(mockExecutions);

      const scheduled = await service.scheduleExecution();

      expect(mockPrisma.testExecution.findMany).toHaveBeenCalledWith({
        where: { status: 'queued' },
        orderBy: [
          { priority: 'desc' },
          { created_at: 'asc' }
        ],
        take: 1
      });
      
      // Should return the highest priority execution (exec-2)
      expect(scheduled).toEqual(mockExecutions[0]);
    });

    it('should return null when no executions queued', async () => {
      mockPrisma.testExecution.findMany.mockResolvedValue([]);

      const scheduled = await service.scheduleExecution();

      expect(scheduled).toBeNull();
    });
  });

  describe('updateExecutionStatus', () => {
    it('should update execution status with metadata', async () => {
      const mockUpdatedExecution = {
        id: 'exec-1',
        status: 'running',
        started_at: new Date(),
        metadata: JSON.stringify({ runnerId: 'runner-1' })
      };

      mockPrisma.testExecution.update.mockResolvedValue(mockUpdatedExecution);

      const result = await service.updateExecutionStatus('exec-1', 'running', {
        startedAt: new Date(),
        metadata: { runnerId: 'runner-1' }
      });

      expect(mockPrisma.testExecution.update).toHaveBeenCalledWith({
        where: { id: 'exec-1' },
        data: expect.objectContaining({
          status: 'running',
          started_at: expect.any(Date),
          metadata: expect.any(String),
          updated_at: expect.any(Date)
        })
      });
      expect(result).toEqual(mockUpdatedExecution);
    });
  });

  describe('getRunnerHealth', () => {
    it('should return runner health statistics', async () => {
      const mockRunners = [
        {
          id: 1,
          name: 'runner-1',
          health_status: 'healthy',
          status: 'active',
          last_health_check: new Date()
        },
        {
          id: 2,
          name: 'runner-2',
          health_status: 'unhealthy',
          status: 'inactive',
          last_health_check: new Date(Date.now() - 600000) // 10 minutes ago
        },
        {
          id: 3,
          name: 'runner-3',
          health_status: 'healthy',
          status: 'active',
          last_health_check: new Date()
        }
      ];

      mockPrisma.testRunner.findMany.mockResolvedValue(mockRunners);

      const health = await service.getRunnerHealth();

      expect(health).toMatchObject({
        totalRunners: 3,
        healthyRunners: 2,
        unhealthyRunners: 1,
        activeRunners: 2,
        inactiveRunners: 1,
        healthRate: expect.any(Number)
      });
      expect(health.healthRate).toBeCloseTo(66.67); // 2/3 * 100
    });
  });
});