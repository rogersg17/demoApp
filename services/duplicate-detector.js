/**
 * Duplicate Detector Service
 * 
 * Intelligent detection of duplicate JIRA issues to prevent spam
 * and consolidate related test failures.
 */

class DuplicateDetector {
    constructor(database) {
        this.db = database;
        this.debug = process.env.DUPLICATE_DETECTOR_DEBUG === 'true';
        
        // Similarity thresholds
        this.thresholds = {
            exact_match: 1.0,
            high_similarity: 0.85,
            medium_similarity: 0.7,
            low_similarity: 0.5
        };
        
        // Duplicate detection rules
        this.detectionRules = {
            timeWindow: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
            maxSimilarIssues: 5,
            consolidationThreshold: 0.8,
            autoMergeThreshold: 0.95
        };
        
        this.log('Duplicate Detector initialized');
    }

    /**
     * Check for duplicate JIRA issues before creating a new one
     */
    async checkForDuplicates(issueData, options = {}) {
        try {
            const {
                project_key,
                test_name,
                failure_message,
                repository_id,
                timeWindowHours = 24
            } = issueData;
            
            const timeWindow = timeWindowHours * 60 * 60 * 1000;
            const cutoffTime = new Date(Date.now() - timeWindow).toISOString();
            
            // Get recent issues from the same project
            const recentIssues = await this.getRecentIssues(project_key, cutoffTime, options);
            
            if (recentIssues.length === 0) {
                return {
                    hasDuplicates: false,
                    duplicates: [],
                    recommendation: 'create_new',
                    confidence: 1.0
                };
            }
            
            // Analyze each recent issue for similarity
            const similarities = await Promise.all(
                recentIssues.map(issue => this.calculateIssueSimilarity(issueData, issue))
            );
            
            // Sort by similarity score
            const sortedSimilarities = similarities
                .filter(sim => sim.similarity > this.thresholds.low_similarity)
                .sort((a, b) => b.similarity - a.similarity);
            
            if (sortedSimilarities.length === 0) {
                return {
                    hasDuplicates: false,
                    duplicates: [],
                    recommendation: 'create_new',
                    confidence: 1.0
                };
            }
            
            // Determine recommendation based on best match
            const bestMatch = sortedSimilarities[0];
            const recommendation = this.generateRecommendation(bestMatch, sortedSimilarities);
            
            return {
                hasDuplicates: true,
                duplicates: sortedSimilarities,
                bestMatch: bestMatch,
                recommendation: recommendation.action,
                confidence: recommendation.confidence,
                reasoning: recommendation.reasoning,
                consolidationOpportunities: this.identifyConsolidationOpportunities(sortedSimilarities)
            };
            
        } catch (error) {
            this.error('Failed to check for duplicates:', error);
            throw error;
        }
    }

    /**
     * Get recent JIRA issues from the database
     */
    async getRecentIssues(projectKey, cutoffTime, options = {}) {
        try {
            let query = `
                SELECT 
                    j.*,
                    f.test_name as failure_test_name,
                    f.failure_message,
                    f.test_file_path,
                    f.repository_id,
                    c.build_id,
                    c.pipeline_id
                FROM mvp_jira_issues j
                LEFT JOIN mvp_ado_jira_correlations c ON j.issue_key = c.jira_issue_key
                LEFT JOIN mvp_test_failures f ON c.failure_id = f.id
                WHERE j.project_key = ? 
                  AND j.created_at >= ?
                  AND j.status NOT IN ('Done', 'Closed', 'Resolved')
            `;
            
            const params = [projectKey, cutoffTime];
            
            // Add repository filter if specified
            if (options.repository_id) {
                query += ' AND f.repository_id = ?';
                params.push(options.repository_id);
            }
            
            // Add test name filter for related tests
            if (options.test_name) {
                query += ' AND (f.test_name = ? OR f.test_name LIKE ?)';
                params.push(options.test_name, `%${options.test_name}%`);
            }
            
            query += ` 
                ORDER BY j.created_at DESC 
                LIMIT ?
            `;
            params.push(options.limit || 50);
            
            const issues = await this.db.all(query, params);
            
            this.log(`Found ${issues.length} recent issues in project ${projectKey}`);
            return issues;
            
        } catch (error) {
            this.error('Failed to get recent issues:', error);
            throw error;
        }
    }

