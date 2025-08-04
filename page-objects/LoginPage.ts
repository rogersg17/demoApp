import { expect, Page, Locator } from '@playwright/test';

/**
 * LoginPage - Page Object Model for the login page
 * Follows Playwright best practices for page object implementation
 */
export class LoginPage {
  readonly page: Page;
  
  // Locators - using descriptive names and efficient selectors for React app
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly loginForm: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;
  readonly pageHeading: Locator;
  
  // Field error locators for React app
  readonly usernameError: Locator;
  readonly passwordError: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Locators for React app - updated to match actual rendered elements
    this.usernameInput = page.getByRole('textbox', { name: 'Username' });
    this.passwordInput = page.getByRole('textbox', { name: 'Password' });
    this.loginButton = page.getByRole('button', { name: 'Sign In' });
    this.loginForm = page.locator('form');
    this.errorMessage = page.locator('.error-message');
    this.successMessage = page.locator('.success-message');
    this.pageHeading = page.getByRole('heading', { name: 'Welcome Back' });
    
    // Field error locators for React app
    this.usernameError = page.locator('.input-group:has(input[name="username"]) .field-error');
    this.passwordError = page.locator('.input-group:has(input[name="password"]) .field-error');
  }

  /**
   * Navigate to the login page and wait for it to load
   * @param url - Optional URL override
   */
  async goto(url: string = '/login'): Promise<void> {
    // Navigate to login page first
    await this.page.goto(url);
    
    // Wait for initial load
    await this.page.waitForLoadState('networkidle');
    
    // Clear authentication state
    await this.page.evaluate(() => {
      try {
        sessionStorage.clear();
        localStorage.clear();
      } catch (e) {
        // Ignore storage errors
      }
    });
    
    // Reload the page to ensure clean state
    await this.page.reload();
    await this.page.waitForLoadState('networkidle');
    
    await this.waitForPageLoad();
  }

  /**
   * Wait for the login page to fully load
   */
  async waitForPageLoad(): Promise<void> {
    await expect(this.pageHeading).toBeVisible();
    await expect(this.usernameInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.loginButton).toBeVisible();
  }

  /**
   * Complete login flow with username and password
   * @param username - Username to enter
   * @param password - Password to enter
   */
  async login(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
    
    // Add a small delay after login attempt to avoid rate limiting
    await this.page.waitForTimeout(500);
  }

  /**
   * Login and wait for successful redirect to dashboard
   * @param username - Username to enter  
   * @param password - Password to enter
   */
  async loginAndWaitForRedirect(username: string, password: string): Promise<void> {
    await this.login(username, password);
    // Wait for redirect to dashboard (updated for React app)
    await expect(this.page).toHaveURL(/.*dashboard/);
  }

  /**
   * Verify the login page is displayed correctly
   */
  async verifyPageElements(): Promise<void> {
    await expect(this.pageHeading).toContainText('Welcome Back');
    await expect(this.usernameInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.loginButton).toBeVisible();
    await expect(this.loginButton).toContainText('Sign In');
  }

  /**
   * Verify error message is displayed
   * @param expectedMessage - Expected error message text
   */
  async verifyErrorMessage(expectedMessage: string = 'Invalid credentials'): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
    if (expectedMessage) {
      await expect(this.errorMessage).toContainText(expectedMessage);
    }
  }

  /**
   * Verify success message is displayed
   * @param expectedMessage - Expected success message text
   */
  async verifySuccessMessage(expectedMessage: string = 'Login successful'): Promise<void> {
    await expect(this.successMessage).toBeVisible();
    if (expectedMessage) {
      await expect(this.successMessage).toContainText(expectedMessage);
    }
  }

  /**
   * Verify field validation errors
   * @param options - Validation options
   */
  async verifyFieldValidation(options: { 
    usernameRequired?: boolean; 
    passwordRequired?: boolean; 
  } = {}): Promise<void> {
    const { usernameRequired = false, passwordRequired = false } = options;
    
    if (usernameRequired) {
      await expect(this.usernameInput).toHaveAttribute('aria-invalid', 'true');
    }
    if (passwordRequired) {
      await expect(this.passwordInput).toHaveAttribute('aria-invalid', 'true');
    }
  }

  /**
   * Check if login button shows loading state
   * @returns Whether the login button is in loading state
   */
  async isLoginButtonLoading(): Promise<boolean> {
    const loadingSpan = this.page.locator('#login-loading');
    return await loadingSpan.isVisible();
  }
}
