import { Database } from '../database';
import db from '../database';
import { EventEmitter } from 'events';

interface ResourceRequirements {
  cpu?: number;
  memory?: number;
  storage?: number;
  networkBandwidth?: number;
  concurrency?: number;
  test_suite?: string;
  cpu_allocation?: number;
  memory_allocation?: number;
  parallel_jobs?: number;
}

interface Runner {
  id: string | number;
  name: string;
  status: string;
  max_concurrent_tests: number;
  cpu_cores: number;
  memory_gb: number;
  storage_gb: number;
  network_mbps: number;
  capabilities?: string;
  health_status?: string;
  max_concurrent_jobs?: number;
  current_jobs?: number;
}

interface ResourceAllocation {
  id: string | number;
  execution_id: string | number;
  runner_id: string | number;
  cpu_allocation: number;
  memory_allocation: number;
  storage_gb?: number;
  network_mbps?: number;
  allocated_at?: string;
  status: string;
  runner_name?: string;
  health_check_url?: string;
  capabilities?: string;
}

interface AvailableResources {
  cpu: number;
  memory: number;
  storage: number;
  networkBandwidth: number;
  concurrency: number;
}

class ResourceAllocationService extends EventEmitter {
  private db: Database;
  private activeAllocations: Map<string | number, ResourceAllocation>;
  private resourceLimits: Map<string | number, any>;
  private monitoringInterval: NodeJS.Timeout | null;

  constructor(database: Database | null = null) {
    super();
    this.db = database || db;
    this.activeAllocations = new Map(); // Track active resource allocations
    this.resourceLimits = new Map(); // Cache resource limits for runners
    this.monitoringInterval = null;
    
    // Start resource monitoring
    this.startResourceMonitoring();
    
    console.log('✅ Resource Allocation Service initialized');
  }

  // ==================== RESOURCE ALLOCATION ====================

  async allocateResources(executionId: string | number, runnerId: string | number, requirements: ResourceRequirements = {}): Promise<ResourceAllocation> {
    try {
      // Get runner capacity and current allocations
      const runner = await this.getRunner(runnerId);
      if (!runner) {
        throw new Error(`Runner with ID ${runnerId} not found`);
      }

      const currentAllocations = await this.getCurrentAllocations(runnerId);
      const availableResources = this.calculateAvailableResources(runner, currentAllocations);
      
      // Determine resource requirements
      const resourceRequirements = this.determineResourceRequirements(requirements, runner);
      
      // Check if resources are available
      if (!this.canAllocateResources(availableResources, resourceRequirements)) {
        throw new Error('Insufficient resources available for allocation');
      }

      // Create allocation record
      const allocation = await this.createResourceAllocation(
        executionId, 
        runnerId, 
        resourceRequirements
      );

      // Update cache
      this.activeAllocations.set(executionId, allocation);
      
      console.log(`✅ Allocated resources for execution ${executionId} on runner ${runner.name}`);
      this.emit('resourcesAllocated', { executionId, runnerId, allocation });
      
      return allocation;
      
    } catch (error: any) {
      console.error(`❌ Failed to allocate resources for execution ${executionId}:`, error);
      throw error;
    }
  }

  async releaseResources(executionId: string | number): Promise<void> {
    try {
      const allocation = await this.getAllocationByExecution(executionId);
      if (!allocation) {
        console.warn(`⚠️ No allocation found for execution ${executionId}`);
        return;
      }

      // Mark allocation as released
      await this.markAllocationReleased(allocation.id);
      
      // Remove from cache
      this.activeAllocations.delete(executionId);
      
      console.log(`✅ Released resources for execution ${executionId}`);
      this.emit('resourcesReleased', { executionId, allocation });
      
    } catch (error: any) {
      console.error(`❌ Failed to release resources for execution ${executionId}:`, error);
      throw error;
    }
  }

