// Sync patching of fetch
const token = localStorage.getItem('echopress_token') || localStorage.getItem('public_token');
if (!window._fetchPatched) {
  const originalFetch = window.fetch;
  window.fetch = async function(resource, options) {
    let url = typeof resource === 'string' ? resource : (resource.url || '');
    let currentToken = localStorage.getItem('echopress_token');
    
    // Auto-fetch public token if completely missing
    if (!currentToken && url.includes('/api/') && !url.includes('/api/public/token')) {
      try {
        const pubRes = await originalFetch('/api/public/token', { headers: { 'x-echo-client': 'EchoPress2026' } });
        if (pubRes.ok) {
           const pubData = await pubRes.json();
           currentToken = pubData.token;
           localStorage.setItem('echopress_token', currentToken);
        }
      } catch (e) {}
    }

    // Add token if it exists and it's an API call
    if (currentToken && currentToken !== 'null' && url.includes('/api/')) {
      options = options || {};
      options.headers = options.headers || {};
      const authVal = `Bearer ${currentToken}`;
      if (options.headers instanceof Headers) {
        options.headers.set('Authorization', authVal);
      } else {
        options.headers['Authorization'] = authVal;
      }
    }
    const response = await originalFetch.call(this, resource, options);
    
    // Maintenance Mode redirection (Apply to ALL users)
    if (response.status === 503 && !window.location.pathname.includes('maintenance.html')) {
       const data = await response.clone().json().catch(() => ({}));
       const reason = encodeURIComponent(data.reason || 'Le site est en maintenance.');
       window.location.href = `/maintenance.html?reason=${reason}`;
       return response;
    }

    // Automatic kickout on suspension or deletion
    if (response.status === 401 || response.status === 403) {
      // Don't kickout if we're already on login/register or public token
      const isAuthRoute = typeof resource === 'string' && (resource.includes('/api/login') || resource.includes('/api/register') || resource.includes('/api/public/token'));
      if (!isAuthRoute && localStorage.getItem('echopress_token')) {
        const data = await response.clone().json().catch(() => ({}));
        const reason = data.reason ? ` Raison : ${data.reason}` : '';
        const errorMsg = encodeURIComponent((data.error || 'Session expirée ou invalide') + reason);
        
        localStorage.removeItem('echopress_user');
        localStorage.removeItem('echopress_token');
        window.location.href = `/login.html?error=${errorMsg}`;
      }
    }
    return response;
  };
  window._fetchPatched = true;

  // Heartbeat: Check status for everyone to ensure maintenance kickout works
  // We use /api/public/token as a lightweight heartbeat for non-logged users
  const heartbeatEndpoint = token ? '/api/auth/check' : '/api/public/token';
  
  // Don't run heartbeat if already on maintenance page
  if (!window.location.pathname.includes('maintenance.html')) {
    const checkStatus = () => {
      fetch(heartbeatEndpoint, { headers: { 'x-echo-client': 'EchoPress2026' } }).catch(() => {});
    };
    
    // Initial check on load for immediate redirection
    checkStatus();
    setInterval(checkStatus, 10000);
  }
}

export function setupAuthUI() {

  const userStr = localStorage.getItem('echopress_user');
  const authLinks = document.querySelector('.auth-links');
  const headerActions = document.querySelector('.header-actions');
  
  if (userStr && authLinks) {
    const user = JSON.parse(userStr);
    
    // Setup icon
    const accountIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 5px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
    let greetingText;
    if (user.username === 'BountyHunter') {
      greetingText = 'Bonjour Sacha!';
    } else if (user.username === 'EchoPressOwner') {
      greetingText = 'Bonjour Théo!';
    } else {
      greetingText = `Bonjour, ${user.username}`;
    }
    
    // Update Auth Links
    authLinks.innerHTML = `
      <span style="font-weight:600;font-size:14px;color:var(--accent);display:flex;align-items:center;">
        ${accountIcon} ${greetingText}
      </span>
      <span style="color:var(--text-dim);margin:0 10px;">•</span>
      <a href="#" id="logout-btn" style="color:var(--text-dim);font-weight:500;transition:color 0.3s;" onmouseover="this.style.color='var(--accent)'" onmouseout="this.style.color='var(--text-dim)'">Se déconnecter</a>
    `;
    
    document.getElementById('logout-btn').addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('echopress_user');
      localStorage.removeItem('echopress_token');
      sessionStorage.removeItem('last_intro'); // Reset intro for next login
      window.location.reload();
    });
    
    // Add Admin button if owner, journalist, corrector or supervisor
    if (user.role === 'owner' || user.role === 'journalist' || user.role === 'corrector' || user.role === 'supervisor') {
      const adminBtn = document.createElement('a');
      adminBtn.href = (user.role === 'journalist' || user.role === 'corrector' || user.role === 'supervisor') ? '/journalist.html' : '/admin.html';
      adminBtn.className = 'btn-soutien';
      adminBtn.style.marginLeft = '15px';
      adminBtn.textContent = user.role === 'corrector' ? 'Corriger' : (user.role === 'supervisor' ? 'Superviser' : (user.role === 'journalist' ? 'Écrire' : 'Gestion'));
      
      authLinks.appendChild(adminBtn);

      const archivesBtn = document.createElement('a');
      archivesBtn.href = '/archives.html';
      archivesBtn.className = 'btn-soutien';
      archivesBtn.style.marginLeft = '10px';
      archivesBtn.style.background = 'rgba(255,255,255,0.05)';
      archivesBtn.textContent = 'Archives';
      authLinks.appendChild(archivesBtn);
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupAuthUI);
} else {
  setupAuthUI();
}
