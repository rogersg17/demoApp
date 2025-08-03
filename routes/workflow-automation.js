/**
 * Workflow Automation API Routes
 * 
 * Provides REST API endpoints for configuring and managing automated 
 * workflows between Azure DevOps and JIRA.
 */

const express = require('express');
const router = express.Router();

/**
 * Get all workflow rules
 */
router.get('/rules', async (req, res) => {
    try {
        const { project_id, status, type } = req.query;
        
        let query = 'SELECT * FROM mvp_workflow_rules WHERE 1=1';
        const params = [];
        
        if (project_id) {
            query += ' AND project_id = ?';
            params.push(project_id);
        }
        
        if (status) {
            query += ' AND is_active = ?';
            params.push(status === 'active' ? 1 : 0);
        }
        
        if (type) {
            query += ' AND rule_type = ?';
            params.push(type);
        }
        
        query += ' ORDER BY priority DESC, created_at ASC';
        
        const rules = await req.db.all(query, params);
        
        // Parse JSON fields
        const enrichedRules = rules.map(rule => ({
            ...rule,
            conditions: JSON.parse(rule.conditions || '{}'),
            actions: JSON.parse(rule.actions || '{}'),
            jira_config: JSON.parse(rule.jira_config || '{}')
        }));
        
        res.json({
            success: true,
            rules: enrichedRules,
            count: enrichedRules.length
        });
        
    } catch (error) {
        console.error('Failed to fetch workflow rules:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch workflow rules',
            details: error.message
        });
    }
});

/**
 * Create a new workflow rule
 */
router.post('/rules', async (req, res) => {
    try {
        const {
            name,
            description,
            rule_type,
            project_id,
            conditions,
            actions,
            jira_config,
            priority = 100,
            is_active = true
        } = req.body;
        
        // Validation
        if (!name || !rule_type || !conditions || !actions) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: name, rule_type, conditions, actions'
            });
        }
        
        // Validate rule type
        const validRuleTypes = ['failure_to_jira', 'jira_update', 'notification', 'escalation'];
        if (!validRuleTypes.includes(rule_type)) {
            return res.status(400).json({
                success: false,
                error: `Invalid rule_type. Must be one of: ${validRuleTypes.join(', ')}`
            });
        }
        
        // Validate conditions structure
        if (!validateConditions(conditions, rule_type)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid conditions structure for rule type'
            });
        }
        
        // Insert rule
        const result = await req.db.run(`
            INSERT INTO mvp_workflow_rules (
                name, description, rule_type, project_id, conditions, 
                actions, jira_config, priority, is_active, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `, [
            name,
            description,
            rule_type,
            project_id,
            JSON.stringify(conditions),
            JSON.stringify(actions),
            JSON.stringify(jira_config || {}),
            priority,
            is_active ? 1 : 0
        ]);
        
        // Fetch the created rule
        const newRule = await req.db.get(`
            SELECT * FROM mvp_workflow_rules WHERE id = ?
        `, [result.lastID]);
        
        res.status(201).json({
            success: true,
            rule: {
                ...newRule,
                conditions: JSON.parse(newRule.conditions),
                actions: JSON.parse(newRule.actions),
                jira_config: JSON.parse(newRule.jira_config || '{}')
            }
        });
        
    } catch (error) {
        console.error('Failed to create workflow rule:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create workflow rule',
            details: error.message
        });
    }
});

/**
 * Update a workflow rule
 */
