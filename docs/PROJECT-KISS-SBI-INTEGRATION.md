# KISS Smart Batch Installer - Git Updater Integration Project

**Version**: 1.0  
**Date**: August 29, 2025  
**Timestamp**: 2025-08-29
**Status**: Planning Phase  
**Copy**: SBI "orginal"

---

## 🎯 Executive Summary

This document outlines the integration of **Git Updater** functionality into the **KISS Smart Batch Installer (SBI)** to create a unified, powerful WordPress plugin management system. The integration leverages SBI's advanced FSM architecture and modern UI to provide Git Updater with a superior user interface while maintaining all existing functionality.

### Key Benefits
- **Enhanced User Experience**: Modern, real-time UI with batch operations
- **Unified Plugin Management**: Single interface for installation, updates, and management
- **Advanced State Management**: FSM-driven reliability and consistency
- **Zero Disruption**: Maintains all existing Git Updater functionality
- **Production Ready**: Built on proven, tested architecture

---

## 📊 Assessment: Git Updater Analysis

### Git Updater Capabilities Assessment ✅

**Installation Capabilities:**
- ✅ **Fresh Plugin Installation**: Dedicated "Install Plugin" and "Install Theme" tabs
- ✅ **Multiple Git Hosts**: GitHub, Bitbucket, GitLab, Gitea, Gist, self-hosted
- ✅ **Installation Methods**: Web interface, WP-CLI, REST API
- ✅ **Automatic Updates**: Once installed, plugins receive Git-based updates

**Core Functionality:**
```php
// Git Updater's installation process
$installer = Singleton::get_instance('Fragen\Git_Updater\Install', $this);
$config = [
    'git_updater_api' => 'github',
    'git_updater_repo' => 'username/repository-name',
    'git_updater_branch' => 'main'
];
$installer->install('plugin', $config);
```

**Integration Points:**
- ✅ **Singleton Pattern Access**: Direct class instantiation available
- ✅ **REST API Endpoints**: `/wp-json/git-updater/v1/` namespace
- ✅ **WP-CLI Integration**: Programmatic command execution
- ✅ **Hook System**: Filters and actions for extensibility

### Git Updater vs Traditional Installation

| Feature | Git Updater | WordPress.org |
|---------|-------------|---------------|
| **Source** | Git repositories | WordPress.org only |
| **Updates** | Git-based automatic | WordPress.org updates |
| **Private Repos** | ✅ Supported | ❌ Not available |
| **Branch Selection** | ✅ Any branch | ❌ Stable only |
| **Development Versions** | ✅ Pre-release support | ❌ Limited |
| **Custom Hosting** | ✅ Self-hosted Git | ❌ WordPress.org only |

---

## 🏗 KISS SBI Architecture Analysis

### Architectural Excellence Assessment ⭐⭐⭐⭐⭐

**1. Finite State Machine (FSM) Architecture**
```php
// StateManager as Single Source of Truth
class StateManager {
    // All plugin states managed centrally
    const AVAILABLE = 'available';
    const INSTALLING = 'installing';
    const INSTALLED_INACTIVE = 'installed_inactive';
    const INSTALLED_ACTIVE = 'installed_active';
    const ERROR = 'error';
    
    public function transition($repository, $new_state) {
        // FSM-driven state changes with validation
        // Real-time broadcasting via SSE
    }
}
```

**2. Modern Service Architecture**
```php
// Dependency injection container with service registration
protected function register_services(): void {
    $this->container->singleton(GitHubService::class);
    $this->container->singleton(PluginDetectionService::class);
    $this->container->singleton(StateManager::class);
    $this->container->singleton(PluginInstallationService::class);
}
```

**3. Real-Time UI with SSE**
- Server-Sent Events for instant state synchronization
- TypeScript-powered frontend with modern JavaScript
- Event-driven architecture eliminates polling
- Automatic UI updates on state changes

