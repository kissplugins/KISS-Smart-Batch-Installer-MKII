import { PluginState } from '../types/fsm';

export type RepoId = string; // owner/repo

type Listener = (repo: RepoId, state: PluginState) => void;

type StateMap = Map<RepoId, PluginState>;

// Error context for enhanced error handling
interface ErrorContext {
  timestamp: number;
  message: string;
  source: string;
  retryCount: number;
  lastRetryAt?: number;
  recoverable: boolean;
  // Enhanced fields from PHP backend
  type?: string;
  severity?: string;
  retry_delay?: number;
  guidance?: {
    title?: string;
    description?: string;
    actions?: string[];
    auto_retry?: boolean;
    retry_in?: number;
    links?: Record<string, string>;
    required_capability?: string;
  };
}

export class RepositoryFSM {
  private states: StateMap = new Map();
  private listeners: Set<Listener> = new Set();
  private eventSource: EventSource | null = null;
  private sseEnabled = false;
  private errorContexts: Map<RepoId, ErrorContext> = new Map();
  private maxRetries = 3;
  private retryDelayMs = 5000;

  onChange(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  get(repo: RepoId): PluginState | undefined {
    return this.states.get(repo);
  }

  set(repo: RepoId, state: PluginState): void {
    const prev = this.states.get(repo);
    this.states.set(repo, state);
    // Always enable debug logging in development (browser environment)
    if (true) {
      try {
        // Preserve/improve debug output
        const msg = `[RepositoryFSM] ${repo}: ${prev ?? '∅'} -> ${state}`;
        if (typeof window !== 'undefined' && (window as any).sbiDebug) {
          (window as any).sbiDebug.addEntry('info', 'FSM Transition', msg);
        } else {
          // eslint-disable-next-line no-console
          console.log(msg);
        }
      } catch {}
    }
    this.listeners.forEach((fn) => fn(repo, state));
  }

  // Apply state to DOM row: minimal façade that can evolve later
  applyToRow(repo: RepoId, state: PluginState): void {
    // Use data-repository attribute for more resilient DOM targeting
    const row = document.querySelector(`[data-repository="${repo}"]`) as HTMLTableRowElement | null;
    if (!row) {
      this.debugLog(`Row not found for repository: ${repo}`, 'error');
      return;
    }

    // Enhanced UX with error handling and recovery options
    const isInstalled = state === PluginState.INSTALLED_ACTIVE || state === PluginState.INSTALLED_INACTIVE;
    const isError = state === PluginState.ERROR;

    const installBtn = row.querySelector('.sbi-install-plugin') as HTMLButtonElement | null;
    const activateBtn = row.querySelector('.sbi-activate-plugin') as HTMLButtonElement | null;
    const deactivateBtn = row.querySelector('.sbi-deactivate-plugin') as HTMLButtonElement | null;

    // Standard button state management
    if (installBtn) installBtn.disabled = isInstalled || isError;
    if (activateBtn) activateBtn.disabled = state !== PluginState.INSTALLED_INACTIVE;
    if (deactivateBtn) deactivateBtn.disabled = state !== PluginState.INSTALLED_ACTIVE;

    // Enhanced error state handling
    if (isError) {
      this.handleErrorState(row, repo);
    } else {
      this.clearErrorDisplay(row);
    }
  }

  // SSE Integration Methods
  initSSE(windowObj: Window): void {
    const w = windowObj as any;
    if (!w.sbiAjax || this.eventSource) return;

    // Check if SSE is enabled
    this.sseEnabled = !!w.sbiAjax.sseEnabled;
    if (!this.sseEnabled) {
      this.debugLog('SSE disabled in configuration');
      return;
    }

    try {
      const sseUrl = w.sbiAjax.ajaxurl + '?action=sbi_state_stream';
      this.eventSource = new EventSource(sseUrl);

      this.eventSource.addEventListener('open', () => {
        this.debugLog('SSE connection opened');
      });

      this.eventSource.addEventListener('error', (e) => {
        this.debugLog('SSE connection error', 'error');
        // Auto-reconnect is handled by EventSource
      });

      this.eventSource.addEventListener('state_changed', (e) => {
        try {
          const payload = JSON.parse(e.data || '{}');
          const repo = payload.repository;
          const toState = payload.to;

          if (repo && toState) {
            this.debugLog(`SSE state update: ${repo} -> ${toState}`);
            // Convert string state to PluginState enum
            const state = this.stringToPluginState(toState);
            if (state) {
              this.set(repo, state);
              this.applyToRow(repo, state);
            }
          }
        } catch (err) {
          this.debugLog(`SSE event parsing error: ${err}`, 'error');
        }
      });

    } catch (err) {
      this.debugLog(`SSE initialization error: ${err}`, 'error');
    }
  }

  closeSSE(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      this.debugLog('SSE connection closed');
    }
  }

