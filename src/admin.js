import Plyr from 'plyr';
import 'plyr/dist/plyr.css';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { categories } from "./data.js";

// Global data & Auth
const userStr = localStorage.getItem("echopress_user");
const user = userStr ? JSON.parse(userStr) : null;
window.isOwner = user && user.role === 'owner';
window.isJournalist = user && user.role === 'journalist';

const PIN1_SECRET = "EchoOwner2026!!";
const PIN2_SECRET = "10987654321";

// DOM Elements
const gatekeeper = document.getElementById('security-gatekeeper');
const adminContent = document.getElementById('admin-main-content');
const securityForm = document.getElementById('security-form');
const securityError = document.getElementById('security-error-msg');
const categorySelect = document.getElementById("art-category");
const subCategorySelect = document.getElementById("art-sub-category");

// Security Logic
function revealAdmin() {
  if (gatekeeper) gatekeeper.style.opacity = '0';
  setTimeout(() => {
    if (gatekeeper) gatekeeper.style.display = 'none';
    if (adminContent) adminContent.style.display = 'block';
    
    document.getElementById('user-management-section').style.display = 'block';
    fetchUsers();
    fetchArticlesAdmin();
    loadAboutAdmin();
    loadAllRequests();
    loadMaintenanceStatus();
    
    const title = document.getElementById('admin-title');
    if (title && window.scrambleText) window.scrambleText(title, "Panneau d'administration", 2000);
  }, 500);
}

function checkSecurity() {
  if (!window.isOwner) {
    alert("Accès refusé. Cette page est réservée au propriétaire.");
    window.location.replace("/");
  }
}
checkSecurity();

if (securityForm) {
  securityForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const p1 = document.getElementById('pin-1').value;
    const p2 = document.getElementById('pin-2').value;
    if (p1 === PIN1_SECRET && p2 === PIN2_SECRET) {
      revealAdmin();
    } else {
      securityError.textContent = "Codes PIN invalides.";
      const card = document.querySelector('.security-card');
      if (card) {
        card.style.animation = 'shake 0.5s both';
        setTimeout(() => card.style.animation = '', 500);
      }
    }
  });
}

// Category & Video UI Logic
function updateSubCategories(selectedCatId, selectedSubCatValue = "") {
  const cat = categories.find(c => c.id === selectedCatId);
  if (!subCategorySelect) return;
  subCategorySelect.innerHTML = "<option value=''>-- Sélectionner une sous-catégorie --</option>";
  if (cat && cat.subCategories) {
    cat.subCategories.forEach(sub => {
      const opt = document.createElement("option");
      opt.value = sub;
      opt.textContent = sub;
      if (sub === selectedSubCatValue) opt.selected = true;
      subCategorySelect.appendChild(opt);
    });
    subCategorySelect.disabled = false;
  } else {
    subCategorySelect.disabled = true;
  }
}

if (categorySelect) {
  categorySelect.addEventListener("change", (e) => {
    const catVal = e.target.value;
    updateSubCategories(catVal);
    const imgLabel = document.getElementById('label-image-file');
    const fileInput = document.getElementById('art-image-file');
    const videoUrlInput = document.getElementById('art-video-url');
    const quillContainer = document.querySelector('.ql-toolbar') ? document.querySelector('.ql-toolbar').parentElement : null;
    const videoDesc = document.getElementById('art-video-desc');

    if (catVal === 'videos') {
      if (imgLabel) imgLabel.textContent = 'Lien Vidéo YouTube';
      if (fileInput) fileInput.style.display = 'none';
      if (videoUrlInput) videoUrlInput.style.display = 'block';
      if (quillContainer) quillContainer.style.display = 'none';
      if (videoDesc) videoDesc.style.display = 'block';
    } else {
      if (imgLabel) imgLabel.textContent = 'Image (fichier)';
      if (fileInput) fileInput.style.display = 'block';
      if (videoUrlInput) videoUrlInput.style.display = 'none';
      if (quillContainer) quillContainer.style.display = 'block';
      if (videoDesc) videoDesc.style.display = 'none';
    }
  });
}

// YouTube Preview & Plyr
let adminPlayer = null;
function extractYouTubeId(url) {
  const regExp = /^.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
  const match = url ? url.match(regExp) : null;
  return (match && match[1].length === 11) ? match[1] : null;
}

