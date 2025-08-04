const express = require('express');
const router = express.Router();

// Database instance (will be set by server)
let db = null;

// Set database instance
const setDatabase = (database) => {
  db = database;
};

// Middleware to require authentication
const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'UNAUTHORIZED'
    });
  }
  next();
};

// GET /api/users - List all users
router.get('/', requireAuth, (req, res) => {
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

    db.all(query, [], (err, users) => {
      if (err) {
        console.error('Database error while fetching users:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch users',
          code: 'DATABASE_ERROR'
        });
      }

      // Transform data for frontend
      const transformedUsers = users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        department: user.department,
        role: user.role,
        status: user.status,
        last_login: user.last_login,
        created_at: user.created_at,
        updated_at: user.updated_at
      }));

      res.json(transformedUsers);
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

// DELETE /api/users/:id - Delete a user
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (!userId || isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID',
        code: 'INVALID_ID'
      });
    }

    // Prevent users from deleting themselves
    if (req.session.userId === userId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own account',
        code: 'CANNOT_DELETE_SELF'
      });
    }

    // Check if user exists
    const checkQuery = 'SELECT id, username FROM users WHERE id = ?';
    db.get(checkQuery, [userId], (err, user) => {
      if (err) {
        console.error('Database error while checking user:', err);
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

      // Delete the user
      const deleteQuery = 'DELETE FROM users WHERE id = ?';
      db.run(deleteQuery, [userId], function(err) {
        if (err) {
          console.error('Database error while deleting user:', err);
          return res.status(500).json({
            success: false,
            error: 'Failed to delete user',
            code: 'DELETE_ERROR'
          });
        }

        if (this.changes === 0) {
          return res.status(404).json({
            success: false,
            error: 'User not found',
            code: 'USER_NOT_FOUND'
          });
        }

        console.log(`User ${user.username} (ID: ${userId}) deleted successfully`);
        
        res.json({
          success: true,
          message: 'User deleted successfully',
          deletedUser: {
            id: userId,
            username: user.username
          }
        });
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

// POST /api/users - Create a new user
router.post('/', requireAuth, async (req, res) => {
  try {
    const { username, email, password, first_name, last_name, department, role } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username, email, and password are required',
        code: 'MISSING_FIELDS'
      });
    }

    // Check if user already exists
    const checkQuery = 'SELECT id FROM users WHERE username = ? OR email = ?';
    db.get(checkQuery, [username, email], async (err, existingUser) => {
      if (err) {
        console.error('Database error while checking existing user:', err);
        return res.status(500).json({
          success: false,
          error: 'Database error',
          code: 'DATABASE_ERROR'
        });
      }

      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: 'User with this username or email already exists',
          code: 'USER_EXISTS'
        });
      }

      // Hash password
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const insertQuery = `
        INSERT INTO users (
          username, 
          email, 
          password, 
          first_name, 
          last_name, 
          department, 
          role, 
          status,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;

      db.run(insertQuery, [
        username,
        email,
        hashedPassword,
        first_name || '',
        last_name || '',
        department || '',
        role || 'user'
      ], function(err) {
        if (err) {
          console.error('Database error while creating user:', err);
          return res.status(500).json({
            success: false,
            error: 'Failed to create user',
            code: 'CREATE_ERROR'
          });
        }

        console.log(`User ${username} created successfully with ID: ${this.lastID}`);

        res.status(201).json({
          success: true,
          message: 'User created successfully',
          user: {
            id: this.lastID,
            username,
            email,
            first_name: first_name || '',
            last_name: last_name || '',
            department: department || '',
            role: role || 'user',
            status: 'active'
          }
        });
      });
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

// PUT /api/users/:id - Update a user
router.put('/:id', requireAuth, (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { username, email, first_name, last_name, department, role, status } = req.body;
    
    if (!userId || isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID',
        code: 'INVALID_ID'
      });
    }

    // Build update query dynamically
    const updates = [];
    const values = [];

    if (username !== undefined) {
      updates.push('username = ?');
      values.push(username);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email);
    }
    if (first_name !== undefined) {
      updates.push('first_name = ?');
      values.push(first_name);
    }
    if (last_name !== undefined) {
      updates.push('last_name = ?');
      values.push(last_name);
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

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update',
        code: 'NO_UPDATES'
      });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(userId);

    const updateQuery = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    
    db.run(updateQuery, values, function(err) {
      if (err) {
        console.error('Database error while updating user:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to update user',
          code: 'UPDATE_ERROR'
        });
      }

      if (this.changes === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

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

module.exports = { router, setDatabase };
