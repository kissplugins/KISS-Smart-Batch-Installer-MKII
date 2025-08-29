An architecture document for the proposed caching system is below.

### **Project: SBI Repository State Caching**

**1. Overview**

This document outlines the architecture for a client-side caching mechanism for the Smart Batch Installer (SBI). The primary goal is to reduce network traffic and improve the user experience by caching the state of repositories for up to 30 minutes. This will prevent the need for active network scanning every time the main SBI page is loaded within a session.

**2. Goals**

  * **Reduce Network Scanning:** Avoid unnecessary network requests to check the status of repositories on every page load.
  * **Improve Performance:** Speed up the rendering of the repository list by loading states from a local cache.
  * **Seamless FSM Integration:** The cache should work flawlessly with the existing `RepositoryFSM` without requiring a major rewrite of the state management logic.

**3. Non-Goals**

  * **Offline Functionality:** This cache is not intended to provide full offline functionality for the SBI.
  * **Cross-Browser Session Persistence:** The cache will be cleared when the user closes their browser tab/window.

**4. Proposed Architecture**

The caching mechanism will be implemented within the existing `repositoryFSM.ts` file, augmenting the `RepositoryFSM` class with caching logic.

**4.1. Cache Storage**

We will use the browser's **`sessionStorage`** to store the cache. This provides a good balance between persistence and data freshness. The cache will persist for the duration of the page session (i.e., as long as the browser tab is open), but will be cleared when the tab is closed. This ensures that a new browser session will always start with a fresh scan.

**4.2. Cache Data Structure**

The cache will be stored in `sessionStorage` under a single key, `sbi_repository_cache`. The value will be a JSON string representing a versioned container with cache metadata and repository states:

```typescript
interface CachedRepoState {
  state: PluginState;
  timestamp: number; // UTC timestamp in milliseconds
}

interface CacheContainer {
  version: string; // Cache schema version for future compatibility
  lastCleanup: number; // Last cleanup timestamp
  metrics: CacheMetrics;
  data: Record<RepoId, CachedRepoState>;
}

interface CacheMetrics {
  hits: number;
  misses: number;
  invalidations: number;
  totalEntries: number;
}
```

**4.3. FSM Integration**

The `RepositoryFSM` class will be modified to manage the cache. Here's how the integration will work:

  * **Initialization:** A new private method, `_loadFromCache`, will be added to the `RepositoryFSM` class. This method will be called in the constructor to populate the initial states from `sessionStorage`. It will iterate through the cached items and, for each one, check if the timestamp is within the 30-minute validity period. If it is, the state will be loaded into the `states` map.

  * **State Retrieval:** The `get` method will be modified to first check the in-memory `states` map. If a state is not found there, it will not trigger a network request directly but will instead rely on the initial scan process to populate the state.

  * **State Updates:** The `set` method will be updated to write the new state and the current timestamp to both the in-memory `states` map and `sessionStorage`.

  * **Cache Invalidation:**

      * The 30-minute expiration will be handled during the `_loadFromCache` initialization. Stale entries will be ignored.
      * A new public method, `invalidateCache(repo: RepoId)`, will be added to allow for manual cache invalidation. This will be used by functions like `retryRepository` to ensure a fresh scan is performed when requested.

**5. Implementation Details**

Here is a summary of the proposed changes to `repositoryFSM.ts`:

1.  **Add cache configuration properties:**

    ```typescript
    private cacheTTL = 30 * 60 * 1000; // 30 minutes in milliseconds
    private readonly MAX_CACHE_ENTRIES = 1000; // Prevent unlimited growth
    private readonly CACHE_VERSION = '1.0.0'; // Schema version
    private readonly CACHE_KEY = 'sbi_repository_cache';
    private pendingCacheUpdates = new Map<RepoId, CachedRepoState>();
    private cacheUpdateTimer: number | null = null;
    ```

2.  **Update the `constructor`:**

    ```typescript
    constructor() {
      this._loadFromCache();
    }
    ```

