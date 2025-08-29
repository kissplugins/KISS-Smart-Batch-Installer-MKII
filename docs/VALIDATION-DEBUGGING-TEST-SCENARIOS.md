# Validation Debugging Test Scenarios

## 🎯 **Overview**

Test scenarios to verify the enhanced validation debugging system provides clear, actionable feedback when installation prerequisites are not met.

## 🧪 **Test Scenarios**

### **Scenario 1: Invalid Repository Name**

#### **Test Input**:
- Repository: `invalid-repo-name-that-is-way-too-long-and-exceeds-the-maximum-allowed-length-for-github-repositories`
- Owner: `test@user!`

#### **Expected Debug Output**:
```
🔍 Validation Failure Details for test@user!/invalid-repo-name-that-is-way-too-long:
❌ Failed Validations: Input
📋 Input Errors:
   1. Repository owner contains invalid characters
   2. Repository name exceeds maximum length (100 characters)
📊 Validation Summary: 6/7 checks passed (85.7% success rate)
💡 Recommendations:
   1. Verify repository owner and name are correct and contain only valid characters
```

#### **Expected UI Error**:
```
❌ Installation prerequisites not met. Failed validations: Input

▼ Technical Details
  Validation Failures:
  ❌ Failed: Input
  • Check repository name format and spelling
```

### **Scenario 2: Permission Issues**

#### **Test Setup**:
- User without `install_plugins` capability
- Valid repository name

#### **Expected Debug Output**:
```
🔍 Validation Failure Details for wordpress/wordpress:
❌ Failed Validations: Permissions
📋 Permissions Errors:
   1. Missing required capability: Install plugins (install_plugins)
   2. Missing required capability: Activate plugins (activate_plugins)
📊 Validation Summary: 6/7 checks passed (85.7% success rate)
💡 Recommendations:
   1. Contact your WordPress administrator to grant required plugin installation permissions
```

#### **Expected UI Error**:
```
❌ Installation prerequisites not met. Failed validations: Permissions

▼ Technical Details
  Validation Failures:
  ❌ Failed: Permissions
  • Contact administrator for plugin installation permissions
```

### **Scenario 3: Network Connectivity Issues**

#### **Test Setup**:
- Block GitHub API access via firewall/hosts file
- Valid repository and permissions

#### **Expected Debug Output**:
```
🔍 Validation Failure Details for kissplugins/KISS-Projects-Tasks:
❌ Failed Validations: Network
📋 Network Errors:
   1. Cannot connect to GitHub API
   2. Cannot connect to GitHub raw content
📊 Validation Summary: 6/7 checks passed (85.7% success rate)
💡 Recommendations:
   1. Check internet connection and firewall settings for GitHub access
```

#### **Expected UI Error**:
```
❌ Installation prerequisites not met. Failed validations: Network

▼ Technical Details
  Validation Failures:
  ❌ Failed: Network
  • Check internet connection and GitHub accessibility
```

### **Scenario 4: Resource Constraints**

#### **Test Setup**:
- Low memory limit (64MB)
- Low disk space
- Valid repository, permissions, and network

#### **Expected Debug Output**:
```
🔍 Validation Failure Details for kissplugins/KISS-Projects-Tasks:
❌ Failed Validations: Resources
📋 Resources Errors:
   1. Insufficient memory limit: 128MB required, 64MB available
   2. Insufficient disk space: 50MB required, 25MB available
📊 Validation Summary: 6/7 checks passed (85.7% success rate)
💡 Recommendations:
   1. Increase server memory limit and ensure sufficient disk space
```

#### **Expected UI Error**:
```
❌ Installation prerequisites not met. Failed validations: Resources

▼ Technical Details
  Validation Failures:
  ❌ Failed: Resources
  • Server may need more memory or disk space
```

### **Scenario 5: Multiple Validation Failures**

#### **Test Setup**:
- Invalid repository name
- No permissions
- Network blocked

#### **Expected Debug Output**:
```
🔍 Validation Failure Details for test@user!/invalid-repo:
❌ Failed Validations: Input, Permissions, Network
📋 Input Errors:
   1. Repository owner contains invalid characters
📋 Permissions Errors:
   1. Missing required capability: Install plugins (install_plugins)
📋 Network Errors:
   1. Cannot connect to GitHub API
📊 Validation Summary: 4/7 checks passed (57.1% success rate)
💡 Recommendations:
   1. Verify repository owner and name are correct and contain only valid characters
   2. Contact your WordPress administrator to grant required plugin installation permissions
   3. Check internet connection and firewall settings for GitHub access
```

#### **Expected UI Error**:
```
❌ Installation prerequisites not met. Failed validations: Input, Permissions, Network

▼ Technical Details
  Validation Failures:
  ❌ Failed: Input, Permissions, Network
  • Check repository name format and spelling
  • Contact administrator for plugin installation permissions
  • Check internet connection and GitHub accessibility
```

### **Scenario 6: Repository State Conflict**

#### **Test Setup**:
- Repository already installed
- Valid input, permissions, network, resources

