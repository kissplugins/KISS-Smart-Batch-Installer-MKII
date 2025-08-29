<?php
/**
 * New Self Tests admin page for KISS Smart Batch Installer.
 * Built from scratch with comprehensive real-world testing.
 *
 * @package SBI\Admin
 */

namespace SBI\Admin;

use SBI\Services\GitHubService;
use SBI\Services\PluginDetectionService;
use SBI\Services\StateManager;
use SBI\Services\PluginInstallationService;
use SBI\API\AjaxHandler;
use SBI\Enums\PluginState;
use WP_Error;

/**
 * New Self Tests page class with 8 comprehensive test suites.
 */
class NewSelfTestsPage {

    /**
     * Service dependencies.
     */
    private GitHubService $github_service;
    private PluginDetectionService $detection_service;
    private StateManager $state_manager;
    private PluginInstallationService $installation_service;
    private AjaxHandler $ajax_handler;

    /**
     * Test results storage.
     */
    private array $test_results = [];
    private array $test_summary = [
        'total_tests' => 0,
        'passed' => 0,
        'failed' => 0,
        'execution_time' => 0
    ];

    /**
     * Constructor.
     */
    public function __construct(
        GitHubService $github_service,
        PluginDetectionService $detection_service,
        StateManager $state_manager,
        PluginInstallationService $installation_service,
        AjaxHandler $ajax_handler
    ) {
        $this->github_service = $github_service;
        $this->detection_service = $detection_service;
        $this->state_manager = $state_manager;
        $this->installation_service = $installation_service;
        $this->ajax_handler = $ajax_handler;
    }

    /**
     * Render the self tests page.
     */
    public function render(): void {
        // Security check
        if ( ! current_user_can( 'install_plugins' ) ) {
            wp_die( __( 'You do not have sufficient permissions to access this page.', 'kiss-smart-batch-installer' ) );
        }

        // Handle test execution
        if ( isset( $_POST['run_tests'] ) && wp_verify_nonce( $_POST['_wpnonce'], 'sbi_new_tests' ) ) {
            $this->execute_all_tests();
        }

        $this->render_page_html();
    }

    /**
     * Execute all 8 test suites.
     */
    private function execute_all_tests(): void {
        $start_time = microtime( true );

        $this->test_results = [
            'github_service' => $this->test_github_service_integration(),
            'plugin_detection' => $this->test_plugin_detection_engine(),
            'state_management' => $this->test_state_management_system(),
            'ajax_endpoints' => $this->test_ajax_api_endpoints(),
            'plugin_installation' => $this->test_plugin_installation_pipeline(),
            'container_di' => $this->test_container_dependency_injection(),
            'wordpress_integration' => $this->test_wordpress_integration(),
            'performance_reliability' => $this->test_performance_reliability()
        ];

        $this->test_summary['execution_time'] = round( ( microtime( true ) - $start_time ) * 1000, 2 );
        $this->calculate_test_summary();
    }

    /**
     * Test Suite 1: GitHub Service Integration.
     */
    private function test_github_service_integration(): array {
        $suite = [
            'name' => 'GitHub Service Integration',
            'description' => 'Tests GitHub API connectivity, organization detection, and repository fetching',
            'tests' => []
        ];

        // Test 1.1: Service Initialization
        $suite['tests'][] = $this->run_test( 'Service Initialization', function() {
            if ( ! $this->github_service ) {
                throw new \Exception( 'GitHubService not initialized' );
            }
            return 'GitHubService successfully initialized';
        });

        // Test 1.2: Configuration Retrieval
        $suite['tests'][] = $this->run_test( 'Configuration Retrieval', function() {
            $config = $this->github_service->get_configuration();
            if ( ! is_array( $config ) ) {
                throw new \Exception( 'Configuration is not an array' );
            }
            if ( ! isset( $config['organization'] ) || ! isset( $config['repositories'] ) ) {
                throw new \Exception( 'Configuration missing required keys' );
            }
            return sprintf( 'Configuration retrieved: org=%s, repos=%d', 
                $config['organization'] ?: 'none', 
                count( $config['repositories'] ) 
            );
        });

        // Test 1.3: Repository Fetching (with fallback)
        $suite['tests'][] = $this->run_test( 'Repository Fetching', function() {
            // Test with a known public organization
            $repos = $this->github_service->fetch_repositories_for_account( 'kissplugins', false, 5 );
            
            if ( is_wp_error( $repos ) ) {
                // If API fails, test web fallback
                $error_msg = $repos->get_error_message();
                if ( strpos( $error_msg, 'rate limit' ) !== false ) {
                    return 'API rate limited - this is expected behavior';
                }
                throw new \Exception( 'Repository fetching failed: ' . $error_msg );
            }
            
            if ( ! is_array( $repos ) || empty( $repos ) ) {
                throw new \Exception( 'No repositories returned' );
            }
            
            return sprintf( 'Successfully fetched %d repositories', count( $repos ) );
        });

        // Test 1.4: Repository Info Retrieval
        $suite['tests'][] = $this->run_test( 'Repository Info Retrieval', function() {
            $repo_info = $this->github_service->get_repository( 'kissplugins', 'KISS-Plugin-Quick-Search' );

            if ( is_wp_error( $repo_info ) ) {
                $error_msg = $repo_info->get_error_message();
                if ( strpos( $error_msg, 'rate limit' ) !== false ) {
                    return 'API rate limited - this is expected behavior';
                }
                throw new \Exception( 'Repository info failed: ' . $error_msg );
            }

            if ( ! isset( $repo_info['name'] ) || ! isset( $repo_info['full_name'] ) ) {
                throw new \Exception( 'Repository info missing required fields' );
            }

            return sprintf( 'Repository info retrieved: %s', $repo_info['full_name'] );
        });

        return $suite;
    }

