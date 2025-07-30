const { test, expect } = require('@playwright/test');
const path = require('path');

const getFilePath = (relativePath) => {
  return 'file://' + path.resolve(__dirname, '..', relativePath).replace(/\\/g, '/');
};

test.describe('User Management', () => {
  // Helper function to login before each test
  const loginAndNavigateToUsers = async (page) => {
    await page.goto(getFilePath('login/index.html'));
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*mainPage\/index\.html/);
    
    // Navigate to user management
    await page.click('.sidebar-icon[data-page="users"]');
    await expect(page).toHaveURL(/.*users\/index\.html/);
  };

  test.beforeEach(async ({ page }) => {
    // Clear session storage before each test
    await page.goto(getFilePath('login/index.html'));
    await page.evaluate(() => sessionStorage.clear());
  });

  test('should display user management page correctly', async ({ page }) => {
    await loginAndNavigateToUsers(page);
    
    // Verify page title and header
    await expect(page).toHaveTitle(/User Management/);
    await expect(page.locator('h1')).toContainText('User Management');
    
    // Verify stats cards are present
    await expect(page.locator('.stat-card')).toHaveCount(4);
    
    // Verify users table is present
    await expect(page.locator('.users-table')).toBeVisible();
    await expect(page.locator('th').filter({ hasText: 'User' })).toBeVisible();
    await expect(page.locator('th').filter({ hasText: 'Email' })).toBeVisible();
    await expect(page.locator('th').filter({ hasText: 'Role' })).toBeVisible();
    await expect(page.locator('th').filter({ hasText: 'Status' })).toBeVisible();
    await expect(page.locator('th').filter({ hasText: 'Actions' })).toBeVisible();
    
    // Verify some users are displayed (default data)
    const userCount = await page.locator('#usersTableBody tr').count();
    expect(userCount).toBeGreaterThan(0);
  });

  test('should open add user modal', async ({ page }) => {
    await loginAndNavigateToUsers(page);
    
    // Click add user button
    await page.click('#addUserBtn');
    
    // Verify modal is visible
    await expect(page.locator('#addUserModal')).toBeVisible();
    await expect(page.locator('#addUserModal h3')).toContainText('Add New User');
    
    // Verify form fields are present
    await expect(page.locator('#firstName')).toBeVisible();
    await expect(page.locator('#lastName')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#role')).toBeVisible();
    await expect(page.locator('#department')).toBeVisible();
    await expect(page.locator('#status')).toBeVisible();
    
    // Close modal
    await page.click('#closeModal');
    await expect(page.locator('#addUserModal')).not.toBeVisible();
  });

  test('should add a new user successfully', async ({ page }) => {
    await loginAndNavigateToUsers(page);
    
    // Count initial users
    const initialUserCount = await page.locator('#usersTableBody tr').count();
    
    // Open add user modal
    await page.click('#addUserBtn');
    await expect(page.locator('#addUserModal')).toBeVisible();
    
    // Fill out the form
    await page.fill('#firstName', 'Test');
    await page.fill('#lastName', 'User');
    await page.fill('#email', 'test.user@example.com');
    await page.selectOption('#role', 'user');
    await page.fill('#department', 'QA');
    await page.selectOption('#status', 'active');
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Wait for modal to close
    await expect(page.locator('#addUserModal')).not.toBeVisible();
    
    // Verify user was added
    await expect(page.locator('#usersTableBody tr')).toHaveCount(initialUserCount + 1);
    
    // Verify the new user appears in the table
    await expect(page.locator('#usersTableBody')).toContainText('Test User');
    await expect(page.locator('#usersTableBody')).toContainText('test.user@example.com');
    await expect(page.locator('#usersTableBody')).toContainText('QA');
    
    // Verify success notification
    await expect(page.locator('.notification')).toBeVisible();
    await expect(page.locator('.notification')).toContainText('User added successfully');
  });

  test('should validate required fields when adding user', async ({ page }) => {
    await loginAndNavigateToUsers(page);
    
    // Open add user modal
    await page.click('#addUserBtn');
    await expect(page.locator('#addUserModal')).toBeVisible();
    
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Modal should still be visible (form validation failed)
    await expect(page.locator('#addUserModal')).toBeVisible();
    
    // Check HTML5 validation (required fields)
    const firstNameValidity = await page.locator('#firstName').evaluate(el => el.validity.valid);
    const lastNameValidity = await page.locator('#lastName').evaluate(el => el.validity.valid);
    const emailValidity = await page.locator('#email').evaluate(el => el.validity.valid);
    const roleValidity = await page.locator('#role').evaluate(el => el.validity.valid);
    
    expect(firstNameValidity).toBe(false);
    expect(lastNameValidity).toBe(false);
    expect(emailValidity).toBe(false);
    expect(roleValidity).toBe(false);
  });

  test('should open delete confirmation modal', async ({ page }) => {
    await loginAndNavigateToUsers(page);
    
    // Wait for users to load
    const userCount = await page.locator('#usersTableBody tr').count();
    expect(userCount).toBeGreaterThan(0);
    
    // Click delete button on first user
    await page.click('#usersTableBody tr:first-child .action-btn.delete');
    
    // Verify delete modal is visible
    await expect(page.locator('#deleteUserModal')).toBeVisible();
    await expect(page.locator('#deleteUserModal h3')).toContainText('Confirm Deletion');
    
    // Verify user name is displayed in modal
    await expect(page.locator('#deleteUserName')).not.toBeEmpty();
    
    // Verify warning message
    await expect(page.locator('.warning-text')).toContainText('This action cannot be undone');
    
    // Close modal using cancel button
    await page.click('#cancelDeleteBtn');
    await expect(page.locator('#deleteUserModal')).not.toBeVisible();
  });

  test('should delete a user successfully', async ({ page }) => {
    await loginAndNavigateToUsers(page);
    
    // Wait for users to load and count them
    const userCount = await page.locator('#usersTableBody tr').count();
    expect(userCount).toBeGreaterThan(0);
    const initialUserCount = userCount;
    
    // Get the name of the first user to verify deletion
    const firstUserName = await page.locator('#usersTableBody tr:first-child .user-details h4').textContent();
    
    // Click delete button on first user
    await page.click('#usersTableBody tr:first-child .action-btn.delete');
    
    // Verify delete modal is visible and shows correct user
    await expect(page.locator('#deleteUserModal')).toBeVisible();
    await expect(page.locator('#deleteUserName')).toContainText(firstUserName);
    
    // Confirm deletion
    await page.click('#confirmDeleteBtn');
    
    // Wait for loading state
    await expect(page.locator('#confirmDeleteBtn')).toContainText('Deleting...');
    
    // Wait for modal to close
    await expect(page.locator('#deleteUserModal')).not.toBeVisible();
    
    // Verify user count decreased
    await expect(page.locator('#usersTableBody tr')).toHaveCount(initialUserCount - 1);
    
    // Verify the user is no longer in the table
    await expect(page.locator('#usersTableBody')).not.toContainText(firstUserName);
    
    // Verify success notification
    await expect(page.locator('.notification')).toBeVisible();
    await expect(page.locator('.notification')).toContainText('deleted successfully');
  });

  test('should close delete modal when clicking outside', async ({ page }) => {
    await loginAndNavigateToUsers(page);
    
    // Wait for users to load
    const userCount = await page.locator('#usersTableBody tr').count();
    expect(userCount).toBeGreaterThan(0);
    
    // Click delete button on first user
    await page.click('#usersTableBody tr:first-child .action-btn.delete');
    
    // Verify delete modal is visible
    await expect(page.locator('#deleteUserModal')).toBeVisible();
    
    // Click outside the modal (on the backdrop)
    await page.click('#deleteUserModal', { position: { x: 5, y: 5 } });
    
    // Modal should close
    await expect(page.locator('#deleteUserModal')).not.toBeVisible();
  });

  test('should filter users by status', async ({ page }) => {
    await loginAndNavigateToUsers(page);
    
    // Wait for users to load
    const userCount = await page.locator('#usersTableBody tr').count();
    expect(userCount).toBeGreaterThan(0);
    const allUsersCount = userCount;
    
    // Filter by active status
    await page.selectOption('#statusFilter', 'active');
    
    // Wait for filter to apply and check that we have fewer or equal users
    await page.waitForTimeout(500); // Allow time for filtering
    const activeUsersCount = await page.locator('#usersTableBody tr').count();
    
    // Should have active users only (could be same or fewer than total)
    expect(activeUsersCount).toBeLessThanOrEqual(allUsersCount);
    
    // Verify all visible users have active status
    const statusBadges = await page.locator('#usersTableBody .status-badge.active').count();
    expect(statusBadges).toBe(activeUsersCount);
    
    // Reset filter
    await page.selectOption('#statusFilter', 'all');
    await page.waitForTimeout(500);
    await expect(page.locator('#usersTableBody tr')).toHaveCount(allUsersCount);
  });

  test('should search users by name', async ({ page }) => {
    await loginAndNavigateToUsers(page);
    
    // Wait for users to load
    const userCount = await page.locator('#usersTableBody tr').count();
    expect(userCount).toBeGreaterThan(0);
    const allUsersCount = userCount;
    
    // Search for "John" (should find John Doe from default data)
    await page.fill('#searchUsers', 'John');
    await page.waitForTimeout(500); // Allow time for search
    
    const searchResultsCount = await page.locator('#usersTableBody tr').count();
    expect(searchResultsCount).toBeLessThanOrEqual(allUsersCount);
    
    // Verify search results contain "John"
    if (searchResultsCount > 0) {
      await expect(page.locator('#usersTableBody')).toContainText('John');
    }
    
    // Clear search
    await page.fill('#searchUsers', '');
    await page.waitForTimeout(500);
    await expect(page.locator('#usersTableBody tr')).toHaveCount(allUsersCount);
  });

  test('should navigate back to dashboard', async ({ page }) => {
    await loginAndNavigateToUsers(page);
    
    // Click back button
    await page.click('#backBtn');
    
    // Should be back on main page
    await expect(page).toHaveURL(/.*mainPage\/index\.html/);
    await expect(page.locator('.welcome-section h1')).toContainText('Welcome to Your Dashboard');
  });

  test('should maintain user session during user management operations', async ({ page }) => {
    await loginAndNavigateToUsers(page);
    
    // Verify welcome message is still showing correct user
    await expect(page.locator('#welcomeMessage')).toContainText('Welcome, admin!');
    
    // Add a user
    await page.click('#addUserBtn');
    await page.fill('#firstName', 'Session');
    await page.fill('#lastName', 'Test');
    await page.fill('#email', 'session.test@example.com');
    await page.selectOption('#role', 'user');
    await page.click('button[type="submit"]');
    
    // Session should still be maintained
    await expect(page.locator('#welcomeMessage')).toContainText('Welcome, admin!');
    
    // Logout should still work
    await page.click('#logoutBtn');
    await expect(page).toHaveURL(/.*login\/index\.html/);
  });
});
