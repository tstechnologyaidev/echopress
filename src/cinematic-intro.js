const scrambleText = (el, finalContent, duration = 2000) => {
    const chars = '!<>-_\\/[]{}—=+*^?#________';
    let frame = 0;
    const totalFrames = duration / 60;
    const originalText = el.innerText;
    
    const tick = () => {
        let current = '';
        for (let i = 0; i < finalContent.length; i++) {
            if (Math.random() < frame / totalFrames) {
                current += finalContent[i];
            } else {
                current += chars[Math.floor(Math.random() * chars.length)];
            }
        }
        el.innerText = current;
        if (frame < totalFrames) {
            frame++;
            requestAnimationFrame(tick);
        } else {
            el.innerText = finalContent;
        }
    };
    tick();
};

const runIntro = (userName, isOwner = false) => {
    const overlay = document.createElement('div');
    overlay.id = 'intro-overlay';
    
    const greeting = isOwner ? `ACCÈS PROPRIÉTAIRE: Bonjour ${userName}!!!` : `Bon retour parmi nous ${userName}!!!`;
    
    overlay.innerHTML = `
        <canvas id="intro-canvas"></canvas>
        <div id="intro-text" style="${isOwner ? 'font-family: monospace; letter-spacing: 5px; background: linear-gradient(135deg, #00FF94, #00D1FF); -webkit-background-clip: text;' : ''}">${greeting}</div>
    `;
    document.body.prepend(overlay);

    const canvas = document.getElementById('intro-canvas');
    const ctx = canvas.getContext('2d');
    const text = document.getElementById('intro-text');

    let width, height;
    const resize = () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    class Particle {
        constructor(x, y, color) {
            this.x = x;
            this.y = y;
            this.color = color;
            this.velocity = {
                x: (Math.random() - 0.5) * (isOwner ? 12 : 8),
                y: (Math.random() - 0.5) * (isOwner ? 12 : 8)
            };
            this.alpha = 1;
            this.friction = 0.95;
            this.gravity = 0.1;
        }

        draw() {
            ctx.save();
            ctx.globalAlpha = this.alpha;
            ctx.beginPath();
            ctx.arc(this.x, this.y, isOwner ? 3 : 2, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.restore();
        }

        update() {
            this.velocity.x *= this.friction;
            this.velocity.y *= this.friction;
            this.velocity.y += this.gravity;
            this.x += this.velocity.x;
            this.y += this.velocity.y;
            this.alpha -= 0.01;
        }
    }

    class Firework {
        constructor(x, y, color) {
            this.x = x;
            this.y = y;
            this.color = color;
            this.particles = [];
            const count = isOwner ? 60 : 40;
            for (let i = 0; i < count; i++) {
                this.particles.push(new Particle(x, y, color));
            }
        }

        update() {
            this.particles.forEach((p, i) => {
                if (p.alpha <= 0) {
                    this.particles.splice(i, 1);
                } else {
                    p.update();
                }
            });
        }

        draw() {
            this.particles.forEach(p => p.draw());
        }
    }

    const fireworks = [];
    const colors = isOwner ? ['#00FF94', '#00D1FF', '#FFFFFF'] : ['#00D1FF', '#7000FF', '#FF00A8', '#FFD600', '#00FF94'];

    const animate = () => {
        if (!overlay.classList.contains('hide-overlay')) {
            requestAnimationFrame(animate);
        }
        ctx.fillStyle = isOwner ? 'rgba(0, 5, 0, 0.15)' : 'rgba(0, 0, 0, 0.15)';
        ctx.fillRect(0, 0, width, height);

        if (Math.random() < (isOwner ? 0.08 : 0.05)) {
            fireworks.push(new Firework(
                Math.random() * width,
                Math.random() * height * 0.6,
                colors[Math.floor(Math.random() * colors.length)]
            ));
        }

        fireworks.forEach((fw, i) => {
            fw.update();
            fw.draw();
            if (fw.particles.length === 0) fireworks.splice(i, 1);
        });
    };

    animate();

    // Start Text Reveal
    setTimeout(() => {
        text.classList.add('reveal-text');
        if (isOwner) {
            scrambleText(text, greeting, 1500);
        }
    }, 500);

    // Dismiss Overlay
    setTimeout(() => {
        overlay.classList.add('hide-overlay');
        setTimeout(() => overlay.remove(), 1000);
    }, 4500);
};

const checkAndTriggerIntro = () => {
    const userStr = localStorage.getItem('echopress_user');
    if (userStr) {
        const user = JSON.parse(userStr);
        const lastIntro = sessionStorage.getItem('last_intro');
        
        if (!lastIntro) {
            let name = user.username;
            if (name === 'BountyHunter') name = 'Sacha';
            if (name === 'EchoPressOwner') name = 'Théo';
            
            runIntro(name, user.role === 'owner');
            sessionStorage.setItem('last_intro', Date.now());
        }
    }
};

window.addEventListener('load', () => {
    // We only trigger the cinematic greeting if we are on the homepage
    const isHomepage = window.location.pathname === '/' || window.location.pathname.endsWith('index.html');
    if (isHomepage) {
        checkAndTriggerIntro();
    }
});

export { runIntro, scrambleText, checkAndTriggerIntro };
