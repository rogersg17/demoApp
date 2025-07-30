const { expect } = require('@playwright/test');

/**
 * BasePage - Base page object with common functionality
 * Provides shared methods that can be used across all page objects
 */
class BasePage {
  constructor(page) {
    this.page = page;
  }

  /**
   * Navigate to a specific URL
   * @param {string} url - URL to navigate to
   */
  async goto(url) {
    await this.page.goto(url);
  }

  /**
   * Wait for page to load completely
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Clear browser storage
   */
  async clearStorage() {
    await this.page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
  }

  /**
   * Reload the current page
   */
  async reload() {
    await this.page.reload();
    await this.waitForPageLoad();
  }

  /**
   * Get the current page URL
   * @returns {Promise<string>} Current URL
   */
  async getCurrentUrl() {
    return await this.page.url();
  }

  /**
   * Get the page title
   * @returns {Promise<string>} Page title
   */
  async getPageTitle() {
    return await this.page.title();
  }

  /**
   * Wait for a specific URL pattern
   * @param {RegExp} urlPattern - URL pattern to wait for
   */
  async waitForUrl(urlPattern) {
    await expect(this.page).toHaveURL(urlPattern);
  }

  /**
   * Take a screenshot
   * @param {string} [name] - Screenshot name
   * @returns {Promise<Buffer>} Screenshot buffer
   */
  async takeScreenshot(name) {
    const options = name ? { path: `screenshots/${name}.png` } : {};
    return await this.page.screenshot(options);
  }

  /**
   * Wait for a specific timeout
   * @param {number} timeout - Timeout in milliseconds
   */
  async wait(timeout) {
    await this.page.waitForTimeout(timeout);
  }

  /**
   * Press a keyboard key
   * @param {string} key - Key to press
   */
  async pressKey(key) {
    await this.page.keyboard.press(key);
  }

  /**
   * Check if an element is visible
   * @param {string} selector - Element selector
   * @returns {Promise<boolean>} Whether element is visible
   */
  async isElementVisible(selector) {
    try {
      await expect(this.page.locator(selector)).toBeVisible({ timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Wait for an element to be visible
   * @param {string} selector - Element selector
   * @param {number} [timeout=30000] - Timeout in milliseconds
   */
  async waitForElement(selector, timeout = 30000) {
    await expect(this.page.locator(selector)).toBeVisible({ timeout });
  }

  /**
   * Get text content of an element
   * @param {string} selector - Element selector
   * @returns {Promise<string>} Text content
   */
  async getElementText(selector) {
    return await this.page.locator(selector).textContent();
  }

  /**
   * Get attribute value of an element
   * @param {string} selector - Element selector
   * @param {string} attribute - Attribute name
   * @returns {Promise<string>} Attribute value
   */
  async getElementAttribute(selector, attribute) {
    return await this.page.locator(selector).getAttribute(attribute);
  }

  /**
   * Scroll to an element
   * @param {string} selector - Element selector
   */
  async scrollToElement(selector) {
    await this.page.locator(selector).scrollIntoViewIfNeeded();
  }

  /**
   * Hover over an element
   * @param {string} selector - Element selector
   */
  async hoverElement(selector) {
    await this.page.locator(selector).hover();
  }

  /**
   * Double click an element
   * @param {string} selector - Element selector
   */
  async doubleClickElement(selector) {
    await this.page.locator(selector).dblclick();
  }

  /**
   * Right click an element
   * @param {string} selector - Element selector
   */
  async rightClickElement(selector) {
    await this.page.locator(selector).click({ button: 'right' });
  }

  /**
   * Upload a file
   * @param {string} selector - File input selector
   * @param {string} filePath - Path to file to upload
   */
  async uploadFile(selector, filePath) {
    await this.page.locator(selector).setInputFiles(filePath);
  }

  /**
   * Handle alert/confirm dialogs
   * @param {boolean} accept - Whether to accept or dismiss the dialog
   * @param {string} [promptText] - Text to enter in prompt dialog
   */
  async handleDialog(accept = true, promptText = '') {
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

module.exports = { BasePage };