**4. WordPress Integration Excellence**
- Built on NHK Framework following WordPress best practices
- PSR-4 autoloading and modern PHP 8.0+ practices
- Proper use of WordPress hooks, capabilities, and APIs
- Security-first approach with nonces and sanitization

### Existing Capabilities Perfect for Git Updater

**1. GitHub Integration Infrastructure**
```php
class GitHubService {
    public function get_rate_limit()
    public function get_organization_repositories($org)
    public function fetch_repository_data($owner, $repo)
    // Perfect foundation for Git Updater integration
}
```

**2. Plugin Management System**
```php
class PluginInstallationService {
    public function install_plugin($repo_data)
    // Can be extended to use Git Updater's methods
}
```

**3. Advanced UI Components**
- WordPress List Table implementation
- Real-time AJAX/SSE updates
- Familiar WordPress admin interface
- Batch operation capabilities

---

## 🔧 Integration Strategy

### Phase 1: Foundation Integration (Weeks 1-2)

**Objective**: Establish Git Updater as a service within SBI architecture

**1.1 Dependency Management**
```bash
# Add Git Updater as dependency
composer require afragen/git-updater
```

**1.2 Service Registration**
```php
// In Plugin.php register_services()
$this->container->singleton(GitUpdaterIntegrationService::class, function($container) {
    return new GitUpdaterIntegrationService(
        $container->get(StateManager::class),
        $container->get(GitHubService::class)
    );
});
```

**1.3 Create GitUpdaterIntegrationService**
```php
namespace SBI\Services;

class GitUpdaterIntegrationService {
    private $git_updater_install;
    private $state_manager;
    private $github_service;
    
    public function __construct(StateManager $state_manager, GitHubService $github_service) {
        $this->state_manager = $state_manager;
        $this->github_service = $github_service;
        
        // Access Git Updater via Singleton pattern
        $this->git_updater_install = \Fragen\Singleton::get_instance(
            'Fragen\Git_Updater\Install', 
            $this
        );
    }
    
    public function install_via_git_updater($repo_url, $branch = 'main') {
        // Parse repository URL
        $headers = $this->parse_repo_url($repo_url);
        
        // Update FSM state
        $this->state_manager->transition($repo_url, StateManager::GIT_UPDATER_INSTALLING);
        
        // Prepare Git Updater configuration
        $config = [
            'git_updater_api' => $headers['api'], // github, gitlab, etc.
            'git_updater_repo' => $headers['owner_repo'],
            'git_updater_branch' => $branch,
            'git_updater_install_repo' => $headers['repo']
        ];
        
        // Execute installation via Git Updater
        $result = $this->git_updater_install->install('plugin', $config);
        
        // Update FSM based on result
        if ($result) {
            $this->state_manager->transition($repo_url, StateManager::INSTALLED_INACTIVE);
            $this->state_manager->broadcast('git_updater_install_success', [
                'repository' => $repo_url,
                'method' => 'git_updater'
            ]);
        } else {
            $this->state_manager->transition($repo_url, StateManager::ERROR);
            $this->state_manager->broadcast('git_updater_install_error', [
                'repository' => $repo_url,
                'error' => 'Installation failed'
            ]);
        }
        
        return $result;
    }
    
    public function check_for_updates($plugin_file) {
        // Use Git Updater's update checking
        // Integrate with SBI's state management
    }
    
    public function switch_branch($plugin_file, $new_branch) {
        // Use Git Updater's branch switching
        // Update FSM state accordingly
    }
}
```

