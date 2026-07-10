<?php

    namespace TmThreeViewer\CurrentStatus;

    use TmThreeViewer\Data\TM3D_Data;
    use TmThreeViewer\Images\TM3D_Images;
    use WP_REST_Request;

    class TM3D_CreatedByUs {

        /**
         * Initialize the REST API route for "Created By Us" section
         *
         * @return void
         */
        public static function init() {

            add_action('rest_api_init', function () {
                register_rest_route('tm3d/v1', '/created-by-us', [
                    'methods' => 'POST',
                    'callback' => [self::class, 'render_created_by_us'],
                    'permission_callback' => '__return_true',
                ]);
            });

        }

        /**
         * Render created by us section
         *
         * @return string
         */
        public static function render_created_by_us($request_or_id = null): string {

            $id = null;

            if ($request_or_id instanceof WP_REST_Request) {
                $id = absint($request_or_id->get_param('id'));
            } else {
                $id = absint($request_or_id);
            }

            if (!$id) {
                return '';
            }

            ob_start();

            // Fetch product data for current product
            $product_data = TM3D_Data::getProductData();

            // Resolve product type so we can pull the correct colour options subset.
            $product_type = TM3D_Data::get_product_type($id);
            $colour_options_by_top = $product_type ? ($product_data[$product_type]['colour_options'] ?? []) : [];

            ?>
                <div class="created-by-us text-center">
                    <h3>Created By Us</h3>
                    <p>A selection of our most popular colour and finish pairings. Click to load configuration.</p>
                </div> 
            <?php

            // Get product and SKU for current product
            $product = wc_get_product($id);

            if (!$product) {
                return '';
            }

            $sku = $product->get_sku();

            // Check if we've already generated configs for this product to avoid creating new ones on every page load
            $existing_configs = get_post_meta($id, '_tmpc_created_by_us_configs', true);

            // If configs already exist for this product, use them. Otherwise, generate new
            if ($existing_configs) {
                $configs = $existing_configs;
            } else {
                // Array to hold configs
                $configs = [];
            }

            // If no existing configs and product data contains colour options, generate configs
            if (empty($existing_configs) && !empty($colour_options_by_top)) {
                
                // Re-index array keys
                $colour_options = array_values($colour_options_by_top);
        
                // Limit to 8 configurations
                $colour_options = array_slice($colour_options, 0, 8);   
        
                foreach($colour_options as $colour_option) {

                    if (empty($colour_option['top']['name'])) {
                        continue;
                    }
        
                    // Assign top colour
                    $top = $colour_option['top']['name'];

                    // Flatten available base options (tile/wood) to a single list of colour names.
                    $base_candidates = [];
                    foreach ((array) ($colour_option['base'] ?? []) as $base_group) {
                        foreach ((array) $base_group as $base_name) {
                            if (is_string($base_name) && $base_name !== '') {
                                $base_candidates[] = $base_name;
                            }
                        }
                    }

                    if (empty($base_candidates)) {
                        continue;
                    }
        
                    // Randomly select a base colour from the available options for this product
                    $base_key = array_rand($base_candidates);
                    $base = $base_candidates[$base_key];
        
                    // Build config array for this combination
                    $config = [
                        'top' => $top,
                        'base' => $base
                    ];
        
                    // If a metal option exists for this product, randomly select one and add to config
                    if (!empty($colour_option['metal'])) {

                        $metal_candidates = array_values(array_filter((array) $colour_option['metal'], function($metal_name) {
                            return is_string($metal_name) && $metal_name !== '';
                        }));

                        if (!empty($metal_candidates)) {
        
                            $metal_key = array_rand($metal_candidates);
                            $metal = $metal_candidates[$metal_key];
                            $config['metal'] = $metal;

                        }
                    }
        
                    // Add this config to the configs array
                    $configs[] = $config;
        
                }

                // Randomise order of configs so that items aren't alphabetical
                shuffle($configs);

                // Limit total configs to 8 after filtering/skips.
                $configs = array_slice($configs, 0, 8);
        
                // Save configs to post meta for future order
                update_post_meta($id, '_tmpc_created_by_us_configs', $configs);
            }


            ?>

            <div class="created-by-us-configurations">

                <?php foreach ($configs as $layers) {

                    // Generate image paths for this configuration
                    $paths = TM3D_Images::processLayers($sku, $layers);
                    
                    // Build composite image for this configuration and get URL
                    TM3D_Images::buildCompositeImage($paths);
                    
                    // Generate a unique hash for this configuration to use in the image filename
                    $hash = md5(json_encode($paths));
                    
                    // Construct the image URL using the hash
                    $dir = site_url('wp-content/themes/tm-shop-child/assets/layers/composites');
                    
                    // Get 400 size image
                    $img_url = "$dir/{$hash}-400.png";

                ?>
                    <a href="#3d-model" class="created-by-us-configuration"
                    data-top="<?php echo esc_attr($layers['top']); ?>"
                    data-base="<?php echo esc_attr($layers['base']); ?>"
                    <?php if (isset($layers['metal'])) : ?>
                        data-metal="<?php echo esc_attr($layers['metal']); ?>"
                    <?php endif; ?>
                    >
                        <img loading="lazy" 
                            decoding="async" 
                            fetchpriority="low"
                            width="268"
                            height="109"
                            src="<?php echo esc_url($img_url); ?>" 
                            class="created-by-us-img" 
                            alt="Created by us configuration image showing <?php echo esc_attr(ucwords($layers['top'])); ?> top, <?php echo esc_attr(ucwords($layers['base'])); ?> base<?php if (isset($layers['metal'])) : ?> and <?php echo esc_attr(ucwords($layers['metal'])); ?> metal edge<?php endif; ?>">
                        <ul class="created-by-us-product-details">
                            <li class="top-layer">
                                <?php echo esc_html(ucwords($layers['top'])); ?>
                            </li>
                            <li class="base-layer">
                                Base: <?php echo esc_html(ucwords($layers['base'])); ?>
                            </li>
                            <?php if (isset($layers['metal'])) : ?>
                                <li class="metal-layer">
                                    Edge Veneer: <?php echo esc_html(ucwords($layers['metal'])); ?>
                                </li>
                            <?php endif; ?>
                        </ul>
                    </a>

                <?php } ?>

            </div>

            <?php

            return ob_get_clean();

        }

    }