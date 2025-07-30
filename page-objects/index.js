// Page Objects exports
// This file provides a centralized way to import all page objects

const { BasePage } = require('./BasePage');
const { LoginPage } = require('./LoginPage');
const { UserManagementPage } = require('./UserManagementPage');

module.exports = {
  BasePage,
  LoginPage,
  UserManagementPage
};
