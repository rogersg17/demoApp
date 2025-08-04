#!/bin/bash
set -e

# TMS Result Aggregator Script
# Waits for all shards to complete and aggregates results

echo "🔄 TMS Result Aggregator Starting..."
echo "📊 Configuration:"
echo "   Execution ID: ${EXECUTION_ID:-unknown}"
echo "   Total Shards: ${TOTAL_SHARDS:-4}"
echo "   Test Suite: ${TEST_SUITE:-all}"
echo "   Environment: ${TEST_ENVIRONMENT:-staging}"

# Set default values
EXECUTION_ID=${EXECUTION_ID:-"docker-$(date +%s)"}
TOTAL_SHARDS=${TOTAL_SHARDS:-4}
TEST_SUITE=${TEST_SUITE:-"all"}
TEST_ENVIRONMENT=${TEST_ENVIRONMENT:-"staging"}
RESULTS_DIR=${TEST_RESULTS_DIR:-/app/test-results}
MAX_WAIT_TIME=${MAX_WAIT_TIME:-1800}  # 30 minutes max wait

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

# Function to check if all shards are complete
check_shards_complete() {
    local completed=0
    
    for shard in $(seq 1 $TOTAL_SHARDS); do
        if [ -f "$RESULTS_DIR/shard-${shard}.complete" ]; then
            completed=$((completed + 1))
        fi
    done
    
    echo $completed
}

# Wait for all shards to complete
echo "⏳ Waiting for all $TOTAL_SHARDS shards to complete..."
start_wait_time=$(date +%s)
timeout_time=$((start_wait_time + MAX_WAIT_TIME))

while true; do
    completed_shards=$(check_shards_complete)
    current_time=$(date +%s)
    
    echo "📊 Progress: $completed_shards/$TOTAL_SHARDS shards completed"
    
    if [ $completed_shards -eq $TOTAL_SHARDS ]; then
        echo "✅ All shards completed!"
        break
    fi
    
    if [ $current_time -gt $timeout_time ]; then
        echo "⏰ Timeout reached waiting for shards to complete"
        echo "❌ Only $completed_shards/$TOTAL_SHARDS shards completed within timeout"
        break
    fi
    
    sleep 10
done

# Aggregate results from all shards
echo "🔄 Aggregating results from all shards..."

total_tests=0
total_passed=0
total_failed=0
total_skipped=0
all_failed_tests="[]"
shard_statuses=()

# Process each shard's results
for shard in $(seq 1 $TOTAL_SHARDS); do
    summary_file="$RESULTS_DIR/summary-shard-${shard}.json"
    results_file="$RESULTS_DIR/test-results-shard-${shard}.json"
    failed_tests_file="$RESULTS_DIR/failed-tests-shard-${shard}.json"
    
    if [ -f "$summary_file" ]; then
        echo "📂 Processing shard $shard results..."
        
        # Read summary
        shard_total=$(jq -r '.results.total // 0' "$summary_file")
        shard_passed=$(jq -r '.results.passed // 0' "$summary_file")
        shard_failed=$(jq -r '.results.failed // 0' "$summary_file")
        shard_skipped=$(jq -r '.results.skipped // 0' "$summary_file")
        shard_status=$(jq -r '.status // "unknown"' "$summary_file")
        
        # Add to totals
        total_tests=$((total_tests + shard_total))
        total_passed=$((total_passed + shard_passed))
        total_failed=$((total_failed + shard_failed))
        total_skipped=$((total_skipped + shard_skipped))
        
        shard_statuses+=("$shard_status")
        
        echo "   Shard $shard: Total=$shard_total, Passed=$shard_passed, Failed=$shard_failed, Skipped=$shard_skipped, Status=$shard_status"
        
        # Aggregate failed tests
        if [ -f "$failed_tests_file" ]; then
            temp_failed=$(mktemp)
            jq -s 'flatten' <(echo "$all_failed_tests") "$failed_tests_file" > "$temp_failed"
            all_failed_tests=$(cat "$temp_failed")
            rm "$temp_failed"
        fi
        
    else
        echo "⚠️ Summary file not found for shard $shard, treating as error"
        shard_statuses+=("error")
    fi