  private stringToPluginState(stateStr: string): PluginState | null {
    const stateMap: Record<string, PluginState> = {
      'unknown': PluginState.UNKNOWN,
      'checking': PluginState.CHECKING,
      'available': PluginState.AVAILABLE,
      'not_plugin': PluginState.NOT_PLUGIN,
      'installed_inactive': PluginState.INSTALLED_INACTIVE,
      'installed_active': PluginState.INSTALLED_ACTIVE,
      'installing': PluginState.INSTALLING,
      'error': PluginState.ERROR,
    };
    return stateMap[stateStr] || null;
  }

  private debugLog(message: string, level: 'info' | 'error' = 'info'): void {
    try {
      const fullMessage = `[RepositoryFSM] ${message}`;
      if (typeof window !== 'undefined' && (window as any).sbiDebug) {
        (window as any).sbiDebug.addEntry(level, 'FSM SSE', fullMessage);
      } else {
        // eslint-disable-next-line no-console
        console.log(fullMessage);
      }
    } catch {}
  }

  // Helper method to check if a repository is in a specific state
  isInState(repo: RepoId, state: PluginState): boolean {
    return this.get(repo) === state;
  }

  // Enhanced Error Handling Methods

  /**
   * Convert raw error messages to user-friendly, actionable messages with recovery suggestions
   */
  private getActionableErrorMessage(errorMessage: string, source: string, repo: RepoId): string {
    const lowerMessage = errorMessage.toLowerCase();

    // GitHub API Rate Limit
    if (lowerMessage.includes('rate limit') || lowerMessage.includes('403')) {
      return `<strong>GitHub API Rate Limit</strong><br>
              <small>Please wait 5-10 minutes before trying again. GitHub limits API requests to prevent abuse.<br>
              <a href="#" onclick="setTimeout(() => location.reload(), 300000); return false;" style="color: #0073aa;">Auto-refresh in 5 minutes</a></small>`;
    }

    // Repository Not Found
    if (lowerMessage.includes('404') || lowerMessage.includes('not found')) {
      return `<strong>Repository Not Found</strong><br>
              <small>The repository may be private, renamed, or deleted.<br>
              <a href="https://github.com/${repo}" target="_blank" style="color: #0073aa;">View on GitHub</a> to verify it exists.</small>`;
    }

    // Network/Connection Errors
    if (lowerMessage.includes('network') || lowerMessage.includes('timeout') || lowerMessage.includes('connection')) {
      return `<strong>Network Error</strong><br>
              <small>Check your internet connection and try again. This is usually temporary.<br>
              <em>Auto-retry will attempt in a few seconds...</em></small>`;
    }

    // Permission Errors
    if (source === 'install' && (lowerMessage.includes('permission') || lowerMessage.includes('unauthorized'))) {
      return `<strong>Permission Error</strong><br>
              <small>You may not have permission to install plugins. Contact your WordPress administrator.<br>
              Required capability: <code>install_plugins</code></small>`;
    }

    // Activation/Deactivation Errors
    if (source === 'activate' && lowerMessage.includes('activation')) {
      return `<strong>Plugin Activation Failed</strong><br>
              <small>The plugin may have compatibility issues or missing dependencies.<br>
              Check the WordPress error log for more details.</small>`;
    }

    if (source === 'deactivate' && lowerMessage.includes('deactivation')) {
      return `<strong>Plugin Deactivation Failed</strong><br>
              <small>The plugin may be required by other plugins or themes.<br>
              Try deactivating dependent plugins first.</small>`;
    }

    // Download/Package Errors
    if (lowerMessage.includes('download') || lowerMessage.includes('package') || lowerMessage.includes('zip')) {
      return `<strong>Download Error</strong><br>
              <small>Failed to download or extract the plugin package.<br>
              The repository may not contain a valid WordPress plugin.</small>`;
    }

    // GitHub API Errors (general)
    if (source === 'github_api' || lowerMessage.includes('github')) {
      return `<strong>GitHub API Error</strong><br>
              <small>Unable to communicate with GitHub. This may be temporary.<br>
              <a href="https://www.githubstatus.com/" target="_blank" style="color: #0073aa;">Check GitHub Status</a></small>`;
    }

    // WordPress Core Errors
    if (lowerMessage.includes('wordpress') || lowerMessage.includes('wp-admin')) {
      return `<strong>WordPress Error</strong><br>
              <small>A WordPress core error occurred. Check your site's error logs.<br>
              Ensure WordPress is up to date and functioning properly.</small>`;
    }

    // Memory/Resource Errors
    if (lowerMessage.includes('memory') || lowerMessage.includes('fatal error')) {
      return `<strong>Server Resource Error</strong><br>
              <small>Insufficient server memory or resources.<br>
              Contact your hosting provider to increase PHP memory limit.</small>`;
    }

    // Fallback: Generic error with helpful context
    return `<strong>Error:</strong> ${errorMessage}<br>
            <small>Source: ${source} • Try refreshing the repository status or contact support if the issue persists.<br>
            <em>Use the Retry button below if available.</em></small>`;
  }

