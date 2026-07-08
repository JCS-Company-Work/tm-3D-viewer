<?php

    namespace TmThreeViewer;

    class TM3D_Init {

        /**
         * Initialize the plugin by calling the init methods of all required modules
         *
         * @return void
         */
        public static function init() {
            
            // List of modules to initialize
            $modules = [
                \TmThreeViewer\Assets\TM3D_Assets::class,
                \TmThreeViewer\Ajax\TM3D_Ajax::class,
                \TmThreeViewer\ColourOptions\TM3D_ColourOptions::class,
                \TmThreeViewer\CurrentStatus\TM3d_CreatedByUs::class,
                \TmThreeViewer\Images\TM3D_Images::class,
                \TmThreeViewer\Model\TM3D_Model::class,
            ];

            // Initialize each module by calling its init method if it exists
            foreach ($modules as $module) {
                if (class_exists($module) && method_exists($module, 'init')) {
                    $module::init();
                }
            }
        
        }

        
    }