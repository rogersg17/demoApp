const Database = require('./database/database');

async function createTestUser() {
  const db = new Database();
  
  try {
    // Wait a moment for database to initialize
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const testUser = {
      username: 'admin',
      email: 'admin@demo.com',
      password: 'admin123',
      first_name: 'Admin',
      last_name: 'User',
      department: 'IT',
      role: 'admin',
      status: 'active'
    };

    console.log('Creating test user...');
    const result = await db.createUser(testUser);
    console.log('✅ Test user created successfully:', {
      id: result.id,
      username: result.username,
      email: result.email,
      role: result.role
    });
    
    console.log('\n🔑 Login credentials:');
    console.log('Username: admin');
    console.log('Password: admin123');
    
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      console.log('ℹ️  Test user already exists');
      console.log('\n🔑 Login credentials:');
      console.log('Username: admin');
      console.log('Password: admin123');
    } else {
      console.error('❌ Error creating test user:', error.message);
    }
  } finally {
    db.close();
  }
}

createTestUser();
