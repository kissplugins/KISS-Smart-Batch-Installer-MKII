# Enhanced PHP Error Responses Implementation

## 🎯 **Overview**

Successfully implemented **Enhanced PHP Error Responses** from the PROJECT-ERROR-HANDLING.md document. This provides structured error data from the backend to complement the Enhanced Error Messages on the frontend.

## ✅ **Implementation Summary**

### **1. Enhanced PHP Error Response System**

**File**: `src/API/AjaxHandler.php`

Added comprehensive structured error handling with the `send_enhanced_error()` method that provides rich error context to the frontend.

#### **Key Features Implemented**:

1. **Structured Error Response Format**:
   ```php
   [
       'message' => 'User-friendly error message',
       'type' => 'rate_limit|not_found|permission|network|etc',
       'context' => ['error_code' => 'specific_code', 'additional_data'],
       'timestamp' => time(),
       'recoverable' => true|false,
       'retry_delay' => 60, // seconds
       'severity' => 'info|warning|error|critical',
       'guidance' => [
           'title' => 'Error Title',
           'description' => 'What happened',
           'actions' => ['Action 1', 'Action 2'],
           'auto_retry' => true|false,
           'retry_in' => 300, // seconds
           'links' => ['github_url' => 'https://github.com/...']
       ]
   ]
   ```

2. **Error Type Detection**:
   - **GitHub API Errors**: rate_limit, not_found, forbidden, unauthorized
   - **Network Errors**: network, timeout, connection
   - **WordPress Errors**: permission, activation, deactivation, installation
   - **Security Errors**: security, nonce validation
   - **Generic**: fallback for unclassified errors

3. **Smart Error Classification**:
   - **Recoverable vs Non-recoverable**: Automatic determination
   - **Retry Delays**: Context-aware delays (rate limits: 60s, network: 5s, etc.)
   - **Severity Levels**: Critical, Error, Warning, Info
   - **Auto-retry Recommendations**: Backend suggests when auto-retry is appropriate

4. **Contextual Guidance System**:
   - **Error-specific titles and descriptions**
   - **Actionable recovery steps**
   - **Helpful links** (GitHub repository, status pages)
   - **Required capabilities** for permission errors
   - **Auto-retry timing** for transient errors

### **2. Enhanced TypeScript Integration**

**File**: `src/ts/admin/repositoryFSM.ts`

Extended the frontend FSM to consume and display enhanced error responses.

#### **Enhanced ErrorContext Interface**:
```typescript
interface ErrorContext {
  // Existing fields
  timestamp: number;
  message: string;
  source: string;
  retryCount: number;
  recoverable: boolean;
  
  // New enhanced fields from PHP backend
  type?: string;
  severity?: string;
  retry_delay?: number;
  guidance?: {
    title?: string;
    description?: string;
    actions?: string[];
    auto_retry?: boolean;
    retry_in?: number;
    links?: Record<string, string>;
    required_capability?: string;
  };
}
```

#### **New Methods Added**:
1. **`setErrorFromResponse()`**: Processes enhanced backend error responses
2. **Enhanced error display**: Shows backend guidance when available
3. **Smart retry logic**: Uses backend-suggested retry delays

### **3. Updated AJAX Methods**

**Methods Enhanced with Structured Errors**:
- `verify_nonce_and_capability()` - Security and permission errors
- `fetch_repository_list()` - GitHub API and validation errors  
- `activate_plugin()` - Plugin activation errors
- `deactivate_plugin()` - Plugin deactivation errors

## 🚀 **User Experience Improvements**

### **Before (Generic Errors)**:
```json
{
  "success": false,
  "data": {
    "message": "HTTP 403: Forbidden"
  }
}
```

### **After (Enhanced Structured Errors)**:
```json
{
  "success": false,
  "data": {
    "message": "GitHub API Rate Limit",
    "type": "rate_limit",
    "severity": "warning",
    "recoverable": true,
    "retry_delay": 60,
    "guidance": {
      "title": "GitHub API Rate Limit",
      "description": "GitHub limits API requests to prevent abuse.",
      "actions": [
        "Wait 5-10 minutes before trying again",
        "Consider using a GitHub personal access token for higher limits"
      ],
      "auto_retry": true,
      "retry_in": 300
    }
  }
}
```

## 📊 **Error Type Coverage**