const videoUrlField = document.getElementById('art-video-url');
if (videoUrlField) {
  videoUrlField.addEventListener('input', (e) => {
    const id = extractYouTubeId(e.target.value);
    const container = document.getElementById('youtube-preview-container');
    const iframe = document.getElementById('youtube-preview-iframe');
    if (id) {
      iframe.src = `https://www.youtube-nocookie.com/embed/${id}?origin=${window.location.origin}&iv_load_policy=3&modestbranding=1&playsinline=1&showinfo=0&rel=0&enablejsapi=1`;
      if (container) container.style.display = "block";
      if (!adminPlayer) adminPlayer = new Plyr(iframe);
    } else {
      if (container) container.style.display = 'none';
      if (adminPlayer) { adminPlayer.destroy(); adminPlayer = null; }
    }
  });
}

// Articles Management
let allArticles = [];
async function fetchArticlesAdmin() {
  const res = await fetch("/api/articles?includePaused=true", {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('echopress_token') || ''}` }
  });
  allArticles = await res.json();
  renderArticleList(allArticles);
}

function renderArticleList(articles) {
  const list = document.getElementById("articles-list");
  if (!list) return;
  list.innerHTML = articles.length === 0 ? '<p>Aucun article.</p>' : '';
  articles.forEach(a => {
    const div = document.createElement("div");
    div.className = "article-row";
    div.innerHTML = `
      <div style="flex: 1;">
        <h4>${a.title} ${a.status === 'paused' ? '(PAUSÉ)' : ''}</h4>
        <small>${a.category} - ${a.author}</small>
      </div>
      <div>
        <button class="btn btn-edit" data-id="${a.id}">Éditer</button>
        <button class="btn btn-danger btn-delete" data-id="${a.id}">Supprimer</button>
      </div>
    `;
    list.appendChild(div);
  });
  list.querySelectorAll('.btn-edit').forEach(b => b.onclick = () => editArticle(b.dataset.id));
  list.querySelectorAll('.btn-delete').forEach(b => b.onclick = () => deleteArticle(b.dataset.id));
}

async function deleteArticle(id) {
  if (confirm("Supprimer cet article ?")) {
    await fetch("/api/articles/" + id, { 
      method: "DELETE",
      headers: { 'Authorization': `Bearer ${localStorage.getItem('echopress_token')}` }
    });
    fetchArticlesAdmin();
  }
}

// Quill Setup
const quill = new Quill("#quill-editor", { theme: "snow" });
const quillAbout = new Quill("#quill-about-editor", { theme: "snow" });

async function loadAboutAdmin() {
  const res = await fetch('/api/settings/about_content', {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('echopress_token')}` }
  });
  const data = await res.json();
  quillAbout.root.innerHTML = data.value || '';
}

document.getElementById("save-about-btn").onclick = async () => {
  await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('echopress_token')}` },
    body: JSON.stringify({ key: 'about_content', value: quillAbout.root.innerHTML })
  });
  alert("Mis à jour !");
};

// Users Management
async function fetchUsers() {
  const res = await fetch("/api/users", {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('echopress_token')}` }
  });
  const data = await res.json();
  const list = document.getElementById("users-list");
  if (!list) return;
  list.innerHTML = '';
  data.forEach(u => {
    const div = document.createElement("div");
    div.innerHTML = `${u.username} (${u.role}) <button onclick="window.deleteUser('${u.username}')">Supprimer</button>`;
    list.appendChild(div);
  });
}

window.deleteUser = async (username) => {
  if (confirm("Supprimer ce compte ?")) {
    await fetch(`/api/users/${username}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('echopress_token')}` } });
    fetchUsers();
  }
};

// Form Submission
document.getElementById("create-article-form").onsubmit = async (e) => {
  e.preventDefault();
  const editingId = document.getElementById("art-id").value;
  const payload = {
    title: document.getElementById("art-title").value,
    category: document.getElementById("art-category").value,
    summary: document.getElementById("art-category").value === 'videos' ? document.getElementById("art-video-desc").value : quill.root.innerHTML,
    image: document.getElementById("art-category").value === 'videos' ? document.getElementById("art-video-url").value : document.getElementById("art-existing-image").value
  };
  
  await fetch(editingId ? "/api/articles/" + editingId : "/api/articles", {
    method: editingId ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('echopress_token')}` },
    body: JSON.stringify(payload)
  });
  alert("Réussi !");
  fetchArticlesAdmin();
};

// Maintenance
async function loadMaintenanceStatus() {
  const res = await fetch('/api/settings/maintenance_mode');
  const data = await res.json();
  const toggle = document.getElementById('maintenance-toggle');
  if (toggle) toggle.checked = (data.value === 'true');
}

// Initial
fetchArticlesAdmin();
loadAboutAdmin();
fetchUsers();
loadMaintenanceStatus();

// Exports for HTML
window.fetchArticlesAdmin = fetchArticlesAdmin;
window.fetchUsers = fetchUsers;
