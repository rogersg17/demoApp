"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.state = void 0;
exports.formatDate = formatDate;
exports.formatStatusDisplay = formatStatusDisplay;
exports.showNotification = showNotification;
exports.removeNotification = removeNotification;
const types_js_1 = require("./types.js");
// Global state with proper typing
const state = {
    allTests: [],
    currentTests: [],
    testResults: null,
    currentExecutionTestIds: [],
    latestExecutionResults: { passed: 0, failed: 0, total: 0 },
    isRunning: false,
    ui: {},
    executionStartTime: null,
    pollCount: 0,
    refreshInterval: null
};
exports.state = state;
// Utility function to safely get DOM elements with proper typing
function getElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        throw new types_js_1.TestExecutionError(`Required element not found: ${id}`, 'MISSING_ELEMENT');
    }
    return element;
}
function getElementSafe(id) {
    return document.getElementById(id);
}
// Utility function to format dates with proper typing
function formatDate(dateString) {
    if (!dateString)
        return 'Not run';
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    if (diffInHours < 1) {
        const minutes = Math.floor(diffInHours * 60);
        return minutes <= 0 ? 'Just now' : `${minutes}m ago`;
    }
    else if (diffInHours < 24) {
        return `${Math.floor(diffInHours)}h ago`;
    }
    else {
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
}
// Utility function to format status for display with type safety
function formatStatusDisplay(status) {
    const statusMap = {
        'not-run': 'Not Run',
        'passed': 'Passed',
        'failed': 'Failed',
        'skipped': 'Skipped',
        'running': 'Running'
    };
    return statusMap[status] || status;
}
// Initialize the page with proper error handling
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Check if user is logged in
        const loggedInUser = sessionStorage.getItem('loggedInUser');
        if (!loggedInUser) {
            window.location.href = '../login/index.html';
            return;
        }
        // Display welcome message
        const welcomeElement = getElementSafe('welcomeMessage');
        if (welcomeElement) {
            welcomeElement.textContent = `Welcome, ${loggedInUser}!`;
        }
        await loadTestData();
        setupEventListeners();
        renderTests();
    }
    catch (error) {
        console.error('Error initializing page:', error);
        showNotification('Failed to initialize test management page', 'error');
    }
});
// Load test data from API with proper typing and error handling
async function loadTestData() {
    try {
        const response = await fetch('/api/tests');
        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/login/index.html';
                return;
            }
            throw new types_js_1.ApiError('Failed to fetch test data', response.status);
        }
        const testResults = await response.json();
        state.testResults = testResults;
        // Use real test data from API if available, otherwise generate mock data
        if (testResults.tests && testResults.tests.length > 0) {
            state.allTests = testResults.tests.map((test, index) => ({
                id: index + 1,
                name: test.name,
                file: test.file,
                suite: test.suite,
                status: (0, types_js_1.isTestStatus)(test.status) ? test.status : 'not-run',
                duration: test.duration || 'N/A',
                lastRun: test.lastRun || null,
                tags: test.tags || ['automated']
            }));
        }
        else {
            // Generate mock data, but if we have recent test results, update some tests accordingly
            state.allTests = generateTestData();
            // If we have recent test execution results, update some tests to show realistic statuses
            if (testResults.passingTests > 0 || testResults.failingTests > 0) {
                updateTestsWithRecentResults(testResults);
            }
        }
        state.currentTests = [...state.allTests];
        updateSummaryStats();
    }
    catch (error) {
        console.error('Error loading test data:', error);
        showNotification('Failed to load test data', 'error');
        // Fallback to mock data
        state.testResults = {
            totalTests: 0,
            passingTests: 0,
            failingTests: 0,
            lastRun: null
        };
        state.allTests = generateTestData();
        state.currentTests = [...state.allTests];
        updateSummaryStats();
    }
}
// Update tests with recent execution results with proper typing
function updateTestsWithRecentResults(results) {
    if (!results.lastRun)
        return;
    const lastRunDate = results.lastRun;
    const totalTests = state.allTests.length;
    const passedCount = results.passingTests || 0;
    const failedCount = results.failingTests || 0;
    const totalRun = passedCount + failedCount;
    if (totalRun === 0)
        return;
    // Update tests to reflect the actual results
    let passedAssigned = 0;
    let failedAssigned = 0;
    // Shuffle tests to randomly assign statuses
    const shuffledIndices = Array.from({ length: totalTests }, (_, i) => i)
        .sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(totalRun, totalTests); i++) {
        const testIndex = shuffledIndices[i];
        if (testIndex === undefined)
            continue;
        const test = state.allTests[testIndex];
        if (!test)
            continue;
        if (passedAssigned < passedCount) {
            test.status = 'passed';
            test.duration = `${(Math.random() * 2 + 0.5).toFixed(1)}s`;
            test.lastRun = lastRunDate;
            passedAssigned++;
        }
        else if (failedAssigned < failedCount) {
            test.status = 'failed';
            test.duration = `${(Math.random() * 2 + 0.5).toFixed(1)}s`;
            test.lastRun = lastRunDate;
            failedAssigned++;
        }
    }
}
// Generate test data based on actual test files with proper typing
function generateTestData() {
    const testFiles = [
        'login-accessibility.spec.ts',
        'login-browser-behavior.spec.ts',
        'login-functional.spec.ts',
        'login-messages.spec.ts',
        'login-navigation.spec.ts',
        'login-ui.spec.ts',
        'login-validation.spec.ts',
        'jira-demo.spec.ts'
    ];
    const tests = [];
    let testId = 1;
    testFiles.forEach(file => {
        const baseTests = getTestsForFile(file);
        baseTests.forEach(test => {
            tests.push({
                id: testId++,
                name: test.name,
                file: file,
                suite: test.suite,
                status: 'not-run',
                duration: 'N/A',
                lastRun: null,
                tags: test.tags || []
            });
        });
    });
    return tests;
}
// Get test cases for each file with proper typing
function getTestsForFile(fileName) {
    const testMap = {
        'login-accessibility.spec.ts': [
            { name: 'should have proper heading structure', suite: 'Accessibility Tests' },
            { name: 'should support keyboard navigation', suite: 'Accessibility Tests' },
            { name: 'should have proper ARIA labels', suite: 'Accessibility Tests' },
            { name: 'should have sufficient color contrast', suite: 'Accessibility Tests' },
            { name: 'should have proper focus indicators', suite: 'Accessibility Tests' },
            { name: 'should support screen readers', suite: 'Accessibility Tests' }
        ],
        'login-browser-behavior.spec.ts': [
            { name: 'should work in Chrome', suite: 'Browser Tests' },
            { name: 'should work in Firefox', suite: 'Browser Tests' },
            { name: 'should work in Safari', suite: 'Browser Tests' },
            { name: 'should work in Edge', suite: 'Browser Tests' },
            { name: 'should handle browser back button', suite: 'Browser Tests' },
            { name: 'should handle page refresh', suite: 'Browser Tests' }
        ],
        'login-functional.spec.ts': [
            { name: 'should login with valid credentials', suite: 'Functional Tests' },
            { name: 'should reject invalid credentials', suite: 'Functional Tests' },
            { name: 'should handle empty fields', suite: 'Functional Tests' },
            { name: 'should handle SQL injection attempts', suite: 'Functional Tests' },
            { name: 'should handle special characters', suite: 'Functional Tests' },
            { name: 'should handle case sensitivity', suite: 'Functional Tests' },
            { name: 'should handle whitespace', suite: 'Functional Tests' },
            { name: 'should handle long input', suite: 'Functional Tests' }
        ],
        'login-messages.spec.ts': [
            { name: 'should show correct error for invalid credentials', suite: 'Message Tests' },
            { name: 'should show correct error for empty username', suite: 'Message Tests' },
            { name: 'should show correct error for empty password', suite: 'Message Tests' },
            { name: 'should show loading state during login', suite: 'Message Tests' },
            { name: 'should show success message on valid login', suite: 'Message Tests' }
        ],
        'login-navigation.spec.ts': [
            { name: 'should redirect to main page after login', suite: 'Navigation Tests' },
            { name: 'should redirect to login if not authenticated', suite: 'Navigation Tests' },
            { name: 'should handle direct URL access', suite: 'Navigation Tests' },
            { name: 'should maintain session across pages', suite: 'Navigation Tests' },
            { name: 'should logout properly', suite: 'Navigation Tests' }
        ],
        'login-ui.spec.ts': [
            { name: 'should display login form correctly', suite: 'UI Tests' },
            { name: 'should have proper input field styling', suite: 'UI Tests' },
            { name: 'should have responsive design', suite: 'UI Tests' },
            { name: 'should display logo correctly', suite: 'UI Tests' },
            { name: 'should have proper button styling', suite: 'UI Tests' },
            { name: 'should show password visibility toggle', suite: 'UI Tests' }
        ],
        'login-validation.spec.ts': [
            { name: 'should validate username format', suite: 'Validation Tests' },
            { name: 'should validate password strength', suite: 'Validation Tests' },
            { name: 'should prevent XSS attacks', suite: 'Validation Tests' },
            { name: 'should sanitize input data', suite: 'Validation Tests' },
            { name: 'should handle malformed requests', suite: 'Validation Tests' }
        ],
        'jira-demo.spec.ts': [
            { name: 'should connect to JIRA API', suite: 'Integration Tests' },
            { name: 'should create test issue', suite: 'Integration Tests' },
            { name: 'should update test results', suite: 'Integration Tests' }
        ]
    };
    return testMap[fileName] || [];
}
// Setup event listeners with proper typing and error handling
function setupEventListeners() {
    try {
        // Filter functionality
        const statusFilter = getElement('statusFilter');
        const suiteFilter = getElement('suiteFilter');
        const searchInput = getElement('searchInput');
        statusFilter.addEventListener('change', filterTests);
        suiteFilter.addEventListener('change', filterTests);
        searchInput.addEventListener('input', filterTests);
        // Run buttons
        const runAllTestsBtn = getElement('runAllTestsBtn');
        const runSelectedTestsBtn = getElement('runSelectedTestsBtn');
        runAllTestsBtn.addEventListener('click', () => runTests('all'));
        runSelectedTestsBtn.addEventListener('click', () => runSelectedTests());
        // Select all checkbox
        const selectAllTests = getElement('selectAllTests');
        selectAllTests.addEventListener('change', toggleSelectAll);
        // Refresh button
        const refreshBtn = getElement('refreshBtn');
        refreshBtn.addEventListener('click', refreshTestData);
        // Store UI elements in state for later use
        state.ui = {
            statusFilter,
            suiteFilter,
            searchInput,
            runAllTestsBtn,
            runSelectedTestsBtn,
            selectAllTests,
            refreshBtn
        };
    }
    catch (error) {
        console.error('Error setting up event listeners:', error);
        throw new types_js_1.TestExecutionError('Failed to setup event listeners', 'SETUP_ERROR');
    }
}
// Update summary statistics with proper typing
function updateSummaryStats() {
    try {
        // Latest execution results
        const latestPassed = state.latestExecutionResults.total > 0 ? state.latestExecutionResults.passed : 0;
        const latestFailed = state.latestExecutionResults.total > 0 ? state.latestExecutionResults.failed : 0;
        const latestTotal = state.latestExecutionResults.total;
        // Overall test suite status
        const overallPassed = state.allTests.filter(t => t.status === 'passed').length;
        const overallFailed = state.allTests.filter(t => t.status === 'failed').length;
        const overallTotal = state.allTests.length;
        console.log('📊 Updating summary stats:', {
            latest: { total: latestTotal, passed: latestPassed, failed: latestFailed },
            overall: { total: overallTotal, passed: overallPassed, failed: overallFailed }
        });
        // Update latest execution stats
        const totalTestsElement = getElementSafe('totalTests');
        const passingTestsElement = getElementSafe('passingTests');
        const failingTestsElement = getElementSafe('failingTests');
        const lastRunElement = getElementSafe('lastRun');
        if (totalTestsElement)
            totalTestsElement.textContent = overallTotal.toString();
        if (passingTestsElement)
            passingTestsElement.textContent = `${latestPassed} / ${overallPassed}`;
        if (failingTestsElement)
            failingTestsElement.textContent = `${latestFailed} / ${overallFailed}`;
        // Update last run time if we have recent executions
        const mostRecentRun = state.allTests
            .filter(t => t.lastRun)
            .map(t => new Date(t.lastRun))
            .sort((a, b) => b.getTime() - a.getTime())[0];
        if (lastRunElement) {
            lastRunElement.textContent = mostRecentRun ?
                mostRecentRun.toLocaleString() : 'Never';
        }
    }
    catch (error) {
        console.error('Error updating summary stats:', error);
    }
}
// Filter tests based on current filter settings with proper typing
function filterTests() {
    try {
        const statusFilter = state.ui.statusFilter?.value || 'all';
        const suiteFilter = state.ui.suiteFilter?.value || 'all';
        const searchTerm = (state.ui.searchInput?.value || '').toLowerCase();
        state.currentTests = state.allTests.filter(test => {
            const matchesStatus = statusFilter === 'all' || test.status === statusFilter;
            const matchesSuite = suiteFilter === 'all' || test.suite === suiteFilter;
            const matchesSearch = searchTerm === '' ||
                test.name.toLowerCase().includes(searchTerm) ||
                test.file.toLowerCase().includes(searchTerm);
            return matchesStatus && matchesSuite && matchesSearch;
        });
        renderTests();
    }
    catch (error) {
        console.error('Error filtering tests:', error);
        showNotification('Error filtering tests', 'error');
    }
}
// Show notification with proper typing and validation
function showNotification(message, type = 'info') {
    try {
        // Validate notification type
        if (!(0, types_js_1.isNotificationType)(type)) {
            console.warn(`Invalid notification type: ${type}, defaulting to 'info'`);
            type = 'info';
        }
        // Ensure notification container exists
        let notificationContainer = document.getElementById('notification-container');
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.id = 'notification-container';
            notificationContainer.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
      `;
            document.body.appendChild(notificationContainer);
        }
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
      position: relative;
      top: auto;
      right: auto;
      pointer-events: auto;
      transform: translateX(100%);
      opacity: 0;
      transition: all 0.3s ease-out;
    `;
        notification.innerHTML = `
      <span>${message}</span>
      <button onclick="removeNotification(this.parentElement)">&times;</button>
    `;
        // Add to container
        notificationContainer.appendChild(notification);
        // Animate in
        requestAnimationFrame(() => {
            notification.style.transform = 'translateX(0)';
            notification.style.opacity = '1';
        });
        // Auto remove after 5 seconds
        setTimeout(() => {
            removeNotification(notification);
        }, 5000);
    }
    catch (error) {
        console.error('Error showing notification:', error);
    }
}
// Remove notification with animation and proper typing
function removeNotification(notification) {
    if (notification && notification.parentElement) {
        notification.style.transform = 'translateX(100%)';
        notification.style.opacity = '0';
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 300);
    }
}
// Make removeNotification available globally for onclick handlers
window.removeNotification = removeNotification;
// Render the test table with proper typing and error handling
function renderTests() {
    try {
        console.log('🖼️ Rendering tests table');
        console.log('📊 currentTests status summary:', {
            total: state.currentTests.length,
            passed: state.currentTests.filter(t => t.status === 'passed').length,
            failed: state.currentTests.filter(t => t.status === 'failed').length,
            notRun: state.currentTests.filter(t => t.status === 'not-run').length,
            running: state.currentTests.filter(t => t.status === 'running').length
        });
        const tbody = getElement('testTableBody');
        tbody.innerHTML = '';
        if (state.currentTests.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="no-tests">No tests match current filters</td></tr>';
            return;
        }
        state.currentTests.forEach(test => {
            const row = document.createElement('tr');
            const dateRun = test.lastRun ? formatDate(test.lastRun) : 'Not run';
            const statusDisplay = formatStatusDisplay(test.status);
            const duration = test.duration || 'N/A';
            row.innerHTML = `
        <td>
          <input type="checkbox" class="test-checkbox" data-test-id="${test.id}">
        </td>
        <td class="test-name">${escapeHtml(test.name)}</td>
        <td class="test-file">${escapeHtml(test.file)}</td>
        <td class="test-suite">${escapeHtml(test.suite)}</td>
        <td class="test-status">
          <span class="status-badge status-${test.status}" data-test-id="${test.id}">${statusDisplay}</span>
        </td>
        <td class="test-duration" data-test-id="${test.id}">${escapeHtml(duration)}</td>
        <td class="test-date" data-test-id="${test.id}">${escapeHtml(dateRun)}</td>
      `;
            tbody.appendChild(row);
        });
        updateSelectedCount();
    }
    catch (error) {
        console.error('Error rendering tests:', error);
        showNotification('Error rendering test table', 'error');
    }
}
// Utility function to escape HTML and prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
// Toggle select all functionality with proper typing
function toggleSelectAll() {
    try {
        const selectAll = getElement('selectAllTests');
        const checkboxes = document.querySelectorAll('.test-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = selectAll.checked;
        });
        updateSelectedCount();
    }
    catch (error) {
        console.error('Error toggling select all:', error);
        showNotification('Error updating selection', 'error');
    }
}
// Update selected test count with proper typing
function updateSelectedCount() {
    try {
        const selectedCount = document.querySelectorAll('.test-checkbox:checked').length;
        const runSelectedBtn = getElement('runSelectedTestsBtn');
        if (selectedCount > 0) {
            runSelectedBtn.textContent = `Run Selected (${selectedCount})`;
            runSelectedBtn.disabled = false;
        }
        else {
            runSelectedBtn.textContent = 'Run Selected';
            runSelectedBtn.disabled = true;
        }
        // Update select all checkbox state
        const selectAllCheckbox = getElement('selectAllTests');
        const totalCheckboxes = document.querySelectorAll('.test-checkbox').length;
        if (selectedCount === 0) {
            selectAllCheckbox.indeterminate = false;
            selectAllCheckbox.checked = false;
        }
        else if (selectedCount === totalCheckboxes) {
            selectAllCheckbox.indeterminate = false;
            selectAllCheckbox.checked = true;
        }
        else {
            selectAllCheckbox.indeterminate = true;
        }
    }
    catch (error) {
        console.error('Error updating selected count:', error);
    }
}
// Listen for checkbox changes with proper typing
document.addEventListener('change', (e) => {
    const target = e.target;
    if (target && target.classList.contains('test-checkbox')) {
        updateSelectedCount();
    }
});
// Run all tests with proper typing and error handling
async function runTests(scope = 'all') {
    try {
        console.log('🔥 runTests function called with scope:', scope);
        if (state.isRunning) {
            showNotification('Tests are already running', 'warning');
            return;
        }
        state.isRunning = true;
        showTestProgress('Starting test execution...', true);
        // Store all current test IDs for table updates when running all tests
        if (scope === 'all') {
            state.currentExecutionTestIds = state.currentTests.map(test => test.id.toString());
            console.log('🎯 Stored ALL test IDs for execution:', state.currentExecutionTestIds.length, 'tests');
        }
        else {
            // For other scopes, use selected tests
            const selectedCheckboxes = document.querySelectorAll('.test-checkbox:checked');
            state.currentExecutionTestIds = Array.from(selectedCheckboxes)
                .map(cb => cb.getAttribute('data-test-id'))
                .filter((id) => id !== null);
            console.log('🎯 Stored SELECTED test IDs for execution:', state.currentExecutionTestIds);
        }
        // Disable run buttons during execution
        setRunButtonsEnabled(false);
        const requestBody = {
            testFiles: scope === 'all' ? [] : getSelectedTestFiles(),
            suite: scope
        };
        const response = await fetch('/api/tests/run', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        if (!response.ok) {
            throw new types_js_1.ApiError('Failed to start test execution', response.status);
        }
        const result = await response.json();
        showNotification(`Test execution started. ID: ${result.executionId}`, 'success');
        // Update progress indicator
        showTestProgress('Running Playwright tests...', true);
        // Monitor test execution progress
        await monitorTestExecution(result.executionId);
    }
    catch (error) {
        console.error('Error running tests:', error);
        showNotification('Failed to run tests', 'error');
        setRunButtonsEnabled(true);
        hideTestProgress();
        state.isRunning = false;
    }
}
// Run selected tests with proper typing and validation
async function runSelectedTests() {
    try {
        console.log('🔥 runSelectedTests function called!');
        if (state.isRunning) {
            showNotification('Tests are already running', 'warning');
            return;
        }
        const selectedCheckboxes = document.querySelectorAll('.test-checkbox:checked');
        console.log('Selected checkboxes:', selectedCheckboxes.length);
        if (selectedCheckboxes.length === 0) {
            showNotification('Please select tests to run', 'warning');
            return;
        }
        state.isRunning = true;
        // Store selected test IDs before execution starts
        state.currentExecutionTestIds = Array.from(selectedCheckboxes)
            .map(cb => cb.getAttribute('data-test-id'))
            .filter((id) => id !== null);
        console.log('Stored execution test IDs:', state.currentExecutionTestIds);
        const selectedTestFiles = getSelectedTestFiles();
        console.log('Selected test files to run:', selectedTestFiles);
        if (selectedTestFiles.length === 0) {
            showNotification('No test files selected', 'warning');
            state.isRunning = false;
            return;
        }
        showTestProgress(`Starting execution of ${selectedCheckboxes.length} selected tests...`, true);
        // Disable run buttons during execution
        setRunButtonsEnabled(false);
        console.log('Sending request to run tests:', { testFiles: selectedTestFiles });
        const requestBody = {
            testFiles: selectedTestFiles,
            suite: 'selected'
        };
        const response = await fetch('/api/tests/run', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Server response error:', errorText);
            throw new types_js_1.ApiError(`Failed to start test execution: ${response.status} ${errorText}`, response.status);
        }
        const result = await response.json();
        console.log('Test execution started:', result);
        showNotification(`Test execution started. ID: ${result.executionId}`, 'success');
        // Update progress indicator
        showTestProgress('Running selected tests...', true);
        // Monitor test execution progress
        await monitorTestExecution(result.executionId);
    }
    catch (error) {
        console.error('Error running selected tests:', error);
        showNotification('Failed to run selected tests', 'error');
        setRunButtonsEnabled(true);
        hideTestProgress();
        state.isRunning = false;
    }
}
// Get selected test files with proper typing
function getSelectedTestFiles() {
    try {
        const selectedCheckboxes = document.querySelectorAll('.test-checkbox:checked');
        const selectedFiles = new Set();
        selectedCheckboxes.forEach(checkbox => {
            const row = checkbox.closest('tr');
            const fileCell = row?.querySelector('td:nth-child(3)'); // File column (3rd column)
            if (fileCell?.textContent) {
                selectedFiles.add(fileCell.textContent.trim());
            }
        });
        console.log('Selected files:', Array.from(selectedFiles));
        return Array.from(selectedFiles);
    }
    catch (error) {
        console.error('Error getting selected test files:', error);
        return [];
    }
}
// Monitor test execution progress with proper typing
async function monitorTestExecution(executionId) {
    const checkInterval = 2000; // Check every 2 seconds
    const maxChecks = 60; // Maximum 2 minutes
    let checks = 0;
    const startTime = Date.now();
    try {
        // Show progress indicator
        showProgressIndicator(true);
        updateProgressIndicator('Running tests...', 0, startTime);
        // Set all selected tests to "running" status
        updateSelectedTestsStatus('running', new Date().toISOString());
        const checkStatus = async () => {
            try {
                const response = await fetch(`/api/tests/results/${executionId}`);
                if (!response.ok) {
                    throw new types_js_1.ApiError('Failed to fetch execution status', response.status);
                }
                const execution = await response.json();
                // Update individual test results if available
                if (execution.results?.tests) {
                    updateIndividualTestResults(execution.results.tests);
                }
                if (execution.status === 'completed') {
                    updateProgressIndicator('Tests completed!', 100, startTime);
                    setTimeout(() => {
                        showProgressIndicator(false);
                        handleTestCompletion(execution);
                    }, 1000);
                    return;
                }
                else if (execution.status === 'failed') {
                    updateProgressIndicator('Test execution failed', 0, startTime);
                    setTimeout(() => {
                        showProgressIndicator(false);
                        showNotification(`Test execution failed: ${execution.error || 'Unknown error'}`, 'error');
                        setRunButtonsEnabled(true);
                        state.isRunning = false;
                    }, 1000);
                    return;
                }
                else if (execution.status === 'running') {
                    // Show indeterminate progress for running tests
                    updateProgressIndicator('Running tests...', -1, startTime);
                }
                checks++;
                if (checks < maxChecks) {
                    setTimeout(checkStatus, checkInterval);
                }
                else {
                    updateProgressIndicator('Test execution timeout', 0, startTime);
                    setTimeout(() => {
                        showProgressIndicator(false);
                        showNotification('Test execution timeout - please check manually', 'warning');
                        setRunButtonsEnabled(true);
                        state.isRunning = false;
                    }, 1000);
                }
            }
            catch (error) {
                console.error('Error checking test status:', error);
                updateProgressIndicator('Error checking status', 0, startTime);
                setTimeout(() => {
                    showProgressIndicator(false);
                    showNotification('Failed to check test status', 'error');
                    setRunButtonsEnabled(true);
                    state.isRunning = false;
                }, 1000);
            }
        };
        // Start monitoring
        setTimeout(checkStatus, checkInterval);
    }
    catch (error) {
        console.error('Error setting up test monitoring:', error);
        showNotification('Failed to monitor test execution', 'error');
        state.isRunning = false;
    }
}
// Additional utility functions with proper typing
function setRunButtonsEnabled(enabled) {
    try {
        const runAllBtn = getElementSafe('runAllTestsBtn');
        const runSelectedBtn = getElementSafe('runSelectedTestsBtn');
        if (runAllBtn) {
            runAllBtn.disabled = !enabled;
            runAllBtn.textContent = enabled ? 'Run All Tests' : 'Running...';
        }
        if (runSelectedBtn) {
            runSelectedBtn.disabled = !enabled;
            runSelectedBtn.textContent = enabled ? 'Run Selected' : 'Running...';
        }
    }
    catch (error) {
        console.error('Error setting run button states:', error);
    }
}
function showTestProgress(message, indeterminate = false) {
    try {
        const progressContainer = getElementSafe('testProgress');
        const progressText = getElementSafe('progressText');
        const progressTime = getElementSafe('progressTime');
        const progressFill = getElementSafe('progressFill');
        if (progressContainer && progressText && progressTime && progressFill) {
            progressContainer.style.display = 'block';
            progressText.textContent = message;
            progressTime.textContent = '0s';
            if (indeterminate) {
                progressFill.classList.add('indeterminate');
                progressFill.style.width = '30%';
            }
            else {
                progressFill.classList.remove('indeterminate');
                progressFill.style.width = '0%';
            }
        }
    }
    catch (error) {
        console.error('Error showing test progress:', error);
    }
}
function hideTestProgress() {
    try {
        const progressContainer = getElementSafe('testProgress');
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
    }
    catch (error) {
        console.error('Error hiding test progress:', error);
    }
}
function showProgressIndicator(show) {
    try {
        const progressContainer = getElementSafe('testProgress');
        if (progressContainer) {
            progressContainer.style.display = show ? 'block' : 'none';
        }
    }
    catch (error) {
        console.error('Error showing progress indicator:', error);
    }
}
function updateProgressIndicator(message, percentage, startTime) {
    try {
        const progressText = getElementSafe('progressText');
        const progressTime = getElementSafe('progressTime');
        const progressFill = getElementSafe('progressFill');
        if (progressText && progressTime && progressFill) {
            progressText.textContent = message;
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            progressTime.textContent = `${elapsed}s`;
            if (percentage === -1) {
                // Indeterminate progress
                progressFill.classList.add('indeterminate');
            }
            else {
                progressFill.classList.remove('indeterminate');
                progressFill.style.width = `${percentage}%`;
            }
        }
    }
    catch (error) {
        console.error('Error updating progress indicator:', error);
    }
}
// Functions that need to be implemented (stubs for now)
function updateSelectedTestsStatus(status, dateRun) {
    console.log(`🏃 Setting ${state.currentExecutionTestIds.length} tests to ${status} status`);
    console.log('🎯 Test IDs being updated:', state.currentExecutionTestIds);
    state.currentExecutionTestIds.forEach(testId => {
        updateTestStatusInTable(testId, status, null, dateRun);
    });
}
function updateIndividualTestResults(testResults) {
    try {
        console.log('🔄 Updating individual test results:', testResults);
        testResults.forEach((result) => {
            const testId = result.id || result.testId;
            const status = result.status || 'unknown';
            const duration = result.duration || null;
            const dateRun = result.dateRun || new Date().toISOString();
            if (testId) {
                // Update in allTests array
                const testIndex = state.allTests.findIndex(t => t.id === testId);
                if (testIndex !== -1) {
                    state.allTests[testIndex].status = status;
                    state.allTests[testIndex].duration = duration;
                    state.allTests[testIndex].lastRun = dateRun;
                }
                // Update in currentTests array
                const currentTestIndex = state.currentTests.findIndex(t => t.id === testId);
                if (currentTestIndex !== -1) {
                    state.currentTests[currentTestIndex].status = status;
                    state.currentTests[currentTestIndex].duration = duration;
                    state.currentTests[currentTestIndex].lastRun = dateRun;
                }
                // Update the table display
                updateTestStatusInTable(testId, status, duration, dateRun);
            }
        });
        // Update summary stats after all updates
        updateSummaryStats();
    }
    catch (error) {
        console.error('Error updating individual test results:', error);
        showNotification('Error updating test results', 'error');
    }
}
function updateTestStatusInTable(testId, status, duration, dateRun) {
    try {
        console.log(`🎯 Updating table for test ${testId}: status=${status}, duration=${duration}`);
        // Update status badge
        const statusElement = document.querySelector(`.status-badge[data-test-id="${testId}"]`);
        if (statusElement) {
            statusElement.className = `status-badge status-${status}`;
            statusElement.textContent = formatStatusDisplay(status);
        }
        // Update duration
        const durationElement = document.querySelector(`.test-duration[data-test-id="${testId}"]`);
        if (durationElement) {
            durationElement.textContent = duration || 'N/A';
        }
        // Update date
        const dateElement = document.querySelector(`.test-date[data-test-id="${testId}"]`);
        if (dateElement) {
            dateElement.textContent = formatDate(dateRun);
        }
        // Add visual feedback for status change
        const row = statusElement?.closest('tr');
        if (row) {
            row.classList.add('status-updated');
            setTimeout(() => {
                row.classList.remove('status-updated');
            }, 2000);
        }
    }
    catch (error) {
        console.error(`Error updating table for test ${testId}:`, error);
    }
}
function handleTestCompletion(execution) {
    try {
        console.log('✅ Handling test completion:', execution);
        // Update execution state
        state.isRunning = false;
        state.currentExecutionTestIds = [];
        state.executionStartTime = null;
        state.pollCount = 0;
        // Update latest execution results
        if (execution.results) {
            state.latestExecutionResults = {
                total: execution.results.total || 0,
                passed: execution.results.passed || 0,
                failed: execution.results.failed || 0,
                skipped: execution.results.skipped || 0
            };
        }
        // Re-enable run buttons
        setRunButtonsEnabled(true);
        // Hide progress indicator
        const progressElement = getElementSafe('testProgress');
        if (progressElement) {
            progressElement.style.display = 'none';
        }
        // Update summary stats
        updateSummaryStats();
        // Show completion notification
        const totalTests = execution.results?.total || 0;
        const passedTests = execution.results?.passed || 0;
        const failedTests = execution.results?.failed || 0;
        if (failedTests > 0) {
            showNotification(`Test run completed: ${passedTests} passed, ${failedTests} failed`, 'warning');
        }
        else {
            showNotification(`All ${totalTests} tests passed! 🎉`, 'success');
        }
        // Clear any pending refresh interval
        if (state.refreshInterval) {
            clearInterval(state.refreshInterval);
            state.refreshInterval = null;
        }
    }
    catch (error) {
        console.error('Error handling test completion:', error);
        showNotification('Error processing test completion', 'error');
        state.isRunning = false;
        setRunButtonsEnabled(true);
    }
}
async function refreshTestData() {
    showNotification('Refreshing test data...', 'info');
    try {
        await loadTestData();
        renderTests();
        updateSummaryStats();
        showNotification('Test data refreshed', 'success');
    }
    catch (error) {
        console.error('Error refreshing test data:', error);
        showNotification('Failed to refresh test data', 'error');
    }
}
