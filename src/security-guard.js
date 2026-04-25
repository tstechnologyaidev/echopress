/**
 * EchoPress Security Guard - Anti-Inspection & Hardening
 * Note: Real security is server-side. This script provides layers of obscurity.
 */
(function() {
    const userStr = localStorage.getItem('echopress_user');
    const user = userStr ? JSON.parse(userStr) : null;
    const isOwner = user && user.role === 'owner';

    // Maintenance mode flag
    let maintenanceMode = false;
    (async () => {
        try {
            const res = await fetch('/api/settings/maintenance_mode');
            if (res.ok) {
                const data = await res.json();
                maintenanceMode = data.value === 'true';
            }
        } catch (e) {
            console.error('Failed to fetch maintenance mode', e);
        }
    })();

    // Right click disable when maintenance mode is on (or for non-owner when not in maintenance)
    document.addEventListener('contextmenu', (e) => {
        if (maintenanceMode) {
            e.preventDefault();
            return;
        }
        if (!isOwner) {
            e.preventDefault();
        }
    }, false);

    // DevTools shortcuts block when maintenance mode is on (or for non-owner when not in maintenance)
    document.addEventListener('keydown', (e) => {
        // Block when maintenance mode active
        if (maintenanceMode) {
            const forbiddenKeys = ['F12', 'I', 'J', 'U', 'S'];
            const isForbidden = (e.ctrlKey && e.shiftKey && forbiddenKeys.includes(e.key.toUpperCase())) ||
                                 (e.ctrlKey && forbiddenKeys.includes(e.key.toUpperCase())) ||
                                 (e.key === 'F12');
            if (isForbidden) {
                e.preventDefault();
                return false;
            }
            return;
        }
        // Normal operation: owner can use shortcuts, others blocked
        if (isOwner) return;
        const forbiddenKeys = ['F12', 'I', 'J', 'U', 'S'];
        const isForbidden = (e.ctrlKey && e.shiftKey && forbiddenKeys.includes(e.key.toUpperCase())) ||
                             (e.ctrlKey && forbiddenKeys.includes(e.key.toUpperCase())) ||
                             (e.key === 'F12');
        if (isForbidden) {
            e.preventDefault();
            return false;
        }
    });

    // Debugger trap (Infinite loop if devtools is open)
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

    // Console Purge
    const clearConsole = () => {
        if (isOwner) return;
        console.clear();
        console.log('%c EchoPress Security Protocol Active ', 'background: #222; color: #c5a059; font-size: 20px; font-weight: bold; padding: 10px; border-radius: 5px;');
    };

    // Clear console and start trap for non-owners
    if (!isOwner) {
        setInterval(clearConsole, 1000);
        setInterval(trap, 2000);
    }

    // Detect DevTools Opening (Menu Bypass Detection)
    let devtoolsOpen = false;
    const checkDevTools = () => {
        if (isOwner) return;
        const threshold = 160;
        const widthThreshold = window.outerWidth - window.innerWidth > threshold;
        const heightThreshold = window.outerHeight - window.innerHeight > threshold;
        const start = new Date();
        debugger;
        const end = new Date();
        const isDebugging = (end - start) > 100;
        if (widthThreshold || heightThreshold || isDebugging) {
            if (!devtoolsOpen) {
                fetch('/api/test-security-alert', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('echopress_token')}`
                    },
                    body: JSON.stringify({ reason: 'DevTools Detection (Menu or Shortcut)' })
                }).catch(() => {});
                // optional redirect for non-staff:
                // window.location.href = "/?security_alert=devtools_detected";
                devtoolsOpen = true;
            }
        } else {
            devtoolsOpen = false;
        }
    };
    setInterval(checkDevTools, 2000);
})();
