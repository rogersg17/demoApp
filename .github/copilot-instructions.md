# AI Coding Instructions for Test Management Platform (TMP)

## Platform Overview
This is a **Test Management Platform** built on **ADR-001: Test Code and Metadata Separation** - test code stays in Git repositories while test metadata and execution results are centrally managed in TMP.

**Core Architecture:** TMP acts as an observer/orchestrator that bridges CI/CD platforms (Azure DevOps, GitHub Actions, JIRA) rather than executing tests directly.

**TypeScript First:** This codebase is TypeScript-first - always use TypeScript for new code. Avoid JavaScript files except for legacy compatibility.

## Key Architectural Patterns

### Dual Server Structure
- **Backend:** Express.js server (`server.ts`) on **port 3000** - handles APIs, WebSockets, database operations
- **Frontend:** React + Vite dev server (`frontend/`) on **port 5173** - modern TypeScript UI with Material-UI
- **Database:** Dual approach - legacy SQLite (`database/database.ts`) + new Prisma (`database/prisma-database.ts`)

### Service Layer Architecture
All business logic lives in `/services/` as TypeScript classes extending `EventEmitter`:
- `AdoProjectConfigurationService` - Azure DevOps pipeline management
- `GitIntegrationService` - Multi-platform Git webhook handling
- `EnhancedOrchestrationService` - Cross-platform test execution coordination
- `FlakyTestNotificationService` - Intelligent test failure detection

**Always use TypeScript** for services with proper interfaces and type safety:
```typescript
class MyService extends EventEmitter {
  async processData(data: MyData): Promise<Result> {
    // Emit events for real-time updates
    this.emit('processing:started', { id: data.id });
    // Business logic here
    this.emit('processing:completed', result);
    return result;
  }
}
```

### Integration Points & External APIs
- **Azure DevOps:** Use `lib/ado-client.ts` wrapper around `azure-devops-node-api` - handles PAT auth, project discovery, build monitoring
- **JIRA:** Direct REST API integration via `jira-client` - automatic issue creation from test failures
- **Git Webhooks:** Multi-provider support (GitHub, GitLab, Bitbucket) in `services/git-integration.ts`
- **Real-time:** Socket.IO with TypeScript interfaces in `types/` for type-safe WebSocket communication

### Database Patterns
**MVP Schema:** Tables prefixed with `mvp_*` in `database/mvp-schema.sql`:
- `mvp_pipeline_configs` - Monitored ADO pipelines
- `mvp_test_failures` - Test execution results
- Always use parameterized queries, never string concatenation

**Correlation System:** Tests identified across platforms using universal correlation IDs in `test_metadata` table.

## Development Workflows

### Key NPM Scripts
```bash
# Development (cross-platform - backend + frontend)
npm run dev:full     # Starts backend + frontend with hot reload (concurrently)
npm run dev:stop     # Stops all development servers (cross-platform)

# Platform-specific development
npm run dev:full:windows   # Windows batch script (separate command windows)
npm run dev:stop:windows   # Windows stop script with emoji support
npm run dev:full:linux     # Linux/macOS bash script  
npm run dev:stop:linux     # Unix stop script

# Individual services
npm run dev              # Backend only (nodemon + TypeScript)
npm run dev:frontend     # Frontend only (Vite + React)

# Testing patterns  
npm run test:jira:headed    # JIRA integration tests with browser visible
npm run test:e2e:ui        # Playwright tests in interactive mode
npm run test:validation    # Phase validation tests

# Azure DevOps specific
npm run setup:ado          # Interactive ADO setup
```

**Port Configuration:**
- Backend server runs on port 3000 (configurable via `PORT` env variable)
- Frontend development server runs on port 5173
- All API endpoints are at `http://localhost:3000/api/*`
- Frontend connects to backend WebSocket on port 3000

**Cross-Platform Development:**
- **Universal**: `npm run dev:full` works on Windows, Linux, macOS using concurrently
- **Windows**: Batch scripts with UTF-8 emoji support, separate command windows
- **Linux/macOS**: Bash scripts with native emoji support and signal handling
- **Automatic Environment**: `VITE_API_BASE_URL` set automatically for frontend

### Configuration Management
- **Environment:** Multiple `.env.*` files for different integrations (`.env.jira`, `.env.ado`)
- **Runtime Config:** `config/test-settings.json` - web-editable settings
- **Type Safety:** All configs have TypeScript interfaces in `types/`

### Testing Philosophy
- **E2E First:** Playwright tests in `/tests/e2e/` are primary testing method
- **Integration Testing:** Focus on webhook processing and external API integration
- **JIRA Reporter:** Custom reporter automatically creates JIRA issues for test failures

## Code Patterns & Conventions

### Error Handling
Always emit events for observability:
```typescript
try {
  const result = await this.processData(data);
  this.emit('success', result);
} catch (error) {
  this.emit('error', { error: error.message, context: data });
  throw error;
}
```

### WebSocket Events
Use typed events defined in `types/`:
```typescript
// Emit test updates
io.to(`test-${testId}`).emit('execution:update', {
  execution_id: testId,
  status: 'running',
  timestamp: new Date().toISOString()
});
```

### API Route Structure
Routes in `/routes/` follow RESTful patterns with middleware. **Use TypeScript** with proper request/response typing:
```typescript
router.post('/api/ado/projects', 
  authMiddleware,
  validateProject,
  async (req: Request, res: Response) => {
    // Handle request with full type safety
  }
);
```

## Critical Integration Details

### Azure DevOps Integration
- **Build Monitoring:** Webhook-driven (`POST /api/ado/webhooks/build-complete`)
- **Authentication:** PAT-based via `getPersonalAccessTokenHandler`
- **Project Discovery:** Use `AdoBuildDefinitionService` for pipeline enumeration

### JIRA Workflow
- **Issue Creation:** Automatic from test failures with rich context (screenshots, logs, traces)
- **Duplicate Prevention:** Correlation system prevents multiple issues for same failure
- **Configuration:** Set `JIRA_ENABLED=true` and configure project key

### Git Integration
- **Multi-Provider:** Single service handles GitHub, GitLab, Bitbucket webhooks
- **Test Discovery:** Scans repository structure for test files (`.spec.ts`, `.test.js`)
- **Correlation:** Links Git commits to test execution results

## Frontend Specifics
- **State Management:** Redux Toolkit with RTK Query for API calls
- **Real-time Updates:** Socket.IO client integrated with React components  
- **Routing:** React Router with protected routes (`/dashboard`, `/settings`)
- **Development:** Vite with TypeScript, hot reload on **port 5173**
- **API Integration:** Connects to backend on **port 3000**

## Current Development Focus (MVP Phase 2)
Priority areas for development:
1. **ADO Pipeline Health Dashboard** - Real-time monitoring UI
2. **JIRA-ADO Bridge** - Automated workflow between platforms  
3. **Configuration Management** - Web-based setup interface
4. **Enhanced Analytics** - Test execution trends and failure patterns

When implementing new features, always consider the separation principle - TMP observes and orchestrates, never executes test code directly.
