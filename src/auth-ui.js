export function setupAuthUI() {
  const userStr = localStorage.getItem('echopress_user');
  const authLinks = document.querySelector('.auth-links');
  const headerActions = document.querySelector('.header-actions');
  
  if (userStr && authLinks) {
    const user = JSON.parse(userStr);
    
    // Setup icon
    const accountIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 5px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
    const greetingText = user.role === 'owner' ? 'Bonjour Sacha!' : `Bonjour, ${user.username}`;
    
    // Update Auth Links
    authLinks.innerHTML = `
      <span style="font-weight:600;font-size:14px;color:var(--lp-red);display:flex;align-items:center;">
        ${accountIcon} ${greetingText}
      </span>
      <span style="color:var(--lp-gray-mid);margin:0 5px;">|</span>
      <a href="#" id="logout-btn" style="color:var(--lp-gray-dark);font-weight:500;">Se déconnecter</a>
    `;
    
    document.getElementById('logout-btn').addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('echopress_user');
      window.location.reload();
    });
    
    // Add Admin button if owner or journalist
    if (user.role === 'owner' || user.role === 'journalist') {
      const adminBtn = document.createElement('a');
      adminBtn.href = (user.role === 'journalist') ? '/journalist.html' : '/admin.html';
      adminBtn.className = 'btn-soutien';
      adminBtn.style.marginLeft = '10px';
      adminBtn.style.backgroundColor = 'var(--lp-black)';
      adminBtn.style.color = 'var(--lp-white)';
      adminBtn.style.borderColor = 'var(--lp-black)';
      adminBtn.textContent = (user.role === 'journalist') ? 'Publier un article' : 'Gérer les articles';
      
      authLinks.appendChild(adminBtn);
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupAuthUI);
} else {
  setupAuthUI();
}
