const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'app.db');
const db = new sqlite3.Database(dbPath);

console.log('Checking test_executions table structure...');

// Get table schema
db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='test_executions'", (err, row) => {
  if (err) {
    console.error('Error getting table schema:', err);
  } else if (row) {
    console.log('Table schema:');
    console.log(row.sql);
  } else {
    console.log('Table test_executions not found');
  }

  // Get column info
  db.all("PRAGMA table_info(test_executions)", (err, columns) => {
    if (err) {
      console.error('Error getting column info:', err);
    } else {
      console.log('\nColumn information:');
      columns.forEach(col => {
        console.log(`- ${col.name}: ${col.type} (nullable: ${!col.notnull})`);
      });
    }

    // Count rows
    db.get("SELECT COUNT(*) as count FROM test_executions", (err, count) => {
      if (err) {
        console.error('Error counting rows:', err);
      } else {
        console.log(`\nRow count: ${count.count}`);
      }

      db.close();
    });
  });
});
