import express, { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';
import { Session } from 'express-session';
import { Database } from 'sqlite3';

const router = express.Router();

// TypeScript interfaces
interface AuthenticatedRequest extends Request {
  session: Session & {
    userId?: string;
    username?: string;
    userRole?: string;
  };
}

interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  department: string;
  role: string;
  status: string;
}

interface LoginRequestBody {
  username: string;
  password: string;
}

interface RegisterRequestBody {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  department: string;
  role?: string;
}

// Determine if we are in a test environment (Playwright/Jest)
const isTestEnv = process.env.NODE_ENV === 'test' || process.env.PW_TEST === '1';

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTestEnv ? 1000 : 5, // relax limits in tests
  message: {
    error: 'Too many authentication attempts, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTestEnv ? 1000 : 10, // relax limits in tests
  message: {
    error: 'Too many login attempts, please try again later.',
    code: 'LOGIN_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Database instance (will be set by server)
let db: Database | null = null;

// Set database instance
function setDatabase(database: Database): void {
  db = database;
}

// Middleware to ensure authentication for protected routes
const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.session || !req.session.userId) {
    res.status(401).json({ 
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
    return;
  }
  next();
};

// Login endpoint
router.post('/login', loginLimiter, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { username, password }: LoginRequestBody = req.body;

    // Validate input
    if (!username || !password) {
      res.status(400).json({
        success: false,
        error: 'Username and password are required',
        code: 'MISSING_CREDENTIALS'
      });
      return;
    }

    // Find user by username or email
    const query = `
      SELECT id, username, email, password, first_name, last_name, department, role, status
      FROM users 
      WHERE (username = ? OR email = ?) AND status = 'active'
    `;

    db?.get(query, [username, username], async (err: Error | null, user: User) => {
      if (err) {
        console.error('Database error during login:', err);
        res.status(500).json({
          success: false,
          error: 'Internal server error',
          code: 'DATABASE_ERROR'
        });
        return;
      }

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Invalid username or password',
          code: 'INVALID_CREDENTIALS'
        });
        return;
      }

      try {
        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (!isValidPassword) {
          res.status(401).json({
            success: false,
            error: 'Invalid username or password',
            code: 'INVALID_CREDENTIALS'
          });
          return;
        }

        // Update last login time
        const updateQuery = `
          UPDATE users 
          SET last_login = datetime('now') 
          WHERE id = ?
        `;

        db?.run(updateQuery, [user.id], (updateErr: Error | null) => {
          if (updateErr) {
            console.error('Error updating last login:', updateErr);
            // Continue with login even if update fails
          }
        });

        // Create session
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.userRole = user.role;

        // Log successful login
        console.log(`✅ User ${user.username} logged in successfully`);

        // Return success response (without password)
        const { password: _, ...userWithoutPassword } = user;
        res.json({
          success: true,
          message: 'Login successful',
          user: userWithoutPassword
        });
      } catch (bcryptError) {
        console.error('Password comparison error:', bcryptError);
        res.status(500).json({
          success: false,
          error: 'Authentication error',
          code: 'AUTH_ERROR'
        });
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Logout endpoint
router.post('/logout', (req: AuthenticatedRequest, res: Response): void => {
  if (req.session) {
    const username = req.session.username;
    req.session.destroy((err: Error) => {
      if (err) {
        console.error('Session destruction error:', err);
        res.status(500).json({
          success: false,
          error: 'Logout failed',
          code: 'LOGOUT_ERROR'
        });
        return;
      }
      
      console.log(`✅ User ${username} logged out successfully`);
      res.json({
        success: true,
        message: 'Logout successful'
      });
    });
  } else {
    res.json({
      success: true,
      message: 'No active session'
    });
  }
});

// Register endpoint
router.post('/register', authLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password, firstName, lastName, department, role = 'user' }: RegisterRequestBody = req.body;

    // Validate input
    if (!username || !email || !password || !firstName || !lastName || !department) {
      res.status(400).json({
        success: false,
        error: 'All fields are required',
        code: 'MISSING_FIELDS'
      });
      return;
    }

    // Password strength validation
    if (password.length < 8) {
      res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long',
        code: 'WEAK_PASSWORD'
      });
      return;
    }

    // Check if user already exists
    const checkQuery = `
      SELECT id FROM users 
      WHERE username = ? OR email = ?
    `;

    db?.get(checkQuery, [username, email], async (err: Error | null, existingUser: { id: string } | undefined) => {
      if (err) {
        console.error('Database error during registration check:', err);
        res.status(500).json({
          success: false,
          error: 'Internal server error',
          code: 'DATABASE_ERROR'
        });
        return;
      }

      if (existingUser) {
        res.status(409).json({
          success: false,
          error: 'Username or email already exists',
          code: 'USER_EXISTS'
        });
        return;
      }

      try {
        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Insert new user
        const insertQuery = `
          INSERT INTO users (username, email, password, first_name, last_name, department, role, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'active', datetime('now'), datetime('now'))
        `;

        db?.run(insertQuery, [username, email, hashedPassword, firstName, lastName, department, role], function(this: any, insertErr: Error | null) {
          if (insertErr) {
            console.error('Database error during user insertion:', insertErr);
            res.status(500).json({
              success: false,
              error: 'Failed to create user',
              code: 'INSERT_ERROR'
            });
            return;
          }

          console.log(`✅ New user ${username} registered successfully`);
          res.status(201).json({
            success: true,
            message: 'User registered successfully',
            userId: this.lastID
          });
        });
      } catch (hashError) {
        console.error('Password hashing error:', hashError);
        res.status(500).json({
          success: false,
          error: 'Registration failed',
          code: 'HASH_ERROR'
        });
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Check session status
router.get('/status', (req: AuthenticatedRequest, res: Response): void => {
  if (req.session && req.session.userId) {
    res.json({
      authenticated: true,
      userId: req.session.userId,
      username: req.session.username,
      role: req.session.userRole
    });
  } else {
    res.json({
      authenticated: false
    });
  }
});

// Export router and utilities
export { requireAuth, setDatabase };
export default router;