router.put('/rules/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            description,
            rule_type,
            project_id,
            conditions,
            actions,
            jira_config,
            priority,
            is_active
        } = req.body;
        
        // Check if rule exists
        const existingRule = await req.db.get(`
            SELECT * FROM mvp_workflow_rules WHERE id = ?
        `, [id]);
        
        if (!existingRule) {
            return res.status(404).json({
                success: false,
                error: 'Workflow rule not found'
            });
        }
        
        // Build update query dynamically
        const updates = [];
        const params = [];
        
        if (name !== undefined) {
            updates.push('name = ?');
            params.push(name);
        }
        if (description !== undefined) {
            updates.push('description = ?');
            params.push(description);
        }
        if (rule_type !== undefined) {
            const validRuleTypes = ['failure_to_jira', 'jira_update', 'notification', 'escalation'];
            if (!validRuleTypes.includes(rule_type)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid rule_type. Must be one of: ${validRuleTypes.join(', ')}`
                });
            }
            updates.push('rule_type = ?');
            params.push(rule_type);
        }
        if (project_id !== undefined) {
            updates.push('project_id = ?');
            params.push(project_id);
        }
        if (conditions !== undefined) {
            if (!validateConditions(conditions, rule_type || existingRule.rule_type)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid conditions structure for rule type'
                });
            }
            updates.push('conditions = ?');
            params.push(JSON.stringify(conditions));
        }
        if (actions !== undefined) {
            updates.push('actions = ?');
            params.push(JSON.stringify(actions));
        }
        if (jira_config !== undefined) {
            updates.push('jira_config = ?');
            params.push(JSON.stringify(jira_config));
        }
        if (priority !== undefined) {
            updates.push('priority = ?');
            params.push(priority);
        }
        if (is_active !== undefined) {
            updates.push('is_active = ?');
            params.push(is_active ? 1 : 0);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No fields to update'
            });
        }
        
        updates.push('updated_at = datetime("now")');
        params.push(id);
        
        await req.db.run(`
            UPDATE mvp_workflow_rules 
            SET ${updates.join(', ')}
            WHERE id = ?
        `, params);
        
        // Fetch updated rule
        const updatedRule = await req.db.get(`
            SELECT * FROM mvp_workflow_rules WHERE id = ?
        `, [id]);
        
        res.json({
            success: true,
            rule: {
                ...updatedRule,
                conditions: JSON.parse(updatedRule.conditions),
                actions: JSON.parse(updatedRule.actions),
                jira_config: JSON.parse(updatedRule.jira_config || '{}')
            }
        });
        
    } catch (error) {
        console.error('Failed to update workflow rule:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update workflow rule',
            details: error.message
        });
    }
});

/**
 * Delete a workflow rule
 */
router.delete('/rules/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await req.db.run(`
            DELETE FROM mvp_workflow_rules WHERE id = ?
        `, [id]);
        
        if (result.changes === 0) {
            return res.status(404).json({
                success: false,
                error: 'Workflow rule not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Workflow rule deleted successfully'
        });
        
    } catch (error) {
        console.error('Failed to delete workflow rule:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete workflow rule',
            details: error.message
        });
    }
});

/**
 * Test a workflow rule against sample data
 */
router.post('/rules/:id/test', async (req, res) => {
    try {
        const { id } = req.params;
        const { sample_data } = req.body;
        
        if (!sample_data) {
            return res.status(400).json({
                success: false,
                error: 'sample_data is required'
            });
        }
        
        // Fetch rule
        const rule = await req.db.get(`
            SELECT * FROM mvp_workflow_rules WHERE id = ?
        `, [id]);
        
        if (!rule) {
            return res.status(404).json({
                success: false,
                error: 'Workflow rule not found'
            });
        }
        
        // Parse rule configuration
        const conditions = JSON.parse(rule.conditions);
        const actions = JSON.parse(rule.actions);
        
        // Test conditions
        const conditionResult = evaluateConditions(conditions, sample_data);
        
        let actionResult = null;
        if (conditionResult.matched) {
            // Simulate action execution
            actionResult = simulateActions(actions, sample_data);
        }
        
        res.json({
            success: true,
            test_result: {
                rule_id: rule.id,
                rule_name: rule.name,
                conditions_matched: conditionResult.matched,
                condition_details: conditionResult.details,
                actions_executed: conditionResult.matched,
                action_simulation: actionResult,
                sample_data
            }
        });
        
    } catch (error) {
        console.error('Failed to test workflow rule:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to test workflow rule',
            details: error.message
        });
    }
});

/**
 * Get workflow execution history
 */
router.get('/history', async (req, res) => {
    try {
        const { 
            rule_id, 
            status, 
            start_date, 
            end_date, 
            limit = 50, 
            offset = 0 
        } = req.query;
        
        let query = `
            SELECT h.*, r.name as rule_name, r.rule_type
            FROM mvp_workflow_history h
            LEFT JOIN mvp_workflow_rules r ON h.rule_id = r.id
            WHERE 1=1
        `;
        const params = [];
        
        if (rule_id) {
            query += ' AND h.rule_id = ?';
            params.push(rule_id);
        }
        
        if (status) {
            query += ' AND h.status = ?';
            params.push(status);
        }
        
        if (start_date) {
            query += ' AND h.created_at >= ?';
            params.push(start_date);
        }
        
        if (end_date) {
            query += ' AND h.created_at <= ?';
            params.push(end_date);
        }
        
        query += ' ORDER BY h.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const history = await req.db.all(query, params);
        
        // Parse JSON fields
        const enrichedHistory = history.map(entry => ({
            ...entry,
            input_data: JSON.parse(entry.input_data || '{}'),
            result_data: JSON.parse(entry.result_data || '{}'),
            error_details: entry.error_details ? JSON.parse(entry.error_details) : null
        }));
        
        // Get total count for pagination
        let countQuery = `
            SELECT COUNT(*) as total
            FROM mvp_workflow_history h
            WHERE 1=1
        `;
        const countParams = [];
        
        if (rule_id) {
            countQuery += ' AND h.rule_id = ?';
            countParams.push(rule_id);
        }
        
        if (status) {
            countQuery += ' AND h.status = ?';
            countParams.push(status);
        }
        
        if (start_date) {
            countQuery += ' AND h.created_at >= ?';
            countParams.push(start_date);
        }
        
        if (end_date) {
            countQuery += ' AND h.created_at <= ?';
            countParams.push(end_date);
        }
        
        const countResult = await req.db.get(countQuery, countParams);
        
        res.json({
            success: true,
            history: enrichedHistory,
            pagination: {
                total: countResult.total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                has_more: (parseInt(offset) + enrichedHistory.length) < countResult.total
            }
        });
        
    } catch (error) {
        console.error('Failed to fetch workflow history:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch workflow history',
            details: error.message
        });
    }
});

/**
 * Get workflow statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const { period = '7d', rule_id } = req.query;
        
        // Calculate date range
        const periodHours = {
            '1h': 1,
            '24h': 24,
            '7d': 24 * 7,
            '30d': 24 * 30,
            '90d': 24 * 90
        };
        
        const hours = periodHours[period] || 24 * 7;
        const startDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
        
        // Build base query
        let baseWhere = 'WHERE h.created_at >= ?';
        let params = [startDate];
        
        if (rule_id) {
            baseWhere += ' AND h.rule_id = ?';
            params.push(rule_id);
        }
        
        // Get execution statistics
        const execStats = await req.db.all(`
            SELECT 
                h.status,
                COUNT(*) as count,
                AVG(h.execution_time_ms) as avg_execution_time
            FROM mvp_workflow_history h
            ${baseWhere}
            GROUP BY h.status
        `, params);
        
        // Get rule performance
        const ruleStats = await req.db.all(`
            SELECT 
                r.id,
                r.name,
                r.rule_type,
                COUNT(h.id) as executions,
                SUM(CASE WHEN h.status = 'success' THEN 1 ELSE 0 END) as successes,
                SUM(CASE WHEN h.status = 'error' THEN 1 ELSE 0 END) as errors,
                AVG(h.execution_time_ms) as avg_execution_time
            FROM mvp_workflow_rules r
            LEFT JOIN mvp_workflow_history h ON r.id = h.rule_id AND h.created_at >= ?
            ${rule_id ? 'WHERE r.id = ?' : ''}
            GROUP BY r.id, r.name, r.rule_type
            ORDER BY executions DESC
        `, rule_id ? [startDate, rule_id] : [startDate]);
        
        // Get daily execution trends
        const dailyTrends = await req.db.all(`
            SELECT 
                DATE(h.created_at) as date,
                COUNT(*) as executions,
                SUM(CASE WHEN h.status = 'success' THEN 1 ELSE 0 END) as successes,
                SUM(CASE WHEN h.status = 'error' THEN 1 ELSE 0 END) as errors
            FROM mvp_workflow_history h
            ${baseWhere}
            GROUP BY DATE(h.created_at)
            ORDER BY date
        `, params);
        
        res.json({
            success: true,
            period,
            statistics: {
                execution_summary: execStats.reduce((acc, stat) => {
                    acc[stat.status] = {
                        count: stat.count,
                        avg_execution_time: stat.avg_execution_time
                    };
                    return acc;
                }, {}),
                rule_performance: ruleStats.map(stat => ({
                    ...stat,
                    success_rate: stat.executions > 0 ? stat.successes / stat.executions : 0
                })),
                daily_trends: dailyTrends
            }
        });
        
    } catch (error) {
        console.error('Failed to fetch workflow statistics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch workflow statistics',
            details: error.message
        });
    }
});

/**
 * Manual workflow trigger
 */
router.post('/trigger', async (req, res) => {
    try {
        const { rule_id, trigger_data, force = false } = req.body;
        
        if (!rule_id || !trigger_data) {
            return res.status(400).json({
                success: false,
                error: 'rule_id and trigger_data are required'
            });
        }
        
        // Fetch rule
        const rule = await req.db.get(`
            SELECT * FROM mvp_workflow_rules WHERE id = ? AND is_active = 1
        `, [rule_id]);
        
        if (!rule) {
            return res.status(404).json({
                success: false,
                error: 'Active workflow rule not found'
            });
        }
        
        // Get JIRA-ADO bridge service
        const JiraAdoBridge = require('../services/mvp-jira-ado-bridge');
        const bridge = new JiraAdoBridge(req.db);
        
        // Trigger workflow execution
        const result = await bridge.executeWorkflowRule(rule, trigger_data, { 
            manual_trigger: true,
            force_execution: force 
        });
        
        res.json({
            success: true,
            execution_result: result,
            rule_name: rule.name,
            trigger_type: 'manual'
        });
        
    } catch (error) {
        console.error('Failed to trigger workflow:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to trigger workflow',
            details: error.message
        });
    }
});

/**
 * Validate workflow rule conditions
 */
function validateConditions(conditions, ruleType) {
    if (!conditions || typeof conditions !== 'object') {
        return false;
    }
    
    const requiredFields = {
        'failure_to_jira': ['test_name', 'failure_type'],
        'jira_update': ['issue_key'],
        'notification': ['recipient'],
        'escalation': ['escalation_level']
    };
    
    const required = requiredFields[ruleType] || [];
    
    // Check if at least one required field exists in conditions
    return required.length === 0 || required.some(field => {
        return conditions.hasOwnProperty(field) || 
               (conditions.criteria && conditions.criteria.hasOwnProperty(field));
    });
}

/**
 * Evaluate conditions against sample data
 */
function evaluateConditions(conditions, data) {
    try {
        const result = {
            matched: false,
            details: {}
        };
        
        // Simple condition evaluation
        if (conditions.criteria) {
            const criteria = conditions.criteria;
            let matches = 0;
            let total = 0;
            
            for (const [key, expectedValue] of Object.entries(criteria)) {
                total++;
                const actualValue = getNestedValue(data, key);
                
                if (Array.isArray(expectedValue)) {
                    if (expectedValue.includes(actualValue)) {
                        matches++;
                        result.details[key] = { matched: true, expected: expectedValue, actual: actualValue };
                    } else {
                        result.details[key] = { matched: false, expected: expectedValue, actual: actualValue };
                    }
                } else if (typeof expectedValue === 'string' && expectedValue.startsWith('regex:')) {
                    const regex = new RegExp(expectedValue.substring(6));
                    if (regex.test(String(actualValue))) {
                        matches++;
                        result.details[key] = { matched: true, expected: expectedValue, actual: actualValue };
                    } else {
                        result.details[key] = { matched: false, expected: expectedValue, actual: actualValue };
                    }
                } else {
                    if (actualValue === expectedValue) {
                        matches++;
                        result.details[key] = { matched: true, expected: expectedValue, actual: actualValue };
                    } else {
                        result.details[key] = { matched: false, expected: expectedValue, actual: actualValue };
                    }
                }
            }
            
            const operator = conditions.operator || 'and';
            if (operator === 'and') {
                result.matched = matches === total;
            } else if (operator === 'or') {
                result.matched = matches > 0;
            }
        }
        
        return result;
        
    } catch (error) {
        return {
            matched: false,
            details: { error: error.message }
        };
    }
}

/**
 * Simulate action execution
 */
function simulateActions(actions, data) {
    const simulation = {};
    
    for (const [actionType, actionConfig] of Object.entries(actions)) {
        switch (actionType) {
            case 'create_jira_issue':
                simulation[actionType] = {
                    would_create: 'JIRA issue',
                    project: actionConfig.project,
                    issue_type: actionConfig.issue_type,
                    summary: replaceTemplateVars(actionConfig.summary || 'Test Failure', data),
                    description: replaceTemplateVars(actionConfig.description || 'Automated issue creation', data)
                };
                break;
                
            case 'update_jira_issue':
                simulation[actionType] = {
                    would_update: actionConfig.issue_key,
                    fields: actionConfig.fields
                };
                break;
                
            case 'send_notification':
                simulation[actionType] = {
                    would_notify: actionConfig.recipients,
                    message: replaceTemplateVars(actionConfig.message || 'Workflow notification', data)
                };
                break;
                
            default:
                simulation[actionType] = {
                    would_execute: 'custom action',
                    config: actionConfig
                };
        }
    }
    
    return simulation;
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
}

/**
 * Replace template variables in strings
 */
function replaceTemplateVars(template, data) {
    if (typeof template !== 'string') return template;
    
    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
        const value = getNestedValue(data, path.trim());
        return value !== undefined ? String(value) : match;
    });
}

module.exports = router;
