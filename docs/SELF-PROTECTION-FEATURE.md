# FSM-Centric Self-Protection Feature Implementation

## 🎯 **Overview**

Implemented a safety feature to prevent users from accidentally deactivating the Smart Batch Installer plugin itself using a **FSM-first approach**. The StateManager detects self-plugins and stores protection metadata, which the UI then respects when rendering buttons.

## ✅ **FSM-Centric Implementation Summary**

### **1. FSM State Metadata System**

**File**: `src/Services/StateManager.php`

#### **FSM State Metadata Storage**:
```php
/**
 * State metadata storage for additional FSM context.
 * Stores metadata like self-protection flags, error context, etc.
 *
 * @var array<string, array>
 */
private array $state_metadata = [];
```

#### **FSM-Centric Detection Method**: `detect_self_plugin()`
```php
private function detect_self_plugin(string $repository, ?string $plugin_file = null): bool {
    // Method 1: Plugin file path comparison (most reliable when installed)
    if (!empty($plugin_file)) {
        $current_plugin_file = plugin_basename(__FILE__);
        $current_plugin_dir = dirname(dirname($current_plugin_file));
        $plugin_dir = dirname($plugin_file);

        if ($plugin_dir === $current_plugin_dir) {
            return true;
        }
    }

    // Method 2: Repository name pattern matching
    $repo_lower = strtolower($repository);
    $self_patterns = [
        'kiss-smart-batch-installer',
        'smart-batch-installer',
        'batch-installer',
        'sbi',
        'kiss-sbi'
    ];

    foreach ($self_patterns as $pattern) {
        if (strpos($repo_lower, $pattern) !== false) {
            return true;
        }
    }

    // Method 3: MKII variant detection
    if (strpos($repo_lower, 'mkii') !== false &&
        (strpos($repo_lower, 'installer') !== false || strpos($repo_lower, 'batch') !== false)) {
        return true;
    }

    return false;
}
```

#### **FSM Metadata Management**:
```php
public function set_state_metadata(string $repository, array $metadata): void {
    $this->state_metadata[$repository] = array_merge(
        $this->state_metadata[$repository] ?? [],
        $metadata
    );
}

public function get_state_metadata(string $repository, ?string $key = null) {
    $metadata = $this->state_metadata[$repository] ?? [];
    return $key !== null ? ($metadata[$key] ?? null) : $metadata;
}

public function is_self_protected(string $repository): bool {
    return $this->get_state_metadata($repository, 'self_protected') === true;
}
```

#### **FSM Integration in State Refresh**:
```php
public function refresh_state(string $repository): void {
    // ... state detection logic ...

    // FSM-centric self-protection detection
    $plugin_file = null;
    if (in_array($state, [PluginState::INSTALLED_ACTIVE, PluginState::INSTALLED_INACTIVE], true)) {
        $plugin_file = $this->getInstalledPluginFile($repository);
    }
    $this->detect_and_mark_self_protection($repository, $plugin_file);

    $this->transition($repository, $state, ['source' => 'refresh_state'], true);
}
```

### **2. FSM-Centric UI Rendering**

**File**: `src/Admin/RepositoryListTable.php`

#### **FSM-Based Protection Check**:
```php
// FSM-centric self-protection check
if ( $this->state_manager->is_self_protected( $repo_full_name ) ) {
    // Render protected button
} else {
    // Render normal deactivate button
}
```

#### **Normal Deactivate Button**:
```php
$actions[] = sprintf(
    '<button type="button" class="button button-secondary sbi-deactivate-plugin" data-repo="%s" data-owner="%s" data-plugin-file="%s">%s</button>',
    esc_attr( $repo_name ),
    esc_attr( $owner ),
    esc_attr( $plugin_file ),
    esc_html__( 'Deactivate', 'kiss-smart-batch-installer' )
);
```

#### **Protected Button (FSM-Driven)**:
```php
$actions[] = sprintf(
    '<button type="button" class="button button-secondary" disabled title="%s" style="opacity: 0.5; cursor: not-allowed;"><span class="dashicons dashicons-shield" style="font-size: 13px; line-height: 1.2; margin-right: 5px;"></span>%s</button>',
    esc_attr__( 'Cannot deactivate: This would remove access to the Smart Batch Installer interface', 'kiss-smart-batch-installer' ),
    esc_html__( 'Protected', 'kiss-smart-batch-installer' )
);
```

### **3. Enhanced CSS Styling**

**File**: `assets/admin.css`

#### **Protected Button Styles**:
```css
/* Protected plugin button styling - prevents accidental deactivation */
.column-actions .button[disabled] {
    opacity: 0.5 !important;
    cursor: not-allowed !important;
    background-color: #f6f7f7 !important;
    border-color: #ddd !important;
    color: #666 !important;
    box-shadow: none !important;
    pointer-events: none !important;
}

.column-actions .button[disabled]:hover,
.column-actions .button[disabled]:focus {
    background-color: #f6f7f7 !important;
    border-color: #ddd !important;
    color: #666 !important;
    transform: none !important;
    box-shadow: none !important;
}

/* Protected button shield icon styling */
.column-actions .button[disabled] .dashicons-shield {
    color: #d63638 !important;
    font-size: 13px !important;
    line-height: 1.2 !important;
    margin-right: 5px !important;
    vertical-align: middle !important;
}
```

