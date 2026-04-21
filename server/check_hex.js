import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkHex() {
  const { data, error } = await supabase.from('users').select('*').eq('role', 'supervisor');
  if (error) {
    console.error(error);
    return;
  }
  data.forEach(user => {
    console.log(`User: ${user.username}`);
    console.log(`Hex: ${Buffer.from(user.username).toString('hex')}`);
    console.log(`Pass: ${user.password}`);
    console.log(`Hex: ${Buffer.from(user.password).toString('hex')}`);
  });
}

checkHex();
