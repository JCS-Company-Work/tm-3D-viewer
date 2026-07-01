<?php

    namespace TmThreeViewer\Data;

    class TM3D_Data {
    
        private static array $models = [];
        private static array $product_data = [];

        /**
         * Load models and product data from the database and transient cache
         *
         * @return array Assoc array of models and product data
         */
        public static function getData()

        {
            // Get all models and their associated SKU values from the database
            self::$models = self::getProductModels();

            // Retrieve transient safely (NEVER trust WP return types)
            $cached = get_transient('tmpc_colour_options_all');

            self::$product_data = is_array($cached) ? $cached : [];

            // If empty, trigger rebuild and re-check once
            if (empty(self::$product_data)) {

                do_action('tmc_rebuild_colour_options');

                $cached = get_transient('tmpc_colour_options_all');
                self::$product_data = is_array($cached) ? $cached : [];
            }

            // Check URL for initial product state parameters or defaults
            $initial_state = self::productInitialState();

            return [
                'models' => self::$models,
                'product_data' => self::$product_data,
                'initial_state' => $initial_state,
            ];
        }

        /**
         * Check url for params or if none determine default values from postmeta
         *
         * @return array Returns array of selected options to be used for image layer rendering and current status display
         */
        public static function productInitialState() {

            // Get the request URI and parse the query string
            $request_uri = $_SERVER['REQUEST_URI'] ?? '';
            $query = $request_uri ? parse_url($request_uri, PHP_URL_QUERY) : null;

            // If no query string is present, return default values
            if (!$query) {
                return self::return_defaults();
            }

            // Parse the query string into an associative array
            parse_str($query, $params);

            // Define the keys to check for in the query parameters
            $keys = ['id', 'colour', 'base', 'veneer', 'model'];

            // Check if any of the relevant parameters are present in the query string
            $hasValue = false;
            foreach ($keys as $key) {
                if (!empty($params[$key])) {
                    $hasValue = true;
                    break;
                }
            }

            // If none of the relevant parameters are present, return default values
            if (!$hasValue) {
                return self::return_defaults();
            }

            if (!empty($params['id']) && !empty($params['colour'])) {

                // Determine product type from ID
                $product_type = self::get_product_type($params['id']);

                // Create array of valid colours for the product type
                $valid_colours = array_keys(self::$product_data[$product_type]['colour_options']);

                // Hyphenate the colour parameter for comparison
                $hyphenated_colour = str_replace(' ', '_', strtolower($params['colour']));

                // If hyphenated colour is not in the array of valid colours return default options
                if (!in_array($hyphenated_colour, $valid_colours, true)) {
                    return self::return_defaults();
                }

                // Normalise URL parameters to match the frontend state
                if (!empty($params['colour'])) {
                    $params['top'] = $params['colour'];
                }

                // If no base is uspplied, default to first valid base as we have a top colour and a product type
                if (!self::isValidOption($product_type, 'base', $params)) {
                    $params['base'] = self::$product_data[$product_type]['colour_options'][$hyphenated_colour]['base'][0] ?? '';
                }

                // If this is an edge product check for metal
                if ($product_type === 'edge') {

                    // If no metal is supplied, default to first valid metal as we have a top colour and a product type
                    if (!self::isValidOption($product_type, 'metal', $params)) {
                        $params['veneer'] = self::$product_data[$product_type]['colour_options'][$hyphenated_colour]['metal'][0] ?? '';
                    }

                }

                // Filter the parameters to only include the relevant keys
                $final_values = array_intersect_key($params, array_flip($keys));

                // The frontend expects "top" instead of "colour"
                if (isset($final_values['colour'])) {
                    $final_values['top'] = strtolower($final_values['colour']);
                    unset($final_values['colour']);
                }

                // Retrieve the model by ID to get additional information like SKU and model sizes
                $model = self::get_model_by_id((int) ($final_values['id'] ?? null));

                // Add product type, sku, model sizes, and default model size to the final values
                $final_values['product_type'] = $product_type;
                $final_values['sku'] = $model['sku'] ?? '';
                $final_values['model_sizes'] = $model['model_sizes'] ?? [];

                foreach ($final_values['model_sizes'] ?? [] as $size) {
                    if (!empty($size['is_default'])) {
                        $final_values['default_model_size'] = $size['label'] ?? '';
                        break;
                    }
                }

                return $final_values;

            } else {
                return self::return_defaults();
            }

        }

        /**
         * Retrieve a model by its ID
         *
         * @param int $id The ID of the model to retrieve
         * @return array|null Returns the model array if found, null otherwise
         */
        public static function get_model_by_id($id) {

            // Find model by id
            $model = null;

            foreach (self::$models as $collection) {
                foreach ($collection as $product) {
                    error_log('Checking product ID: ' . gettype($product['id']) . ' against param ID: ' . gettype($id)); // Log the IDs being compared
                    if ($product['id'] === $id) {
                        $model = $product;
                        break 2;
                    }
                }
            }

            return $model;
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

            // Product collection
            $collection = array_key_first(self::$models) ?? '';

            // Get first model from the models array
            $first_model = reset(self::$models[$collection]) ?? [];
error_log('test : ' . print_r($first_model, true)); // Log the first model for debugging
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
error_log('combined_arr : ' . print_r($combined_arr, true)); // Log the combined array for debugging
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

            // array to hold products by collection
            $products_by_collection = [];

            // Loop through the posts and get the required field values
            if ( $query->have_posts() ) :

                while ( $query->have_posts() ) : $query->the_post();

                    // Initialize an array to hold the field values
                    $field_values = [];

                    // Get the ID
                    $id = get_the_ID();

                    $collection = self::determineProductCollection($id);

                    // Add the product to the collection array if collection not null, otherwise skip it
                    if ($collection) {

                        // Get the ID
                        $field_values[$id]['id'] = $id;

                        // Get the product type
                        $field_values[$id]['product_type'] = self::get_product_type($id);

                        // Get the title
                        $field_values[$id]['title'] = get_the_title();

                        // Get product thumbnail URL
                        $field_values[$id]['url'] = get_the_post_thumbnail_url($id, 'thumbnail');

                        // Get the sku
                        $field_values[$id]['sku'] = get_field('acf_3d_model_name');

                        // Get model sizes
                        $field_values[$id]['model_sizes'] = get_post_meta($id, '_tmpa_model_size', true);

                        // Get default colour options
                        $colour_option_keys = ['_tmpa_top_colour', '_tmpa_base_colour', '_tmpa_metal_colour'];

                        foreach ($colour_option_keys as $key) {
                            $field_values[$id]['default_colour_options'][$key] = get_post_meta($id, $key, true);
                        }

                        $products_by_collection[$collection][$id] = $field_values[$id];

                    }

                endwhile;

                wp_reset_postdata();

            endif;

            // Return the array of field values
            return $products_by_collection;

        }

        /**
         * Determine the main product collection based on the product's categories
         *
         * @param string $id
         * @return string|null Returns the slug of the main collection or null if no match
         */
        public static function determineProductCollection($id) {

            // Determine product main collection and add it to the array
            $terms = get_the_terms($id, 'product_cat');

            if (!empty($terms) && !is_wp_error($terms)) {
                foreach ($terms as $term) {
                    if (in_array($term->slug, ['vanguard', 'phantom', 'monarch', 'luna'])) {
                        return $term->slug;
                    }
                }
            }

            return null;
        }

    }