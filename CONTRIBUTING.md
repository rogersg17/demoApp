# Contributing to Test Management Platform (TMP)

Thank you for your interest in contributing to TMP! This document outlines the process and standards for contributing code, documentation, or issues.

## Getting Started

1. **Fork and clone the repository**
2. **Install dependencies:**
   ```bash
   npm install
   cd frontend && npm install
   ```
3. **Copy environment files:**
   ```bash
   cp .env.example .env
   cp frontend/.env.example frontend/.env
   ```
4. **Start development servers:**
   - Cross-platform: `npm run dev:full`
   - Windows: `npm run dev:full:windows`
   - Linux/macOS: `npm run dev:full:linux`

## Development Workflow

- **Backend:** Express.js (TypeScript) on port 3000 (`npm run dev`)
- **Frontend:** React + Vite (TypeScript) on port 5173 (`npm run dev:frontend`)
- **Stop servers:** `npm run dev:stop`
- **Environment variables:** Use `.env` files
- **Database:** SQLite for local dev, Prisma for new features

## Code Style & Patterns

- **TypeScript only** for all new code
- **Service Layer:** Business logic in `/services/` as TypeScript classes extending `EventEmitter`
- **API Routes:** RESTful, typed, in `/routes/`
- **Frontend:** Redux Toolkit, RTK Query, Material-UI
- **Database:** Use parameterized queries only

## Testing

- **E2E:** Playwright in `/tests/e2e/`
- **Integration:** Webhook and API integration
- **JIRA:** `npm run test:jira:headed`
- **Validation:** `npm run test:validation`

## Commit Messages

- Use [Conventional Commits](https://www.conventionalcommits.org/)
  - Example: `feat: add ADO pipeline health dashboard`

## Pull Requests

- Keep your branch up to date with `main`
- Include tests for new features/bug fixes
- Describe your changes clearly
- Link related issues in the PR description

## Issue Reporting

- Search existing issues before opening a new one
- Provide steps to reproduce, logs, and environment details

## Architecture Overview

- **Backend:** Express.js (TypeScript), SQLite/Prisma, REST APIs, WebSockets
- **Frontend:** React (TypeScript), Vite, Material-UI, Redux Toolkit
- **Integrations:** Azure DevOps, JIRA, GitHub/GitLab/Bitbucket webhooks
- **Service Layer:** All business logic in `/services/`
- **Database:** MVP schema in `database/mvp-schema.sql`

## Contact

Open an issue or use repository discussions for questions.

---

**Note:** TMP is an orchestrator/observer. Never implement direct test execution in the platform.
