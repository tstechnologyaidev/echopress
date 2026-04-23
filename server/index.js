import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  supabase,
  getUsers, getUserByUsername, createUser, deleteUser, deleteMultipleUsers, updateUserStatus, resetUserPassword, updateUserNotes,
  getArticles, getArticleById, createArticle, updateArticle, deleteArticle, updateArticleStatus,
  incrementArticleViews, getPopularArticles,
  getSetting, upsertSetting,
  getEditRequests, getEditRequestsForUser, createEditRequest, updateEditRequestStatus,
  getArchives, createArchive, deleteArchive
} from './db.js';

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import fs from 'fs';

console.log("Process started. Initializing server...");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({
  contentSecurityPolicy: false, // disabled for inline scripts/styles if needed by Quill or frontend
}));
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist')));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  message: { error: 'Trop de requêtes, veuillez réessayer plus tard.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per 15 mins for login/register
  message: { error: 'Trop de tentatives de connexion, veuillez réessayer dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Configure Multer (memory storage — buffer sent directly to Supabase, no disk write)
const upload = multer({ storage: multer.memoryStorage() });

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_echopress_key_2026';

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Accès refusé. Token manquant.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Security Hardening: Check database status on every request if it's not a 'public' token
    if (decoded.role !== 'public') {
      const user = await getUserByUsername(decoded.username);
      
      if (!user) {
        return res.status(401).json({ error: 'Compte inexistant ou supprimé.' });
      }

      if (user.status === 'suspended') {
        return res.status(403).json({ 
          error: 'Compte suspendu', 
          reason: user.punishment_reason || 'Aucune raison spécifiée.' 
        });
      }
      
      // Robust token version check
      const dbVersion = user.token_version || 1;
      const tokenVersion = decoded.token_version || 1;
      
      if (dbVersion > tokenVersion) {
        return res.status(401).json({ error: 'Votre session a été invalidée (changement de mot de passe ou de statut).' });
      }

      req.user = { ...decoded, id: user.id };
    } else {
      req.user = decoded;
    }
    
    next();
  } catch (err) {
    console.error('[AUTH ERROR]', err.message);
    if (err.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'Session expirée. Veuillez vous reconnecter.' });
    }
    return res.status(403).json({ error: 'Token invalide ou erreur de sécurité.' });
  }
};

// Heartbeat check for immediate kickout
app.get('/api/auth/check', authenticateToken, (req, res) => {
  res.json({ status: 'active', user: req.user });
});

const requireOwner = (req, res, next) => {
  if (req.user && req.user.role === 'owner') {
    next();
  } else {
    res.status(403).json({ error: 'Accès refusé. Privilèges administrateur requis.' });
  }
};

const requireStaff = (req, res, next) => {
  const staffRoles = ['owner', 'supervisor', 'journalist', 'corrector', 'admin'];
  if (req.user && staffRoles.includes(req.user.role)) {
    next();
  } else {
    res.status(403).json({ error: 'Accès refusé. Privilèges rédactionnels ou administratifs requis.' });
  }
};

const requireOwnerOrSupervisor = (req, res, next) => {
  const allowed = ['owner', 'supervisor'];
  if (req.user && allowed.includes(req.user.role)) {
    next();
  } else {
    res.status(403).json({ error: 'Accès refusé. Privilèges superviseur ou administrateur requis.' });
  }
};

