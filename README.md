# Test Management Platform (TMP)

![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)
![React](https://img.shields.io/badge/React-19.0+-61DAFB.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)
![Status](https://img.shields.io/badge/Status-MVP%20Development-orange.svg)

A comprehensive test management platform that bridges CI/CD systems with issue tracking platforms. Built on the foundation of **ADR-001: Test Code and Metadata Separation**, TMP provides automated test failure management, real-time monitoring, and intelligent workflow automation.

## � Table of Contents

- [Project Documentation](#-project-documentation)
- [Current Status](#-current-status-mvp-development-phase-2)
- [Architecture Overview](#️-architecture-overview)
- [Features](#features)
- [Quick Start](#-quick-start)
- [Configuration & Setup](#-configuration--setup)
- [API Reference](#-api-reference)
- [Development & Contributing](#️-development--contributing)
- [Monitoring & Analytics](#-monitoring--analytics)
- [Technical Stack](#️-technical-stack)
- [Project Roadmap](#-project-roadmap)
- [Support & Documentation](#-support--documentation)

## �📋 Project Documentation

**➡️ For complete project information, see the [Documentation Hub](docs/README.md)**

### Quick Links
- **[Master Project Plan](docs/PROJECT_PLAN.md)** - Complete project status with checkboxes
- **[Strategic Plan 2025](docs/planning/STRATEGIC_PLAN_2025.md)** - Overall vision and roadmap
- **[MVP Implementation Plan](docs/architecture/ADR-001-MVP-IMPLEMENTATION-PLAN.md)** - Current MVP development focus
- **[Architecture Overview](docs/architecture/README.md)** - Core design and technical decisions

## 🎯 Current Status: MVP Development (Phase 2)

### ✅ Phase 1 COMPLETED: Foundation Infrastructure
- **Test Discovery & Identification**: Framework-agnostic test scanning with universal correlation
- **Git Integration**: Multi-provider webhook support (GitHub, GitLab, Azure DevOps, Bitbucket)
- **Database Architecture**: Extended schema with TMS metadata tables
- **JIRA Integration**: Automated issue creation with rich context ✅ Production Ready

### 🚧 Phase 2 IN PROGRESS: MVP Core Features
- **Azure DevOps Integration**: Enhanced pipeline monitoring and configuration
- **JIRA-ADO Bridge**: Automated workflow between JIRA and Azure DevOps
- **Real-time Dashboard**: Pipeline health monitoring and test failure visualization
- **Configuration Management**: Web-based setup and administration interface

**MVP Goal**: Exceptional JIRA-Azure DevOps integration delivering immediate value to development teams.

## 🏗️ Architecture Overview

### Core Design Principle: Test Code and Metadata Separation
- **Test Code**: Remains in CI/CD platforms (Azure DevOps, GitHub Actions, GitLab CI)
- **Test Metadata**: Centrally managed for correlation, analytics, and automation
- **Integration Layer**: Universal adapters for any CI/CD platform
- **Intelligence Layer**: Automated failure management and workflow orchestration

### Key Capabilities
- **Platform Agnostic**: Works with any CI/CD platform through standardized interfaces
- **Real-time Processing**: Sub-minute response times from test failure to JIRA issue creation
- **Intelligent Correlation**: Advanced algorithms for test identification across platforms
- **Rich Context**: Automated inclusion of logs, artifacts, and historical data in issues

## Features

### 🔗 **Platform Integrations** ✅ PRODUCTION READY
- **JIRA Integration**: Automatic issue creation with comprehensive context
- **Git Webhooks**: Multi-provider repository event processing
- **Real-time Monitoring**: Live test execution and failure detection
- **React Frontend**: Modern TypeScript-based user interface

### 🎯 **MVP Features** 🚧 IN DEVELOPMENT
- **Azure DevOps Monitoring**: Real-time pipeline health and test result ingestion  
- **JIRA-ADO Workflow**: Automated issue creation from ADO test failures
- **Configuration Dashboard**: Web-based setup for pipelines and workflows
- **Performance Analytics**: Pipeline health metrics and trend analysis

### 🔮 **Planned Features** 📋 ROADMAP
- **GitHub Actions Integration**: Complete GitHub workflow monitoring (Phase 3)
- **Advanced Analytics**: AI-powered failure pattern recognition (Phase 4)  
- **Enterprise Features**: Multi-tenant architecture and SSO (Phase 5)

### 🧪 **Testing Infrastructure** ✅ COMPLETE
- **Playwright Testing**: Comprehensive E2E test automation
- **Framework Support**: Jest, Mocha, Cypress, Vitest test discovery
- **Test Correlation**: Advanced algorithms for cross-platform test identification
- **Validation Suite**: 100% Phase 1 validation success
- **Compression**: Response compression for better performance

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn package manager
- Git for repository integration

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd demoApp
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup configuration**
```bash
# Copy environment template
cp .env.example .env.tms

# Configure your integrations (JIRA, Azure DevOps, etc.)
# See docs/setup/configuration.md for detailed setup
```

4. **Initialize database**
```bash
# Database will be automatically created on first run
npm run setup
```

### Running the Platform

#### Core Platform
```bash
# Start the main TMP server
npm start

# Development mode with hot reload
npm run dev
```

#### Frontend Development  
```bash
# Navigate to frontend directory
cd frontend

# Install frontend dependencies
npm install

# Start React development server
npm run dev

# Build for production
npm run build
```

### Access Points
- � **Main Dashboard**: http://localhost:3000
- ⚛️ **React Frontend**: http://localhost:5173 (development) 
- � **Configuration**: http://localhost:3000/config
- 📊 **Analytics**: http://localhost:3000/analytics
- 🔗 **Integration Status**: http://localhost:3000/integrations

### Sample Configuration

For testing purposes, the platform includes sample configurations:

| Integration | Status | Purpose |
|-------------|--------|---------|
| JIRA | ✅ Ready | Automatic issue creation |
| Azure DevOps | 🚧 In Development | Pipeline monitoring |
| Git Webhooks | ✅ Ready | Repository event processing |
| WebSocket | ✅ Ready | Real-time updates |

### Testing & Validation

```bash
# Run comprehensive test suite
npm test

# Validate Phase 1 implementation
npm run validate:phase1

# Run integration tests
npm run test:integration

# Run E2E tests with Playwright
npm run test:e2e

# Test JIRA integration
npm run test:jira

# Run JIRA tests with browser visible
npm run test:jira:headed

# Interactive JIRA test mode
npm run test:jira:ui

# Test JIRA integration setup
npm run test-jira-setup
```

## 🔧 Configuration & Setup

### Environment Configuration
```bash
# Main platform configuration
.env.tms                    # Core TMP configuration
.tms/metadata.json         # System metadata and settings
```

### Integration Setup

#### JIRA Integration ✅ Production Ready
```bash
# Interactive JIRA setup
npm run setup:jira

# Test JIRA connection
npm run test:jira-connection
```

#### Azure DevOps Integration 🚧 In Development
```bash
# Configure ADO connection
npm run setup:ado

# Test pipeline monitoring
npm run test:ado-integration
```

#### Git Webhook Integration ✅ Ready
```bash
# Configure repository webhooks
npm run setup:git-webhooks

# Test webhook processing
npm run test:webhooks
```

## 📊 API Reference

### Core TMP APIs ✅ Available
- **Git Integration**: `/api/webhooks/git` - Repository event processing
- **Test Discovery**: `/api/repositories` - Repository and test management
- **Test Metadata**: `/api/test-metadata` - Test information and correlation
- **Platform Integrations**: `/api/integrations` - Integration status and health

### MVP APIs 🚧 In Development
- **ADO Configuration**: `/api/mvp/ado/*` - Azure DevOps pipeline configuration
- **Test Processing**: `/api/mvp/process-build/*` - Test result processing
- **Workflow Automation**: `/api/mvp/workflow/*` - JIRA-ADO bridge automation
- **Real-time Updates**: WebSocket endpoints for live dashboard updates

## 🏗️ Development & Contributing

### Development Setup
```bash
# Install development dependencies
npm install --include=dev

# Run in development mode with hot reload
npm run dev

# Run tests during development
npm run test:watch
```

### Code Quality
```bash
# Run linting
npm run lint

# Format code
npm run format

# Type checking (TypeScript)
npm run type-check

# Security audit
npm audit
```

### Testing Strategy
```bash
# Unit tests for services
npm run test:unit

# Integration tests for workflows
npm run test:integration  

# End-to-end validation
npm run test:e2e

# Performance testing
npm run test:performance
```

## 📈 Monitoring & Analytics

### Platform Health
- **System Status**: Real-time monitoring of all integrations
- **Performance Metrics**: API response times and throughput
- **Error Tracking**: Automated error detection and alerting  
- **Integration Health**: Connection status for JIRA, ADO, Git providers

### Usage Analytics
- **Test Execution Metrics**: Volume, success rates, failure patterns
- **Integration Usage**: Platform usage statistics and trends
- **User Analytics**: Feature adoption and usage patterns
- **ROI Tracking**: Time savings and efficiency improvements

## 🛠️ Technical Stack

### Backend
- **Node.js + Express**: Core platform server
- **SQLite**: Database with TMS schema extensions
- **WebSocket**: Real-time communication
- **TypeScript**: Type safety and better development experience

### Frontend  
- **React 18**: Modern UI framework with hooks
- **TypeScript**: Full type safety
- **Vite**: Fast build tool and development server
- **WebSocket Client**: Real-time dashboard updates

### Testing & Quality
- **Playwright**: Cross-browser E2E testing
- **Jest**: Unit testing framework
- **ESLint + Prettier**: Code quality and formatting
- **Husky**: Git hooks for quality gates

### Integrations
- **JIRA REST API**: Issue management automation
- **Azure DevOps REST API**: Pipeline monitoring and test result ingestion
- **Git Webhooks**: Multi-provider repository integration
- **WebSocket**: Real-time updates and notifications

## 📋 Project Roadmap

### Completed ✅
- **Phase 1 Foundation**: Universal test identification and correlation
- **JIRA Integration**: Production-ready automated issue management
- **Git Integration**: Multi-provider webhook processing
- **React Frontend**: Modern TypeScript-based user interface

### Current Sprint 🚧
- **Azure DevOps Core**: Pipeline monitoring and configuration
- **JIRA-ADO Bridge**: Automated workflow integration  
- **MVP Dashboard**: Real-time pipeline health monitoring
- **Configuration Management**: Web-based setup interface

### Next Sprints 📋
- **GitHub Actions**: Complete GitHub workflow integration
- **Advanced Analytics**: AI-powered failure analysis
- **Enterprise Features**: Multi-tenant and SSO support

## 🎯 Success Metrics

### Technical Performance
- **Response Time**: <5 minutes from test failure to JIRA issue
- **System Reliability**: >99% uptime for critical workflows
- **Data Accuracy**: >99% correct test-to-issue correlation
- **Integration Health**: Continuous monitoring of all platforms

### User Experience  
- **Setup Time**: <30 minutes for new pipeline configuration
- **Issue Quality**: Rich context enables faster debugging
- **Dashboard Usability**: Real-time pipeline health visibility
- **Automation Value**: 80% reduction in manual test failure triage

## 📞 Support & Documentation

### Complete Documentation
- **[Project Plan](docs/PROJECT_PLAN.md)**: Master project tracker with checkboxes
- **[Architecture Guide](docs/architecture/README.md)**: Technical design and decisions
- **[Setup Guide](docs/setup/)**: Installation and configuration instructions
- **[API Reference](docs/api/)**: Complete API documentation

### Getting Help
- **Documentation Hub**: [docs/README.md](docs/README.md)
- **Issue Tracking**: Use GitHub Issues for bug reports and feature requests
- **Development**: See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines

---

**Test Management Platform (TMP)** - Bridging CI/CD systems with intelligent automation  
*Built on ADR-001: Test Code and Metadata Separation*

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
- **Azure DevOps Integration**: Pipeline monitoring and build result consumption
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
├── lib/                     # Core libraries
│   └── ado-client.js         # Azure DevOps API client
├── services/                # Business logic services
│   ├── ado-build-consumer.js # Build result consumption service
│   ├── ado-build-definition.js # Build definition discovery
│   ├── ado-pipeline.js       # Pipeline monitoring service
│   └── ado-project-configuration.js # Project configuration management
├── routes/                  # API route handlers
│   ├── ado-webhooks.js       # Azure DevOps webhook endpoints
│   ├── ado-project-config.js # Project configuration API
│   └── ado-dashboard.js      # Dashboard and analytics API
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
├── playwright.config.jira.ts # JIRA-enabled Playwright configuration
├── .env.ado.example         # Azure DevOps configuration template
└── .env.jira.example        # JIRA configuration template
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

### Azure DevOps Integration
- `POST /api/ado/test-connection` - Test Azure DevOps connection
- `GET/POST /api/ado/configuration` - Manage ADO settings
- `GET /api/ado/build-definitions` - List available pipelines
- `POST /api/ado/projects` - Configure pipeline as project
- `GET /api/ado/projects` - List configured projects
- `PUT /api/ado/projects/:id` - Update project configuration
- `DELETE /api/ado/projects/:id` - Remove project monitoring
- `GET /api/ado/dashboard` - Overall pipeline dashboard
- `GET /api/ado/project/:id` - Specific project details
- `GET /api/ado/project/:id/trends` - Historical trends
- `GET /api/ado/project/:id/builds` - Build history
- `GET /api/ado/project/:id/tests` - Test results
- `POST /api/ado/webhooks/build-complete` - Receive build completion events

### Real-time Features (WebSocket)
- `connection` - Establish real-time connection
- `user-activity` - Live user activity updates
- `test-progress` - Real-time test execution updates
- `ado:build-complete` - Azure DevOps build completion notifications
- `ado:build-error` - Azure DevOps build processing errors

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

### Azure DevOps Tables
- **Project Configurations**: Stores configured pipeline projects with settings
- **ADO Builds**: Build execution data from Azure DevOps pipelines
- **ADO Test Results**: Test run summaries and metrics
- **Project Status**: Real-time project health and success rate tracking
- **ADO Build Tasks**: Detailed task execution information
- **ADO Test Details**: Individual test case results and outcomes

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

#### Core Application
- `PORT` - Server port (default: 5173)
- `NODE_ENV` - Environment mode (development/production)
- `SESSION_SECRET` - Secret key for session encryption
- `SESSION_TTL` - Session timeout in seconds

#### JIRA Integration (`.env.jira`)
- `JIRA_URL` - JIRA instance URL for test reporting
- `JIRA_USERNAME` - JIRA username for API access
- `JIRA_API_TOKEN` - JIRA API token for authentication
- `JIRA_PROJECT_KEY` - JIRA project key for issue creation
- `JIRA_ENABLED` - Enable/disable JIRA integration (true/false)

#### Azure DevOps Integration (`.env.ado`)
- `ADO_ORGANIZATION` - Azure DevOps organization URL
- `ADO_PROJECT` - Default Azure DevOps project name
- `ADO_PAT` - Personal Access Token for API authentication
- `ADO_ENABLED` - Enable/disable Azure DevOps integration (true/false)
- `ADO_WEBHOOK_SECRET` - Secret for webhook signature validation
- `ADO_CONSUME_BUILD_RESULTS` - Enable automatic build result consumption
- `ADO_BUILD_COMPLETE_WEBHOOK` - Enable build completion webhooks
- `ADO_DEBUG` - Enable debug logging for Azure DevOps operations

### Deployment Notes
- **Frontend Build**: Run `npm run build` in the `frontend/` directory for production
- **Environment Files**: 
  - Use `.env.jira` for JIRA configuration (excluded from git)
  - Use `.env.ado` for Azure DevOps configuration (excluded from git)
- **Static Assets**: Frontend build outputs to `frontend/dist/` for production serving
- **Database**: SQLite database file (`database/app.db`) persists data between deployments
- **Azure DevOps Webhooks**: Configure webhooks to point to your deployed server URL
- **Security**: Ensure webhook secrets and PATs are securely stored in production