### **4. Self Tests Integration**

**File**: `src/Admin/NewSelfTestsPage.php`

#### **Test 9.9: Self-Protection Feature**
Tests the self-detection logic with various repository name patterns:

```php
$test_cases = [
    'KISS-Smart-Batch-Installer-MKII' => true,
    'kiss-smart-batch-installer' => true,
    'Smart-Batch-Installer' => true,
    'batch-installer-mkii' => true,
    'sbi' => true,
    'wordpress/wordpress' => false,
    'random/plugin' => false
];
```

## 🛡️ **Protection Features**

### **Visual Indicators**:
- **Shield Icon** (🛡️) - Indicates protection status
- **Disabled Appearance** - Grayed out, reduced opacity
- **"Protected" Label** - Clear indication of protection
- **Tooltip Message** - Explains why deactivation is prevented

### **Interaction Prevention**:
- **Disabled Attribute** - Button cannot be clicked
- **Pointer Events Disabled** - No mouse interactions
- **Cursor Change** - Shows "not-allowed" cursor
- **No JavaScript Events** - No AJAX calls triggered

### **User Feedback**:
- **Helpful Tooltip**: "Cannot deactivate: This would remove access to the Smart Batch Installer interface"
- **Visual Distinction** - Clearly different from active buttons
- **Consistent Styling** - Matches WordPress admin design patterns

## 🔍 **Detection Patterns**

### **Repository Names That Trigger Protection**:

#### **Exact Matches**:
- `KISS-Smart-Batch-Installer-MKII`
- `kiss-smart-batch-installer`
- `Smart-Batch-Installer`
- `SBI`

#### **Pattern Matches**:
- Any repository containing `kiss-smart-batch-installer`
- Any repository containing `smart-batch-installer`
- Any repository containing `batch-installer`
- Any repository containing `sbi`
- Any repository containing `kiss-sbi`

#### **MKII Variants**:
- Any repository containing `mkii` AND (`installer` OR `batch`)
- Examples: `batch-installer-mkii`, `smart-installer-mkii`

#### **Plugin File Path Matching**:
- Compares plugin directory paths directly
- Most reliable method when plugin is installed

### **Repository Names That Don't Trigger Protection**:
- `wordpress/wordpress`
- `random/plugin`
- `some-other-installer` (without specific keywords)
- `batch-processor` (batch without installer)

## 🎯 **User Experience**

### **Before Protection**:
```
[Install] [Activate] [Deactivate] [Settings]
```
*User could accidentally click Deactivate and lose access*

### **After Protection**:
```
[Install] [Activate] [🛡️ Protected] [Settings]
```
*Deactivate button is replaced with protected button*

### **Tooltip Guidance**:
When user hovers over the protected button:
```
"Cannot deactivate: This would remove access to the Smart Batch Installer interface"
```

## 🧪 **Testing Scenarios**

### **Manual Testing**:

1. **Add Self Repository**:
   - Add `KISS-Smart-Batch-Installer-MKII` to repository list
   - Install and activate the plugin
   - Verify deactivate button shows as "Protected"

2. **Test Tooltip**:
   - Hover over the protected button
   - Verify tooltip shows helpful message
   - Verify button cannot be clicked

3. **Test Other Plugins**:
   - Add other repositories (e.g., `wordpress/wordpress`)
   - Verify normal deactivate button appears
   - Verify deactivate functionality works normally

### **Automated Testing**:
- **Test 9.9** in Self Tests validates detection logic
- Tests various repository name patterns
- Ensures correct classification of self vs. other plugins

## 📊 **Benefits**

### **Accident Prevention**:
- **Prevents UI Loss** - Users cannot accidentally remove access to the interface
- **Reduces Support Tickets** - Fewer "I can't access the plugin" issues
- **Improves User Confidence** - Users feel safer using the interface

### **Professional Experience**:
- **Clear Visual Feedback** - Users understand why button is disabled
- **Helpful Guidance** - Tooltip explains the protection
- **Consistent Design** - Matches WordPress admin patterns

### **System Reliability**:
- **Self-Preservation** - Plugin protects its own functionality
- **Graceful Degradation** - Protection works even if detection isn't perfect
- **Multiple Detection Methods** - Redundant detection for reliability

## 🔧 **Configuration**

### **No Configuration Required**:
- Protection is automatic and always active
- No settings or options to configure
- Works out of the box for all installations

### **Customization Points** (for developers):
- **Detection Patterns** - Can be modified in `is_self_plugin()` method
- **Button Styling** - Can be customized in CSS
- **Tooltip Message** - Can be changed in the button rendering code

## 🚀 **Future Enhancements**

### **Potential Improvements**:
- **Admin Override** - Allow administrators to bypass protection
- **Configuration Option** - Setting to enable/disable protection
- **Enhanced Detection** - More sophisticated plugin identification
- **Protection Levels** - Different protection levels for different scenarios

### **Related Features**:
- **Backup Warning** - Warn before deactivating critical plugins
- **Dependency Protection** - Protect plugins that other plugins depend on
- **Bulk Operation Protection** - Prevent bulk deactivation of critical plugins

This self-protection feature ensures that users cannot accidentally remove their access to the Smart Batch Installer interface, providing a safer and more reliable user experience.
