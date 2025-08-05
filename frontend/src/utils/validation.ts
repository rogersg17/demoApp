/**
 * Validation utilities for settings forms
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface FieldValidation {
  [key: string]: ValidationResult;
}

// URL validation
export const validateUrl = (url: string, required: boolean = true): ValidationResult => {
  const errors: string[] = [];
  
  if (!url.trim()) {
    if (required) {
      errors.push('URL is required');
    }
    return { isValid: !required, errors };
  }
  
  try {
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      errors.push('URL must use HTTP or HTTPS protocol');
    }
  } catch {
    errors.push('Invalid URL format');
  }
  
  return { isValid: errors.length === 0, errors };
};

// GitHub repository validation (owner/repo format)
export const validateGitHubRepository = (repo: string, required: boolean = true): ValidationResult => {
  const errors: string[] = [];
  
  if (!repo.trim()) {
    if (required) {
      errors.push('Repository is required');
    }
    return { isValid: !required, errors };
  }
  
  const repoPattern = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;
  if (!repoPattern.test(repo.trim())) {
    errors.push('Repository must be in format "owner/repository-name"');
  }
  
  if (repo.includes('..') || repo.includes('//')) {
    errors.push('Repository name contains invalid characters');
  }
  
  return { isValid: errors.length === 0, errors };
};

// GitHub token validation
export const validateGitHubToken = (token: string, required: boolean = true): ValidationResult => {
  const errors: string[] = [];
  
  if (!token.trim()) {
    if (required) {
      errors.push('GitHub token is required');
    }
    return { isValid: !required, errors };
  }
  
  // GitHub personal access tokens start with ghp_ (classic) or github_pat_ (fine-grained)
  if (!token.startsWith('ghp_') && !token.startsWith('github_pat_')) {
    errors.push('Invalid GitHub token format (should start with ghp_ or github_pat_)');
  }
  
  if (token.length < 20) {
    errors.push('GitHub token appears to be too short');
  }
  
  return { isValid: errors.length === 0, errors };
};

// Azure DevOps Organization URL validation
export const validateAdoOrganizationUrl = (url: string, required: boolean = true): ValidationResult => {
  const errors: string[] = [];
  
  if (!url.trim()) {
    if (required) {
      errors.push('Organization URL is required');
    }
    return { isValid: !required, errors };
  }
  
  const urlValidation = validateUrl(url, required);
  if (!urlValidation.isValid) {
    return urlValidation;
  }
  
  // Azure DevOps URLs should contain dev.azure.com or visualstudio.com
  if (!url.includes('dev.azure.com') && !url.includes('visualstudio.com')) {
    errors.push('URL should be an Azure DevOps organization URL (dev.azure.com or visualstudio.com)');
  }
  
  return { isValid: errors.length === 0, errors };
};

// Azure DevOps PAT validation
export const validateAdoPat = (pat: string, required: boolean = true): ValidationResult => {
  const errors: string[] = [];
  
  if (!pat.trim()) {
    if (required) {
      errors.push('Personal Access Token is required');
    }
    return { isValid: !required, errors };
  }
  
  // Azure DevOps PATs are base64 encoded and typically 52 characters
  if (pat.length < 40) {
    errors.push('Personal Access Token appears to be too short');
  }
  
  // Basic base64 pattern check
  const base64Pattern = /^[A-Za-z0-9+/]+=*$/;
  if (!base64Pattern.test(pat)) {
    errors.push('Personal Access Token format appears invalid');
  }
  
  return { isValid: errors.length === 0, errors };
};

// Jenkins URL validation
export const validateJenkinsUrl = (url: string, required: boolean = true): ValidationResult => {
  const errors: string[] = [];
  
  if (!url.trim()) {
    if (required) {
      errors.push('Jenkins URL is required');
    }
    return { isValid: !required, errors };
  }
  
  const urlValidation = validateUrl(url, required);
  if (!urlValidation.isValid) {
    return urlValidation;
  }
  
  // Remove trailing slash for consistency
  const cleanUrl = url.replace(/\/$/, '');
  
  // Basic Jenkins URL structure check
  if (cleanUrl.length < 10) {
    errors.push('Jenkins URL appears to be too short');
  }
  
  return { isValid: errors.length === 0, errors };
};

// Jenkins API token validation
export const validateJenkinsApiToken = (token: string, required: boolean = true): ValidationResult => {
  const errors: string[] = [];
  
  if (!token.trim()) {
    if (required) {
      errors.push('API Token is required');
    }
    return { isValid: !required, errors };
  }
  
  // Jenkins API tokens are typically hex strings
  if (token.length < 16) {
    errors.push('API Token appears to be too short');
  }
  
  return { isValid: errors.length === 0, errors };
};

// JIRA URL validation
export const validateJiraUrl = (url: string, required: boolean = true): ValidationResult => {
  const errors: string[] = [];
  
  if (!url.trim()) {
    if (required) {
      errors.push('JIRA URL is required');
    }
    return { isValid: !required, errors };
  }
  
  const urlValidation = validateUrl(url, required);
  if (!urlValidation.isValid) {
    return urlValidation;
  }
  
  // JIRA Cloud URLs typically contain atlassian.net
  if (url.includes('atlassian.net') || url.includes('jira')) {
    return { isValid: true, errors: [] };
  }
  
  // For on-premise JIRA, just check it's a valid URL
  return { isValid: errors.length === 0, errors };
};

// JIRA API token validation
export const validateJiraApiToken = (token: string, required: boolean = true): ValidationResult => {
  const errors: string[] = [];
  
  if (!token.trim()) {
    if (required) {
      errors.push('API Token is required');
    }
    return { isValid: !required, errors };
  }
  
  // JIRA API tokens are typically 24 characters
  if (token.length < 20) {
    errors.push('API Token appears to be too short');
  }
  
  return { isValid: errors.length === 0, errors };
};

// Email validation
export const validateEmail = (email: string, required: boolean = true): ValidationResult => {
  const errors: string[] = [];
  
  if (!email.trim()) {
    if (required) {
      errors.push('Email is required');
    }
    return { isValid: !required, errors };
  }
  
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    errors.push('Invalid email format');
  }
  
  return { isValid: errors.length === 0, errors };
};

// Project name validation
export const validateProjectName = (name: string, required: boolean = true): ValidationResult => {
  const errors: string[] = [];
  
  if (!name.trim()) {
    if (required) {
      errors.push('Project name is required');
    }
    return { isValid: !required, errors };
  }
  
  if (name.length < 2) {
    errors.push('Project name must be at least 2 characters long');
  }
  
  if (name.length > 100) {
    errors.push('Project name must be less than 100 characters');
  }
  
  // Allow letters, numbers, spaces, hyphens, underscores
  const namePattern = /^[a-zA-Z0-9\s\-_]+$/;
  if (!namePattern.test(name)) {
    errors.push('Project name can only contain letters, numbers, spaces, hyphens, and underscores');
  }
  
  return { isValid: errors.length === 0, errors };
};

// Username validation
export const validateUsername = (username: string, required: boolean = true): ValidationResult => {
  const errors: string[] = [];
  
  if (!username.trim()) {
    if (required) {
      errors.push('Username is required');
    }
    return { isValid: !required, errors };
  }
  
  if (username.length < 2) {
    errors.push('Username must be at least 2 characters long');
  }
  
  if (username.length > 50) {
    errors.push('Username must be less than 50 characters');
  }
  
  return { isValid: errors.length === 0, errors };
};

// Branch name validation
export const validateBranchName = (branch: string, required: boolean = true): ValidationResult => {
  const errors: string[] = [];
  
  if (!branch.trim()) {
    if (required) {
      errors.push('Branch name is required');
    }
    return { isValid: !required, errors };
  }
  
  // Git branch name rules
  if (branch.startsWith('/') || branch.endsWith('/') || branch.includes('..')) {
    errors.push('Invalid branch name format');
  }
  
  if (branch.includes(' ')) {
    errors.push('Branch name cannot contain spaces');
  }
  
  return { isValid: errors.length === 0, errors };
};

// Job name validation
export const validateJobName = (job: string, required: boolean = true): ValidationResult => {
  const errors: string[] = [];
  
  if (!job.trim()) {
    if (required) {
      errors.push('Job name is required');
    }
    return { isValid: !required, errors };
  }
  
  if (job.length < 1) {
    errors.push('Job name cannot be empty');
  }
  
  if (job.length > 100) {
    errors.push('Job name must be less than 100 characters');
  }
  
  return { isValid: errors.length === 0, errors };
};

// Numeric validation
export const validateNumeric = (value: string, min?: number, max?: number, required: boolean = true): ValidationResult => {
  const errors: string[] = [];
  
  if (!value.trim()) {
    if (required) {
      errors.push('Value is required');
    }
    return { isValid: !required, errors };
  }
  
  const numValue = parseInt(value, 10);
  if (isNaN(numValue)) {
    errors.push('Value must be a number');
    return { isValid: false, errors };
  }
  
  if (min !== undefined && numValue < min) {
    errors.push(`Value must be at least ${min}`);
  }
  
  if (max !== undefined && numValue > max) {
    errors.push(`Value must be at most ${max}`);
  }
  
  return { isValid: errors.length === 0, errors };
};

// Generic required field validation
export const validateRequired = (value: string, fieldName: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!value || !value.trim()) {
    errors.push(`${fieldName} is required`);
  }
  
  return { isValid: errors.length === 0, errors };
};

// Validate all fields in a form
export const validateForm = (fields: Record<string, string | boolean | string[]>, validationRules: Record<string, (value: string | boolean | string[]) => ValidationResult>): FieldValidation => {
  const validation: FieldValidation = {};
  
  Object.keys(validationRules).forEach(fieldName => {
    const value = fields[fieldName];
    validation[fieldName] = validationRules[fieldName](value);
  });
  
  return validation;
};

// Check if entire form is valid
export const isFormValid = (validation: FieldValidation): boolean => {
  return Object.values(validation).every(field => field.isValid);
};
