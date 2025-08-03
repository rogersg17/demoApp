/**
 * ADO Test Correlation Utility
 * 
 * Maps ADO test results to test metadata and handles test name variations
 * across different frameworks and build configurations.
 */

class AdoTestCorrelation {
    constructor(database) {
        this.db = database;
        this.debug = process.env.ADO_CORRELATION_DEBUG === 'true';
        
        // Test name normalization patterns
        this.normalizationPatterns = [
            // Remove common test framework prefixes/suffixes
            { pattern: /^Test\s*/i, replacement: '' },
            { pattern: /\s*Test$/i, replacement: '' },
            { pattern: /^it\s*/i, replacement: '' },
            { pattern: /^describe\s*/i, replacement: '' },
            { pattern: /^should\s*/i, replacement: '' },
            
            // Normalize separators
            { pattern: /[_\-\.]+/g, replacement: ' ' },
            { pattern: /([a-z])([A-Z])/g, replacement: '$1 $2' }, // camelCase
            
            // Remove common noise words
            { pattern: /\b(test|spec|should|can|will|does|is|has|with|when|then|given)\b/gi, replacement: '' },
            
            // Normalize whitespace
            { pattern: /\s+/g, replacement: ' ' },
            { pattern: /^\s+|\s+$/g, replacement: '' }
        ];
        
        // Framework-specific patterns
        this.frameworkPatterns = {
            playwright: {
                // Playwright test patterns: file.spec.js > describe > test
                testNamePattern: /^(.+\.(?:spec|test)\.[jt]s)\s*>\s*(.+?)\s*>\s*(.+)$/,
                filePattern: /\.(?:spec|test)\.[jt]s$/,
                normalizeTitle: (title) => title.replace(/['"]/g, '').trim()
            },
            jest: {
                // Jest patterns: describe > it/test
                testNamePattern: /^(.+?)\s*>\s*(.+)$/,
                filePattern: /\.(?:test|spec)\.[jt]sx?$/,
                normalizeTitle: (title) => title.replace(/['"]/g, '').trim()
            },
            mocha: {
                // Mocha patterns: describe > it
                testNamePattern: /^(.+?)\s*>\s*(.+)$/,
                filePattern: /\.(?:test|spec)\.js$/,
                normalizeTitle: (title) => title.replace(/['"]/g, '').trim()
            },
            cypress: {
                // Cypress patterns: file.cy.js > describe > it
                testNamePattern: /^(.+\.cy\.[jt]s)\s*>\s*(.+?)\s*>\s*(.+)$/,
                filePattern: /\.cy\.[jt]s$/,
                normalizeTitle: (title) => title.replace(/['"]/g, '').trim()
            },
            vitest: {
                // Vitest patterns similar to Jest
                testNamePattern: /^(.+?)\s*>\s*(.+)$/,
                filePattern: /\.(?:test|spec)\.[jt]sx?$/,
                normalizeTitle: (title) => title.replace(/['"]/g, '').trim()
            }
        };
        
        // Confidence scoring weights
        this.confidenceWeights = {
            exactMatch: 1.0,
            normalizedMatch: 0.9,
            fuzzyMatch: 0.8,
            filePathMatch: 0.7,
            frameworkMatch: 0.6,
            partialMatch: 0.5,
            similarityThreshold: 0.6
        };
        
        this.log('ADO Test Correlation initialized');
    }

    /**
     * Map ADO test results to test metadata with confidence scoring
     */
    async correlateTestResults(adoTestResults, buildContext = {}) {
        try {
            const correlations = [];
            const unmatchedTests = [];

            for (const adoTest of adoTestResults) {
                const correlation = await this.findBestMatch(adoTest, buildContext);
                
                if (correlation && correlation.confidence >= this.confidenceWeights.similarityThreshold) {
                    correlations.push({
                        adoTest,
                        testMetadata: correlation.testMetadata,
                        confidence: correlation.confidence,
                        matchType: correlation.matchType,
                        correlationDetails: correlation.details
                    });
                } else {
                    unmatchedTests.push({
                        adoTest,
                        bestAttempt: correlation,
                        reason: correlation ? 'Low confidence' : 'No matches found'
                    });
                }
            }

            const result = {
                correlations,
                unmatchedTests,
                stats: {
                    total: adoTestResults.length,
                    matched: correlations.length,
                    unmatched: unmatchedTests.length,
                    matchRate: correlations.length / adoTestResults.length
                }
            };

            this.log(`Correlation complete: ${result.stats.matched}/${result.stats.total} tests matched (${Math.round(result.stats.matchRate * 100)}%)`);
            return result;

        } catch (error) {
            this.error('Failed to correlate test results:', error);
            throw error;
        }
    }

    /**
     * Find the best match for an ADO test result
     */
    async findBestMatch(adoTest, buildContext) {
        try {
            const candidates = await this.getCandidateMatches(adoTest, buildContext);
            
            if (candidates.length === 0) {
                return null;
            }

            // Score each candidate
            const scoredCandidates = candidates.map(candidate => ({
                ...candidate,
                score: this.calculateMatchScore(adoTest, candidate, buildContext)
            }));

            // Sort by score (highest first)
            scoredCandidates.sort((a, b) => b.score.totalScore - a.score.totalScore);
            
            const bestMatch = scoredCandidates[0];
            
            return {
                testMetadata: bestMatch,
                confidence: bestMatch.score.totalScore,
                matchType: bestMatch.score.primaryMatchType,
                details: {
                    scoreBreakdown: bestMatch.score,
                    alternativeCandidates: scoredCandidates.slice(1, 3), // Top 2 alternatives
                    matchingStrategy: bestMatch.score.strategy
                }
            };

        } catch (error) {
            this.error('Failed to find best match:', error);
            throw error;
        }
    }

    /**
     * Get candidate matches from test metadata
     */
    async getCandidateMatches(adoTest, buildContext) {
        const candidates = [];
        
        try {
            // Direct name match
            const directMatches = await this.db.all(`
                SELECT * FROM test_metadata 
                WHERE test_name = ? OR display_name = ?
                LIMIT 10
            `, [adoTest.testName, adoTest.testName]);
            candidates.push(...directMatches.map(tm => ({ ...tm, source: 'direct' })));

            // Normalized name match
            const normalizedAdoName = this.normalizeTestName(adoTest.testName);
            if (normalizedAdoName !== adoTest.testName) {
                const normalizedMatches = await this.db.all(`
                    SELECT * FROM test_metadata 
                    WHERE LOWER(TRIM(test_name)) = LOWER(?) 
                       OR LOWER(TRIM(display_name)) = LOWER(?)
                    LIMIT 10
                `, [normalizedAdoName, normalizedAdoName]);
                candidates.push(...normalizedMatches.map(tm => ({ ...tm, source: 'normalized' })));
            }

            // File path match (if available)
            if (adoTest.filePath || adoTest.testFile) {
                const filePath = adoTest.filePath || adoTest.testFile;
                const fileMatches = await this.db.all(`
                    SELECT * FROM test_metadata 
                    WHERE file_path LIKE ?
                    LIMIT 10
                `, [`%${filePath}%`]);
                candidates.push(...fileMatches.map(tm => ({ ...tm, source: 'filepath' })));
            }

            // Framework-specific matching
            if (buildContext.repository) {
                const frameworkMatches = await this.getFrameworkSpecificMatches(
                    adoTest, 
                    buildContext.repository
                );
                candidates.push(...frameworkMatches);
            }

            // Fuzzy search on test content
            const fuzzyMatches = await this.performFuzzySearch(adoTest);
            candidates.push(...fuzzyMatches);

            // Remove duplicates
            const uniqueCandidates = this.removeDuplicateCandidates(candidates);
            
            return uniqueCandidates;

        } catch (error) {
            this.error('Failed to get candidate matches:', error);
            return [];
        }
    }

    /**
     * Calculate match score for a candidate
     */
    calculateMatchScore(adoTest, candidate, buildContext) {
        const score = {
            nameMatch: 0,
            filePathMatch: 0,
            frameworkMatch: 0,
            contentMatch: 0,
            contextMatch: 0,
            totalScore: 0,
            primaryMatchType: 'none',
            strategy: candidate.source || 'unknown'
        };

        // Name matching
        const nameScore = this.calculateNameSimilarity(adoTest.testName, candidate.test_name);
        score.nameMatch = nameScore.score;
        
        if (nameScore.score >= 0.95) {
            score.primaryMatchType = 'exact_name';
        } else if (nameScore.score >= 0.8) {
            score.primaryMatchType = 'similar_name';
        }

        // File path matching
        if (adoTest.filePath && candidate.file_path) {
            score.filePathMatch = this.calculateFilePathSimilarity(
                adoTest.filePath, 
                candidate.file_path
            );
            
            if (score.filePathMatch > score.nameMatch) {
                score.primaryMatchType = 'file_path';
            }
        }

        // Framework-specific matching
        if (candidate.framework) {
            score.frameworkMatch = this.calculateFrameworkScore(adoTest, candidate);
        }

        // Content similarity (if test details available)
        if (adoTest.testDetails && candidate.description) {
            score.contentMatch = this.calculateContentSimilarity(
                adoTest.testDetails, 
                candidate.description
            );
        }

        // Context matching (repository, branch, etc.)
        if (buildContext.repository && candidate.repository_id) {
            score.contextMatch = this.calculateContextScore(buildContext, candidate);
        }

        // Calculate weighted total score
        score.totalScore = (
            score.nameMatch * 0.4 +
            score.filePathMatch * 0.25 +
            score.frameworkMatch * 0.15 +
            score.contentMatch * 0.1 +
            score.contextMatch * 0.1
        );

        return score;
    }

    /**
     * Calculate name similarity between ADO test and candidate
     */
    calculateNameSimilarity(adoName, candidateName) {
        // Exact match
        if (adoName === candidateName) {
            return { score: 1.0, type: 'exact' };
        }

        // Case-insensitive match
        if (adoName.toLowerCase() === candidateName.toLowerCase()) {
            return { score: 0.95, type: 'case_insensitive' };
        }

        // Normalized match
        const normalizedAdo = this.normalizeTestName(adoName);
        const normalizedCandidate = this.normalizeTestName(candidateName);
        
        if (normalizedAdo === normalizedCandidate) {
            return { score: 0.9, type: 'normalized' };
        }

        // Levenshtein distance-based similarity
        const similarity = this.calculateLevenshteinSimilarity(normalizedAdo, normalizedCandidate);
        return { score: similarity, type: 'fuzzy' };
    }

    /**
     * Calculate file path similarity
     */
    calculateFilePathSimilarity(adoPath, candidatePath) {
        if (!adoPath || !candidatePath) return 0;

        // Normalize paths
        const normalizePathSeparators = (path) => path.replace(/[\\\/]+/g, '/');
        const normAdoPath = normalizePathSeparators(adoPath.toLowerCase());
        const normCandidatePath = normalizePathSeparators(candidatePath.toLowerCase());

        // Exact match
        if (normAdoPath === normCandidatePath) return 1.0;

        // Filename match
        const adoFilename = normAdoPath.split('/').pop();
        const candidateFilename = normCandidatePath.split('/').pop();
        
        if (adoFilename === candidateFilename) return 0.8;

        // Path contains match
        if (normCandidatePath.includes(normAdoPath) || normAdoPath.includes(normCandidatePath)) {
            return 0.6;
        }

        // Directory structure similarity
        const adoParts = normAdoPath.split('/').filter(p => p);
        const candidateParts = normCandidatePath.split('/').filter(p => p);
        
        const commonParts = adoParts.filter(part => candidateParts.includes(part));
        const similarity = commonParts.length / Math.max(adoParts.length, candidateParts.length);
        
        return similarity * 0.5; // Max 0.5 for path structure similarity
    }

    /**
     * Normalize test name for better matching
     */
    normalizeTestName(testName) {
        if (!testName) return '';
        
        let normalized = testName;
        
        // Apply normalization patterns
        for (const pattern of this.normalizationPatterns) {
            normalized = normalized.replace(pattern.pattern, pattern.replacement);
        }
        
        return normalized.toLowerCase().trim();
    }

    /**
     * Calculate Levenshtein similarity
     */
    calculateLevenshteinSimilarity(str1, str2) {
        const matrix = [];
        const len1 = str1.length;
        const len2 = str2.length;

        if (len1 === 0) return len2 === 0 ? 1 : 0;
        if (len2 === 0) return 0;

        // Initialize matrix
        for (let i = 0; i <= len1; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= len2; j++) {
            matrix[0][j] = j;
        }

        // Fill matrix
        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,      // deletion
                    matrix[i][j - 1] + 1,      // insertion
                    matrix[i - 1][j - 1] + cost // substitution
                );
            }
        }

        const distance = matrix[len1][len2];
        const maxLength = Math.max(len1, len2);
        return 1 - (distance / maxLength);
    }

    /**
     * Get framework-specific matches
     */
    async getFrameworkSpecificMatches(adoTest, repository) {
        const matches = [];
        
        for (const [framework, patterns] of Object.entries(this.frameworkPatterns)) {
            try {
                const frameworkTests = await this.db.all(`
                    SELECT * FROM test_metadata 
                    WHERE repository_id = ? AND framework = ?
                    LIMIT 5
                `, [repository.id, framework]);

                for (const test of frameworkTests) {
                    if (this.matchesFrameworkPattern(adoTest, test, patterns)) {
                        matches.push({ ...test, source: `framework_${framework}` });
                    }
                }
            } catch (error) {
                this.error(`Framework matching error for ${framework}:`, error);
            }
        }
        
        return matches;
    }

    /**
     * Check if test matches framework pattern
     */
    matchesFrameworkPattern(adoTest, candidate, patterns) {
        const adoMatch = patterns.testNamePattern.exec(adoTest.testName);
        const candidateMatch = patterns.testNamePattern.exec(candidate.test_name);
        
        if (adoMatch && candidateMatch) {
            // Compare extracted parts
            for (let i = 1; i < adoMatch.length; i++) {
                if (adoMatch[i] && candidateMatch[i]) {
                    const normalizedAdo = patterns.normalizeTitle(adoMatch[i]);
                    const normalizedCandidate = patterns.normalizeTitle(candidateMatch[i]);
                    
                    if (normalizedAdo === normalizedCandidate) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }

    /**
     * Perform fuzzy search
     */
    async performFuzzySearch(adoTest) {
        try {
            // Use FTS if available, otherwise fall back to LIKE
            const searchTerm = this.normalizeTestName(adoTest.testName);
            const words = searchTerm.split(' ').filter(w => w.length > 2);
            
            if (words.length === 0) return [];
            
            const likeConditions = words.map(() => 'LOWER(test_name) LIKE ?').join(' AND ');
            const params = words.map(word => `%${word}%`);
            
            const fuzzyMatches = await this.db.all(`
                SELECT * FROM test_metadata 
                WHERE ${likeConditions}
                LIMIT 10
            `, params);
            
            return fuzzyMatches.map(tm => ({ ...tm, source: 'fuzzy' }));
            
        } catch (error) {
            this.error('Fuzzy search failed:', error);
            return [];
        }
    }

    /**
     * Remove duplicate candidates
     */
    removeDuplicateCandidates(candidates) {
        const seen = new Set();
        return candidates.filter(candidate => {
            const key = `${candidate.id}_${candidate.source}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    /**
     * Calculate framework score
     */
    calculateFrameworkScore(adoTest, candidate) {
        if (!candidate.framework) return 0;
        
        // Infer framework from ADO test characteristics
        const inferredFramework = this.inferFrameworkFromAdoTest(adoTest);
        
        if (inferredFramework === candidate.framework) {
            return 1.0;
        }
        
        // Check compatible frameworks
        const compatibleFrameworks = {
            'jest': ['vitest'],
            'vitest': ['jest'],
            'mocha': ['jasmine'],
            'jasmine': ['mocha']
        };
        
        if (compatibleFrameworks[inferredFramework]?.includes(candidate.framework)) {
            return 0.7;
        }
        
        return 0.3; // Some framework match is better than none
    }

    /**
     * Infer framework from ADO test characteristics
     */
    inferFrameworkFromAdoTest(adoTest) {
        const testName = adoTest.testName.toLowerCase();
        const filePath = (adoTest.filePath || '').toLowerCase();
        
        if (filePath.includes('.spec.') || filePath.includes('.test.')) {
            if (filePath.includes('.cy.')) return 'cypress';
            if (testName.includes('playwright')) return 'playwright';
            if (testName.includes('jest')) return 'jest';
            if (testName.includes('vitest')) return 'vitest';
            if (testName.includes('mocha')) return 'mocha';
        }
        
        return 'unknown';
    }

    /**
     * Calculate content similarity
     */
    calculateContentSimilarity(adoDetails, candidateDescription) {
        if (!adoDetails || !candidateDescription) return 0;
        
        const normalizedAdo = this.normalizeTestName(adoDetails);
        const normalizedCandidate = this.normalizeTestName(candidateDescription);
        
        return this.calculateLevenshteinSimilarity(normalizedAdo, normalizedCandidate);
    }

    /**
     * Calculate context score
     */
    calculateContextScore(buildContext, candidate) {
        let score = 0;
        
        // Repository match
        if (buildContext.repository?.id === candidate.repository_id) {
            score += 0.5;
        }
        
        // Branch context (if available)
        if (buildContext.branch && candidate.last_updated_branch) {
            if (buildContext.branch === candidate.last_updated_branch) {
                score += 0.3;
            }
        }
        
        // Recent activity bonus
        if (candidate.last_seen) {
            const daysSinceLastSeen = (Date.now() - new Date(candidate.last_seen)) / (1000 * 60 * 60 * 24);
            if (daysSinceLastSeen < 30) {
                score += 0.2 * (1 - daysSinceLastSeen / 30);
            }
        }
        
        return Math.min(score, 1.0);
    }

    /**
     * Detect cross-build failure patterns
     */
    async detectFailurePatterns(correlations, lookbackBuilds = 10) {
        try {
            const patterns = [];
            
            for (const correlation of correlations) {
                if (!correlation.testMetadata) continue;
                
                // Get recent failures for this test
                const recentFailures = await this.db.all(`
                    SELECT f.*, c.build_id, c.pipeline_id, c.correlation_timestamp
                    FROM mvp_test_failures f
                    JOIN mvp_ado_jira_correlations c ON f.id = c.failure_id
                    WHERE f.test_name = ? OR f.id = ?
                    ORDER BY f.last_seen DESC
                    LIMIT ?
                `, [correlation.testMetadata.test_name, correlation.testMetadata.id, lookbackBuilds]);

                if (recentFailures.length >= 3) {
                    const pattern = this.analyzeFailurePattern(recentFailures);
                    if (pattern.significance > 0.5) {
                        patterns.push({
                            testMetadata: correlation.testMetadata,
                            pattern,
                            recentFailures: recentFailures.slice(0, 5) // Top 5 most recent
                        });
                    }
                }
            }
            
            return patterns;
            
        } catch (error) {
            this.error('Failed to detect failure patterns:', error);
            return [];
        }
    }

    /**
     * Analyze failure pattern
     */
    analyzeFailurePattern(failures) {
        const pattern = {
            frequency: failures.length,
            timeSpan: null,
            consistency: 0,
            significance: 0,
            patternType: 'unknown'
        };

        if (failures.length < 2) return pattern;

        // Calculate time span
        const timestamps = failures.map(f => new Date(f.last_seen || f.created_at));
        const earliest = Math.min(...timestamps);
        const latest = Math.max(...timestamps);
        pattern.timeSpan = latest - earliest;

        // Analyze failure message consistency
        const messages = failures.map(f => f.failure_message).filter(Boolean);
        const uniqueMessages = new Set(messages);
        pattern.consistency = 1 - (uniqueMessages.size / messages.length);

        // Determine pattern type and significance
        if (pattern.frequency >= 5 && pattern.consistency > 0.8) {
            pattern.patternType = 'persistent';
            pattern.significance = 0.9;
        } else if (pattern.frequency >= 3 && pattern.timeSpan < 7 * 24 * 60 * 60 * 1000) { // 1 week
            pattern.patternType = 'recent_spike';
            pattern.significance = 0.7;
        } else if (pattern.consistency > 0.6) {
            pattern.patternType = 'consistent';
            pattern.significance = 0.6;
        } else {
            pattern.patternType = 'intermittent';
            pattern.significance = 0.3;
        }

        return pattern;
    }

    /**
     * Log debug information
     */
    log(...args) {
        if (this.debug) {
            console.log('[ADO-TEST-CORRELATION]', ...args);
        }
    }

    /**
     * Log error information
     */
    error(...args) {
        console.error('[ADO-TEST-CORRELATION ERROR]', ...args);
    }
}

module.exports = AdoTestCorrelation;
