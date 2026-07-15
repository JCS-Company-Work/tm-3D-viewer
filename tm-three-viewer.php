<?php
/**
 * Plugin Name: Tailormade 3D Model Viewer
 * Description: TM 3D model viewer plugin
 * Version: 0.1.0
 * Author: Tailormade
 */

if (!defined('ABSPATH')) {
    exit;
}

// Constants
define( 'TM3D_PATH', plugin_dir_path( __FILE__ ) );
define( 'TM3D_URL',  plugin_dir_url( __FILE__ ) );
define( 'TM3D_VERSION', '1.0.4' );


// Path to composer also bring in dotenv for environment variable handling
if (file_exists(TM3D_PATH . 'vendor/autoload.php')) {
    require_once TM3D_PATH . 'vendor/autoload.php';

    // Load environment variables from .env file in root
    $dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
    $dotenv->load();
}

// Classes required
use TmThreeViewer\TM3D_Init;

// Only init plugin when shortcode is present on the page
add_action('init', function () {
    TM3D_Init::init();
});