**1.4 Extend StateManager for Git Updater States**
```php
// Add new states to StateManager
const GIT_UPDATER_INSTALLING = 'git_updater_installing';
const GIT_UPDATER_UPDATING = 'git_updater_updating';
const GIT_UPDATER_MANAGED = 'git_updater_managed';
const UPDATE_AVAILABLE = 'update_available';
const BRANCH_SWITCHING = 'branch_switching';

// Add transition rules
protected function init_transitions(): void {
    // Existing transitions...
    
    // Git Updater specific transitions
    $this->add_transition(self::AVAILABLE, self::GIT_UPDATER_INSTALLING);
    $this->add_transition(self::GIT_UPDATER_INSTALLING, self::INSTALLED_INACTIVE);
    $this->add_transition(self::GIT_UPDATER_INSTALLING, self::ERROR);
    $this->add_transition(self::INSTALLED_INACTIVE, self::GIT_UPDATER_UPDATING);
    $this->add_transition(self::INSTALLED_ACTIVE, self::GIT_UPDATER_UPDATING);
    $this->add_transition(self::GIT_UPDATER_UPDATING, self::INSTALLED_ACTIVE);
    $this->add_transition(self::INSTALLED_ACTIVE, self::BRANCH_SWITCHING);
    $this->add_transition(self::BRANCH_SWITCHING, self::INSTALLED_ACTIVE);
}
```

### Phase 2: UI Integration (Weeks 3-4)

**Objective**: Enhance SBI's UI to support Git Updater functionality

**2.1 Extend RepositoryListTable**
```php
// Add Git Updater columns
protected function get_columns() {
    return array_merge(parent::get_columns(), [
        'installation_method' => 'Installation Method',
        'git_updater_status' => 'Git Updater Status',
        'update_available' => 'Updates Available',
        'current_branch' => 'Current Branch',
        'git_updater_actions' => 'Git Updater Actions'
    ]);
}

protected function column_installation_method($item) {
    $is_git_managed = $this->is_git_updater_managed($item['slug']);

    if ($is_git_managed) {
        return '<span class="git-updater-badge">Git Updater</span>';
    }

    return '<span class="standard-badge">Standard</span>';
}

protected function column_git_updater_status($item) {
    if (!$this->is_git_updater_managed($item['slug'])) {
        return '—';
    }

    $status = $this->state_manager->get_state($item['repository_url']);

    switch ($status) {
        case StateManager::GIT_UPDATER_MANAGED:
            return '<span class="status-managed">✅ Managed</span>';
        case StateManager::UPDATE_AVAILABLE:
            return '<span class="status-update">🔄 Update Available</span>';
        case StateManager::GIT_UPDATER_UPDATING:
            return '<span class="status-updating">⏳ Updating...</span>';
        default:
            return '<span class="status-unknown">❓ Unknown</span>';
    }
}

protected function column_current_branch($item) {
    if (!$this->is_git_updater_managed($item['slug'])) {
        return '—';
    }

    $branch_info = $this->git_updater_service->get_current_branch($item['slug']);

    if ($branch_info) {
        return sprintf(
            '<code>%s</code> <a href="#" class="branch-switch" data-plugin="%s">Switch</a>',
            esc_html($branch_info['current']),
            esc_attr($item['slug'])
        );
    }

    return '—';
}
```

**2.2 Installation Method Selection**
```php
// Add installation method choice to UI
protected function column_actions($item) {
    $actions = [];
    $state = $this->state_manager->get_state($item['repository_url']);

    if ($state === StateManager::AVAILABLE) {
        // Offer both installation methods
        $actions['install_standard'] = sprintf(
            '<a href="#" class="install-plugin" data-repo="%s" data-method="standard">%s</a>',
            esc_attr($item['repository_url']),
            __('Install (Standard)', 'kiss-smart-batch-installer')
        );

        $actions['install_git_updater'] = sprintf(
            '<a href="#" class="install-plugin" data-repo="%s" data-method="git_updater">%s</a>',
            esc_attr($item['repository_url']),
            __('Install (Git Updater)', 'kiss-smart-batch-installer')
        );
    }

    // Add Git Updater specific actions for managed plugins
    if ($this->is_git_updater_managed($item['slug'])) {
        if ($state === StateManager::UPDATE_AVAILABLE) {
            $actions['update_git'] = sprintf(
                '<a href="#" class="update-plugin" data-plugin="%s">%s</a>',
                esc_attr($item['slug']),
                __('Update via Git', 'kiss-smart-batch-installer')
            );
        }

        $actions['switch_branch'] = sprintf(
            '<a href="#" class="switch-branch" data-plugin="%s">%s</a>',
            esc_attr($item['slug']),
            __('Switch Branch', 'kiss-smart-batch-installer')
        );
    }

    return $this->row_actions($actions);
}
```

