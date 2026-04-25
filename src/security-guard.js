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
    // This makes the browser hang/pause if they try to use the inspector
    const trap = function() {
        if (isOwner) return;
        try {
            (function() {
                (function a() {
                    debugger;
                    setTimeout(a, 50);
                }());
            }());
        } catch (e) {}
    };

    // 4. Console Purge
    const clearConsole = () => {
        if (isOwner) return;
        console.clear();
        console.log('%c EchoPress Security Protocol Active ', 'background: #222; color: #c5a059; font-size: 20px; font-weight: bold; padding: 10px; border-radius: 5px;');
    };
    
    // Clear console and start trap
    if (!isOwner) {
        setInterval(clearConsole, 1000);
        // Start the trap - this will only pause the execution IF devtools is open
        setInterval(trap, 2000);
    }

    // 5. Detect DevTools Opening (Menu Bypass Detection)
    let devtoolsOpen = false;
    const checkDevTools = () => {
        if (isOwner) return;
        
        // Detection via window size difference
        const threshold = 160;
        const widthThreshold = window.outerWidth - window.innerWidth > threshold;
        const heightThreshold = window.outerHeight - window.innerHeight > threshold;
        
        // Detection via 'debugger' timing (it runs much slower when devtools is open)
        const start = new Date();
        debugger;
        const end = new Date();
        const isDebugging = (end - start) > 100;

        if (widthThreshold || heightThreshold || isDebugging) {
            if (!devtoolsOpen) {
                fetch('/api/test-security-alert', { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('echopress_token')}` },
                    body: JSON.stringify({ reason: 'DevTools Detection (Menu or Shortcut)' })
                }).catch(() => {});
                
                // If they are not staff, we can even redirect them to the home page or a warning page
                // window.location.href = "/?security_alert=devtools_detected";
                
                devtoolsOpen = true;
            }
        } else {
            devtoolsOpen = false;
        }
    };
    setInterval(checkDevTools, 2000);
})();
