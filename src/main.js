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
                ${heroData.image ? `<img src="${heroData.image.startsWith('http') ? heroData.image : (heroData.image.startsWith('/') ? heroData.image : '/' + heroData.image)}" alt="Hero Image" class="hero-image">` : ''}
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
                ${art.image ? `<img src="${art.image.startsWith('http') ? art.image : (art.image.startsWith('/') ? art.image : '/' + art.image)}" alt="${art.title}" class="card-image">` : `<div class="card-image" style="display:flex;align-items:center;justify-content:center;">Pas d'image</div>`}
                <span class="surtitle">${art.surtitle}</span>
                <h3 class="card-title">${art.title}</h3>
                <span class="published-time">${art.publishedTime}</span>
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
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMain);
} else {
    initMain();
}
