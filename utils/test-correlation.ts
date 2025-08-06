import TestIdentifierService from '../services/test-identifier';

interface Database {
    getAllTestMetadata(): Promise<TestMetadata[]>;
    createOrUpdateTestMetadata(metadata: TestMetadata): Promise<void>;
}

interface ExecutionResult {
    filePath: string;
    testName: string;
    suite?: string;
    tags?: string[];
    framework?: string;
}

interface TestMetadata {
    test_id: string;
    file_path: string;
    test_name: string;
    description?: string;
    tags?: string[];
    priority?: string;
    owner?: string | null;
    repository_id?: string | null;
    test_type?: string;
    framework?: string;
    created_from_execution?: boolean;
    updated_at?: string;
}

interface Correlation {
    executionResult: ExecutionResult;
    testMetadata: TestMetadata | null;
    confidence: number;
    method: string;
    error?: string;
}

interface CorrelationStats {
    direct: number;
    fuzzy: number;
    failed: number;
    total: number;
}

/**
 * Test Correlation Utilities
 * Handles correlation between test execution results and stored test metadata
 * Part of ADR-001 implementation for test code and metadata separation
 */
class TestCorrelationUtils {
  private db: Database;
  private testIdentifier: TestIdentifierService;
  private correlationCache: Map<string, Correlation>;
  private correlationStats: CorrelationStats;

  constructor(database: Database) {
    this.db = database;
    this.testIdentifier = new TestIdentifierService();
    this.correlationCache = new Map();
    this.correlationStats = {
      direct: 0,
      fuzzy: 0,
      failed: 0,
      total: 0
    };
  }

  /**
   * Correlate test execution results with stored test metadata
   */
  async correlateTestResults(executionResults: ExecutionResult[], platformType: string): Promise<Correlation[]> {
    const correlations: Correlation[] = [];
    
    console.log(`🔗 Correlating ${executionResults.length} test results from ${platformType}`);
    
    // Get all known tests for faster lookup
    const knownTests = await this.db.getAllTestMetadata();
    
    for (const result of executionResults) {
      try {
        const correlation = await this.correlateIndividualResult(result, knownTests, platformType);
        correlations.push(correlation);
        this.updateCorrelationStats(correlation.confidence);
      } catch (error: any) {
        console.error(`❌ Error correlating test result:`, error);
        correlations.push({
          executionResult: result,
          testMetadata: null,
          confidence: 0,
          method: 'error',
          error: error.message
        });
        this.correlationStats.failed++;
      }
      this.correlationStats.total++;
    }
    
    console.log(`✅ Correlation complete. Success rate: ${this.getSuccessRate()}%`);
    return correlations;
  }

  /**
   * Correlate individual test result
   */
  async correlateIndividualResult(result: ExecutionResult, knownTests: TestMetadata[], platformType: string): Promise<Correlation> {
    // Generate cache key
    const cacheKey = this.generateCacheKey(result, platformType);
    
    // Check cache first
    if (this.correlationCache.has(cacheKey)) {
      return this.correlationCache.get(cacheKey)!;
    }
    
    // Attempt correlation using multiple strategies
    const correlation = await this.attemptCorrelation(result, knownTests, platformType);
    
    // Cache the result if confident
    if (correlation.confidence > 0.7) {
      this.correlationCache.set(cacheKey, correlation);
    }
    
    return correlation;
  }

  /**
   * Attempt correlation using multiple strategies
   */
  async attemptCorrelation(result: ExecutionResult, knownTests: TestMetadata[], platformType: string): Promise<Correlation> {
    const strategies = [
      () => this.directIdMatch(result, knownTests),
      () => this.filePathAndNameMatch(result, knownTests),
      () => this.testNameAndSuiteMatch(result, knownTests),
      () => this.fuzzyStringMatch(result, knownTests),
      () => this.createNewTestMetadata(result, platformType)
    ];
    
    for (const strategy of strategies) {
      try {
        const correlation = await strategy();
        if (correlation && correlation.confidence > 0) {
          return correlation;
        }
      } catch (error) {
        console.error('Correlation strategy error:', error);
      }
    }
    
    return {
      executionResult: result,
      testMetadata: null,
      confidence: 0,
      method: 'none',
      error: 'No correlation strategy succeeded'
    };
  }

