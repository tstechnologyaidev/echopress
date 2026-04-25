import { getUsers } from './db.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function dumpUsers() {
  try {
    const users = await getUsers();
    console.log("TOTAL USERS:", users.length);
    users.forEach(u => {
      console.log(`ID: [${u.id}] | Username: ${u.username} | Role: ${u.role} | Pwd: ${u.password}`);
    });
    process.exit(0);
  } catch (err) {
    console.error("DUMP ERROR:", err.message);
    process.exit(1);
  }
}

dumpUsers();