3.  **Implement `_loadFromCache` with error handling:**

    ```typescript
    private _loadFromCache(): void {
      try {
        const cachedData = sessionStorage.getItem(this.CACHE_KEY);
        if (!cachedData) return;

        const container: CacheContainer = JSON.parse(cachedData);

        // Version compatibility check
        if (container.version !== this.CACHE_VERSION) {
          console.warn('Cache version mismatch, clearing cache');
          sessionStorage.removeItem(this.CACHE_KEY);
          return;
        }

        const now = Date.now();
        let loadedCount = 0;

        for (const [repo, cachedState] of Object.entries(container.data)) {
          if (now - cachedState.timestamp < this.cacheTTL) {
            this.states.set(repo, cachedState.state);
            loadedCount++;
          }
        }

        // Update metrics
        container.metrics.hits += loadedCount;
        this._updateCacheContainer(container);

        console.debug(`Loaded ${loadedCount} repositories from cache`);
      } catch (error) {
        console.warn('Failed to load cache, starting fresh:', error);
        sessionStorage.removeItem(this.CACHE_KEY);
      }
    }
    ```

4.  **Implement batched cache updates for performance:**

    ```typescript
    private _scheduleCacheUpdate(repo: RepoId, state: PluginState): void {
      this.pendingCacheUpdates.set(repo, {
        state,
        timestamp: Date.now()
      });

      if (this.cacheUpdateTimer) clearTimeout(this.cacheUpdateTimer);
      this.cacheUpdateTimer = setTimeout(() => this._flushCacheUpdates(), 100);
    }

    private _flushCacheUpdates(): void {
      try {
        const container = this._getCacheContainer();

        // Apply pending updates
        for (const [repo, cachedState] of this.pendingCacheUpdates.entries()) {
          container.data[repo] = cachedState;
          container.metrics.totalEntries = Object.keys(container.data).length;
        }

        // Cleanup if cache is too large
        if (container.metrics.totalEntries > this.MAX_CACHE_ENTRIES) {
          this._cleanupExpiredEntries(container);
        }

        this._updateCacheContainer(container);
        this.pendingCacheUpdates.clear();
        this.cacheUpdateTimer = null;
      } catch (error) {
        console.warn('Failed to update cache:', error);
      }
    }

    private _getCacheContainer(): CacheContainer {
      try {
        const cachedData = sessionStorage.getItem(this.CACHE_KEY);
        if (cachedData) {
          return JSON.parse(cachedData);
        }
      } catch (error) {
        console.warn('Failed to parse cache, creating new container');
      }

      return {
        version: this.CACHE_VERSION,
        lastCleanup: Date.now(),
        metrics: { hits: 0, misses: 0, invalidations: 0, totalEntries: 0 },
        data: {}
      };
    }

    private _updateCacheContainer(container: CacheContainer): void {
      sessionStorage.setItem(this.CACHE_KEY, JSON.stringify(container));
    }
    ```

5.  **Modify the `set` method:**

    ```typescript
    set(repo: RepoId, state: PluginState): void {
      // ... existing logic ...
      this._scheduleCacheUpdate(repo, state);
      this.listeners.forEach((fn) => fn(repo, state));
    }
    ```