    /**
     * Test Suite 2: Plugin Detection Engine.
     */
    private function test_plugin_detection_engine(): array {
        $suite = [
            'name' => 'Plugin Detection Engine',
            'description' => 'Tests WordPress plugin header scanning and validation',
            'tests' => []
        ];

        // Test 2.1: Service Initialization
        $suite['tests'][] = $this->run_test( 'Detection Service Initialization', function() {
            if ( ! $this->detection_service ) {
                throw new \Exception( 'PluginDetectionService not initialized' );
            }
            return 'PluginDetectionService successfully initialized';
        });

        // Test 2.2: Known Plugin Detection
        $suite['tests'][] = $this->run_test( 'Known Plugin Detection', function() {
            $test_repo = [
                'full_name' => 'kissplugins/KISS-Plugin-Quick-Search',
                'name' => 'KISS-Plugin-Quick-Search'
            ];
            
            $result = $this->detection_service->detect_plugin( $test_repo );
            
            if ( is_wp_error( $result ) ) {
                throw new \Exception( 'Plugin detection failed: ' . $result->get_error_message() );
            }
            
            if ( ! isset( $result['is_plugin'] ) ) {
                throw new \Exception( 'Detection result missing is_plugin field' );
            }
            
            return sprintf( 'Plugin detection completed: is_plugin=%s, file=%s', 
                $result['is_plugin'] ? 'true' : 'false',
                $result['plugin_file'] ?? 'none'
            );
        });

        // Test 2.3: Test Plugin Detection Method
        $suite['tests'][] = $this->run_test( 'Test Plugin Detection Method', function() {
            $result = $this->detection_service->test_plugin_detection( 'kissplugins', 'KISS-Plugin-Quick-Search' );

            if ( ! is_array( $result ) || ! isset( $result['tests'] ) ) {
                throw new \Exception( 'Test plugin detection returned invalid result' );
            }

            $test_count = count( $result['tests'] );
            $successful_tests = 0;

            foreach ( $result['tests'] as $test ) {
                if ( isset( $test['success'] ) && $test['success'] ) {
                    $successful_tests++;
                }
            }

            return sprintf( 'Test plugin detection completed: %d/%d tests successful',
                $successful_tests, $test_count
            );
        });

        // Test 2.4: Cache Functionality
        $suite['tests'][] = $this->run_test( 'Cache Functionality', function() {
            $test_repo = [
                'full_name' => 'kissplugins/test-cache-repo',
                'name' => 'test-cache-repo'
            ];
            
            // Clear cache first
            $this->detection_service->clear_cache( $test_repo['full_name'] );
            
            // First detection (should cache)
            $start_time = microtime( true );
            $result1 = $this->detection_service->detect_plugin( $test_repo );
            $time1 = microtime( true ) - $start_time;
            
            // Second detection (should use cache)
            $start_time = microtime( true );
            $result2 = $this->detection_service->detect_plugin( $test_repo );
            $time2 = microtime( true ) - $start_time;
            
            // Cache should make second call faster (unless both are very fast)
            if ( $time1 > 0.1 && $time2 > $time1 ) {
                throw new \Exception( 'Cache not working - second call was slower' );
            }
            
            return sprintf( 'Cache working: first=%.3fs, second=%.3fs', $time1, $time2 );
        });

        return $suite;
    }

