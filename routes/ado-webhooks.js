const express = require('express');
const crypto = require('crypto');
const AdoBuildConsumer = require('../services/ado-build-consumer');
const AdoProjectConfigurationService = require('../services/ado-project-configuration');
const AdoClient = require('../lib/ado-client');
const Database = require('../database/database');

const router = express.Router();

// Initialize services
let adoClient, database, buildConsumer, projectConfigService;

try {
    adoClient = new AdoClient();
    database = new Database();
    buildConsumer = new AdoBuildConsumer(adoClient, database);
    projectConfigService = new AdoProjectConfigurationService(adoClient, database);
} catch (error) {
    console.error('⚠️ Azure DevOps services not initialized:', error.message);
}

/**
 * Webhook endpoint for Azure DevOps build completion events
 */
router.post('/build-complete', async (req, res) => {
    try {
        // Validate webhook signature if secret is configured
        if (!validateWebhookSignature(req)) {
            console.warn('🔒 Invalid webhook signature from IP:', req.ip);
            return res.status(401).json({ error: 'Invalid signature' });
        }

        const { eventType, resource, resourceVersion } = req.body;
        
        // Validate event type
        if (eventType !== 'build.complete') {
            console.log(`📝 Ignoring webhook event type: ${eventType}`);
            return res.status(200).json({ status: 'ignored', reason: 'Unsupported event type' });
        }

        // Validate resource data
        if (!resource || !resource.id || !resource.definition) {
            console.error('❌ Invalid webhook payload - missing required fields');
            return res.status(400).json({ error: 'Invalid payload structure' });
        }

        const buildId = resource.id;
        const buildDefinitionId = resource.definition.id;
        const projectId = resource.project?.id;
        const buildResult = resource.result;
        const buildStatus = resource.status;

        console.log(`📨 Received build completion webhook: Build ${buildId}, Definition ${buildDefinitionId}, Result: ${buildResult}`);

        // Check if this build definition is configured for monitoring
        const configuredProjects = await projectConfigService.getConfiguredProjects();
        const matchingProject = configuredProjects.find(project => 
            project.build_definition_id === buildDefinitionId && project.enabled
        );

        if (!matchingProject) {
            console.log(`⏭️ Build ${buildId} (Definition ${buildDefinitionId}) is not configured for monitoring - skipping`);
            return res.status(200).json({ 
                status: 'ignored', 
                reason: 'Build definition not configured for monitoring' 
            });
        }

        console.log(`✅ Processing build ${buildId} for monitored project: ${matchingProject.name}`);

        // Process build results asynchronously to avoid webhook timeout
        setImmediate(async () => {
            try {
                const results = await buildConsumer.consumeBuildResults(buildId, projectId);
                
                // Emit real-time update via WebSocket
                const io = req.app.get('io');
                if (io) {
                    io.emit('ado:build-complete', {
                        projectId: matchingProject.id,
                        projectName: matchingProject.name,
                        buildId,
                        buildNumber: resource.buildNumber,
                        result: buildResult,
                        status: buildStatus,
                        startTime: resource.startTime,
                        finishTime: resource.finishTime,
                        definition: {
                            id: resource.definition.id,
                            name: resource.definition.name
                        },
                        testSummary: results.testResults ? {
                            totalRuns: results.testResults.length,
                            totalTests: results.testResults.reduce((sum, run) => sum + run.totalTests, 0),
                            passedTests: results.testResults.reduce((sum, run) => sum + run.passedTests, 0),
                            failedTests: results.testResults.reduce((sum, run) => sum + run.failedTests, 0)
                        } : null,
                        timestamp: new Date().toISOString()
                    });
                }

                console.log(`✅ Successfully processed build ${buildId} for project ${matchingProject.name}`);
                
                // Optional: Trigger notifications based on project configuration
                await handleBuildNotifications(matchingProject, results);
                
            } catch (error) {
                console.error(`❌ Failed to process build ${buildId}:`, error);
                
                // Emit error notification
                const io = req.app.get('io');
                if (io) {
                    io.emit('ado:build-error', {
                        projectId: matchingProject.id,
                        buildId,
                        error: error.message,
                        timestamp: new Date().toISOString()
                    });
                }
            }
        });

        // Respond immediately to Azure DevOps
        res.status(200).json({ 
            status: 'accepted',
            message: 'Build completion event received and queued for processing',
            buildId,
            projectId: matchingProject.id,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Webhook processing error:', error);
        res.status(500).json({ 
            error: 'Failed to process webhook',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Webhook endpoint for Azure DevOps release completion events
 */
router.post('/release-complete', async (req, res) => {
    try {
        if (!validateWebhookSignature(req)) {
            return res.status(401).json({ error: 'Invalid signature' });
        }

        const { eventType, resource } = req.body;
        
        if (eventType !== 'ms.vss-release.release-deployment-completed-event') {
            return res.status(200).json({ status: 'ignored', reason: 'Unsupported event type' });
        }

        // Basic release processing - can be expanded later
        console.log(`📨 Received release completion webhook: Release ${resource.release?.id}`);

        // For now, just acknowledge the webhook
        res.status(200).json({ 
            status: 'accepted',
            message: 'Release completion event received',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Release webhook processing error:', error);
        res.status(500).json({ error: 'Failed to process release webhook' });
    }
});

/**
 * Health check endpoint for webhook service
 */
router.get('/health', (req, res) => {
    try {
        const status = {
            service: 'Azure DevOps Webhooks',
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                adoClient: adoClient ? 'initialized' : 'not initialized',
                database: database ? 'initialized' : 'not initialized',
                buildConsumer: buildConsumer ? 'initialized' : 'not initialized',
                projectConfigService: projectConfigService ? 'initialized' : 'not initialized'
            }
        };

        res.json(status);
    } catch (error) {
        res.status(500).json({
            service: 'Azure DevOps Webhooks',
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Validate webhook signature using HMAC-SHA1
 */
function validateWebhookSignature(req) {
    const signature = req.headers['x-vss-signature'];
    const secret = process.env.ADO_WEBHOOK_SECRET;
    
    // If no secret is configured, skip validation (development mode)
    if (!secret) {
        console.warn('⚠️ ADO_WEBHOOK_SECRET not configured - webhook signature validation disabled');
        return true;
    }
    
    if (!signature) {
        console.warn('⚠️ Webhook signature header missing');
        return false;
    }
    
    try {
        const hmac = crypto.createHmac('sha1', secret);
        hmac.update(JSON.stringify(req.body));
        const expectedSignature = 'sha1=' + hmac.digest('hex');
        
        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    } catch (error) {
        console.error('❌ Error validating webhook signature:', error);
        return false;
    }
}

/**
 * Handle notifications based on build results and project configuration
 */
async function handleBuildNotifications(project, buildResults) {
    try {
        const config = project.configuration || {};
        const notifications = config.notifications || {};
        
        if (!notifications.onFailure && !notifications.onSuccess) {
            return; // No notifications configured
        }
        
        const buildResult = buildResults.build.result;
        const shouldNotify = (buildResult === 'failed' && notifications.onFailure) ||
                            (buildResult === 'succeeded' && notifications.onSuccess);
        
        if (!shouldNotify) {
            return;
        }
        
        // This can be extended to send actual notifications (Teams, Slack, email, etc.)
        console.log(`📬 Notification triggered for project ${project.name}: Build ${buildResult}`);
        
        // Example: Teams webhook notification
        if (process.env.ADO_TEAMS_WEBHOOK && notifications.channels?.includes('teams')) {
            await sendTeamsNotification(project, buildResults);
        }
        
    } catch (error) {
        console.error('❌ Failed to handle build notifications:', error);
    }
}

/**
 * Send Teams notification (example implementation)
 */
async function sendTeamsNotification(project, buildResults) {
    try {
        const webhook = process.env.ADO_TEAMS_WEBHOOK;
        if (!webhook) return;
        
        const build = buildResults.build;
        const color = build.result === 'succeeded' ? '00FF00' : 'FF0000';
        const emoji = build.result === 'succeeded' ? '✅' : '❌';
        
        const message = {
            "@type": "MessageCard",
            "@context": "http://schema.org/extensions",
            "themeColor": color,
            "summary": `Build ${build.result} for ${project.name}`,
            "sections": [{
                "activityTitle": `${emoji} Build ${build.result.toUpperCase()}`,
                "activitySubtitle": project.name,
                "facts": [
                    { "name": "Build Number", "value": build.buildNumber },
                    { "name": "Branch", "value": build.branch || 'Unknown' },
                    { "name": "Duration", "value": `${Math.round(build.duration / 60)}m ${build.duration % 60}s` }
                ]
            }]
        };
        
        // This would require implementing the actual HTTP request
        console.log('📬 Teams notification prepared:', message.summary);
        
    } catch (error) {
        console.error('❌ Failed to send Teams notification:', error);
    }
}

module.exports = router;