import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { getUsers, getUserByUsername, createUser, getArticles, getArticleById, createArticle, updateArticle, deleteArticle, incrementArticleViews, getPopularArticles, getSetting, upsertSetting, supabase } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import fs from 'fs';

console.log("Process started. Initializing server...");

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '../dist')));

// Configure Multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Users API
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await getUserByUsername(username);
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const token = { username: user.username, role: user.role };
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const existingUser = await getUserByUsername(username);
    if (existingUser) return res.status(400).json({ error: 'Username already exists' });
    
    const role = (password === 'EchoPressJournalist!') ? 'journalist' : 'user';
    await createUser(username, password, role);
    res.status(201).json({ token: { username, role: role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Articles API
app.get('/api/articles', async (req, res) => {
  try {
    const articles = await getArticles();
    res.json(articles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/articles/:id', async (req, res) => {
  const id = req.params.id;
  try {
    await incrementArticleViews(id);
    const article = await getArticleById(id);
    if (!article) return res.status(404).json({ error: 'Article not found' });
    res.json(article);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/popular', async (req, res) => {
  try {
    const articles = await getPopularArticles(3);
    res.json(articles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/upload', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const file = req.file;
    const fileExt = path.extname(file.originalname);
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${fileExt}`;
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('article-images')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (error) {
      console.error('Supabase storage error:', error);
      return res.status(500).json({ error: 'Failed to upload image to Supabase. Make sure the "article-images" bucket exists and is public.' });
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('article-images')
      .getPublicUrl(fileName);

    res.json({ url: publicUrl });
  } catch (err) {
    console.error('Upload catch error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/articles', async (req, res) => {
  const { title, summary, category, subCategory, author, surtitle, image, imageCredit, publishedTime } = req.body;
  const id = Date.now().toString(); // unique string ID
  
  try {
    const article = await createArticle(id, category, subCategory, author, surtitle, title, summary, publishedTime, image, imageCredit);
    res.status(201).json(article);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/articles/:id', async (req, res) => {
  const { title, summary, category, subCategory, author, surtitle, image, imageCredit, publishedTime } = req.body;
  
  try {
    await updateArticle(req.params.id, category, subCategory, author, surtitle, title, summary, image, imageCredit, publishedTime);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/articles/:id', async (req, res) => {
  try {
    await deleteArticle(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Settings API
app.get('/api/settings/:key', async (req, res) => {
  try {
    const row = await getSetting(req.params.key);
    res.json(row || { key: req.params.key, value: '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings', async (req, res) => {
  const { key, value } = req.body;
  try {
    await upsertSetting(key, value);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Handle all other routes by serving the frontend (SPA support)
app.use((req, res, next) => {
  // If it's an API or Uploads request that wasn't handled, return 404
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return res.status(404).json({ error: 'Not found' });
  }

  // Check if a specific file exists in the build (e.g., /about or /about.html)
  const filename = req.path.endsWith('.html') ? req.path : `${req.path}.html`;
  const filePath = path.join(__dirname, '../dist', filename);

  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }

  // Otherwise, fallback to the main index.html
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server API listening on port ${PORT}`);
});
