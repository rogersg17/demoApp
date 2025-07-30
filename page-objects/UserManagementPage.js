const { expect } = require('@playwright/test');

/**
 * UserManagementPage - Page Object Model for the user management page
 * Follows Playwright best practices for page object implementation
 */
class UserManagementPage {
  constructor(page) {
    this.page = page;
    
    // Page elements
    this.pageHeading = page.locator('h1');
    this.welcomeMessage = page.locator('#welcomeMessage');
    this.logoutButton = page.locator('#logoutBtn');
    
    // Navigation
    this.userManagementIcon = page.locator('.sidebar-icon[data-page="users"]');
    this.dashboardIcon = page.locator('.sidebar-icon[data-page="dashboard"]');
    
    // Stats cards
    this.statCards = page.locator('.stat-card');
    this.totalUsersCard = page.locator('#totalUsers');
    this.activeUsersCard = page.locator('#activeUsers');
    this.pendingUsersCard = page.locator('#pendingUsers');
    this.inactiveUsersCard = page.locator('#inactiveUsers');
    
    // Users table
    this.usersTable = page.locator('.users-table');
    this.usersTableBody = page.locator('#usersTableBody');
    this.userRows = page.locator('#usersTableBody tr');
    
    // Table headers
    this.userHeader = page.locator('th').filter({ hasText: 'User' });
    this.emailHeader = page.locator('th').filter({ hasText: 'Email' });
    this.roleHeader = page.locator('th').filter({ hasText: 'Role' });
    this.statusHeader = page.locator('th').filter({ hasText: 'Status' });
    this.actionsHeader = page.locator('th').filter({ hasText: 'Actions' });
    
    // Action buttons
    this.editButtons = page.locator('.action-btn.edit');
    this.deleteButtons = page.locator('.action-btn.delete');
    
    // Add user modal
    this.addUserButton = page.locator('#addUserBtn');
    this.addUserModal = page.locator('#addUserModal');
    this.addUserForm = page.locator('#addUserForm');
    this.closeModalButton = page.locator('#closeModal');
    this.cancelButton = page.locator('#cancelBtn');
    
    // Add user form fields
    this.firstNameInput = page.locator('#firstName');
    this.lastNameInput = page.locator('#lastName');
    this.emailInput = page.locator('#email');
    this.roleSelect = page.locator('#role');
    this.departmentInput = page.locator('#department');
    this.statusSelect = page.locator('#status');
    this.submitButton = page.locator('button[type="submit"]');
    
    // Delete user modal
    this.deleteUserModal = page.locator('#deleteUserModal');
    this.deleteUserName = page.locator('#deleteUserName');
    this.confirmDeleteButton = page.locator('#confirmDeleteBtn');
    this.cancelDeleteButton = page.locator('#cancelDeleteBtn');
    this.closeDeleteModalButton = page.locator('#closeDeleteModal');
    this.deleteWarningText = page.locator('.warning-text');
    
    // Search and filter
    this.searchInput = page.locator('#searchUsers');
    this.statusFilter = page.locator('#statusFilter');
    
    // Notifications
    this.notification = page.locator('.notification');
  }

  /**
   * Navigate to user management page and reset to default state
   */
  async navigateToUserManagement() {
    await this.userManagementIcon.click();
    await expect(this.page).toHaveURL(/.*users\/index\.html/);
    await expect(this.pageHeading).toContainText('User Management');
    await expect(this.usersTable).toBeVisible();
    await expect(this.addUserButton).toBeVisible();
  }

  /**
   * Reset page to default state by reloading
   */
  async resetToDefaultState() {
    await this.page.reload();
    await this.page.waitForLoadState('networkidle');
    await expect(this.pageHeading).toContainText('User Management');
    await expect(this.usersTable).toBeVisible();
  }

  /**
   * Verify page elements are displayed correctly
   */
  async verifyPageElements() {
    await expect(this.page).toHaveTitle(/User Management/);
    await expect(this.pageHeading).toContainText('User Management');
    
    // Verify stats cards
    await expect(this.statCards).toHaveCount(4);
    await expect(this.statCards.first()).toContainText('Total Users');
    await expect(this.statCards.nth(1)).toContainText('Active Users');
    await expect(this.statCards.nth(2)).toContainText('Pending');
    await expect(this.statCards.nth(3)).toContainText('Inactive');
    
    // Verify table structure
    await expect(this.usersTable).toBeVisible();
    await expect(this.userHeader).toBeVisible();
    await expect(this.emailHeader).toBeVisible();
    await expect(this.roleHeader).toBeVisible();
    await expect(this.statusHeader).toBeVisible();
    await expect(this.actionsHeader).toBeVisible();
  }

  /**
   * Verify default users are displayed (should be 8)
   */
  async verifyDefaultUsers() {
    const userCount = await this.userRows.count();
    expect(userCount).toBe(8);
    
    // Verify action buttons
    await expect(this.editButtons).toHaveCount(8);
    await expect(this.deleteButtons).toHaveCount(8);
  }

