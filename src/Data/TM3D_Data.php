<?php

    namespace TmThreeViewer\Data;

    class TM3D_Data {
    
        /**
         * Load models and product data from the database and transient cache
         *
         * @return array Assoc array of models and product data
         */
        public static function getData()

        {
            // Get all models and their associated SKU values from the database
            $models = self::getProductModels();

            // Retrieve the colour options data from the transient cache based on product type
            $product_data = get_transient('tmpc_colour_options_all');

            // Check URL for initial product state parameters or determine default values from postmeta
            //self::productInitialState();

            return [
                'models' => $models,
                'product_data' => $product_data,
            ];

        }

        /**
         * Check url for params or if none determine default values from postmeta
         *
         * @return array Returns array of selected options to be used for image layer rendering and current status display
         */

        public static function productInitialState() {

            // Resolve product ID once
            //$product_id = $product_id ?: get_the_ID();

            // Resolve request URI from parameter or server variable
            $request_uri = $request_uri ?? ($_SERVER['REQUEST_URI'] ?? '');

            // Extract query string
            $query = $request_uri ? parse_url($request_uri, PHP_URL_QUERY) : null;

            if ($query) {
                parse_str($query, $params);

                // Only trigger URL logic if relevant params exist
                if (
                    !empty($params['colour']) ||
                    !empty($params['base']) ||
                    !empty($params['veneer']) ||
                    !empty($params['model'])
                ) {
                    //return self::setProductDataFromURL($params, $product_id);
                }
            }

            // If no relevant URL params, return default product data based on database values 
            //return self::setDefaultProductData($product_id);
        }

        /**
         * Get all product models from database via WP_Query
         *
         * @return array Assoc array of product models with IDs, titles, SKUs, model sizes, and default colour options
         */
        public static function getProductModels()

        {

            // Get all products that have the ACF field 'acf_3d_model_name'
            // and are not in the 'swatch' or 'swatch-colour' categories
            $args = array(
                'post_type'      => 'product',
                'posts_per_page' => -1,
                'tax_query'      => [
                    [
                        'taxonomy' => 'product_cat',
                        'field'    => 'slug',
                        'terms'    => [
                            'swatch',
                            'swatch-colour'
                        ],
                        'operator' => 'NOT IN',
                    ],
                ],
                'meta_query'     => array(
                    array(
                        'key'     => 'acf_3d_model_name',
                        'compare' => 'EXISTS',
                    ),
                ),
            );

            // Execute the query
            $query = new \WP_Query($args);

            // Initialize an array to hold the field values
            $field_values = [];

            // Loop through the posts and get the required field values
            if ( $query->have_posts() ) :

                while ( $query->have_posts() ) : $query->the_post();

                    // Get the ID
                    $id = get_the_ID();

                    // Get the ID
                    $field_values[$id]['id'] = $id;

                    // Get the title
                    $field_values[$id]['title'] = get_the_title();

                    // Get the sku
                    $field_values[$id]['sku'] = get_field('acf_3d_model_name');

                    // Get model sizes
                    $field_values[$id]['model_sizes'] = get_post_meta($id, '_tmpa_model_size', true);

                    // Get default colour options
                    $colour_option_keys = ['_tmpa_top_colour', '_tmpa_base_colour', '_tmpa_metal_colour'];

                    foreach ($colour_option_keys as $key) {
                        $field_values[$id]['default_colour_options'][$key] = get_post_meta($id, $key, true);
                    }

                endwhile;

                wp_reset_postdata();

            endif;

            // Return the array of field values
            return $field_values;

        }

    }