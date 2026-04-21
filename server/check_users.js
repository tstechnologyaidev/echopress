import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
  const { data, error } = await supabase.from('users').select('*');
  if (error) {
    console.error("Error fetching users:", error);
    return;
  }
  console.log("Users in database:");
  data.forEach(user => {
    console.log(`ID: ${user.id}, Username: [${user.username}] (len: ${user.username.length}), Role: [${user.role}], Password: [${user.password}] (len: ${user.password.length}), Status: [${user.status}]`);
  });
}

checkUsers();