  /**
   * Strategy 1: Direct ID match
   */
  directIdMatch(result: ExecutionResult, knownTests: TestMetadata[]): Correlation | null {
    const expectedId = this.testIdentifier.generateIdFromExecution(result);
    const match = knownTests.find(test => test.test_id === expectedId);
    
    if (match) {
      return {
        executionResult: result,
        testMetadata: match,
        confidence: 1.0,
        method: 'direct_id'
      };
    }
    
    return null;
  }

  /**
   * Strategy 2: File path and test name match
   */
  filePathAndNameMatch(result: ExecutionResult, knownTests: TestMetadata[]): Correlation | null {
    const matches = knownTests.filter(test => {
      const pathMatch = this.normalizeFilePath(test.file_path) === this.normalizeFilePath(result.filePath);
      const nameMatch = test.test_name === result.testName;
      return pathMatch && nameMatch;
    });
    
    if (matches.length === 1) {
      return {
        executionResult: result,
        testMetadata: matches[0],
        confidence: 0.95,
        method: 'file_path_name'
      };
    }
    
    if (matches.length > 1) {
      // Multiple matches - try to disambiguate
      const bestMatch = this.disambiguateMatches(result, matches);
      if (bestMatch) {
        return {
          executionResult: result,
          testMetadata: bestMatch,
          confidence: 0.85,
          method: 'file_path_name_disambiguated'
        };
      }
    }
    
    return null;
  }

  /**
   * Strategy 3: Test name and suite match
   */
  testNameAndSuiteMatch(result: ExecutionResult, knownTests: TestMetadata[]): Correlation | null {
    const matches = knownTests.filter(test => {
      const nameMatch = test.test_name === result.testName;
      const suiteMatch = result.suite && test.description && 
        test.description.toLowerCase().includes(result.suite.toLowerCase());
      return nameMatch && suiteMatch;
    });
    
    if (matches.length === 1) {
      return {
        executionResult: result,
        testMetadata: matches[0],
        confidence: 0.8,
        method: 'name_suite'
      };
    }
    
    return null;
  }

  /**
   * Strategy 4: Fuzzy string matching
   */
  fuzzyStringMatch(result: ExecutionResult, knownTests: TestMetadata[]): Correlation | null {
    let bestMatch: TestMetadata | null = null;
    let bestScore = 0;
    
    for (const test of knownTests) {
      const score = this.calculateSimilarityScore(result, test);
      if (score > bestScore && score > 0.7) {
        bestScore = score;
        bestMatch = test;
      }
    }
    
    if (bestMatch) {
      return {
        executionResult: result,
        testMetadata: bestMatch,
        confidence: bestScore,
        method: 'fuzzy'
      };
    }
    
    return null;
  }

  /**
   * Strategy 5: Create new test metadata (last resort)
   */
  async createNewTestMetadata(result: ExecutionResult, platformType: string): Promise<Correlation | null> {
    try {
      const testId = this.testIdentifier.generateIdFromExecution(result);
      
      const newTestMetadata: TestMetadata = {
        test_id: testId,
        file_path: result.filePath || 'unknown',
        test_name: result.testName,
        description: result.suite ? `${result.suite} - ${result.testName}` : result.testName,
        tags: result.tags || [],
        priority: 'medium',
        owner: null,
        repository_id: null, // Will be set when repository is linked
        test_type: this.inferTestType(result),
        framework: platformType,
        created_from_execution: true
      };
      
      await this.db.createOrUpdateTestMetadata(newTestMetadata);
      
      console.log(`🆕 Created new test metadata for: ${result.testName}`);
      
      return {
        executionResult: result,
        testMetadata: newTestMetadata,
        confidence: 0.6,
        method: 'created_new'
      };
    } catch (error) {
      console.error('Error creating new test metadata:', error);
      return null;
    }
  }