6.  **Add enhanced cache management methods:**

    ```typescript
    invalidateCache(repo: RepoId): void {
      try {
        const container = this._getCacheContainer();
        if (container.data[repo]) {
          delete container.data[repo];
          container.metrics.invalidations++;
          container.metrics.totalEntries = Object.keys(container.data).length;
          this._updateCacheContainer(container);
        }

        // Also remove from pending updates
        this.pendingCacheUpdates.delete(repo);
      } catch (error) {
        console.warn('Failed to invalidate cache for repo:', repo, error);
      }
    }

    invalidateOrganizationCache(organization: string): void {
      try {
        const container = this._getCacheContainer();
        let invalidatedCount = 0;

        for (const repo of Object.keys(container.data)) {
          if (repo.startsWith(`${organization}/`)) {
            delete container.data[repo];
            invalidatedCount++;
          }
        }

        if (invalidatedCount > 0) {
          container.metrics.invalidations += invalidatedCount;
          container.metrics.totalEntries = Object.keys(container.data).length;
          this._updateCacheContainer(container);
          console.debug(`Invalidated ${invalidatedCount} repositories for organization: ${organization}`);
        }
      } catch (error) {
        console.warn('Failed to invalidate organization cache:', organization, error);
      }
    }

    private _cleanupExpiredEntries(container: CacheContainer): void {
      const now = Date.now();
      let cleanedCount = 0;

      for (const [repo, cachedState] of Object.entries(container.data)) {
        if (now - cachedState.timestamp >= this.cacheTTL) {
          delete container.data[repo];
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        container.lastCleanup = now;
        container.metrics.totalEntries = Object.keys(container.data).length;
        console.debug(`Cleaned up ${cleanedCount} expired cache entries`);
      }
    }

    async retryRepository(repo: RepoId): Promise<boolean> {
      this.invalidateCache(repo);
      // ... existing logic ...
    }

    // Cache analytics and debugging
    getCacheMetrics(): CacheMetrics {
      try {
        const container = this._getCacheContainer();
        return { ...container.metrics };
      } catch (error) {
        return { hits: 0, misses: 0, invalidations: 0, totalEntries: 0 };
      }
    }

    clearAllCache(): void {
      sessionStorage.removeItem(this.CACHE_KEY);
      this.pendingCacheUpdates.clear();
      if (this.cacheUpdateTimer) {
        clearTimeout(this.cacheUpdateTimer);
        this.cacheUpdateTimer = null;
      }
    }
    ```

**6. Testing Plan**

  * **Unit Tests:** Add comprehensive unit tests for the caching logic, including:
      * Verifying that the FSM loads valid states from the cache on initialization
      * Ensuring that expired states are not loaded
      * Confirming that the `set` method correctly schedules cache updates
      * Testing the `invalidateCache` and `invalidateOrganizationCache` methods
      * Verifying cache version compatibility and migration
      * Testing error handling for corrupted cache data
      * Validating cache size limits and cleanup mechanisms
      * Testing batched cache updates and performance optimizations

  * **Integration Tests:**
      * Test cache behavior across page refreshes
      * Verify cache interaction with SSE updates
      * Test cache behavior during network failures
      * Validate cache persistence during browser session
      * Test multiple tabs with same organization

  * **Performance Tests:**
      * Measure cache load/save performance with large datasets
      * Test cache cleanup efficiency with expired entries
      * Validate memory usage with maximum cache entries
      * Benchmark cache hit/miss ratios

  * **Edge Case Testing:**
      * `sessionStorage` quota exceeded scenarios
      * Corrupted cache data recovery
      * Clock changes (system time adjustments)
      * Cache version migration scenarios
      * Concurrent cache updates from multiple operations

  * **Manual Testing:**
      * Load the SBI page and verify that a network scan occurs
      * Reload the page within 30 minutes and confirm that states are loaded from cache
      * Wait for more than 30 minutes, reload the page, and verify that a new scan is performed
      * Use the "Retry" button on a repository and confirm that a fresh scan is triggered
      * Test organization-level cache invalidation
      * Verify cache metrics accuracy in browser dev tools

**7. Performance Considerations**

  * **Batch Operations:** Cache updates are batched and debounced to prevent excessive `sessionStorage` writes
  * **Memory Management:** Cache size is limited to prevent unlimited growth and browser performance issues
  * **Cleanup Strategy:** Automatic cleanup of expired entries when cache size exceeds limits
  * **Error Recovery:** Graceful handling of cache corruption with automatic fallback to fresh scans

**8. Debugging and Monitoring**

  * **Cache Metrics:** Built-in analytics for cache hits, misses, and invalidations
  * **Debug Logging:** Comprehensive console logging for cache operations (debug level)
  * **Dev Tools Integration:** Cache data is accessible via browser dev tools for inspection
  * **Performance Monitoring:** Track cache effectiveness and identify optimization opportunities

**9. Future Enhancements**

  * **Cache Warming:** Pre-populate cache for known repositories during idle time
  * **Intelligent Prefetching:** Predict and cache likely-to-be-accessed repositories
  * **Cross-Tab Synchronization:** Sync cache updates across multiple browser tabs
  * **Compression:** Implement cache data compression for larger datasets
  * **Selective Caching:** Cache only frequently accessed repositories based on usage patterns