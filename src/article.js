import Plyr from 'plyr';
import 'plyr/dist/plyr.css';
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

    // Improved YouTube ID Extractor Helper
    function extractYouTubeId(url) {
        if (!url) return null;
        const regExp = /^.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[1].length === 11) ? match[1] : null;
    }

    const contentContainer = document.getElementById('article-view');

    if (contentContainer && articleData) {
        let mediaHtml = '';
        if (articleData.image) {
            if (articleData.category === 'videos') {
                const ytId = extractYouTubeId(articleData.image);
                if (ytId) {
                    mediaHtml = `
                        <div class="plyr__video-embed" id="player" style="border-radius: 12px; overflow: hidden; margin-bottom: 2rem; border: 1px solid var(--lp-gray-mid);">
                            <iframe src="https://www.youtube-nocookie.com/embed/${ytId}?origin=${window.location.origin}&amp;iv_load_policy=3&amp;modestbranding=1&amp;playsinline=1&amp;showinfo=0&amp;rel=0&amp;enablejsapi=1" allowfullscreen allowtransparency allow="autoplay"></iframe>
                        </div>`;
                } else {
                    mediaHtml = `<video src="${articleData.image.startsWith('http') ? articleData.image : '/' + articleData.image}" class="main-img" controls autoplay style="border-radius: 12px; margin-bottom: 2rem;"></video>`;
                }
            } else {
                mediaHtml = `<img src="${articleData.image.startsWith('http') ? articleData.image : '/' + articleData.image}" alt="${articleData.title}" class="main-img">`;
            }
        }

        contentContainer.innerHTML = `
            <span class="surtitle">${articleData.surtitle}${articleData.sub_category ? ` | ${articleData.sub_category}` : ''}</span>
            <h1>${articleData.title}</h1>
            <div class="meta">
               ${articleData.author ? `<strong>${getDisplayName(articleData.author)}</strong> • ` : ''} 
               ${articleData.published_time}
               ${articleData.modified_at && articleData.modified_by ? `
                 <div style="font-size: 0.8rem; color: var(--text-dim); margin-top: 10px;">
                   Modifié par <strong>${getDisplayName(articleData.modified_by)}</strong> • ${articleData.modified_at}
                 </div>` : ''}
            </div>
            ${mediaHtml}
            ${articleData.image_credit ? `<p style="font-size: 0.75rem; color: var(--text-dim); margin-top: -1rem; margin-bottom: 2rem; text-align: right;">Photo/Vidéo: ${articleData.image_credit}</p>` : ''}
            <div class="content">
                <div style="font-weight: 500; font-size: 1.2rem; color: var(--text-main); margin-bottom: 2rem; border-left: 4px solid var(--accent); padding-left: 1.5rem;">
                   ${articleData.summary}
                </div>
            </div>
        `;
        
        // Initialize Plyr if it's a video
        if (articleData.category === 'videos' && typeof Plyr !== 'undefined') {
            new Plyr('#player', {
                settings: ['quality', 'speed'],
                youtube: { noCookie: true, rel: 0, showinfo: 0, iv_load_policy: 3, modestbranding: 1 }
            });
        }
    } else if (contentContainer) {
        contentContainer.innerHTML = `<h1>Article introuvable</h1><p>Désolé, l'article demandé n'existe pas.</p>`;
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
