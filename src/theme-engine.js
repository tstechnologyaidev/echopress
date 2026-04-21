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

export { getSeason };
