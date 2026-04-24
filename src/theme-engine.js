import './widgets.js';

const getSeason = () => {
    // Get month in Montreal time (1-12)
    const montrealMonthStr = new Intl.DateTimeFormat('en-US', { 
        month: 'numeric', 
        timeZone: 'America/Toronto' 
    }).format(new Date());
    
    const month = parseInt(montrealMonthStr, 10);
    
    if (month >= 3 && month <= 5) return 'spring'; // March, April, May
    if (month >= 6 && month <= 8) return 'summer'; // June, July, August
    if (month >= 9 && month <= 11) return 'fall';   // September, October, November
    return 'winter'; // December, January, February
};

const applySeason = () => {
    const season = getSeason();
    document.documentElement.className = `season-${season}`;
    console.log(`[ThemeEngine] Season detected: ${season}`);
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applySeason);
} else {
    applySeason();
}

// Anti-Inspection & Security Hardening
(function() {
    // Disable right-click
    document.addEventListener('contextmenu', e => e.preventDefault());

    // Disable common devtools shortcuts
    document.addEventListener('keydown', e => {
        // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, Ctrl+Shift+C
        if (
            e.key === 'F12' || 
            (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j')) ||
            (e.ctrlKey && (e.key === 'U' || e.key === 'u')) ||
            (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c'))
        ) {
            e.preventDefault();
            return false;
        }
    });

    // Detect DevTools opening (basic deterrent)
    // This script creates a minor lag or pause if DevTools is kept open
    setInterval(() => {
        const threshold = 160;
        const widthThreshold = window.outerWidth - window.innerWidth > threshold;
        const heightThreshold = window.outerHeight - window.innerHeight > threshold;
        if (widthThreshold || heightThreshold) {
            // DevTools might be open
            // debugger; // Uncomment to really annoy hackers
        }
    }, 1000);
})();

export { getSeason };