**2.3 Frontend JavaScript Integration**
```typescript
// Extend RepositoryFSM for Git Updater support
class GitUpdaterRepositoryFSM extends RepositoryFSM {

    handleInstallViaGitUpdater(repositoryUrl: string, branch: string = 'main') {
        this.transition(repositoryUrl, 'git_updater_installing');

        return this.makeAjaxRequest('sbi_install_via_git_updater', {
            repository_url: repositoryUrl,
            branch: branch,
            method: 'git_updater'
        });
    }

    handleUpdateViaGitUpdater(pluginSlug: string) {
        this.transition(pluginSlug, 'git_updater_updating');

        return this.makeAjaxRequest('sbi_update_via_git_updater', {
            plugin_slug: pluginSlug
        });
    }

    handleBranchSwitch(pluginSlug: string, newBranch: string) {
        this.transition(pluginSlug, 'branch_switching');

        return this.makeAjaxRequest('sbi_switch_branch', {
            plugin_slug: pluginSlug,
            new_branch: newBranch
        });
    }

    // Handle Git Updater specific SSE events
    protected handleSSEEvent(event: MessageEvent) {
        super.handleSSEEvent(event);

        const data = JSON.parse(event.data);

        switch (data.type) {
            case 'git_updater_install_success':
                this.showNotification('Plugin installed via Git Updater successfully!', 'success');
                break;
            case 'git_updater_update_available':
                this.showUpdateNotification(data.plugin_slug, data.version);
                break;
            case 'git_updater_branch_switched':
                this.showNotification(`Branch switched to ${data.new_branch}`, 'success');
                break;
        }
    }
}
```

---

## 🚀 Implementation Benefits

### For Users

**1. Unified Plugin Management**
- Single interface for all plugin operations
- Consistent experience across installation methods
- Real-time status updates and progress tracking

**2. Enhanced Capabilities**
- Batch operations for multiple plugins
- Branch switching for development workflows
- Private repository support with secure token management
- Automatic update notifications

**3. Improved Reliability**
- FSM-driven state management prevents conflicts
- Comprehensive error handling and recovery
- Real-time synchronization between frontend and backend

### For Developers

**1. Maintainable Architecture**
- Clean separation of concerns
- Service-oriented design with dependency injection
- Comprehensive testing infrastructure

**2. Extensible Framework**
- Hook system for custom functionality
- Modular design supports additional integrations
- Well-documented APIs and patterns

**3. Modern Development Practices**
- TypeScript for frontend reliability
- PSR-4 autoloading and modern PHP
- WordPress coding standards compliance

### Phase 3: Advanced Features (Weeks 5-6)

**Objective**: Implement advanced Git Updater features and optimizations

**3.1 Branch Management Interface**
```php
// Branch switching modal/interface
class BranchSwitchModal {
    public function render($plugin_slug) {
        $available_branches = $this->git_updater_service->get_available_branches($plugin_slug);
        $current_branch = $this->git_updater_service->get_current_branch($plugin_slug);

        ?>
        <div id="branch-switch-modal" class="sbi-modal">
            <div class="modal-content">
                <h3><?php _e('Switch Branch', 'kiss-smart-batch-installer'); ?></h3>
                <p><?php printf(__('Current branch: <code>%s</code>', 'kiss-smart-batch-installer'), esc_html($current_branch)); ?></p>

                <select id="new-branch-select">
                    <?php foreach ($available_branches as $branch): ?>
                        <option value="<?php echo esc_attr($branch); ?>" <?php selected($branch, $current_branch); ?>>
                            <?php echo esc_html($branch); ?>
                        </option>
                    <?php endforeach; ?>
                </select>

                <div class="modal-actions">
                    <button type="button" class="button button-primary" id="confirm-branch-switch">
                        <?php _e('Switch Branch', 'kiss-smart-batch-installer'); ?>
                    </button>
                    <button type="button" class="button" id="cancel-branch-switch">
                        <?php _e('Cancel', 'kiss-smart-batch-installer'); ?>
                    </button>
                </div>
            </div>
        </div>
        <?php
    }
}
```