done

# Determine overall status
overall_status="passed"
if [ $total_failed -gt 0 ]; then
    overall_status="failed"
elif [ $total_tests -eq 0 ]; then
    overall_status="error"
else
    # Check if any shard had errors
    for status in "${shard_statuses[@]}"; do
        if [ "$status" = "error" ]; then
            overall_status="error"
            break
        fi
    done
fi

echo "📊 Final Aggregated Results:"
echo "   Total Tests: $total_tests"
echo "   Passed: $total_passed"
echo "   Failed: $total_failed"
echo "   Skipped: $total_skipped"
echo "   Overall Status: $overall_status"

# Save aggregated results
aggregated_results_file="$RESULTS_DIR/aggregated-results.json"
end_time=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

jq -n \
    --arg executionId "$EXECUTION_ID" \
    --arg status "$overall_status" \
    --arg testSuite "$TEST_SUITE" \
    --arg environment "$TEST_ENVIRONMENT" \
    --argjson total "$total_tests" \
    --argjson passed "$total_passed" \
    --argjson failed "$total_failed" \
    --argjson skipped "$total_skipped" \
    --argjson failedTests "$all_failed_tests" \
    --arg endTime "$end_time" \
    --argjson totalShards "$TOTAL_SHARDS" \
    '{
        executionId: $executionId,
        status: $status,
        testSuite: $testSuite,
        environment: $environment,
        results: {
            total: $total,
            passed: $passed,
            failed: $failed,
            skipped: $skipped
        },
        failedTests: $failedTests,
        endTime: $endTime,
        metadata: {
            totalShards: $totalShards,
            provider: "docker",
            aggregator: true
        }
    }' > "$aggregated_results_file"

echo "💾 Aggregated results saved to: $aggregated_results_file"

# Create comprehensive final report
final_report_file="$RESULTS_DIR/final-report.json"
jq -n \
    --arg executionId "$EXECUTION_ID" \
    --arg status "$overall_status" \
    --arg provider "docker" \
    --arg runId "$HOSTNAME" \
    --arg runUrl "docker://$HOSTNAME" \
    --arg testSuite "$TEST_SUITE" \
    --arg environment "$TEST_ENVIRONMENT" \
    --argjson total "$total_tests" \
    --argjson passed "$total_passed" \
    --argjson failed "$total_failed" \
    --argjson skipped "$total_skipped" \
    --argjson failedTests "$all_failed_tests" \
    --arg endTime "$end_time" \
    --argjson totalShards "$TOTAL_SHARDS" \
    --arg containerName "$HOSTNAME" \
    '{
        executionId: $executionId,
        status: $status,
        provider: $provider,
        runId: $runId,
        runUrl: $runUrl,
        testSuite: $testSuite,
        environment: $environment,
        results: {
            total: $total,
            passed: $passed,
            failed: $failed,
            skipped: $skipped
        },
        failedTests: $failedTests,
        endTime: $endTime,
        artifacts: {
            reportUrl: ("docker://" + $containerName + "/reports"),
            resultsUrl: ("docker://" + $containerName + "/results"),
            logsUrl: ("docker://" + $containerName + "/logs")
        },
        metadata: {
            totalShards: $totalShards,
            containerName: $containerName,
            aggregator: true,
            nodeVersion: "'$(node --version)'",
            playwrightVersion: "'$(npx playwright --version | head -1)'"
        }
    }' > "$final_report_file"

# Send final results webhook
send_webhook "$(cat $final_report_file)" "Final aggregated results"

# Set exit code based on overall status
if [ "$overall_status" = "passed" ]; then
    echo "✅ All tests passed successfully"
    exit_code=0
elif [ "$overall_status" = "failed" ]; then
    echo "❌ Some tests failed"
    exit_code=1
else
    echo "⚠️ Test execution completed with errors"
    exit_code=2
fi

echo "🏁 TMS Result Aggregator completed with status: $overall_status"
exit $exit_code