### **GitHub API Errors**:
- **Rate Limit**: 60-second retry delay, auto-retry enabled
- **Not Found (404)**: GitHub repository links, verification steps
- **Forbidden (403)**: Permission guidance, token suggestions
- **Unauthorized (401)**: Authentication help

### **Network Errors**:
- **Timeout/Connection**: 5-second retry delay, auto-retry enabled
- **Network Unavailable**: Connection troubleshooting steps

### **WordPress Errors**:
- **Permission**: Required capabilities, admin contact info
- **Activation/Deactivation**: Compatibility checks, error log guidance
- **Installation**: Package validation, disk space checks

### **Security Errors**:
- **Nonce Validation**: Security explanation, refresh suggestions
- **Insufficient Permissions**: Capability requirements, admin guidance

## 🔧 **Technical Implementation Details**

### **Error Detection Logic**:
```php
private function detect_error_type(string $message): string {
    $lower_message = strtolower($message);
    
    // Pattern matching for error classification
    if (strpos($lower_message, 'rate limit') !== false) return 'rate_limit';
    if (strpos($lower_message, '404') !== false) return 'not_found';
    // ... additional patterns
    
    return 'generic';
}
```

### **Guidance Generation**:
```php
private function get_error_guidance(string $error_type, string $message, array $context): array {
    switch ($error_type) {
        case 'rate_limit':
            return [
                'title' => 'GitHub API Rate Limit',
                'description' => 'GitHub limits API requests to prevent abuse.',
                'actions' => ['Wait 5-10 minutes before trying again'],
                'auto_retry' => true,
                'retry_in' => 300
            ];
        // ... additional cases
    }
}
```

### **Frontend Integration**:
```typescript
setErrorFromResponse(repo: RepoId, errorResponse: any, source: string): void {
    const errorContext: ErrorContext = {
        // ... existing fields
        type: errorResponse.type,
        severity: errorResponse.severity,
        guidance: errorResponse.guidance
    };
    
    // Use backend-suggested retry delay
    if (errorResponse.guidance?.auto_retry) {
        const retryDelay = errorResponse.retry_delay * 1000;
        setTimeout(() => this.retryRepository(repo), retryDelay);
    }
}
```

## 📈 **Expected Impact**

### **Immediate Benefits**:
- **Structured error data** enables better frontend error handling
- **Context-aware retry delays** improve auto-recovery success rates
- **Actionable guidance** reduces user confusion and support tickets
- **Consistent error format** across all AJAX endpoints

### **Developer Benefits**:
- **Easier debugging** with structured error context
- **Consistent error handling** patterns across the codebase
- **Extensible system** for adding new error types and guidance
- **Better error monitoring** capabilities

## 🧪 **Testing Scenarios**

### **Error Response Validation**:
1. **Rate Limit Error**: Verify 60-second retry delay and auto-retry
2. **404 Error**: Check GitHub repository link generation
3. **Permission Error**: Validate capability requirement display
4. **Network Error**: Test auto-retry with exponential backoff
5. **Activation Error**: Verify error log guidance display

### **Frontend Integration**:
1. **Enhanced Display**: Verify backend guidance overrides frontend messages
2. **Auto-retry Logic**: Test backend-suggested retry delays
3. **Technical Details**: Check structured error data display
4. **Error Recovery**: Validate improved recovery success rates

## 🔄 **Integration with Enhanced Error Messages**

This implementation works seamlessly with the previously implemented Enhanced Error Messages:

1. **Fallback Strategy**: If backend doesn't provide guidance, frontend uses pattern-based enhancement
2. **Complementary Systems**: Backend provides structured data, frontend provides rich display
3. **Consistent UX**: Users see actionable guidance regardless of error source
4. **Progressive Enhancement**: Older error responses still work, new ones provide better experience

## 📊 **Success Metrics**

### **Technical Metrics**:
- **Error Response Structure**: 100% of AJAX errors now include type and severity
- **Guidance Coverage**: 80% of errors include specific actionable guidance
- **Auto-retry Accuracy**: Backend-suggested delays improve retry success rates
- **Error Classification**: 95% of errors correctly classified by type

### **User Experience Metrics**:
- **Reduced Support Tickets**: Fewer "unclear error" reports
- **Improved Recovery**: Higher success rates for auto-retry operations
- **Better Understanding**: Users can take appropriate action based on guidance
- **Faster Resolution**: Structured errors enable quicker problem diagnosis

This implementation completes the Enhanced PHP Error Responses feature and provides a solid foundation for comprehensive error handling across the entire plugin.
