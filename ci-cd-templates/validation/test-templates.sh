#!/bin/bash

# TMS CI/CD Template Testing Suite
# Tests all templates for syntax, functionality, and integration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATES_DIR="$(dirname "$SCRIPT_DIR")"
TEST_RESULTS_DIR="$SCRIPT_DIR/test-results"
LOG_FILE="$TEST_RESULTS_DIR/test-$(date +%Y%m%d_%H%M%S).log"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

# Initialize test environment
init_test_env() {
    log_info "Initializing test environment..."
    
    mkdir -p "$TEST_RESULTS_DIR"
    
    # Create test project structure
    TEST_PROJECT_DIR="$TEST_RESULTS_DIR/test-project"
    mkdir -p "$TEST_PROJECT_DIR"
    
    # Create minimal package.json for testing
    cat > "$TEST_PROJECT_DIR/package.json" << 'EOF'
{
  "name": "tms-test-project",
  "version": "1.0.0",
  "scripts": {
    "test": "echo 'Running tests...' && exit 0",
    "test:unit": "echo 'Running unit tests...' && exit 0",
    "test:e2e": "echo 'Running e2e tests...' && exit 0"
  },
  "devDependencies": {
    "playwright": "^1.40.0"
  }
}
EOF

    # Create minimal test files
    mkdir -p "$TEST_PROJECT_DIR/tests"
    echo 'console.log("Test file loaded");' > "$TEST_PROJECT_DIR/tests/example.test.js"
    
    log_success "Test environment initialized"
}