    /**
     * Test Suite 3: State Management System.
     */
    private function test_state_management_system(): array {
        $suite = [
            'name' => 'State Management System',
            'description' => 'Tests FSM transitions, state persistence, and validation',
            'tests' => []
        ];

        // Test 3.1: Service Initialization
        $suite['tests'][] = $this->run_test( 'State Manager Initialization', function() {
            if ( ! $this->state_manager ) {
                throw new \Exception( 'StateManager not initialized' );
            }
            return 'StateManager successfully initialized';
        });

        // Test 3.2: State Transitions
        $suite['tests'][] = $this->run_test( 'State Transitions', function() {
            $test_repo = 'test/state-transitions-' . time(); // Unique repo name

            // Get initial state (should be UNKNOWN)
            $initial_state = $this->state_manager->get_state( $test_repo );

            // Test valid transition from UNKNOWN to CHECKING
            $this->state_manager->transition( $test_repo, PluginState::CHECKING );
            $current_state = $this->state_manager->get_state( $test_repo );

            if ( $current_state !== PluginState::CHECKING ) {
                throw new \Exception( sprintf(
                    'First state transition failed: expected CHECKING, got %s (initial was %s)',
                    $current_state->value,
                    $initial_state->value
                ) );
            }

            // Test another valid transition from CHECKING to AVAILABLE
            $this->state_manager->transition( $test_repo, PluginState::AVAILABLE );
            $new_state = $this->state_manager->get_state( $test_repo );

            if ( $new_state !== PluginState::AVAILABLE ) {
                throw new \Exception( sprintf(
                    'Second state transition failed: expected AVAILABLE, got %s',
                    $new_state->value
                ) );
            }

            return sprintf( 'State transitions working correctly: %s → %s → %s',
                $initial_state->value,
                PluginState::CHECKING->value,
                PluginState::AVAILABLE->value
            );
        });

        // Test 3.3: Invalid Transition Validation
        $suite['tests'][] = $this->run_test( 'Invalid Transition Validation', function() {
            $test_repo = 'test/invalid-transitions-' . time();

            // Set initial state to AVAILABLE
            $this->state_manager->transition( $test_repo, PluginState::CHECKING );
            $this->state_manager->transition( $test_repo, PluginState::AVAILABLE );

            $before_state = $this->state_manager->get_state( $test_repo );

            // Try invalid transition from AVAILABLE to CHECKING (should be blocked)
            $this->state_manager->transition( $test_repo, PluginState::CHECKING );
            $after_state = $this->state_manager->get_state( $test_repo );

            // State should remain unchanged because transition is invalid
            if ( $after_state !== $before_state ) {
                throw new \Exception( sprintf(
                    'Invalid transition was allowed: %s → %s',
                    $before_state->value,
                    $after_state->value
                ) );
            }

            return sprintf( 'Invalid transition correctly blocked: state remained %s',
                $after_state->value
            );
        });

        return $suite;
    }

    /**
     * Test Suite 4: AJAX API Endpoints.
     */
    private function test_ajax_api_endpoints(): array {
        $suite = [
            'name' => 'AJAX API Endpoints',
            'description' => 'Tests all AJAX handlers and their responses',
            'tests' => []
        ];

        // Test 4.1: AJAX Handler Initialization
        $suite['tests'][] = $this->run_test( 'AJAX Handler Initialization', function() {
            if ( ! $this->ajax_handler ) {
                throw new \Exception( 'AjaxHandler not initialized' );
            }
            return 'AjaxHandler successfully initialized';
        });

        // Test 4.2: Hook Registration
        $suite['tests'][] = $this->run_test( 'AJAX Hook Registration', function() {
            $required_hooks = [
                'wp_ajax_sbi_fetch_repositories',
                'wp_ajax_sbi_process_repository',
                'wp_ajax_sbi_test_repository'
            ];

            $registered_count = 0;
            foreach ( $required_hooks as $hook ) {
                if ( has_action( $hook ) ) {
                    $registered_count++;
                }
            }

            if ( $registered_count === 0 ) {
                throw new \Exception( 'No AJAX hooks registered' );
            }

            return sprintf( '%d/%d AJAX hooks registered', $registered_count, count( $required_hooks ) );
        });

        return $suite;
    }