  setError(repo: RepoId, message: string, source: string, recoverable: boolean = true): void {
    // Enhanced: Convert raw error message to actionable user-friendly message
    const actionableMessage = this.getActionableErrorMessage(message, source, repo);

    const errorContext: ErrorContext = {
      timestamp: Date.now(),
      message: actionableMessage,
      source,
      retryCount: 0,
      recoverable,
    };

    this.errorContexts.set(repo, errorContext);
    this.set(repo, PluginState.ERROR);
    this.debugLog(`Error set for ${repo}: ${message} (source: ${source}, recoverable: ${recoverable})`, 'error');

    // Enhanced: Auto-retry for certain types of errors
    if (this.shouldAutoRetry(message) && recoverable) {
      const retryDelay = this.getRetryDelay(message, 0);
      this.debugLog(`Auto-retry scheduled for ${repo} in ${retryDelay}ms`);
      setTimeout(() => this.retryRepository(repo), retryDelay);
    }
  }

  /**
   * Set error from enhanced backend response with structured data
   */
  setErrorFromResponse(repo: RepoId, errorResponse: any, source: string): void {
    // Use backend-provided message or fall back to generic
    const message = errorResponse.message || 'An error occurred';

    // Create enhanced error context with backend data
    const errorContext: ErrorContext = {
      timestamp: Date.now(),
      message: this.getActionableErrorMessage(message, source, repo),
      source,
      retryCount: 0,
      recoverable: errorResponse.recoverable !== false, // Default to true unless explicitly false
      type: errorResponse.type,
      severity: errorResponse.severity,
      retry_delay: errorResponse.retry_delay,
      guidance: errorResponse.guidance
    };

    this.errorContexts.set(repo, errorContext);
    this.set(repo, PluginState.ERROR);
    this.debugLog(`Enhanced error set for ${repo}: ${message} (type: ${errorResponse.type}, severity: ${errorResponse.severity})`, 'error');

    // Use backend-suggested retry delay or auto-retry logic
    if (errorContext.recoverable && (errorResponse.guidance?.auto_retry || this.shouldAutoRetry(message))) {
      const retryDelay = (errorResponse.retry_delay || this.getRetryDelay(message, 0)) * 1000; // Convert to milliseconds
      this.debugLog(`Auto-retry scheduled for ${repo} in ${retryDelay}ms (backend suggested: ${errorResponse.retry_delay}s)`);
      setTimeout(() => this.retryRepository(repo), retryDelay);
    }
  }

  getErrorContext(repo: RepoId): ErrorContext | null {
    return this.errorContexts.get(repo) || null;
  }

  /**
   * Determine if an error should trigger automatic retry
   */
  private shouldAutoRetry(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    return lowerMessage.includes('network') ||
           lowerMessage.includes('timeout') ||
           lowerMessage.includes('connection') ||
           lowerMessage.includes('temporary') ||
           lowerMessage.includes('503') || // Service unavailable
           lowerMessage.includes('502'); // Bad gateway
  }

