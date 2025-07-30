# Demo App

A modern web application with user management functionality, built with Express.js and tested with Playwright.

## Features

- 🔐 User authentication system
- 👥 User management interface
- 📱 Responsive design
- 🧪 Comprehensive test coverage with Playwright

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

### Running the Application

```bash
# Start the Express.js server
npm start

# Start in development mode
npm run dev
```

The application will be available at:
- 🌐 Main app: http://localhost:3000
- 🔐 Login: http://localhost:3000/login/index.html
- 👥 User Management: http://localhost:3000/users/index.html

### Testing

```bash
# Run all tests
npm test

# Run tests with browser UI
npm run test:headed

# Run tests with Playwright UI
npm run test:ui

# View test report
npm run test:report
```

## Tech Stack

- **Backend**: Express.js
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Testing**: Playwright
- **Architecture**: Page Object Model for tests

## Project Structure

```
├── server.js              # Express.js server
├── login/                 # Login page
├── users/                 # User management page
├── mainPage/              # Main dashboard
├── tests/                 # Playwright tests
├── page-objects/          # Page Object Model classes
└── playwright.config.localhost.js  # Test configuration
```
