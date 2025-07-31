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

    // Insert sample data after tables are created
    setTimeout(() => {
      this.insertSampleData();
    }, 100);
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
