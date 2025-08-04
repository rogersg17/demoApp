#!/bin/bash
set -e

# TMS Test Runner Script
# Executes tests and reports results back to TMS via webhooks

echo "🚀 TMS Test Runner Starting..."
echo "📊 Configuration:"
echo "   Test Suite: ${TEST_SUITE:-all}"
echo "   Environment: ${TEST_ENVIRONMENT:-staging}"
echo "   Execution ID: ${EXECUTION_ID:-unknown}"
echo "   Shard: ${SHARD_INDEX:-1}/${TOTAL_SHARDS:-1}"

# Set default values
TEST_SUITE=${TEST_SUITE:-"all"}
TEST_ENVIRONMENT=${TEST_ENVIRONMENT:-"staging"}
SHARD_INDEX=${SHARD_INDEX:-1}
TOTAL_SHARDS=${TOTAL_SHARDS:-1}
EXECUTION_ID=${EXECUTION_ID:-"docker-$(date +%s)"}

# Create result directories
mkdir -p ${TEST_RESULTS_DIR:-/app/test-results}
mkdir -p ${TEST_REPORTS_DIR:-/app/test-reports}
mkdir -p ${ARTIFACTS_DIR:-/app/artifacts}

# Function to send webhook notification
send_webhook() {
    local payload="$1"
    local description="$2"
    
    if [ -n "$WEBHOOK_URL" ] && [ -n "$TMS_WEBHOOK_TOKEN" ]; then
        echo "📡 Sending webhook: $description"
        curl -X POST "$WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $TMS_WEBHOOK_TOKEN" \
            -d "$payload" \
            --max-time 30 \
            --retry 3 \
            --retry-delay 5 \
            --fail-with-body || {
                echo "❌ Failed to send webhook: $description"
                return 1
            }
        echo "✅ Successfully sent webhook: $description"
        return 0
    else
        echo "⚠️ Webhook URL or token not configured, skipping: $description"
        return 0
    fi
}

# Function to get test command based on suite
get_test_command() {
    local suite="$1"
    local command=""
    
    case "$suite" in
        "smoke")
            command="npx playwright test --grep @smoke"
            ;;
        "regression")
            command="npx playwright test --grep @regression"
            ;;
        "api")
            command="npx playwright test tests/api/"
            ;;
        "ui")
            command="npx playwright test tests/ui/"
            ;;
        "all"|*)
            command="npx playwright test"
            ;;
    esac
    
    # Add sharding if multiple shards
    if [ "$TOTAL_SHARDS" -gt 1 ]; then
        command="$command --shard=$SHARD_INDEX/$TOTAL_SHARDS"
    fi
    
    # Add JSON reporter for result processing
    command="$command --reporter=json"
    
    echo "$command"
}

# Send start notification
start_time=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
start_payload=$(jq -n \
    --arg executionId "$EXECUTION_ID" \
    --arg status "running" \
    --arg provider "docker" \
    --arg runId "$HOSTNAME" \
    --arg runUrl "docker://$HOSTNAME" \
    --arg testSuite "$TEST_SUITE" \
    --arg environment "$TEST_ENVIRONMENT" \
    --arg startTime "$start_time" \
    --arg shardId "$SHARD_INDEX" \
    --arg totalShards "$TOTAL_SHARDS" \
    --arg containerName "$HOSTNAME" \
    '{
        executionId: $executionId,
        status: $status,
        provider: $provider,
        runId: $runId,
        runUrl: $runUrl,
        testSuite: $testSuite,
        environment: $environment,
        startTime: $startTime,
        metadata: {
            shardId: $shardId,
            totalShards: $totalShards,
            containerName: $containerName,
            nodeVersion: "'$(node --version)'",
            playwrightVersion: "'$(npx playwright --version | head -1)'"
        }
    }')

send_webhook "$start_payload" "Test execution start"

# Determine test command
test_command=$(get_test_command "$TEST_SUITE")
results_file="${TEST_RESULTS_DIR}/test-results-shard-${SHARD_INDEX}.json"

echo "🧪 Executing: $test_command"
echo "📁 Results file: $results_file"

# Set test environment variables
export TEST_ENV="$TEST_ENVIRONMENT"
export PWTEST_OUTPUT_DIR="${TEST_REPORTS_DIR}/playwright-report-shard-${SHARD_INDEX}"

# Execute tests
test_exit_code=0
$test_command > "$results_file" 2>&1 || test_exit_code=$?

echo "📊 Test execution completed with exit code: $test_exit_code"

