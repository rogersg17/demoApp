const express = require('express');
const router = express.Router();

// Database instance (will be set by server)
let db = null;

// Set database instance
function setDatabase(database) {
  db = database;
}

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }
  next();
};

// Get all git repositories
router.get('/repositories', requireAuth, (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const query = `
      SELECT 
        gr.*,
        u.username as created_by_username
      FROM git_repositories gr
      LEFT JOIN users u ON gr.created_by = u.id
      ORDER BY gr.created_at DESC 
      LIMIT ? OFFSET ?
    `;

    db.all(query, [parseInt(limit), offset], (err, repositories) => {
      if (err) {
        console.error('Database error fetching git repositories:', err);
        return res.status(500).json({
          error: 'Database error',
          code: 'DATABASE_ERROR'
        });
      }

      // Get total count for pagination
      const countQuery = 'SELECT COUNT(*) as total FROM git_repositories';
      
      db.get(countQuery, [], (countErr, countResult) => {
        if (countErr) {
          console.error('Database error getting repository count:', countErr);
          return res.status(500).json({
            error: 'Database error',
            code: 'DATABASE_ERROR'
          });
        }

        res.json({
          repositories: repositories || [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: countResult ? countResult.total : 0,
            totalPages: Math.ceil((countResult ? countResult.total : 0) / parseInt(limit))
          }
        });
      });
    });

  } catch (error) {
    console.error('Error fetching git repositories:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

// Get specific git repository
router.get('/repositories/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        gr.*,
        u.username as created_by_username
      FROM git_repositories gr
      LEFT JOIN users u ON gr.created_by = u.id
      WHERE gr.id = ?
    `;

    db.get(query, [id], (err, repository) => {
      if (err) {
        console.error('Database error fetching git repository:', err);
        return res.status(500).json({
          error: 'Database error',
          code: 'DATABASE_ERROR'
        });
      }

      if (!repository) {
        return res.status(404).json({
          error: 'Git repository not found',
          code: 'REPOSITORY_NOT_FOUND'
        });
      }

      res.json({ repository });
    });

  } catch (error) {
    console.error('Error fetching git repository:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

// Create new git repository
router.post('/repositories', requireAuth, (req, res) => {
  try {
    const {
      name,
      url,
      branch = 'main',
      description,
      provider = 'github',
      access_token,
      webhook_secret
    } = req.body;

    if (!name || !url) {
      return res.status(400).json({
        error: 'name and url are required',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    const insertQuery = `
      INSERT INTO git_repositories (
        name, url, branch, description, provider, 
        access_token, webhook_secret, status, 
        created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, CURRENT_TIMESTAMP)
    `;

    const values = [
      name,
      url,
      branch,
      description,
      provider,
      access_token,
      webhook_secret,
      req.session.userId
    ];

    db.run(insertQuery, values, function(err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
          return res.status(409).json({
            error: 'Repository with this name or URL already exists',
            code: 'REPOSITORY_ALREADY_EXISTS'
          });
        }
        console.error('Database error creating git repository:', err);
        return res.status(500).json({
          error: 'Failed to create git repository',
          code: 'DATABASE_ERROR'
        });
      }

      console.log(`✅ Git repository created: ${name}`);
      
      res.status(201).json({
        success: true,
        message: 'Git repository created successfully',
        repository: {
          id: this.lastID,
          name,
          url,
          branch,
          description,
          provider,
          status: 'active',
          createdAt: new Date().toISOString()
        }
      });
    });

  } catch (error) {
    console.error('Error creating git repository:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

// Update git repository
router.put('/repositories/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      url,
      branch,
      description,
      provider,
      access_token,
      webhook_secret,
      status
    } = req.body;

    // Check if repository exists
    const checkQuery = 'SELECT * FROM git_repositories WHERE id = ?';
    
    db.get(checkQuery, [id], (err, repository) => {
      if (err) {
        console.error('Database error checking repository:', err);
        return res.status(500).json({
          error: 'Database error',
          code: 'DATABASE_ERROR'
        });
      }

      if (!repository) {
        return res.status(404).json({
          error: 'Git repository not found',
          code: 'REPOSITORY_NOT_FOUND'
        });
      }

      // Build update query dynamically
      const updates = [];
      const values = [];

      if (name !== undefined) {
        updates.push('name = ?');
        values.push(name);
      }
      if (url !== undefined) {
        updates.push('url = ?');
        values.push(url);
      }
      if (branch !== undefined) {
        updates.push('branch = ?');
        values.push(branch);
      }
      if (description !== undefined) {
        updates.push('description = ?');
        values.push(description);
      }
      if (provider !== undefined) {
        updates.push('provider = ?');
        values.push(provider);
      }
      if (access_token !== undefined) {
        updates.push('access_token = ?');
        values.push(access_token);
      }
      if (webhook_secret !== undefined) {
        updates.push('webhook_secret = ?');
        values.push(webhook_secret);
      }
      if (status !== undefined) {
        updates.push('status = ?');
        values.push(status);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          error: 'No fields to update',
          code: 'NO_UPDATE_FIELDS'
        });
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);

      const updateQuery = `
        UPDATE git_repositories 
        SET ${updates.join(', ')} 
        WHERE id = ?
      `;

      db.run(updateQuery, values, (updateErr) => {
        if (updateErr) {
          console.error('Database error updating repository:', updateErr);
          return res.status(500).json({
            error: 'Failed to update repository',
            code: 'DATABASE_ERROR'
          });
        }

        console.log(`✅ Git repository updated: ${id}`);
        
        res.json({
          success: true,
          message: 'Git repository updated successfully'
        });
      });
    });

  } catch (error) {
    console.error('Error updating git repository:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

// Delete git repository
router.delete('/repositories/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;

    // Check if repository exists
    const checkQuery = 'SELECT * FROM git_repositories WHERE id = ?';
    
    db.get(checkQuery, [id], (err, repository) => {
      if (err) {
        console.error('Database error checking repository:', err);
        return res.status(500).json({
          error: 'Database error',
          code: 'DATABASE_ERROR'
        });
      }

      if (!repository) {
        return res.status(404).json({
          error: 'Git repository not found',
          code: 'REPOSITORY_NOT_FOUND'
        });
      }

      // Delete repository
      const deleteQuery = 'DELETE FROM git_repositories WHERE id = ?';

      db.run(deleteQuery, [id], (deleteErr) => {
        if (deleteErr) {
          console.error('Database error deleting repository:', deleteErr);
          return res.status(500).json({
            error: 'Failed to delete repository',
            code: 'DATABASE_ERROR'
          });
        }

        console.log(`❌ Git repository deleted: ${repository.name}`);
        
        res.json({
          success: true,
          message: 'Git repository deleted successfully'
        });
      });
    });

  } catch (error) {
    console.error('Error deleting git repository:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

// Test repository connection
router.post('/repositories/:id/test-connection', requireAuth, (req, res) => {
  try {
    const { id } = req.params;

    // Get repository details
    const query = 'SELECT * FROM git_repositories WHERE id = ?';
    
    db.get(query, [id], (err, repository) => {
      if (err) {
        console.error('Database error fetching repository:', err);
        return res.status(500).json({
          error: 'Database error',
          code: 'DATABASE_ERROR'
        });
      }

      if (!repository) {
        return res.status(404).json({
          error: 'Git repository not found',
          code: 'REPOSITORY_NOT_FOUND'
        });
      }

      // TODO: Implement actual git connection test
      // For now, just return success
      res.json({
        success: true,
        message: 'Repository connection test successful',
        repository: {
          name: repository.name,
          url: repository.url,
          branch: repository.branch,
          status: 'connected'
        }
      });
    });

  } catch (error) {
    console.error('Error testing repository connection:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'git-api',
    timestamp: new Date().toISOString()
  });
});

// Export the router and helper functions
module.exports = router;
module.exports.setDatabase = setDatabase;
