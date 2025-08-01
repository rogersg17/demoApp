# Demo App

A modern full-stack web application with comprehensive user management, analytics dashboard, and database integration. Built with Express.js backend, React frontend, SQLite database, and comprehensive Playwright testing with JIRA integration.

## Features

### 🎨 **Modern React Frontend**
- **React 19**: Latest React with TypeScript support
- **Vite Build System**: Fast development and optimized production builds
- **Redux Toolkit**: State management with RTK Query for API calls
- **React Router**: Client-side routing with protected routes
- **Real-time Updates**: Socket.IO integration for live data
- **Responsive Design**: Mobile-first approach with modern CSS

### � **Secure Authentication & User Management**
- **Password Security**: bcrypt hashing with secure session management
- **User CRUD Operations**: Complete user lifecycle management
- **Role-based Access**: Admin, moderator, and user roles
- **Session Tracking**: Login/logout monitoring and analytics

### 📊 **Analytics & Dashboard**
- **Interactive Charts**: Real-time data visualization with Chart.js
- **User Analytics**: Growth tracking, department distribution, activity patterns
- **Live Statistics**: Real-time user metrics and behavior tracking
- **Comprehensive Reports**: Detailed analytics dashboard

### 🧪 **Advanced Testing & JIRA Integration**
- **Playwright Testing**: Cross-browser automated testing suite
- **JIRA Integration**: Automatic issue creation for test failures
- **Test Management**: Built-in test execution and reporting interface
- **CI/CD Ready**: GitHub Actions integration with automated reporting

### 🗄️ **Database & API**
- **SQLite Database**: Persistent data storage with proper schema design
- **RESTful API**: Comprehensive API endpoints for all operations
- **Real-time Features**: Socket.IO for live updates
- **Data Integrity**: Proper validation and error handling

### 🔒 **Security & Performance**
- **Security Headers**: Helmet.js for security headers
- **Rate Limiting**: Express rate limiting for API protection
- **Input Validation**: Server-side validation with express-validator
- **XSS Protection**: XSS filtering and sanitization
- **Compression**: Response compression for better performance

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

3. The application will automatically create and populate a SQLite database on first run

### Running the Application

#### Backend Server
```bash
# Start the Express.js server
npm start

# Start in development mode
npm run dev
```

#### Frontend Development
```bash
# Navigate to frontend directory
cd frontend

# Install frontend dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

The application will be available at:
- 🌐 **Backend API**: http://localhost:3000
- ⚛️ **React Frontend**: http://localhost:5173 (development)
- 🔐 **Legacy Login**: http://localhost:3000/login/index.html
- 👥 **User Management**: http://localhost:3000/users/index.html
- 📊 **Analytics & Reports**: http://localhost:3000/reports/index.html
- 🧪 **Test Management**: http://localhost:3000/tests-management/index.html
- ⚙️ **Test Settings**: http://localhost:3000/settings/index.html

### Sample Accounts

The application comes with pre-configured sample accounts:

| Username | Password    | Role      | Status  |
|----------|-------------|-----------|---------|
| admin    | admin123    | admin     | active  |
| jdoe     | password123 | user      | active  |
| jsmith   | password123 | moderator | active  |
| bwilson  | password123 | user      | inactive|
| mjohnson | password123 | user      | pending |

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

# JIRA Integration Tests
npm run test:jira              # Run tests with JIRA reporting
npm run test:jira:headed       # Run JIRA tests with browser visible
npm run test:jira:ui           # Interactive JIRA test mode
npm run test-jira-setup        # Test JIRA integration setup

# Specific Test Suites
npm run test:login             # Run login tests only
npm run test:demo              # Run demo tests for JIRA integration
```

### JIRA Integration Setup

```bash
# Interactive JIRA configuration setup
npm run setup-jira

# Test JIRA connection and configuration
npm run test-jira-setup
```

## Tech Stack

### Frontend
- **React 19**: Latest React with TypeScript support
- **Vite**: Fast build tool and development server
- **Redux Toolkit**: State management with RTK Query
- **React Router**: Client-side routing with protected routes
- **Socket.IO Client**: Real-time communication
- **TypeScript**: Type-safe development

### Backend
- **Express.js**: Node.js web framework with middleware
- **SQLite**: Lightweight database with bcrypt password hashing
- **Socket.IO**: Real-time bidirectional communication
- **Security Stack**: Helmet, CORS, rate limiting, XSS protection
- **Session Management**: Express-session with secure cookies

### Testing & DevOps
- **Playwright**: Cross-browser automated testing
- **JIRA Integration**: Automatic issue creation for test failures
- **TypeScript**: Type checking and compilation
- **Custom Reporters**: JIRA reporter with file attachments
- **CI/CD Ready**: GitHub Actions integration

### Database & Analytics
- **SQLite3**: File-based database with full SQL support
- **Chart.js**: Interactive data visualization
- **Real-time Analytics**: Live user statistics and activity tracking
- **Session Tracking**: Login/logout monitoring

## Project Structure

