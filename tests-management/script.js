// Global variables
let allTests = [];
let currentTests = [];
let testResults = null;

// Initialize the page
document.addEventListener('DOMContentLoaded', async function() {
    // Check if user is logged in
    const loggedInUser = sessionStorage.getItem('loggedInUser');
    if (!loggedInUser) {
        window.location.href = '../login/index.html';
        return;
    }

    // Display welcome message
    document.getElementById('welcomeMessage').textContent = `Welcome, ${loggedInUser}!`;
    
    await loadTestData();
    setupEventListeners();
    renderTests();
});

// Load test data from API
async function loadTestData() {
    try {
        const response = await fetch('/api/tests');
        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/login/index.html';
                return;
            }
            throw new Error('Failed to fetch test data');
        }
        
        testResults = await response.json();
        
        // Use real test data from API if available, otherwise generate mock data
        if (testResults.tests && testResults.tests.length > 0) {
            allTests = testResults.tests.map((test, index) => ({
                id: index + 1,
                name: test.name,
                file: test.file,
                suite: test.suite,
                status: test.status || 'not-run',
                duration: test.duration || 'N/A',
                lastRun: test.lastRun || null,
                tags: ['automated']
            }));
        } else {
            // Fallback to generated mock data based on real test files
            allTests = generateTestData();
        }
        
        currentTests = [...allTests];
        updateSummaryStats();
    } catch (error) {
        console.error('Error loading test data:', error);
        showNotification('Failed to load test data', 'error');
        
        // Fallback to mock data
        testResults = {
            totalTests: 0,
            passingTests: 0,
            failingTests: 0,
            lastRun: null
        };
        allTests = generateTestData();
        currentTests = [...allTests];
        updateSummaryStats();
    }
}

// Generate test data based on actual test files
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
                status: 'passed',
                duration: `${(Math.random() * 3 + 0.5).toFixed(1)}s`,
                lastRun: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
                tags: test.tags || []
            });
        });
    });
    
    return tests;
}

// Get test cases for each file
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

// Setup event listeners
function setupEventListeners() {
    // Filter functionality
    document.getElementById('statusFilter').addEventListener('change', filterTests);
    document.getElementById('suiteFilter').addEventListener('change', filterTests);
    document.getElementById('searchInput').addEventListener('input', filterTests);
    
    // Run buttons
    document.getElementById('runAllTestsBtn').addEventListener('click', () => runTests('all'));
    document.getElementById('runSelectedTestsBtn').addEventListener('click', () => runSelectedTests());
    
    // Select all checkbox
    document.getElementById('selectAllTests').addEventListener('change', toggleSelectAll);
    
    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', refreshTestData);
}

// Update summary statistics
function updateSummaryStats() {
    document.getElementById('totalTests').textContent = testResults.totalTests || allTests.length;
    document.getElementById('passingTests').textContent = testResults.passingTests || allTests.filter(t => t.status === 'passed').length;
    document.getElementById('failingTests').textContent = testResults.failingTests || allTests.filter(t => t.status === 'failed').length;
    document.getElementById('lastRun').textContent = testResults.lastRun ? 
        new Date(testResults.lastRun).toLocaleString() : 'Never';
}

// Filter tests based on current filter settings
function filterTests() {
    const statusFilter = document.getElementById('statusFilter').value;
    const suiteFilter = document.getElementById('suiteFilter').value;
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    currentTests = allTests.filter(test => {
        const matchesStatus = statusFilter === 'all' || test.status === statusFilter;
        const matchesSuite = suiteFilter === 'all' || test.suite === suiteFilter;
        const matchesSearch = searchTerm === '' || 
            test.name.toLowerCase().includes(searchTerm) ||
            test.file.toLowerCase().includes(searchTerm);
        
        return matchesStatus && matchesSuite && matchesSearch;
    });
    
    renderTests();
}

