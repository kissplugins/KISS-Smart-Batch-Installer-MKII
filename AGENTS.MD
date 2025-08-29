========================================================================
 AI / LLM AGENT INSTRUCTIONS - SMART BATCH INSTALLER FSM
========================================================================

## 🚨 CRITICAL: FINITE STATE MACHINE (FSM) PROTECTION 🚨

This plugin's core architecture is built around a Finite State Machine (FSM) that manages
all repository states and business logic. The FSM is the heart of the system and must be
protected from accidental modification.

### ⚠️ FSM CORE COMPONENTS - DO NOT REFACTOR WITHOUT EXPLICIT REQUEST ⚠️

#### **PROTECTED FILES - HANDLE WITH EXTREME CARE:**

1. **`src/ts/admin/repositoryFSM.ts`** - Frontend TypeScript FSM
   - Core state management class
   - State storage and listener system
   - SSE real-time integration
   - Enhanced error handling (v1.0.32)

2. **`src/Services/StateManager.php`** - Backend PHP FSM
   - State transition validation
   - State persistence and caching
   - SSE event emission
   - Error context management

3. **`src/Enums/PluginState.php`** - PHP State Definitions
   - Core state enumeration
   - Database-stored values
   - State transition rules

4. **`src/ts/types/fsm.ts`** - TypeScript State Definitions
   - Frontend state enumeration
   - State utility functions
   - Must match PHP enum exactly

#### **CRITICAL METHODS - NEVER MODIFY WITHOUT EXPLICIT REQUEST:**

- `RepositoryFSM.set()` - Core state setter
- `RepositoryFSM.get()` - Core state getter
- `RepositoryFSM.onChange()` - Listener registration
- `StateManager.transition()` - Backend state transitions
- `RepositoryFSM.initSSE()` - Real-time updates
- `getActionableErrorMessage()` - Enhanced error messages

### 🛡️ FSM PROTECTION RULES

#### **RULE 1: NO UNAUTHORIZED FSM MODIFICATIONS**
- Do NOT modify FSM core files without explicit user request
- Do NOT change state values or enum definitions
- Do NOT alter state transition logic
- Do NOT modify SSE integration code

#### **RULE 2: EXTEND, DON'T REPLACE**
- Add new functionality around the FSM, not within it
- Use existing state transitions for new features
- Leverage existing error handling mechanisms
- Build on top of existing SSE infrastructure

#### **RULE 3: MANDATORY USER CONSULTATION**
When a task requires FSM modification, you MUST:

1. **STOP** and inform the user that FSM changes are needed
2. **EXPLAIN** exactly what FSM changes are required and why
3. **WARN** about potential risks and breaking changes
4. **REQUEST** explicit permission before proceeding
5. **PROVIDE** testing requirements and validation steps

### 🎯 SUMMARY FOR AI AGENTS

1. **PROTECT THE FSM** - It's the core of the entire system
2. **ASK BEFORE MODIFYING** - Get explicit permission for FSM changes
3. **EXTEND, DON'T REPLACE** - Build around the FSM, not within it
4. **TEST THOROUGHLY** - FSM changes require comprehensive validation
5. **DOCUMENT EVERYTHING** - Keep documentation current and accurate

The FSM is production-ready and battle-tested. Treat it with the respect it deserves.

There should be a total of only 1 FSM PHP for the backend and 1 FSM JS for the frontend. There should not be more than 1 FSM per backend and frontend.

Please do not refactor anything beyond the scope of the immediate tasks. Please do not change any labels unless explicitly instructed. Please keep the TOC if one exists, increment the version number for each change, and add to the existing changelog within the code. Please try your best to adhere to DRY principles so we can re-use existing functions or better yet re-use WP core functions or API calls.