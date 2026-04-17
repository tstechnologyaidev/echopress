import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbFile = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbFile);

// Initial Articles from data.js
const defaultArticles = [
  { id: '1', category: 'actualites', surtitle: 'Féminicide présumé', title: 'Un homme accusé de l’homicide involontaire de sa conjointe', summary: 'Un homme a été formellement accusé d’avoir tué « involontairement » sa conjointe retrouvée morte au centre-ville de Montréal.', publishedTime: 'Publié à 17 h 37', image: 'news_police_car.png' },
  { id: '2', category: 'affaires', surtitle: 'Économie', title: 'Mieux vaut être en santé que pauvre', summary: 'L’inflation et les taux d’intérêt incitent les ménages à revoir leurs priorités en matière de santé et de bien-être financier.', publishedTime: 'Publié à 18 h 10', image: 'news_business.png' },
  { id: '3', category: 'sports', surtitle: 'Soccer', title: 'Le CF Montréal remporte une victoire cruciale', summary: 'L’équipe a su s’imposer dans les dernières minutes du match grâce à un but spectaculaire.', publishedTime: 'Publié à 21 h 45', image: 'news_sports.png' },
  { id: '4', category: 'maison', surtitle: 'Décoration', title: 'Les tendances printanières pour un intérieur apaisant', summary: 'Découvrez comment ramener la nature à l’intérieur avec des plantes et des couleurs douces.', publishedTime: 'Publié hier à 14 h 20', image: 'news_lifestyle.png' },
  { id: '5', category: 'international', surtitle: 'Europe', title: 'De nouvelles mesures climatiques annoncées', summary: 'Les dirigeants européens se sont mis d\'accord sur un plan audacieux pour réduire les émissions.', publishedTime: 'Publié à 16 h 00', image: '' },
  { id: '6', category: 'arts', surtitle: 'Musique', title: 'Un retour triomphal pour l\'orchestre symphonique', summary: 'Le concert de clôture a attiré une foule record et des critiques élogieuses.', publishedTime: 'Publié ce matin', image: '' }
];

db.serialize(() => {
  // Create tables
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS articles (
    id TEXT PRIMARY KEY,
    category TEXT,
    surtitle TEXT,
    title TEXT,
    summary TEXT,
    publishedTime TEXT,
    image TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )`, (err) => { if (err) console.error("Error creating settings table:", err); });

  // Alter existing table safely to add fields if they don't exist
  db.run("ALTER TABLE articles ADD COLUMN imageCredit TEXT", () => {});
  db.run("ALTER TABLE articles ADD COLUMN subCategory TEXT", () => {});
  db.run("ALTER TABLE articles ADD COLUMN author TEXT", () => {});
  db.run("ALTER TABLE articles ADD COLUMN views INTEGER DEFAULT 0", () => {});

  // Initialize Default Owner
  db.get(`SELECT * FROM users WHERE username = ?`, ['EchoPressOwner'], (err, row) => {
    if (!row) {
      db.run(`INSERT INTO users (username, password, role) VALUES (?, ?, ?)`, ['EchoPressOwner', 'Noomi Lallier', 'owner']);
      console.log('Registered default owner: EchoPressOwner');
    }
  });

  // Initialize Default Articles
  db.get(`SELECT COUNT(*) as count FROM articles`, (err, row) => {
    if (row && row.count === 0) {
      const stmt = db.prepare(`INSERT INTO articles (id, category, surtitle, title, summary, publishedTime, image) VALUES (?, ?, ?, ?, ?, ?, ?)`);
      for (const article of defaultArticles) {
        stmt.run(article.id, article.category, article.surtitle, article.title, article.summary, article.publishedTime, article.image);
      }
      stmt.finalize();
      console.log('Initialized default articles');
    }
  });

  // Initialize About Content
  db.get(`SELECT * FROM settings WHERE key = ?`, ['about_content'], (err, row) => {
    if (!row) {
      db.run(`INSERT INTO settings (key, value) VALUES (?, ?)`, ['about_content', '<h3>À Propos d\'EchoPress</h3><p>EchoPress est votre source d\'information indépendante...</p>']);
    }
  });
});

export const getUsers = (callback) => db.all(`SELECT id, username, role FROM users`, callback);
export const getUserByUsername = (username, callback) => db.get(`SELECT * FROM users WHERE username = ?`, [username], callback);
export const createUser = (username, password, role, callback) => db.run(`INSERT INTO users (username, password, role) VALUES (?, ?, ?)`, [username, password, role], callback);

export const getArticles = (callback) => db.all(`SELECT * FROM articles`, callback);
export const getArticleById = (id, callback) => db.get(`SELECT * FROM articles WHERE id = ?`, [id], callback);
export const createArticle = (id, category, subCategory, author, surtitle, title, summary, publishedTime, image, imageCredit, callback) => 
  db.run(`INSERT INTO articles (id, category, subCategory, author, surtitle, title, summary, publishedTime, image, imageCredit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
  [id, category, subCategory, author, surtitle, title, summary, publishedTime, image, imageCredit], callback);
export const updateArticle = (id, category, subCategory, author, surtitle, title, summary, image, imageCredit, publishedTime, callback) => 
  db.run(`UPDATE articles SET category = ?, subCategory = ?, author = ?, surtitle = ?, title = ?, summary = ?, image = ?, imageCredit = ?, publishedTime = ? WHERE id = ?`, 
  [category, subCategory, author, surtitle, title, summary, image, imageCredit, publishedTime, id], callback);
export const deleteArticle = (id, callback) => db.run(`DELETE FROM articles WHERE id = ?`, [id], callback);

export const incrementArticleViews = (id, callback) => {
  db.run(`UPDATE articles SET views = views + 1 WHERE id = ?`, [id], callback);
};

export const getPopularArticles = (limit, callback) => {
  db.all(`SELECT * FROM articles ORDER BY views DESC LIMIT ?`, [limit], callback);
};

export const getSetting = (key, callback) => {
  db.get(`SELECT * FROM settings WHERE key = ?`, [key], callback);
};

export const upsertSetting = (key, value, callback) => {
  db.get(`SELECT count(*) as count FROM settings WHERE key = ?`, [key], (err, row) => {
    if (err) return callback(err);
    if (row && row.count > 0) {
      db.run(`UPDATE settings SET value = ? WHERE key = ?`, [value, key], callback);
    } else {
      db.run(`INSERT INTO settings (key, value) VALUES (?, ?)`, [key, value], callback);
    }
  });
};
