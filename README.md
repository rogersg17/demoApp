# Demo App

A modern web application with comprehensive user management, analytics dashboard, and database integration. Built with Express.js, SQLite, and tested with Playwright.

## Features

- 🔐 **Secure Authentication**: Password hashing with bcrypt and session management
- 👥 **User Management**: Complete CRUD operations for user accounts
- 📊 **Analytics Dashboard**: Interactive charts and reports with Chart.js
- 🗄️ **SQLite Database**: Persistent data storage with proper schema design
- 📱 **Responsive Design**: Mobile-first approach with modern CSS
- 🧪 **Comprehensive Testing**: Full test coverage with Playwright
- 🔒 **Security Features**: Protected routes, input validation, and SQL injection prevention
- 📈 **Real-time Analytics**: Live user statistics and behavior tracking

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

```bash
# Start the Express.js server
npm start

# Start in development mode
npm run dev
```

The application will be available at:
- 🌐 **Main Dashboard**: http://localhost:3000
- 🔐 **Login Page**: http://localhost:3000/login/index.html
- 👥 **User Management**: http://localhost:3000/users/index.html
- 📊 **Analytics & Reports**: http://localhost:3000/reports/index.html

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
```

## Tech Stack

- **Backend**: Express.js with SQLite database
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Database**: SQLite with bcrypt password hashing
- **Charts**: Chart.js for analytics visualization
- **Session Management**: Express-session with secure cookies
- **Testing**: Playwright with comprehensive test suites
- **Architecture**: RESTful API design with Page Object Model for tests

## Project Structure

```
├── server.js              # Express.js server with API routes
├── database/
│   ├── database.js         # SQLite database class and schema
│   └── app.db             # SQLite database file (auto-generated)
├── login/                 # Login page with authentication
├── users/                 # User management interface
├── mainPage/              # Main dashboard
├── reports/               # Analytics dashboard with charts
├── tests/                 # Playwright tests
├── page-objects/          # Page Object Model classes
├── test-results/          # Test execution results
├── playwright-report/     # HTML test reports
└── playwright.config.ts   # Test configuration
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
- User action tracking
- Audit trail for user management
- Timestamp and IP logging

## Security Features

- 🔐 **Password Hashing**: Secure bcrypt encryption
- 🛡️ **Session Management**: Express sessions with secure cookies
- 🚫 **SQL Injection Protection**: Parameterized queries
- 🔒 **Route Protection**: Authentication middleware
- ✅ **Input Validation**: Server-side validation
- 🕵️ **Activity Logging**: Comprehensive audit trails

## Development

### Database Operations
The SQLite database is automatically created and populated with sample data on first run. The database file is located at `database/app.db`.

### Adding New Features
1. Update database schema in `database/database.js`
2. Add API routes in `server.js`
3. Update frontend interfaces
4. Add corresponding tests

### Environment Variables
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment mode
