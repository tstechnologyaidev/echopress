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

  // Use sessionStorage to ensure past 24h alerts only show once per session.
  // On subsequent page loads, only fetch real-time alerts.
  let lastCheckTime;
  const isFirstSessionLoad = !sessionStorage.getItem('owner_live_notifs_init');
  
  if (isFirstSessionLoad) {
    lastCheckTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    sessionStorage.setItem('owner_live_notifs_init', 'true');
  } else {
    lastCheckTime = new Date().toISOString();
  }
  
  async function fetchNewAlerts() {
    try {
      const token = localStorage.getItem('echopress_token');
      const res = await fetch(`/api/notifications?unreadOnly=true&since=${encodeURIComponent(lastCheckTime)}`, {
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

  // Delay the initial check if it's the first load to allow the cinematic intro to finish
  const initialDelay = isFirstSessionLoad ? 5000 : 0;
  
  setTimeout(() => {
    fetchNewAlerts(); // Initial check
    // Poll every 5 seconds
    setInterval(fetchNewAlerts, 5000);
  }, initialDelay);
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
        if (!headerMeta) return;

        // Initialize stable structure if not present
        if (!headerMeta.querySelector('#header-clock-container')) {
            headerMeta.style.width = "100%";
            headerMeta.style.display = "flex";
            headerMeta.style.justifyContent = "space-between";
            headerMeta.style.alignItems = "center";
            headerMeta.style.position = "relative";

            headerMeta.innerHTML = `
                <div id="header-clock-container" style="font-size: 0.85rem; color: var(--text-dim); text-align: left; display: flex; gap: 15px; align-items: center;">
                    <span id="header-date" style="font-weight: 700; color: var(--text-main);"></span>
                    <span id="header-time" style="font-family: monospace; opacity: 0.7;"></span>
                </div>
                <div id="weather-container"></div>
                <div id="weather-expansion" style="display:none; position: absolute; top: 100%; right: 0; background: var(--glass-bg); backdrop-filter: blur(30px); border: 1px solid var(--glass-border); padding: 25px; border-radius: 24px; z-index: 1000; box-shadow: 0 20px 40px rgba(0,0,0,0.5); min-width: 320px; margin-top: 15px;">
                    <h4 style="margin: 0 0 20px 0; font-family: 'Outfit'; font-size: 1.1rem; border-bottom: 1px solid var(--glass-border); padding-bottom: 12px; color: var(--accent);">Prévisions de la semaine</h4>
                    <div id="forecast-list" style="display: flex; flex-direction: column; gap: 14px;"></div>
                </div>
            `;
        }

        const now = new Date();
        const dateFormatter = new Intl.DateTimeFormat('fr-CA', {
            timeZone: 'America/Toronto',
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        });
        let dateStr = dateFormatter.format(now);
        dateStr = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

        const timeFormatter = new Intl.DateTimeFormat('fr-CA', {
            timeZone: 'America/Toronto',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        });
        const timeStr = timeFormatter.format(now);

        document.getElementById('header-date').textContent = dateStr;
        document.getElementById('header-time').textContent = timeStr;

        // Update Weather Widget if data available
        const weatherContainer = document.getElementById('weather-container');
        if (weatherData && weatherContainer && !weatherContainer.innerHTML) {
            weatherContainer.innerHTML = `
                <div id="weather-widget" style="cursor:pointer; padding: 6px 16px; background: rgba(255,255,255,0.06); border: 1px solid var(--glass-border); border-radius: 50px; transition: all 0.3s;" onclick="window.toggleWeatherForecast()">
                    <span style="font-weight: 700; color: var(--text-main);">${weatherData.temperature}°C</span> 
                    <span style="margin-left: 8px;">${weatherData.condition}</span>
                </div>
            `;
        }
    };

    window.toggleWeatherForecast = () => {
        const expansion = document.getElementById('weather-expansion');
        if (!expansion || !weatherData || !weatherData.forecast) return;

        const isVisible = expansion.style.display === 'block';
        expansion.style.display = isVisible ? 'none' : 'block';

        if (!isVisible) {
            const list = document.getElementById('forecast-list');
            list.innerHTML = weatherData.forecast.map(d => {
                const dayName = new Date(d.date).toLocaleDateString('fr-CA', { weekday: 'short', day: 'numeric' });
                return `
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.95rem;">
                        <span style="width: 90px; font-weight: 600; color: var(--text-main);">${dayName}</span>
                        <span style="flex: 1; text-align: center; opacity: 0.8; font-size: 0.85rem;">${d.condition}</span>
                        <span style="width: 80px; text-align: right;">
                            <span style="color: #ff4b2b; font-weight: 700;">${d.max}°</span>
                            <span style="color: #3b82f6; margin-left: 8px; opacity: 0.5;">${d.min}°</span>
                        </span>
                    </div>
                `;
            }).join('');
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
