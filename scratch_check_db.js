
import { getSetting } from './server/db.js';

async function check() {
  try {
    const setting = await getSetting('normes_content');
    console.log('--- Normes Setting ---');
    console.log('Keys available:', Object.keys(setting || {}));
    console.log('Value length:', setting?.value?.length);
    console.log('Updated At:', setting?.updated_at);
  } catch (e) {
    console.error('Error:', e.message);
  }
  process.exit();
}

check();
