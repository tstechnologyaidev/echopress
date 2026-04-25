import { getArticles } from './db.js';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: '../.env' });

async function dump() {
  try {
    const articles = await getArticles(true);
    console.log("TOTAL ARTICLES:", articles.length);
    articles.forEach(a => {
      console.log(`ID: [${a.id}] | Title: ${a.title} | Status: ${a.status}`);
    });
    process.exit(0);
  } catch (err) {
    console.error("DUMP ERROR:", err.message);
    process.exit(1);
  }
}

dump();