  /**
   * Normalize file path for comparison
   */
  normalizeFilePath(filePath: string): string {
    if (!filePath) return '';
    return filePath.replace(/\\/g, '/').replace(/^\.\//, '').toLowerCase();
  }

  /**
   * Disambiguate multiple matches
   */
  disambiguateMatches(result: ExecutionResult, matches: TestMetadata[]): TestMetadata | null {
    // Prefer matches with matching context/suite
    if (result.suite) {
      const contextMatches = matches.filter(test => 
        test.description && test.description.includes(result.suite!)
      );
      if (contextMatches.length === 1) {
        return contextMatches[0];
      }
    }
    
    // Prefer matches with matching framework
    if (result.framework) {
      const frameworkMatches = matches.filter(test => 
        test.framework === result.framework
      );
      if (frameworkMatches.length === 1) {
        return frameworkMatches[0];
      }
    }
    
    // Return the most recently updated match
    return matches.sort((a, b) => 
      new Date(b.updated_at!).getTime() - new Date(a.updated_at!).getTime()
    )[0];
  }

  /**
   * Calculate similarity score between result and test metadata
   */
  calculateSimilarityScore(result: ExecutionResult, test: TestMetadata): number {
    let score = 0;
    
    // Test name similarity (most important)
    const nameScore = this.stringSimilarity(result.testName, test.test_name);
    score += nameScore * 0.5;
    
    // File path similarity
    const pathScore = this.stringSimilarity(
      this.normalizeFilePath(result.filePath),
      this.normalizeFilePath(test.file_path)
    );
    score += pathScore * 0.3;
    
    // Description similarity
    if (result.suite && test.description) {
      const descScore = this.stringSimilarity(result.suite, test.description);
      score += descScore * 0.2;
    }
    
    return score;
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  stringSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;
    
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance
   */
  levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Infer test type from result data
   */
  inferTestType(result: ExecutionResult): string {
    const filePath = (result.filePath || '').toLowerCase();
    const testName = (result.testName || '').toLowerCase();
    
    if (filePath.includes('e2e') || filePath.includes('integration')) {
      return 'e2e';
    }
    if (filePath.includes('unit')) {
      return 'unit';
    }
    if (testName.includes('integration')) {
      return 'integration';
    }
    
    return 'functional';
  }

  /**
   * Generate cache key for correlation
   */
  generateCacheKey(result: ExecutionResult, platformType: string): string {
    return `${platformType}:${result.filePath}:${result.testName}:${result.suite || ''}`;
  }

  /**
   * Update correlation statistics
   */
  updateCorrelationStats(confidence: number): void {
    if (confidence >= 0.9) {
      this.correlationStats.direct++;
    } else if (confidence >= 0.6) {
      this.correlationStats.fuzzy++;
    } else {
      this.correlationStats.failed++;
    }
  }

  /**
   * Get correlation success rate
   */
  getSuccessRate(): number {
    if (this.correlationStats.total === 0) return 0;
    const successful = this.correlationStats.direct + this.correlationStats.fuzzy;
    return Math.round((successful / this.correlationStats.total) * 100);
  }

  /**
   * Get correlation statistics
   */
  getCorrelationStats() {
    return {
      ...this.correlationStats,
      successRate: this.getSuccessRate(),
      cacheSize: this.correlationCache.size
    };
  }

  /**
   * Clear correlation cache
   */
  clearCache(): void {
    this.correlationCache.clear();
    this.testIdentifier.clearCache();
  }

  /**
   * Reset correlation statistics
   */
  resetStats(): void {
    this.correlationStats = {
      direct: 0,
      fuzzy: 0,
      failed: 0,
      total: 0
    };
  }
}

export default TestCorrelationUtils;
