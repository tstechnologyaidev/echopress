import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  supabase,
  getUserByUsername, createUser,
  getArticles, getArticleById, createArticle, updateArticle, deleteArticle,
  incrementArticleViews, getPopularArticles,
  getSetting, upsertSetting,
  getEditRequests, getEditRequestsForUser, createEditRequest, updateEditRequestStatus
} from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import fs from 'fs';

console.log("Process started. Initializing server...");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist')));

// Configure Multer (memory storage — buffer sent directly to Supabase, no disk write)
const upload = multer({ storage: multer.memoryStorage() });

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

// Upload API — stores image in Supabase Storage (persists across Render restarts)
app.post('/api/upload', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  try {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(req.file.originalname)}`;
    const { data, error } = await supabase.storage
      .from('images')
      .upload(uniqueName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });
    if (error) {
      console.error('Supabase upload error:', error.message);
      return res.status(500).json({ error: 'Image upload to Supabase failed: ' + error.message });
    }
    const { data: publicData } = supabase.storage.from('images').getPublicUrl(uniqueName);
    res.json({ url: publicData.publicUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/articles', async (req, res) => {
  const { title, summary, category, subCategory, author, surtitle, image, imageCredit, publishedTime, authorUsername } = req.body;
  const id = Date.now().toString();
  try {
    const article = await createArticle(id, category, subCategory, author, surtitle, title, summary, publishedTime, image, imageCredit, authorUsername);
    res.status(201).json(article);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/articles/:id', async (req, res) => {
  const { title, summary, category, subCategory, author, surtitle, image, imageCredit, publishedTime, modifiedBy } = req.body;
  try {
    await updateArticle(req.params.id, category, subCategory, author, surtitle, title, summary, image, imageCredit, publishedTime, modifiedBy);
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

// Edit Requests API
app.get('/api/edit-requests', async (req, res) => {
  try {
    const { status } = req.query;
    const requests = await getEditRequests(status || null);
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/edit-requests/user/:username', async (req, res) => {
  try {
    const requests = await getEditRequestsForUser(req.params.username);
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/edit-requests', async (req, res) => {
  const { articleId, articleTitle, requestedBy, description } = req.body;
  try {
    const request = await createEditRequest(articleId, articleTitle, requestedBy, description);
    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/edit-requests/:id', async (req, res) => {
  const { status } = req.body;
  try {
    await updateEditRequestStatus(req.params.id, status);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Handle all other routes by serving the frontend (SPA support)
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Not found' });
  }
  const filename = req.path.endsWith('.html') ? req.path : `${req.path}.html`;
  const filePath = path.join(__dirname, '../dist', filename);
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server API listening on port ${PORT}`);
});
