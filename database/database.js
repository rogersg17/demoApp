const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

class Database {
  constructor() {
    const dbPath = path.join(__dirname, 'app.db');
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
      } else {
        console.log('✅ Connected to SQLite database');
        this.initializeTables();
      }
    });
  }

  initializeTables() {
    // Users table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        department TEXT,
        role TEXT DEFAULT 'user',
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME,
        session_count INTEGER DEFAULT 0,
        avg_session_duration INTEGER DEFAULT 0
      )
    `, (err) => {
      if (err) console.error('Error creating users table:', err);
      else console.log('✅ Users table ready');
    });

    // User sessions table for analytics
    this.db.run(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        login_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        logout_time DATETIME,
        duration INTEGER,
        ip_address TEXT,
        user_agent TEXT,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `, (err) => {
      if (err) console.error('Error creating sessions table:', err);
      else console.log('✅ Sessions table ready');
    });

    // Activity logs table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action TEXT NOT NULL,
        description TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        ip_address TEXT,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `, (err) => {
      if (err) console.error('Error creating activity_logs table:', err);
      else console.log('✅ Activity logs table ready');
    });

    // Azure DevOps integration tables
    this.initializeAdoTables();

    // Insert sample data after tables are created
    setTimeout(() => {
      this.insertSampleData();
    }, 100);
  }

  initializeAdoTables() {
    // Project Configurations table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS project_configurations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        build_definition_id INTEGER UNIQUE,
        ado_project_id TEXT,
        ado_project_name TEXT,
        repository_name TEXT,
        repository_type TEXT,
        path TEXT,
        enabled BOOLEAN DEFAULT 1,
        configuration TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) console.error('Error creating project_configurations table:', err);
      else console.log('✅ Project configurations table ready');
    });

    // ADO Builds table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS ado_builds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ado_build_id INTEGER UNIQUE,
        ado_project_id TEXT,
        build_definition_id INTEGER,
        build_number TEXT,
        status TEXT,
        result TEXT,
        start_time DATETIME,
        finish_time DATETIME,
        duration INTEGER,
        source_branch TEXT,
        source_version TEXT,
        repository_name TEXT,
        definition_name TEXT,
        requested_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) console.error('Error creating ado_builds table:', err);
      else console.log('✅ ADO builds table ready');
    });

    // ADO Test Results table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS ado_test_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ado_build_id INTEGER,
        test_run_id INTEGER,
        run_name TEXT,
        state TEXT,
        total_tests INTEGER,
        passed_tests INTEGER,
        failed_tests INTEGER,
        skipped_tests INTEGER,
        duration_ms INTEGER,
        started_date DATETIME,
        completed_date DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ado_build_id) REFERENCES ado_builds(ado_build_id)
      )
    `, (err) => {
      if (err) console.error('Error creating ado_test_results table:', err);
      else console.log('✅ ADO test results table ready');
    });

    // Project Status Summary table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS project_status (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id TEXT UNIQUE,
        project_name TEXT,
        build_definition_id INTEGER,
        last_build_id INTEGER,
        overall_health TEXT,
        success_rate REAL,
        total_tests INTEGER,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES project_configurations(id)
      )
    `, (err) => {
      if (err) console.error('Error creating project_status table:', err);
      else console.log('✅ Project status table ready');
    });

    // ADO Build Tasks table for detailed build information
    this.db.run(`
      CREATE TABLE IF NOT EXISTS ado_build_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ado_build_id INTEGER,
        task_id TEXT,
        task_name TEXT,
        status TEXT,
        result TEXT,
        start_time DATETIME,
        finish_time DATETIME,
        duration INTEGER,
        error_count INTEGER DEFAULT 0,
        warning_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ado_build_id) REFERENCES ado_builds(ado_build_id)
      )
    `, (err) => {
      if (err) console.error('Error creating ado_build_tasks table:', err);
      else console.log('✅ ADO build tasks table ready');
    });

    // ADO Test Details table for individual test results
    this.db.run(`
      CREATE TABLE IF NOT EXISTS ado_test_details (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        test_run_id INTEGER,
        test_id TEXT,
        test_case_title TEXT,
        outcome TEXT,
        duration_ms INTEGER,
        error_message TEXT,
        stack_trace TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (test_run_id) REFERENCES ado_test_results(test_run_id)
      )
    `, (err) => {
      if (err) console.error('Error creating ado_test_details table:', err);
      else console.log('✅ ADO test details table ready');
    });
  }

  async insertSampleData() {
    // Check if users already exist
    this.db.get("SELECT COUNT(*) as count FROM users", async (err, row) => {
      if (err) {
        console.error('Error checking users:', err);
        return;
      }

      if (row.count === 0) {
        console.log('📝 Inserting sample data...');
        await this.createSampleUsers();
        await this.createSampleSessions();
        await this.createSampleActivityLogs();
        console.log('✅ Sample data inserted successfully');
      }
    });
  }

  async createSampleUsers() {
    const sampleUsers = [
      {
        username: 'admin',
        email: 'admin@example.com',
        password: await bcrypt.hash('admin123', 10),
        first_name: 'Admin',
        last_name: 'User',
        department: 'IT',
        role: 'admin',
        status: 'active'
      },
      {
        username: 'jdoe',
        email: 'john.doe@example.com',
        password: await bcrypt.hash('password123', 10),
        first_name: 'John',
        last_name: 'Doe',
        department: 'Engineering',
        role: 'user',
        status: 'active'
      },
      {
        username: 'jsmith',
        email: 'jane.smith@example.com',
        password: await bcrypt.hash('password123', 10),
        first_name: 'Jane',
        last_name: 'Smith',
        department: 'Marketing',
        role: 'moderator',
        status: 'active'
      },
      {
        username: 'bwilson',
        email: 'bob.wilson@example.com',
        password: await bcrypt.hash('password123', 10),
        first_name: 'Bob',
        last_name: 'Wilson',
        department: 'Sales',
        role: 'user',
        status: 'inactive'
      },
      {
        username: 'mjohnson',
        email: 'mike.johnson@example.com',
        password: await bcrypt.hash('password123', 10),
        first_name: 'Mike',
        last_name: 'Johnson',
        department: 'Engineering',
        role: 'user',
        status: 'pending'
      },
      {
        username: 'swilson',
        email: 'sarah.wilson@example.com',
        password: await bcrypt.hash('password123', 10),
        first_name: 'Sarah',
        last_name: 'Wilson',
        department: 'HR',
        role: 'user',
        status: 'active'
      },
      {
        username: 'dbrown',
        email: 'david.brown@example.com',
        password: await bcrypt.hash('password123', 10),
        first_name: 'David',
        last_name: 'Brown',
        department: 'Finance',
        role: 'user',
        status: 'active'
      },
      {
        username: 'edavis',
        email: 'emma.davis@example.com',
        password: await bcrypt.hash('password123', 10),
        first_name: 'Emma',
        last_name: 'Davis',
        department: 'IT',
        role: 'admin',
        status: 'active'
      }
    ];

    const stmt = this.db.prepare(`
      INSERT INTO users (username, email, password, first_name, last_name, department, role, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    sampleUsers.forEach(user => {
      stmt.run([
        user.username,
        user.email,
        user.password,
        user.first_name,
        user.last_name,
        user.department,
        user.role,
        user.status
      ]);
    });

    stmt.finalize();
  }

  async createSampleSessions() {
    const sessions = [
      { user_id: 1, duration: 3600, login_time: '2024-07-30 09:00:00' },
      { user_id: 1, duration: 2400, login_time: '2024-07-30 14:00:00' },
      { user_id: 2, duration: 5400, login_time: '2024-07-30 08:30:00' },
      { user_id: 2, duration: 1800, login_time: '2024-07-30 16:00:00' },
      { user_id: 3, duration: 4200, login_time: '2024-07-30 10:00:00' },
      { user_id: 6, duration: 2800, login_time: '2024-07-30 11:00:00' },
      { user_id: 7, duration: 3200, login_time: '2024-07-30 13:00:00' },
      { user_id: 8, duration: 4800, login_time: '2024-07-30 15:00:00' }
    ];

    const stmt = this.db.prepare(`
      INSERT INTO user_sessions (user_id, duration, login_time)
      VALUES (?, ?, ?)
    `);

    sessions.forEach(session => {
      stmt.run([session.user_id, session.duration, session.login_time]);
    });

    stmt.finalize();
  }

  async createSampleActivityLogs() {
    const activities = [
      { user_id: 1, action: 'login', description: 'User logged in' },
      { user_id: 1, action: 'view_reports', description: 'Viewed analytics dashboard' },
      { user_id: 2, action: 'login', description: 'User logged in' },
      { user_id: 2, action: 'update_profile', description: 'Updated user profile' },
      { user_id: 3, action: 'login', description: 'User logged in' },
      { user_id: 6, action: 'login', description: 'User logged in' },
      { user_id: 7, action: 'view_users', description: 'Viewed user management page' },
      { user_id: 8, action: 'login', description: 'User logged in' }
    ];

    const stmt = this.db.prepare(`
      INSERT INTO activity_logs (user_id, action, description)
      VALUES (?, ?, ?)
    `);

    activities.forEach(activity => {
      stmt.run([activity.user_id, activity.action, activity.description]);
    });

    stmt.finalize();
  }

  // User methods
  async getAllUsers() {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT id, username, email, first_name, last_name, department, role, status, 
               created_at, last_login, session_count, avg_session_duration
        FROM users
        ORDER BY created_at DESC
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async getUserById(id) {
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT id, username, email, first_name, last_name, department, role, status, 
               created_at, last_login, session_count, avg_session_duration
        FROM users WHERE id = ?
      `, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async getUserByUsername(username) {
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT * FROM users WHERE username = ?
      `, [username], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async createUser(userData) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    return new Promise((resolve, reject) => {
      this.db.run(`
        INSERT INTO users (username, email, password, first_name, last_name, department, role, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userData.username,
        userData.email,
        hashedPassword,
        userData.first_name,
        userData.last_name,
        userData.department,
        userData.role || 'user',
        userData.status || 'active'
      ], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...userData });
      });
    });
  }

  async updateUser(id, userData) {
    return new Promise((resolve, reject) => {
      const fields = [];
      const values = [];
      
      Object.keys(userData).forEach(key => {
        if (userData[key] !== undefined && key !== 'id') {
          fields.push(`${key} = ?`);
          values.push(userData[key]);
        }
      });
      
      if (fields.length === 0) {
        resolve({ id, ...userData });
        return;
      }
      
      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);
      
      this.db.run(`
        UPDATE users SET ${fields.join(', ')} WHERE id = ?
      `, values, function(err) {
        if (err) reject(err);
        else resolve({ id, ...userData });
      });
    });
  }

  async deleteUser(id) {
    return new Promise((resolve, reject) => {
      this.db.run(`DELETE FROM users WHERE id = ?`, [id], function(err) {
        if (err) reject(err);
        else resolve({ deleted: this.changes > 0 });
      });
    });
  }

  // Analytics methods
  async getUserStats() {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT 
          COUNT(*) as total_users,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_users,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_users,
          SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive_users,
          AVG(avg_session_duration) as avg_session_duration
        FROM users
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows[0]);
      });
    });
  }

  async getUsersByDepartment() {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT department, COUNT(*) as count
        FROM users
        WHERE department IS NOT NULL
        GROUP BY department
        ORDER BY count DESC
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async getUsersByRole() {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT role, COUNT(*) as count
        FROM users
        GROUP BY role
        ORDER BY count DESC
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async getUsersByStatus() {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT status, COUNT(*) as count
        FROM users
        GROUP BY status
        ORDER BY count DESC
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async getUserGrowthData() {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as new_users
        FROM users
        WHERE created_at >= date('now', '-30 days')
        GROUP BY DATE(created_at)
        ORDER BY date
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async getUserActivityData() {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT 
          CASE CAST(strftime('%w', timestamp) AS INTEGER)
            WHEN 0 THEN 'Sunday'
            WHEN 1 THEN 'Monday'
            WHEN 2 THEN 'Tuesday'
            WHEN 3 THEN 'Wednesday'
            WHEN 4 THEN 'Thursday'
            WHEN 5 THEN 'Friday'
            WHEN 6 THEN 'Saturday'
          END as day_of_week,
          COUNT(*) as activity_count
        FROM activity_logs
        WHERE timestamp >= date('now', '-7 days')
        GROUP BY strftime('%w', timestamp)
        ORDER BY strftime('%w', timestamp)
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // Session tracking
  async createSession(userId, ipAddress, userAgent) {
    return new Promise((resolve, reject) => {
      this.db.run(`
        INSERT INTO user_sessions (user_id, ip_address, user_agent)
        VALUES (?, ?, ?)
      `, [userId, ipAddress, userAgent], function(err) {
        if (err) reject(err);
        else resolve({ sessionId: this.lastID });
      });
    });
  }

  async endSession(sessionId, duration) {
    return new Promise((resolve, reject) => {
      this.db.run(`
        UPDATE user_sessions 
        SET logout_time = CURRENT_TIMESTAMP, duration = ?
        WHERE id = ?
      `, [duration, sessionId], function(err) {
        if (err) reject(err);
        else resolve({ updated: this.changes > 0 });
      });
    });
  }

  // Activity logging
  async logActivity(userId, action, description, ipAddress) {
    return new Promise((resolve, reject) => {
      this.db.run(`
        INSERT INTO activity_logs (user_id, action, description, ip_address)
        VALUES (?, ?, ?, ?)
      `, [userId, action, description, ipAddress], function(err) {
        if (err) reject(err);
        else resolve({ logId: this.lastID });
      });
    });
  }

  // Azure DevOps methods
  async createProjectConfiguration(projectData) {
    return new Promise((resolve, reject) => {
      this.db.run(`
        INSERT INTO project_configurations (
          id, name, build_definition_id, ado_project_id, ado_project_name,
          repository_name, repository_type, path, enabled, configuration
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        projectData.id,
        projectData.name,
        projectData.buildDefinitionId,
        projectData.adoProjectId,
        projectData.adoProjectName,
        projectData.repositoryName,
        projectData.repositoryType,
        projectData.path,
        projectData.enabled,
        JSON.stringify(projectData.configuration)
      ], function(err) {
        if (err) reject(err);
        else resolve({ id: projectData.id, ...projectData });
      });
    });
  }

  async getProjectConfigurations() {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT * FROM project_configurations WHERE enabled = 1
        ORDER BY created_at DESC
      `, (err, rows) => {
        if (err) reject(err);
        else {
          const projects = rows.map(row => ({
            ...row,
            configuration: JSON.parse(row.configuration || '{}')
          }));
          resolve(projects);
        }
      });
    });
  }

  async updateProjectConfiguration(projectId, updates) {
    return new Promise((resolve, reject) => {
      const fields = [];
      const values = [];
      
      Object.keys(updates).forEach(key => {
        if (updates[key] !== undefined && key !== 'id') {
          if (key === 'configuration') {
            fields.push(`${key} = ?`);
            values.push(JSON.stringify(updates[key]));
          } else {
            fields.push(`${key} = ?`);
            values.push(updates[key]);
          }
        }
      });
      
      if (fields.length === 0) {
        resolve({ id: projectId, ...updates });
        return;
      }
      
      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(projectId);
      
      this.db.run(`
        UPDATE project_configurations SET ${fields.join(', ')} WHERE id = ?
      `, values, function(err) {
        if (err) reject(err);
        else resolve({ id: projectId, ...updates });
      });
    });
  }

  async deleteProjectConfiguration(projectId) {
    return new Promise((resolve, reject) => {
      this.db.run(`DELETE FROM project_configurations WHERE id = ?`, [projectId], function(err) {
        if (err) reject(err);
        else resolve({ deleted: this.changes > 0 });
      });
    });
  }

  async createAdoBuild(buildData) {
    return new Promise((resolve, reject) => {
      this.db.run(`
        INSERT INTO ado_builds (
          ado_build_id, ado_project_id, build_definition_id, build_number,
          status, result, start_time, finish_time, duration, source_branch,
          source_version, repository_name, definition_name, requested_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        buildData.buildId,
        buildData.projectId,
        buildData.buildDefinitionId,
        buildData.buildNumber,
        buildData.status,
        buildData.result,
        buildData.startTime,
        buildData.finishTime,
        buildData.duration,
        buildData.sourceBranch,
        buildData.sourceVersion,
        buildData.repository,
        buildData.definitionName,
        buildData.requestedBy
      ], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...buildData });
      });
    });
  }

  async createAdoTestResult(testResultData) {
    return new Promise((resolve, reject) => {
      this.db.run(`
        INSERT INTO ado_test_results (
          ado_build_id, test_run_id, run_name, state, total_tests,
          passed_tests, failed_tests, skipped_tests, duration_ms,
          started_date, completed_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        testResultData.adoBuildId,
        testResultData.testRunId,
        testResultData.runName,
        testResultData.state,
        testResultData.totalTests,
        testResultData.passedTests,
        testResultData.failedTests,
        testResultData.skippedTests,
        testResultData.durationMs,
        testResultData.startedDate,
        testResultData.completedDate
      ], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...testResultData });
      });
    });
  }

  async getProjectStatus(projectId) {
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT ps.*, pc.name as project_name, pc.build_definition_id
        FROM project_status ps
        JOIN project_configurations pc ON ps.project_id = pc.id
        WHERE ps.project_id = ?
      `, [projectId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async updateProjectStatus(projectId, statusData) {
    return new Promise((resolve, reject) => {
      this.db.run(`
        INSERT OR REPLACE INTO project_status (
          project_id, project_name, build_definition_id, last_build_id,
          overall_health, success_rate, total_tests, last_updated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        projectId,
        statusData.projectName,
        statusData.buildDefinitionId,
        statusData.lastBuildId,
        statusData.overallHealth,
        statusData.successRate,
        statusData.totalTests
      ], function(err) {
        if (err) reject(err);
        else resolve({ projectId, ...statusData });
      });
    });
  }

  async getRecentBuilds(projectId, limit = 10) {
    return new Promise((resolve, reject) => {
      const query = projectId 
        ? `SELECT * FROM ado_builds WHERE ado_project_id = ? ORDER BY start_time DESC LIMIT ?`
        : `SELECT * FROM ado_builds ORDER BY start_time DESC LIMIT ?`;
      
      const params = projectId ? [projectId, limit] : [limit];
      
      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async getBuildsByDefinition(buildDefinitionId, limit = 50) {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT * FROM ado_builds 
        WHERE build_definition_id = ? 
        ORDER BY start_time DESC 
        LIMIT ?
      `, [buildDefinitionId, limit], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async getTestResultsByBuild(adoBuildId) {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT * FROM ado_test_results 
        WHERE ado_build_id = ?
        ORDER BY started_date DESC
      `, [adoBuildId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async getBuildStatistics(projectId, days = 30) {
    return new Promise((resolve, reject) => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      const query = projectId 
        ? `SELECT 
             COUNT(*) as total_builds,
             SUM(CASE WHEN result = 'succeeded' THEN 1 ELSE 0 END) as successful_builds,
             SUM(CASE WHEN result = 'failed' THEN 1 ELSE 0 END) as failed_builds,
             AVG(duration) as avg_duration
           FROM ado_builds 
           WHERE ado_project_id = ? AND start_time >= ?`
        : `SELECT 
             COUNT(*) as total_builds,
             SUM(CASE WHEN result = 'succeeded' THEN 1 ELSE 0 END) as successful_builds,
             SUM(CASE WHEN result = 'failed' THEN 1 ELSE 0 END) as failed_builds,
             AVG(duration) as avg_duration
           FROM ado_builds 
           WHERE start_time >= ?`;
      
      const params = projectId ? [projectId, cutoffDate.toISOString()] : [cutoffDate.toISOString()];
      
      this.db.get(query, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  close() {
    this.db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Database connection closed.');
      }
    });
  }
}

module.exports = Database;
