<?php

    namespace TmThreeViewer\Assets;

    class TM3D_Assets {

        public static function init() {

            // Convert JS scripts to module type for proper import handling in the browser
            add_filter('script_loader_tag', [self::class, 'mark_module_script'], 10, 3);

        }

        /**
         * Mark a script as a module
         *
         * @param string $tag
         * @param string $handle
         * @param string $src
         * @return string
         */
        public static function mark_module_script(string $tag, string $handle, string $src): string
        
        {
            // Only the main configurator entry point needs to be a deferred module.
            if ($handle === 'tm-configurator') {
                return sprintf('<script type="module" defer src="%s"></script>', esc_url($src));
            }

            return $tag;

        }

        /**
         * Enqueue necessary scripts and styles for the 3D model viewer
         * Called from shortcode handler in TM3D_Model::render_product_viewer()
         *
         * @param array $data global data to be passed to JavaScript
         * @return void
         */
        public static function enqueue_assets(array $data): void
        
        {

            // Enqueue PhotoSwipe core styles required for modal rendering.
            wp_enqueue_style(
                'tm-photoswipe-css',
                TM3D_URL . 'assets/css/photoswipe.css',
                [],
                TM3D_VERSION
            );

            // Enqueue GSAP for animations
            wp_enqueue_script(
                'gsap',
                TM3D_URL . 'assets/js/gsap/gsap.min.js',
                [],
                TM3D_VERSION,
                true
            );

            // Enqueue the Product script, which contains the main logic for the 3D model viewer
            wp_enqueue_script(
                'tm-configurator',
                TM3D_URL . 'assets/js/Configurator.js',
                [],
                TM3D_VERSION,
                true
            );

            // Localize the script to pass PHP data to JavaScript, including colour options, version, and URL
            wp_localize_script(
                'tm-configurator',
                'TM3DPlugin',
                [
                    'data' => $data ?? [],
                    'version' => TM3D_VERSION,
                    'url'     => TM3D_URL,
                ]
            );
            
        }

    }