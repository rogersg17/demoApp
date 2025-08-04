#!/usr/bin/env node

/**
 * TMS CI/CD Template Validator
 * 
 * Validates all CI/CD templates for syntax, required fields, and best practices
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

class TemplateValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.templatesDir = path.join(__dirname, '..');
    this.validationRules = {
      github: this.validateGitHubActions.bind(this),
      azure: this.validateAzureDevOps.bind(this),
      gitlab: this.validateGitLabCI.bind(this),
      jenkins: this.validateJenkins.bind(this),
      docker: this.validateDocker.bind(this)
    };
  }

  async validateAll() {
    console.log('🔍 Starting CI/CD template validation...\n');

    const platforms = ['github-actions', 'azure-devops', 'gitlab', 'jenkins', 'docker'];
    
    for (const platform of platforms) {
      await this.validatePlatform(platform);
    }

    this.printResults();
    return this.errors.length === 0;
  }

  async validatePlatform(platform) {
    console.log(`📁 Validating ${platform} templates...`);
    
    const platformDir = path.join(this.templatesDir, platform);
    
    if (!fs.existsSync(platformDir)) {
      this.addError(platform, 'Platform directory does not exist');
      return;
    }

    const files = this.getTemplateFiles(platformDir);
    
    for (const file of files) {
      await this.validateTemplate(platform, file);
    }
    
    console.log(`✅ ${platform} validation completed\n`);
  }

  getTemplateFiles(dir) {
    const files = [];
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
      if (item.isDirectory()) {
        const subFiles = this.getTemplateFiles(path.join(dir, item.name));
        files.push(...subFiles.map(f => path.join(item.name, f)));
      } else if (this.isTemplateFile(item.name)) {
        files.push(item.name);
      }
    }
    
    return files;
  }

  isTemplateFile(filename) {
    const templateExtensions = ['.yml', '.yaml', '.json', '.jenkinsfile', 'Dockerfile'];
    const templateNames = ['Dockerfile', 'Jenkinsfile', 'docker-compose.yml'];
    
    return templateExtensions.some(ext => filename.endsWith(ext)) ||
           templateNames.some(name => filename.includes(name));
  }

  async validateTemplate(platform, filePath) {
    const fullPath = path.join(this.templatesDir, platform, filePath);
    
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      const validator = this.validationRules[platform.split('-')[0]];
      
      if (validator) {
        await validator(filePath, content, fullPath);
      } else {
        this.addWarning(platform, filePath, 'No specific validator available');
      }
      
      // Common validations
      this.validateCommon(platform, filePath, content);
      
    } catch (error) {
      this.addError(platform, filePath, `Failed to read file: ${error.message}`);
    }
  }

  validateCommon(platform, filePath, content) {
    // Check for required TMS integration elements
    const requiredElements = [
      'EXECUTION_ID',
      'WEBHOOK_URL',
      'TMS_WEBHOOK_TOKEN'
    ];
    
    for (const element of requiredElements) {
      if (!content.includes(element)) {
        this.addWarning(platform, filePath, `Missing required TMS element: ${element}`);
      }
    }

    // Check for webhook integration
    if (!content.includes('webhook') && !content.includes('curl')) {
      this.addWarning(platform, filePath, 'No webhook integration detected');
    }

    // Check for parallel execution support
    if (!content.includes('shard') && !content.includes('parallel')) {
      this.addWarning(platform, filePath, 'No parallel execution support detected');
    }

    // Security checks
    if (content.includes('password') || content.includes('secret')) {
      if (!content.includes('env') && !content.includes('secret') && !content.includes('credential')) {
        this.addError(platform, filePath, 'Potential hardcoded credentials detected');
      }
    }
  }

  validateGitHubActions(filePath, content) {
    try {
      const workflow = yaml.load(content);
      
      // Check required GitHub Actions structure
      if (!workflow.on) {
        this.addError('github', filePath, 'Missing workflow triggers (on)');
      }
      
      if (!workflow.jobs) {
        this.addError('github', filePath, 'Missing jobs section');
      }

      // Check for proper checkout action
      const jobContent = JSON.stringify(workflow.jobs || {});
      if (!jobContent.includes('actions/checkout')) {
        this.addWarning('github', filePath, 'Missing checkout action');
      }

      // Check for secrets usage
      if (content.includes('secrets.') || content.includes('${{ secrets')) {
        console.log(`✅ ${filePath}: Proper secrets usage detected`);
      }

      // Check for matrix strategy
      if (workflow.jobs) {
        Object.values(workflow.jobs).forEach(job => {
          if (job.strategy && job.strategy.matrix) {
            console.log(`✅ ${filePath}: Matrix strategy found`);
          }
        });
      }

    } catch (error) {
      this.addError('github', filePath, `Invalid YAML syntax: ${error.message}`);
    }
  }

  validateAzureDevOps(filePath, content) {
    try {
      const pipeline = yaml.load(content);
      
      // Check required Azure DevOps structure
      if (!pipeline.stages && !pipeline.jobs && !pipeline.steps) {
        this.addError('azure', filePath, 'Missing pipeline structure (stages/jobs/steps)');
      }

      // Check for parameters
      if (!pipeline.parameters) {
        this.addWarning('azure', filePath, 'No parameters defined - may limit reusability');
      }

      // Check for proper variable usage
      if (content.includes('$(') || content.includes('variables:')) {
        console.log(`✅ ${filePath}: Variable usage detected`);
      }

      // Check for artifact publishing
      if (content.includes('PublishTestResults') || content.includes('PublishBuildArtifacts')) {
        console.log(`✅ ${filePath}: Artifact publishing found`);
      }

    } catch (error) {
      this.addError('azure', filePath, `Invalid YAML syntax: ${error.message}`);
    }
  }

  validateGitLabCI(filePath, content) {
    try {
      const pipeline = yaml.load(content);
      
      // Check for stages
      if (!pipeline.stages) {
        this.addWarning('gitlab', filePath, 'No stages defined');
      }

      // Check for proper job structure
      const jobKeys = Object.keys(pipeline).filter(key => 
        !['stages', 'variables', 'before_script', 'after_script', 'cache', 'image'].includes(key)
      );
      
      if (jobKeys.length === 0) {
        this.addError('gitlab', filePath, 'No jobs defined');
      }

      // Check for artifacts
      let hasArtifacts = false;
      jobKeys.forEach(jobKey => {
        const job = pipeline[jobKey];
        if (job && job.artifacts) {
          hasArtifacts = true;
        }
      });

      if (!hasArtifacts) {
        this.addWarning('gitlab', filePath, 'No artifacts configuration found');
      }

      // Check for caching
      if (pipeline.cache || content.includes('cache:')) {
        console.log(`✅ ${filePath}: Caching configuration found`);
      }

    } catch (error) {
      this.addError('gitlab', filePath, `Invalid YAML syntax: ${error.message}`);
    }
  }

  validateJenkins(filePath, content) {
    // Check Jenkinsfile syntax
    if (filePath.toLowerCase().includes('jenkinsfile')) {
      // Check for pipeline structure
      if (!content.includes('pipeline {')) {
        this.addError('jenkins', filePath, 'Missing pipeline block');
      }

      if (!content.includes('stages {')) {
        this.addError('jenkins', filePath, 'Missing stages block');
      }

      // Check for proper agent declaration
      if (!content.includes('agent ')) {
        this.addWarning('jenkins', filePath, 'No agent specified');
      }

      // Check for error handling
      if (!content.includes('try {') && !content.includes('post {')) {
        this.addWarning('jenkins', filePath, 'No error handling detected');
      }

      // Check for parallel execution
      if (content.includes('parallel {') || content.includes('parallel(')) {
        console.log(`✅ ${filePath}: Parallel execution found`);
      }
    }
  }

  validateDocker(filePath, content) {
    if (filePath.toLowerCase().includes('dockerfile')) {
      // Check for proper base image
      if (!content.includes('FROM ')) {
        this.addError('docker', filePath, 'Missing FROM instruction');
      }

      // Check for security practices
      if (!content.includes('USER ') || content.includes('USER root')) {
        this.addWarning('docker', filePath, 'Container may run as root - security risk');
      }

      // Check for health check
      if (!content.includes('HEALTHCHECK')) {
        this.addWarning('docker', filePath, 'No health check defined');
      }

      // Check for proper labeling
      if (!content.includes('LABEL')) {
        this.addWarning('docker', filePath, 'No labels defined for metadata');
      }

      // Check for multi-stage build optimization
      if (content.split('FROM ').length > 2) {
        console.log(`✅ ${filePath}: Multi-stage build detected`);
      }
    }

    if (filePath.includes('docker-compose')) {
      try {
        const compose = yaml.load(content);
        
        if (!compose.version) {
          this.addWarning('docker', filePath, 'No version specified');
        }

        if (!compose.services) {
          this.addError('docker', filePath, 'No services defined');
        }

        // Check for proper networking
        if (compose.networks) {
          console.log(`✅ ${filePath}: Custom networks defined`);
        }

        // Check for volume usage
        if (compose.volumes || Object.values(compose.services || {}).some(service => service.volumes)) {
          console.log(`✅ ${filePath}: Volume configuration found`);
        }

      } catch (error) {
        this.addError('docker', filePath, `Invalid YAML syntax: ${error.message}`);
      }
    }
  }

  addError(platform, filePath, message) {
    this.errors.push({ platform, filePath, message, type: 'error' });
  }

  addWarning(platform, filePath, message) {
    this.warnings.push({ platform, filePath, message, type: 'warning' });
  }

  printResults() {
    console.log('\n📊 Validation Results:');
    console.log('='.repeat(50));
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('🎉 All templates passed validation!');
      return;
    }

    if (this.errors.length > 0) {
      console.log(`\n❌ Errors (${this.errors.length}):`);
      this.errors.forEach(error => {
        console.log(`  ${error.platform}/${error.filePath}: ${error.message}`);
      });
    }

    if (this.warnings.length > 0) {
      console.log(`\n⚠️  Warnings (${this.warnings.length}):`);
      this.warnings.forEach(warning => {
        console.log(`  ${warning.platform}/${warning.filePath}: ${warning.message}`);
      });
    }

    console.log('\n📈 Summary:');
    console.log(`  ✅ Errors: ${this.errors.length}`);
    console.log(`  ⚠️  Warnings: ${this.warnings.length}`);
    
    if (this.errors.length === 0) {
      console.log('\n🎉 All templates are valid! (warnings can be addressed as improvements)');
    } else {
      console.log('\n🚨 Please fix the errors before using the templates in production.');
    }
  }
}

// CLI execution
if (require.main === module) {
  const validator = new TemplateValidator();
  validator.validateAll().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Validation failed:', error);
    process.exit(1);
  });
}

module.exports = { TemplateValidator };