  determineResourceRequirements(requirements: ResourceRequirements, runner: Runner): any {
    // Default resource allocation based on runner capabilities
    const runnerCapabilities = runner.capabilities ? JSON.parse(runner.capabilities) : {};
    
    const defaults = {
      cpu_allocation: 50, // 50% CPU by default
      memory_allocation: 2048, // 2GB memory by default
      parallel_jobs: 1 // Number of parallel jobs this execution will use
    };

    // Override with specific requirements
    const resourceRequirements = {
      cpu_allocation: requirements.cpu_allocation || defaults.cpu_allocation,
      memory_allocation: requirements.memory_allocation || defaults.memory_allocation,
      parallel_jobs: requirements.parallel_jobs || defaults.parallel_jobs
    };

    // Adjust based on test suite type
    if (requirements.test_suite) {
      resourceRequirements.cpu_allocation = this.adjustCpuForTestSuite(
        requirements.test_suite, 
        resourceRequirements.cpu_allocation
      );
      resourceRequirements.memory_allocation = this.adjustMemoryForTestSuite(
        requirements.test_suite, 
        resourceRequirements.memory_allocation
      );
    }

    // Ensure we don't exceed runner capabilities
    const maxCpu = runnerCapabilities.max_cpu_percent || 80;
    const maxMemory = runnerCapabilities.max_memory_mb || 8192;
    
    resourceRequirements.cpu_allocation = Math.min(resourceRequirements.cpu_allocation, maxCpu);
    resourceRequirements.memory_allocation = Math.min(resourceRequirements.memory_allocation, maxMemory);

    return resourceRequirements;
  }

  adjustCpuForTestSuite(testSuite: string, baseCpu: number): number {
    const adjustments: {[key: string]: number} = {
      'smoke': 0.8,      // Light tests, reduce CPU
      'regression': 1.2, // Heavy tests, increase CPU
      'api': 0.9,        // Moderate CPU usage
      'ui': 1.1,         // Browser tests need more CPU
      'performance': 1.3 // Performance tests need maximum CPU
    };
    
    const multiplier = adjustments[testSuite] || 1.0;
    return Math.round(baseCpu * multiplier);
  }

  adjustMemoryForTestSuite(testSuite: string, baseMemory: number): number {
    const adjustments: {[key: string]: number} = {
      'smoke': 0.7,      // Light tests, reduce memory
      'regression': 1.3, // Heavy tests, increase memory
      'api': 0.8,        // API tests are lightweight
      'ui': 1.4,         // Browser tests need more memory
      'performance': 1.5 // Performance tests need maximum memory
    };
    
    const multiplier = adjustments[testSuite] || 1.0;
    return Math.round(baseMemory * multiplier);
  }

  calculateAvailableResources(runner: Runner, currentAllocations: ResourceAllocation[]): any {
    const runnerCapabilities = runner.capabilities ? JSON.parse(runner.capabilities) : {};
    
    // Total capacity
    const totalCpu = runnerCapabilities.max_cpu_percent || 80;
    const totalMemory = runnerCapabilities.max_memory_mb || 8192;
    const maxConcurrentJobs = runner.max_concurrent_jobs || 1;
    
    // Calculate currently allocated resources
    const allocatedCpu = currentAllocations.reduce((sum, alloc) => sum + (alloc.cpu_allocation || 0), 0);
    const allocatedMemory = currentAllocations.reduce((sum, alloc) => sum + (alloc.memory_allocation || 0), 0);
    const currentJobs = runner.current_jobs || 0;
    
    return {
      availableCpu: Math.max(0, totalCpu - allocatedCpu),
      availableMemory: Math.max(0, totalMemory - allocatedMemory),
      availableJobSlots: Math.max(0, maxConcurrentJobs - currentJobs),
      totalCpu,
      totalMemory,
      maxConcurrentJobs
    };
  }

  canAllocateResources(available: any, required: any): boolean {
    return (
      available.availableCpu >= required.cpu_allocation &&
      available.availableMemory >= required.memory_allocation &&
      available.availableJobSlots >= (required.parallel_jobs || 1)
    );
  }

  // ==================== DATABASE OPERATIONS ====================

  async createResourceAllocation(executionId: string | number, runnerId: string | number, requirements: any): Promise<ResourceAllocation> {
    const result = await this.db.run(`
      INSERT INTO resource_allocations (
        runner_id, execution_id, cpu_allocation, memory_allocation, status
      ) VALUES (?, ?, ?, ?, ?)
    `, [
      runnerId, 
      executionId, 
      requirements.cpu_allocation, 
      requirements.memory_allocation,
      'allocated'
    ]);

    return {
      id: result.lastID,
      runner_id: runnerId,
      execution_id: executionId,
      cpu_allocation: requirements.cpu_allocation,
      memory_allocation: requirements.memory_allocation,
      status: 'allocated'
    };
  }

