import { expect, Page, Locator } from '@playwright/test';

/**
 * BasePage - Base page object with common functionality
 * Provides shared methods that can be used across all page objects
 */
export class BasePage {
  protected page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to a specific URL
   * @param url - URL to navigate to
   */
  async goto(url: string): Promise<void> {
    await this.page.goto(url);
  }

  /**
   * Wait for page to load completely
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Clear browser storage
   */
  async clearStorage(): Promise<void> {
    await this.page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
  }

  /**
   * Reload the current page
   */
  async reload(): Promise<void> {
    await this.page.reload();
    await this.waitForPageLoad();
  }

  /**
   * Get the current page URL
   * @returns Current URL
   */
  async getCurrentUrl(): Promise<string> {
    return await this.page.url();
  }

  /**
   * Get the page title
   * @returns Page title
   */
  async getPageTitle(): Promise<string> {
    return await this.page.title();
  }

  /**
   * Wait for a specific URL pattern
   * @param urlPattern - URL pattern to wait for
   */
  async waitForUrl(urlPattern: RegExp): Promise<void> {
    await expect(this.page).toHaveURL(urlPattern);
  }

  /**
   * Take a screenshot
   * @param name - Screenshot name
   * @returns Screenshot buffer
   */
  async takeScreenshot(name?: string): Promise<Buffer> {
    const options = name ? { path: `screenshots/${name}.png` } : {};
    return await this.page.screenshot(options);
  }

  /**
   * Wait for a specific timeout
   * @param timeout - Timeout in milliseconds
   */
  async wait(timeout: number): Promise<void> {
    await this.page.waitForTimeout(timeout);
  }

  /**
   * Press a keyboard key
   * @param key - Key to press
   */
  async pressKey(key: string): Promise<void> {
    await this.page.keyboard.press(key);
  }

  /**
   * Check if an element is visible
   * @param selector - Element selector
   * @returns Whether element is visible
   */
  async isElementVisible(selector: string): Promise<boolean> {
    try {
      await expect(this.page.locator(selector)).toBeVisible({ timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Wait for an element to be visible
   * @param selector - Element selector
   * @param timeout - Timeout in milliseconds
   */
  async waitForElement(selector: string, timeout: number = 30000): Promise<void> {
    await expect(this.page.locator(selector)).toBeVisible({ timeout });
  }

  /**
   * Get text content of an element
   * @param selector - Element selector
   * @returns Text content
   */
  async getElementText(selector: string): Promise<string | null> {
    return await this.page.locator(selector).textContent();
  }

  /**
   * Get attribute value of an element
   * @param selector - Element selector
   * @param attribute - Attribute name
   * @returns Attribute value
   */
  async getElementAttribute(selector: string, attribute: string): Promise<string | null> {
    return await this.page.locator(selector).getAttribute(attribute);
  }

  /**
   * Scroll to an element
   * @param selector - Element selector
   */
  async scrollToElement(selector: string): Promise<void> {
    await this.page.locator(selector).scrollIntoViewIfNeeded();
  }

  /**
   * Hover over an element
   * @param selector - Element selector
   */
  async hoverElement(selector: string): Promise<void> {
    await this.page.locator(selector).hover();
  }

  /**
   * Double click an element
   * @param selector - Element selector
   */
  async doubleClickElement(selector: string): Promise<void> {
    await this.page.locator(selector).dblclick();
  }

  /**
   * Right click an element
   * @param selector - Element selector
   */
  async rightClickElement(selector: string): Promise<void> {
    await this.page.locator(selector).click({ button: 'right' });
  }

  /**
   * Upload a file
   * @param selector - File input selector
   * @param filePath - Path to file to upload
   */
  async uploadFile(selector: string, filePath: string): Promise<void> {
    await this.page.locator(selector).setInputFiles(filePath);
  }

  /**
   * Handle alert/confirm dialogs
   * @param accept - Whether to accept or dismiss the dialog
   * @param promptText - Text to enter in prompt dialog
   */
  async handleDialog(accept: boolean = true, promptText: string = ''): Promise<void> {
    this.page.on('dialog', async dialog => {
      if (dialog.type() === 'prompt' && promptText) {
        await dialog.accept(promptText);
      } else if (accept) {
        await dialog.accept();
      } else {
        await dialog.dismiss();
      }
    });
  }
}
