import { categories } from './data.js';

function getDisplayName(username) {
  if (username === 'EchoPressOwner') return 'Théo Forest Tran';
  if (username === 'BountyHunter') return 'Sacha Wrzeszcz Bossé';
  return username;
}

const initArticle = async () => {
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
    // 1. Render Navigation (same as main)
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

    // 2. Fetch current article by ID (to trigger view increment)
    const urlParams = new URLSearchParams(window.location.search);
    const articleId = urlParams.get('id');
    
    let articleData = null;
    if (articleId) {
        try {
            const res = await fetch(`/api/articles/${articleId}`);
            if (res.ok) {
                articleData = await res.json();
            }
        } catch(err) {
            console.error("Failed to fetch article details", err);
        }
    }

    const contentContainer = document.getElementById('article-content');

    if (contentContainer && articleData) {
        contentContainer.innerHTML = `
            <span class="surtitle" style="font-size:16px;">${articleData.surtitle}${articleData.sub_category ? ` | ${articleData.sub_category}` : ''}</span>
            <h1>${articleData.title}</h1>
            <div class="meta">
               ${articleData.author ? `<strong>${articleData.author}</strong> | ` : ''} 
               ${articleData.published_time}
               ${articleData.modified_at && articleData.modified_by ? `
                 <br><span style="font-size:12px; color: var(--lp-gray-dark); margin-top: 4px; display: block;">
                   Modifié le ${articleData.modified_at} par <strong>${getDisplayName(articleData.modified_by)}</strong>
                 </span>` : ''}
            </div>
            ${articleData.image ? `<img src="${articleData.image.startsWith('http') ? articleData.image : '/' + articleData.image}" alt="${articleData.title}" class="main-img">` : ''}
            ${articleData.image_credit ? `<p style="font-size: 13px; color: var(--lp-gray-dark); margin-top: 5px; text-align: right;">Photo: ${articleData.image_credit}</p>` : ''}
            <div class="content">
                <div style="font-weight: 500; font-size: 1.1em; color: var(--lp-gray-dark); margin-bottom: 20px;">
                   ${articleData.summary}
                </div>
            </div>
        `;
    } else if (contentContainer) {
        contentContainer.innerHTML = `<h1>Article introuvable</h1><p>Désolé, l'article demandé n'existe pas ou l'identifiant est invalide.</p>`;
    }

    // 3. Render Popular Articles in Sidebar
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
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initArticle);
} else {
    initArticle();
}
