import express, { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
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
  password?: string;
  first_name: string;
  last_name: string;
  department: string;
  role: string;
  status: string;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

interface CreateUserBody {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  department: string;
  role: string;
}

interface UpdateUserBody {
  username?: string;
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  department?: string;
  role?: string;
  status?: string;
}

// Database instance (will be set by server)
let db: Database | null = null;

// Set database instance
const setDatabase = (database: Database): void => {
  db = database;
};

// Middleware to require authentication
const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.session || !req.session.userId) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'UNAUTHORIZED'
    });
    return;
  }
  next();
};

// GET /api/users - List all users
router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const query = `
      SELECT 
        id, 
        username, 
        email, 
        first_name, 
        last_name, 
        department, 
        role, 
        status, 
        last_login,
        created_at,
        updated_at
      FROM users 
      ORDER BY created_at DESC
    `;

    db?.all(query, [], (err: Error | null, users: User[]) => {
      if (err) {
        console.error('Database error while fetching users:', err);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch users',
          code: 'DATABASE_ERROR'
        });
        return;
      }

      res.json({
        success: true,
        users: users || []
      });
    });
  } catch (error) {
    console.error('Error in GET /users:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /api/users/:id - Get specific user
router.get('/:id', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        id, 
        username, 
        email, 
        first_name, 
        last_name, 
        department, 
        role, 
        status, 
        last_login,
        created_at,
        updated_at
      FROM users 
      WHERE id = ?
    `;

    db?.get(query, [id], (err: Error | null, user: User) => {
      if (err) {
        console.error('Database error while fetching user:', err);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch user',
          code: 'DATABASE_ERROR'
        });
        return;
      }

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
        return;
      }

      res.json({
        success: true,
        user
      });
    });
  } catch (error) {
    console.error('Error in GET /users/:id:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /api/users - Create new user
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { username, email, password, firstName, lastName, department, role }: CreateUserBody = req.body;

    // Validate required fields
    if (!username || !email || !password || !firstName || !lastName || !department || !role) {
      res.status(400).json({
        success: false,
        error: 'All fields are required',
        code: 'MISSING_FIELDS'
      });
      return;
    }

    // Check if user already exists
    const checkQuery = `SELECT id FROM users WHERE username = ? OR email = ?`;
    
    db?.get(checkQuery, [username, email], async (err: Error | null, existingUser: { id: string } | undefined) => {
      if (err) {
        console.error('Database error during user check:', err);
        res.status(500).json({
          success: false,
          error: 'Failed to check existing user',
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
          INSERT INTO users (
            username, email, password, first_name, last_name, 
            department, role, status, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, 'active', datetime('now'), datetime('now'))
        `;

        db?.run(insertQuery, [username, email, hashedPassword, firstName, lastName, department, role], function(this: any, insertErr: Error | null) {
          if (insertErr) {
            console.error('Database error during user creation:', insertErr);
            res.status(500).json({
              success: false,
              error: 'Failed to create user',
              code: 'INSERT_ERROR'
            });
            return;
          }

          console.log(`✅ User ${username} created successfully by ${req.session?.username}`);
          res.status(201).json({
            success: true,
            message: 'User created successfully',
            userId: this.lastID
          });
        });
      } catch (hashError) {
        console.error('Password hashing error:', hashError);
        res.status(500).json({
          success: false,
          error: 'Failed to create user',
          code: 'HASH_ERROR'
        });
      }
    });
  } catch (error) {
    console.error('Error in POST /users:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// PUT /api/users/:id - Update user
router.put('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { username, email, password, firstName, lastName, department, role, status }: UpdateUserBody = req.body;

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];

    if (username !== undefined) {
      updates.push('username = ?');
      values.push(username);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email);
    }
    if (firstName !== undefined) {
      updates.push('first_name = ?');
      values.push(firstName);
    }
    if (lastName !== undefined) {
      updates.push('last_name = ?');
      values.push(lastName);
    }
    if (department !== undefined) {
      updates.push('department = ?');
      values.push(department);
    }
    if (role !== undefined) {
      updates.push('role = ?');
      values.push(role);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
    }

    // Handle password update separately
    if (password !== undefined) {
      try {
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        updates.push('password = ?');
        values.push(hashedPassword);
      } catch (hashError) {
        console.error('Password hashing error:', hashError);
        res.status(500).json({
          success: false,
          error: 'Failed to update password',
          code: 'HASH_ERROR'
        });
        return;
      }
    }

    if (updates.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No fields to update',
        code: 'NO_UPDATES'
      });
      return;
    }

    updates.push('updated_at = datetime(\'now\')');
    values.push(id);

    const updateQuery = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;

    db?.run(updateQuery, values, function(this: any, err: Error | null) {
      if (err) {
        console.error('Database error during user update:', err);
        res.status(500).json({
          success: false,
          error: 'Failed to update user',
          code: 'UPDATE_ERROR'
        });
        return;
      }

      if (this.changes === 0) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
        return;
      }

      console.log(`✅ User ${id} updated successfully by ${req.session?.username}`);
      res.json({
        success: true,
        message: 'User updated successfully'
      });
    });
  } catch (error) {
    console.error('Error in PUT /users/:id:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// DELETE /api/users/:id - Delete user
router.delete('/:id', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (req.session?.userId === id) {
      res.status(400).json({
        success: false,
        error: 'Cannot delete your own account',
        code: 'SELF_DELETE_FORBIDDEN'
      });
      return;
    }

    const deleteQuery = `DELETE FROM users WHERE id = ?`;

    db?.run(deleteQuery, [id], function(this: any, err: Error | null) {
      if (err) {
        console.error('Database error during user deletion:', err);
        res.status(500).json({
          success: false,
          error: 'Failed to delete user',
          code: 'DELETE_ERROR'
        });
        return;
      }

      if (this.changes === 0) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
        return;
      }

      console.log(`✅ User ${id} deleted successfully by ${req.session?.username}`);
      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    });
  } catch (error) {
    console.error('Error in DELETE /users/:id:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

export { setDatabase };
export default router;