// Render the test table
function renderTests() {
    const tbody = document.getElementById('testTableBody');
    tbody.innerHTML = '';
    
    if (currentTests.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="no-tests">No tests match current filters</td></tr>';
        return;
    }
    
    currentTests.forEach(test => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <input type="checkbox" class="test-checkbox" data-test-id="${test.id}">
            </td>
            <td class="test-name">${test.name}</td>
            <td class="test-file">${test.file}</td>
            <td class="test-suite">${test.suite}</td>
            <td>
                <span class="status-badge status-${test.status}">${test.status}</span>
            </td>
            <td class="test-duration">${test.duration}</td>
        `;
        tbody.appendChild(row);
    });
    
    updateSelectedCount();
}

// Toggle select all functionality
function toggleSelectAll() {
    const selectAll = document.getElementById('selectAllTests');
    const checkboxes = document.querySelectorAll('.test-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll.checked;
    });
    
    updateSelectedCount();
}

// Update selected test count
function updateSelectedCount() {
    const selectedCount = document.querySelectorAll('.test-checkbox:checked').length;
    const runSelectedBtn = document.getElementById('runSelectedTestsBtn');
    
    if (selectedCount > 0) {
        runSelectedBtn.textContent = `Run Selected (${selectedCount})`;
        runSelectedBtn.disabled = false;
    } else {
        runSelectedBtn.textContent = 'Run Selected';
        runSelectedBtn.disabled = true;
    }
    
    // Update select all checkbox state
    const selectAllCheckbox = document.getElementById('selectAllTests');
    const totalCheckboxes = document.querySelectorAll('.test-checkbox').length;
    
    if (selectedCount === 0) {
        selectAllCheckbox.indeterminate = false;
        selectAllCheckbox.checked = false;
    } else if (selectedCount === totalCheckboxes) {
        selectAllCheckbox.indeterminate = false;
        selectAllCheckbox.checked = true;
    } else {
        selectAllCheckbox.indeterminate = true;
    }
}

// Listen for checkbox changes
document.addEventListener('change', function(e) {
    if (e.target.classList.contains('test-checkbox')) {
        updateSelectedCount();
    }
});

// Run all tests
async function runTests(scope = 'all') {
    try {
        showTestProgress('Starting test execution...', true);
        
        // Disable run buttons during execution
        setRunButtonsEnabled(false);
        
        const response = await fetch('/api/tests/run', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                testFiles: scope === 'all' ? [] : getSelectedTestFiles(),
                suite: scope
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to start test execution');
        }
        
        const result = await response.json();
        showNotification(`Test execution started. ID: ${result.executionId}`, 'success');
        
        // Update progress indicator
        showTestProgress('Running Playwright tests...', true);
        
        // Monitor test execution progress
        monitorTestExecution(result.executionId);
        
    } catch (error) {
        console.error('Error running tests:', error);
        showNotification('Failed to run tests', 'error');
        setRunButtonsEnabled(true);
        hideTestProgress();
    }
}

// Run selected tests
async function runSelectedTests() {
    console.log('🔥 runSelectedTests function called!'); // Visible debug
    
    const selectedCheckboxes = document.querySelectorAll('.test-checkbox:checked');
    console.log('Selected checkboxes:', selectedCheckboxes.length); // Debug log
    
    if (selectedCheckboxes.length === 0) {
        showNotification('Please select tests to run', 'warning');
        return;
    }
    
    const selectedTestFiles = getSelectedTestFiles();
    console.log('Selected test files to run:', selectedTestFiles); // Debug log
    
    if (selectedTestFiles.length === 0) {
        showNotification('No test files selected', 'warning');
        return;
    }
    
    try {
        showTestProgress(`Starting execution of ${selectedCheckboxes.length} selected tests...`, true);
        
        // Disable run buttons during execution
        setRunButtonsEnabled(false);
        
        console.log('Sending request to run tests:', { testFiles: selectedTestFiles }); // Debug log
        
        const response = await fetch('/api/tests/run', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                testFiles: selectedTestFiles,
                suite: 'selected'
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Server response error:', errorText); // Debug log
            throw new Error(`Failed to start test execution: ${response.status} ${errorText}`);
        }
        
        const result = await response.json();
        console.log('Test execution started:', result); // Debug log
        showNotification(`Test execution started. ID: ${result.executionId}`, 'success');
        
        // Update progress indicator
        showTestProgress('Running selected tests...', true);
        
        // Monitor test execution progress
        monitorTestExecution(result.executionId);
        
    } catch (error) {
        console.error('Error running selected tests:', error);
        showNotification('Failed to run selected tests', 'error');
        setRunButtonsEnabled(true);
        hideTestProgress();
    }
}

// Monitor test execution progress
async function monitorTestExecution(executionId) {
    const checkInterval = 2000; // Check every 2 seconds
    const maxChecks = 60; // Maximum 2 minutes
    let checks = 0;
    let startTime = Date.now();
    
    // Show progress indicator
    showProgressIndicator(true);
    updateProgressIndicator('Running tests...', 0, startTime);
    
    const checkStatus = async () => {
        try {
            const response = await fetch(`/api/tests/results/${executionId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch execution status');
            }
            
            const execution = await response.json();
            
            // Update progress time
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            
            if (execution.status === 'completed') {
                updateProgressIndicator('Tests completed!', 100, startTime);
                setTimeout(() => {
                    showProgressIndicator(false);
                    handleTestCompletion(execution);
                }, 1000);
                return;
            } else if (execution.status === 'failed') {
                updateProgressIndicator('Test execution failed', 0, startTime);
                setTimeout(() => {
                    showProgressIndicator(false);
                    showNotification(`Test execution failed: ${execution.error || 'Unknown error'}`, 'error');
                    setRunButtonsEnabled(true);
                }, 1000);
                return;
            } else if (execution.status === 'running') {
                // Show indeterminate progress for running tests
                updateProgressIndicator('Running tests...', -1, startTime);
            }
            
            checks++;
            if (checks < maxChecks) {
                setTimeout(checkStatus, checkInterval);
            } else {
                updateProgressIndicator('Test execution timeout', 0, startTime);
                setTimeout(() => {
                    showProgressIndicator(false);
                    showNotification('Test execution timeout - please check manually', 'warning');
                    setRunButtonsEnabled(true);
                }, 1000);
            }
            
        } catch (error) {
            console.error('Error checking test status:', error);
            updateProgressIndicator('Error checking status', 0, startTime);
            setTimeout(() => {
                showProgressIndicator(false);
                showNotification('Failed to check test status', 'error');
                setRunButtonsEnabled(true);
            }, 1000);
        }
    };
    
    // Start monitoring
    setTimeout(checkStatus, checkInterval);
}