  /**
   * Fill add user form with provided data
   * @param {Object} userData - User data object
   * @param {string} userData.firstName - First name
   * @param {string} userData.lastName - Last name
   * @param {string} userData.email - Email address
   * @param {string} userData.role - User role
   * @param {string} [userData.department] - Department (optional)
   * @param {string} [userData.status] - Status (defaults to 'active')
   */
  async fillAddUserForm({ firstName, lastName, email, role, department = '', status = 'active' }) {
    await this.firstNameInput.fill(firstName);
    await this.lastNameInput.fill(lastName);
    await this.emailInput.fill(email);
    await this.roleSelect.selectOption(role);
    if (department) {
      await this.departmentInput.fill(department);
    }
    await this.statusSelect.selectOption(status);
  }

  /**
   * Add a new user (complete flow)
   * @param {Object} userData - User data object
   */
  async addUser(userData) {
    await this.addUserButton.click();
    await expect(this.addUserModal).toBeVisible();
    await expect(this.addUserModal.locator('h3')).toContainText('Add New User');
    
    await this.fillAddUserForm(userData);
    await this.submitButton.click();
    await expect(this.addUserModal).not.toBeVisible();
  }

  /**
   * Verify form fields are present and labeled correctly
   */
  async verifyAddUserFormFields() {
    await expect(this.firstNameInput).toBeVisible();
    await expect(this.lastNameInput).toBeVisible();
    await expect(this.emailInput).toBeVisible();
    await expect(this.roleSelect).toBeVisible();
    await expect(this.departmentInput).toBeVisible();
    await expect(this.statusSelect).toBeVisible();
    
    // Verify labels
    await expect(this.page.locator('label[for="firstName"]')).toContainText('First Name *');
    await expect(this.page.locator('label[for="lastName"]')).toContainText('Last Name *');
    await expect(this.page.locator('label[for="email"]')).toContainText('Email Address *');
    await expect(this.page.locator('label[for="role"]')).toContainText('Role *');
  }

  /**
   * Get user name from a specific row
   * @param {number} [userIndex=0] - Index of user row (0-based)
   * @returns {Promise<string>} User name
   */
  async getUserName(userIndex = 0) {
    const userRow = this.userRows.nth(userIndex);
    return await userRow.locator('.user-details h4').textContent();
  }

  /**
   * Verify delete modal is displayed with correct user
   * @param {string} expectedUserName - Expected user name in modal
   */
  async verifyDeleteModal(expectedUserName) {
    await expect(this.deleteUserModal).toBeVisible();
    await expect(this.page.locator('.delete-header h3')).toContainText('Confirm Deletion');
    await expect(this.deleteUserName).toContainText(expectedUserName);
    await expect(this.deleteWarningText).toContainText('This action cannot be undone and will permanently remove the user from the system');
    
    // Verify buttons
    await expect(this.cancelDeleteButton).toBeVisible();
    await expect(this.confirmDeleteButton).toBeVisible();
    await expect(this.confirmDeleteButton).toContainText('Delete User');
  }

  /**
   * Confirm user deletion with loading state verification
   */
  async confirmDeleteUser() {
    await this.confirmDeleteButton.click();
    
    // Verify loading state
    await expect(this.confirmDeleteButton).toContainText('Deleting...');
    await expect(this.confirmDeleteButton).toBeDisabled();
    
    // Wait for modal to close
    await expect(this.deleteUserModal).not.toBeVisible();
  }

  /**
   * Delete a user (complete flow)
   * @param {number} [userIndex=0] - Index of user to delete
   * @returns {Promise<string>} Name of deleted user
   */
  async deleteUser(userIndex = 0) {
    const userName = await this.getUserName(userIndex);
    const userRow = this.userRows.nth(userIndex);
    await userRow.locator('.action-btn.delete').click();
    await this.verifyDeleteModal(userName);
    await this.confirmDeleteUser();
    return userName;
  }

  /**
   * Verify success notification
   * @param {string} expectedMessage - Expected notification message
   */
  async verifySuccessNotification(expectedMessage) {
    await expect(this.notification).toBeVisible();
    await expect(this.notification).toContainText(expectedMessage);
  }

  /**
   * Verify error notification
   * @param {string} expectedMessage - Expected error message
   */
  async verifyErrorNotification(expectedMessage) {
    await expect(this.notification).toBeVisible();
    await expect(this.notification).toContainText(expectedMessage);
  }

  /**
   * Wait for stats to update and verify count
   * @param {number} expectedCount - Expected total user count
   */
  async waitForStatsUpdate(expectedCount) {
    await this.page.waitForTimeout(1000);
    await expect(this.totalUsersCard).toContainText(expectedCount.toString());
  }

  /**
   * Verify user appears in table
   * @param {Object} userData - User data to verify
   */
  async verifyUserInTable(userData) {
    const { firstName, lastName, email, department, role, status } = userData;
    const fullName = `${firstName} ${lastName}`;
    
    await expect(this.usersTableBody).toContainText(fullName);
    await expect(this.usersTableBody).toContainText(email);
    if (department) {
      await expect(this.usersTableBody).toContainText(department);
    }
    await expect(this.usersTableBody).toContainText(role.charAt(0).toUpperCase() + role.slice(1));
    await expect(this.usersTableBody).toContainText(status.charAt(0).toUpperCase() + status.slice(1));
  }

  /**
   * Verify user is not in table
   * @param {string} userName - User name to verify is not present
   */
  async verifyUserNotInTable(userName) {
    await expect(this.usersTableBody).not.toContainText(userName);
  }
}

module.exports = { UserManagementPage };