#### **Expected Debug Output**:
```
🔍 Validation Failure Details for kissplugins/KISS-Projects-Tasks:
❌ Failed Validations: State
📋 State Errors:
   1. Repository is already installed (state: installed_active)
📊 Validation Summary: 6/7 checks passed (85.7% success rate)
💡 Recommendations:
   1. Wait for current operations to complete or refresh repository status
```

#### **Expected UI Error**:
```
❌ Installation prerequisites not met. Failed validations: State

▼ Technical Details
  Validation Failures:
  ❌ Failed: State
  • Plugin may already be installed or another operation is in progress
```

### **Scenario 7: WordPress Environment Issues**

#### **Test Setup**:
- Old WordPress version (4.9)
- Plugins directory not writable
- Valid input, permissions, network, resources

#### **Expected Debug Output**:
```
🔍 Validation Failure Details for kissplugins/KISS-Projects-Tasks:
❌ Failed Validations: WordPress
📋 WordPress Errors:
   1. WordPress version 5.0 or higher required (current: 4.9)
   2. Plugins directory is not writable
📊 Validation Summary: 6/7 checks passed (85.7% success rate)
💡 Recommendations:
   1. Update WordPress and ensure plugins directory is writable
```

#### **Expected UI Error**:
```
❌ Installation prerequisites not met. Failed validations: WordPress

▼ Technical Details
  Validation Failures:
  ❌ Failed: WordPress
  • WordPress environment may need updates or configuration
```

### **Scenario 8: Concurrent Operation Conflict**

#### **Test Setup**:
- Another installation in progress for same repository
- Valid input, permissions, network, resources, WordPress

#### **Expected Debug Output**:
```
🔍 Validation Failure Details for kissplugins/KISS-Projects-Tasks:
❌ Failed Validations: Concurrency
📋 Concurrency Errors:
   1. Another operation is in progress for this repository
📊 Validation Summary: 6/7 checks passed (85.7% success rate)
💡 Recommendations:
   1. Wait for the current operation to complete before starting a new one
```

#### **Expected UI Error**:
```
❌ Installation prerequisites not met. Failed validations: Concurrency

▼ Technical Details
  Validation Failures:
  ❌ Failed: Concurrency
  • Another operation is in progress, please wait and try again
```

## 🔧 **Testing Instructions**

### **Manual Testing Steps**:

1. **Open Browser Developer Console**
   - Navigate to the Smart Batch Installer page
   - Open browser developer tools (F12)
   - Go to Console tab

2. **Test Invalid Repository Name**
   - Enter an invalid repository name (special characters, too long)
   - Click Install
   - Verify detailed debug output appears in console
   - Verify enhanced error message in UI

3. **Test Permission Issues**
   - Log in as a user without plugin installation permissions
   - Try to install a valid repository
   - Verify permission-specific error details

4. **Test Network Issues**
   - Block GitHub access (hosts file: `127.0.0.1 api.github.com`)
   - Try to install a repository
   - Verify network-specific error details
   - Restore network access

5. **Test Resource Constraints**
   - Temporarily reduce PHP memory limit
   - Try to install a repository
   - Verify resource-specific error details

6. **Test Multiple Failures**
   - Combine multiple failure conditions
   - Verify all failed categories are listed
   - Verify comprehensive recommendations

### **Automated Testing**:

Run the Self Tests to verify validation system:
1. Navigate to **Plugins → SBI Self Tests**
2. Click **"Run All Tests"**
3. Verify **Test Suite 9: Validation Guard System** passes
4. Check for any validation-related test failures

### **Expected Improvements**:

#### **Before Enhancement**:
```
❌ Install Failed: Installation failed for kissplugins/KISS-Projects-Tasks: Installation prerequisites not met
```

#### **After Enhancement**:
```
❌ Install Failed: Installation failed for kissplugins/KISS-Projects-Tasks: Installation prerequisites not met. Failed validations: Input, Network

Console Output:
🔍 Validation Failure Details for kissplugins/KISS-Projects-Tasks:
❌ Failed Validations: Input, Network
📋 Input Errors:
   1. Repository name contains invalid characters
📋 Network Errors:
   1. Cannot connect to GitHub API
📊 Validation Summary: 5/7 checks passed (71.4% success rate)
💡 Recommendations:
   1. Verify repository owner and name are correct and contain only valid characters
   2. Check internet connection and firewall settings for GitHub access

UI Technical Details:
Validation Failures:
❌ Failed: Input, Network
• Check repository name format and spelling
• Check internet connection and GitHub accessibility
```

## 📊 **Success Criteria**

### **User Experience**:
- ✅ Users can identify exactly which validation failed
- ✅ Users receive actionable guidance for each failure type
- ✅ Error messages are clear and non-technical
- ✅ Progressive disclosure keeps UI clean while providing details

### **Developer Experience**:
- ✅ Comprehensive debug output in browser console
- ✅ Structured error data for analysis
- ✅ Clear categorization of validation failures
- ✅ Timing information for performance debugging

### **Support Reduction**:
- ✅ Reduced "unclear error" support tickets
- ✅ Users can self-diagnose common issues
- ✅ Better error reports when users do need support
- ✅ Faster issue resolution with detailed error context

This enhanced debugging system transforms generic validation failures into actionable, user-friendly feedback that helps users understand and resolve issues quickly.
