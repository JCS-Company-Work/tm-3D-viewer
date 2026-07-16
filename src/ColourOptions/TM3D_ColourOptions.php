<?php

    namespace TmThreeViewer\ColourOptions;

    use TmThreeViewer\ColourOptions\TM3D_ColourOptionsData;
    use TmThreeViewer\ColourOptions\TM3D_ColourOptionsService;

    /**
     * Class to create and update colour data and default colour sets enforced in the browser
     */
    class TM3D_ColourOptions {

        public static function init() {
            
            // API endpoint to update colour options 
            add_action('rest_api_init', function () {
                register_rest_route('tm3d/v1', '/colour-options-update', [
                    'methods' => 'POST',
                    'callback' => [TM3D_ColourOptionsData::class, 'getDataFromGoogleSheets'],
                    'permission_callback' => '__return_true',
                ]);
            });
        }
    }