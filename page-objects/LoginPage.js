const { expect } = require('@playwright/test');

/**
 * LoginPage - Page Object Model for the login page
 * Follows Playwright best practices for page object implementation
 */
class LoginPage {
  constructor(page) {
    this.page = page;
    
    // Locators - using descriptive names and efficient selectors for React app
    this.usernameInput = page.locator('#username');
    this.passwordInput = page.locator('#password');
    this.loginButton = page.locator('button[type="submit"]');
    this.loginForm = page.locator('.login-form');
    this.errorMessage = page.locator('.error-message');
    this.successMessage = page.locator('.success-message');
    this.pageHeading = page.locator('.login-heading');
    
    // Field error locators for React app
    this.usernameError = page.locator('.input-group:has(#username) .field-error');
    this.passwordError = page.locator('.input-group:has(#password) .field-error');
  }

  /**
   * Navigate to the login page and wait for it to load
   * @param {string} [url] - Optional URL override
   */
  async goto(url = '/login') {
    // Clear authentication state first
    await this.page.goto(url);
    
    // Clear sessionStorage to ensure clean authentication state
    await this.page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
    
    // Navigate again after clearing storage to trigger auth check
    await this.page.goto(url);
    
    // Wait for React app to process the auth state change
    await this.page.waitForTimeout(2000);
    
    await this.waitForPageLoad();
  }

  /**
   * Wait for the login page to fully load
   */
  async waitForPageLoad() {
    await expect(this.pageHeading).toBeVisible();
    await expect(this.loginForm).toBeVisible();
    await expect(this.usernameInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.loginButton).toBeVisible();
  }

  /**
   * Complete login flow with username and password
   * @param {string} username - Username to enter
   * @param {string} password - Password to enter
   */
  async login(username, password) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
    
    // Add a small delay after login attempt to avoid rate limiting
    await this.page.waitForTimeout(500);
  }

  /**
   * Login and wait for successful redirect to main page
   * @param {string} username - Username to enter  
   * @param {string} password - Password to enter
   */
  async loginAndWaitForRedirect(username, password) {
    await this.login(username, password);
    // Wait for redirect to main page
    await expect(this.page).toHaveURL(/.*mainPage\/index\.html/);
  }

  /**
   * Verify the login page is displayed correctly
   */
  async verifyPageElements() {
    await expect(this.pageHeading).toContainText('Welcome Back');
    await expect(this.usernameInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.loginButton).toBeVisible();
    await expect(this.loginButton).toContainText('Sign In');
  }

  /**
   * Verify error message is displayed
   * @param {string} [expectedMessage] - Expected error message text
   */
  async verifyErrorMessage(expectedMessage = 'Invalid credentials') {
    await expect(this.errorMessage).toBeVisible();
    if (expectedMessage) {
      await expect(this.errorMessage).toContainText(expectedMessage);
    }
  }

  /**
   * Verify success message is displayed
   * @param {string} [expectedMessage] - Expected success message text
   */
  async verifySuccessMessage(expectedMessage = 'Login successful') {
    await expect(this.successMessage).toBeVisible();
    if (expectedMessage) {
      await expect(this.successMessage).toContainText(expectedMessage);
    }
  }

  /**
   * Verify field validation errors
   * @param {Object} options - Validation options
   * @param {boolean} options.usernameRequired - Whether username field should show required error
   * @param {boolean} options.passwordRequired - Whether password field should show required error
   */
  async verifyFieldValidation({ usernameRequired = false, passwordRequired = false } = {}) {
    if (usernameRequired) {
      await expect(this.usernameInput).toHaveAttribute('aria-invalid', 'true');
    }
    if (passwordRequired) {
      await expect(this.passwordInput).toHaveAttribute('aria-invalid', 'true');
    }
  }

  /**
   * Check if login button shows loading state
   * @returns {Promise<boolean>} Whether the login button is in loading state
   */
  async isLoginButtonLoading() {
    const loadingSpan = this.page.locator('#login-loading');
    return await loadingSpan.isVisible();
  }
}

module.exports = { LoginPage };