// Users API
app.post('/api/login', authLimiter, async (req, res) => {
  const { username: rawUsername, password: rawPassword } = req.body;
  const username = (rawUsername || '').trim();
  const password = (rawPassword || '').trim();

  try {
    const user = await getUserByUsername(username);
    if (!user) {
      console.log(`[AUTH] Login failed: User not found [${username}]`);
      return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });
    }

    let isMatch = false;
    if (user.password.startsWith('$2')) {
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      isMatch = (password === user.password);
    }

    if (!isMatch) {
      console.log(`[AUTH] Login failed: Password mismatch for user [${username}]`);
      return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });
    }

    console.log(`[AUTH] Login success: [${username}] (${user.role})`);

    if (user.status === 'suspended') {
      return res.status(403).json({ error: `Votre compte est suspendu. Raison : ${user.punishment_reason || 'Aucune raison spécifiée.'}` });
    }
    const userPayload = { username: user.username, role: user.role, token_version: user.token_version || 1 };
    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: userPayload });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users', authenticateToken, requireOwner, async (req, res) => {
  try {
    const users = await getUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', authenticateToken, requireOwner, async (req, res) => {
  try {
    const { data: targetUser } = await supabase.from('users').select('role').eq('id', req.params.id).single();
    
    // Skip PIN check if it's a Public user (role: 'user'), otherwise require PIN
    if (targetUser && targetUser.role !== 'user') {
      const adminPin = req.headers['x-admin-pin'];
      const expectedPin = process.env.ADMIN_PIN || 'EchoOwnerAdmin2026!!'; // Hardcoded fallback
      if (adminPin !== expectedPin) {
        return res.status(403).json({ error: 'Code PIN invalide. Accès refusé pour ce type de compte.' });
      }
    }
    
    await deleteUser(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users/bulk-delete', authenticateToken, requireOwner, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Aucun ID fourni.' });
    }

    // Check if any of the target users have a role higher than 'user' (Public)
    const { data: targetUsers } = await supabase.from('users').select('role').in('id', ids);
    
    // Determine if we need a PIN (if anyone is NOT a Public user)
    const needsPin = targetUsers && targetUsers.some(u => u.role !== 'user');

    if (needsPin) {
      const adminPin = req.headers['x-admin-pin'];
      const expectedPin = process.env.ADMIN_PIN || 'EchoOwnerAdmin2026!!'; // Hardcoded fallback
      if (adminPin !== expectedPin) {
        return res.status(403).json({ error: 'Code PIN invalide. Un PIN est requis pour supprimer des comptes du personnel.' });
      }
    }

    await deleteMultipleUsers(ids);
    res.json({ success: true, count: ids.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id/status', authenticateToken, requireOwner, async (req, res) => {
  const { status, reason } = req.body;
  try {
    await updateUserStatus(req.params.id, status, reason);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id/reset-password', authenticateToken, requireOwner, async (req, res) => {
  const { password, reason } = req.body;
  try {
    // Hashing disabled at user request for visibility in admin panel
    await resetUserPassword(req.params.id, password, reason);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id/notes', authenticateToken, requireOwner, async (req, res) => {
  const { notes } = req.body;
  try {
    await updateUserNotes(req.params.id, notes);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/register', authLimiter, async (req, res) => {
  const { username: rawUsername, password: rawPassword } = req.body;
  const username = (rawUsername || '').trim();
  const password = (rawPassword || '').trim();
  
  try {
    const existingUser = await getUserByUsername(username);
    if (existingUser) return res.status(400).json({ error: 'Username already exists' });

    let role = 'user';
    if (password === 'EchoPressJournalist!') role = 'journalist';
    else if (password === 'EchoPressCorrect!') role = 'corrector';
    else if (password === 'EchoPressSupervisor!') role = 'supervisor';

    // Hashing disabled at user request for visibility in admin panel
    await createUser(username, password, role);

    const userPayload = { username, role, token_version: 1 };
    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7yr' });
    res.status(201).json({ token, user: userPayload });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public Token Generation (Regenerates every day via 1d expiry)
app.get('/api/public/token', apiLimiter, (req, res) => {
  if (req.headers['x-echo-client'] !== 'EchoPress2026') {
      return res.status(403).json({ error: 'Client non autorisé' });
  }
  const token = jwt.sign({ role: 'public' }, JWT_SECRET, { expiresIn: '1d' });
  res.json({ token });
});

// Articles API
app.get('/api/articles', authenticateToken, async (req, res) => {
  try {
    let includePaused = req.query.includePaused === 'true';
    const isStaff = ['owner', 'supervisor', 'journalist', 'corrector', 'admin'].includes(req.user.role);
    
    // Only staff can see paused articles
    if (includePaused && !isStaff) {
      includePaused = false;
    }

    const articles = await getArticles(includePaused);
    res.json(articles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/articles/:id', authenticateToken, async (req, res) => {
  const id = req.params.id;
  try {
    await incrementArticleViews(id);
    const article = await getArticleById(id);
    if (!article) return res.status(404).json({ error: 'Article not found' });

    const isStaff = ['owner', 'supervisor', 'journalist', 'corrector', 'admin'].includes(req.user.role);
    if (article.status === 'paused' && !isStaff) {
      return res.status(403).json({ error: 'Cet article est temporairement indisponible pour révision.' });
    }

    res.json(article);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/popular', authenticateToken, async (req, res) => {
  try {
    const articles = await getPopularArticles(3);
    res.json(articles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload API — stores image in Supabase Storage (persists across Render restarts)
app.post('/api/upload', authenticateToken, requireStaff, upload.single('image'), async (req, res) => {
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

app.post('/api/articles', authenticateToken, requireStaff, async (req, res) => {
  const { title, summary, category, sub_category, author, surtitle, image, image_credit, published_time, author_username } = req.body;
  const id = Date.now().toString();
  try {
    const article = await createArticle(id, category, sub_category, author, surtitle, title, summary, published_time, image, image_credit, author_username);
    res.status(201).json(article);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/articles/:id', authenticateToken, requireStaff, async (req, res) => {
  const { title, summary, category, sub_category, author, surtitle, image, image_credit, published_time, modified_by } = req.body;
  try {
    await updateArticle(req.params.id, category, sub_category, author, surtitle, title, summary, image, image_credit, published_time, modified_by);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/articles/:id', authenticateToken, requireStaff, async (req, res) => {
  try {
    await deleteArticle(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/articles/:id/status', authenticateToken, requireOwnerOrSupervisor, async (req, res) => {
  const { status, reason } = req.body;
  try {
    await updateArticleStatus(req.params.id, status, reason);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Archives API
app.get('/api/archives', authenticateToken, requireStaff, async (req, res) => {
  try {
    const archives = await getArchives();
    res.json(archives);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/archives', authenticateToken, requireOwnerOrSupervisor, async (req, res) => {
  const { url, description } = req.body;
  try {
    const archive = await createArchive(url, description, req.user.username);
    res.status(201).json(archive);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/archives/:id', authenticateToken, requireOwnerOrSupervisor, async (req, res) => {
  try {
    await deleteArchive(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Settings API
app.get('/api/settings/:key', authenticateToken, async (req, res) => {
  const { key } = req.params;
  
  // Security check for sensitive keys
  const isStaff = ['owner', 'supervisor', 'journalist', 'corrector', 'admin'].includes(req.user.role);
  if (key === 'admin_pin' && !isStaff) {
    return res.status(403).json({ error: 'Accès refusé.' });
  }

  try {
    const row = await getSetting(key);
    res.json(row || { key, value: '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings', authenticateToken, requireOwner, async (req, res) => {
  const { key, value } = req.body;
  try {
    await upsertSetting(key, value);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Edit Requests API
app.get('/api/edit-requests', authenticateToken, requireOwner, async (req, res) => {
  try {
    const { status } = req.query;
    const requests = await getEditRequests(status || null);
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/edit-requests/user/:username', authenticateToken, async (req, res) => {
  try {
    const requests = await getEditRequestsForUser(req.params.username);
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/edit-requests', authenticateToken, requireStaff, async (req, res) => {
  const { article_id, article_title, requested_by, description } = req.body;
  try {
    const request = await createEditRequest(article_id, article_title, requested_by, description);
    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/edit-requests/:id', authenticateToken, requireOwner, async (req, res) => {
  const { status, expires_at, is_one_time } = req.body;
  try {
    await updateEditRequestStatus(req.params.id, status, expires_at, is_one_time);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// For journalist-editor: Check if an approval exists
app.get('/api/edit-requests/check-valid', authenticateToken, async (req, res) => {
  const { article_id, requested_by } = req.query;
  try {
    const approval = await getValidApprovalForArticle(article_id, requested_by);
    res.json({ approval });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// For journalist-editor: Mark as used
app.post('/api/edit-requests/:id/fulfill', authenticateToken, requireStaff, async (req, res) => {
  try {
    await updateEditRequestStatus(req.params.id, 'fulfilled');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Weather API
let cachedWeather = null;
let lastWeatherFetch = 0;

app.get('/api/weather', authenticateToken, async (req, res) => {
  try {
    const now = Date.now();
    if (cachedWeather && (now - lastWeatherFetch < 5 * 60 * 1000)) {
      return res.json(cachedWeather);
    }
    const meteoRes = await fetch("https://api.open-meteo.com/v1/forecast?latitude=45.5088&longitude=-73.5878&current_weather=true");
    if (!meteoRes.ok) throw new Error("Weather fetch failed");
    const data = await meteoRes.json();

    // Convert WMO Weather code to simple string/emoji for frontend UI
    let conditionName = "Dégagé ☀️";
    const code = data.current_weather.weathercode;
    if (code === 1 || code === 2 || code === 3) conditionName = "Nuageux ⛅";
    else if (code >= 45 && code <= 48) conditionName = "Brouillard 🌫️";
    else if (code >= 51 && code <= 67) conditionName = "Pluie 🌧️";
    else if (code >= 71 && code <= 77) conditionName = "Neige ❄️";
    else if (code >= 80 && code <= 82) conditionName = "Averses 🌦️";
    else if (code >= 95 && code <= 99) conditionName = "Orage ⛈️";

    cachedWeather = {
      temperature: data.current_weather.temperature,
      condition: conditionName
    };
    lastWeatherFetch = now;
    res.json(cachedWeather);
  } catch (err) {
    res.status(500).json({ error: err.message, cached: cachedWeather });
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
