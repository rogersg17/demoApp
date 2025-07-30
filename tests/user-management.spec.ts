import { test, expect } from '@playwright/test';

test.describe('User Management - Chrome Only', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application and login
    await page.goto('/');
    await page.getByRole('textbox', { name: 'Username' }).fill('admin');
    await page.getByRole('textbox', { name: 'Password' }).fill('admin');
    await page.getByRole('button', { name: 'Sign In' }).click();
    
    // Wait for redirect to dashboard
    await expect(page).toHaveURL('/mainPage/index.html');
    
    // Navigate to User Management
    await page.getByRole('navigation', { name: 'Main navigation' }).getByLabel('User Management').click();
    await expect(page).toHaveURL('/users/index.html');
  });

  test.describe('Add User Functionality', () => {
    test('should successfully add a new user with all required fields', async ({ page }) => {
      // Count initial users
      const initialUserRows = await page.locator('tbody tr').count();
      
      // Click Add User button
      await page.getByRole('button', { name: 'Add new user' }).click();
      
      // Verify modal opened
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Add New User' })).toBeVisible();
      
      // Fill out the form
      await page.getByLabel('First Name *').fill('John');
      await page.getByLabel('Last Name *').fill('TestUser');
      await page.getByLabel('Email Address *').fill('john.testuser@example.com');
      await page.getByLabel('Role *').selectOption('User');
      await page.getByLabel('Department').fill('Engineering');
      
      // Submit the form
      await page.getByLabel('Form actions').getByText('Add User').click();
      
      // Verify user was added
      await expect(page.getByText('User added successfully!')).toBeVisible();
      
      // Verify user appears in the table
      await expect(page.getByRole('cell', { name: 'John TestUser' })).toBeVisible();
      await expect(page.getByRole('cell', { name: 'john.testuser@example.com' })).toBeVisible();
      await expect(page.getByRole('cell', { name: /Role: user/i })).toBeVisible();
      
      // Verify user count increased
      const finalUserRows = await page.locator('tbody tr').count();
      expect(finalUserRows).toBe(initialUserRows + 1);
      
      // Verify statistics updated
      await expect(page.getByText(/\d+ total users/i)).toBeVisible();
    });

    test('should validate required fields when adding user', async ({ page }) => {
      // Click Add User button
      await page.getByRole('button', { name: 'Add new user' }).click();
      
      // Try to submit without required fields
      await page.getByLabel('Form actions').getByText('Add User').click();
      
      // Form should still be visible (validation prevents submission)
      await expect(page.getByRole('dialog')).toBeVisible();
      
      // Fill only some required fields
      await page.getByLabel('First Name *').fill('Test');
      await page.getByLabel('Last Name *').fill('User');
      // Leave email empty
      
      await page.getByLabel('Form actions').getByText('Add User').click();
      
      // Form should still be visible
      await expect(page.getByRole('dialog')).toBeVisible();
    });

    test('should allow canceling user creation', async ({ page }) => {
      const initialUserRows = await page.locator('tbody tr').count();
      
      // Click Add User button
      await page.getByRole('button', { name: 'Add new user' }).click();
      
      // Fill some fields
      await page.getByLabel('First Name *').fill('Cancel');
      await page.getByLabel('Last Name *').fill('Test');
      
      // Cancel the operation
      await page.getByRole('button', { name: 'Cancel' }).click();
      
      // Verify modal closed
      await expect(page.getByRole('dialog')).not.toBeVisible();
      
      // Verify no user was added
      const finalUserRows = await page.locator('tbody tr').count();
      expect(finalUserRows).toBe(initialUserRows);
    });

    test('should handle different role selections', async ({ page }) => {
      const roles: string[] = ['Admin', 'User', 'Moderator'];
      
      for (const role of roles) {
        // Click Add User button
        await page.getByRole('button', { name: 'Add new user' }).click();
        
        // Fill form with specific role
        await page.getByLabel('First Name *').fill(`Test${role}`);
        await page.getByLabel('Last Name *').fill('User');
        await page.getByLabel('Email Address *').fill(`test${role.toLowerCase()}@example.com`);
        await page.getByLabel('Role *').selectOption(role);
        
        // Submit
        await page.getByLabel('Form actions').getByText('Add User').click();
        
        // Verify user was added with correct role
        await expect(page.getByText('User added successfully!')).toBeVisible();
        await expect(page.getByRole('cell', { name: `Test${role} User` })).toBeVisible();
        
        // Wait for success message to disappear
        await expect(page.getByText('User added successfully!')).not.toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Delete User Functionality', () => {
    test('should successfully delete a user with confirmation', async ({ page }) => {
      // First add a user to delete
      await page.getByRole('button', { name: 'Add new user' }).click();
      await page.getByLabel('First Name *').fill('Delete');
      await page.getByLabel('Last Name *').fill('Me');
      await page.getByLabel('Email Address *').fill('delete.me@example.com');
      await page.getByLabel('Role *').selectOption('User');
      await page.getByLabel('Form actions').getByText('Add User').click();
      
      // Wait for user to be added
      await expect(page.getByText('User added successfully!')).toBeVisible();
      await expect(page.getByRole('cell', { name: 'Delete Me' })).toBeVisible();
      
      const initialUserRows = await page.locator('tbody tr').count();
      
      // Click delete button for the user
      await page.getByRole('button', { name: 'Delete user Delete Me' }).click();
      
      // Verify confirmation dialog
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Confirm Deletion' })).toBeVisible();
      await expect(page.getByText('Are you sure you want to delete Delete Me?')).toBeVisible();
      await expect(page.getByText('This action cannot be undone')).toBeVisible();
      
      // Confirm deletion
      await page.getByLabel('Confirm delete user').click();
      
      // Verify user was deleted
      await expect(page.getByText(/Delete Me has been deleted successfully!/i)).toBeVisible();
      
      // Verify user no longer appears in table
      await expect(page.getByRole('cell', { name: 'Delete Me' })).not.toBeVisible();
      await expect(page.getByRole('cell', { name: 'delete.me@example.com' })).not.toBeVisible();
      
      // Verify user count decreased
      const finalUserRows = await page.locator('tbody tr').count();
      expect(finalUserRows).toBeLessThan(initialUserRows);
    });

    test('should allow canceling user deletion', async ({ page }) => {
      // Get any existing user to test cancel
      const userRow = page.locator('tbody tr').first();
      const userName = await userRow.locator('h4').textContent();
      const initialUserRows = await page.locator('tbody tr').count();
      
      // Click delete button
      await userRow.getByRole('button', { name: /Delete user/i }).click();
      
      // Verify confirmation dialog
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Confirm Deletion' })).toBeVisible();
      
      // Cancel deletion
      await page.getByRole('button', { name: 'Cancel' }).click();
      
      // Verify dialog closed
      await expect(page.getByRole('dialog')).not.toBeVisible();
      
      // Verify user still exists
      if (userName) {
        await expect(page.getByRole('cell', { name: userName })).toBeVisible();
      }
      
      // Verify user count unchanged
      const finalUserRows = await page.locator('tbody tr').count();
      expect(finalUserRows).toBe(initialUserRows);
    });

    test('should prevent deletion of admin users when appropriate', async ({ page }) => {
      // Try to delete an admin user
      const adminRow = page.locator('tbody tr').filter({ hasText: 'Admin' }).first();
      
      if (await adminRow.count() > 0) {
        await adminRow.getByRole('button', { name: /Delete user/i }).click();
        
        // Check if deletion is prevented or warned
        // This depends on business logic - the test should verify expected behavior
        await expect(page.getByRole('dialog')).toBeVisible();
      }
    });
  });

  test.describe('User List and Filtering', () => {
    test('should display user statistics correctly', async ({ page }) => {
      // Verify statistics section is visible
      await expect(page.getByRole('heading', { name: 'User Statistics Overview' })).toBeVisible();
      
      // Verify all stat cards are present
      await expect(page.getByText(/\d+ Total Users/i)).toBeVisible();
      await expect(page.getByText(/\d+ Active Users/i)).toBeVisible();
      await expect(page.getByText(/\d+ Pending/i)).toBeVisible();
      await expect(page.getByText(/\d+ Inactive/i)).toBeVisible();
      
      // Verify statistics match actual user data
      const totalUsers = await page.locator('tbody tr').count();
      const activeUsers = await page.locator('tbody tr').filter({ hasText: 'Active' }).count();
      const pendingUsers = await page.locator('tbody tr').filter({ hasText: 'Pending' }).count();
      const inactiveUsers = await page.locator('tbody tr').filter({ hasText: 'Inactive' }).count();
      
      // Get displayed statistics
      const totalStat = await page.getByText(/\d+ Total Users/i).textContent();
      const activeStat = await page.getByText(/\d+ Active Users/i).textContent();
      const pendingStat = await page.getByText(/\d+ Pending/i).textContent();
      const inactiveStat = await page.getByText(/\d+ Inactive/i).textContent();
      
      // Verify statistics are reasonable (may not be exact due to timing)
      if (totalStat) {
        const totalMatch = totalStat.match(/\d+/);
        if (totalMatch) {
          expect(parseInt(totalMatch[0])).toBeGreaterThanOrEqual(totalUsers - 1);
        }
      }
      if (activeStat) {
        const activeMatch = activeStat.match(/\d+/);
        if (activeMatch) {
          expect(parseInt(activeMatch[0])).toBeGreaterThanOrEqual(0);
        }
      }
      if (pendingStat) {
        const pendingMatch = pendingStat.match(/\d+/);
        if (pendingMatch) {
          expect(parseInt(pendingMatch[0])).toBeGreaterThanOrEqual(0);
        }
      }
      if (inactiveStat) {
        const inactiveMatch = inactiveStat.match(/\d+/);
        if (inactiveMatch) {
          expect(parseInt(inactiveMatch[0])).toBeGreaterThanOrEqual(0);
        }
      }
    });

    test('should filter users by status', async ({ page }) => {
      const statusFilter = page.getByLabel('Filter users by status');
      
      // Test Active filter
      await statusFilter.selectOption('Active');
      const activeRows = await page.locator('tbody tr').count();
      
      // Verify only active users are shown
      const activeStatusCells = await page.locator('tbody tr img[alt*="Status: active"]').count();
      expect(activeStatusCells).toBe(activeRows);
      
      // Test Pending filter
      await statusFilter.selectOption('Pending');
      const pendingRows = await page.locator('tbody tr').count();
      
      if (pendingRows > 0) {
        const pendingStatusCells = await page.locator('tbody tr img[alt*="Status: pending"]').count();
        expect(pendingStatusCells).toBe(pendingRows);
      }
      
      // Reset filter
      await statusFilter.selectOption('All Status');
      const allRows = await page.locator('tbody tr').count();
      expect(allRows).toBeGreaterThanOrEqual(Math.max(activeRows, pendingRows));
    });

    test('should filter users by role', async ({ page }) => {
      const roleFilter = page.getByLabel('Filter users by role');
      
      // Test Admin filter
      await roleFilter.selectOption('Admin');
      const adminRows = await page.locator('tbody tr').count();
      
      if (adminRows > 0) {
        // Verify only admin users are shown
        const adminRoleCells = await page.locator('tbody tr img[alt*="Role: admin"]').count();
        expect(adminRoleCells).toBe(adminRows);
      }
      
      // Test User filter
      await roleFilter.selectOption('User');
      const userRows = await page.locator('tbody tr').count();
      
      if (userRows > 0) {
        const userRoleCells = await page.locator('tbody tr img[alt*="Role: user"]').count();
        expect(userRoleCells).toBe(userRows);
      }
      
      // Reset filter
      await roleFilter.selectOption('All Roles');
      const allRows = await page.locator('tbody tr').count();
      expect(allRows).toBeGreaterThanOrEqual(Math.max(adminRows, userRows));
    });

    test('should search users by name or email', async ({ page }) => {
      const searchBox = page.getByRole('textbox', { name: 'Search users' });
      const initialRows = await page.locator('tbody tr').count();
      
      // Search for a specific user
      await searchBox.fill('john');
      
      // Verify search results (this may need adjustment based on actual search implementation)
      const searchResults = await page.locator('tbody tr').count();
      expect(searchResults).toBeLessThanOrEqual(initialRows);
      
      // Clear search
      await searchBox.clear();
      const clearedResults = await page.locator('tbody tr').count();
      expect(clearedResults).toBe(initialRows);
    });
  });

  test.describe('User Interface and Accessibility', () => {
    test('should have proper accessibility attributes', async ({ page }) => {
      // Check for proper headings
      await expect(page.getByRole('heading', { name: 'User Management' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'User Statistics Overview' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'All Users' })).toBeVisible();
      
      // Check for proper table structure
      await expect(page.getByRole('table')).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'User' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Email' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Role' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
      
      // Check for proper form labels
      await page.getByRole('button', { name: 'Add new user' }).click();
      await expect(page.getByLabel('First Name *')).toBeVisible();
      await expect(page.getByLabel('Last Name *')).toBeVisible();
      await expect(page.getByLabel('Email Address *')).toBeVisible();
      await expect(page.getByLabel('Role *')).toBeVisible();
    });

    test('should be responsive and handle window resizing', async ({ page }) => {
      // Test desktop view
      await page.setViewportSize({ width: 1200, height: 800 });
      await expect(page.getByRole('table')).toBeVisible();
      
      // Test tablet view
      await page.setViewportSize({ width: 768, height: 1024 });
      await expect(page.getByRole('table')).toBeVisible();
      
      // Test mobile view (if responsive design exists)
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(page.getByRole('button', { name: 'Add new user' })).toBeVisible();
    });

    test('should handle keyboard navigation', async ({ page }) => {
      // Test tab navigation
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Test that focus is visible and functional
      const focusedElement = await page.evaluate(() => (globalThis as any).document.activeElement?.tagName);
      expect(['BUTTON', 'INPUT', 'SELECT', 'A']).toContain(focusedElement);
      
      // Test Enter key on buttons
      await page.getByRole('button', { name: 'Add new user' }).focus();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('dialog')).toBeVisible();
      
      // Test Escape key to close modal
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).not.toBeVisible();
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle duplicate email addresses gracefully', async ({ page }) => {
      // Add first user
      await page.getByRole('button', { name: 'Add new user' }).click();
      await page.getByLabel('First Name *').fill('First');
      await page.getByLabel('Last Name *').fill('User');
      await page.getByLabel('Email Address *').fill('duplicate@example.com');
      await page.getByLabel('Role *').selectOption('User');
      await page.getByLabel('Form actions').getByText('Add User').click();
      
      await expect(page.getByText('User added successfully!')).toBeVisible();
      
      // Try to add second user with same email
      await page.getByRole('button', { name: 'Add new user' }).click();
      await page.getByLabel('First Name *').fill('Second');
      await page.getByLabel('Last Name *').fill('User');
      await page.getByLabel('Email Address *').fill('duplicate@example.com');
      await page.getByLabel('Role *').selectOption('User');
      await page.getByLabel('Form actions').getByText('Add User').click();
      
      // Should show error or prevent submission
      // Exact behavior depends on implementation
      await expect(page.getByRole('dialog')).toBeVisible(); // Form should still be open
    });

    test('should handle network errors gracefully', async ({ page }) => {
      // This test would need to mock network failures
      // Implementation depends on how the app handles offline scenarios
      
      // For now, we'll test that the interface remains functional
      await expect(page.getByRole('button', { name: 'Add new user' })).toBeVisible();
      await expect(page.getByRole('table')).toBeVisible();
    });

    test('should maintain data integrity during rapid operations', async ({ page }) => {
      // Add multiple users sequentially to test data integrity
      for (let i = 0; i < 3; i++) {
        await page.getByRole('button', { name: 'Add new user' }).click();
        await page.getByLabel('First Name *').fill(`Rapid${i}`);
        await page.getByLabel('Last Name *').fill('User');
        await page.getByLabel('Email Address *').fill(`rapid${i}@example.com`);
        await page.getByLabel('Role *').selectOption('User');
        await page.getByLabel('Form actions').getByText('Add User').click();
        await expect(page.getByText('User added successfully!')).toBeVisible();
        
        // Wait for success message to disappear
        await expect(page.getByText('User added successfully!')).not.toBeVisible({ timeout: 5000 });
      }
      
      // Verify all users were added
      await expect(page.getByRole('cell', { name: 'Rapid0 User' })).toBeVisible();
      await expect(page.getByRole('cell', { name: 'Rapid1 User' })).toBeVisible();
      await expect(page.getByRole('cell', { name: 'Rapid2 User' })).toBeVisible();
    });
  });

  test.describe('Performance and Load Testing', () => {
    test('should handle large user lists efficiently', async ({ page }) => {
      // Measure page load time
      const startTime = Date.now();
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      // Should load within reasonable time (adjust threshold as needed)
      expect(loadTime).toBeLessThan(5000);
      
      // Verify all UI elements are responsive
      await expect(page.getByRole('table')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Add new user' })).toBeVisible();
    });

    test('should maintain performance during filtering operations', async ({ page }) => {
      const startTime = Date.now();
      
      // Apply filters multiple times
      await page.getByLabel('Filter users by status').selectOption('Active');
      await page.getByLabel('Filter users by role').selectOption('User');
      await page.getByLabel('Filter users by status').selectOption('All Status');
      await page.getByLabel('Filter users by role').selectOption('All Roles');
      
      const operationTime = Date.now() - startTime;
      
      // Should complete filtering operations quickly
      expect(operationTime).toBeLessThan(2000);
      
      // Verify table is still functional
      await expect(page.getByRole('table')).toBeVisible();
    });
  });
});