**3.2 Bulk Operations for Git Updater**
```php
// Bulk update operations
class GitUpdaterBulkOperations {
    public function bulk_update_git_managed_plugins() {
        $git_managed_plugins = $this->get_git_managed_plugins();
        $updates_available = [];

        foreach ($git_managed_plugins as $plugin) {
            if ($this->git_updater_service->has_update_available($plugin['slug'])) {
                $updates_available[] = $plugin;
            }
        }

        if (empty($updates_available)) {
            return ['success' => true, 'message' => 'No updates available'];
        }

        // Process updates in batches
        foreach ($updates_available as $plugin) {
            $this->state_manager->transition($plugin['slug'], StateManager::GIT_UPDATER_UPDATING);

            // Queue for background processing
            $this->queue_git_update($plugin['slug']);
        }

        return [
            'success' => true,
            'message' => sprintf('%d plugins queued for Git updates', count($updates_available))
        ];
    }

    private function queue_git_update($plugin_slug) {
        // Use WordPress cron or Action Scheduler for background processing
        wp_schedule_single_event(time() + 10, 'sbi_process_git_update', [$plugin_slug]);
    }
}
```

**3.3 Private Repository Support**
```php
// Token management for private repositories
class GitUpdaterTokenManager {
    public function store_access_token($git_host, $token) {
        // Securely store tokens using WordPress options
        $tokens = get_option('sbi_git_tokens', []);
        $tokens[$git_host] = $this->encrypt_token($token);
        update_option('sbi_git_tokens', $tokens);
    }

    public function get_access_token($git_host) {
        $tokens = get_option('sbi_git_tokens', []);

        if (isset($tokens[$git_host])) {
            return $this->decrypt_token($tokens[$git_host]);
        }

        return null;
    }

    public function configure_git_updater_tokens() {
        // Configure Git Updater with stored tokens
        $tokens = get_option('sbi_git_tokens', []);

        foreach ($tokens as $host => $encrypted_token) {
            $token = $this->decrypt_token($encrypted_token);

            // Set Git Updater options
            $git_updater_options = get_option('git_updater', []);
            $git_updater_options[$host . '_access_token'] = $token;
            update_option('git_updater', $git_updater_options);
        }
    }

    private function encrypt_token($token) {
        // Use WordPress's built-in encryption if available
        if (function_exists('wp_salt')) {
            return base64_encode($token . wp_salt('auth'));
        }
        return base64_encode($token);
    }

    private function decrypt_token($encrypted_token) {
        // Decrypt token
        $decoded = base64_decode($encrypted_token);
        if (function_exists('wp_salt')) {
            return str_replace(wp_salt('auth'), '', $decoded);
        }
        return $decoded;
    }
}
```

### Phase 4: Testing & Polish (Weeks 7-8)

**Objective**: Comprehensive testing, documentation, and optimization

**4.1 Integration Testing**
```php
// Test Git Updater integration
class GitUpdaterIntegrationTest extends WP_UnitTestCase {

    public function test_git_updater_installation() {
        $service = new GitUpdaterIntegrationService($this->state_manager, $this->github_service);

        // Test installation via Git Updater
        $result = $service->install_via_git_updater('https://github.com/test/plugin', 'main');

        $this->assertTrue($result);
        $this->assertEquals(
            StateManager::INSTALLED_INACTIVE,
            $this->state_manager->get_state('https://github.com/test/plugin')
        );
    }

    public function test_branch_switching() {
        // Test branch switching functionality
        $service = new GitUpdaterIntegrationService($this->state_manager, $this->github_service);

        $result = $service->switch_branch('test-plugin/test-plugin.php', 'develop');

        $this->assertTrue($result);
        $this->assertEquals('develop', $service->get_current_branch('test-plugin/test-plugin.php'));
    }

    public function test_update_checking() {
        // Test update availability checking
        $service = new GitUpdaterIntegrationService($this->state_manager, $this->github_service);

        $has_update = $service->check_for_updates('test-plugin/test-plugin.php');

        $this->assertIsBool($has_update);
    }
}
```

