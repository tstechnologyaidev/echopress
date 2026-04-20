import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Deleting all articles...");
  const { data: articles } = await supabase.from('articles').select('id');
  if (articles && articles.length > 0) {
    const ids = articles.map(a => a.id);
    const { error } = await supabase.from('articles').delete().in('id', ids);
    if (error) console.error("Error deleting articles:", error.message);
    else console.log(`Deleted ${ids.length} articles.`);
  } else {
    console.log("No articles found.");
  }

  console.log("Deleting public accounts...");
  const { data: users } = await supabase.from('users').select('id').eq('role', 'user');
  if (users && users.length > 0) {
    const ids = users.map(u => u.id);
    const { error } = await supabase.from('users').delete().in('id', ids);
    if (error) console.error("Error deleting users:", error.message);
    else console.log(`Deleted ${ids.length} public accounts.`);
  } else {
    console.log("No public accounts found.");
  }
}

run();
