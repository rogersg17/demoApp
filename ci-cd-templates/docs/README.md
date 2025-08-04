# CI/CD Templates for TMS Integration

This directory contains comprehensive templates and documentation for integrating various CI/CD systems with the Test Management System (TMS) using the Observer/Orchestrator pattern.

## 📁 Directory Structure

```
ci-cd-templates/
├── github-actions/          # GitHub Actions workflow templates
│   ├── test-execution.yml   # Main workflow template
│   └── README.md           # GitHub Actions integration guide
├── azure-devops/           # Azure DevOps pipeline templates
│   ├── azure-pipelines-test.yml  # Main pipeline template
│   └── README.md           # Azure DevOps integration guide
├── jenkins/                # Jenkins pipeline templates
│   ├── Jenkinsfile         # Main pipeline script
│   └── README.md           # Jenkins integration guide
├── gitlab/                 # GitLab CI templates
│   ├── .gitlab-ci.yml      # Main pipeline configuration
│   └── README.md           # GitLab CI integration guide
├── docker/                 # Docker-based test runners
│   ├── Dockerfile          # Test runner container
│   ├── docker-compose.yml  # Container orchestration
│   ├── scripts/            # Integration scripts
│   └── README.md           # Docker integration guide
└── docs/                   # Documentation
    ├── API_INTEGRATION_GUIDE.md  # Comprehensive API guide
    └── README.md           # This file
```

## 🎯 Overview

The TMS Observer/Orchestrator architecture enables scalable, distributed test execution by:

- **Separating Concerns**: TMS observes and orchestrates, external systems execute
- **Enabling Scalability**: Multiple parallel test runners across different infrastructure
- **Improving Security**: TMS doesn't need direct test execution permissions
- **Providing Flexibility**: Works with any CI/CD system supporting HTTP webhooks
- **Maintaining Reliability**: TMS remains responsive during long test executions

## 🚀 Quick Start

### 1. Choose Your CI/CD Platform

Select the template that matches your CI/CD system:

- **GitHub Actions**: For repositories hosted on GitHub
- **Azure DevOps**: For Microsoft Azure DevOps pipelines
- **Jenkins**: For Jenkins-based CI/CD systems
- **GitLab CI**: For GitLab-hosted repositories
- **Docker**: For containerized test execution on any platform

### 2. Configure Authentication

All integrations require webhook authentication tokens:

```bash
# Set in your CI/CD system as a secret/variable:
TMS_WEBHOOK_TOKEN=your-webhook-authentication-token
```

### 3. Deploy Template

Follow the specific README.md in each directory for detailed setup instructions.

### 4. Test Integration

Use the provided examples to verify your integration works correctly.

## 📋 Integration Checklist

### Pre-Integration Requirements

- [ ] TMS instance running with Observer/Orchestrator architecture
- [ ] CI/CD system configured and accessible
- [ ] Webhook authentication tokens generated
- [ ] Network connectivity between CI/CD system and TMS
- [ ] Test codebase with proper test commands defined

### Integration Setup

- [ ] Template copied and customized for your environment
- [ ] Authentication secrets/variables configured
- [ ] Webhook URLs configured correctly
- [ ] Test suite parameters defined
- [ ] Environment-specific configuration completed

### Validation Steps

- [ ] Manual test execution successful
- [ ] Webhook notifications received by TMS
- [ ] Test results displayed correctly in TMS dashboard
- [ ] Parallel execution (sharding) working if configured
- [ ] Error handling tested (network failures, authentication issues)

### Production Readiness

- [ ] Performance testing completed
- [ ] Monitoring and alerting configured
- [ ] Documentation updated for team
- [ ] Backup/rollback procedures defined
- [ ] Security review completed

## 🔧 Configuration Options

### Common Environment Variables

All templates support these standard environment variables:

```bash
# TMS Configuration
EXECUTION_ID=unique-execution-identifier
WEBHOOK_URL=https://your-tms-instance.com/api/webhooks/test-results
TMS_WEBHOOK_TOKEN=your-authentication-token

# Test Configuration
TEST_SUITE=smoke|regression|api|ui|all
TEST_ENVIRONMENT=staging|production|dev
SHARD_INDEX=1                    # For parallel execution
TOTAL_SHARDS=4                   # Total number of parallel jobs

# Optional Configuration
MAX_WAIT_TIME=1800              # Timeout in seconds
PARALLEL_WORKERS=4              # Number of parallel workers
RETRY_COUNT=3                   # Number of retry attempts
```

### Test Suite Definitions

Standard test suite types supported across all templates:

- **smoke**: Quick validation tests (usually 5-10 minutes)
- **regression**: Comprehensive test suite (usually 30-60 minutes)
- **api**: API/backend tests only
- **ui**: UI/frontend tests only
- **all**: Complete test suite (all tests)

## 📊 Webhook Integration

### Webhook Flow

1. **Test Start**: CI/CD system notifies TMS when test execution begins
2. **Shard Progress**: Individual parallel jobs report completion (optional)
3. **Final Results**: Complete results sent when all tests finish

### Payload Examples

#### Start Notification
```json
{
  "executionId": "exec-123",
  "status": "running",
  "provider": "github-actions",
  "runId": "1234567890",
  "runUrl": "https://github.com/org/repo/actions/runs/1234567890",
  "testSuite": "smoke",
  "environment": "staging",
  "startTime": "2025-08-04T10:00:00Z"
}
```

