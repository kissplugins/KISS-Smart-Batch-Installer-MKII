# SBI Error Handling Strategy - Quick Wins & Long-Term Plan

## 🎯 **Overview**

This document outlines a two-phase approach to error handling improvements:
1. **Phase 1: Quick Wins** (1-2 weeks) - High-impact, low-effort improvements
2. **Phase 2: Strategic Foundation** (Long-term) - Comprehensive error recovery system

The existing error handling in `RepositoryFSM` provides a solid foundation. These enhancements focus on maximum user experience improvement with minimal development overhead.

---

## 🚀 **Phase 1: Quick Wins (1-2 weeks)**

### **Goal**: Maximum user experience improvement with minimal code changes

### 1. Enhanced Error Messages (2-3 hours)

**Impact**: Immediate user experience improvement with actionable error messages.

**Implementation**: Update existing error display logic with user-friendly messages and recovery suggestions.

```typescript
// Quick win: Add to existing RepositoryFSM.handleErrorState()
private getActionableErrorMessage(errorMessage: string, source: string): string {
  // Pattern matching for common errors (no enum needed yet)
  if (errorMessage.includes('rate limit') || errorMessage.includes('403')) {
    return `<strong>GitHub API Rate Limit</strong><br>
            <small>Please wait 5-10 minutes before trying again.
            <a href="#" onclick="setTimeout(() => location.reload(), 300000)">Auto-refresh in 5 min</a></small>`;
  }

  if (errorMessage.includes('404') || errorMessage.includes('not found')) {
    return `<strong>Repository Not Found</strong><br>
            <small>Check if the repository exists and is public.
            <a href="https://github.com/${repo}" target="_blank">View on GitHub</a></small>`;
  }

  if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
    return `<strong>Network Error</strong><br>
            <small>Check your internet connection and try again.</small>`;
  }

  if (source === 'install' && errorMessage.includes('permission')) {
    return `<strong>Permission Error</strong><br>
            <small>You may not have permission to install plugins. Contact your administrator.</small>`;
  }

  // Fallback to original message with generic help
  return `<strong>Error:</strong> ${errorMessage}<br>
          <small>Try refreshing the repository status or contact support if the issue persists.</small>`;
}
```

### 2. Smart Retry Logic (3-4 hours)

**Impact**: Reduces user frustration by automatically recovering from transient errors.

```typescript
// Add to existing ErrorContext interface
interface ErrorContext {
  timestamp: number;
  message: string;
  source: string;
  retryCount: number;
  lastRetryAt?: number;
  autoRetryEnabled?: boolean; // New field
}

// Enhanced retry logic in RepositoryFSM
async retryRepository(repo: RepoId): Promise<boolean> {
  const errorContext = this.getErrorContext(repo);
  if (!errorContext) return false;

  // Smart retry delays based on error type
  const getRetryDelay = (message: string, retryCount: number): number => {
    if (message.includes('rate limit')) return 60000; // 1 minute for rate limits
    if (message.includes('network')) return Math.min(5000 * Math.pow(2, retryCount), 30000); // Exponential backoff
    return 2000; // Default 2 seconds
  };

  const delay = getRetryDelay(errorContext.message, errorContext.retryCount);

  // Update retry context
  errorContext.retryCount++;
  errorContext.lastRetryAt = Date.now();

  // Auto-retry for certain errors (max 3 times)
  if (errorContext.retryCount <= 3 && this.shouldAutoRetry(errorContext.message)) {
    setTimeout(() => this.refreshRepository(repo), delay);
    return true;
  }

  return false;
}

private shouldAutoRetry(message: string): boolean {
  return message.includes('network') ||
         message.includes('timeout') ||
         message.includes('temporary');
}
```

### 3. Better Error Isolation (2-3 hours)

**Impact**: Prevents one repository's errors from affecting others or breaking the entire interface.

```typescript
// Add to RepositoryFSM class
private errorIsolation = new Set<RepoId>();

setError(repo: RepoId, message: string, source: string): void {
  try {
    // Isolate this repository from affecting others
    this.errorIsolation.add(repo);

    const errorContext: ErrorContext = {
      timestamp: Date.now(),
      message: this.getActionableErrorMessage(message, source),
      source,
      retryCount: 0,
      autoRetryEnabled: this.shouldAutoRetry(message)
    };

    this.errorContexts.set(repo, errorContext);
    this.set(repo, PluginState.ERROR);

    // Auto-retry if appropriate
    if (errorContext.autoRetryEnabled) {
      setTimeout(() => this.retryRepository(repo), 2000);
    }

  } catch (isolationError) {
    // Prevent error handling from breaking the entire system
    console.error('Error isolation failed:', isolationError);
    // Fallback to basic error state
    this.set(repo, PluginState.ERROR);
  }
}

// Prevent isolated repositories from affecting bulk operations
isIsolated(repo: RepoId): boolean {
  return this.errorIsolation.has(repo);
}
```