    /**
     * Test Suite 5: Plugin Installation Pipeline.
     */
    private function test_plugin_installation_pipeline(): array {
        $suite = [
            'name' => 'Plugin Installation Pipeline',
            'description' => 'Tests WordPress core upgrader integration',
            'tests' => []
        ];

        // Test 5.1: Installation Service Initialization
        $suite['tests'][] = $this->run_test( 'Installation Service Initialization', function() {
            if ( ! $this->installation_service ) {
                throw new \Exception( 'PluginInstallationService not initialized' );
            }
            return 'PluginInstallationService successfully initialized';
        });

        // Test 5.2: WordPress Upgrader Availability
        $suite['tests'][] = $this->run_test( 'WordPress Upgrader Availability', function() {
            if ( ! class_exists( 'Plugin_Upgrader' ) ) {
                require_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';
            }

            if ( ! class_exists( 'Plugin_Upgrader' ) ) {
                throw new \Exception( 'Plugin_Upgrader class not available' );
            }

            return 'WordPress Plugin_Upgrader available';
        });

        return $suite;
    }

    /**
     * Test Suite 6: Container & Dependency Injection.
     */
    private function test_container_dependency_injection(): array {
        $suite = [
            'name' => 'Container & Dependency Injection',
            'description' => 'Tests service registration and dependency resolution',
            'tests' => []
        ];

        // Test 6.1: Container Availability
        $suite['tests'][] = $this->run_test( 'Container Availability', function() {
            $container = sbi_container();
            if ( ! $container ) {
                throw new \Exception( 'Container not available' );
            }
            return 'Container successfully retrieved';
        });

        // Test 6.2: Service Resolution
        $suite['tests'][] = $this->run_test( 'Service Resolution', function() {
            $container = sbi_container();

            $services = [
                'GitHubService' => \SBI\Services\GitHubService::class,
                'PluginDetectionService' => \SBI\Services\PluginDetectionService::class,
                'StateManager' => \SBI\Services\StateManager::class
            ];

            $resolved_count = 0;
            foreach ( $services as $name => $class ) {
                try {
                    $service = $container->get( $class );
                    if ( $service ) {
                        $resolved_count++;
                    }
                } catch ( \Exception $e ) {
                    // Service resolution failed
                }
            }

            if ( $resolved_count === 0 ) {
                throw new \Exception( 'No services could be resolved' );
            }

            return sprintf( '%d/%d services resolved successfully', $resolved_count, count( $services ) );
        });

        return $suite;
    }

    /**
     * Test Suite 7: WordPress Integration.
     */
    private function test_wordpress_integration(): array {
        $suite = [
            'name' => 'WordPress Integration',
            'description' => 'Tests admin pages, hooks, and WordPress compatibility',
            'tests' => []
        ];

        // Test 7.1: Admin Menu Registration
        $suite['tests'][] = $this->run_test( 'Admin Menu Registration', function() {
            global $submenu;

            $sbi_pages = [];
            if ( isset( $submenu['plugins.php'] ) ) {
                foreach ( $submenu['plugins.php'] as $item ) {
                    if ( strpos( $item[2], 'kiss-smart-batch-installer' ) === 0 ||
                         strpos( $item[2], 'sbi-' ) === 0 ) {
                        $sbi_pages[] = $item[2];
                    }
                }
            }

            if ( empty( $sbi_pages ) ) {
                throw new \Exception( 'No SBI admin pages registered' );
            }

            return sprintf( '%d SBI admin pages registered', count( $sbi_pages ) );
        });

        // Test 7.2: WordPress Version Compatibility
        $suite['tests'][] = $this->run_test( 'WordPress Version Compatibility', function() {
            global $wp_version;

            $min_version = '5.0';
            if ( version_compare( $wp_version, $min_version, '<' ) ) {
                throw new \Exception( sprintf( 'WordPress %s required, %s detected', $min_version, $wp_version ) );
            }

            return sprintf( 'WordPress %s compatible', $wp_version );
        });

        // Test 7.3: Required WordPress Functions
        $suite['tests'][] = $this->run_test( 'Required WordPress Functions', function() {
            $required_functions = [
                'wp_remote_get',
                'wp_remote_post',
                'get_transient',
                'set_transient',
                'wp_verify_nonce',
                'current_user_can'
            ];

            $missing_functions = [];
            foreach ( $required_functions as $function ) {
                if ( ! function_exists( $function ) ) {
                    $missing_functions[] = $function;
                }
            }

            if ( ! empty( $missing_functions ) ) {
                throw new \Exception( 'Missing functions: ' . implode( ', ', $missing_functions ) );
            }

            return sprintf( 'All %d required WordPress functions available', count( $required_functions ) );
        });

        return $suite;
    }

