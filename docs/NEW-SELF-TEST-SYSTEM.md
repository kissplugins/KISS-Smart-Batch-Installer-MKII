# New Self Test System for KISS Smart Batch Installer

## Overview

A completely new self-test system has been created from scratch to replace the problematic old self-test page that was rendering raw HTML. The new system provides comprehensive testing across 8 real-world test suites.

## Access

- **New Self Tests**: `wp-admin/plugins.php?page=sbi-new-self-tests`
- **Old Self Tests**: `wp-admin/plugins.php?page=sbi-self-tests` (kept for reference)

Both pages are accessible from the main Repository Manager page.

## 8 Comprehensive Test Suites

### 1. GitHub Service Integration Test
**Purpose**: Tests GitHub API connectivity, organization detection, and repository fetching

**Tests Include**:
- Service Initialization
- Configuration Retrieval
- Repository Fetching (with fallback handling)
- Repository Info Retrieval

**Real-World Scenarios**:
- Tests actual GitHub API calls with rate limiting awareness
- Validates fallback mechanisms when API is unavailable
- Checks organization vs user account detection

### 2. Plugin Detection Engine Test
**Purpose**: Tests WordPress plugin header scanning and validation

**Tests Include**:
- Detection Service Initialization
- Known Plugin Detection (using KISS Plugin Quick Search as test case)
- Fast Detection Method validation
- Cache Functionality verification

**Real-World Scenarios**:
- Tests actual plugin header parsing
- Validates caching improves performance
- Ensures detection accuracy

### 3. State Management System Test
**Purpose**: Tests FSM transitions, state persistence, and validation

**Tests Include**:
- State Manager Initialization
- State Transitions (valid transition testing)
- State persistence verification

**Real-World Scenarios**:
- Tests the finite state machine logic
- Validates state transition rules
- Ensures state persistence across requests

### 4. AJAX API Endpoints Test
**Purpose**: Tests all AJAX handlers and their responses

**Tests Include**:
- AJAX Handler Initialization
- Hook Registration verification
- Endpoint availability checks

**Real-World Scenarios**:
- Validates WordPress AJAX system integration
- Ensures all required endpoints are registered
- Tests AJAX security and nonce handling

### 5. Plugin Installation Pipeline Test
**Purpose**: Tests WordPress core upgrader integration

**Tests Include**:
- Installation Service Initialization
- WordPress Upgrader Availability
- Installation pipeline readiness

**Real-World Scenarios**:
- Validates WordPress core upgrader integration
- Tests installation service dependencies
- Ensures proper WordPress environment setup

### 6. Container & Dependency Injection Test
**Purpose**: Tests service registration and dependency resolution

**Tests Include**:
- Container Availability
- Service Resolution for all core services
- Dependency injection validation

**Real-World Scenarios**:
- Tests the NHK Framework container system
- Validates all services can be instantiated
- Ensures proper dependency wiring

### 7. WordPress Integration Test
**Purpose**: Tests admin pages, hooks, and WordPress compatibility

**Tests Include**:
- Admin Menu Registration
- WordPress Version Compatibility
- Required WordPress Functions availability

**Real-World Scenarios**:
- Validates WordPress admin integration
- Checks minimum WordPress version requirements
- Ensures all required WordPress functions are available

### 8. Performance & Reliability Test
**Purpose**: Tests caching, timeouts, and error handling

**Tests Include**:
- Transient Cache System
- Error Handling (WP_Error system)
- Memory Usage monitoring

**Real-World Scenarios**:
- Tests WordPress caching mechanisms
- Validates error handling patterns
- Monitors memory consumption and limits

## Technical Implementation

### Architecture
- **File**: `src/Admin/NewSelfTestsPage.php`
- **Dependencies**: All core SBI services (GitHubService, PluginDetectionService, StateManager, PluginInstallationService, AjaxHandler)
- **Framework**: Built on NHK Framework with proper dependency injection

### Security Features
- Proper capability checks (`install_plugins`)
- WordPress nonce verification
- Input sanitization and output escaping
- Error handling with graceful degradation

### Performance Features
- Individual test timing
- Overall execution time tracking
- Memory usage monitoring
- Timeout protection

### User Experience
- Clean, modern WordPress admin styling
- Color-coded test results (green for pass, red for fail)
- Detailed error messages with troubleshooting information
- Execution time display for performance analysis
- Comprehensive test summary

## Key Improvements Over Old System

1. **Proper WordPress Integration**: No more raw HTML output
2. **Comprehensive Coverage**: 8 test suites covering all major components
3. **Real-World Testing**: Tests actual functionality, not just initialization
4. **Better Error Handling**: Graceful failure with detailed error messages
5. **Performance Monitoring**: Timing and memory usage tracking
6. **Security**: Proper capability checks and nonce verification
7. **Maintainability**: Clean, well-documented code structure

## Usage Instructions

1. Navigate to `wp-admin/plugins.php?page=sbi-new-self-tests`
2. Click "Run All Tests" to execute the complete test suite
3. Review results for any failed tests
4. Use the detailed error messages to troubleshoot issues
5. Monitor execution times to identify performance bottlenecks

## Future Enhancements

- Add automated test scheduling
- Include performance benchmarking
- Add test result history tracking
- Implement email notifications for critical failures
- Add integration with WordPress Site Health system

## Migration Notes

- The old self-test page remains available for comparison
- Both pages are registered in the WordPress admin menu
- The new page is marked as primary (button-primary styling)
- No data migration required - tests are executed fresh each time
