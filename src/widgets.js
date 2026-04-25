// Global Widgets: Notifications and Header Time/Weather

export const initWidgets = async () => {
    // 1. Ensure .header-meta exists for time & weather
    const headerTop = document.querySelector('.header-top');
    let headerMeta = document.querySelector('.header-meta');
    
    if (headerTop && !headerMeta) {
        headerMeta = document.createElement('div');
        headerMeta.className = 'header-meta';
        const logo = headerTop.querySelector('.header-logo');
        if (logo) {
            logo.after(headerMeta);
        } else {
            headerTop.prepend(headerMeta);
        }
    }

    // 2. Weather & Time Logic
    let weatherData = null;
    const fetchWeather = async () => {
        try {
            const res = await fetch('/api/weather');
            if (res.ok) weatherData = await res.json();
        } catch (e) {}
    };

    const updateHeaderTime = () => {
        if (!headerMeta) return;

        // Initialize stable structure if not present
        if (!headerMeta.querySelector('#header-clock-container')) {
            headerMeta.style.width = "100%";
            headerMeta.style.display = "flex";
            headerMeta.style.justifyContent = "space-between";
            headerMeta.style.alignItems = "center";
            headerMeta.style.position = "relative";
            headerMeta.style.margin = "0 20px"; // give it some margin

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

        const dateEl = document.getElementById('header-date');
        const timeEl = document.getElementById('header-time');
        if (dateEl) dateEl.textContent = dateStr;
        if (timeEl) timeEl.textContent = timeStr;

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

    if (headerMeta) {
        await fetchWeather();
        updateHeaderTime();
        setInterval(updateHeaderTime, 1000);
        setInterval(fetchWeather, 300000); // Update weather every 5 min
    }
};

// --- OWNER LIVE NOTIFICATIONS WIDGET ---
export async function initOwnerNotifications() {
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

  // Track the last time we showed a notification to avoid duplicates across logins
  const lastKnownTime = localStorage.getItem('owner_last_notif_time');
  let lastCheckTime;
  
  if (!lastKnownTime) {
    // First time ever on this device: show last 24h
    lastCheckTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    localStorage.setItem('owner_last_notif_time', lastCheckTime);
  } else {
    // Use the stored timestamp
    lastCheckTime = lastKnownTime;
  }

  const isFirstSessionLoad = !sessionStorage.getItem('owner_live_notifs_session_init');
  if (isFirstSessionLoad) {
    sessionStorage.setItem('owner_live_notifs_session_init', 'true');
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
        // Find the most recent notification time
        const latestTime = notifications.reduce((latest, n) => {
          return n.created_at > latest ? n.created_at : latest;
        }, lastCheckTime);

        notifications.forEach(notif => {
          showToast(notif);
        });

        lastCheckTime = latestTime;
        localStorage.setItem('owner_last_notif_time', lastCheckTime);
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
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidgets);
} else {
    initWidgets();
}
window.addEventListener('load', initOwnerNotifications);
