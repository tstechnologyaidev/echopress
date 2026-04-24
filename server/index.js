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
  getEditRequests, getEditRequestsForUser, createEditRequest, updateEditRequestStatus, getValidApprovalForArticle,
  getArchives, createArchive, deleteArchive,
  getNotifications, createNotification, markNotificationRead, deleteNotifications
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

// app.use(helmet({
//   contentSecurityPolicy: {
//     directives: {
//       ...helmet.contentSecurityPolicy.getDefaultDirectives(),
//       "img-src": ["'self'", "data:", "blob:", "https://*.supabase.co", "https://*.youtube.com", "https://*.ytimg.com"],
//       "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://*.youtube.com", "https://www.youtube.com", "https://s.ytimg.com", "https://cdn.quilljs.com"],
//       "frame-src": ["'self'", "https://*.youtube.com", "https://www.youtube.com", "https://www.youtube-nocookie.com"],
//       "connect-src": ["'self'", "https://*.supabase.co", "https://vitals.vercel-insights.com"],
//       "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
//       "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.quilljs.com"]
//     },
//   },
//   crossOriginEmbedderPolicy: false,
//   crossOriginResourcePolicy: { policy: "cross-origin" },
//   referrerPolicy: { policy: "strict-origin-when-cross-origin" }
// }));
app.use(cors());
app.use(express.json({ limit: '1000gb' }));
app.use(express.urlencoded({ extended: true, limit: '1000gb' }));
app.use(express.static(path.join(__dirname, '../dist')));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  message: { error: 'Trop de requêtes, veuillez réessayer plus tard.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  handler: async (req, res, next, options) => {
    await logSecurityAlert(req, 'brute_force', `Tentative de brute force (connexions répétées) détectée.`, 'critical');
    res.status(options.statusCode).send(options.message);
  },
  message: { error: 'Trop de tentatives de connexion, veuillez réessayer dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Configure Multer (disk storage to support large videos)
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({ dest: uploadDir });

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_echopress_key_2026';

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    // If no token or explicitly null/undefined, we assign a temporary public role for non-sensitive GET requests
    if (!token || token === 'null' || token === 'undefined') {
      const isSensitive = req.path.includes('/admin') || req.path.includes('/users') || req.path.includes('/notifications') || req.path.includes('/settings');
      if (req.method === 'GET' && !isSensitive) {
        req.user = { role: 'public' };
        return next();
      }
      return res.status(401).json({ error: 'Accès refusé. Token manquant.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });

    // Check for Maintenance Mode
    const maintenanceMode = await getSetting('maintenance_mode');
    if (maintenanceMode && maintenanceMode.value === 'true' && decoded.role !== 'owner') {
      const reason = await getSetting('maintenance_reason');
      return res.status(503).json({
        error: 'Maintenance en cours',
        reason: reason ? reason.value : 'Le site est en maintenance.'
      });
    }

    // Security Hardening: Check database status on every request if it's not a 'public' token
    if (decoded.role !== 'public') {
      console.log(`[AUTH CHECK] User: ${decoded.username}, Role: ${decoded.role}`);
      const user = await getUserByUsername(decoded.username);

      if (!user) {
        console.log(`[AUTH FAIL] User not found: ${decoded.username}`);
        return res.status(401).json({ error: 'Compte inexistant ou supprimé.' });
      }

      if (user.status === 'suspended') {
        return res.status(403).json({
          error: 'Compte suspendu',
          reason: user.punishment_reason || 'Aucune raison spécifiée.'
        });
      }

      // RESTORED: Token version check is essential for instant kickout on password change
      const dbVersion = Number(user.token_version || 1);
      const tokenVersion = Number(decoded.token_version || 1);

      if (dbVersion > tokenVersion) {
        console.log(`[AUTH FAIL] Version mismatch for ${decoded.username}`);
        return res.status(401).json({ error: 'Votre session a été invalidée (changement de mot de passe ou de statut).' });
      }

      req.user = { ...decoded, id: user.id };
    } else {
      req.user = decoded;
    }

    next();
  } catch (err) {
    // We are being "less severe": only log the error, don't kickout unless absolutely necessary
    console.log('[AUTH ADVISORY]', err.message);
    next();
  }
};

// Heartbeat check for immediate kickout
app.get('/api/auth/check', authenticateToken, (req, res) => {
  res.json({ status: 'active', user: req.user });
});

const requireOwner = async (req, res, next) => {
  if (req.user && req.user.role === 'owner') {
    next();
  } else {
    const userDisplay = req.user ? `${req.user.username} (${req.user.role})` : 'Utilisateur non-authentifié';
    await logSecurityAlert(req, 'unauthorized_access', `Tentative d'accès ADMIN refusée pour ${userDisplay}`, 'critical');
    res.status(403).json({ error: 'Accès refusé. Propriétaire requis.' });
  }
};

const requireStaff = async (req, res, next) => {
  const staffRoles = ['owner', 'supervisor', 'journalist', 'corrector'];
  if (req.user && staffRoles.includes(req.user.role)) {
    next();
  } else {
    const userDisplay = req.user ? `${req.user.username} (${req.user.role})` : 'Utilisateur non-authentifié';
    await logSecurityAlert(req, 'unauthorized_access', `Tentative d'accès STAFF refusée pour ${userDisplay}`, 'high');
    res.status(403).json({ error: 'Accès refusé. Privilèges rédactionnels requis.' });
  }
};

const requireOwnerOrSupervisor = async (req, res, next) => {
  const allowed = ['owner', 'supervisor'];
  if (req.user && allowed.includes(req.user.role)) {
    next();
  } else {
    const userDisplay = req.user ? `${req.user.username} (${req.user.role})` : 'Utilisateur non-authentifié';
    await logSecurityAlert(req, 'unauthorized_access', `Tentative d'accès SUPERVISEUR refusée pour ${userDisplay}`, 'high');
    res.status(403).json({ error: 'Accès refusé. Propriétaire ou Superviseur requis.' });
  }
};

let attackCounter = 0;

const logSecurityAlert = async (req, type, message, severity = 'high') => {
  try {
    const userId = req.user ? req.user.id : null;

    // ISO Isolation: REMOTE_ADDR + X-FORWARDED-FOR for Proxy detection
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? forwarded.split(',')[0] : req.socket.remoteAddress;

    let geoInfo = {
      ip: ip,
      city: 'Inconnue',
      country: 'Inconnu',
      isp: 'Inconnu',
      proxy: 'Inconnu'
    };

    try {
      // Querying ip-api.com for deep inspection (City, Country, ISP)
      const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,city,isp,proxy`);
      if (geoRes.ok) {
        const data = await geoRes.json();
        if (data.status === 'success') {
          geoInfo.city = data.city;
          geoInfo.country = data.country;
          geoInfo.isp = data.isp;
          geoInfo.proxy = data.proxy ? 'OUI' : 'NON';
        }
      }
    } catch (e) { console.log("Geo lookup offline (local dev or API limit)"); }

    const metadata = {
      IP_ADDRESS: geoInfo.ip,
      LOCATION: `${geoInfo.city}, ${geoInfo.country}`,
      PROVIDER_ISP: geoInfo.isp,
      PROXY_DETECTED: geoInfo.proxy,
      PATH_ATTEMPTED: req.path,
      HTTP_METHOD: req.method,
      USER_ROLE: req.user ? req.user.role : 'unauthenticated',
      TIMESTAMP: new Date().toISOString()
    };

    await createNotification(type, message, severity, userId, metadata);

    if (severity === 'critical' && userId && req.user.role !== 'owner') {
      await updateUserStatus(userId, 'suspended', 'DÉFENSE ACTIVE : Violation critique des protocoles de sécurité.');
    }

    if (severity === 'critical' || severity === 'high') {
      attackCounter++;
      if (attackCounter >= 2) {
        await upsertSetting('maintenance_mode', 'true');
        await upsertSetting('maintenance_reason', "ALERTE SÉCURITÉ : Protocoles de protection activés suite à une tentative d'intrusion détectée.");
      }
    }
  } catch (err) {
    console.error('Security Protocol Failure:', err);
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
    const token = jwt.sign(userPayload, JWT_SECRET);
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
    const token = jwt.sign(userPayload, JWT_SECRET);
    res.status(201).json({ token, user: userPayload });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public Token Generation (Regenerates every day via 1d expiry)
app.get('/api/public/token', apiLimiter, async (req, res) => {
  // Global Maintenance Check for Public Users
  const maintenanceMode = await getSetting('maintenance_mode');
  if (maintenanceMode && maintenanceMode.value === 'true') {
    const reason = await getSetting('maintenance_reason');
    return res.status(503).json({
      error: 'Maintenance en cours',
      reason: reason ? reason.value : 'Le site est en maintenance.'
    });
  }

  if (req.headers['x-echo-client'] !== 'EchoPress2026') {
    return res.status(403).json({ error: 'Client non autorisé' });
  }
  const token = jwt.sign({ role: 'public' }, JWT_SECRET);
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

// Upload API — stores media in Supabase Storage (persists across Render restarts)
app.post('/api/upload', authenticateToken, requireStaff, upload.single('media'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  try {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(req.file.originalname)}`;

    // Use stream to prevent Out-Of-Memory errors with large videos
    const fileStream = fs.createReadStream(req.file.path);
    const { data, error } = await supabase.storage
      .from('images')
      .upload(uniqueName, fileStream, {
        contentType: req.file.mimetype,
        upsert: false,
        duplex: 'half'
      });

    // Clean up temp file
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    if (error) {
      console.error('Supabase upload error:', error.message);
      return res.status(500).json({ error: 'Upload to Supabase failed: ' + error.message });
    }
    const { data: publicData } = supabase.storage.from('images').getPublicUrl(uniqueName);
    res.json({ url: publicData.publicUrl });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/articles', authenticateToken, requireStaff, async (req, res) => {
  const { title, summary, category, sub_category, author, surtitle, image, image_credit, published_time, author_username } = req.body;

  if (category === 'videos' && req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Seuls les propriétaires peuvent publier dans la catégorie Vidéos.' });
  }

  const id = Date.now().toString();
  try {
    const article = await createArticle(id, category, sub_category, author, surtitle, title, summary, published_time, image, image_credit, author_username);

    // CODE VERT: Alert for creation
    await createNotification('content_update', `[NOUVEAU] ${author_username} a créé l'article: "${title}"`, 'low', req.user.id, {
      title,
      author: author_username,
      image_preview: image,
      summary_preview: summary.substring(0, 100) + '...'
    });

    res.status(201).json(article);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/articles/:id', authenticateToken, requireStaff, async (req, res) => {
  const { title, summary, category, sub_category, author, surtitle, image, image_credit, published_time, modified_by } = req.body;

  if (category === 'videos' && req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Seuls les propriétaires peuvent publier dans la catégorie Vidéos.' });
  }

  try {
    await updateArticle(req.params.id, category, sub_category, author, surtitle, title, summary, image, image_credit, published_time, modified_by);

    // CODE VERT: Alert for modification
    await createNotification('content_update', `[MODIF] ${modified_by} a mis à jour l'article: "${title}"`, 'low', req.user.id, {
      title,
      editor: modified_by,
      image_preview: image,
      content_snippet: summary.substring(0, 150) + '...'
    });

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

app.put('/api/articles/:id/priority', authenticateToken, requireOwnerOrSupervisor, async (req, res) => {
  const { priority } = req.body;
  try {
    await updateArticlePriority(req.params.id, Number(priority));
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
    // Reset attack counter if owner manually disables maintenance
    if (key === 'maintenance_mode' && value === 'false') {
      attackCounter = 0;
      console.log("[SECURITY] Attack counter reset by owner.");
    }
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
  const { username } = req.params;

  // Security check: Only allow users to see their own requests, unless they are owner/supervisor
  const isSelf = req.user.username === username;
  const isAdmin = ['owner', 'supervisor'].includes(req.user.role);

  if (!isSelf && !isAdmin) {
    return res.status(403).json({ error: 'Accès refusé.' });
  }

  try {
    const requests = await getEditRequestsForUser(username);
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/edit-requests', authenticateToken, requireStaff, async (req, res) => {
  try {
    const { article_id, article_title, requested_by, description } = req.body;
    const newRequest = await createEditRequest(article_id, article_title, requested_by, description);

    // INTEGRATION: Create an instant notification for the owner
    await createNotification(
      'edit_request',
      `Nouvelle demande de modification par ${requested_by} sur l'article: "${article_title}"`,
      'low'
    );

    res.status(201).json(newRequest);
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

  // Security check: User can only check their own permissions
  if (requested_by !== req.user.username && !['owner', 'supervisor'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Accès refusé.' });
  }

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

// Notifications API
app.get('/api/notifications', authenticateToken, requireOwner, async (req, res) => {
  try {
    const { unreadOnly, since } = req.query;
    let query = supabase.from('notifications').select('*');

    if (unreadOnly === 'true') {
      query = query.eq('is_read', false);
    }

    if (since) {
      query = query.gt('created_at', since);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notifications/:id/read', authenticateToken, requireOwner, async (req, res) => {
  try {
    await markNotificationRead(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notifications/bulk-delete', authenticateToken, requireOwner, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Aucun ID fourni.' });
    }
    await deleteNotifications(ids);
    res.json({ success: true, count: ids.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/test-security-alert', authenticateToken, requireOwner, async (req, res) => {
  try {
    await logSecurityAlert(req, 'security_alert', '🧪 TEST DU SYSTÈME : Alerte de sécurité simulée pour vérification des métadonnées.', 'high');
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
    if (cachedWeather && (now - lastWeatherFetch < 10 * 60 * 1000)) {
      return res.json(cachedWeather);
    }

    // Fetch current + 7-day forecast for Montreal
    const meteoRes = await fetch("https://api.open-meteo.com/v1/forecast?latitude=45.5017&longitude=-73.5673&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=America/Toronto");
    if (!meteoRes.ok) throw new Error("Weather fetch failed");
    const data = await meteoRes.json();

    const getCondition = (code) => {
      if (code === 0) return "Dégagé ☀️";
      if (code === 1 || code === 2 || code === 3) return "Nuageux ⛅";
      if (code >= 45 && code <= 48) return "Brouillard 🌫️";
      if (code >= 51 && code <= 67) return "Pluie 🌧️";
      if (code >= 71 && code <= 77) return "Neige ❄️";
      if (code >= 80 && code <= 82) return "Averses 🌦️";
      if (code >= 95 && code <= 99) return "Orage ⛈️";
      return "Variable 🌤️";
    };

    const forecast = data.daily.time.map((date, i) => ({
      date,
      max: Math.round(data.daily.temperature_2m_max[i]),
      min: Math.round(data.daily.temperature_2m_min[i]),
      condition: getCondition(data.daily.weathercode[i])
    }));

    cachedWeather = {
      temperature: Math.round(data.current_weather.temperature),
      condition: getCondition(data.current_weather.weathercode),
      forecast: forecast
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

const server = app.listen(PORT, () => {
  console.log(`Server API listening on port ${PORT}`);
});

// Set global timeout to 10 minutes for large video uploads
server.timeout = 600000;
server.keepAliveTimeout = 600000;
server.headersTimeout = 610000;
