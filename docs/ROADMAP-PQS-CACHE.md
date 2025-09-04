# PQS Cache FSM Re-integration Plan (Revised)

## 🎯 **Overview**

This document outlines a strategic approach to re-integrate the Plugin Quick Search (PQS) cache with the new FSM architecture. The goal is to leverage the PQS cache as a supplemental data source to enrich the user experience without compromising the FSM's role as the single source of truth for plugin states.

> ### Important Notes on PQS
>
> * **External Cache Generation**: It is critical to understand that the `pqs_cache` is **generated and managed by a separate, independent plugin**: the "KISS Plugin Quick Search" plugin. The Smart Batch Installer is a *consumer* of this cache, not its creator. Therefore, this integration is read-only and depends on the PQS plugin being installed and active for the cache to exist and be up-to-date.
> * **Command Palette / Pop-up**: The PQS plugin is known for its `Command/Control + Shift + P` keyboard shortcut, which triggers a command palette for quick plugin searching. A scan of the current Smart Batch Installer codebase confirms that **all listeners for this shortcut have been removed** during the FSM refactoring. Re-integration would require re-implementing this feature from scratch within the new architecture.

---

## ✅ **Actionable Items / Next Steps**

Here is a high-level checklist to guide the re-integration process. It is recommended to complete Section 1 before beginning Section 2.

### **Section 1: KISS Plugin Quick Search (PQS) - Prerequisites**

* [ ] **Verify Cache Integrity**: Ensure the PQS plugin is stable and correctly generating the `pqs_cache` transient in the WordPress database.
* [ ] **Confirm Data Structure**: Check that the data within the cache (plugin slugs, names, descriptions, authors) is accurate and in a predictable format that the SBI can reliably parse.
* [ ] **Review Update Frequency**: Confirm how often the PQS cache is refreshed. This is important for managing user expectations about data freshness in the SBI UI.

### **Section 2: KISS Smart Batch Installer (SBI) - Implementation**

* [ ] **Phase 1: Modernize PQS Service**
    * [ ] Update `PQSIntegration.php` to accept the `StateManager` via dependency injection.
    * [ ] Create the new `enrich_repositories_from_cache()` method to handle the metadata enrichment logic.
* [ ] **Phase 2: FSM Integration**
    * [ ] Add the new `ENRICHING` state to the `PluginState` enum.
    * [ ] Define the state transitions to and from `ENRICHING` in the `StateManager`.
    * [ ] Modify the `transition()` method in `StateManager` to call the enrichment service when a plugin enters the `ENRICHING` state.
* [ ] **Phase 3: UI and Testing**
    * [ ] Update the `RepositoryListTable` to display the enriched metadata (e.g., add a "Description" column).
    * [ ] Make the frontend `RepositoryFSM` aware of the `ENRICHING` state to show appropriate UI feedback.
    * [ ] Create a new automated test in `NewSelfTestsPage.php` to validate the entire enrichment process.