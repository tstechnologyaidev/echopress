// Automatic Public Token Fetcher
const PUBLIC_TOKEN_KEY = 'public_token';
const PUBLIC_TOKEN_TS_KEY = 'public_token_ts';
const PUBLIC_CLIENT_HEADER = 'EchoPress2026';

// --- OWNER LIVE NOTIFICATIONS WIDGET ---
async function initOwnerNotifications() {
  const userStr = localStorage.getItem('echopress_user');
  if (!userStr) return;
  const user = JSON.parse(userStr);
  if (user.role !== 'owner') return;

  // Create container if it doesn't exist
  let container = document.getElementById('owner-live-alerts');
  if (!container) {
    container = document.createElement('div');
    container.id = 'owner-live-alerts';
    document.body.appendChild(container);
  }
  container.style.display = 'flex';

  let lastCheckTime = new Date().toISOString();
  
  async function fetchNewAlerts() {
    try {
      const token = localStorage.getItem('echopress_token');
      const res = await fetch(`/api/notifications?unreadOnly=true&since=${lastCheckTime}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return;
      const notifications = await res.json();
      
      if (notifications.length > 0) {
        notifications.forEach(notif => {
          showToast(notif);
        });
        lastCheckTime = new Date().toISOString();
      }
    } catch (e) {
      console.error('Notification error:', e);
    }
  }

  function showToast(notif) {
    const toast = document.createElement('div');
    toast.className = `alert-toast ${notif.severity || 'low'}`;
    
    const icon = notif.type === 'security' ? '🛡️' : '✉️';
    const time = new Date(notif.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    toast.innerHTML = `
      <h5><span>${icon} ${notif.type.toUpperCase()}</span></h5>
      <p>${notif.message}</p>
      <span class="time">${time}</span>
    `;

    container.prepend(toast);

    // Auto-remove after 8 seconds
    setTimeout(() => {
      toast.style.transform = 'translateX(100px)';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 500);
    }, 8000);
  }

  // Poll every 5 seconds
  setInterval(fetchNewAlerts, 5000);
  fetchNewAlerts(); // Initial check
}

// Initialize on load
window.addEventListener('load', initOwnerNotifications);

/**
 * Retrieves a valid public token, fetching a new one if missing or older than 23 hours.
 */
async function getPublicToken() {
  const stored = localStorage.getItem(PUBLIC_TOKEN_KEY);
  const ts = parseInt(localStorage.getItem(PUBLIC_TOKEN_TS_KEY) || '0', 10);
  const now = Date.now();
  // Refresh if token older than 23h (82800000 ms)
  if (stored && now - ts < 82800000) {
    return stored;
  }
  try {
    const res = await fetch('/api/public/token', {
      method: 'GET',
      headers: { 'x-echo-client': PUBLIC_CLIENT_HEADER }
    });
    if (!res.ok) throw new Error('Failed to fetch public token');
    const data = await res.json();
    if (data.token) {
      localStorage.setItem(PUBLIC_TOKEN_KEY, data.token);
      localStorage.setItem(PUBLIC_TOKEN_TS_KEY, now.toString());
      return data.token;
    }
    throw new Error('Token not present in response');
  } catch (e) {
    console.error('Public token fetch error:', e);
    return null;
  }
}

import { categories } from './data.js';

const initMain = async () => {
    // 0. Fetch articles from Database API
    let articles = [];
    try {
        const response = await fetch('/api/articles');
        if (response.ok) {
            articles = await response.json();
        }
    } catch(err) {
        console.error("Failed to fetch articles", err);
    }
    // 1. Render Navigation
    const navUl = document.getElementById('nav-categories');
    if (navUl) {
        categories.forEach(cat => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = `/?category=${cat.id}`;
            a.textContent = cat.label;
            li.appendChild(a);
            navUl.appendChild(li);
        });
    }

    // Filter articles based on category if needed
    const urlParams = new URLSearchParams(window.location.search);
    const filterCat = urlParams.get('category');
    
    let displayArticles = articles;
    if (filterCat) {
        displayArticles = articles.filter(a => a.category === filterCat);
    }

    // 2. Render Hero Article
    const heroContainer = document.getElementById('hero-article');
    if (heroContainer && displayArticles.length > 0) {
        const heroData = displayArticles[0];
        heroContainer.innerHTML = `
            <a href="article.html?id=${heroData.id}" style="display:block;">
            ${heroData.image ? `<img src="${heroData.image.startsWith('http') ? heroData.image : '/' + heroData.image}" alt="Hero Image" class="hero-image">` : ''}
                <div class="hero-content">
                    <span class="surtitle">${heroData.surtitle}</span>
                    <h2 class="hero-title">${heroData.title}</h2>
                </div>
            </a>
        `;
    } else if (heroContainer) {
        heroContainer.innerHTML = `<p>Aucun article trouvé pour cette catégorie.</p>`;
    }

    // 3. Render Article Grid (the rest of the articles)
    const gridContainer = document.getElementById('main-articles');
    if (gridContainer && displayArticles.length > 1) {
        const gridArticles = displayArticles.slice(1);
        gridArticles.forEach(art => {
            const card = document.createElement('a');
            card.href = `article.html?id=${art.id}`;
            card.className = 'card-article';
            card.innerHTML = `
                ${art.image ? `<img src="${art.image.startsWith('http') ? art.image : '/' + art.image}" alt="${art.title}" class="card-image">` : `<div class="card-image" style="display:flex;align-items:center;justify-content:center;">Pas d'image</div>`}
                <span class="surtitle">${art.surtitle}</span>
                <h3 class="card-title">${art.title}</h3>
                <span class="published-time">${art.published_time}</span>
            `;
            gridContainer.appendChild(card);
        });
    }
    // 4. Render Popular Articles in Sidebar
    const popularContainer = document.getElementById('popular-list');
    if (popularContainer) {
        try {
            const popRes = await fetch('/api/popular');
            if (popRes.ok) {
                const popularArticles = await popRes.json();
                popularContainer.innerHTML = '';
                popularArticles.forEach((art, index) => {
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <a href="article.html?id=${art.id}">
                            <span class="pop-rank">${index + 1}</span>
                            <span class="pop-title">${art.title}</span>
                        </a>
                    `;
                    popularContainer.appendChild(li);
                });
            }
        } catch(err) {
            console.error("Failed to fetch popular articles", err);
        }
    }

    // 5. Update Header Time & Weather
    let weatherData = null;
    const fetchWeather = async () => {
        try {
            const res = await fetch('/api/weather');
            if (res.ok) weatherData = await res.json();
        } catch (e) {}
    };

    const updateHeaderTime = () => {
        const headerMeta = document.querySelector('.header-meta');
        if (headerMeta) {
            const now = new Date();
            const dateFormatter = new Intl.DateTimeFormat('fr-CA', {
                timeZone: 'America/Toronto',
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
            let dateStr = dateFormatter.format(now);
            dateStr = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

            const timeFormatter = new Intl.DateTimeFormat('fr-CA', {
                timeZone: 'America/Toronto',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
            const timeParts = timeFormatter.formatToParts(now);
            const hour = timeParts.find(p => p.type === 'hour')?.value || '00';
            const minute = timeParts.find(p => p.type === 'minute')?.value || '00';
            const second = timeParts.find(p => p.type === 'second')?.value || '00';
            const timeStr = `${hour}:${minute}:${second}`;

            const weatherStr = weatherData ? ` • ${weatherData.temperature}°C ${weatherData.condition}` : '';

            headerMeta.innerHTML = `
                <div style="font-size: 0.85rem; color: var(--text-dim); text-align: right;">
                    <span style="font-weight: 700; color: var(--text-main);">${dateStr}</span><br>
                    <span>Montréal • ${timeStr}${weatherStr}</span>
                </div>
            `;
        }
    };
    
    await fetchWeather();
    updateHeaderTime();
    setInterval(updateHeaderTime, 1000);
    setInterval(fetchWeather, 300000); // Update weather every 5 min
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMain);
} else {
    initMain();
}