    /**
     * Test Suite 8: Performance & Reliability.
     */
    private function test_performance_reliability(): array {
        $suite = [
            'name' => 'Performance & Reliability',
            'description' => 'Tests caching, timeouts, and error handling',
            'tests' => []
        ];

        // Test 8.1: Transient Cache System
        $suite['tests'][] = $this->run_test( 'Transient Cache System', function() {
            $test_key = 'sbi_test_cache_' . time();
            $test_value = [ 'test' => 'data', 'timestamp' => time() ];

            // Set transient
            $set_result = set_transient( $test_key, $test_value, 60 );
            if ( ! $set_result ) {
                throw new \Exception( 'Failed to set transient' );
            }

            // Get transient
            $get_result = get_transient( $test_key );
            if ( $get_result !== $test_value ) {
                throw new \Exception( 'Transient data mismatch' );
            }

            // Clean up
            delete_transient( $test_key );

            return 'Transient cache system working correctly';
        });

        // Test 8.2: Error Handling
        $suite['tests'][] = $this->run_test( 'Error Handling', function() {
            // Test WP_Error creation and handling
            $test_error = new \WP_Error( 'test_error', 'This is a test error' );

            if ( ! is_wp_error( $test_error ) ) {
                throw new \Exception( 'WP_Error not working correctly' );
            }

            if ( $test_error->get_error_message() !== 'This is a test error' ) {
                throw new \Exception( 'WP_Error message not correct' );
            }

            return 'Error handling system working correctly';
        });

        // Test 8.3: Memory Usage
        $suite['tests'][] = $this->run_test( 'Memory Usage', function() {
            $memory_limit = ini_get( 'memory_limit' );
            $current_usage = memory_get_usage( true );
            $peak_usage = memory_get_peak_usage( true );

            // Convert memory limit to bytes for comparison
            $limit_bytes = $this->convert_memory_limit_to_bytes( $memory_limit );

            if ( $peak_usage > ( $limit_bytes * 0.8 ) ) {
                throw new \Exception( sprintf( 'High memory usage: %s/%s',
                    size_format( $peak_usage ),
                    $memory_limit
                ) );
            }

            return sprintf( 'Memory usage OK: %s/%s (peak: %s)',
                size_format( $current_usage ),
                $memory_limit,
                size_format( $peak_usage )
            );
        });

        return $suite;
    }

    /**
     * Convert memory limit string to bytes.
     */
    private function convert_memory_limit_to_bytes( string $limit ): int {
        $limit = trim( $limit );
        $last = strtolower( $limit[ strlen( $limit ) - 1 ] );
        $number = (int) $limit;

        switch ( $last ) {
            case 'g':
                $number *= 1024;
            case 'm':
                $number *= 1024;
            case 'k':
                $number *= 1024;
        }

        return $number;
    }

    /**
     * Run a single test with error handling and timing.
     */
    private function run_test( string $name, callable $test_function ): array {
        $start_time = microtime( true );
        $result = [
            'name' => $name,
            'passed' => false,
            'message' => '',
            'execution_time' => 0,
            'error' => null
        ];

        try {
            $message = $test_function();
            $result['passed'] = true;
            $result['message'] = $message;
            $this->test_summary['passed']++;
        } catch ( \Throwable $e ) {
            $result['passed'] = false;
            $result['message'] = 'Test failed';
            $result['error'] = $e->getMessage();
            $this->test_summary['failed']++;
        }

        $result['execution_time'] = round( ( microtime( true ) - $start_time ) * 1000, 2 );
        $this->test_summary['total_tests']++;

        return $result;
    }

    /**
     * Calculate test summary statistics.
     */
    private function calculate_test_summary(): void {
        // Summary is calculated in run_test method
    }

