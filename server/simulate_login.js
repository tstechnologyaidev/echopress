import { getUserByUsername } from './db.js';
import bcrypt from 'bcryptjs';

async function simulateLogin(username, password) {
  console.log(`Simulating login for [${username}] with password [${password}]...`);
  try {
    const user = await getUserByUsername(username);
    if (!user) {
      console.log("❌ User not found.");
      return;
    }

    console.log(`User found: ID=${user.id}, Role=${user.role}, PasswordInDB=[${user.password}]`);

    let isMatch = false;
    if (user.password.startsWith('$2')) {
      console.log("Using bcrypt comparison...");
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      console.log("Using direct string comparison...");
      isMatch = (password === user.password);
    }

    if (isMatch) {
      console.log("✅ LOGIN SUCCESSFUL!");
    } else {
      console.log("❌ LOGIN FAILED: Password mismatch.");
    }
  } catch (err) {
    console.error("❌ Error during simulation:", err.message);
  }
}

simulateLogin('Lucas Knight', 'EchoPressSupervisor!');