```
├── server.js                 # Express.js server with API routes
├── database/
│   ├── database.js           # SQLite database class and schema
│   └── app.db               # SQLite database file (auto-generated)
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/       # Reusable React components
│   │   ├── pages/           # Page components (Dashboard, Login, etc.)
│   │   ├── store/           # Redux store configuration
│   │   ├── hooks/           # Custom React hooks
│   │   └── types/           # TypeScript type definitions
│   ├── package.json         # Frontend dependencies
│   └── vite.config.ts       # Vite configuration
├── login/                   # Legacy login page
├── users/                   # Legacy user management interface  
├── mainPage/                # Legacy main dashboard
├── reports/                 # Legacy analytics dashboard
├── tests-management/        # Legacy test management interface
├── settings/                # Legacy test execution settings
├── tests/                   # Playwright test suites
│   ├── login-*.spec.ts      # Login functionality tests
│   ├── jira-demo.spec.ts    # JIRA integration demo
│   └── *.spec.ts           # Additional test suites
├── page-objects/            # Page Object Model classes
├── reporters/               # Custom test reporters
│   └── jira-reporter.js     # JIRA integration reporter
├── utils/                   # Utility functions
│   └── jira-integration.js  # JIRA API integration
├── scripts/                 # Setup and utility scripts
│   ├── setup-jira-integration.js
│   └── test-jira-integration.js
├── test-results/            # Test execution results
├── playwright-report/       # HTML test reports
├── playwright.config.ts     # Standard Playwright configuration
└── playwright.config.jira.ts # JIRA-enabled Playwright configuration
```

## API Endpoints

### Authentication
- `POST /api/login` - User authentication
- `POST /api/logout` - Secure logout

### User Management
- `GET /api/users` - Fetch all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Analytics
- `GET /api/analytics/stats` - User statistics
- `GET /api/analytics/users-by-department` - Department distribution
- `GET /api/analytics/users-by-role` - Role distribution
- `GET /api/analytics/users-by-status` - Status distribution
- `GET /api/analytics/user-growth` - User growth over time
- `GET /api/analytics/user-activity` - Activity patterns

### Test Management & JIRA Integration
- `GET /api/tests` - Fetch test data and results
- `POST /api/tests/run` - Execute test suites
- `GET /api/tests/results/:executionId` - Get test execution status
- `GET /api/tests/executions` - Get test execution history

### Settings & Configuration
- `GET /api/settings` - Get test execution configuration
- `POST /api/settings` - Save test execution settings
- `GET /api/health` - Health check endpoint
- `POST /api/jira/test-connection` - Test JIRA integration

### Real-time Features (WebSocket)
- `connection` - Establish real-time connection
- `user-activity` - Live user activity updates
- `test-progress` - Real-time test execution updates

## Database Schema

### Users Table
- `id` - Primary key
- `username` - Unique username
- `email` - Unique email address
- `password` - Bcrypt hashed password
- `first_name`, `last_name` - User details
- `department` - User department
- `role` - User role (admin, moderator, user)
- `status` - Account status (active, pending, inactive)
- `created_at`, `updated_at` - Timestamps
- `last_login` - Last login timestamp

### User Sessions Table
- Session tracking for analytics
- Login/logout timestamps
- Duration tracking
- IP address and user agent logging

### Activity Logs Table
- User action tracking for comprehensive audit trails
- Login/logout events with timestamps and metadata
- IP address and user agent logging for security
- Integration with real-time analytics system

## Security Features

- 🔐 **Password Security**: Secure bcrypt encryption with salt rounds
- 🛡️ **Session Management**: Express sessions with secure cookies and CSRF protection  
- 🚫 **SQL Injection Protection**: Parameterized queries and input sanitization
- 🔒 **Route Protection**: Authentication middleware for protected endpoints
- ✅ **Input Validation**: Server-side validation with express-validator
- 🕵️ **Activity Logging**: Comprehensive audit trails with IP tracking
- 🛡️ **Security Headers**: Helmet.js for security headers (CSP, HSTS, etc.)
- ⚡ **Rate Limiting**: API rate limiting to prevent abuse
- 🧹 **XSS Protection**: XSS filtering and content sanitization
- 🔐 **Environment Security**: Secure environment variable management

## Development

### Frontend Development
The React frontend provides a modern user interface with:
- **Component Architecture**: Reusable components with TypeScript
- **State Management**: Redux Toolkit with RTK Query for API integration
- **Real-time Updates**: Socket.IO integration for live data
- **Routing**: Protected routes with role-based access control
- **Modern Tooling**: Vite for fast development and optimized builds

### Database Operations
The SQLite database is automatically created and populated with sample data on first run. The database file is located at `database/app.db`.

### Testing & Quality Assurance
- **Playwright Testing**: Cross-browser automated testing with visual regression
- **JIRA Integration**: Automatic issue creation for test failures with attachments
- **TypeScript**: Type safety and better developer experience
- **Code Quality**: ESLint configuration for consistent code style

### JIRA Integration Features
- **Automatic Issue Creation**: Creates detailed JIRA issues when tests fail
- **Rich Context**: Includes screenshots, traces, videos, and error details
- **Duplicate Prevention**: Avoids creating multiple issues for the same failure
- **Configurable Behavior**: Environment-based configuration for different scenarios
- **Retry Handling**: Updates existing issues when tests are retried

### Adding New Features
1. **Backend**: Update database schema in `database/database.js`, add API routes in `server.js`
2. **Frontend**: Create React components in `frontend/src/components` or `frontend/src/pages`
3. **Testing**: Add corresponding Playwright tests in the `tests/` directory
4. **Documentation**: Update this README and add inline code documentation

### Environment Variables
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment mode (development/production)
- `JIRA_URL` - JIRA instance URL for test reporting
- `JIRA_USERNAME` - JIRA username for API access
- `JIRA_API_TOKEN` - JIRA API token for authentication
- `JIRA_PROJECT_KEY` - JIRA project key for issue creation
- `JIRA_ENABLED` - Enable/disable JIRA integration (true/false)

### Deployment Notes
- **Frontend Build**: Run `npm run build` in the `frontend/` directory for production
- **Environment Files**: Use `.env.jira` for JIRA configuration (excluded from git)
- **Static Assets**: Frontend build outputs to `frontend/dist/` for production serving
- **Database**: SQLite database file (`database/app.db`) persists data between deployments