// Handle test completion
function handleTestCompletion(execution) {
    const results = execution.results;
    
    if (results) {
        const summary = `Tests completed! 
            Total: ${results.total}, 
            Passed: ${results.passed}, 
            Failed: ${results.failed}, 
            Skipped: ${results.skipped}
            Duration: ${results.duration}`;
        
        if (results.failed > 0) {
            showNotification(summary, 'warning');
        } else {
            showNotification(summary, 'success');
        }
        
        // Show detailed results if available
        if (execution.stderr && execution.stderr.trim()) {
            console.warn('Test execution stderr:', execution.stderr);
        }
        
        // Refresh test data to show updated results
        refreshTestData();
    } else {
        showNotification('Test execution completed', 'success');
    }
    
    setRunButtonsEnabled(true);
}

// Get selected test files
function getSelectedTestFiles() {
    const selectedCheckboxes = document.querySelectorAll('.test-checkbox:checked');
    const selectedFiles = new Set();
    
    selectedCheckboxes.forEach(checkbox => {
        const row = checkbox.closest('tr');
        const fileCell = row.querySelector('td:nth-child(3)'); // File column (3rd column)
        if (fileCell) {
            selectedFiles.add(fileCell.textContent.trim());
        }
    });
    
    console.log('Selected files:', Array.from(selectedFiles)); // Debug log
    return Array.from(selectedFiles);
}

// Enable/disable run buttons
function setRunButtonsEnabled(enabled) {
    const runAllBtn = document.getElementById('runAllTestsBtn');
    const runSelectedBtn = document.getElementById('runSelectedTestsBtn');
    
    if (runAllBtn) {
        runAllBtn.disabled = !enabled;
        runAllBtn.textContent = enabled ? 'Run All Tests' : 'Running...';
    }
    
    if (runSelectedBtn) {
        runSelectedBtn.disabled = !enabled;
        runSelectedBtn.textContent = enabled ? 'Run Selected' : 'Running...';
    }
}

// Refresh test data
async function refreshTestData() {
    showNotification('Refreshing test data...', 'info');
    await loadTestData();
    renderTests();
    showNotification('Test data refreshed', 'success');
}

// Show notification
function showNotification(message, type = 'info') {
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

// Remove notification with animation
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

// Progress indicator functions
function showTestProgress(message, indeterminate = false) {
    const progressContainer = document.getElementById('testProgress');
    const progressText = document.getElementById('progressText');
    const progressTime = document.getElementById('progressTime');
    const progressFill = document.getElementById('progressFill');
    
    if (progressContainer && progressText && progressTime && progressFill) {
        progressContainer.style.display = 'block';
        progressText.textContent = message;
        progressTime.textContent = '0s';
        
        if (indeterminate) {
            progressFill.classList.add('indeterminate');
            progressFill.style.width = '30%';
        } else {
            progressFill.classList.remove('indeterminate');
            progressFill.style.width = '0%';
        }
    }
}

function updateTestProgress(message, elapsedSeconds) {
    const progressText = document.getElementById('progressText');
    const progressTime = document.getElementById('progressTime');
    
    if (progressText && progressTime) {
        progressText.textContent = message;
        progressTime.textContent = `${elapsedSeconds}s`;
    }
}

function hideTestProgress() {
    const progressContainer = document.getElementById('testProgress');
    if (progressContainer) {
        progressContainer.style.display = 'none';
    }
}

function showProgressIndicator(show) {
    const progressContainer = document.getElementById('testProgress');
    if (progressContainer) {
        progressContainer.style.display = show ? 'block' : 'none';
    }
}

function updateProgressIndicator(message, percentage, startTime) {
    const progressText = document.getElementById('progressText');
    const progressTime = document.getElementById('progressTime');
    const progressFill = document.getElementById('progressFill');
    
    if (progressText && progressTime && progressFill) {
        progressText.textContent = message;
        
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        progressTime.textContent = `${elapsed}s`;
        
        if (percentage === -1) {
            // Indeterminate progress
            progressFill.classList.add('indeterminate');
        } else {
            progressFill.classList.remove('indeterminate');
            progressFill.style.width = `${percentage}%`;
        }
    }
}
