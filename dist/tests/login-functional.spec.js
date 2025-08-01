"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const { LoginPage } = require('../page-objects/LoginPage.js');
test_1.test.describe('Login Functional Tests', () => {
    let loginPage;
    test_1.test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        await loginPage.goto();
    });
    test_1.test.describe('Successful Login Scenarios', () => {
        (0, test_1.test)('TC001: Login with admin credentials', async () => {
            await loginPage.login('admin', 'admin123');
            await (0, test_1.expect)(loginPage.page).toHaveURL(/.*mainPage\/index\.html/);
        });
        (0, test_1.test)('TC002: Login with regular user credentials', async () => {
            await loginPage.login('jdoe', 'password123');
            await (0, test_1.expect)(loginPage.page).toHaveURL(/.*mainPage\/index\.html/);
        });
        (0, test_1.test)('TC003: Login with moderator user credentials', async () => {
            await loginPage.login('jsmith', 'password123');
            await (0, test_1.expect)(loginPage.page).toHaveURL(/.*mainPage\/index\.html/);
        });
        (0, test_1.test)('TC004: Login with HR user credentials', async () => {
            await loginPage.login('swilson', 'password123');
            await (0, test_1.expect)(loginPage.page).toHaveURL(/.*mainPage\/index\.html/);
        });
        (0, test_1.test)('TC005: Login with case-sensitive username', async () => {
            await loginPage.login('admin', 'admin123'); // admin is lowercase in database
            await (0, test_1.expect)(loginPage.page).toHaveURL(/.*mainPage\/index\.html/);
        });
    });
    test_1.test.describe('Failed Login Scenarios', () => {
        (0, test_1.test)('TC006: Login with invalid username', async () => {
            await loginPage.login('invaliduser', 'password123');
            await loginPage.verifyErrorMessage('Invalid credentials');
            await (0, test_1.expect)(loginPage.page).not.toHaveURL(/.*mainPage\/index\.html/);
        });
        (0, test_1.test)('TC007: Login with valid username but wrong password', async () => {
            await loginPage.login('admin', 'wrongpassword');
            await loginPage.verifyErrorMessage('Invalid credentials');
            await (0, test_1.expect)(loginPage.page).not.toHaveURL(/.*mainPage\/index\.html/);
        });
        (0, test_1.test)('TC008: Login with empty username', async () => {
            await loginPage.login('', 'admin123');
            await loginPage.verifyErrorMessage('Please enter both username and password.');
            await (0, test_1.expect)(loginPage.page).not.toHaveURL(/.*mainPage\/index\.html/);
        });
        (0, test_1.test)('TC009: Login with empty password', async () => {
            await loginPage.login('admin', '');
            await loginPage.verifyErrorMessage('Please enter both username and password.');
            await (0, test_1.expect)(loginPage.page).not.toHaveURL(/.*mainPage\/index\.html/);
        });
        (0, test_1.test)('TC010: Login with both fields empty', async () => {
            await loginPage.login('', '');
            await loginPage.verifyErrorMessage('Please enter both username and password.');
            await (0, test_1.expect)(loginPage.page).not.toHaveURL(/.*mainPage\/index\.html/);
        });
        (0, test_1.test)('TC011: Login with case-sensitive password failure', async () => {
            await loginPage.login('admin', 'ADMIN123'); // Wrong case
            await loginPage.verifyErrorMessage('Invalid credentials');
            await (0, test_1.expect)(loginPage.page).not.toHaveURL(/.*mainPage\/index\.html/);
        });
        (0, test_1.test)('TC012: Login with whitespace-only credentials', async () => {
            await loginPage.login('   ', '   ');
            await loginPage.verifyErrorMessage('Please enter both username and password.');
            await (0, test_1.expect)(loginPage.page).not.toHaveURL(/.*mainPage\/index\.html/);
        });
    });
});