#### Final Results
```json
{
  "executionId": "exec-123",
  "status": "failed",
  "provider": "github-actions",
  "results": {
    "total": 100,
    "passed": 92,
    "failed": 8,
    "skipped": 0
  },
  "failedTests": [...],
  "endTime": "2025-08-04T10:05:30Z",
  "artifacts": {
    "reportUrl": "...",
    "logsUrl": "..."
  }
}
```

## 🔒 Security Considerations

### Authentication
- Use secure webhook tokens for all integrations
- Store tokens as secrets/encrypted variables in CI/CD systems
- Rotate tokens regularly following security best practices

### Network Security
- Use HTTPS for all webhook communications
- Consider IP whitelisting if supported by your CI/CD system
- Implement webhook signature validation if available

### Data Privacy
- Avoid logging sensitive information in CI/CD logs
- Ensure test data doesn't contain production secrets
- Review artifact storage policies for compliance

## 📈 Performance Optimization

### Parallel Execution
All templates support parallel test execution (sharding):

- **GitHub Actions**: Matrix strategy with 4 parallel jobs
- **Azure DevOps**: Parallel jobs with result aggregation
- **Jenkins**: Parallel stages with shared workspace
- **GitLab CI**: Parallel jobs with artifact passing
- **Docker**: Multi-container orchestration

### Resource Management
- Configure appropriate CPU/memory limits for test runners
- Use caching for dependencies (node_modules, browser binaries)
- Optimize test data and fixtures for faster execution
- Consider geographic distribution of runners for global teams

### Monitoring
- Track test execution times and trends
- Monitor webhook success rates and latency
- Set up alerts for failed integrations
- Use structured logging for troubleshooting

## 🛠️ Customization

### Adding New Test Frameworks

To support additional test frameworks, modify the test command logic:

```bash
# Example: Adding Cypress support
case "$TEST_SUITE" in
  "cypress-e2e")
    TEST_CMD="npx cypress run --spec cypress/e2e/**/*.cy.js"
    ;;
  "cypress-component")
    TEST_CMD="npx cypress run --component"
    ;;
esac
```

### Custom Result Processing

Add custom result parsing for different test outputs:

```bash
# Example: Custom result parsing
if [ -f "custom-results.json" ]; then
  TOTAL=$(jq '.summary.total' custom-results.json)
  PASSED=$(jq '.summary.passed' custom-results.json)
  FAILED=$(jq '.summary.failed' custom-results.json)
fi
```

### Environment-Specific Configuration

Create environment-specific overrides:

```yaml
# Example: Environment-specific variables
variables:
  - name: API_URL
    value: ${{ parameters.environment == 'production' && 'https://api.prod.com' || 'https://api.staging.com' }}
```

## 🐛 Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Verify webhook token is correctly configured
   - Check token permissions and expiration
   - Ensure correct Authorization header format

2. **Network Connectivity**
   - Test webhook endpoint accessibility from CI/CD system
   - Check firewall and proxy configurations
   - Verify SSL/TLS certificate validity

3. **Test Execution Issues**
   - Review test command configuration
   - Check dependency installation steps
   - Verify test environment setup

4. **Result Parsing Errors**
   - Validate test output format matches parsing logic
   - Check for JSON syntax errors in results
   - Ensure result files are generated correctly

### Debug Mode

Enable debug logging in templates:

```bash
# Set debug environment variable
DEBUG=true

# Or enable verbose logging
VERBOSE_LOGGING=true
```

### Support Resources

- **GitHub Issues**: Report template issues or bugs
- **Documentation**: Refer to individual README files for detailed guidance
- **API Guide**: See `docs/API_INTEGRATION_GUIDE.md` for custom integrations
- **Examples**: Check template examples for working configurations

## 🔄 Migration from Direct Execution

If migrating from direct test execution to the Observer/Orchestrator pattern:

### 1. Update TMS Configuration
- Enable Observer/Orchestrator mode in TMS settings
- Configure webhook endpoints and authentication
- Update test execution API endpoints

### 2. Deploy CI/CD Templates
- Choose appropriate template for your CI/CD system
- Configure authentication and webhook URLs
- Test integration with small test suite first

### 3. Update Workflows
- Replace direct test execution calls with CI/CD triggers
- Update status monitoring to use webhook-based updates
- Migrate any custom result processing logic

### 4. Validate Migration
- Compare results between old and new approaches
- Verify all test suites work correctly
- Ensure parallel execution provides performance benefits

## 📚 Additional Resources

- **TMS Documentation**: Main TMS documentation and user guides
- **CI/CD Platform Docs**: Official documentation for your chosen CI/CD platform
- **Test Framework Docs**: Documentation for your test frameworks (Playwright, Cypress, etc.)
- **Webhook Standards**: HTTP webhook best practices and standards

## 🤝 Contributing

To contribute new templates or improvements:

1. Fork the repository
2. Create a feature branch for your changes
3. Follow the existing template structure and conventions
4. Include comprehensive documentation and examples
5. Test your integration thoroughly
6. Submit a pull request with detailed description

### Template Standards

- Include comprehensive README.md with setup instructions
- Provide working examples for common scenarios
- Support standard environment variables and configuration
- Include error handling and debugging features
- Follow security best practices for token handling

---

**Last Updated**: August 4, 2025  
**Compatible with**: TMS Observer/Orchestrator Architecture v2.0+  
**Status**: Production Ready ✅