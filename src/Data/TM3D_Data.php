<?php

    namespace TmThreeViewer\Data;

    use TmThreeViewer\ColourOptions\TM3D_ColourOptionsData;

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

            // Get all product data from transient cache
            self::$product_data = self::getProductData();

            // Check URL for initial product state parameters or defaults
            $initial_state = self::productInitialState();

            return [
                'models' => self::$models,
                'product_data' => self::$product_data,
                'initial_state' => $initial_state,
            ];
        }

        /**
         * Get product data from transient cache or fetch from Google Sheets if not cached
         *
         * @return array Returns array of product data from transient cache or fetches from Google Sheets if not cached
         */
        public static function getProductData() {

            // Retrieve transient
            $cached = get_transient('tm3d_colour_options_all');

            //If cached data exists, return it
            if ($cached !== false) {
                return $cached;
            }

            // If no cached data, fetch from Google Sheets (internal call, bypass token)
            TM3D_ColourOptionsData::getDataFromGoogleSheets(true);

            // Retrieve transient again after fetching from Google Sheets
            $cached = get_transient('tm3d_colour_options_all');

            // Return the cached data
            return $cached;

        }

        /**
         * Get all product models from database via WP_Query
         *
         * @return array Assoc array of product models with IDs, titles, SKUs, model sizes, and default colour options
         */
        public static function getProductModels()

        {

            // Check for cached data and return if it exists
            $cached = get_transient('tm3d_product_models');
            if (is_array($cached)) {
                return $cached;
            }

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

                    // Get product price
                    $product = wc_get_product($id);

                    // Add the product to the collection array if collection not null, otherwise skip it
                    if ($collection) {

                        // Get the required field values for the product
                        $field_values[$id] = [
                            'id'           => $id,
                            'product_type' => self::get_product_type($id),
                            'title'        => get_the_title($id),
                            'price'        => $product ? $product->get_price() : '',
                            'url'          => get_the_post_thumbnail_url($id, 'thumbnail'),
                            'permalink'    => get_permalink($id),
                            'sku'          => get_field('acf_3d_model_name', $id),
                            'model_sizes'  => get_post_meta($id, '_tmpa_model_size', true),
                        ];

                        // Get default colour options from admin meta.
                        // Top colour can be stored as either tmpa_top_colour or _tmpa_top_colour.
                        $field_values[$id]['default_colour_options']['_tmpa_top_colour'] = get_post_meta($id, '_tmpa_top_colour', true);
                        $field_values[$id]['default_colour_options']['_tmpa_base_colour'] = get_post_meta($id, '_tmpa_base_colour', true);
                        $field_values[$id]['default_colour_options']['_tmpa_metal_colour'] = get_post_meta($id, '_tmpa_metal_colour', true);

                        // Add the product to the collection array
                        $products_by_collection[$collection][$id] = $field_values[$id];

                    }

                endwhile;

                wp_reset_postdata();

            endif;

            // Cache the products by collection for 30 days
            set_transient('tm3d_product_models', $products_by_collection, 2592000);

            // Return the array of field values
            return $products_by_collection;

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

            // If we have id and colour we have enough to create a valid initial state and product
            if (!empty($params['id']) && !empty($params['colour'])) {

                // Determine product type from ID
                $product_type = self::get_product_type($params['id']);

                // Create array of valid colours for the product type
                $valid_colours = array_keys(self::$product_data[$product_type]['colour_options']);

                // Hyphenate the colour parameter for comparison
                $hyphenated_colour = str_replace(' ', '_', strtolower($params['colour']));

                // Determine base type based on product category (wood or tile)
                $baseType = has_term(199, 'product_cat', $params['id'] ?? '') ? 'wood' : 'tile';

                // If hyphenated colour is not in the array of valid colours return default options
                if (!in_array($hyphenated_colour, $valid_colours, true)) {
                    return self::return_defaults();
                }

                // Normalise URL parameters to match the frontend state
                if (!empty($params['colour'])) {
                    $params['top'] = $params['colour'];
                }

                // Shared URLs use veneer for metal edge; keep an internal metal alias for validation logic.
                if (!empty($params['veneer']) && empty($params['metal'])) {
                    $params['metal'] = $params['veneer'];
                }

                // If no base is supplied, default to first valid base as we have a top colour and a product type
                if (!self::isValidOption($product_type, 'base', $params)) {
                    $params['base'] = self::$product_data[$product_type]['colour_options'][$hyphenated_colour]['base'][$baseType][0] ?? '';
                }

                // If this is an edge product check for metal
                if ($product_type === 'edge') {

                    // If no metal is supplied, default to first valid metal as we have a top colour and a product type
                    if (!self::isValidOption($product_type, 'metal', $params)) {
                        $params['veneer'] = self::$product_data[$product_type]['colour_options'][$hyphenated_colour]['metal'][0] ?? '';
                        $params['metal'] = $params['veneer'];
                    }

                }

                // Swatch colours array
                $swatch_colours = [
                    'top' => $params['colour'] ?? '',
                    'base' => $params['base'] ?? '',
                    'metal' => $params['veneer'] ?? '',
                ];

                // Add swatch urls for selected layers
                $swatchUrls = self::swatchUrls($product_type, $swatch_colours, $baseType);

                // Filter the parameters to only include the relevant keys
                $final_values = array_intersect_key($params, array_flip($keys));
                
                // Alter keys as frontend expects 'top' instead of 'colour'
                if (isset($final_values['colour'])) {
                    $final_values['top'] = strtolower($final_values['colour']);
                    unset($final_values['colour']);
                }

                // Retrieve the model by ID to get additional information like SKU and model sizes
                $model = self::get_model_by_id((int) ($final_values['id'] ?? null));

                // Add product type, sku, model sizes, base type and default model size to the final values
                $final_values += [
                    'title' => $model['title'] ?? '',
                    'product_type' => $product_type,
                    'price' => $model['price'] ?? '',
                    'sku' => $model['sku'] ?? '',
                    'model_sizes' => $model['model_sizes'] ?? [],
                    'baseType' => $baseType,
                    'swatch_urls' => $swatchUrls,
                    'permalink' => $model['permalink'] ?? '',
                ];

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
         * Return default colour options for the first model in the models array
         *
         * @return array default post meta values
         */
        public static function return_defaults() {

            // Guard against empty model data
            if (empty(self::$models) || !is_array(self::$models)) {
                return [];
            }

            // Check ACF for default model ID for the current product page
            $queried_id = get_queried_object_id();
            $configured_default_id = (int) get_field('3d_model_default_id', $queried_id);

            // Set selected model to null
            $selected_model = null;

            // If configured default ID exists, use it to get the model
            if ($configured_default_id > 0) {
                $selected_model = self::get_model_by_id($configured_default_id);
            }

            // If not configured/found, on product pages (excluding swatch products) use current page/product ID
            if (!$selected_model && function_exists('is_product') && is_product() && $queried_id) {
                if (!has_term('swatch', 'product_cat', $queried_id)) {
                    $selected_model = self::get_model_by_id((int) $queried_id);
                }
            }

            // Fallback to first item as nothing set
            if (!$selected_model) {
                $collection = array_key_first(self::$models) ?? '';
                $selected_model = reset(self::$models[$collection]) ?? [];
            }

            // Guard against unresolved/invalid model
            if (empty($selected_model) || !is_array($selected_model)) {
                return [];
            }

            // Check if default colour options exist for the selected model
            if (empty($selected_model['default_colour_options'])) {
                return [];
            }

            // Extract default values from selected model
            $defaults = $selected_model['default_colour_options'];

            // Remove '_tmpa_' and '_colour' from the keys to match parameter names
            $formatted_keys = array_map(
                fn($key) => str_replace(['_tmpa_', '_colour'], '', $key),
                array_keys($defaults)
            );

            // Determine product type from selected model ID
            $product_type = self::get_product_type($selected_model['id'] ?? '');

            // Determine base type based on product category (wood or tile)
            $base_type = has_term(199, 'product_cat', $selected_model['id'] ?? '') ? 'wood' : 'tile';

            // Combine formatted keys with their values
            $combined_arr = array_combine($formatted_keys, array_values($defaults));

            // Keep initial-state key compatibility for metal edge values.
            if (!isset($combined_arr['veneer']) && isset($combined_arr['metal'])) {
                $combined_arr['veneer'] = $combined_arr['metal'];
            }

            // Determine swatch thumb urls from normalized default keys (top/base/metal)
            $swatch_urls = self::swatchUrls($product_type, $combined_arr, $base_type);

            foreach ($selected_model['model_sizes'] ?? [] as $size) {
                if (!empty($size['is_default'])) {
                    $combined_arr['default_model_size'] = $size['label'] ?? '';
                    break;
                }
            }

            // Add product type, sku, model sizes, base type and swatch urls to the combined array
            $combined_arr += [
                'id' => $selected_model['id'] ?? '',
                'title' => $selected_model['title'] ?? '',
                'price' => $selected_model['price'] ?? '',
                'sku' => $selected_model['sku'] ?? '',
                'product_type' => $product_type,
                'baseType' => $base_type,
                'model_sizes' => $selected_model['model_sizes'] ?? [],
                'default_model_size' => $combined_arr['default_model_size'] ?? '',
                'swatch_urls' => $swatch_urls,
                'permalink' => $selected_model['permalink'] ?? '',
            ];

            // Return the combined array of default values
            return $combined_arr;

        }

        /**
         * Add swatch urls for selected layers based on product type, colour, and base type
         *
         * @param string $product_type
         * @param array $colours
         * @param string $baseType
         * @return array
         */
        public static function swatchUrls($product_type, $colours, $baseType) {

            $swatch_urls = [];

            // Add swatch urls for selected layers
            foreach ($colours as $key => $colour) {

                switch ($key) {
                    case 'top':
                        $top_option = self::resolveTopColourOption($product_type, $colour);
                        $swatch_urls[$key] = $top_option['top']['thumb_url'] ?? '';
                        break;
                    case 'base':
                        $base_options = self::$product_data['master_values'][$product_type]['base'][$baseType] ?? [];
                        $base_option = self::resolveMasterColourOption($base_options, $colour);
                        $swatch_urls[$key] = $base_option['thumb_url'] ?? '';
                        break;
                    case 'metal':
                        $metal_options = self::$product_data['master_values'][$product_type]['metal'] ?? [];
                        $metal_option = self::resolveMasterColourOption($metal_options, $colour);
                        $swatch_urls[$key] = $metal_option['thumb_url'] ?? '';
                        break;
                    default:
                        $swatch_urls[$key] = '';
                }

            }

            return $swatch_urls;

        }

        /**
         * Normalize a colour string for robust key comparison.
         *
         * @param string $value
         * @return string
         */
        private static function normalizeColourValue($value) {
            return strtolower(str_replace([' ', '-'], '_', trim((string) $value)));
        }

        /**
         * Resolve a top colour option from colour_options with key/name fallbacks.
         *
         * @param string $product_type
         * @param string $colour
         * @return array
         */
        private static function resolveTopColourOption($product_type, $colour) {

            $colour_options = self::$product_data[$product_type]['colour_options'] ?? [];

            if (isset($colour_options[$colour])) {
                return $colour_options[$colour];
            }

            $normalized = self::normalizeColourValue($colour);

            if (isset($colour_options[$normalized])) {
                return $colour_options[$normalized];
            }

            foreach ($colour_options as $key => $option) {
                if (self::normalizeColourValue($key) === $normalized) {
                    return $option;
                }

                $option_name = $option['top']['name'] ?? '';
                if (self::normalizeColourValue($option_name) === $normalized) {
                    return $option;
                }
            }

            return [];

        }

        /**
         * Resolve a base or metal option from master_values with key/name fallbacks.
         *
         * @param array $options
         * @param string $colour
         * @return array
         */
        private static function resolveMasterColourOption($options, $colour) {

            if (isset($options[$colour])) {
                return $options[$colour];
            }

            $normalized = self::normalizeColourValue($colour);

            if (isset($options[$normalized])) {
                return $options[$normalized];
            }

            foreach ($options as $key => $option) {
                if (self::normalizeColourValue($key) === $normalized) {
                    return $option;
                }

                $option_name = $option['name'] ?? '';
                if (self::normalizeColourValue($option_name) === $normalized) {
                    return $option;
                }
            }

            return [];

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

            $requested_value = $params[$option_type] ?? '';

            // Shared URLs expose edge value as veneer; support that alias for metal validation.
            if ($option_type === 'metal' && empty($requested_value) && !empty($params['veneer'])) {
                $requested_value = $params['veneer'];
            }

            if (empty($product_type) || empty($option_type) || empty($params['colour']) || empty($requested_value)) {
                return false;
            }

            // Resolve the selected top colour from colour_options using robust key/name matching.
            $top_option = self::resolveTopColourOption($product_type, $params['colour']);
            if (empty($top_option)) {
                return false;
            }

            // Determine valid values for the requested option in the context of the selected top colour.
            $valid_options = [];

            if ($option_type === 'base') {
                $product_id = isset($params['id']) ? (int) $params['id'] : 0;
                $base_type = has_term(199, 'product_cat', $product_id) ? 'wood' : 'tile';
                $valid_options = $top_option['base'][$base_type] ?? [];
            } elseif ($option_type === 'metal') {
                $valid_options = $top_option['metal'] ?? [];
            } else {
                return false;
            }

            if (!is_array($valid_options) || empty($valid_options)) {
                return false;
            }

            // Compare using normalized values so URL spacing/case differences do not invalidate valid options.
            $requested = self::normalizeColourValue($requested_value);

            foreach ($valid_options as $valid_option) {
                if (self::normalizeColourValue($valid_option) === $requested) {
                    return true;
                }
            }

            return false;

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