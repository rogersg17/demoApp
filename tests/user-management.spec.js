const { test, expect } = require('@playwright/test');
const { LoginPage, UserManagementPage } = require('../page-objects');

test.describe.configure({ mode: 'serial' });

test.describe('User Management - Add and Delete Users', () => {
  let loginPage;
  let userManagementPage;

  test.beforeEach(async ({ page }) => {
    // Initialize page objects
    loginPage = new LoginPage(page);
    userManagementPage = new UserManagementPage(page);
    
    // Clear storage and navigate to login
    await loginPage.goto();
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
  });

  /**
   * Helper function to login and navigate to user management
   */
  const loginAndNavigateToUsers = async () => {
    await loginPage.loginAndWaitForRedirect('testuser', 'password123');
    await userManagementPage.navigateToUserManagement();
    await userManagementPage.resetToDefaultState();
  };

  test('should display user management page with default users', async ({ page }) => {
    await loginAndNavigateToUsers();
    
    // Verify page elements using page object methods
    await userManagementPage.verifyPageElements();
    await userManagementPage.verifyDefaultUsers();
  });

  test('should open and close add user modal', async ({ page }) => {
    await loginAndNavigateToUsers();
    
    // Test opening modal
    await userManagementPage.addUserButton.click();
    await expect(userManagementPage.addUserModal).toBeVisible();
    await userManagementPage.verifyAddUserFormFields();
    
    // Test closing modal with close button
    await userManagementPage.closeModalButton.click();
    await expect(userManagementPage.addUserModal).not.toBeVisible();
    
    // Test cancel button
    await userManagementPage.addUserButton.click();
    await userManagementPage.cancelButton.click();
    await expect(userManagementPage.addUserModal).not.toBeVisible();
  });

  test('should add a new user successfully', async ({ page }) => {
    await loginAndNavigateToUsers();
    
    // Verify initial state
    const initialUserCount = await userManagementPage.userRows.count();
    expect(initialUserCount).toBe(8);
    
    // Add new user using page object
    const userData = {
      firstName: 'Test',
      lastName: 'User', 
      email: 'test.user@example.com',
      role: 'user',
      department: 'QA Testing',
      status: 'active'
    };
    
    await userManagementPage.addUser(userData);
    
    // Verify user was added
    const newUserCount = await userManagementPage.userRows.count();
    expect(newUserCount).toBe(9);
    
    // Verify user data in table
    await userManagementPage.verifyUserInTable(userData);
    
    // Verify success notification
    await userManagementPage.verifySuccessNotification('User added successfully');
    
    // Verify stats update
    await userManagementPage.waitForStatsUpdate(9);
  });

  test('should validate required fields when adding user', async ({ page }) => {
    await loginAndNavigateToUsers();
    
    // Open modal and try to submit empty form
    await userManagementPage.addUserButton.click();
    await expect(userManagementPage.addUserModal).toBeVisible();
    await userManagementPage.submitButton.click();
    
    // Modal should still be visible (validation prevents submission)
    await expect(userManagementPage.addUserModal).toBeVisible();
    
    // Test partial form submission (missing required fields)
    await userManagementPage.fillAddUserForm({
      firstName: 'Test',
      lastName: '', // Missing required field
      email: '',
      role: 'user'
    });
    await userManagementPage.submitButton.click();
    
    // Modal should still be visible
    await expect(userManagementPage.addUserModal).toBeVisible();
    
    // Complete the form and submit successfully
    await userManagementPage.fillAddUserForm({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      role: 'user'
    });
    await userManagementPage.submitButton.click();
    
    // Modal should close
    await expect(userManagementPage.addUserModal).not.toBeVisible();
  });

  test('should prevent duplicate email addresses', async ({ page }) => {
    await loginAndNavigateToUsers();
    
    // Try to add user with existing email
    const duplicateUserData = {
      firstName: 'Duplicate',
      lastName: 'User', 
      email: 'john.doe@example.com', // This email already exists
      role: 'user'
    };
    
    await userManagementPage.addUserButton.click();
    await expect(userManagementPage.addUserModal).toBeVisible();
    await userManagementPage.fillAddUserForm(duplicateUserData);
    await userManagementPage.submitButton.click();
    
    // Should show error notification
    await userManagementPage.verifyErrorNotification('Email address already exists');
    
    // Modal should remain open
    await expect(userManagementPage.addUserModal).toBeVisible();
  });

  test('should open and close delete confirmation modal', async ({ page }) => {
    await loginAndNavigateToUsers();
    
    // Verify initial state
    await userManagementPage.verifyDefaultUsers();
    
    // Get first user name and click delete
    const firstUserName = await userManagementPage.getUserName(0);
    const userRow = userManagementPage.userRows.nth(0);
    await userRow.locator('.action-btn.delete').click();
    
    // Verify delete modal
    await userManagementPage.verifyDeleteModal(firstUserName);
    
    // Test cancel button
    await userManagementPage.cancelDeleteButton.click();
    await expect(userManagementPage.deleteUserModal).not.toBeVisible();
    
    // Test close button (X)
    await userRow.locator('.action-btn.delete').click();
    await userManagementPage.verifyDeleteModal(firstUserName);
    await userManagementPage.closeDeleteModalButton.click();
    await expect(userManagementPage.deleteUserModal).not.toBeVisible();
  });

  test('should delete a user successfully', async ({ page }) => {
    await loginAndNavigateToUsers();
    
    // Verify initial state
    await userManagementPage.verifyDefaultUsers();
    
    // Delete the first user
    const deletedUserName = await userManagementPage.deleteUser(0);
    
    // Verify user count decreased
    const newUserCount = await userManagementPage.userRows.count();
    expect(newUserCount).toBe(7);
    
    // Verify user is no longer in table
    await userManagementPage.verifyUserNotInTable(deletedUserName);
    
    // Verify success notification
    await userManagementPage.verifySuccessNotification('deleted successfully');
    
    // Verify stats update
    await userManagementPage.waitForStatsUpdate(7);
  });
});
