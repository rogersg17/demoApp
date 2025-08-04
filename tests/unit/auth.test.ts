import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import session from 'express-session';
import bcrypt from 'bcrypt';

// Mock database
const mockDatabase = {
  get: jest.fn() as jest.MockedFunction<any>,
  run: jest.fn() as jest.MockedFunction<any>,
  prepare: jest.fn(() => ({
    get: jest.fn(),
    run: jest.fn()
  }))
};

// Create a test app
function createTestApp() {
  const app = express();
  
  app.use(express.json());
  app.use(session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
  }));

  // Import and setup auth routes
  const authRoutes = require('../../routes/auth.js');
  authRoutes.setDatabase(mockDatabase);
  app.use('/api/auth', authRoutes);

  return app;
}

describe('Authentication Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      mockDatabase.get.mockResolvedValue({
        id: 1,
        username: 'testuser',
        password: hashedPassword,
        email: 'test@example.com'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body.user).toHaveProperty('username', 'testuser');
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should fail login with invalid username', async () => {
      mockDatabase.get.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistent',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid username or password');
      expect(response.body).toHaveProperty('code', 'INVALID_CREDENTIALS');
    });

    it('should fail login with invalid password', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      mockDatabase.get.mockResolvedValue({
        id: 1,
        username: 'testuser',
        password: hashedPassword,
        email: 'test@example.com'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid username or password');
      expect(response.body).toHaveProperty('code', 'INVALID_CREDENTIALS');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Username and password are required');
    });

    it('should handle database errors gracefully', async () => {
      mockDatabase.get.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'password123'
        });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Internal server error');
      expect(response.body).toHaveProperty('code', 'INTERNAL_ERROR');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      // First login to create a session
      const hashedPassword = await bcrypt.hash('password123', 10);
      mockDatabase.get.mockResolvedValue({
        id: 1,
        username: 'testuser',
        password: hashedPassword,
        email: 'test@example.com'
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'password123'
        });

      // Then logout
      const response = await agent.post('/api/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Logout successful');
    });
  });

  describe('GET /api/auth/status', () => {
    it('should return authenticated status for logged in user', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      mockDatabase.get.mockResolvedValue({
        id: 1,
        username: 'testuser',
        password: hashedPassword,
        email: 'test@example.com'
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'password123'
        });

      const response = await agent.get('/api/auth/status');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('authenticated', true);
      expect(response.body.user).toHaveProperty('username', 'testuser');
    });

    it('should return unauthenticated status for guest user', async () => {
      const response = await request(app).get('/api/auth/status');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('authenticated', false);
      expect(response.body).toHaveProperty('user', null);
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should return user profile for authenticated user', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const mockUser = {
        id: 1,
        username: 'testuser',
        password: hashedPassword,
        email: 'test@example.com'
      };
      mockDatabase.get.mockResolvedValue(mockUser);

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'password123'
        });

      const response = await agent.get('/api/auth/profile');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.user).toHaveProperty('username', 'testuser');
      expect(response.body.user).toHaveProperty('email', 'test@example.com');
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/api/auth/profile');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Authentication required');
      expect(response.body).toHaveProperty('code', 'AUTH_REQUIRED');
    });
  });
});