import { supabase } from './db.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const weirdId = '{"author":"EchoPress","author_username":"EchoPressOwner","surtitle":"Nature","title":"Beauté de la nature : soleil, plage, montagnes, vue aérienne","category":"videos","sub_category":"Évasion","image":"https://www.youtube.com/watch?v=meUfty65zJ8","image_credit":"YouTube / Nature Relax","summary":"Une exploration visuelle époustouflante des plus beaux paysages terrestres, des sommets enneigés aux plages paradisiaques.","published_time":"Publié le 24 avril 2026 à 17 h 00","status":"published"}';

async function purge() {
  console.log("Attempting to delete article with ID:", weirdId);
  const { error } = await supabase.from('articles').delete().eq('id', weirdId);
  if (error) {
    console.error("DELETE ERROR:", error.message);
  } else {
    console.log("SUCCESS: Article deleted.");
  }
  process.exit(0);
}

purge();