### 4. Enhanced PHP Error Responses (1-2 hours)

**Impact**: Provides frontend with better error context for improved user messaging.

```php
// Quick enhancement to existing AjaxHandler methods
class AjaxHandler {

    private function sendEnhancedError(string $message, array $context = []): void {
        // Detect error type from message for better frontend handling
        $errorType = $this->detectErrorType($message);

        wp_send_json_error([
            'message' => $message,
            'type' => $errorType,
            'context' => $context,
            'timestamp' => time(),
            'recoverable' => $this->isRecoverable($errorType),
            'retry_delay' => $this->getRetryDelay($errorType)
        ]);
    }

    private function detectErrorType(string $message): string {
        if (strpos($message, 'rate limit') !== false) return 'rate_limit';
        if (strpos($message, '404') !== false) return 'not_found';
        if (strpos($message, 'permission') !== false) return 'permission';
        if (strpos($message, 'network') !== false) return 'network';
        return 'generic';
    }

    private function isRecoverable(string $type): bool {
        return in_array($type, ['rate_limit', 'network', 'generic']);
    }

    private function getRetryDelay(string $type): int {
        switch ($type) {
            case 'rate_limit': return 60; // seconds
            case 'network': return 5;
            default: return 2;
        }
    }
}
```

### 5. Error Prevention Guards (1-2 hours)

**Impact**: Prevents common errors before they occur, reducing error frequency.

```typescript
// Add validation guards to prevent common errors
class ErrorPrevention {

  static validateBeforeInstall(repo: RepoId): string | null {
    // Check if already processing
    if (this.isProcessing(repo)) {
      return 'Operation already in progress for this repository';
    }

    // Check WordPress permissions
    if (!window.sbiAjax?.canInstallPlugins) {
      return 'You do not have permission to install plugins';
    }

    // Check if repository format is valid
    if (!repo.includes('/') || repo.split('/').length !== 2) {
      return 'Invalid repository format. Expected: owner/repository';
    }

    return null; // No errors
  }

  static validateNetworkConditions(): string | null {
    if (!navigator.onLine) {
      return 'No internet connection detected';
    }

    // Check if GitHub is reachable (simple check)
    if (this.lastGitHubError && (Date.now() - this.lastGitHubError) < 60000) {
      return 'GitHub API recently unavailable. Please wait before retrying.';
    }

    return null;
  }
}

// Use in existing button handlers
async installPlugin(repo: RepoId): Promise<void> {
  // Prevent errors before they happen
  const validationError = ErrorPrevention.validateBeforeInstall(repo) ||
                         ErrorPrevention.validateNetworkConditions();

  if (validationError) {
    this.setError(repo, validationError, 'validation');
    return;
  }

  // Proceed with existing install logic...
}
```

---

## 🏗️ **Phase 1 Implementation Checklist**

**Total Effort**: 8-12 hours over 1-2 weeks

- [ ] **Enhanced Error Messages** (2-3h) - Pattern-based user-friendly messages
- [ ] **Smart Retry Logic** (3-4h) - Auto-retry with exponential backoff
- [ ] **Error Isolation** (2-3h) - Prevent error propagation
- [ ] **PHP Error Enhancement** (1-2h) - Structured error responses
- [ ] **Error Prevention** (1-2h) - Validation guards
- [ ] **Testing** (1-2h) - Verify error scenarios work correctly

**Expected Results**:
- 70% reduction in user-reported "unclear error" issues
- 50% reduction in support tickets for transient errors
- Improved user confidence during bulk operations
- Better error recovery without page refreshes

---

## 🎯 **Phase 2: Strategic Foundation (Long-term)**

### **Goal**: Comprehensive error recovery and monitoring system

### **2.1 Comprehensive Error Classification System**

