Expanded Plugin Source Selection: Feasibility & Implementation Plan
🎯 Overview
This document outlines the feasibility and a phased implementation plan for an enhanced plugin source selection feature. This upgrade will provide users with multiple methods to define their plugin collection, including the ability to reuse previous inputs, thereby streamlining the workflow. The contents of the last uploaded CSV will be saved to the WordPress options table to avoid the need for re-uploads.

✅ Feasibility Analysis: HIGHLY FEASIBLE
This expanded feature set is highly feasible and integrates cleanly with the FSM-first architecture. The core of this enhancement is data persistence, which is a standard WordPress practice and poses no significant architectural challenges.

Key Architectural Strengths:

Centralized State Management: The StateManager can be initialized from various data sources. Whether the plugin list comes from a live GitHub scan or a database option, the StateManager will handle it uniformly.

Decoupled UI: The frontend's reactive nature means the UI can be updated to present the four selection methods without altering the core logic that displays the plugin table.

WordPress Options API: WordPress provides a simple and robust API (update_option, get_option) for storing persistent data like the last used GitHub account or CSV content, making the "remember" feature straightforward to implement.

🚀 Implementation Plan
The implementation will be structured to first build the backend persistence and then create the user-facing selection UI.

Phase 1: Backend - Data Persistence & Logic

Goal: Implement the logic to save, retrieve, and process plugin sources from the WordPress options table.

1. Handle Persistence in the wp_options table:

Action: When a user provides a new source, save it to the database.

On a successful GitHub org/user scan, store the account name using update_option('sbi_last_github_source', $github_account);.

On a successful CSV upload, store the content of the file using update_option('sbi_last_csv_content', $csv_content);.

File: This logic will be added to AjaxHandler.php within the existing methods that handle GitHub scans and the new CSV upload method.

2. Create New AJAX Endpoints for Reusing Sources:

Action: In AjaxHandler.php, create two new AJAX actions:

sbi_load_previous_github: This action will retrieve the saved GitHub account from the options table using get_option('sbi_last_github_source'), and then trigger the existing repository scanning logic with that account name.

sbi_load_previous_csv: This action will retrieve the saved CSV content using get_option('sbi_last_csv_content'), parse the content, and load the plugins into the StateManager with the MANUAL_UNVALIDATED state.

Response: Both endpoints will return a success or failure status, allowing the frontend to know when processing has started. The actual plugin table will be updated via the existing SSE broadcasting system.

Phase 2: Frontend - Source Selection UI

Goal: Develop a clear user interface that allows the user to choose from the four available methods.

1. Design the Source Selection Interface:

Action: On the main plugin page, create a new UI section, likely using radio buttons, for the user to select their desired method:

( ) Specify new GitHub org/user account (reveals a text input)

( ) Re-use previous GitHub account: [saved_account_name] (this option is only enabled if a value exists in the database)

( ) Upload new CSV file of plugin URLs (reveals a file input)

( ) Re-use previously uploaded CSV file (this option is only enabled if content exists in the database)

Data for UI: The availability and labels for options 2 and 4 will be passed from the PHP backend to the frontend via wp_localize_script.

2. Implement the Frontend Logic:

File: src/ts/admin/handlers.ts

Action: Create a new TypeScript handler to manage this UI.

The handler will show/hide the relevant input fields (for options 1 and 3) based on the user's selection.

A single "Load Plugins" button will trigger the appropriate AJAX call (sbi_scan_repos, sbi_manual_upload, sbi_load_previous_github, or sbi_load_previous_csv) based on the selected radio button.

The handler will provide user feedback (e.g., showing a spinner, disabling the button during processing).

Phase 3: Testing and Refinement

Goal: Ensure the new, more complex workflow is robust and user-friendly.

1. Automated Testing:

File: src/Admin/NewSelfTestsPage.php

Action: Add tests to cover all four sourcing methods.

Test that the wp_options are correctly saved after providing a new source.

Test that the "re-use" AJAX endpoints correctly retrieve and process the saved data.

Verify that the FSM correctly handles plugins from all four sources.

2. Enhance Error Handling and UX:

Action: Provide clear feedback and error messages for each step.

If a user tries to re-use a source that doesn't exist, the UI should prevent it, but the backend should also handle it gracefully.

If the saved CSV content is somehow invalid, the user should be notified (e.g., "The previously saved CSV file is corrupted. Please upload a new one.").

UI Polish: The initial state of the UI should clearly indicate which, if any, "re-use" options are available to the user.