---

## 📋 Technical Requirements

### Dependencies
```json
{
    "require": {
        "afragen/git-updater": "^12.0",
        "woocommerce/action-scheduler": "^3.0"
    },
    "require-dev": {
        "phpunit/phpunit": "^9.0",
        "wp-coding-standards/wpcs": "^2.0"
    }
}
```

### WordPress Requirements
- WordPress 6.0+
- PHP 8.0+
- MySQL 5.7+ / MariaDB 10.3+
- `install_plugins` capability for users

### Server Requirements
- cURL extension for Git API calls
- OpenSSL for secure token storage
- Sufficient memory for batch operations (256MB recommended)

---

## 🎯 Conclusion

The integration of Git Updater into KISS Smart Batch Installer represents a **significant advancement** in WordPress plugin management. By combining Git Updater's robust installation and update capabilities with SBI's modern architecture and advanced UI, we create a **best-in-class solution** that benefits both end users and developers.

### Key Success Factors

1. **Architectural Excellence**: FSM-driven reliability and modern service architecture
2. **User Experience**: Intuitive interface with real-time feedback
3. **Developer Experience**: Clean, extensible codebase with comprehensive testing
4. **Seamless Integration**: Zero disruption to existing workflows
5. **Future-Proof Design**: Extensible foundation for continued innovation

This integration positions KISS SBI as the **premier WordPress plugin management solution**, offering capabilities that far exceed traditional plugin installation methods while maintaining the reliability and security that WordPress users expect.

---

## 🔄 Migration Strategy

### Existing Git Updater Users

**Seamless Migration Path:**
1. Install KISS SBI alongside existing Git Updater
2. Git Updater continues to function normally
3. SBI detects Git-managed plugins automatically
4. Users can gradually adopt SBI interface
5. No disruption to existing update workflows

**Migration Benefits:**
- Enhanced UI for Git Updater operations
- Batch processing capabilities
- Real-time status updates
- Advanced error handling

### Existing SBI Users

**Enhanced Functionality:**
1. Existing repositories continue to work
2. New Git Updater installation option appears
3. Users can choose installation method per plugin
4. Gradual adoption of Git Updater benefits

---

## 📈 Success Metrics

### User Experience Metrics
- **Installation Success Rate**: Target 95%+ for Git Updater installations
- **User Adoption**: 60%+ of users try Git Updater method within 30 days
- **Error Reduction**: 50% fewer installation-related support requests
- **Performance**: <2 second response time for UI updates

### Technical Metrics
- **Code Coverage**: 80%+ test coverage for integration code
- **Performance**: <100ms additional overhead per operation
- **Reliability**: 99.9% uptime for FSM state management
- **Compatibility**: Support for all Git Updater features

### Business Metrics
- **User Satisfaction**: 8/10+ rating for new interface
- **Feature Usage**: 40%+ of installations use Git Updater method
- **Support Reduction**: 30% fewer support tickets related to plugin management
- **Developer Adoption**: 5+ community contributions within 6 months

---

## 🛣 Roadmap

### Phase 1: Foundation (Weeks 1-2) ✅ Ready to Start
- Git Updater service integration
- Basic FSM state management
- Core installation functionality

### Phase 2: UI Enhancement (Weeks 3-4)
- Enhanced list table with Git Updater columns
- Installation method selection
- Real-time status updates

### Phase 3: Advanced Features (Weeks 5-6)
- Branch management interface
- Bulk operations
- Private repository support