  /**
   * Get appropriate retry delay based on error type and retry count
   */
  private getRetryDelay(message: string, retryCount: number): number {
    const lowerMessage = message.toLowerCase();

    // Rate limit errors need longer delays
    if (lowerMessage.includes('rate limit') || lowerMessage.includes('403')) {
      return 60000; // 1 minute for rate limits
    }

    // Network errors use exponential backoff
    if (lowerMessage.includes('network') || lowerMessage.includes('timeout')) {
      return Math.min(5000 * Math.pow(2, retryCount), 30000); // Max 30 seconds
    }

    // Default retry delay
    return 2000; // 2 seconds
  }

  canRetry(repo: RepoId): boolean {
    const errorContext = this.errorContexts.get(repo);
    if (!errorContext || !errorContext.recoverable) return false;

    return errorContext.retryCount < this.maxRetries;
  }

  async retryRepository(repo: RepoId): Promise<boolean> {
    const errorContext = this.errorContexts.get(repo);
    if (!errorContext || !this.canRetry(repo)) {
      this.debugLog(`Cannot retry ${repo}: ${!errorContext ? 'no error context' : 'max retries exceeded'}`, 'error');
      return false;
    }

    // Update retry context with enhanced delay calculation
    errorContext.retryCount++;
    errorContext.lastRetryAt = Date.now();
    this.errorContexts.set(repo, errorContext);

    this.debugLog(`Retrying ${repo} (attempt ${errorContext.retryCount}/${this.maxRetries})`);

    try {
      // Transition back to CHECKING state to restart the process
      this.set(repo, PluginState.CHECKING);

      // Trigger a refresh via the backend
      if (typeof window !== 'undefined' && (window as any).sbiAjax) {
        const response = await fetch((window as any).sbiAjax.ajaxurl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            action: 'sbi_refresh_repository',
            repository: repo,
            nonce: (window as any).sbiAjax.nonce,
          }),
        });

