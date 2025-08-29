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

The cache will be stored in `sessionStorage` under a single key, `sbi_repository_cache`. The value will be a JSON string representing an object where keys are repository IDs (`owner/repo`) and values are objects with the following structure:

```typescript
interface CachedRepoState {
  state: PluginState;
  timestamp: number; // UTC timestamp in milliseconds
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

1.  **Add a `cacheTTL` property:**

    ```typescript
    private cacheTTL = 30 * 60 * 1000; // 30 minutes in milliseconds
    ```

2.  **Update the `constructor`:**

    ```typescript
    constructor() {
      this._loadFromCache();
    }
    ```

3.  **Implement `_loadFromCache`:**

    ```typescript
    private _loadFromCache(): void {
      const cachedData = sessionStorage.getItem('sbi_repository_cache');
      if (cachedData) {
        const cache: Map<RepoId, CachedRepoState> = new Map(Object.entries(JSON.parse(cachedData)));
        const now = Date.now();
        for (const [repo, cachedState] of cache.entries()) {
          if (now - cachedState.timestamp < this.cacheTTL) {
            this.states.set(repo, cachedState.state);
          }
        }
      }
    }
    ```

4.  **Implement `_updateCache`:**

    ```typescript
        private _updateCache(repo: RepoId, state: PluginState): void {
            const cachedData = sessionStorage.getItem('sbi_repository_cache');
            const cache: Map<RepoId, CachedRepoState> = cachedData ? new Map(Object.entries(JSON.parse(cachedData))) : new Map();
            const cachedState: CachedRepoState = {
                state,
                timestamp: Date.now(),
            };
            cache.set(repo, cachedState);
            sessionStorage.setItem('sbi_repository_cache', JSON.stringify(Array.from(cache.entries())));
        }
    ```

5.  **Modify the `set` method:**

    ```typescript
    set(repo: RepoId, state: PluginState): void {
      // ... existing logic ...
      this._updateCache(repo, state);
      this.listeners.forEach((fn) => fn(repo, state));
    }
    ```

6.  **Add `invalidateCache` and update `retryRepository`:**

    ```typescript
    invalidateCache(repo: RepoId): void {
        const cachedData = sessionStorage.getItem('sbi_repository_cache');
        if (cachedData) {
            const cache: Map<RepoId, CachedRepoState> = new Map(Object.entries(JSON.parse(cachedData)));
            cache.delete(repo);
            sessionStorage.setItem('sbi_repository_cache', JSON.stringify(Array.from(cache.entries())));
        }
    }

    async retryRepository(repo: RepoId): Promise<boolean> {
        this.invalidateCache(repo);
        // ... existing logic ...
    }
    ```

**6. Testing Plan**

  * **Unit Tests:** Add unit tests for the caching logic, including:
      * Verifying that the FSM loads valid states from the cache on initialization.
      * Ensuring that expired states are not loaded.
      * Confirming that the `set` method correctly updates the cache.
      * Testing the `invalidateCache` method.
  * **Manual Testing:**
      * Load the SBI page and verify that a network scan occurs.
      * Reload the page within 30 minutes and confirm that the states are loaded from the cache and no network scan occurs.
      * Wait for more than 30 minutes, reload the page, and verify that a new scan is performed.
      * Use the "Retry" button on a repository in an error state and confirm that a fresh scan is triggered for that repository.