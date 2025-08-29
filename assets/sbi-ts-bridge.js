// Module bridge to expose TS handlers on window for classic admin.js
// This script is enqueued as type="module" and dynamically imports the TS index

(async () => {
  // Debug helper function
  function debugLog(level, title, message) {
    if (window && window.sbiDebug && typeof window.sbiDebug.addEntry === 'function') {
      window.sbiDebug.addEntry(level, title, message);
    } else {
      console.log(`[TS Bridge] ${level.toUpperCase()}: ${title} - ${message}`);
    }
  }

  debugLog('info', 'TS Bridge Starting', 'Initializing TypeScript bridge module');

  try {
    // Prefer path relative to this bridge file to avoid global collisions
    let derivedUrl = '';
    try {
      derivedUrl = new URL('../dist/ts/index.js', import.meta.url).href;
      debugLog('info', 'TS Bridge URL', `Derived URL: ${derivedUrl}`);
    } catch (_) {
      debugLog('warning', 'TS Bridge URL', 'Could not derive URL from import.meta.url');
    }

    const localizedUrl = (window && window.sbiTs && window.sbiTs.indexUrl) || '';
    if (localizedUrl) {
      debugLog('info', 'TS Bridge URL', `Localized URL: ${localizedUrl}`);
    }

    const indexUrl = derivedUrl || localizedUrl;

    if (!indexUrl) {
      debugLog('warning', 'TS Bridge Skipped', 'No indexUrl provided - TypeScript features will not be available');
      return;
    }

    // If both exist and differ, log a warning (helps detect collisions)
    if (derivedUrl && localizedUrl && derivedUrl !== localizedUrl) {
      debugLog('warning', 'TS Bridge URL Mismatch', `derived=${derivedUrl}; localized=${localizedUrl}`);
    }

    debugLog('info', 'TS Bridge Loading', `Importing TypeScript module from: ${indexUrl}`);

    const mod = await import(indexUrl);

    debugLog('success', 'TS Bridge Module Loaded', 'TypeScript module imported successfully');

    // Expose a stable global used by admin.js
    window.SBIts = {
      installPlugin: (win, owner, repository, activate = false) => mod.installPlugin(win, owner, repository, activate),
      activatePlugin: (win, repository, plugin_file) => mod.activatePlugin(win, repository, plugin_file),
      deactivatePlugin: (win, repository, plugin_file) => mod.deactivatePlugin(win, repository, plugin_file),
      refreshStatus: (win, repositories) => mod.refreshStatus(win, repositories),
      repositoryFSM: mod.repositoryFSM,
    };

    debugLog('success', 'TS Bridge Ready', 'window.SBIts exposed with all TypeScript handlers');

    // Signal that the bridge is ready
    if (typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('sbi:ts-bridge-ready', {
        detail: {
          timestamp: Date.now(),
          hasRepositoryFSM: !!mod.repositoryFSM,
          availableMethods: Object.keys(window.SBIts)
        }
      }));
      debugLog('info', 'TS Bridge Event', 'Dispatched sbi:ts-bridge-ready event');
    }

  } catch (e) {
    // Enhanced error reporting
    const msg = (e && e.message) ? e.message : String(e);
    const stack = (e && e.stack) ? e.stack : '';
    const details = (typeof location !== 'undefined' ? (' @ ' + location.href) : '');
    const attemptedUrl = (function(){
      try { return new URL('../dist/ts/index.js', import.meta.url).href; } catch(_) { return (window && window.sbiTs && window.sbiTs.indexUrl) || ''; }
    })();

    debugLog('error', 'TS Bridge Load Failed', `url=${attemptedUrl}; error=${msg}${details}`);

    if (stack) {
      debugLog('error', 'TS Bridge Stack Trace', stack);
    }

    // Signal that the bridge failed to load
    if (typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('sbi:ts-bridge-error', {
        detail: {
          timestamp: Date.now(),
          error: msg,
          url: attemptedUrl
        }
      }));
    }
  }
})();

