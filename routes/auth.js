const express = require('express');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const router = express.Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: 'Too many authentication attempts, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts per window
  message: {
    error: 'Too many login attempts, please try again later.',
    code: 'LOGIN_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Database instance (will be set by server)
let db = null;

// Set database instance
function setDatabase(database) {
  db = database;
}

// Middleware to ensure authentication for protected routes
const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }
  next();
};

// Login endpoint
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // Find user by username or email
    const query = `
      SELECT id, username, email, password, first_name, last_name, department, role, status
      FROM users 
      WHERE (username = ? OR email = ?) AND status = 'active'
    `;

    db.get(query, [username, username], async (err, user) => {
      if (err) {
        console.error('Database error during login:', err);
        return res.status(500).json({
          success: false,
          error: 'Internal server error',
          code: 'DATABASE_ERROR'
        });
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid username or password',
          code: 'INVALID_CREDENTIALS'
        });
      }

      try {
        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (!isValidPassword) {
          return res.status(401).json({
            success: false,
            error: 'Invalid username or password',
            code: 'INVALID_CREDENTIALS'
          });
        }

        // Update last login time
        const updateQuery = `
          UPDATE users 
          SET last_login = CURRENT_TIMESTAMP,
              session_count = session_count + 1
          WHERE id = ?
        `;
        
        db.run(updateQuery, [user.id], (updateErr) => {
          if (updateErr) {
            console.error('Error updating last login:', updateErr);
          }
        });

        // Create session
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.role = user.role;
        req.session.loginTime = new Date().toISOString();

        // Return success with user info (excluding password)
        res.json({
          success: true,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            department: user.department,
            role: user.role,
            status: user.status
          },
          session: {
            loginTime: req.session.loginTime
          }
        });

      } catch (hashError) {
        console.error('Password verification error:', hashError);
        return res.status(500).json({
          success: false,
          error: 'Internal server error',
          code: 'AUTH_ERROR'
        });
      }
    });

  } catch (error) {
    console.error('Login endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destruction error:', err);
        return res.status(500).json({
          success: false,
          error: 'Error logging out',
          code: 'LOGOUT_ERROR'
        });
      }
      
      res.clearCookie('connect.sid'); // Clear session cookie
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    });
  } else {
    res.json({
      success: true,
      message: 'No active session'
    });
  }
});

// Check authentication status
router.get('/status', (req, res) => {
  if (req.session && req.session.userId) {
    // Get current user info
    const query = `
      SELECT id, username, email, first_name, last_name, department, role, status, last_login
      FROM users 
      WHERE id = ? AND status = 'active'
    `;

    db.get(query, [req.session.userId], (err, user) => {
      if (err) {
        console.error('Database error during auth status check:', err);
        return res.status(500).json({
          authenticated: false,
          error: 'Database error',
          code: 'DATABASE_ERROR'
        });
      }

      if (!user) {
        // User not found or inactive, destroy session
        req.session.destroy(() => {});
        return res.json({
          authenticated: false,
          error: 'User not found or inactive',
          code: 'USER_NOT_FOUND'
        });
      }

      res.json({
        authenticated: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          department: user.department,
          role: user.role,
          status: user.status,
          lastLogin: user.last_login
        },
        session: {
          loginTime: req.session.loginTime,
          role: req.session.role
        }
      });
    });
  } else {
    res.json({
      authenticated: false,
      message: 'No active session'
    });
  }
});

// Get current user profile
router.get('/profile', requireAuth, (req, res) => {
  const query = `
    SELECT id, username, email, first_name, last_name, department, role, status, 
           created_at, last_login, session_count, avg_session_duration
    FROM users 
    WHERE id = ?
  `;

  db.get(query, [req.session.userId], (err, user) => {
    if (err) {
      console.error('Database error fetching user profile:', err);
      return res.status(500).json({
        error: 'Database error',
        code: 'DATABASE_ERROR'
      });
    }

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        department: user.department,
        role: user.role,
        status: user.status,
        createdAt: user.created_at,
        lastLogin: user.last_login,
        sessionCount: user.session_count,
        avgSessionDuration: user.avg_session_duration
      }
    });
  });
});

// Change password
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required',
        code: 'MISSING_PASSWORDS'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters long',
        code: 'PASSWORD_TOO_SHORT'
      });
    }

    // Get current user
    const getUserQuery = 'SELECT password FROM users WHERE id = ?';
    
    db.get(getUserQuery, [req.session.userId], async (err, user) => {
      if (err) {
        console.error('Database error fetching user for password change:', err);
        return res.status(500).json({
          success: false,
          error: 'Database error',
          code: 'DATABASE_ERROR'
        });
      }

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      try {
        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        
        if (!isCurrentPasswordValid) {
          return res.status(401).json({
            success: false,
            error: 'Current password is incorrect',
            code: 'INVALID_CURRENT_PASSWORD'
          });
        }

        // Hash new password
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        const updateQuery = 'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        
        db.run(updateQuery, [hashedNewPassword, req.session.userId], (updateErr) => {
          if (updateErr) {
            console.error('Database error updating password:', updateErr);
            return res.status(500).json({
              success: false,
              error: 'Failed to update password',
              code: 'UPDATE_ERROR'
            });
          }

          res.json({
            success: true,
            message: 'Password changed successfully'
          });
        });

      } catch (hashError) {
        console.error('Password hashing error:', hashError);
        return res.status(500).json({
          success: false,
          error: 'Internal server error',
          code: 'HASH_ERROR'
        });
      }
    });

  } catch (error) {
    console.error('Change password endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

// Export the router and helper functions
module.exports = router;
module.exports.setDatabase = setDatabase;
module.exports.requireAuth = requireAuth;
