import sqlite3 from 'sqlite3';
import bcrypt from 'bcrypt';
import path from 'path';

// Basic type for user data for broader use
interface User {
    id?: number;
    username: string;
    email: string;
    password?: string;
    first_name: string;
    last_name: string;
    department?: string;
    role?: string;
    status?: string;
    created_at?: string;
    updated_at?: string;
    last_login?: string;
    session_count?: number;
    avg_session_duration?: number;
}

interface FlakyTest {
  id?: number;
  test_name: string;
  flaky_score?: number;
  classification?: string;
  confidence?: number;
  last_analyzed?: string;
  pattern_type?: string;
  analysis_data?: any;
  created_at?: string;
  updated_at?: string;
}

class Database {
  db: sqlite3.Database;

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

  initializeTables(): void {
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

    // Flaky test detection tables
    this.initializeFlakyTestTables();

    // ADR-001: TMS tables for test code and metadata separation
    this.initializeTMSTables();

    // MVP ADO integration tables for Week 3
    this.initializeMVPTables();
    this.initializeEnhancedOrchestrationTables();

    // Insert sample data after tables are created
    setTimeout(() => {
      this.insertSampleData();
    }, 100);
  }

  initializeAdoTables(): void {
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

  initializeFlakyTestTables(): void {
    // Flaky test tracking table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS flaky_tests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        test_name TEXT NOT NULL UNIQUE,
        flaky_score REAL DEFAULT 0,
        classification TEXT DEFAULT 'stable',
        confidence REAL DEFAULT 0,
        last_analyzed DATETIME DEFAULT CURRENT_TIMESTAMP,
        pattern_type TEXT,
        analysis_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) console.error('Error creating flaky_tests table:', err);
      else console.log('✅ Flaky tests table ready');
    });

    // Test execution history table for detailed tracking
    this.db.run(`
      CREATE TABLE IF NOT EXISTS test_execution_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        test_name TEXT NOT NULL,
        test_suite TEXT,
        outcome TEXT NOT NULL,
        duration_ms INTEGER,
        error_message TEXT,
        stack_trace TEXT,
        environment TEXT DEFAULT 'default',
        browser TEXT,
        execution_id TEXT,
        build_id TEXT,
        started_at DATETIME,
        completed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) console.error('Error creating test_execution_history table:', err);
      else console.log('✅ Test execution history table ready');
    });

    // Test stability metrics for trend analysis
    this.db.run(`
      CREATE TABLE IF NOT EXISTS test_stability_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        test_name TEXT NOT NULL,
        date DATE NOT NULL,
        total_executions INTEGER DEFAULT 0,
        passed_executions INTEGER DEFAULT 0,
        failed_executions INTEGER DEFAULT 0,
        skipped_executions INTEGER DEFAULT 0,
        pass_rate REAL DEFAULT 0,
        avg_duration_ms REAL DEFAULT 0,
        failure_patterns TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(test_name, date)
      )
    `, (err) => {
      if (err) console.error('Error creating test_stability_metrics table:', err);
      else console.log('✅ Test stability metrics table ready');
    });

    // Flaky test analysis runs for tracking analysis history
    this.db.run(`
      CREATE TABLE IF NOT EXISTS flaky_analysis_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        analysis_type TEXT DEFAULT 'full',
        total_tests INTEGER DEFAULT 0,
        flaky_tests_found INTEGER DEFAULT 0,
        potentially_flaky_tests INTEGER DEFAULT 0,
        stable_tests INTEGER DEFAULT 0,
        analysis_duration_ms INTEGER,
        started_at DATETIME,
        completed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) console.error('Error creating flaky_analysis_runs table:', err);
      else console.log('✅ Flaky analysis runs table ready');
    });
  }

  async insertSampleData(): Promise<void> {
    // Check if users already exist
    this.db.get("SELECT COUNT(*) as count FROM users", async (err, row: { count: number }) => {
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

    // Check if test executions already exist
    this.db.get("SELECT COUNT(*) as count FROM test_executions", async (err, row: { count: number }) => {
      if (err) {
        console.error('Error checking test executions:', err);
        return;
      }

      if (row.count === 0) {
        console.log('📝 Inserting sample test executions...');
        await this.createSampleTestExecutions();
        console.log('✅ Sample test executions inserted successfully');
      }
    });
  }

  async createSampleUsers(): Promise<void> {
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

  async createSampleSessions(): Promise<void> {
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

  async createSampleActivityLogs(): Promise<void> {
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

  async createSampleTestExecutions(): Promise<void> {
    const testExecutions = [
      {
        test_id: 'api_test_001',
        execution_id: 'exec_001',
        platform_type: 'manual',
        status: 'completed',
        start_time: new Date(Date.now() - 120000).toISOString(), // 2 minutes ago
        end_time: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
        duration_ms: 60000,
        metadata: JSON.stringify({ test_type: 'api', endpoint: '/api/users' })
      },
      {
        test_id: 'ui_test_002',
        execution_id: 'exec_002',
        platform_type: 'selenium',
        status: 'failed',
        start_time: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
        end_time: new Date(Date.now() - 240000).toISOString(), // 4 minutes ago
        duration_ms: 60000,
        error_message: 'Element not found: #login-button',
        metadata: JSON.stringify({ test_type: 'ui', browser: 'chrome' })
      },
      {
        test_id: 'integration_test_003',
        execution_id: 'exec_003',
        platform_type: 'docker',
        status: 'running',
        start_time: new Date(Date.now() - 30000).toISOString(), // 30 seconds ago
        metadata: JSON.stringify({ test_type: 'integration', service: 'payment' })
      },
      {
        test_id: 'load_test_004',
        execution_id: 'exec_004',
        platform_type: 'k6',
        status: 'pending',
        metadata: JSON.stringify({ test_type: 'load', users: 100 })
      }
    ];

    const stmt = this.db.prepare(`
      INSERT INTO test_executions (
        test_id, execution_id, platform_type, status, start_time, end_time, 
        duration_ms, error_message, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    testExecutions.forEach(execution => {
      stmt.run([
        execution.test_id,
        execution.execution_id,
        execution.platform_type,
        execution.status,
        execution.start_time || null,
        execution.end_time || null,
        execution.duration_ms || null,
        execution.error_message || null,
        execution.metadata
      ]);
    });

    stmt.finalize();
  }

  // User methods
  async getAllUsers(): Promise<User[]> {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT id, username, email, first_name, last_name, department, role, status, 
               created_at, last_login, session_count, avg_session_duration
        FROM users
        ORDER BY created_at DESC
      `, (err, rows: User[]) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async getUserById(id: number): Promise<User> {
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT id, username, email, first_name, last_name, department, role, status, 
               created_at, last_login, session_count, avg_session_duration
        FROM users WHERE id = ?
      `, [id], (err, row: User) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async getUserByUsername(username: string): Promise<User> {
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT * FROM users WHERE username = ?
      `, [username], (err, row: User) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async createUser(userData: Omit<User, 'id'>): Promise<User> {
    if (!userData.password) {
      return Promise.reject(new Error('Password is required to create a user.'));
    }
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

  async updateUser(id: number, userData: Partial<User>): Promise<Partial<User>> {
    return new Promise((resolve, reject) => {
      const fields: string[] = [];
      const values: any[] = [];
      
      Object.keys(userData).forEach((key) => {
        const userKey = key as keyof User;
        if (userData[userKey] !== undefined && userKey !== 'id') {
          fields.push(`${userKey} = ?`);
          values.push(userData[userKey]);
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

  async deleteUser(id: number): Promise<{ deleted: boolean }> {
    return new Promise((resolve, reject) => {
      this.db.run(`DELETE FROM users WHERE id = ?`, [id], function(err) {
        if (err) reject(err);
        else resolve({ deleted: this.changes > 0 });
      });
    });
  }

  // Analytics methods
  async getUserStats(): Promise<any> {
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

  async getUsersByDepartment(): Promise<any[]> {
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

  async getUsersByRole(): Promise<any[]> {
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

  async getUsersByStatus(): Promise<any[]> {
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

  async getUserGrowthData(): Promise<any[]> {
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

  async getUserActivityData(): Promise<any[]> {
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
  async createSession(userId: number, ipAddress: string, userAgent: string): Promise<{ sessionId: number }> {
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

  async endSession(sessionId: number, duration: number): Promise<{ updated: boolean }> {
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
  async logActivity(userId: number, action: string, description: string, ipAddress: string): Promise<{ logId: number }> {
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
  async createProjectConfiguration(projectData: any): Promise<any> {
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

  async getProjectConfigurations(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT * FROM project_configurations WHERE enabled = 1
        ORDER BY created_at DESC
      `, (err, rows: any[]) => {
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

  async updateProjectConfiguration(projectId: string, updates: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const fields: string[] = [];
      const values: any[] = [];
      
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

  async deleteProjectConfiguration(projectId: string): Promise<{ deleted: boolean }> {
    return new Promise((resolve, reject) => {
      this.db.run(`DELETE FROM project_configurations WHERE id = ?`, [projectId], function(err) {
        if (err) reject(err);
        else resolve({ deleted: this.changes > 0 });
      });
    });
  }

  async createAdoBuild(buildData: any): Promise<any> {
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

  async createAdoTestResult(testResultData: any): Promise<any> {
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

  async getProjectStatus(projectId: string): Promise<any> {
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

  async updateProjectStatus(projectId: string, statusData: any): Promise<any> {
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

  async getRecentBuilds(projectId?: string, limit = 10): Promise<any[]> {
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

  async getBuildsByDefinition(buildDefinitionId: number, limit = 50): Promise<any[]> {
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

  async getTestResultsByBuild(adoBuildId: number): Promise<any[]> {
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

  async getBuildStatistics(projectId?: string, days = 30): Promise<any> {
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

  // Flaky Test Detection methods
  async createTestExecutionRecord(testData: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.run(`
        INSERT INTO test_execution_history (
          test_name, test_suite, outcome, duration_ms, error_message,
          stack_trace, environment, browser, execution_id, build_id,
          started_at, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        testData.testName,
        testData.testSuite,
        testData.outcome,
        testData.durationMs,
        testData.errorMessage,
        testData.stackTrace,
        testData.environment || 'default',
        testData.browser,
        testData.executionId,
        testData.buildId,
        testData.startedAt,
        testData.completedAt
      ], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...testData });
      });
    });
  }

  async getTestExecutionHistory(testName: string, limit = 50): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT * FROM test_execution_history 
        WHERE test_name = ? 
        ORDER BY created_at DESC 
        LIMIT ?
      `, [testName, limit], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async getAllTestExecutionHistory(limit = 1000): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT * FROM test_execution_history 
        ORDER BY created_at DESC 
        LIMIT ?
      `, [limit], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async getAllUniqueTestNames(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT DISTINCT test_name FROM test_execution_history 
        ORDER BY test_name
      `, (err, rows: { test_name: string }[]) => {
        if (err) reject(err);
        else resolve(rows.map(row => row.test_name));
      });
    });
  }

  async upsertFlakyTest(flakyTestData: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.run(`
        INSERT OR REPLACE INTO flaky_tests (
          test_name, flaky_score, classification, confidence,
          pattern_type, analysis_data, last_analyzed, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [
        flakyTestData.testName,
        flakyTestData.flakyScore,
        flakyTestData.classification,
        flakyTestData.confidence,
        flakyTestData.patternType,
        JSON.stringify(flakyTestData.analysisData)
      ], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...flakyTestData });
      });
    });
  }

  async getFlakyTests(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT * FROM flaky_tests 
        ORDER BY flaky_score DESC, last_analyzed DESC
      `, (err, rows: any[]) => {
        if (err) reject(err);
        else {
          const tests = rows.map(row => ({
            ...row,
            analysis_data: row.analysis_data ? JSON.parse(row.analysis_data) : null
          }));
          resolve(tests);
        }
      });
    });
  }

  async getFlakyTestByName(testName: string): Promise<FlakyTest | null> {
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT * FROM flaky_tests WHERE test_name = ?
      `, [testName], (err, row: FlakyTest) => {
        if (err) reject(err);
        else {
          if (row) {
            row.analysis_data = row.analysis_data ? JSON.parse(row.analysis_data as string) : null;
          }
          resolve(row);
        }
      });
    });
  }

  async updateTestStabilityMetrics(metricsData: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.run(`
        INSERT OR REPLACE INTO test_stability_metrics (
          test_name, date, total_executions, passed_executions,
          failed_executions, skipped_executions, pass_rate,
          avg_duration_ms, failure_patterns
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        metricsData.testName,
        metricsData.date,
        metricsData.totalExecutions,
        metricsData.passedExecutions,
        metricsData.failedExecutions,
        metricsData.skippedExecutions,
        metricsData.passRate,
        metricsData.avgDurationMs,
        JSON.stringify(metricsData.failurePatterns)
      ], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...metricsData });
      });
    });
  }

  async getTestStabilityMetrics(testName: string, days = 30): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      this.db.all(`
        SELECT * FROM test_stability_metrics 
        WHERE test_name = ? AND date >= ?
        ORDER BY date DESC
      `, [testName, cutoffDate.toISOString().split('T')[0]], (err, rows: any[]) => {
        if (err) reject(err);
        else {
          const metrics = rows.map(row => ({
            ...row,
            failure_patterns: row.failure_patterns ? JSON.parse(row.failure_patterns) : null
          }));
          resolve(metrics);
        }
      });
    });
  }

  async createFlakyAnalysisRun(runData: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.run(`
        INSERT INTO flaky_analysis_runs (
          analysis_type, total_tests, flaky_tests_found,
          potentially_flaky_tests, stable_tests, analysis_duration_ms,
          started_at, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        runData.analysisType,
        runData.totalTests,
        runData.flakyTestsFound,
        runData.potentiallyFlakyTests,
        runData.stableTests,
        runData.analysisDurationMs,
        runData.startedAt,
        runData.completedAt
      ], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...runData });
      });
    });
  }

  async getRecentFlakyAnalysisRuns(limit = 10): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT * FROM flaky_analysis_runs 
        ORDER BY created_at DESC 
        LIMIT ?
      `, [limit], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async getFlakyTestStatistics(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT 
          COUNT(*) as total_tests,
          SUM(CASE WHEN classification = 'flaky' THEN 1 ELSE 0 END) as flaky_tests,
          SUM(CASE WHEN classification = 'potentially_flaky' THEN 1 ELSE 0 END) as potentially_flaky_tests,
          SUM(CASE WHEN classification = 'stable' THEN 1 ELSE 0 END) as stable_tests,
          AVG(flaky_score) as avg_flaky_score,
          MAX(last_analyzed) as last_analysis_date
        FROM flaky_tests
      `, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  get(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          console.error('DB GET Error:', err);
          reject(err);
        }
        else resolve(row);
      });
    });
  }

  all(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('DB ALL Error:', err);
          reject(err);
        }
        else resolve(rows);
      });
    });
  }

  run(sql: string, params: any[] = []): Promise<{ lastID: number, changes: number }> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          console.error('DB RUN Error:', err);
          reject(err);
        }
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  close(): void {
    this.db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Database connection closed.');
      }
    });
  }

  // ADR-001: Initialize TMS tables for test code and metadata separation
  initializeTMSTables(): void {
    // Git repositories table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS git_repositories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        default_branch TEXT DEFAULT 'main',
        webhook_secret TEXT,
        last_sync DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) console.error('Error creating git_repositories table:', err);
      else console.log('✅ Git repositories table ready');
    });

    // Test metadata table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS test_metadata (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        test_id TEXT UNIQUE NOT NULL,
        file_path TEXT NOT NULL,
        test_name TEXT NOT NULL,
        description TEXT,
        tags TEXT, -- JSON string for tags array
        priority TEXT DEFAULT 'medium',
        owner TEXT,
        repository_id INTEGER,
        line_number INTEGER,
        test_type TEXT DEFAULT 'functional',
        framework TEXT,
        created_from_execution BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (repository_id) REFERENCES git_repositories(id)
      )
    `, (err) => {
      if (err) console.error('Error creating test_metadata table:', err);
      else console.log('✅ Test metadata table ready');
    });

    // Platform integrations table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS platform_integrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform_type TEXT NOT NULL, -- 'jira', 'ado', 'github', 'gitlab'
        configuration TEXT NOT NULL, -- JSON string for configuration
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) console.error('Error creating platform_integrations table:', err);
      else console.log('✅ Platform integrations table ready');
    });

    // Test executions table (correlates test metadata with platform executions)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS test_executions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        command TEXT NOT NULL,
        environment TEXT DEFAULT 'default',
        status TEXT DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed', 'cancelled'
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        started_at DATETIME,
        completed_at DATETIME,
        exit_code INTEGER,
        output TEXT,
        error_output TEXT,
        logs TEXT,
        metadata TEXT, -- JSON string for additional metadata
        test_id TEXT,
        execution_id TEXT,
        platform_type TEXT,
        platform_execution_id TEXT,
        start_time DATETIME,
        end_time DATETIME,
        duration_ms INTEGER,
        error_message TEXT,
        FOREIGN KEY (created_by) REFERENCES users(id),
        FOREIGN KEY (test_id) REFERENCES test_metadata(test_id)
      )
    `, (err) => {
      if (err) console.error('Error creating test_executions table:', err);
      else console.log('✅ Test executions table ready');
    });

    // Test file changes tracking
    this.db.run(`
      CREATE TABLE IF NOT EXISTS test_file_changes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        repository_id INTEGER NOT NULL,
        file_path TEXT NOT NULL,
        change_type TEXT NOT NULL, -- 'added', 'modified', 'removed'
        commit_hash TEXT,
        commit_author TEXT,
        commit_message TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        processed BOOLEAN DEFAULT 0,
        FOREIGN KEY (repository_id) REFERENCES git_repositories(id)
      )
    `, (err) => {
      if (err) console.error('Error creating test_file_changes table:', err);
      else console.log('✅ Test file changes table ready');
    });

    // Create indexes for better performance after a short delay to ensure tables are created
    setTimeout(() => this.createTMSIndexes(), 100);
  }

  createTMSIndexes(): void {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_test_metadata_test_id ON test_metadata(test_id)',
      'CREATE INDEX IF NOT EXISTS idx_test_metadata_file_path ON test_metadata(file_path)', 
      'CREATE INDEX IF NOT EXISTS idx_test_metadata_repository_id ON test_metadata(repository_id)',
      'CREATE INDEX IF NOT EXISTS idx_test_executions_test_id ON test_executions(test_id)',
      'CREATE INDEX IF NOT EXISTS idx_test_executions_platform_type ON test_executions(platform_type)',
      'CREATE INDEX IF NOT EXISTS idx_test_executions_status ON test_executions(status)',
      'CREATE INDEX IF NOT EXISTS idx_test_file_changes_repository_id ON test_file_changes(repository_id)',
      'CREATE INDEX IF NOT EXISTS idx_test_file_changes_processed ON test_file_changes(processed)',
      'CREATE INDEX IF NOT EXISTS idx_git_repositories_name ON git_repositories(name)'
    ];

    indexes.forEach(indexSql => {
      this.db.run(indexSql, (err) => {
        if (err) {
          // Only log error if it's not a "table doesn't exist" error
          if (!err.message.includes('no such table')) {
            console.error('Error creating index:', err);
          }
        }
      });
    });
  }

  // Initialize MVP tables for Azure DevOps integration (Week 3)
  initializeMVPTables(): void {
    // MVP Pipeline Configurations table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS mvp_pipeline_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        active BOOLEAN DEFAULT 1,
        ado_organization_url TEXT NOT NULL,
        ado_project_id TEXT NOT NULL,
        ado_project_name TEXT NOT NULL,
        build_definition_id INTEGER NOT NULL,
        build_definition_name TEXT NOT NULL,
        build_definition_path TEXT,
        polling_interval_minutes INTEGER DEFAULT 5,
        monitor_enabled BOOLEAN DEFAULT 1,
        failure_threshold INTEGER DEFAULT 1,
        jira_project_key TEXT,
        jira_issue_type TEXT DEFAULT 'Bug',
        auto_create_issues BOOLEAN DEFAULT 1,
        webhook_url TEXT,
        notification_enabled BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER,
        last_monitored_at DATETIME,
        UNIQUE(ado_organization_url, ado_project_id, build_definition_id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `, (err) => {
      if (err) console.error('Error creating mvp_pipeline_configs table:', err);
      else console.log('✅ MVP Pipeline configs table ready');
    });

    // MVP Test Failures table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS mvp_test_failures (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pipeline_config_id INTEGER NOT NULL,
        ado_build_id INTEGER NOT NULL,
        ado_build_number TEXT NOT NULL,
        ado_build_status TEXT NOT NULL,
        ado_build_result TEXT,
        ado_build_url TEXT,
        ado_build_started_at DATETIME,
        ado_build_finished_at DATETIME,
        test_run_id INTEGER,
        test_case_id INTEGER,
        test_name TEXT NOT NULL,
        test_class_name TEXT,
        test_method_name TEXT,
        test_file_path TEXT,
        failure_type TEXT,
        failure_message TEXT,
        failure_stack_trace TEXT,
        failure_category TEXT,
        branch_name TEXT,
        commit_sha TEXT,
        commit_message TEXT,
        environment TEXT,
        test_metadata_id INTEGER,
        correlation_confidence REAL DEFAULT 0.0,
        processed BOOLEAN DEFAULT 0,
        jira_issue_created BOOLEAN DEFAULT 0,
        duplicate_of INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pipeline_config_id) REFERENCES mvp_pipeline_configs(id) ON DELETE CASCADE,
        FOREIGN KEY (test_metadata_id) REFERENCES test_metadata(id),
        FOREIGN KEY (duplicate_of) REFERENCES mvp_test_failures(id)
      )
    `, (err) => {
      if (err) console.error('Error creating mvp_test_failures table:', err);
      else console.log('✅ MVP Test failures table ready');
    });

    // MVP JIRA-ADO Links table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS mvp_jira_ado_links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        jira_issue_key TEXT NOT NULL,
        jira_issue_id TEXT,
        jira_project_key TEXT NOT NULL,
        jira_issue_type TEXT,
        jira_issue_status TEXT,
        jira_issue_url TEXT,
        test_failure_id INTEGER NOT NULL,
        pipeline_config_id INTEGER NOT NULL,
        link_type TEXT DEFAULT 'auto_created',
        created_by_automation BOOLEAN DEFAULT 1,
        issue_title TEXT,
        issue_description TEXT,
        issue_priority TEXT,
        issue_assignee TEXT,
        resolved BOOLEAN DEFAULT 0,
        resolved_at DATETIME,
        resolution_type TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (test_failure_id) REFERENCES mvp_test_failures(id) ON DELETE CASCADE,
        FOREIGN KEY (pipeline_config_id) REFERENCES mvp_pipeline_configs(id) ON DELETE CASCADE,
        UNIQUE(jira_issue_key, test_failure_id)
      )
    `, (err) => {
      if (err) console.error('Error creating mvp_jira_ado_links table:', err);
      else console.log('✅ MVP JIRA-ADO links table ready');
    });

    // MVP Build Monitoring Log table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS mvp_build_monitoring_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pipeline_config_id INTEGER NOT NULL,
        event_type TEXT NOT NULL,
        event_status TEXT NOT NULL,
        event_message TEXT,
        event_details TEXT,
        ado_build_id INTEGER,
        ado_build_number TEXT,
        processing_duration_ms INTEGER,
        api_calls_made INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pipeline_config_id) REFERENCES mvp_pipeline_configs(id) ON DELETE CASCADE
      )
    `, (err) => {
      if (err) console.error('Error creating mvp_build_monitoring_log table:', err);
      else console.log('✅ MVP Build monitoring log table ready');
    });

    // Create MVP indexes and views after a short delay
    setTimeout(() => this.createMVPIndexesAndViews(), 200);
  }

  createMVPIndexesAndViews(): void {
    // Indexes for MVP tables
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_mvp_pipeline_configs_active ON mvp_pipeline_configs(active)',
      'CREATE INDEX IF NOT EXISTS idx_mvp_pipeline_configs_monitor_enabled ON mvp_pipeline_configs(monitor_enabled)',
      'CREATE INDEX IF NOT EXISTS idx_mvp_pipeline_configs_ado_org_project ON mvp_pipeline_configs(ado_organization_url, ado_project_id)',
      'CREATE INDEX IF NOT EXISTS idx_mvp_pipeline_configs_build_def ON mvp_pipeline_configs(build_definition_id)',
      'CREATE INDEX IF NOT EXISTS idx_mvp_test_failures_pipeline_config ON mvp_test_failures(pipeline_config_id)',
      'CREATE INDEX IF NOT EXISTS idx_mvp_test_failures_ado_build ON mvp_test_failures(ado_build_id)',
      'CREATE INDEX IF NOT EXISTS idx_mvp_test_failures_processed ON mvp_test_failures(processed)',
      'CREATE INDEX IF NOT EXISTS idx_mvp_test_failures_jira_created ON mvp_test_failures(jira_issue_created)',
      'CREATE INDEX IF NOT EXISTS idx_mvp_test_failures_test_name ON mvp_test_failures(test_name)',
      'CREATE INDEX IF NOT EXISTS idx_mvp_test_failures_created_at ON mvp_test_failures(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_mvp_test_failures_duplicate ON mvp_test_failures(duplicate_of)',
      'CREATE INDEX IF NOT EXISTS idx_mvp_jira_ado_links_jira_key ON mvp_jira_ado_links(jira_issue_key)',
      'CREATE INDEX IF NOT EXISTS idx_mvp_jira_ado_links_test_failure ON mvp_jira_ado_links(test_failure_id)',
      'CREATE INDEX IF NOT EXISTS idx_mvp_jira_ado_links_pipeline_config ON mvp_jira_ado_links(pipeline_config_id)',
      'CREATE INDEX IF NOT EXISTS idx_mvp_jira_ado_links_resolved ON mvp_jira_ado_links(resolved)',
      'CREATE INDEX IF NOT EXISTS idx_mvp_monitoring_log_pipeline_config ON mvp_build_monitoring_log(pipeline_config_id)',
      'CREATE INDEX IF NOT EXISTS idx_mvp_monitoring_log_event_type ON mvp_build_monitoring_log(event_type)',
      'CREATE INDEX IF NOT EXISTS idx_mvp_monitoring_log_created_at ON mvp_build_monitoring_log(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_mvp_monitoring_log_ado_build ON mvp_build_monitoring_log(ado_build_id)'
    ];

    indexes.forEach(indexSql => {
      this.db.run(indexSql, (err) => {
        if (err && !err.message.includes('no such table')) {
          console.error('Error creating MVP index:', err);
        }
      });
    });

    // Create MVP views
    this.db.run(`
      CREATE VIEW IF NOT EXISTS mvp_pipeline_health_summary AS
      SELECT 
        pc.id as pipeline_config_id,
        pc.name as pipeline_name,
        pc.ado_project_name,
        pc.build_definition_name,
        pc.active,
        pc.monitor_enabled,
        pc.last_monitored_at,
        COUNT(tf.id) as total_failures,
        COUNT(CASE WHEN tf.created_at > datetime('now', '-24 hours') THEN 1 END) as failures_24h,
        COUNT(CASE WHEN tf.created_at > datetime('now', '-7 days') THEN 1 END) as failures_7d,
        COUNT(CASE WHEN tf.jira_issue_created = 1 THEN 1 END) as jira_issues_created,
        MAX(tf.created_at) as last_failure_at
      FROM mvp_pipeline_configs pc
      LEFT JOIN mvp_test_failures tf ON pc.id = tf.pipeline_config_id
      GROUP BY pc.id, pc.name, pc.ado_project_name, pc.build_definition_name, pc.active, pc.monitor_enabled, pc.last_monitored_at
    `, (err) => {
      if (err) console.error('Error creating mvp_pipeline_health_summary view:', err);
      else console.log('✅ MVP Pipeline health summary view ready');
    });

    this.db.run(`
      CREATE VIEW IF NOT EXISTS mvp_recent_failures_with_jira AS
      SELECT 
        tf.id,
        tf.test_name,
        tf.failure_type,
        tf.failure_message,
        tf.ado_build_number,
        tf.ado_build_url,
        tf.branch_name,
        tf.created_at as failure_time,
        pc.name as pipeline_name,
        pc.ado_project_name,
        jal.jira_issue_key,
        jal.jira_issue_status,
        jal.jira_issue_url,
        CASE 
          WHEN jal.id IS NOT NULL THEN 'JIRA Issue Created'
          WHEN tf.duplicate_of IS NOT NULL THEN 'Duplicate Failure'
          WHEN tf.processed = 1 THEN 'Processed - No Issue Created'
          ELSE 'Pending Processing'
        END as jira_status
      FROM mvp_test_failures tf
      JOIN mvp_pipeline_configs pc ON tf.pipeline_config_id = pc.id
      LEFT JOIN mvp_jira_ado_links jal ON tf.id = jal.test_failure_id
      WHERE tf.created_at > datetime('now', '-30 days')
      ORDER BY tf.created_at DESC
    `, (err) => {
      if (err) console.error('Error creating mvp_recent_failures_with_jira view:', err);
      else console.log('✅ MVP Recent failures with JIRA view ready');
    });
  }

  // Initialize Enhanced Orchestration tables for Week 11
  initializeEnhancedOrchestrationTables(): void {
    // Test Runners table - Track registered test runners and their capabilities
    this.db.run(`
      CREATE TABLE IF NOT EXISTS test_runners (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL, -- 'github-actions', 'azure-devops', 'jenkins', 'gitlab', 'docker', 'custom'
        endpoint_url TEXT,
        webhook_url TEXT,
        status TEXT DEFAULT 'inactive', -- 'active', 'inactive', 'error', 'maintenance'
        capabilities TEXT, -- JSON string of runner capabilities
        max_concurrent_jobs INTEGER DEFAULT 1,
        current_jobs INTEGER DEFAULT 0,
        priority INTEGER DEFAULT 50, -- Higher number = higher priority
        health_check_url TEXT,
        last_health_check DATETIME,
        health_status TEXT DEFAULT 'unknown', -- 'healthy', 'unhealthy', 'unknown'
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT -- JSON for additional runner-specific data
      )
    `, (err) => {
      if (err) console.error('Error creating test_runners table:', err);
      else console.log('✅ Test runners table ready');
    });

    // Execution Queue table - Manage test execution requests with priority and scheduling
    this.db.run(`
      CREATE TABLE IF NOT EXISTS execution_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        execution_id TEXT UNIQUE NOT NULL,
        test_suite TEXT NOT NULL,
        environment TEXT NOT NULL,
        priority INTEGER DEFAULT 50, -- Higher number = higher priority
        estimated_duration INTEGER, -- Estimated duration in seconds
        requested_runner_type TEXT,
        requested_runner_id INTEGER,
        assigned_runner_id INTEGER,
        status TEXT DEFAULT 'queued', -- 'queued', 'assigned', 'running', 'completed', 'failed', 'cancelled', 'timeout'
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        assigned_at DATETIME,
        started_at DATETIME,
        completed_at DATETIME,
        timeout_at DATETIME,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        metadata TEXT, -- JSON for execution parameters
        FOREIGN KEY (assigned_runner_id) REFERENCES test_runners(id)
      )
    `, (err) => {
      if (err) console.error('Error creating execution_queue table:', err);
      else console.log('✅ Execution queue table ready');
    });

    // Resource Allocations table - Track resource usage and allocation
    this.db.run(`
      CREATE TABLE IF NOT EXISTS resource_allocations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        runner_id INTEGER NOT NULL,
        execution_id TEXT NOT NULL,
        allocated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        released_at DATETIME,
        cpu_allocation REAL, -- Percentage of CPU allocated
        memory_allocation INTEGER, -- MB of memory allocated
        status TEXT DEFAULT 'allocated', -- 'allocated', 'released', 'exceeded'
        FOREIGN KEY (runner_id) REFERENCES test_runners(id)
      )
    `, (err) => {
      if (err) console.error('Error creating resource_allocations table:', err);
      else console.log('✅ Resource allocations table ready');
    });

    // Execution Metrics table - Performance and monitoring data
    this.db.run(`
      CREATE TABLE IF NOT EXISTS execution_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        execution_id TEXT NOT NULL,
        runner_id INTEGER,
        metric_type TEXT NOT NULL, -- 'queue_time', 'execution_time', 'setup_time', 'teardown_time'
        metric_value REAL NOT NULL,
        metric_unit TEXT DEFAULT 'seconds',
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT, -- JSON for additional metric data
        FOREIGN KEY (runner_id) REFERENCES test_runners(id)
      )
    `, (err) => {
      if (err) console.error('Error creating execution_metrics table:', err);
      else console.log('✅ Execution metrics table ready');
    });

    // Runner Health History table - Track runner health over time
    this.db.run(`
      CREATE TABLE IF NOT EXISTS runner_health_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        runner_id INTEGER NOT NULL,
        health_status TEXT NOT NULL, -- 'healthy', 'unhealthy', 'degraded', 'offline'
        response_time REAL, -- Health check response time in ms
        error_message TEXT,
        cpu_usage REAL,
        memory_usage REAL,
        disk_usage REAL,
        active_jobs INTEGER,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (runner_id) REFERENCES test_runners(id)
      )
    `, (err) => {
      if (err) console.error('Error creating runner_health_history table:', err);
      else console.log('✅ Runner health history table ready');
    });

    // Load Balancing Rules table - Define load balancing strategies
    this.db.run(`
      CREATE TABLE IF NOT EXISTS load_balancing_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        rule_type TEXT NOT NULL, -- 'round_robin', 'priority_based', 'resource_based', 'custom'
        test_suite_pattern TEXT, -- Pattern to match test suites
        environment_pattern TEXT, -- Pattern to match environments
        runner_type_filter TEXT, -- Filter by runner type
        priority INTEGER DEFAULT 50,
        active BOOLEAN DEFAULT 1,
        rule_config TEXT, -- JSON configuration for the rule
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) console.error('Error creating load_balancing_rules table:', err);
      else console.log('✅ Load balancing rules table ready');
    });

    // Parallel Execution Coordination table - Track sharded/parallel executions
    this.db.run(`
      CREATE TABLE IF NOT EXISTS parallel_executions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        parent_execution_id TEXT NOT NULL,
        shard_id TEXT NOT NULL,
        shard_index INTEGER NOT NULL,
        total_shards INTEGER NOT NULL,
        runner_id INTEGER,
        status TEXT DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed', 'cancelled'
        started_at DATETIME,
        completed_at DATETIME,
        test_results TEXT, -- JSON with test results for this shard
        artifacts_url TEXT,
        error_message TEXT,
        FOREIGN KEY (runner_id) REFERENCES test_runners(id)
      )
    `, (err) => {
      if (err) console.error('Error creating parallel_executions table:', err);
      else console.log('✅ Parallel executions table ready');
    });

    // Create indexes for performance
    this.createOrchestrationIndexes();
  }

  createOrchestrationIndexes(): void {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_execution_queue_status ON execution_queue(status)',
      'CREATE INDEX IF NOT EXISTS idx_execution_queue_priority ON execution_queue(priority DESC)',
      'CREATE INDEX IF NOT EXISTS idx_execution_queue_created_at ON execution_queue(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_test_runners_status ON test_runners(status)',
      'CREATE INDEX IF NOT EXISTS idx_test_runners_type ON test_runners(type)',
      'CREATE INDEX IF NOT EXISTS idx_resource_allocations_runner ON resource_allocations(runner_id)',
      'CREATE INDEX IF NOT EXISTS idx_execution_metrics_execution_id ON execution_metrics(execution_id)',
      'CREATE INDEX IF NOT EXISTS idx_runner_health_timestamp ON runner_health_history(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_parallel_executions_parent ON parallel_executions(parent_execution_id)',
      'CREATE INDEX IF NOT EXISTS idx_parallel_executions_status ON parallel_executions(status)'
    ];

    indexes.forEach((indexSql, i) => {
      this.db.run(indexSql, (err) => {
        if (err) console.error(`Error creating orchestration index ${i + 1}:`, err);
        else console.log(`✅ Orchestration index ${i + 1} ready`);
      });
    });
  }

  // TMS Database Methods

  // Git Repository Methods
  createGitRepository(repositoryData: any): Promise<number> {
    return new Promise((resolve, reject) => {
      const { name, url, default_branch, webhook_secret } = repositoryData;
      this.db.run(`
        INSERT INTO git_repositories (name, url, default_branch, webhook_secret)
        VALUES (?, ?, ?, ?)
      `, [name, url, default_branch, webhook_secret], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  getGitRepository(id: number): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT * FROM git_repositories WHERE id = ?
      `, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  getAllGitRepositories(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT * FROM git_repositories ORDER BY created_at DESC
      `, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  updateGitRepository(id: number, updates: any): Promise<number> {
    return new Promise((resolve, reject) => {
      const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updates);
      values.push(id);

      this.db.run(`
        UPDATE git_repositories 
        SET ${fields}, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, values, function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

  updateGitRepositorySync(id: number): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.run(`
        UPDATE git_repositories 
        SET last_sync = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [id], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

  deleteGitRepository(id: number): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.run(`
        DELETE FROM git_repositories WHERE id = ?
      `, [id], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

  // Test Metadata Methods
  createOrUpdateTestMetadata(testData: any): Promise<number> {
    return new Promise((resolve, reject) => {
      const {
        test_id, file_path, test_name, description, tags, priority,
        owner, repository_id, line_number, test_type, framework, created_from_execution
      } = testData;

      const tagsJson = Array.isArray(tags) ? JSON.stringify(tags) : tags;

      this.db.run(`
        INSERT OR REPLACE INTO test_metadata 
        (test_id, file_path, test_name, description, tags, priority, owner, 
         repository_id, line_number, test_type, framework, created_from_execution, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [test_id, file_path, test_name, description, tagsJson, priority, 
          owner, repository_id, line_number, test_type, framework, created_from_execution || 0], 
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  getTestMetadata(testId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT * FROM test_metadata WHERE test_id = ?
      `, [testId], (err, row: any) => {
        if (err) reject(err);
        else {
          if (row && row.tags) {
            try {
              row.tags = JSON.parse(row.tags);
            } catch (e) {
              row.tags = [];
            }
          }
          resolve(row);
        }
      });
    });
  }

  getAllTestMetadata(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT * FROM test_metadata ORDER BY updated_at DESC
      `, [], (err, rows: any[]) => {
        if (err) reject(err);
        else {
          rows.forEach(row => {
            if (row.tags) {
              try {
                row.tags = JSON.parse(row.tags);
              } catch (e) {
                row.tags = [];
              }
            }
          });
          resolve(rows);
        }
      });
    });
  }

  getTestsByRepository(repositoryId: number): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT * FROM test_metadata 
        WHERE repository_id = ? 
        ORDER BY file_path, test_name
      `, [repositoryId], (err, rows: any[]) => {
        if (err) reject(err);
        else {
          rows.forEach(row => {
            if (row.tags) {
              try {
                row.tags = JSON.parse(row.tags);
              } catch (e) {
                row.tags = [];
              }
            }
          });
          resolve(rows);
        }
      });
    });
  }

  removeTestsByFilePath(repositoryId: number, filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.run(`
        DELETE FROM test_metadata 
        WHERE repository_id = ? AND file_path = ?
      `, [repositoryId, filePath], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

  deactivateTestsByFilePath(repositoryId: number, filePath: string): Promise<number> {
    // For now, we'll delete them. In the future, we might want to mark as inactive
    return this.removeTestsByFilePath(repositoryId, filePath);
  }

  searchTests(criteria: any): Promise<any[]> {
    return new Promise((resolve, reject) => {
      let sql = 'SELECT * FROM test_metadata WHERE 1=1';
      const params: any[] = [];

      if (criteria.testName) {
        sql += ' AND test_name LIKE ?';
        params.push(`%${criteria.testName}%`);
      }

      if (criteria.filePath) {
        sql += ' AND file_path LIKE ?';
        params.push(`%${criteria.filePath}%`);
      }

      if (criteria.framework) {
        sql += ' AND framework = ?';
        params.push(criteria.framework);
      }

      if (criteria.testType) {
        sql += ' AND test_type = ?';
        params.push(criteria.testType);
      }

      if (criteria.repositoryId) {
        sql += ' AND repository_id = ?';
        params.push(criteria.repositoryId);
      }

      sql += ' ORDER BY updated_at DESC';

      if (criteria.limit) {
        sql += ' LIMIT ?';
        params.push(criteria.limit);
      }

      this.db.all(sql, params, (err, rows: any[]) => {
        if (err) reject(err);
        else {
          rows.forEach(row => {
            if (row.tags) {
              try {
                row.tags = JSON.parse(row.tags);
              } catch (e) {
                row.tags = [];
              }
            }
          });
          resolve(rows);
        }
      });
    });
  }

  // Test Execution Methods
  createTestExecution(executionData: any): Promise<number> {
    return new Promise((resolve, reject) => {
      const {
        test_id, execution_id, platform_type, platform_execution_id,
        status, start_time, end_time, duration_ms, error_message, metadata
      } = executionData;

      const metadataJson = typeof metadata === 'object' ? JSON.stringify(metadata) : metadata;

      this.db.run(`
        INSERT INTO test_executions 
        (test_id, execution_id, platform_type, platform_execution_id, status, 
         start_time, end_time, duration_ms, error_message, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [test_id, execution_id, platform_type, platform_execution_id, status,
          start_time, end_time, duration_ms, error_message, metadataJson], 
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  getTestExecutions(testId: string, limit = 50): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT * FROM test_executions 
        WHERE test_id = ? 
        ORDER BY created_at DESC 
        LIMIT ?
      `, [testId, limit], (err, rows: any[]) => {
        if (err) reject(err);
        else {
          rows.forEach(row => {
            if (row.metadata) {
              try {
                row.metadata = JSON.parse(row.metadata);
              } catch (e) {
                row.metadata = {};
              }
            }
          });
          resolve(rows);
        }
      });
    });
  }

  // Platform Integration Methods
  createPlatformIntegration(integrationData: any): Promise<number> {
    return new Promise((resolve, reject) => {
      const { platform_type, configuration, is_active } = integrationData;
      const configJson = typeof configuration === 'object' ? JSON.stringify(configuration) : configuration;

      this.db.run(`
        INSERT INTO platform_integrations (platform_type, configuration, is_active)
        VALUES (?, ?, ?)
      `, [platform_type, configJson, is_active || 1], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  getPlatformIntegrations(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT * FROM platform_integrations 
        WHERE is_active = 1 
        ORDER BY platform_type
      `, [], (err, rows: any[]) => {
        if (err) reject(err);
        else {
          rows.forEach(row => {
            if (row.configuration) {
              try {
                row.configuration = JSON.parse(row.configuration);
              } catch (e) {
                row.configuration = {};
              }
            }
          });
          resolve(rows);
        }
      });
    });
  }

  // Test File Changes Methods
  recordTestFileChange(changeData: any): Promise<number> {
    return new Promise((resolve, reject) => {
      const {
        repository_id, file_path, change_type, commit_hash,
        commit_author, commit_message, timestamp
      } = changeData;

      this.db.run(`
        INSERT INTO test_file_changes 
        (repository_id, file_path, change_type, commit_hash, commit_author, commit_message, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [repository_id, file_path, change_type, commit_hash, commit_author, commit_message, timestamp], 
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  getUnprocessedTestFileChanges(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT * FROM test_file_changes 
        WHERE processed = 0 
        ORDER BY timestamp ASC
      `, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  markTestFileChangeProcessed(id: number): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.run(`
        UPDATE test_file_changes 
        SET processed = 1 
        WHERE id = ?
      `, [id], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }
}

export default Database;
 
