# Version Number Title Update

## Overview

Updated the Self Tests page title and admin menu to include the plugin version number in the requested format: `NHK/KISS v[1.23] SBI Self Tests - Comprehensive Suite`

## Changes Applied

### 1. **Page Title Update** - `src/Admin/NewSelfTestsPage.php`

**Before**:
```php
<h1><?php esc_html_e( 'SBI Self Tests - New Comprehensive Suite', 'kiss-smart-batch-installer' ); ?></h1>
```

**After**:
```php
<h1><?php echo esc_html( sprintf( 'NHK/KISS v[%s] SBI Self Tests - Comprehensive Suite', defined( 'GBI_VERSION' ) ? GBI_VERSION : '1.0.0' ) ); ?></h1>
```

### 2. **Admin Menu Update** - `src/Plugin.php`

**Before**:
```php
add_submenu_page(
    'plugins.php',
    __( 'KISS Smart Batch Installer - Self Tests', 'kiss-smart-batch-installer' ),
    __( 'SBI Self Tests', 'kiss-smart-batch-installer' ),
    'install_plugins',
    'sbi-self-tests',
    [ $this, 'render_self_tests_page' ]
);
```

**After**:
```php
add_submenu_page(
    'plugins.php',
    sprintf( 'NHK/KISS v[%s] SBI Self Tests', defined( 'GBI_VERSION' ) ? GBI_VERSION : '1.0.0' ),
    sprintf( 'SBI Self Tests v[%s]', defined( 'GBI_VERSION' ) ? GBI_VERSION : '1.0.0' ),
    'install_plugins',
    'sbi-self-tests',
    [ $this, 'render_self_tests_page' ]
);
```

## Version Source

The version number is retrieved from the `GBI_VERSION` constant defined in the main plugin file:

```php
// From nhk-kiss-batch-installer.php
define( 'GBI_VERSION', '1.0.31' );
```

## Implementation Details

### **Dynamic Version Display**
- **Fallback Protection**: Uses `defined( 'GBI_VERSION' ) ? GBI_VERSION : '1.0.0'` to prevent errors if constant is not defined
- **Consistent Format**: Both page title and menu follow the same version pattern
- **Automatic Updates**: Version will automatically update when `GBI_VERSION` constant is changed

### **Title Format Breakdown**
- **`NHK/KISS`**: Framework/Plugin identifier
- **`v[1.0.31]`**: Version number in brackets as requested
- **`SBI Self Tests`**: Core functionality identifier
- **`- Comprehensive Suite`**: Descriptive suffix

### **Menu Format**
- **Page Title**: `NHK/KISS v[1.0.31] SBI Self Tests` (full format for browser title)
- **Menu Title**: `SBI Self Tests v[1.0.31]` (shorter format for admin menu)

## Current Display

With the current version `1.0.31`, the titles will display as:

### **Page Title**:
```
NHK/KISS v[1.0.31] SBI Self Tests - Comprehensive Suite
```

### **Admin Menu**:
```
SBI Self Tests v[1.0.31]
```

## Benefits

### **Version Visibility**
- **Clear Identification**: Users can immediately see which version they're using
- **Debugging Aid**: Helps with support and troubleshooting
- **Professional Appearance**: Follows enterprise software conventions

### **Maintenance**
- **Automatic Updates**: No manual title updates needed when version changes
- **Consistent Branding**: Maintains NHK/KISS framework identity
- **Error Prevention**: Fallback version prevents display issues

### **User Experience**
- **Quick Reference**: Version visible without navigating to about/info pages
- **Professional Look**: Matches enterprise software standards
- **Clear Context**: Users know exactly what version of the test suite they're using

## Future Considerations

### **Version Synchronization**
- Ensure `GBI_VERSION` constant is updated with each release
- Consider adding version to other admin pages for consistency
- Maintain version alignment across all plugin files

### **Branding Consistency**
- Apply similar version display pattern to other NHK Framework plugins
- Consider standardizing the format across the entire plugin ecosystem
- Maintain consistent `NHK/KISS v[x.x.x]` pattern

The version number is now prominently displayed in both the page title and admin menu, providing clear version identification for users and administrators.
