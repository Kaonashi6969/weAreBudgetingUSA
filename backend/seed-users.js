const database = require('./src/db/database');
const { v4: uuidv4 } = require('uuid');

async function createTestUsers() {
  console.log('--- Seeding Test Users ---');
  await database.initialize();

  const testUsers = [
    {
      id: 'test-user-1',
      google_id: 'google-12345',
      email: 'tester1@example.com',
      display_name: 'John Doe',
      profile_pic: 'https://via.placeholder.com/150',
      tier: 'free'
    },
    {
      id: 'test-user-2',
      google_id: 'google-67890',
      email: 'protester@example.com',
      display_name: 'Jane Pro',
      profile_pic: 'https://via.placeholder.com/150',
      tier: 'pro'
    }
  ];

  for (const user of testUsers) {
    try {
      await database.run(
        `INSERT INTO users (id, google_id, email, display_name, profile_pic, tier) 
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(email) DO UPDATE SET display_name=excluded.display_name`,
        [user.id, user.google_id, user.email, user.display_name, user.profile_pic, user.tier]
      );
      console.log(`✅ User created: ${user.email} (${user.tier})`);
    } catch (err) {
      console.error(`❌ Error creating user ${user.email}:`, err.message);
    }
  }

  process.exit(0);
}

createTestUsers();
