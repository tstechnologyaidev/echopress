import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { getUsers, getUserByUsername, createUser, getArticles, getArticleById, createArticle, updateArticle, deleteArticle, incrementArticleViews, getPopularArticles, getSetting, upsertSetting } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '../dist')));

// Configure Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'uploads/'))
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
});
const upload = multer({ storage: storage });

// Users API
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  getUserByUsername(username, (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    // Simple mock token (username and role)
    const token = { username: user.username, role: user.role };
    res.json({ token });
  });
});

app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  getUserByUsername(username, (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (user) return res.status(400).json({ error: 'Username already exists' });
    
    // Assign role based on special password
    const role = (password === 'EchoPressJournalist!') ? 'journalist' : 'user';
    
    createUser(username, password, role, (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ token: { username, role: role } });
    });
  });
});

// Articles API
app.get('/api/articles', (req, res) => {
  getArticles((err, articles) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(articles);
  });
});

app.get('/api/articles/:id', (req, res) => {
  const id = req.params.id;
  incrementArticleViews(id, (err) => {
    if (err) console.error("Failed to increment views:", err);
    getArticleById(id, (err, article) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!article) return res.status(404).json({ error: 'Article not found' });
      res.json(article);
    });
  });
});

app.get('/api/popular', (req, res) => {
  getPopularArticles(3, (err, articles) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(articles);
  });
});

app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  res.json({ url: `/uploads/${req.file.filename}` });
});

app.post('/api/articles', (req, res) => {
  const { title, summary, category, subCategory, author, surtitle, image, imageCredit, publishedTime } = req.body;
  const id = Date.now().toString(); // unique string ID
  
  createArticle(id, category, subCategory, author, surtitle, title, summary, publishedTime, image, imageCredit, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id, title, category, subCategory, author, summary, surtitle, publishedTime, image, imageCredit });
  });
});

app.put('/api/articles/:id', (req, res) => {
  const { title, summary, category, subCategory, author, surtitle, image, imageCredit, publishedTime } = req.body;
  
  updateArticle(req.params.id, category, subCategory, author, surtitle, title, summary, image, imageCredit, publishedTime, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.delete('/api/articles/:id', (req, res) => {
  deleteArticle(req.params.id, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Settings API
app.get('/api/settings/:key', (req, res) => {
  getSetting(req.params.key, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row || { key: req.params.key, value: '' });
  });
});

app.post('/api/settings', (req, res) => {
  const { key, value } = req.body;
  upsertSetting(key, value, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Catch-all route to serve the built index.html for any direct URL access
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server API listening on port ${PORT}`);
});
