# Demo App - Playwright Testing

This project contains a simple web application with login functionality and comprehensive Playwright tests.

## Project Structure

```
demoApp/
├── index.html              # Root file - redirects to login
├── login/
│   ├── index.html         # Login page
│   └── style.css          # Login page styles
├── mainPage/
│   ├── index.html         # Main dashboard page
│   └── style.css          # Main page styles
├── tests/
│   ├── auth.spec.js       # Main application flow tests
│   └── e2e.spec.js        # End-to-end user journey tests
├── playwright.config.js   # Playwright configuration
└── package.json           # Node.js dependencies and scripts
```

## Running the Application

1. Open `index.html` in your web browser
2. You'll be redirected to the login page
3. Enter any username and password (both fields must be non-empty)
4. Click "Login" to access the main dashboard
5. Use "Logout" to return to the login page

## Running Tests

### Prerequisites
Make sure you have Node.js installed, then install dependencies:

```bash
npm install
```

### Test Commands

```bash
# Run all tests (headless mode)
npm test

# Run tests with visible browser (headed mode)
npm run test:headed

# Run tests with interactive UI
npm run test:ui

# Show test report after running tests
npm run test:report
```

### Test Coverage

The test suite includes:

#### Application Flow Tests (`auth.spec.js`)
- Complete user journey: root redirect → login → main page → logout
- Login validation with empty credentials
- Session management and route protection

#### End-to-End Tests (`e2e.spec.js`)
- User journey with different credentials
- Session persistence across page reloads
- Protected route access without authentication

## Test Configuration

The tests are configured to run on:
- Chromium (Chrome/Edge)
- Firefox
- WebKit (Safari)

Tests use file:// protocol to load local HTML files directly, simulating how users would open the files locally.

## Browser Support

The application works in all modern browsers and the Playwright tests verify compatibility across different browser engines.