        if (response.ok) {
          this.debugLog(`Retry initiated for ${repo}`);
          return true;
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }
    } catch (error) {
      this.debugLog(`Retry failed for ${repo}: ${error}`, 'error');
      this.setError(repo, `Retry failed: ${error}`, 'retry_mechanism', errorContext.recoverable);
    }

    return false;
  }

  clearError(repo: RepoId): void {
    this.errorContexts.delete(repo);
    this.debugLog(`Error context cleared for ${repo}`);
  }

  getErrorStatistics(): { total: number; recoverable: number; maxRetriesReached: number } {
    let total = 0;
    let recoverable = 0;
    let maxRetriesReached = 0;

    for (const [repo, context] of this.errorContexts) {
      total++;
      if (context.recoverable) recoverable++;
      if (context.retryCount >= this.maxRetries) maxRetriesReached++;
    }

    return { total, recoverable, maxRetriesReached };
  }

  // Helper method to check if a repository is in any of the given states
  isInAnyState(repo: RepoId, states: PluginState[]): boolean {
    const currentState = this.get(repo);
    return currentState ? states.includes(currentState) : false;
  }

  // Error Display Management
  private handleErrorState(row: HTMLTableRowElement, repo: RepoId): void {
    const errorContext = this.getErrorContext(repo);
    if (!errorContext) return;

    // Find or create error display container
    let errorContainer = row.querySelector('.sbi-error-display') as HTMLElement;
    if (!errorContainer) {
      errorContainer = document.createElement('div');
      errorContainer.className = 'sbi-error-display';
      errorContainer.style.cssText = 'background: #ffeaea; border: 1px solid #d63638; padding: 8px; margin: 4px 0; border-radius: 3px; font-size: 12px;';

      // Insert after the first cell
      const firstCell = row.querySelector('td');
      if (firstCell) {
        firstCell.appendChild(errorContainer);
      }
    }

    // Enhanced error display with actionable messages
    const timeAgo = this.formatTimeAgo(errorContext.timestamp);

    // Use backend guidance if available, otherwise use enhanced message
    let errorHtml = '';

    if (errorContext.guidance) {
      // Display backend-provided guidance
      errorHtml = `<strong>${errorContext.guidance.title || 'Error'}</strong><br>`;
      if (errorContext.guidance.description) {
        errorHtml += `<small>${errorContext.guidance.description}</small><br>`;
      }

      // Add action items
      if (errorContext.guidance.actions && errorContext.guidance.actions.length > 0) {
        errorHtml += `<small><strong>What you can do:</strong><br>`;
        errorContext.guidance.actions.forEach(action => {
          errorHtml += `• ${action}<br>`;
        });
        errorHtml += `</small>`;
      }

      // Add helpful links
      if (errorContext.guidance.links) {
        Object.entries(errorContext.guidance.links).forEach(([key, url]) => {
          if (key === 'github_url') {
            errorHtml += `<br><small><a href="${url}" target="_blank" style="color: #0073aa;">View on GitHub</a></small>`;
          }
        });
      }

      // Show auto-retry information
      if (errorContext.guidance.auto_retry && errorContext.guidance.retry_in) {
        const retryMinutes = Math.ceil(errorContext.guidance.retry_in / 60);
        errorHtml += `<br><small><em>Auto-retry in ${retryMinutes} minute${retryMinutes > 1 ? 's' : ''}</em></small>`;
      }
    } else {
      // Fall back to enhanced message from getActionableErrorMessage
      errorHtml = errorContext.message;
    }

    // Add technical details in a collapsible section for debugging
    errorHtml += `<br><details style="margin-top: 8px;">
                    <summary style="cursor: pointer; font-size: 11px; color: #666;">Technical Details</summary>
                    <div style="margin-top: 4px; font-size: 11px; color: #666;">
                      <strong>Source:</strong> ${errorContext.source}<br>
                      <strong>Time:</strong> ${timeAgo}`;

    if (errorContext.type) {
      errorHtml += `<br><strong>Type:</strong> ${errorContext.type}`;
    }

    if (errorContext.severity) {
      errorHtml += `<br><strong>Severity:</strong> ${errorContext.severity}`;
    }

    if (errorContext.retryCount > 0) {
      errorHtml += `<br><strong>Retries:</strong> ${errorContext.retryCount}/${this.maxRetries}`;
    }

    errorHtml += `</div></details>`;

    // Enhanced retry button with better styling and context
    if (errorContext.recoverable && this.canRetry(repo)) {
      const retryText = errorContext.retryCount > 0 ? `Retry (${this.maxRetries - errorContext.retryCount} left)` : 'Retry';
      errorHtml += `<br><button class="button button-small sbi-retry-btn" data-repo="${repo}"
                      style="margin-top: 8px; background: #0073aa; color: white; border-color: #0073aa;">
                      <span class="dashicons dashicons-update" style="font-size: 12px; margin-right: 4px;"></span>${retryText}
                    </button>`;
    } else if (!errorContext.recoverable) {
      errorHtml += `<br><div style="margin-top: 8px; padding: 4px 8px; background: #fcf2f2; border-left: 3px solid #d63638; font-size: 12px;">
                      <strong>Non-recoverable error</strong> - Manual intervention required
                    </div>`;
    } else {
      errorHtml += `<br><div style="margin-top: 8px; padding: 4px 8px; background: #fcf8e3; border-left: 3px solid #dba617; font-size: 12px;">
                      <strong>Max retries reached</strong> - Try refreshing the page or contact support
                    </div>`;
    }

    errorContainer.innerHTML = errorHtml;

    // Attach retry handler
    const retryBtn = errorContainer.querySelector('.sbi-retry-btn') as HTMLButtonElement;
    if (retryBtn) {
      retryBtn.onclick = () => this.handleRetryClick(repo, retryBtn);
    }
  }

  private clearErrorDisplay(row: HTMLTableRowElement): void {
    const errorContainer = row.querySelector('.sbi-error-display');
    if (errorContainer) {
      errorContainer.remove();
    }
  }

  private async handleRetryClick(repo: RepoId, button: HTMLButtonElement): Promise<void> {
    button.disabled = true;
    button.textContent = 'Retrying...';

    const success = await this.retryRepository(repo);

    if (!success) {
      button.disabled = false;
      button.textContent = 'Retry Failed';
      setTimeout(() => {
        if (this.canRetry(repo)) {
          button.textContent = 'Retry';
          button.disabled = false;
        }
      }, 3000);
    }
    // If successful, the error display will be cleared by state change
  }

  private formatTimeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  }
}

export const repositoryFSM = new RepositoryFSM();

