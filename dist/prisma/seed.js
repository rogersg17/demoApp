"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Starting database seeding...');
    // Create default user
    const hashedPassword = await bcrypt_1.default.hash('admin123', 10);
    const adminUser = await prisma.user.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
            username: 'admin',
            email: 'admin@tms.local',
            password: hashedPassword,
            is_active: true,
        },
    });
    console.log('✅ Created admin user:', adminUser.username);
    // Create test user
    const testHashedPassword = await bcrypt_1.default.hash('test123', 10);
    const testUser = await prisma.user.upsert({
        where: { username: 'testuser' },
        update: {},
        create: {
            username: 'testuser',
            email: 'test@tms.local',
            password: testHashedPassword,
            is_active: true,
        },
    });
    console.log('✅ Created test user:', testUser.username);
    // Create sample test runners
    const githubRunner = await prisma.testRunner.upsert({
        where: { name: 'GitHub Actions Runner' },
        update: {},
        create: {
            name: 'GitHub Actions Runner',
            type: 'github-actions',
            status: 'active',
            health_status: 'healthy',
            endpoint_url: 'https://api.github.com',
            webhook_url: 'http://localhost:3000/api/webhooks/github-actions',
            capabilities: JSON.stringify({
                node_versions: ['18', '20'],
                browsers: ['chrome', 'firefox', 'safari'],
                platforms: ['ubuntu-latest', 'windows-latest', 'macos-latest']
            }),
            max_concurrent_jobs: 5,
            priority: 80,
        },
    });
    console.log('✅ Created GitHub Actions runner');
    const azureRunner = await prisma.testRunner.upsert({
        where: { name: 'Azure DevOps Agent' },
        update: {},
        create: {
            name: 'Azure DevOps Agent',
            type: 'azure-devops',
            status: 'active',
            health_status: 'healthy',
            endpoint_url: 'https://dev.azure.com',
            webhook_url: 'http://localhost:3000/api/webhooks/azure-devops',
            capabilities: JSON.stringify({
                node_versions: ['18', '20'],
                browsers: ['chrome', 'edge'],
                platforms: ['windows-2022', 'ubuntu-22.04']
            }),
            max_concurrent_jobs: 3,
            priority: 70,
        },
    });
    console.log('✅ Created Azure DevOps runner');
    const dockerRunner = await prisma.testRunner.upsert({
        where: { name: 'Docker Test Runner' },
        update: {},
        create: {
            name: 'Docker Test Runner',
            type: 'docker',
            status: 'active',
            health_status: 'healthy',
            endpoint_url: 'http://localhost:2376',
            webhook_url: 'http://localhost:3000/api/webhooks/docker',
            capabilities: JSON.stringify({
                containers: ['playwright', 'cypress', 'selenium'],
                resources: { cpu: 4, memory: '8GB' }
            }),
            max_concurrent_jobs: 2,
            priority: 60,
        },
    });
    console.log('✅ Created Docker runner');
    // Create sample load balancing rules
    const roundRobinRule = await prisma.loadBalancingRule.upsert({
        where: { name: 'Default Round Robin' },
        update: {},
        create: {
            name: 'Default Round Robin',
            rule_type: 'round-robin',
            priority: 50,
            active: true,
            rule_config: JSON.stringify({
                description: 'Default round-robin load balancing for all test suites'
            }),
        },
    });
    console.log('✅ Created round-robin load balancing rule');
    const priorityRule = await prisma.loadBalancingRule.upsert({
        where: { name: 'High Priority Tests' },
        update: {},
        create: {
            name: 'High Priority Tests',
            rule_type: 'priority-based',
            test_suite_pattern: 'critical*',
            priority: 90,
            active: true,
            rule_config: JSON.stringify({
                description: 'Priority-based routing for critical test suites',
                min_runner_priority: 70
            }),
        },
    });
    console.log('✅ Created priority-based load balancing rule');
    // Create sample flaky tests
    const flakyTests = [
        {
            test_name: 'login-functional.spec.ts > should login with valid credentials',
            failure_count: 5,
            success_count: 45,
            flakiness_percentage: 10.0,
            status: 'monitoring',
        },
        {
            test_name: 'api-tests.spec.ts > should handle concurrent requests',
            failure_count: 12,
            success_count: 38,
            flakiness_percentage: 24.0,
            status: 'confirmed_flaky',
        },
        {
            test_name: 'ui-components.spec.ts > should render dashboard correctly',
            failure_count: 2,
            success_count: 98,
            flakiness_percentage: 2.0,
            status: 'stable',
        },
    ];
    for (const flakyTest of flakyTests) {
        await prisma.flakyTest.upsert({
            where: { test_name: flakyTest.test_name },
            update: flakyTest,
            create: flakyTest,
        });
    }
    console.log('✅ Created sample flaky test data');
    // Create sample test executions
    const sampleExecutions = [
        {
            execution_id: 'exec-demo-001',
            test_suite: 'e2e-login',
            environment: 'staging',
            status: 'completed',
            priority: 70,
        },
        {
            execution_id: 'exec-demo-002',
            test_suite: 'api-tests',
            environment: 'production',
            status: 'running',
            priority: 80,
        },
        {
            execution_id: 'exec-demo-003',
            test_suite: 'ui-components',
            environment: 'development',
            status: 'queued',
            priority: 50,
        },
    ];
    for (const execution of sampleExecutions) {
        await prisma.testExecution.upsert({
            where: { execution_id: execution.execution_id },
            update: {},
            create: {
                id: execution.execution_id,
                execution_id: execution.execution_id,
                test_suite: execution.test_suite,
                environment: execution.environment,
                status: execution.status,
                priority: execution.priority,
                assigned_runner_id: execution.status !== 'queued' ? githubRunner.id : null,
            },
        });
        // Also create queue items
        await prisma.executionQueueItem.upsert({
            where: { execution_id: execution.execution_id },
            update: {},
            create: {
                execution_id: execution.execution_id,
                test_suite: execution.test_suite,
                environment: execution.environment,
                status: execution.status,
                priority: execution.priority,
                assigned_runner_id: execution.status !== 'queued' ? githubRunner.id : null,
                ...(execution.status === 'running' && {
                    assigned_at: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
                    started_at: new Date(Date.now() - 3 * 60 * 1000), // 3 minutes ago
                }),
            },
        });
    }
    console.log('✅ Created sample test executions');
    // Create sample resource allocations for running executions
    const runningExecution = sampleExecutions.find(e => e.status === 'running');
    if (runningExecution) {
        await prisma.resourceAllocation.upsert({
            where: {
                execution_id_runner_id: {
                    execution_id: runningExecution.execution_id,
                    runner_id: githubRunner.id,
                },
            },
            update: {},
            create: {
                execution_id: runningExecution.execution_id,
                runner_id: githubRunner.id,
                cpu_allocated: 2.0,
                memory_allocated: 4096,
                status: 'allocated',
            },
        });
        console.log('✅ Created sample resource allocation');
    }
    console.log('🎉 Database seeding completed!');
}
main()
    .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map