    /**
     * Calculate similarity between new issue data and existing issue
     */
    async calculateIssueSimilarity(newIssueData, existingIssue) {
        try {
            const similarity = {
                issueKey: existingIssue.issue_key,
                issueId: existingIssue.id,
                similarity: 0,
                factors: {}
            };
            
            // Test name similarity
            if (newIssueData.test_name && existingIssue.failure_test_name) {
                similarity.factors.testName = this.calculateTextSimilarity(
                    newIssueData.test_name,
                    existingIssue.failure_test_name
                );
            }
            
            // Failure message similarity
            if (newIssueData.failure_message && existingIssue.failure_message) {
                similarity.factors.failureMessage = this.calculateTextSimilarity(
                    newIssueData.failure_message,
                    existingIssue.failure_message
                );
            }
            
            // Summary similarity
            if (newIssueData.summary && existingIssue.summary) {
                similarity.factors.summary = this.calculateTextSimilarity(
                    newIssueData.summary,
                    existingIssue.summary
                );
            }
            
            // Description similarity
            if (newIssueData.description && existingIssue.description) {
                similarity.factors.description = this.calculateTextSimilarity(
                    newIssueData.description,
                    existingIssue.description
                );
            }
            
            // Repository/context similarity
            if (newIssueData.repository_id && existingIssue.repository_id) {
                similarity.factors.repository = newIssueData.repository_id === existingIssue.repository_id ? 1.0 : 0.0;
            }
            
            // File path similarity
            if (newIssueData.test_file_path && existingIssue.test_file_path) {
                similarity.factors.filePath = this.calculatePathSimilarity(
                    newIssueData.test_file_path,
                    existingIssue.test_file_path
                );
            }
            
            // Calculate weighted overall similarity
            similarity.similarity = this.calculateWeightedSimilarity(similarity.factors);
            
            // Add temporal factor (recency)
            const issueAge = Date.now() - new Date(existingIssue.created_at).getTime();
            const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
            const temporalFactor = Math.max(0, 1 - (issueAge / maxAge));
            similarity.factors.temporal = temporalFactor;
            
            // Adjust final similarity with temporal factor
            similarity.similarity = similarity.similarity * (0.8 + 0.2 * temporalFactor);
            
            return similarity;
            
        } catch (error) {
            this.error('Failed to calculate similarity:', error);
            return {
                issueKey: existingIssue.issue_key,
                issueId: existingIssue.id,
                similarity: 0,
                factors: {},
                error: error.message
            };
        }
    }

    /**
     * Calculate text similarity using multiple algorithms
     */
    calculateTextSimilarity(text1, text2) {
        if (!text1 || !text2) return 0;
        
        // Normalize texts
        const norm1 = this.normalizeText(text1);
        const norm2 = this.normalizeText(text2);
        
        if (norm1 === norm2) return 1.0;
        
        // Calculate various similarity metrics
        const levenshtein = this.levenshteinSimilarity(norm1, norm2);
        const jaccard = this.jaccardSimilarity(norm1, norm2);
        const cosine = this.cosineSimilarity(norm1, norm2);
        
        // Weighted combination
        return (levenshtein * 0.4 + jaccard * 0.3 + cosine * 0.3);
    }

    /**
     * Calculate file path similarity
     */
    calculatePathSimilarity(path1, path2) {
        if (!path1 || !path2) return 0;
        
        // Normalize paths
        const norm1 = path1.replace(/[\\\/]+/g, '/').toLowerCase();
        const norm2 = path2.replace(/[\\\/]+/g, '/').toLowerCase();
        
        if (norm1 === norm2) return 1.0;
        
        // Split paths into components
        const parts1 = norm1.split('/').filter(p => p);
        const parts2 = norm2.split('/').filter(p => p);
        
        // Calculate component overlap
        const commonParts = parts1.filter(part => parts2.includes(part));
        const similarity = (2 * commonParts.length) / (parts1.length + parts2.length);
        
        // Bonus for same filename
        const filename1 = parts1[parts1.length - 1];
        const filename2 = parts2[parts2.length - 1];
        if (filename1 === filename2) {
            return Math.max(similarity, 0.8);
        }
        
        return similarity;
    }

    /**
     * Calculate weighted similarity from multiple factors
     */
    calculateWeightedSimilarity(factors) {
        const weights = {
            testName: 0.3,
            failureMessage: 0.25,
            summary: 0.2,
            description: 0.1,
            repository: 0.1,
            filePath: 0.05
        };
        
        let weightedSum = 0;
        let totalWeight = 0;
        
        for (const [factor, value] of Object.entries(factors)) {
            if (weights[factor] && typeof value === 'number') {
                weightedSum += value * weights[factor];
                totalWeight += weights[factor];
            }
        }
        
        return totalWeight > 0 ? weightedSum / totalWeight : 0;
    }

    /**
     * Generate recommendation based on similarity analysis
     */
    generateRecommendation(bestMatch, allSimilarities) {
        const similarity = bestMatch.similarity;
        
        if (similarity >= this.thresholds.exact_match) {
            return {
                action: 'link_to_existing',
                confidence: 0.95,
                reasoning: 'Exact or near-exact match found'
            };
        }
        
        if (similarity >= this.thresholds.high_similarity) {
            return {
                action: 'update_existing',
                confidence: 0.9,
                reasoning: 'High similarity suggests same underlying issue'
            };
        }
        
        if (similarity >= this.thresholds.medium_similarity) {
            // Check if there are multiple similar issues
            const similarIssues = allSimilarities.filter(
                s => s.similarity >= this.thresholds.medium_similarity
            );
            
            if (similarIssues.length >= 3) {
                return {
                    action: 'consolidate_issues',
                    confidence: 0.8,
                    reasoning: 'Multiple similar issues suggest pattern requiring consolidation'
                };
            }
            
            return {
                action: 'create_with_reference',
                confidence: 0.7,
                reasoning: 'Moderate similarity - create new but reference existing'
            };
        }
        
        return {
            action: 'create_new',
            confidence: 0.8,
            reasoning: 'Low similarity - new issue appears distinct'
        };
    }

