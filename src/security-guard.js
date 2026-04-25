/**
 * EchoPress Security Guard - Anti-Inspection & Hardening
 * Note: Real security is server-side. This script provides layers of obscurity 
 * to deter casual inspection and reverse engineering.
 */
(function() {
    // Self-detect owner role to allow legitimate debugging
    const userStr = localStorage.getItem('echopress_user');
    const user = userStr ? JSON.parse(userStr) : null;
    const isOwner = user && user.role === 'owner';

    // 1. Disable Right Click
    document.addEventListener('contextmenu', (e) => {
        if (isOwner) return; 
        e.preventDefault();
    }, false);

    // 2. Disable DevTools Shortcuts
    document.addEventListener('keydown', (e) => {
        if (isOwner) return;

        // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, Ctrl+S
        const forbiddenKeys = ['F12', 'I', 'J', 'U', 'S'];
        const isForbidden = (e.ctrlKey && e.shiftKey && forbiddenKeys.includes(e.key.toUpperCase())) ||
                           (e.ctrlKey && forbiddenKeys.includes(e.key.toUpperCase())) ||
                           (e.key === 'F12');

        if (isForbidden) {
            e.preventDefault();
            return false;
        }
    });

    // 3. Debugger Trap (Infinite loop if devtools is open)
    // This makes the browser hang if they try to use the debugger
    const trap = function() {
        if (isOwner) return;
        try {
            (function(a) {
                return (function(a) {
                    return Function('Function("debugger;")()')();
                })(a);
            })(0);
        } catch (e) {}
        setTimeout(trap, 100);
    };
    // trap(); // Disabled by default as it can be annoying, but can be enabled for ultra-hard mode

    // 4. Console Purge
    const clearConsole = () => {
        if (isOwner) return;
        console.clear();
        console.log('%c EchoPress Security Protocol Active ', 'background: #222; color: #c5a059; font-size: 20px; font-weight: bold; padding: 10px; border-radius: 5px;');
        console.log('%c STOP! %c Toute tentative d\'accès non-autorisé est enregistrée.', 'color: red; font-size: 30px; font-weight: bold;', 'color: gray; font-size: 14px;');
    };
    
    // Clear console periodically
    if (!isOwner) {
        setInterval(clearConsole, 2000);
    }

    // 5. Detect DevTools Opening
    let devtoolsOpen = false;
    const threshold = 160;
    const checkDevTools = () => {
        if (isOwner) return;
        const widthThreshold = window.outerWidth - window.innerWidth > threshold;
        const heightThreshold = window.outerHeight - window.innerHeight > threshold;
        
        if (widthThreshold || heightThreshold) {
            if (!devtoolsOpen) {
                // Log security alert via API if possible
                fetch('/api/test-security-alert', { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('echopress_token')}` },
                    body: JSON.stringify({ reason: 'DevTools Detection' })
                }).catch(() => {});
                devtoolsOpen = true;
            }
        } else {
            devtoolsOpen = false;
        }
    };
    setInterval(checkDevTools, 1000);

})();