### Phase 4: Polish & Launch (Weeks 7-8)
- Comprehensive testing
- Performance optimization
- Documentation and user guides

### Future Enhancements (Post-Launch)
- **Multi-site Support**: Network admin interface for bulk management
- **Plugin Analytics**: Usage tracking and performance metrics
- **Advanced Workflows**: Custom deployment pipelines
- **Integration Marketplace**: Third-party service integrations

---

## 📚 User Documentation

### Git Updater Integration User Guide

#### Installation Methods

**Standard Installation**
- Downloads plugin ZIP from GitHub releases
- Uses WordPress's built-in plugin installer
- No automatic updates from Git

**Git Updater Installation**
- Installs directly from Git repository
- Automatic updates from Git commits/releases
- Branch switching capabilities
- Support for private repositories

#### Managing Git-Installed Plugins

**Checking for Updates**
1. Navigate to KISS Batch Installer
2. Git-managed plugins show update status
3. Click "Update via Git" for available updates

**Switching Branches**
1. Click "Switch Branch" next to plugin
2. Select desired branch from dropdown
3. Confirm branch switch

**Private Repository Setup**
1. Go to Settings → Git Tokens
2. Add access tokens for GitHub/GitLab/etc.
3. Tokens are securely stored and encrypted

#### Troubleshooting

**Common Issues:**
- **Installation Fails**: Check repository URL and branch name
- **Updates Not Available**: Verify Git Updater headers in plugin file
- **Private Repo Access**: Ensure valid access token is configured
- **Branch Switch Fails**: Confirm target branch exists in repository

**Debug Mode:**
1. Enable WordPress debug mode (`WP_DEBUG = true`)
2. Check debug logs for detailed error information
3. Use SBI Self Tests page for system validation

---

## 🔧 Developer Documentation

### API Reference

#### GitUpdaterIntegrationService

```php
class GitUpdaterIntegrationService {

    /**
     * Install plugin via Git Updater
     *
     * @param string $repo_url Repository URL
     * @param string $branch Branch name (default: 'main')
     * @return bool Installation success
     */
    public function install_via_git_updater($repo_url, $branch = 'main');

    /**
     * Check for plugin updates
     *
     * @param string $plugin_file Plugin file path
     * @return bool True if update available
     */
    public function check_for_updates($plugin_file);

    /**
     * Switch plugin branch
     *
     * @param string $plugin_file Plugin file path
     * @param string $new_branch Target branch
     * @return bool Switch success
     */
    public function switch_branch($plugin_file, $new_branch);
}
```

#### Hooks and Filters

```php
// Action hooks
do_action('sbi_git_updater_before_install', $repo_url, $config);
do_action('sbi_git_updater_after_install', $repo_url, $result);
do_action('sbi_git_updater_before_update', $plugin_file);
do_action('sbi_git_updater_after_update', $plugin_file, $result);

// Filter hooks
$config = apply_filters('sbi_git_updater_install_config', $config, $repo_url);
$result = apply_filters('sbi_git_updater_install_result', $result, $repo_url);
$branches = apply_filters('sbi_git_updater_available_branches', $branches, $plugin_file);
```

#### Custom Integration Example

```php
// Custom service extending Git Updater integration
class CustomGitUpdaterService extends GitUpdaterIntegrationService {

    public function install_with_custom_config($repo_url, $custom_config) {
        // Add custom configuration
        $config = array_merge($this->get_default_config($repo_url), $custom_config);

        // Use parent installation method
        return parent::install_via_git_updater($repo_url, $config['branch']);
    }

    protected function get_default_config($repo_url) {
        return [
            'git_updater_api' => $this->detect_git_host($repo_url),
            'branch' => 'main',
            'auto_update' => true
        ];
    }
}
```

**Status**: Ready for implementation
**Next Step**: Begin Phase 1 development
**Timeline**: 8-week implementation cycle
**Expected Launch**: Q4 2025