    /**
     * Identify consolidation opportunities
     */
    identifyConsolidationOpportunities(similarities) {
        const opportunities = [];
        
        // Group by high similarity
        const highSimilarityGroups = this.groupBySimilarity(
            similarities.filter(s => s.similarity >= this.thresholds.high_similarity)
        );
        
        for (const group of highSimilarityGroups) {
            if (group.length >= 2) {
                opportunities.push({
                    type: 'merge_candidates',
                    issues: group.map(s => s.issueKey),
                    reason: 'High similarity between multiple issues',
                    confidence: Math.min(...group.map(s => s.similarity))
                });
            }
        }
        
        // Identify potential epic/parent issue opportunities
        const mediumSimilarityIssues = similarities.filter(
            s => s.similarity >= this.thresholds.medium_similarity && 
                 s.similarity < this.thresholds.high_similarity
        );
        
        if (mediumSimilarityIssues.length >= 3) {
            opportunities.push({
                type: 'epic_opportunity',
                issues: mediumSimilarityIssues.map(s => s.issueKey),
                reason: 'Multiple related issues could be grouped under epic',
                confidence: 0.7
            });
        }
        
        return opportunities;
    }

    /**
     * Group similarities by threshold ranges
     */
    groupBySimilarity(similarities) {
        const groups = [];
        const processed = new Set();
        
        for (const similarity of similarities) {
            if (processed.has(similarity.issueKey)) continue;
            
            const group = [similarity];
            processed.add(similarity.issueKey);
            
            // Find similar items
            for (const other of similarities) {
                if (processed.has(other.issueKey)) continue;
                
                if (Math.abs(similarity.similarity - other.similarity) < 0.1) {
                    group.push(other);
                    processed.add(other.issueKey);
                }
            }
            
            groups.push(group);
        }
        
        return groups;
    }

    /**
     * Execute consolidation action
     */
    async executeConsolidation(consolidationPlan) {
        try {
            const results = [];
            
            for (const action of consolidationPlan.actions) {
                switch (action.type) {
                    case 'merge_issues':
                        const mergeResult = await this.mergeIssues(action.sourceIssues, action.targetIssue);
                        results.push(mergeResult);
                        break;
                        
                    case 'create_epic':
                        const epicResult = await this.createEpic(action.issues, action.epicData);
                        results.push(epicResult);
                        break;
                        
                    case 'link_issues':
                        const linkResult = await this.linkRelatedIssues(action.issues, action.linkType);
                        results.push(linkResult);
                        break;
                        
                    default:
                        results.push({
                            action: action.type,
                            status: 'skipped',
                            reason: 'Unknown action type'
                        });
                }
            }
            
            return {
                success: true,
                results,
                consolidationPlan
            };
            
        } catch (error) {
            this.error('Failed to execute consolidation:', error);
            throw error;
        }
    }

    /**
     * Normalize text for comparison
     */
    normalizeText(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Calculate Levenshtein similarity
     */
    levenshteinSimilarity(str1, str2) {
        const matrix = [];
        const len1 = str1.length;
        const len2 = str2.length;

        if (len1 === 0) return len2 === 0 ? 1 : 0;
        if (len2 === 0) return 0;

        for (let i = 0; i <= len1; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= len2; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j - 1] + cost
                );
            }
        }

        const distance = matrix[len1][len2];
        const maxLength = Math.max(len1, len2);
        return 1 - (distance / maxLength);
    }

    /**
     * Calculate Jaccard similarity
     */
    jaccardSimilarity(str1, str2) {
        const words1 = new Set(str1.split(/\s+/));
        const words2 = new Set(str2.split(/\s+/));
        
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        
        return union.size === 0 ? 0 : intersection.size / union.size;
    }

    /**
     * Calculate cosine similarity
     */
    cosineSimilarity(str1, str2) {
        const words1 = str1.split(/\s+/);
        const words2 = str2.split(/\s+/);
        
        const wordSet = new Set([...words1, ...words2]);
        const vector1 = [];
        const vector2 = [];
        
        for (const word of wordSet) {
            vector1.push(words1.filter(w => w === word).length);
            vector2.push(words2.filter(w => w === word).length);
        }
        
        const dotProduct = vector1.reduce((sum, val, i) => sum + val * vector2[i], 0);
        const magnitude1 = Math.sqrt(vector1.reduce((sum, val) => sum + val * val, 0));
        const magnitude2 = Math.sqrt(vector2.reduce((sum, val) => sum + val * val, 0));
        
        return magnitude1 === 0 || magnitude2 === 0 ? 0 : dotProduct / (magnitude1 * magnitude2);
    }

    /**
     * Log debug information
     */
    log(...args) {
        if (this.debug) {
            console.log('[DUPLICATE-DETECTOR]', ...args);
        }
    }

    /**
     * Log error information
     */
    error(...args) {
        console.error('[DUPLICATE-DETECTOR ERROR]', ...args);
    }
}

module.exports = DuplicateDetector;