```typescript
// Complete error taxonomy for production system
export enum ErrorCode {
  // Network Errors (1000-1999)
  NETWORK_UNAVAILABLE = 1001,
  REQUEST_TIMEOUT = 1002,
  CONNECTION_REFUSED = 1003,
  DNS_RESOLUTION_FAILED = 1004,

  // GitHub API Errors (2000-2999)
  API_RATE_LIMIT = 2001,
  API_INVALID_TOKEN = 2002,
  API_REPO_NOT_FOUND = 2003,
  API_UNAUTHORIZED = 2004,
  API_FORBIDDEN = 2005,
  API_SERVER_ERROR = 2006,

  // WordPress Errors (3000-3999)
  WP_PERMISSION_DENIED = 3001,
  WP_PLUGIN_ALREADY_INSTALLED = 3002,
  WP_PLUGIN_ACTIVATION_FAILED = 3003,
  WP_FILESYSTEM_ERROR = 3004,
  WP_MEMORY_LIMIT_EXCEEDED = 3005,

  // Plugin Package Errors (4000-4999)
  INVALID_PLUGIN_PACKAGE = 4001,
  MISSING_PLUGIN_HEADER = 4002,
  CORRUPTED_DOWNLOAD = 4003,
  INCOMPATIBLE_WP_VERSION = 4004,

  // FSM/State Errors (5000-5999)
  INVALID_STATE_TRANSITION = 5001,
  STATE_CORRUPTION = 5002,
  CONCURRENT_OPERATION = 5003,

  // Cache Errors (6000-6999)
  CACHE_CORRUPTION = 6001,
  CACHE_QUOTA_EXCEEDED = 6002,
}

enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}
```

### **2.2 Advanced Recovery Strategies**

```typescript
interface RecoveryStrategy {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
  fallbackActions: Array<() => Promise<boolean>>;
  escalationPath: ErrorCode[];
  userNotificationThreshold: number;
}

class ErrorRecoveryEngine {
  private strategies = new Map<ErrorCode, RecoveryStrategy>();

  async executeRecovery(repo: RepoId, error: ErrorCode): Promise<boolean> {
    const strategy = this.strategies.get(error);
    if (!strategy) return false;

    // Execute fallback actions in sequence
    for (const fallback of strategy.fallbackActions) {
      if (await fallback()) return true;
    }

    // Escalate if all fallbacks fail
    return this.escalateError(repo, error, strategy);
  }
}
```

### **2.3 Error Monitoring & Analytics**

```typescript
interface ErrorMetrics {
  errorFrequency: Map<ErrorCode, number>;
  recoverySuccessRates: Map<ErrorCode, number>;
  userImpactScores: Map<ErrorCode, number>;
  performanceImpact: Map<ErrorCode, number>;
}

class ErrorMonitor {
  trackError(error: ErrorCode, context: ErrorContext): void {
    // Send to analytics endpoint
    // Track user impact
    // Monitor recovery success
    // Generate improvement recommendations
  }
}
```

### **2.4 Proactive Error Prevention**

```typescript
class ErrorPrediction {
  predictLikelyErrors(repo: RepoId): ErrorCode[] {
    // Analyze patterns
    // Check system health
    // Predict failure points
    // Suggest preventive actions
  }

  preemptiveHealthCheck(): SystemHealth {
    // Check GitHub API status
    // Validate WordPress environment
    // Monitor resource usage
    // Assess network conditions
  }
}
```

### **2.5 User Experience Excellence**

- **Progressive Error Disclosure**: Show simple message first, expand details on request
- **Contextual Help**: Link to relevant documentation for each error type
- **Recovery Guidance**: Step-by-step instructions for manual recovery
- **Error Reporting**: One-click error reporting to support team
- **Accessibility**: Screen reader friendly error announcements

### **2.6 Integration Points**

- **Cache System**: Error-aware caching with corruption recovery
- **TypeScript**: Full type safety for error handling
- **WordPress**: Integration with WP error logging and health checks
- **FSM**: Error states as first-class FSM states with transitions
- **Self-Tests**: Automated error scenario testing

---

## 📊 **Implementation Priority Matrix**

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Enhanced Error Messages | High | Low | **Phase 1** |
| Smart Retry Logic | High | Medium | **Phase 1** |
| Error Isolation | Medium | Low | **Phase 1** |
| PHP Error Enhancement | Medium | Low | **Phase 1** |
| Error Prevention Guards | Medium | Low | **Phase 1** |
| Comprehensive Error Codes | High | High | Phase 2 |
| Recovery Strategies | High | High | Phase 2 |
| Error Monitoring | Medium | Medium | Phase 2 |
| Predictive Prevention | Low | High | Phase 2 |

---

## 🎯 **Success Metrics**

### **Phase 1 Targets**:
- 70% reduction in "unclear error" user reports
- 50% reduction in transient error support tickets
- 90% of errors include actionable recovery suggestions
- 80% of network errors auto-recover without user intervention

### **Phase 2 Targets**:
- 95% error recovery success rate
- <1% critical errors reaching users
- Real-time error trend monitoring
- Proactive error prevention for 60% of potential issues

This approach provides immediate user experience improvements while building toward a comprehensive error management system.