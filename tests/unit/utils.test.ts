import { describe, it, expect } from '@jest/globals';

// Test utility functions
describe('Utility Functions', () => {
  describe('formatTime', () => {
    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    it('should format seconds correctly', () => {
      expect(formatTime(0)).toBe('0:00');
      expect(formatTime(5)).toBe('0:05');
      expect(formatTime(30)).toBe('0:30');
      expect(formatTime(59)).toBe('0:59');
    });

    it('should format minutes and seconds correctly', () => {
      expect(formatTime(60)).toBe('1:00');
      expect(formatTime(65)).toBe('1:05');
      expect(formatTime(120)).toBe('2:00');
      expect(formatTime(125)).toBe('2:05');
    });

    it('should handle large values', () => {
      expect(formatTime(3661)).toBe('61:01'); // 1 hour and 1 second
      expect(formatTime(7200)).toBe('120:00'); // 2 hours
    });
  });

  describe('calculateProgress', () => {
    const calculateProgress = (current: number, total: number): number => {
      if (total === 0) return 0;
      return Math.round((current / total) * 100);
    };

    it('should calculate progress percentage correctly', () => {
      expect(calculateProgress(0, 10)).toBe(0);
      expect(calculateProgress(5, 10)).toBe(50);
      expect(calculateProgress(10, 10)).toBe(100);
      expect(calculateProgress(3, 7)).toBe(43); // rounded
      expect(calculateProgress(2, 3)).toBe(67); // rounded
    });

    it('should handle edge cases', () => {
      expect(calculateProgress(0, 0)).toBe(0);
      expect(calculateProgress(1, 0)).toBe(0); // avoid division by zero
      expect(calculateProgress(10, 1)).toBe(1000); // more than 100%
    });
  });

  describe('generateExecutionId', () => {
    const generateExecutionId = (): string => {
      return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    };

    it('should generate unique execution IDs', () => {
      const id1 = generateExecutionId();
      const id2 = generateExecutionId();

      expect(id1).toMatch(/^exec_\d+_[a-z0-9]{8}$/);
      expect(id2).toMatch(/^exec_\d+_[a-z0-9]{8}$/);
      expect(id1).not.toBe(id2);
    });

    it('should have correct format', () => {
      const id = generateExecutionId();
      const parts = id.split('_');

      expect(parts).toHaveLength(3);
      expect(parts[0]).toBe('exec');
      expect(parseInt(parts[1])).toBeGreaterThan(1000000000000); // timestamp
      expect(parts[2]).toHaveLength(8);
    });
  });

  describe('validateTestFile', () => {
    const validateTestFile = (filename: string): boolean => {
      if (!filename || typeof filename !== 'string') return false;
      const testFilePattern = /\.(test|spec)\.(js|ts|jsx|tsx)$/;
      return testFilePattern.test(filename);
    };

    it('should validate test file names correctly', () => {
      // Valid test files
      expect(validateTestFile('auth.test.ts')).toBe(true);
      expect(validateTestFile('user.spec.js')).toBe(true);
      expect(validateTestFile('component.test.tsx')).toBe(true);
      expect(validateTestFile('integration.spec.jsx')).toBe(true);

      // Invalid test files
      expect(validateTestFile('auth.ts')).toBe(false);
      expect(validateTestFile('user.js')).toBe(false);
      expect(validateTestFile('test.txt')).toBe(false);
      expect(validateTestFile('')).toBe(false);
      expect(validateTestFile(null as any)).toBe(false);
      expect(validateTestFile(undefined as any)).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    const sanitizeInput = (input: string): string => {
      if (!input || typeof input !== 'string') return '';
      return input.trim().replace(/[<>]/g, '');
    };

    it('should sanitize user input', () => {
      expect(sanitizeInput('  hello world  ')).toBe('hello world');
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
      expect(sanitizeInput('normal input')).toBe('normal input');
      expect(sanitizeInput('')).toBe('');
      expect(sanitizeInput(null as any)).toBe('');
      expect(sanitizeInput(undefined as any)).toBe('');
    });
  });

  describe('parseTestResults', () => {
    const parseTestResults = (resultsJson: string) => {
      try {
        const results = JSON.parse(resultsJson);
        return {
          success: true,
          data: {
            passed: results.passed || 0,
            failed: results.failed || 0,
            skipped: results.skipped || 0,
            total: (results.passed || 0) + (results.failed || 0) + (results.skipped || 0)
          }
        };
      } catch (error) {
        return {
          success: false,
          error: 'Invalid JSON format'
        };
      }
    };

    it('should parse valid test results', () => {
      const validJson = JSON.stringify({ passed: 5, failed: 2, skipped: 1 });
      const result = parseTestResults(validJson);

      expect(result).toEqual({
        success: true,
        data: {
          passed: 5,
          failed: 2,
          skipped: 1,
          total: 8
        }
      });
    });

    it('should handle missing fields', () => {
      const partialJson = JSON.stringify({ passed: 3 });
      const result = parseTestResults(partialJson);

      expect(result).toEqual({
        success: true,
        data: {
          passed: 3,
          failed: 0,
          skipped: 0,
          total: 3
        }
      });
    });

    it('should handle invalid JSON', () => {
      const invalidJson = '{ invalid json }';
      const result = parseTestResults(invalidJson);

      expect(result).toEqual({
        success: false,
        error: 'Invalid JSON format'
      });
    });
  });
});