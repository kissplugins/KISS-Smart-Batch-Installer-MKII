# FSM-Centric Self-Protection Refactor

## 🎯 **Overview**

Refactored the self-protection feature to follow a **FSM-first architecture** instead of bypassing the Finite State Machine with ad-hoc UI logic. This ensures consistency with the plugin's core architectural principles.

## 🔄 **Before vs After Architecture**

### **❌ Before: Non-FSM Approach**
```
UI Component → Direct Detection Logic → Button Rendering
```
- RepositoryListTable had its own `is_self_plugin()` method
- UI component bypassed the FSM to make protection decisions
- Detection logic was duplicated and not centralized
- Violated the FSM-first architectural principle

### **✅ After: FSM-Centric Approach**
```
StateManager → Detection & Metadata Storage → UI Reads FSM State → Button Rendering
```
- StateManager handles all detection and stores metadata
- UI components read protection status from FSM metadata
- Single source of truth for self-protection state
- Maintains FSM-first architecture throughout

## 🏗️ **FSM-Centric Implementation Details**

### **1. StateManager Enhancements**

#### **State Metadata Storage**:
```php
/**
 * State metadata storage for additional FSM context.
 * Stores metadata like self-protection flags, error context, etc.
 */
private array $state_metadata = [];
```

#### **Metadata Management Methods**:
```php
public function set_state_metadata(string $repository, array $metadata): void
public function get_state_metadata(string $repository, ?string $key = null)
public function is_self_protected(string $repository): bool
```

#### **Detection Integration**:
```php
public function detect_and_mark_self_protection(string $repository, ?string $plugin_file = null): void {
    $is_self = $this->detect_self_plugin($repository, $plugin_file);
    
    if ($is_self) {
        $this->set_state_metadata($repository, [
            'self_protected' => true,
            'protection_reason' => 'Smart Batch Installer self-protection',
            'detected_at' => time()
        ]);
    }
}
```

#### **FSM Integration in State Refresh**:
```php
public function refresh_state(string $repository): void {
    // ... normal state detection ...
    
    // FSM-centric self-protection detection
    $plugin_file = null;
    if (in_array($state, [PluginState::INSTALLED_ACTIVE, PluginState::INSTALLED_INACTIVE], true)) {
        $plugin_file = $this->getInstalledPluginFile($repository);
    }
    $this->detect_and_mark_self_protection($repository, $plugin_file);
    
    $this->transition($repository, $state, ['source' => 'refresh_state'], true);
}
```

### **2. UI Component Simplification**

#### **Before (Non-FSM)**:
```php
// RepositoryListTable had its own detection logic
private function is_self_plugin(string $repo_full_name, string $plugin_file): bool {
    // 40+ lines of detection logic duplicated from StateManager
}

// UI made protection decisions directly
if ($this->is_self_plugin($repo_full_name, $plugin_file)) {
    // render protected button
}
```

#### **After (FSM-Centric)**:
```php
// UI simply reads FSM metadata
if ($this->state_manager->is_self_protected($repo_full_name)) {
    // render protected button
}
```

### **3. Frontend FSM Alignment**

#### **TypeScript FSM Comments**:
```typescript
// Standard button state management
if (installBtn) installBtn.disabled = isInstalled || isError;
if (activateBtn) activateBtn.disabled = state !== PluginState.INSTALLED_INACTIVE;
if (deactivateBtn) deactivateBtn.disabled = state !== PluginState.INSTALLED_ACTIVE;

// Note: Self-protection is handled FSM-centrically by the backend StateManager
// The backend renders protected buttons directly based on FSM metadata
// Frontend respects the pre-rendered disabled state without additional logic
```

## 🎯 **FSM-First Principles Applied**

### **1. Single Source of Truth**
- **Before**: Detection logic in multiple places
- **After**: StateManager is the only source of protection decisions

### **2. State-Driven UI**
- **Before**: UI components made independent decisions
- **After**: UI renders based on FSM state and metadata

### **3. Centralized State Management**
- **Before**: Ad-hoc state scattered across components
- **After**: All state and metadata managed by StateManager

### **4. Separation of Concerns**
- **Before**: UI components handled detection logic
- **After**: StateManager handles detection, UI handles rendering

## 🧪 **Testing Updates**

### **Self Tests Refactor**:
```php
// Test 9.9: FSM-Centric Self-Protection Feature
$suite['tests'][] = $this->run_test('FSM-Centric Self-Protection Feature', function() {
    $container = sbi_container();
    $state_manager = $container->get(\SBI\Services\StateManager::class);

    // Test FSM-centric self-protection detection
    $state_manager->detect_and_mark_self_protection($repo_name);
    $is_protected = $state_manager->is_self_protected($repo_name);
    
    // Test metadata storage
    $metadata = $state_manager->get_state_metadata($repo_name);
    // Verify metadata structure and content
});
```

## 📊 **Benefits of FSM-Centric Approach**

### **1. Architectural Consistency**
- ✅ Maintains FSM-first design throughout the system
- ✅ No bypassing of the state management system
- ✅ Consistent with existing plugin architecture

### **2. Code Quality**
- ✅ Eliminates code duplication
- ✅ Single responsibility principle
- ✅ Better separation of concerns
- ✅ Easier to test and maintain

### **3. Scalability**
- ✅ Easy to add new metadata types
- ✅ Extensible protection logic
- ✅ Centralized state management
- ✅ Future-proof architecture

### **4. Debugging & Maintenance**
- ✅ Single place to debug protection logic
- ✅ Clear data flow through FSM
- ✅ Easier to trace state changes
- ✅ Better logging and monitoring

## 🔧 **Migration Path**

### **Step 1: Add Metadata System**
- Added `state_metadata` array to StateManager
- Added metadata management methods
- Integrated detection into state refresh

### **Step 2: Update UI Components**
- Replaced direct detection with FSM metadata queries
- Removed duplicate detection logic
- Simplified UI rendering logic

### **Step 3: Update Tests**
- Modified Self Tests to use FSM methods
- Added metadata validation
- Ensured FSM-centric testing approach

### **Step 4: Documentation**
- Updated all documentation to reflect FSM-centric approach
- Added architectural decision rationale
- Provided migration examples

## 🚀 **Future Enhancements**

### **Potential FSM Metadata Extensions**:
- **Error Context**: Store detailed error information in metadata
- **Performance Metrics**: Track operation timing and success rates
- **User Preferences**: Store user-specific settings per repository
- **Dependency Tracking**: Track plugin dependencies and conflicts
- **Security Flags**: Mark repositories with security considerations

### **FSM State Extensions**:
- **PROTECTED State**: Dedicated state for protected plugins
- **DEPENDENCY State**: State for plugins that other plugins depend on
- **CRITICAL State**: State for system-critical plugins

## 📋 **Key Takeaways**

### **FSM-First Architecture Benefits**:
1. **Consistency**: All state changes go through the FSM
2. **Reliability**: Single source of truth prevents conflicts
3. **Maintainability**: Centralized logic is easier to update
4. **Testability**: FSM methods are easier to unit test
5. **Scalability**: Easy to extend with new metadata types

### **Implementation Principles**:
1. **StateManager owns all state and metadata**
2. **UI components read from FSM, never bypass it**
3. **Detection logic is centralized in StateManager**
4. **Metadata provides additional context without new states**
5. **Frontend respects backend FSM decisions**

This refactor ensures the self-protection feature aligns with the plugin's FSM-first architecture while maintaining all functionality and improving code quality.
