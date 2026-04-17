import { createUser, getUserByUsername } from './db.js';

const seed = async () => {
  const username = 'BountyHunter';
  const password = 'BountyHunterTracker';
  const role = 'owner';

  console.log(`Attempting to seed account: ${username}...`);

  try {
    const existing = await getUserByUsername(username);
    if (existing) {
      console.log(`User ${username} already exists. Skipping creation.`);
      process.exit(0);
    }

    await createUser(username, password, role);
    console.log(`✅ Successfully created owner account: ${username}`);
  } catch (error) {
    console.error('❌ Error seeding user:', error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
};

seed();
