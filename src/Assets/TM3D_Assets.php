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

            // List of script handles that should be treated as modules
            $modules = [
                'tm-three-viewer',
                'tm-product-state',
                'tm-product-rules',
                'tm-configurator'
            ];

            // If the script handle is not in modules array, return the original tag
            if (!in_array($handle, $modules, true)) {
                return $tag;
            }

            // Return the script tag with type="module" for module scripts
            return sprintf('<script type="module" src="%s"></script>', esc_url($src));

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

            // Enqueue GSAP for animations
            wp_enqueue_script(
                'gsap',
                TM3D_URL . 'assets/js/gsap.min.js',
                [],
                TM3D_VERSION,
                true
            );

            // Enqueue the ProductState script, which manages the state of the product configuration
            wp_enqueue_script(
                'tm-product-state',
                TM3D_URL . 'assets/js/ProductState.js',
                [],
                TM3D_VERSION,
                true
            );

            // Enqueue the ProductRules script, which contains the logic for determining available options based on the selected top colour
            wp_enqueue_script(
                'tm-product-rules',
                TM3D_URL . 'assets/js/ProductRules.js',
                ['tm-product-state'],
                TM3D_VERSION,
                true
            );

            // Enqueue the Product script, which contains the main logic for the 3D model viewer
            wp_enqueue_script(
                'tm-configurator',
                TM3D_URL . 'assets/js/Configurator.js',
                ['tm-product-rules'],
                TM3D_VERSION,
                true
            );

            // Enqueue the main ProductViewer script, which initializes and manages the 3D viewer
            wp_enqueue_script(
                'tm-three-viewer',
                TM3D_URL . 'assets/js/ProductViewer.js',
                [],
                TM3D_VERSION,
                true
            );

            // Localize the script to pass PHP data to JavaScript, including colour options, version, and URL
            wp_localize_script(
                'tm-three-viewer',
                'TM3DPlugin',
                [
                    'data' => $data ?? [],
                    'version' => TM3D_VERSION,
                    'url'     => TM3D_URL,
                ]
            );
            
        }

    }