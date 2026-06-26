<?php

    namespace TmThreeViewer\Data;

    class TM3D_Data {
    
         private static array $models = [];

        /**
         * Load models and product data from the database and transient cache
         *
         * @return array Assoc array of models and product data
         */
        public static function getData()

        {
            // Get all models and their associated SKU values from the database
            self::$models = self::getProductModels();

            // Retrieve the colour options data from the transient cache based on product type
            $product_data = get_transient('tmpc_colour_options_all');

            // Check URL for initial product state parameters or determine default values from postmeta
            $initial_state = self::productInitialState();

            return [
                'models' => self::$models,
                'product_data' => $product_data,
                'initial_state' => $initial_state,
            ];

        }

        /**
         * Check url for params or if none determine default values from postmeta
         *
         * @return array Returns array of selected options to be used for image layer rendering and current status display
         */
        public static function productInitialState() {

            $trace = [];

            $request_uri = $_SERVER['REQUEST_URI'] ?? '';
            $query = $request_uri ? parse_url($request_uri, PHP_URL_QUERY) : null;

            $trace[] = 'Start';
            $trace[] = "Query: " . ($query ?: '(none)');

            if (!$query) {
                $trace[] = 'No query string';
                error_log(print_r($trace, true));
                return self::return_defaults();
            }

            parse_str($query, $params);
            $trace[] = 'Params: ' . print_r($params, true);

            $keys = ['id', 'colour', 'base', 'veneer', 'model'];

            $hasValue = false;
            foreach ($keys as $key) {
                if (!empty($params[$key])) {
                    $hasValue = true;
                    break;
                }
            }

            if (!$hasValue) {
                $trace[] = 'No recognised parameters';
                error_log(print_r($trace, true));
                return self::return_defaults();
            }

            $trace[] = 'Relevant parameters found';

            if (!empty($params['id']) && !empty($params['colour'])) {

                $trace[] = 'ID + colour validation';

                $product_type = self::get_product_type($params['id']);
                $trace[] = "Product type: " . $product_type;

                $valid_colours = array_keys(self::$product_data[$product_type]['colour_options'] ?? []);

                $hyphenated_colour = str_replace(' ', '_', strtolower($params['colour']));
                $trace[] = "Checking colour: {$hyphenated_colour}";

                if (!in_array($hyphenated_colour, $valid_colours, true)) {
                    $trace[] = 'Colour INVALID';
                    error_log(print_r($trace, true));
                    return self::return_defaults();
                }

                $trace[] = 'Colour valid';

                if (empty($params['base']) && empty($params['veneer'])) {
                    $trace[] = 'No base/veneer supplied';
                    error_log(print_r($trace, true));
                    return self::return_defaults();
                }

                if (!self::isValidOption($product_type, 'base', $params)) {
                    $trace[] = 'Base INVALID';
                    error_log(print_r($trace, true));
                    return self::return_defaults();
                }

                $trace[] = 'Base valid';

                if ($product_type === 'edge') {

                    if (!self::isValidOption($product_type, 'metal', $params)) {
                        $trace[] = 'Metal INVALID';
                        error_log(print_r($trace, true));
                        return self::return_defaults();

                    }

                    $trace[] = 'Metal valid';
                }

                $trace[] = 'Returning URL parameters';
                error_log(print_r($trace, true));

                return array_intersect_key($params, array_flip($keys));
            } else {
                
                $trace[] = 'ID or colour missing';
                error_log(print_r($trace, true));
                return self::return_defaults();
            }

        }

        /**
         * Determine product type from WP categories
         *
         * @param string $product_id The product ID to check
         * @return string|null Returns 'solid', 'slim', 'edge' or null if no match
         */
        public static function get_product_type($product_id) {

            // Get the product object
            $product = wc_get_product($product_id);

            // Guard against invalid product
            if (!$product || !is_object($product) || !method_exists($product, 'get_id')) {
                return null;
            }

            // Get product category slugs
            $terms = get_the_terms($product->get_id(), 'product_cat');

            if (empty($terms) || is_wp_error($terms)) {
                return null;
            }

            // Define slugs of types to check
            $slugs = ['solid', 'slim', 'edge'];

            // Return the slug of the first matching category (ensure term_id is cast to int for comparison)
            foreach($terms as $term) {
                if (in_array($term->slug, $slugs)) {
                    return $term->slug; 
                }

            }

            // Return null if no matching category found
            return null; 

        }

        /**
         * Determine is current option is valid for top colour
         *
         * @param string $product_type The product type to check
         * @param string $option_type The option type to check
         * @param array $params The parameters containing the colour and option values
         * @return boolean Returns true if the option is valid, false otherwise
         */
        public static function isValidOption($product_type, $option_type, $params) {

            // Get valid options
            $valid_options = self::$product_data[$product_type]['master_values'][$option_type][$params['colour']] ?? [];

            // Check if the provided option is in the valid options array
            return in_array($params[$option_type], $valid_options);

        }

        /**
         * Return default colour options for the first model in the models array
         *
         * @return array default post meta values
         */
        public static function return_defaults() {

            // Get first model from the models array
            $first_model = self::$models[array_key_first(self::$models)];

            // Check if default colour options exist for the first model
            if (empty($first_model['default_colour_options'])) {
                return [];
            }

            // Extract default values from first model
            $defaults = $first_model['default_colour_options'];

            // Remove '_tmpa_' and '_colour' from the keys to match parameter names
            $formatted_keys = array_map(
                fn($key) => str_replace(['_tmpa_', '_colour'], '', $key),
                array_keys($defaults)
            );

            // Combine formatted keys with their values
            $combined_arr = array_combine($formatted_keys, array_values($defaults));

            // Add the first model's ID to the combined array
            $combined_arr['id'] = $first_model['id'] ?? '';

            // Add title to the combined array
            $combined_arr['title'] = $first_model['title'] ?? '';

            // Add the first model's SKU to the combined array
            $combined_arr['sku'] = $first_model['sku'] ?? '';

            // Add product type to the combined array
            $combined_arr['product_type'] = self::get_product_type($first_model['id'] ?? '');
            
            // Add model sizes to the combined array
            $combined_arr['model_sizes'] = $first_model['model_sizes'] ?? [];

            // Determine default model size and add it to the combined array
            $combined_arr['default_model_size'] = '';

            foreach ($combined_arr['model_sizes'] ?? [] as $size) {
                if (!empty($size['is_default'])) {
                    $combined_arr['default_model_size'] = $size['label'] ?? '';
                    break;
                }
            }

            // Return the combined array of default values
            return $combined_arr;

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

                    // Get the product type
                    $field_values[$id]['product_type'] = self::get_product_type($id);

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