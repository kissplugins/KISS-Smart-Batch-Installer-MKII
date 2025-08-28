// Module bridge to expose TS handlers on window for classic admin.js
// This script is enqueued as type="module" and dynamically imports the TS index

(async () => {
  try {
    // Prefer path relative to this bridge file to avoid global collisions
    let derivedUrl = '';
    try {
      derivedUrl = new URL('../dist/ts/index.js', import.meta.url).href;
    } catch (_) {}

    const localizedUrl = (window && window.sbiTs && window.sbiTs.indexUrl) || '';
    const indexUrl = derivedUrl || localizedUrl;

    if (!indexUrl) {
      if (window && window.sbiDebug && typeof window.sbiDebug.addEntry === 'function') {
        window.sbiDebug.addEntry('warning', 'TS Bridge Skipped', 'No indexUrl provided');
      }
      return;
    }

    // If both exist and differ, log a warning (helps detect collisions)
    if (derivedUrl && localizedUrl && derivedUrl !== localizedUrl && window && window.sbiDebug && typeof window.sbiDebug.addEntry === 'function') {
      window.sbiDebug.addEntry('warning', 'TS Bridge URL Mismatch', `derived=${derivedUrl}; localized=${localizedUrl}`);
    }

    const mod = await import(indexUrl);

    // Validate that the module exports what we expect
    if (!mod.installPlugin || !mod.activatePlugin || !mod.deactivatePlugin || !mod.refreshStatus || !mod.repositoryFSM) {
      throw new Error('Module missing required exports');
    }

    // Expose a stable global used by admin.js
    window.SBIts = {
      installPlugin: (win, owner, repository, activate = false) => {
        try {
          return mod.installPlugin(win, owner, repository, activate);
        } catch (e) {
          if (window && window.sbiDebug && typeof window.sbiDebug.addEntry === 'function') {
            window.sbiDebug.addEntry('error', 'TS installPlugin Error', e.message || String(e));
          }
          return Promise.reject(e);
        }
      },
      activatePlugin: (win, repository, plugin_file) => {
        try {
          return mod.activatePlugin(win, repository, plugin_file);
        } catch (e) {
          if (window && window.sbiDebug && typeof window.sbiDebug.addEntry === 'function') {
            window.sbiDebug.addEntry('error', 'TS activatePlugin Error', e.message || String(e));
          }
          return Promise.reject(e);
        }
      },
      deactivatePlugin: (win, repository, plugin_file) => {
        try {
          return mod.deactivatePlugin(win, repository, plugin_file);
        } catch (e) {
          if (window && window.sbiDebug && typeof window.sbiDebug.addEntry === 'function') {
            window.sbiDebug.addEntry('error', 'TS deactivatePlugin Error', e.message || String(e));
          }
          return Promise.reject(e);
        }
      },
      refreshStatus: (win, repositories) => {
        try {
          return mod.refreshStatus(win, repositories);
        } catch (e) {
          if (window && window.sbiDebug && typeof window.sbiDebug.addEntry === 'function') {
            window.sbiDebug.addEntry('error', 'TS refreshStatus Error', e.message || String(e));
          }
          return Promise.reject(e);
        }
      },
      repositoryFSM: mod.repositoryFSM,
    };
  } catch (e) {
    // Provide fallback implementations when TypeScript modules fail to load
    const msg = (e && e.message) ? e.message : String(e);
    const details = (typeof location !== 'undefined' ? (' @ ' + location.href) : '');
    const attemptedUrl = (function(){
      try { return new URL('../dist/ts/index.js', import.meta.url).href; } catch(_) { return (window && window.sbiTs && window.sbiTs.indexUrl) || ''; }
    })();

    if (window && window.sbiDebug && typeof window.sbiDebug.addEntry === 'function') {
      window.sbiDebug.addEntry('error', 'TS Bridge Load Failed', `url=${attemptedUrl}; error=${msg}${details}`);
      window.sbiDebug.addEntry('info', 'TS Bridge Fallback', 'Providing fallback implementations for TypeScript handlers');
    }

    // Provide fallback implementations that return rejected promises
    window.SBIts = {
      installPlugin: (win, owner, repository, activate = false) => {
        if (window && window.sbiDebug && typeof window.sbiDebug.addEntry === 'function') {
          window.sbiDebug.addEntry('warning', 'TS Fallback', 'Using fallback for installPlugin - TypeScript modules not available');
        }
        return Promise.reject(new Error('TypeScript modules not available - falling back to jQuery AJAX'));
      },
      activatePlugin: (win, repository, plugin_file) => {
        if (window && window.sbiDebug && typeof window.sbiDebug.addEntry === 'function') {
          window.sbiDebug.addEntry('warning', 'TS Fallback', 'Using fallback for activatePlugin - TypeScript modules not available');
        }
        return Promise.reject(new Error('TypeScript modules not available - falling back to jQuery AJAX'));
      },
      deactivatePlugin: (win, repository, plugin_file) => {
        if (window && window.sbiDebug && typeof window.sbiDebug.addEntry === 'function') {
          window.sbiDebug.addEntry('warning', 'TS Fallback', 'Using fallback for deactivatePlugin - TypeScript modules not available');
        }
        return Promise.reject(new Error('TypeScript modules not available - falling back to jQuery AJAX'));
      },
      refreshStatus: (win, repositories) => {
        if (window && window.sbiDebug && typeof window.sbiDebug.addEntry === 'function') {
          window.sbiDebug.addEntry('warning', 'TS Fallback', 'Using fallback for refreshStatus - TypeScript modules not available');
        }
        return Promise.reject(new Error('TypeScript modules not available - falling back to jQuery AJAX'));
      },
      repositoryFSM: {
        set: function(repo, state) {
          if (window && window.sbiDebug && typeof window.sbiDebug.addEntry === 'function') {
            window.sbiDebug.addEntry('info', 'FSM Fallback', `FSM set: ${repo} -> ${state} (fallback mode)`);
          }
        },
        get: function(repo) {
          return undefined;
        },
        applyToRow: function(repo, state) {
          if (window && window.sbiDebug && typeof window.sbiDebug.addEntry === 'function') {
            window.sbiDebug.addEntry('info', 'FSM Fallback', `FSM applyToRow: ${repo} -> ${state} (fallback mode)`);
          }
        }
      }
    };
  }
})();