  async markAllocationReleased(allocationId: string | number): Promise<void> {
    const now = new Date().toISOString();
    await this.db.run(`
      UPDATE resource_allocations 
      SET status = 'released', released_at = ?
      WHERE id = ?
    `, [now, allocationId]);
  }

  async getAllocationByExecution(executionId: string | number): Promise<ResourceAllocation | undefined> {
    return await this.db.get(`
      SELECT * FROM resource_allocations 
      WHERE execution_id = ? AND status = 'allocated'
    `, [executionId]) as ResourceAllocation | undefined;
  }

  async getCurrentAllocations(runnerId: string | number): Promise<ResourceAllocation[]> {
    return await this.db.all(`
      SELECT * FROM resource_allocations 
      WHERE runner_id = ? AND status = 'allocated'
    `, [runnerId]) as ResourceAllocation[] || [];
  }

  async getRunner(runnerId: string | number): Promise<Runner | undefined> {
    return await this.db.get(`
      SELECT * FROM test_runners WHERE id = ?
    `, [runnerId]) as Runner | undefined;
  }

  // ==================== RESOURCE MONITORING ====================

  startResourceMonitoring(): void {
    // Monitor resource usage every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.monitorResourceUsage();
    }, 30000);
    
    console.log('✅ Resource monitoring started');
  }

  stopResourceMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('📴 Resource monitoring stopped');
    }
  }

  async monitorResourceUsage(): Promise<void> {
    try {
      // Get all active allocations
      const activeAllocations = await this.getAllActiveAllocations();
      
      for (const allocation of activeAllocations) {
        try {
          await this.checkAllocationHealth(allocation);
        } catch (error: any) {
          console.error(`❌ Error monitoring allocation ${allocation.id}:`, error);
        }
      }
      
      // Check for resource limit violations
      await this.checkResourceLimitViolations();
      
    } catch (error: any) {
      console.error('❌ Error in resource monitoring:', error);
    }
  }

  async getAllActiveAllocations(): Promise<ResourceAllocation[]> {
    return await this.db.all(`
      SELECT ra.*, tr.name as runner_name, tr.health_check_url, tr.capabilities
      FROM resource_allocations ra
      JOIN test_runners tr ON ra.runner_id = tr.id
      WHERE ra.status = 'allocated'
      AND tr.status = 'active'
    `) as ResourceAllocation[] || [];
  }

  async checkAllocationHealth(allocation: ResourceAllocation): Promise<void> {
    // This would typically query runner metrics via health check endpoint
    // For now, we'll simulate basic health checking
    
    const runner = await this.getRunner(allocation.runner_id);
    if (!runner || runner.health_status !== 'healthy') {
      console.warn(`⚠️ Runner ${allocation.runner_name} for allocation ${allocation.id} is unhealthy`);
      await this.handleUnhealthyAllocation(allocation);
    }
  }

  async handleUnhealthyAllocation(allocation: ResourceAllocation): Promise<void> {
    // Mark allocation as potentially problematic
    // In a real implementation, this might trigger alerts or reallocation
    console.warn(`⚠️ Handling unhealthy allocation ${allocation.id} for execution ${allocation.execution_id}`);
    
    this.emit('allocationUnhealthy', allocation);
  }

  async checkResourceLimitViolations(): Promise<void> {
    // Check if any runners are exceeding their resource limits
    const runners = await this.getAllActiveRunners();
    
    for (const runner of runners) {
      const allocations = await this.getCurrentAllocations(runner.id);
      const totalCpuAllocated = allocations.reduce((sum, alloc) => sum + (alloc.cpu_allocation || 0), 0);
      const totalMemoryAllocated = allocations.reduce((sum, alloc) => sum + (alloc.memory_allocation || 0), 0);
      
      const capabilities = runner.capabilities ? JSON.parse(runner.capabilities) : {};
      const maxCpu = capabilities.max_cpu_percent || 80;
      const maxMemory = capabilities.max_memory_mb || 8192;
      
      if (totalCpuAllocated > maxCpu) {
        console.warn(`⚠️ Runner ${runner.name} exceeding CPU limit: ${totalCpuAllocated}% > ${maxCpu}%`);
        await this.handleResourceViolation(runner.id, 'cpu', totalCpuAllocated, maxCpu);
      }
      
      if (totalMemoryAllocated > maxMemory) {
        console.warn(`⚠️ Runner ${runner.name} exceeding memory limit: ${totalMemoryAllocated}MB > ${maxMemory}MB`);
        await this.handleResourceViolation(runner.id, 'memory', totalMemoryAllocated, maxMemory);
      }
    }
  }

  async getAllActiveRunners(): Promise<Runner[]> {
    return await this.db.all(`
      SELECT * FROM test_runners 
      WHERE status = 'active'
    `) as Runner[] || [];
  }

  async handleResourceViolation(runnerId: string | number, resourceType: string, current: number, limit: number): Promise<void> {
    // Log resource violation and potentially take corrective action
    console.error(`❌ Resource violation on runner ${runnerId}: ${resourceType} usage ${current} exceeds limit ${limit}`);
    
    // Mark relevant allocations as exceeded
    await this.markAllocationsExceeded(runnerId);
    
    this.emit('resourceViolation', { runnerId, resourceType, current, limit });
  }

  async markAllocationsExceeded(runnerId: string | number): Promise<void> {
    await this.db.run(`
      UPDATE resource_allocations 
      SET status = 'exceeded'
      WHERE runner_id = ? AND status = 'allocated'
    `, [runnerId]);
  }

  // ==================== RESOURCE OPTIMIZATION ====================

  async optimizeResourceAllocation(runnerId: string | number): Promise<any> {
    try {
      const runner = await this.getRunner(runnerId);
      if (!runner) {
        throw new Error(`Runner not found: ${runnerId}`);
      }
      const currentAllocations = await this.getCurrentAllocations(runnerId);
      
      if (currentAllocations.length === 0) {
        return { message: 'No active allocations to optimize' };
      }

      const optimization = this.calculateOptimalAllocation(runner, currentAllocations);
      
      if (optimization.canOptimize) {
        await this.applyOptimization(runnerId, optimization);
        console.log(`✅ Applied resource optimization for runner ${runner.name}`);
        return optimization;
      }
      
      return { message: 'Current allocation is already optimal' };
      
    } catch (error: any) {
      console.error(`❌ Failed to optimize resources for runner ${runnerId}:`, error);
      throw error;
    }
  }

  calculateOptimalAllocation(runner: Runner, allocations: ResourceAllocation[]): any {
    const capabilities = runner.capabilities ? JSON.parse(runner.capabilities) : {};
    const maxCpu = capabilities.max_cpu_percent || 80;
    const maxMemory = capabilities.max_memory_mb || 8192;
    
    const totalAllocatedCpu = allocations.reduce((sum, alloc) => sum + alloc.cpu_allocation, 0);
    const totalAllocatedMemory = allocations.reduce((sum, alloc) => sum + alloc.memory_allocation, 0);
    
    const cpuUtilization = totalAllocatedCpu / maxCpu;
    const memoryUtilization = totalAllocatedMemory / maxMemory;
    
    // Determine if rebalancing would be beneficial
    const canOptimize = (
      cpuUtilization > 0.9 || 
      memoryUtilization > 0.9 || 
      Math.abs(cpuUtilization - memoryUtilization) > 0.3
    );
    
    return {
      canOptimize,
      cpuUtilization,
      memoryUtilization,
      suggestions: canOptimize ? this.generateOptimizationSuggestions(allocations, maxCpu, maxMemory) : []
    };
  }

  generateOptimizationSuggestions(allocations: ResourceAllocation[], maxCpu: number, maxMemory: number): any[] {
    const suggestions: any[] = [];
    
    // Find allocations that could be reduced
    allocations.forEach(allocation => {
      if (allocation.cpu_allocation > 60) {
        suggestions.push({
          type: 'reduce_cpu',
          allocation_id: allocation.id,
          current: allocation.cpu_allocation,
          suggested: Math.max(30, allocation.cpu_allocation * 0.8)
        });
      }
      
      if (allocation.memory_allocation > 4096) {
        suggestions.push({
          type: 'reduce_memory',
          allocation_id: allocation.id,
          current: allocation.memory_allocation,
          suggested: Math.max(2048, allocation.memory_allocation * 0.8)
        });
      }
    });
    
    return suggestions;
  }

  async applyOptimization(runnerId: string | number, optimization: any): Promise<void> {
    // Apply suggested optimizations
    for (const suggestion of optimization.suggestions) {
      try {
        await this.applySuggestion(suggestion);
      } catch (error: any) {
        console.error(`❌ Failed to apply optimization suggestion:`, error);
      }
    }
  }

  async applySuggestion(suggestion: any): Promise<void> {
    if (suggestion.type === 'reduce_cpu') {
      await this.updateAllocationCpu(suggestion.allocation_id, suggestion.suggested);
    } else if (suggestion.type === 'reduce_memory') {
      await this.updateAllocationMemory(suggestion.allocation_id, suggestion.suggested);
    }
  }

  async updateAllocationCpu(allocationId: string | number, newCpuAllocation: number): Promise<void> {
    await this.db.run(`
      UPDATE resource_allocations 
      SET cpu_allocation = ?
      WHERE id = ?
    `, [newCpuAllocation, allocationId]);
  }

  async updateAllocationMemory(allocationId: string | number, newMemoryAllocation: number): Promise<void> {
    await this.db.run(`
      UPDATE resource_allocations 
      SET memory_allocation = ?
      WHERE id = ?
    `, [newMemoryAllocation, allocationId]);
  }

  // ==================== REPORTING AND ANALYTICS ====================

  async getResourceUtilizationReport(runnerId: string | number, hours = 24): Promise<any> {
    return await this.db.get(`
      SELECT 
        AVG(cpu_allocation) as avg_cpu_allocation,
        MAX(cpu_allocation) as max_cpu_allocation,
        AVG(memory_allocation) as avg_memory_allocation,
        MAX(memory_allocation) as max_memory_allocation,
        COUNT(*) as total_allocations,
        COUNT(CASE WHEN status = 'exceeded' THEN 1 END) as exceeded_allocations
      FROM resource_allocations 
      WHERE runner_id = ? 
      AND allocated_at > datetime('now', '-${hours} hours')
    `, [runnerId]) as any || {};
  }

  async getSystemResourceSummary(): Promise<any[]> {
    return await this.db.all(`
      SELECT 
        tr.name as runner_name,
        tr.type as runner_type,
        tr.status as runner_status,
        tr.max_concurrent_jobs,
        tr.current_jobs,
        COUNT(ra.id) as active_allocations,
        SUM(ra.cpu_allocation) as total_cpu_allocated,
        SUM(ra.memory_allocation) as total_memory_allocated
      FROM test_runners tr
      LEFT JOIN resource_allocations ra ON tr.id = ra.runner_id AND ra.status = 'allocated'
      WHERE tr.status = 'active'
      GROUP BY tr.id, tr.name, tr.type, tr.status, tr.max_concurrent_jobs, tr.current_jobs
      ORDER BY tr.name
    `) as any[] || [];
  }

  // ==================== CLEANUP ====================

  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up Resource Allocation Service...');
    
    this.stopResourceMonitoring();
    
    // Release any orphaned allocations
    await this.releaseOrphanedAllocations();
    
    // Clear caches
    this.activeAllocations.clear();
    this.resourceLimits.clear();
    
    console.log('✅ Resource Allocation Service cleanup complete');
  }

  async releaseOrphanedAllocations(): Promise<void> {
    const now = new Date().toISOString();
    
    // Find allocations for executions that are no longer running
    await this.db.run(`
      UPDATE resource_allocations 
      SET status = 'released', released_at = ?
      WHERE status = 'allocated' 
      AND execution_id NOT IN (
        SELECT execution_id FROM execution_queue 
        WHERE status IN ('queued', 'assigned', 'running')
      )
    `, [now]);
  }
}

export default ResourceAllocationService;