# Parse test results
if [ -f "$results_file" ]; then
    echo "✅ Test results file created successfully"
    
    # Extract metrics using jq
    total=$(jq '.stats.total // 0' "$results_file")
    passed=$(jq '.stats.passed // 0' "$results_file")
    failed=$(jq '.stats.failed // 0' "$results_file")
    skipped=$(jq '.stats.skipped // 0' "$results_file")
    
    echo "📊 Shard $SHARD_INDEX Results:"
    echo "   Total: $total"
    echo "   Passed: $passed"
    echo "   Failed: $failed"
    echo "   Skipped: $skipped"
    
    # Extract failed tests
    failed_tests_file="${TEST_RESULTS_DIR}/failed-tests-shard-${SHARD_INDEX}.json"
    jq -r '.tests[] | select(.status == "failed") | {title: .title, file: .file, error: .error}' "$results_file" > "$failed_tests_file" 2>/dev/null || echo "[]" > "$failed_tests_file"
    
    # Create summary file for aggregation
    summary_file="${TEST_RESULTS_DIR}/summary-shard-${SHARD_INDEX}.json"
    jq -n \
        --argjson total "$total" \
        --argjson passed "$passed" \
        --argjson failed "$failed" \
        --argjson skipped "$skipped" \
        --arg shardId "$SHARD_INDEX" \
        --arg status "$([ $failed -gt 0 ] && echo "failed" || echo "passed")" \
        --arg timestamp "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
        '{
            shard: $shardId,
            status: $status,
            results: {
                total: $total,
                passed: $passed,
                failed: $failed,
                skipped: $skipped
            },
            timestamp: $timestamp
        }' > "$summary_file"
    
    # Send shard completion notification
    shard_payload=$(jq -n \
        --arg executionId "$EXECUTION_ID" \
        --arg shardId "$SHARD_INDEX" \
        --arg status "shard-complete" \
        --arg provider "docker" \
        --arg runId "$HOSTNAME" \
        --argjson total "$total" \
        --argjson passed "$passed" \
        --argjson failed "$failed" \
        --argjson skipped "$skipped" \
        --arg resultsFile "test-results-shard-${SHARD_INDEX}.json" \
        --arg reportUrl "docker://$HOSTNAME/reports/shard-${SHARD_INDEX}" \
        --arg timestamp "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
        '{
            executionId: $executionId,
            shardId: $shardId,
            status: $status,
            provider: $provider,
            runId: $runId,
            results: {
                total: $total,
                passed: $passed,
                failed: $failed,
                skipped: $skipped
            },
            artifacts: {
                resultsFile: $resultsFile,
                reportUrl: $reportUrl
            },
            timestamp: $timestamp
        }')
    
    send_webhook "$shard_payload" "Shard $SHARD_INDEX completion"
    
else
    echo "❌ Test results file not found"
    
    # Create empty results for aggregation
    echo '{"stats": {"total": 0, "passed": 0, "failed": 0, "skipped": 0}, "tests": []}' > "$results_file"
    echo "[]" > "${TEST_RESULTS_DIR}/failed-tests-shard-${SHARD_INDEX}.json"
    
    # Create error summary
    jq -n \
        --arg shardId "$SHARD_INDEX" \
        --arg status "error" \
        --arg timestamp "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
        '{
            shard: $shardId,
            status: $status,
            results: {
                total: 0,
                passed: 0,
                failed: 0,
                skipped: 0
            },
            timestamp: $timestamp,
            error: "Test results file not generated"
        }' > "${TEST_RESULTS_DIR}/summary-shard-${SHARD_INDEX}.json"
    
    test_exit_code=1
fi

# Copy additional artifacts if they exist
if [ -d "playwright-report" ]; then
    echo "📁 Copying Playwright HTML report..."
    cp -r playwright-report "${ARTIFACTS_DIR}/playwright-report-shard-${SHARD_INDEX}" || echo "⚠️ Failed to copy HTML report"
fi

if [ -d "test-results" ]; then
    echo "📁 Copying test artifacts..."
    cp -r test-results "${ARTIFACTS_DIR}/test-artifacts-shard-${SHARD_INDEX}" || echo "⚠️ Failed to copy test artifacts"
fi

# Final status
if [ $test_exit_code -eq 0 ] && [ "$failed" -eq 0 ]; then
    echo "✅ Shard $SHARD_INDEX completed successfully"
    shard_status="passed"
else
    echo "❌ Shard $SHARD_INDEX completed with failures or errors"
    shard_status="failed"
fi

# Create completion marker
echo "$shard_status" > "${TEST_RESULTS_DIR}/shard-${SHARD_INDEX}.complete"

echo "🏁 TMS Test Runner completed for shard $SHARD_INDEX"
exit $test_exit_code