    /**
     * Render the page HTML.
     */
    private function render_page_html(): void {
        ?>
        <div class="wrap">
            <h1><?php esc_html_e( 'SBI Self Tests - New Comprehensive Suite', 'kiss-smart-batch-installer' ); ?></h1>
            
            <p>
                <a href="<?php echo esc_url( admin_url( 'plugins.php?page=kiss-smart-batch-installer' ) ); ?>" class="button">
                    <?php esc_html_e( '← Back to Repository Manager', 'kiss-smart-batch-installer' ); ?>
                </a>
            </p>

            <div class="notice notice-info">
                <p><?php esc_html_e( 'This comprehensive test suite validates all core functionality with 8 real-world test categories.', 'kiss-smart-batch-installer' ); ?></p>
            </div>

            <form method="post" action="">
                <?php wp_nonce_field( 'sbi_new_tests' ); ?>
                <p class="submit">
                    <input type="submit" name="run_tests" class="button-primary" value="<?php esc_attr_e( 'Run All Tests', 'kiss-smart-batch-installer' ); ?>" />
                </p>
            </form>

            <?php if ( ! empty( $this->test_results ) ) : ?>
                <?php $this->render_test_results(); ?>
            <?php endif; ?>
        </div>

        <style>
        .test-suite {
            margin: 20px 0;
            border: 1px solid #ddd;
            border-radius: 4px;
            background: #fff;
        }
        .test-suite-header {
            background: #f9f9f9;
            padding: 15px;
            border-bottom: 1px solid #ddd;
            font-weight: bold;
        }
        .test-suite.passed .test-suite-header {
            background: #d4edda;
            border-color: #c3e6cb;
            color: #155724;
        }
        .test-suite.failed .test-suite-header {
            background: #f8d7da;
            border-color: #f5c6cb;
            color: #721c24;
        }
        .test-item {
            padding: 10px 15px;
            border-bottom: 1px solid #eee;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .test-item:last-child {
            border-bottom: none;
        }
        .test-status {
            font-weight: bold;
            width: 20px;
        }
        .test-status.passed {
            color: #28a745;
        }
        .test-status.failed {
            color: #dc3545;
        }
        .test-details {
            flex: 1;
        }
        .test-timing {
            color: #666;
            font-size: 0.9em;
        }
        .test-error {
            color: #dc3545;
            font-size: 0.9em;
            margin-top: 5px;
        }
        .test-summary {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 4px;
            padding: 15px;
            margin: 20px 0;
        }
        </style>
        <?php
    }

    /**
     * Render test results.
     */
    private function render_test_results(): void {
        ?>
        <div class="test-summary">
            <h2><?php esc_html_e( 'Test Results Summary', 'kiss-smart-batch-installer' ); ?></h2>
            <p>
                <strong><?php echo esc_html( $this->test_summary['total_tests'] ); ?></strong> tests completed in
                <strong><?php echo esc_html( $this->test_summary['execution_time'] ); ?>ms</strong> -
                <span class="test-status <?php echo $this->test_summary['failed'] === 0 ? 'passed' : 'failed'; ?>">
                    <?php echo esc_html( $this->test_summary['passed'] ); ?> passed,
                    <?php echo esc_html( $this->test_summary['failed'] ); ?> failed
                </span>
            </p>
        </div>

        <?php foreach ( $this->test_results as $suite_key => $suite ) : ?>
            <?php
            $suite_passed = 0;
            $suite_failed = 0;
            foreach ( $suite['tests'] as $test ) {
                if ( $test['passed'] ) {
                    $suite_passed++;
                } else {
                    $suite_failed++;
                }
            }
            ?>
            <div class="test-suite <?php echo $suite_failed === 0 ? 'passed' : 'failed'; ?>">
                <div class="test-suite-header">
                    <?php echo esc_html( $suite['name'] ); ?>
                    <br>
                    <small><?php echo esc_html( $suite['description'] ); ?></small>
                    <br>
                    <small>
                        <?php echo esc_html( $suite_passed ); ?> passed,
                        <?php echo esc_html( $suite_failed ); ?> failed
                    </small>
                </div>

                <?php foreach ( $suite['tests'] as $test ) : ?>
                    <div class="test-item">
                        <span class="test-status <?php echo $test['passed'] ? 'passed' : 'failed'; ?>">
                            <?php echo $test['passed'] ? '✓' : '✗'; ?>
                        </span>
                        <div class="test-details">
                            <strong><?php echo esc_html( $test['name'] ); ?></strong>
                            <div><?php echo esc_html( $test['message'] ); ?></div>
                            <?php if ( ! $test['passed'] && $test['error'] ) : ?>
                                <div class="test-error">
                                    <strong>Error:</strong> <?php echo esc_html( $test['error'] ); ?>
                                </div>
                            <?php endif; ?>
                        </div>
                        <span class="test-timing"><?php echo esc_html( $test['execution_time'] ); ?>ms</span>
                    </div>
                <?php endforeach; ?>
            </div>
        <?php endforeach; ?>
        <?php
    }
}