# Test GitHub Actions templates
test_github_actions() {
    log_info "Testing GitHub Actions templates..."
    
    local github_dir="$TEMPLATES_DIR/github-actions"
    local test_count=0
    local pass_count=0
    
    if [[ ! -d "$github_dir" ]]; then
        log_error "GitHub Actions directory not found: $github_dir"
        return 1
    fi
    
    # Test YAML syntax
    for workflow_file in "$github_dir"/*.yml "$github_dir"/*.yaml; do
        if [[ -f "$workflow_file" ]]; then
            test_count=$((test_count + 1))
            log_info "Testing $(basename "$workflow_file")..."
            
            # Check YAML syntax using Python
            if python3 -c "import yaml; yaml.safe_load(open('$workflow_file'))" 2>/dev/null; then
                log_success "✅ $(basename "$workflow_file") - Valid YAML syntax"
                pass_count=$((pass_count + 1))
            else
                log_error "❌ $(basename "$workflow_file") - Invalid YAML syntax"
            fi
            
            # Check for required GitHub Actions elements
            if grep -q "actions/checkout" "$workflow_file"; then
                log_success "✅ $(basename "$workflow_file") - Has checkout action"
            else
                log_warning "⚠️ $(basename "$workflow_file") - Missing checkout action"
            fi
            
            # Check for TMS integration
            if grep -q "EXECUTION_ID\|TMS_WEBHOOK" "$workflow_file"; then
                log_success "✅ $(basename "$workflow_file") - Has TMS integration"
            else
                log_warning "⚠️ $(basename "$workflow_file") - Missing TMS integration"
            fi
        fi
    done
    
    log_info "GitHub Actions test summary: $pass_count/$test_count templates passed"
    return $((test_count - pass_count))
}

# Test Azure DevOps templates
test_azure_devops() {
    log_info "Testing Azure DevOps templates..."
    
    local azure_dir="$TEMPLATES_DIR/azure-devops"
    local test_count=0
    local pass_count=0
    
    if [[ ! -d "$azure_dir" ]]; then
        log_error "Azure DevOps directory not found: $azure_dir"
        return 1
    fi
    
    for pipeline_file in "$azure_dir"/*.yml "$azure_dir"/*.yaml; do
        if [[ -f "$pipeline_file" ]]; then
            test_count=$((test_count + 1))
            log_info "Testing $(basename "$pipeline_file")..."
            
            # Check YAML syntax
            if python3 -c "import yaml; yaml.safe_load(open('$pipeline_file'))" 2>/dev/null; then
                log_success "✅ $(basename "$pipeline_file") - Valid YAML syntax"
                pass_count=$((pass_count + 1))
            else
                log_error "❌ $(basename "$pipeline_file") - Invalid YAML syntax"
            fi
            
            # Check for Azure DevOps specific elements
            if grep -q "stages:\|jobs:\|steps:" "$pipeline_file"; then
                log_success "✅ $(basename "$pipeline_file") - Has proper pipeline structure"
            else
                log_warning "⚠️ $(basename "$pipeline_file") - Missing pipeline structure"
            fi
        fi
    done
    
    log_info "Azure DevOps test summary: $pass_count/$test_count templates passed"
    return $((test_count - pass_count))
}

# Test GitLab CI templates
test_gitlab_ci() {
    log_info "Testing GitLab CI templates..."
    
    local gitlab_dir="$TEMPLATES_DIR/gitlab"
    local test_count=0
    local pass_count=0
    
    if [[ ! -d "$gitlab_dir" ]]; then
        log_error "GitLab directory not found: $gitlab_dir"
        return 1
    fi
    
    for ci_file in "$gitlab_dir"/.gitlab-ci.yml "$gitlab_dir"/*.yml; do
        if [[ -f "$ci_file" ]]; then
            test_count=$((test_count + 1))
            log_info "Testing $(basename "$ci_file")..."
            
            # Check YAML syntax
            if python3 -c "import yaml; yaml.safe_load(open('$ci_file'))" 2>/dev/null; then
                log_success "✅ $(basename "$ci_file") - Valid YAML syntax"
                pass_count=$((pass_count + 1))
            else
                log_error "❌ $(basename "$ci_file") - Invalid YAML syntax"
            fi
            
            # Check for GitLab CI specific elements
            if grep -q "stages:\|script:\|before_script:" "$ci_file"; then
                log_success "✅ $(basename "$ci_file") - Has GitLab CI structure"
            else
                log_warning "⚠️ $(basename "$ci_file") - Missing GitLab CI structure"
            fi
        fi
    done
    
    log_info "GitLab CI test summary: $pass_count/$test_count templates passed"
    return $((test_count - pass_count))
}

# Test Jenkins templates
test_jenkins() {
    log_info "Testing Jenkins templates..."
    
    local jenkins_dir="$TEMPLATES_DIR/jenkins"
    local test_count=0
    local pass_count=0
    
    if [[ ! -d "$jenkins_dir" ]]; then
        log_error "Jenkins directory not found: $jenkins_dir"
        return 1
    fi
    
    for jenkins_file in "$jenkins_dir"/Jenkinsfile* "$jenkins_dir"/*.jenkinsfile; do
        if [[ -f "$jenkins_file" ]]; then
            test_count=$((test_count + 1))
            log_info "Testing $(basename "$jenkins_file")..."
            
            # Basic Jenkinsfile syntax check
            if grep -q "pipeline\s*{" "$jenkins_file"; then
                log_success "✅ $(basename "$jenkins_file") - Has pipeline block"
                pass_count=$((pass_count + 1))
            else
                log_error "❌ $(basename "$jenkins_file") - Missing pipeline block"
            fi
            
            # Check for stages
            if grep -q "stages\s*{" "$jenkins_file"; then
                log_success "✅ $(basename "$jenkins_file") - Has stages block"
            else
                log_warning "⚠️ $(basename "$jenkins_file") - Missing stages block"
            fi
        fi
    done
    
    log_info "Jenkins test summary: $pass_count/$test_count templates passed"
    return $((test_count - pass_count))
}

# Test Docker templates
test_docker() {
    log_info "Testing Docker templates..."
    
    local docker_dir="$TEMPLATES_DIR/docker"
    local test_count=0
    local pass_count=0
    
    if [[ ! -d "$docker_dir" ]]; then
        log_error "Docker directory not found: $docker_dir"
        return 1
    fi
    
    # Test Dockerfiles
    for dockerfile in "$docker_dir"/Dockerfile*; do
        if [[ -f "$dockerfile" ]]; then
            test_count=$((test_count + 1))
            log_info "Testing $(basename "$dockerfile")..."
            
            # Check basic Dockerfile syntax
            if grep -q "^FROM " "$dockerfile"; then
                log_success "✅ $(basename "$dockerfile") - Has FROM instruction"
                pass_count=$((pass_count + 1))
            else
                log_error "❌ $(basename "$dockerfile") - Missing FROM instruction"
            fi
            
            # Check for security best practices
            if grep -q "USER " "$dockerfile" && ! grep -q "USER root" "$dockerfile"; then
                log_success "✅ $(basename "$dockerfile") - Uses non-root user"
            else
                log_warning "⚠️ $(basename "$dockerfile") - May run as root"
            fi
        fi
    done
    
    # Test docker-compose files
    for compose_file in "$docker_dir"/docker-compose*.yml; do
        if [[ -f "$compose_file" ]]; then
            test_count=$((test_count + 1))
            log_info "Testing $(basename "$compose_file")..."
            
            # Check YAML syntax
            if python3 -c "import yaml; yaml.safe_load(open('$compose_file'))" 2>/dev/null; then
                log_success "✅ $(basename "$compose_file") - Valid YAML syntax"
                pass_count=$((pass_count + 1))
            else
                log_error "❌ $(basename "$compose_file") - Invalid YAML syntax"
            fi
            
            # Check for services
            if grep -q "services:" "$compose_file"; then
                log_success "✅ $(basename "$compose_file") - Has services section"
            else
                log_warning "⚠️ $(basename "$compose_file") - Missing services section"
            fi
        fi
    done
    
    log_info "Docker test summary: $pass_count/$test_count templates passed"
    return $((test_count - pass_count))
}

# Test webhook integration
test_webhook_integration() {
    log_info "Testing webhook integration patterns..."
    
    local webhook_patterns=(
        "WEBHOOK_URL"
        "TMS_WEBHOOK_TOKEN"
        "curl.*webhook"
        "webhook.*payload"
        "executionId"
    )
    
    local total_files=0
    local files_with_webhooks=0
    
    # Search for webhook patterns in all template files
    while IFS= read -r -d '' file; do
        total_files=$((total_files + 1))
        local has_webhook=false
        
        for pattern in "${webhook_patterns[@]}"; do
            if grep -q "$pattern" "$file"; then
                has_webhook=true
                break
            fi
        done
        
        if [[ "$has_webhook" == true ]]; then
            files_with_webhooks=$((files_with_webhooks + 1))
            log_success "✅ $(basename "$file") - Has webhook integration"
        else
            log_warning "⚠️ $(basename "$file") - No webhook integration detected"
        fi
        
    done < <(find "$TEMPLATES_DIR" -type f \( -name "*.yml" -o -name "*.yaml" -o -name "*Jenkinsfile*" -o -name "Dockerfile*" \) -print0)
    
    log_info "Webhook integration summary: $files_with_webhooks/$total_files files have webhook patterns"
}

# Test template completeness
test_template_completeness() {
    log_info "Testing template completeness..."
    
    local required_platforms=("github-actions" "azure-devops" "gitlab" "jenkins" "docker")
    local missing_platforms=()
    
    for platform in "${required_platforms[@]}"; do
        if [[ ! -d "$TEMPLATES_DIR/$platform" ]]; then
            missing_platforms+=("$platform")
            log_error "❌ Missing platform: $platform"
        else
            log_success "✅ Platform exists: $platform"
        fi
    done
    
    # Check for documentation
    local docs_dir="$TEMPLATES_DIR/api-docs"
    if [[ -d "$docs_dir" ]]; then
        log_success "✅ API documentation exists"
    else
        log_warning "⚠️ API documentation missing"
    fi
    
    # Check for validation scripts
    if [[ -f "$SCRIPT_DIR/validate-templates.js" ]]; then
        log_success "✅ Validation script exists"
    else
        log_warning "⚠️ Validation script missing"
    fi
    
    return ${#missing_platforms[@]}
}

# Generate test report
generate_test_report() {
    local report_file="$TEST_RESULTS_DIR/test-report-$(date +%Y%m%d_%H%M%S).html"
    
    log_info "Generating test report: $report_file"
    
    cat > "$report_file" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>TMS CI/CD Template Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 5px; }
        .success { color: #28a745; }
        .warning { color: #ffc107; }
        .error { color: #dc3545; }
        .section { margin: 20px 0; padding: 10px; border-left: 3px solid #007bff; }
        pre { background: #f8f9fa; padding: 10px; border-radius: 3px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="header">
        <h1>TMS CI/CD Template Test Report</h1>
        <p>Generated: $(date)</p>
    </div>
    
    <div class="section">
        <h2>Test Summary</h2>
        <pre>
EOF
    
    # Add log content to report
    if [[ -f "$LOG_FILE" ]]; then
        cat "$LOG_FILE" >> "$report_file"
    fi
    
    cat >> "$report_file" << 'EOF'
        </pre>
    </div>
    
    <div class="section">
        <h2>Recommendations</h2>
        <ul>
            <li>Fix all syntax errors before deployment</li>
            <li>Ensure all templates have proper TMS integration</li>
            <li>Add security scanning to CI/CD pipelines</li>
            <li>Test templates in staging environments</li>
            <li>Keep documentation up to date</li>
        </ul>
    </div>
</body>
</html>
EOF
    
    log_success "Test report generated: $report_file"
}

# Main test execution
main() {
    log_info "Starting TMS CI/CD Template Test Suite"
    log_info "============================================"
    
    init_test_env
    
    local total_errors=0
    
    # Run all tests
    test_github_actions || total_errors=$((total_errors + $?))
    test_azure_devops || total_errors=$((total_errors + $?))
    test_gitlab_ci || total_errors=$((total_errors + $?))
    test_jenkins || total_errors=$((total_errors + $?))
    test_docker || total_errors=$((total_errors + $?))
    
    test_webhook_integration
    test_template_completeness || total_errors=$((total_errors + $?))
    
    # Run JavaScript validator if available
    if [[ -f "$SCRIPT_DIR/validate-templates.js" ]] && command -v node >/dev/null 2>&1; then
        log_info "Running JavaScript validator..."
        if node "$SCRIPT_DIR/validate-templates.js"; then
            log_success "✅ JavaScript validation passed"
        else
            log_error "❌ JavaScript validation failed"
            total_errors=$((total_errors + 1))
        fi
    fi
    
    generate_test_report
    
    log_info "============================================"
    if [[ $total_errors -eq 0 ]]; then
        log_success "🎉 All tests passed! Templates are ready for use."
        exit 0
    else
        log_error "🚨 $total_errors test(s) failed. Please review and fix issues."
        exit 1
    fi
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi