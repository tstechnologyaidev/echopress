// Sync patching of fetch
const token = localStorage.getItem('echopress_token');
if (token && !window._fetchPatched) {
  const originalFetch = window.fetch;
  window.fetch = async function(resource, options) {
    if (typeof resource === 'string' && resource.startsWith('/api/') && !resource.startsWith('/api/weather') && !resource.startsWith('/api/popular')) {
      options = options || {};
      options.headers = options.headers || {};
      if (options.headers instanceof Headers) {
        options.headers.append('Authorization', `Bearer ${token}`);
      } else {
        options.headers['Authorization'] = `Bearer ${token}`;
      }
    }
    const response = await originalFetch.call(this, resource, options);
    // Connection limitation removed: No auto-redirect to login on unauthorized status
    /*
    if (response.status === 401 || response.status === 403) {
      if (resource !== '/api/login' && resource !== '/api/register') {
         localStorage.removeItem('echopress_user');
         localStorage.removeItem('echopress_token');
         window.location.href = '/login.html';
      }
    }
    */
    return response;
  };
  window._fetchPatched = true;
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
