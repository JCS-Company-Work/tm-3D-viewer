<?php

    namespace TmThreeViewer\Images;

    use TmThreeViewer\Data\TM3D_Data;

    class TM3D_Images {

        /**
         * Cached composite image URLs
         *
         * @var array|null
         */
        protected static $composite_images = null;

        /**
         * Scaffold image update API
         *
         * @return void
         */
        public static function init() {

            add_action('rest_api_init', function () {
                register_rest_route('tm3d/v1', '/update-product-images', [
                    'methods' => 'POST',
                    'callback' => [self::class, 'buildImageUrl'],
                    'permission_callback' => '__return_true',
                ]);
            });

        }

        /**
         * Getter function to return cached composite image URLs if 
         * they exist or trigger image creation if not
         *
         * @return array|null Array of image URLs (700, 1600, 400) or null
         */
        public static function getCompositeImages($id = null) {
            if (self::$composite_images === null) {
                self::serveImagesOnPageLoad($id);
            }
            return self::$composite_images;
        }

        /**
         * Serve images on page load, caching the generated HTML for subsequent 
         * calls during the same request to avoid extra unnecessary processing
         *
         * @return void
         */
        public static function serveImagesOnPageLoad($id = null) {

            // If images exist already, serve cached version
            if (self::$composite_images !== null) {
                return self::$composite_images;
            }

            // Check if Imagick is available
            if (!class_exists('Imagick')) {
                error_log('Imagick not available');
                return null;
            }

            // Get product from WooCommerce
            $product = wc_get_product($id);
            if (!$product) return null;

            // Get valid colour combinations for current product and options
            $valid_colours = self::getValidColourCombinations($product, (int) $product->get_id());

            // Process layers to get image paths
            $image_layers = self::processLayers($product->get_sku(), $valid_colours);

            // Build composite image and get URL path
            self::buildCompositeImage($image_layers);

            // Build hash and directory for other sizes
            $hash = md5(json_encode($image_layers));
            $dir = site_url('wp-content/themes/tm-shop-child/assets/layers/composites');
            $images = [
                '700' => "$dir/{$hash}-700.png",
                '1600' => "$dir/{$hash}-1600.png",
                '400' => "$dir/{$hash}-400.png",
            ];

            // Cache the generated image URLs for subsequent calls during the same request
            self::$composite_images = $images;

            return $images;
        }

        /**
         * Get valid colour combinations for a product.
         *
         * @param \WC_Product $product The WooCommerce product object.
         * @return array The valid colour combinations.
         */
        public static function getValidColourCombinations($product, $product_id = 0) {

            // Get colour options data
            $colourOptions = TM3D_Data::getProductData();
            
            // Parse URL query to get selected options (if any)
            $query = parse_url($_SERVER['REQUEST_URI'], PHP_URL_QUERY);
            $params = [];
            $image_layers = [];

            // If colour param exists in URL 
            if (!empty($query)) {

                // Parse query string into params array
                parse_str($query, $params);

                // Extract and format colour param for lookup
                $colour = isset($params['colour']) ? str_replace(' ', '_', strtolower(sanitize_text_field(wp_unslash($params['colour'])))) : null;

                // Get product type for current product
                $productType = self::get_product_type($product);

                // Get available colours for this product type and selected colour
                $availableColours = $colourOptions[$colour][$productType] ?? [];

                // Validate and assign base and metal from URL, fallback to first available if not valid
                $base = isset($params['base']) ? strtolower(sanitize_text_field(wp_unslash($params['base']))) : null;
                $metal = isset($params['veneer']) ? strtolower(sanitize_text_field(wp_unslash($params['veneer']))) : null;

                if (isset($availableColours['base']) && is_array($availableColours['base'])) {
                    if (!in_array($base, $availableColours['base'], true)) {
                        $base = $availableColours['base'][0] ?? null;
                    }
                }
                if (isset($availableColours['metal']) && is_array($availableColours['metal'])) {
                    if (!in_array($metal, $availableColours['metal'], true)) {
                        $metal = $availableColours['metal'][0] ?? null;
                    }
                }

                // Build image layers array based on selected options
                // Hyphenate colour names for image file naming convention
                $image_layers['top'] = str_replace('_', '-', $colour);
                $image_layers['base'] = $base;
                $image_layers['metal'] = $metal;

            } else {
                // If no colour param, fallback to defaults (if set) or empty
                $resolved_product_id = (int) ($product_id ?: ($product && method_exists($product, 'get_id') ? $product->get_id() : 0));

                $image_layers['top'] = get_post_meta($resolved_product_id, 'tmpa_top_colour', true)
                    ?: get_post_meta($resolved_product_id, '_tmpa_top_colour', true);
                $image_layers['base'] = get_post_meta($resolved_product_id, '_tmpa_base_colour', true);
                $image_layers['metal'] = get_post_meta($resolved_product_id, '_tmpa_metal_colour', true);
            }

            return $image_layers;

        }

        /**
         * Build image URL for a product based on selected layers.
         *
         * @param \WP_REST_Request $request The REST API request object.
         * @return array The response containing image URLs and timings.
         */
        public static function buildImageUrl($request) {

            if (!class_exists('Imagick')) {
                return ['success' => false, 'message' => 'Imagick not available'];
            }

            $start = microtime(true);
            $timings = [];
            $params = $request->get_json_params();

            $product = wc_get_product(intval($params['product_id'] ?? 0));
            if (!$product) {
                return ['success' => false, 'message' => 'Invalid product'];
            }

            $image_layers = self::processLayers($product->get_sku(), $params['selectedLayers']);

            // Build composite image and get URL path
            self::buildCompositeImage($image_layers);

            $hash = md5(json_encode($image_layers));
            $dir = site_url('wp-content/themes/tm-shop-child/assets/layers/composites');

            $images = [
                '700' => "$dir/{$hash}-700.png",
                '1600' => "$dir/{$hash}-1600.png",
                '400' => "$dir/{$hash}-400.png",
            ];

            return [
                'success' => true,
                'duration' => microtime(true) - $start,
                'images' => $images,
                'timings' => $timings
            ];
        }

        /**
         * Process the selected layers for a product and generate the corresponding image paths.
         *
         * @param string $product_sku The SKU of the product.
         * @param array $selectedLayers The selected layers for the product.
         * @return array The processed image paths.
         */
        public static function processLayers($product_sku, $selectedLayers) {

            // Base folder location for layer images
            $base_folder = ABSPATH . 'wp-content/themes/tm-shop-child/assets/layers';

            // Extract base and top layer identifiers from SKU using regex
            preg_match('/^(.*?)-bp(.*)$/', $product_sku, $matches);

            // Extract layer values from product SKU, with fallbacks to empty strings
            $top_layer = rtrim($matches[1] ?? '', '-');
            $base_layer = 'bp' . ($matches[2] ?? '');

            // Determine shadow layer by checking for hyphen in top layer
            $shadow_layer = strpos($top_layer, '-') !== false
                ? explode('-', $top_layer)[0]
                : $top_layer;

            // Determine if metal layer is present based on 'metal' keyword in top layer
            $metal_layer = strpos($top_layer, 'metal') !== false ? $top_layer : null;

            // Hyphenate colour names to maintain image file naming convention
            $format = fn($v) => str_replace(' ', '-', strtolower($v));

            // Build array of image paths for each layer, using the formatted selected layer values
            return array_filter([
                'shadow' => "$base_folder/{$shadow_layer}-shadow.png",
                'base'   => "$base_folder/{$base_layer}-" . $format($selectedLayers['base']) . '.png',
                'metal'  => $metal_layer ? "$base_folder/{$metal_layer}-" . $format($selectedLayers['metal']) . '.png' : null,
                'top'    => "$base_folder/{$top_layer}-" . $format($selectedLayers['top']) . '.png',
            ]);
        }

        /**
         * Build a composite image from the given layer paths.
         *
         * @param array $paths The paths to the layer images.
         * @return string|false The path to the generated composite image or false on failure.
         */
        public static function buildCompositeImage(array $paths) {

            // Generate a unique hash based on the layer paths to use for caching
            $hash = md5(json_encode($paths));

            // Define file paths for the composite images based on the hash
            $dir = ABSPATH . 'wp-content/themes/tm-shop-child/assets/layers/composites';

            // Set image paths for different sizes based on the hash
            $file700  = "$dir/{$hash}-700.png";
            $file1600 = "$dir/{$hash}-1600.png";
            $file400  = "$dir/{$hash}-400.png";

            // Accept timings array by reference for profiling
            $timings = func_num_args() > 1 ? func_get_arg(1) : null;

            // If images already exist return cached versions and skip generation
            if (file_exists($file700)) {
                if (!file_exists($file1600)) {
                    self::generateOtherSizes($paths, $file1600, $file400);
                }
                if (is_array($timings)) {
                    $timings['cached'] = true;
                }
                return str_replace(ABSPATH, '', $file700);
            }

            // Build composite image using Imagick
            try {

                // Start timing the composite image generation (testing purposes - to be removed in production)
                $step_start = microtime(true);

                // Initialize base image variable
                $base = null;

                // Loop through each layer path and composite them together
                foreach ($paths as $path) {

                    // Skip if layer image doesn't exist (e.g. metal layer not present for all products)
                    if (!file_exists($path)) continue;

                    // Load the layer image using Imagick
                    $img = new \Imagick($path);

                    // Ensure the image has a transparent background for proper compositing
                    $img->setImageBackgroundColor(new \ImagickPixel('transparent'));

                    // If this is the first layer, set it as the base image. Otherwise, composite it over the base.
                    if (!$base) {
                        $base = $img;
                        continue;
                    }

                    // Composite the current layer image over the base image at position (0,0)
                    $base->compositeImage($img, \Imagick::COMPOSITE_OVER, 0, 0);
                    
                    // Clear and destroy the layer image to free up memory
                    $img->clear();
                    
                    // Destroy the Imagick object to free resources
                    $img->destroy();

                }

                // Record timing for composite image generation step (testing purposes - to be removed in production)
                if (is_array($timings)) {
                    $timings['composite'] = microtime(true) - $step_start;
                }

                // If no base image was created (e.g. all layer images were missing), return false
                if (!$base) return false;

                // Time the 700px image generation step (testing purposes - to be removed in production)
                $step_700 = microtime(true);
                
                // Create a clone of the base image to generate the 700px version
                $img700 = clone $base;
                
                // Resize the image to a width of 700px while maintaining aspect ratio
                $img700->thumbnailImage(700, 0);
                
                // Save the generated image to the specified file path
                $img700->writeImage($file700);
                
                // Record timing for 700px image generation step (testing purposes - to be removed in production)
                if (is_array($timings)) {
                    $timings['700'] = microtime(true) - $step_700;
                }

                // Clear and destroy the 700px image to free up memory
                $img700->clear();
                $img700->destroy();

                // Other sizes
                $step_other = microtime(true);
                
                // Generate the other image sizes (1600px and 400px) from the base image
                self::generateOtherSizesFromBase($base, $file1600, $file400);
                
                // Record timing for other image sizes generation step (testing purposes - to be removed in production)
                if (is_array($timings)) {
                    $timings['other_sizes'] = microtime(true) - $step_other;
                }

                // Clear and destroy the base image to free up memory
                $base->clear();
                $base->destroy();

                // Return the URL path to the generated 700px composite image, removing the ABSPATH prefix for correct URL formatting
                return str_replace(ABSPATH, '', $file700);

            } catch (\Exception $e) {
                error_log('[TMPC] Imagick error: ' . $e->getMessage());
                return false;
            }
        }

        /**
         * Generate other image sizes (1600px and 400px) from the base image
         *
         * @param \Imagick $base The base image
         * @param string $file1600 The file path for the 1600px image
         * @param string $file400 The file path for the 400px image
         * @return void
         */
        private static function generateOtherSizesFromBase($base, $file1600, $file400) {

            // If the 1600px image already exists, skip generation
            if (file_exists($file1600)) return;

            // Create a clone of the base image to generate the 1600px version
            $img1600 = clone $base;
            $img1600->thumbnailImage(1600, 0);
            $img1600->writeImage($file1600);

            // Create a clone of the base image to generate the 400px version
            $img400 = clone $img1600;
            $img400->thumbnailImage(400, 0);
            $img400->writeImage($file400);

            // Clear and destroy the generated images to free up memory
            $img1600->clear(); $img1600->destroy();
            $img400->clear();  $img400->destroy();

        }

        /**
         * Generate other image sizes (1600px and 400px) from a set of image paths
         *
         * @param array $paths The array of image paths
         * @param string $file1600 The file path for the 1600px image
         * @param string $file400 The file path for the 400px image
         * @return void
         */
        private static function generateOtherSizes($paths, $file1600, $file400) {

            // If the 1600px image already exists, skip generation
            if (file_exists($file1600)) return;

            // Build the composite image from the provided layer paths
            try {

                // Initialize base image variable
                $base = null;

                // Loop through each layer path and composite them together to create the base image
                foreach ($paths as $path) {

                    // Skip if layer image doesn't exist (e.g. metal layer not present for all products)
                    if (!file_exists($path)) continue;

                    // Load the layer image using Imagick
                    $img = new \Imagick($path);

                    // Ensure the image has a transparent background for proper compositing
                    if (!$base) {
                        $base = $img;
                        continue;
                    }

                    // Composite the current layer image over the base image at position (0,0)
                    $base->compositeImage($img, \Imagick::COMPOSITE_OVER, 0, 0);
                    $img->clear();
                    $img->destroy();
                }

                // If no base image was created (e.g. all layer images were missing), return early
                if (!$base) return;

                // Generate the 1600px image from the base image
                self::generateOtherSizesFromBase($base, $file1600, $file400);

                // Clear and destroy the base image to free up memory
                $base->clear();
                $base->destroy();

            } catch (\Exception $e) {
                error_log('[TMPC] Imagick resize error: ' . $e->getMessage());
            }
        }

        /**
         * Determine product type from WP categories
         *
         * @param object $product
         * @return string|null Returns 'solid', 'slim', 'edge' or null if no match
         */
        public static function get_product_type($product) {

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
    }