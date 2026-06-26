<?php

    namespace TmThreeViewer\Model;

    use TmThreeViewer\Assets\TM3D_Assets;
    use TmThreeViewer\Data\TM3D_Data;

    class TM3D_Model

    {

        private static bool $import_map_printed = false;
        private static array $data = [];
        private static array $models = [];
        private static array $product_data = [];
        private static array $initial_state = [];

        /**
         * Initialise class by loading models and product data, registering shortcode, and converting JS scripts to module type
         *
         * @return void
         */
        public static function init()

        {

            // Load models and product data from the database and transient cache
            self::$data = TM3D_Data::getData();
            self::$models = self::$data['models'] ?? [];
            self::$product_data = self::$data['product_data'] ?? [];
            self::$initial_state = self::$data['initial_state'] ?? [];

            // Register the shortcode for the 3D model viewer
            add_shortcode('tm_model_viewer', [self::class, 'render_product_viewer']);

        }

        /**
         * Render the shortcode for the 3D model viewer
         *
         * @return string HTML output for the shortcode
         */
        public static function render_product_viewer()

        {

            // Enqueue necessary scripts and styles
            TM3D_Assets::enqueue_assets(self::$data);

            // Render the import map and the configurator drawers
            return self::import_map_markup() . self::render_drawers();

        }

        /**
         * Render the import map markup for the 3D model viewer
         *
         * @return string HTML script tag with import map
         */
        private static function import_map_markup(): string
        
        {
            
            // Ensure the import map is only printed once
            if (self::$import_map_printed) {
                return '';
            }

            // Mark the import map as printed to prevent duplicate output
            self::$import_map_printed = true;

            // Return the import map markup with the required module imports
            return '<script type="importmap">
            {
                "imports": {
                    "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
                    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
                }
            }
            </script>';
        }

        /**
         * Determine product type from WP categories
         *
         * @param object $product
         * @return string|null Returns 'solid', 'slim', 'edge' or null if no match
         */
        public static function get_product_type($product) {

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
         * Render config drawers
         *
         * @return string
         */
        public static function render_drawers(): string {

            // Extract first model to populate filters and options with default values
            //$first_model = self::$models[array_key_first(self::$models)] ?? [];

            if (empty(self::$models)) {
                return '<div class="configurator-error">No models found</div>';
            }

            $first_id = self::$initial_state['id'] ?? array_key_first(self::$models);
            $product  = wc_get_product(self::$models[$first_id]['id']);

            if (!$product) {
                return '<div class="configurator-error">Invalid product</div>';
            }

            // Determine product type based on WP categories
            $product_type = self::get_product_type($product);

            // Filter the colour options data based on product type
            $filtered_colour_options = self::$product_data[$product_type]['colour_options'] ?? [];

            // Determine which top colour is currently selected to conditionally show/hide base and metal options based on top selection
            $current_top = implode('_', explode(' ', self::$initial_state['top'] ?? []));

            // Get allowed bases for the current top selection from the colour options data
            $bases_for_current_top = $filtered_colour_options[$current_top]['base'] ?? [];

            // Get allowed metals for the current top selection from the colour options data
            $metals_for_current_top = $filtered_colour_options[$current_top]['metal'] ?? [];

            if (!self::$product_data) {
                return '<div class="configurator-error">Missing configurator cache</div>';
            }

            ob_start();

            ?>
            
                <div id="3d-model" class="create-your-own">
                    <h3>Create Your Own</h3>
                    <p class="create-your-own-description">Personalise every detail and preview your table instantly.</p>
                </div>
            
            
                <div class="configurator last-opened-none" id="configurator">
                    <!-- 3D viewer -->
                    <div id="obj3dviewer" item-name="<?php echo esc_attr(self::$initial_state['sku']); ?>" data-version="<?php echo esc_attr(TMPC_VERSION); ?>">
                        <section id="loading-screen"><div id="loader"></div></section>
                        <a href="#" class="obj3dviewer-toggle">Full Screen</a>
                    </div>
                    <!-- End 3D viewer -->

                    <div class="playground">
                        <div class="config-options">
                            <ul class="config-option-buttons">
                                <li class="config-option-product-type">
                                    <div class="config-option-button" id="option-product-type">
                                        <i class="fa-regular fa-circle-1"></i><span>Product Type</span> Select product type
                                    </div>
                                </li>
                                <li class="config-option-model">
                                    <div class="config-option-button" id="option-model">
                                        <i class="fa-regular fa-circle-2"></i><span>Model Size</span> Select size
                                    </div>
                                </li>
                                <li class="config-option-top-colour">
                                    <div class="config-option-button" id="option-top-colour">
                                        <i class="fa-regular fa-circle-3"></i><span>Surface</span> Select surface
                                    </div>
                                </li>
                                <li class="config-option-base">
                                    <div class="config-option-button" id="option-base">
                                        <i class="fa-regular fa-circle-4"></i><span>Base Finish</span> Select base
                                    </div>      
                                </li>
                                <li class="config-option-metal-edge-veneer">
                                    <div class="config-option-button" id="option-metal-edge-veneer">
                                        <i class="fa-regular fa-circle-5"></i><span>Metal Edge</span> Select edge
                                    </div>
                                </li>
                            </ul>
                        </div><!-- end config-options -->
                        <div class="config-selectors" id="slideout">
                            <div id="configCloseButton" class="config-close" title="Close">
                                <i class="fa fa-times fa-lg">
                                <span class="sr-only">Close configurator</span>
                                </i>
                            </div><!-- end config-close -->
                            <div class="wapf">
                                <div class="wapf-wrapper">
                                    <div class="wapf-field-group">
                                        <div class="obj-product-type wapf-field-container">
                                            <div class="wapf-field-label"><label><span>Product Type</span></label></div>
                                            <div class="wapf-field-group">
                                                <div class="wapf-image-swatch-wrapper">
                                                <input type="hidden" class="wapf-tf-h" value="0" name="product_type">
                                                    <?php foreach(self::$models as $model) : ?>
                                                        <div class="wapf-swatch wapf-swatch--image apf-pick-box">
                                                            <label aria-label="<?php echo $model['title']; ?>">
                                                                <input 
                                                                    id="<?php echo esc_attr($model['id']); ?>"
                                                                    type="radio" 
                                                                    name="product_type" 
                                                                    class="wapf-input"
                                                                    value="<?php echo esc_attr($model['title']); ?>" 
                                                                    <?php echo (self::$initial_state['id'] === $model['id']) ? 'checked' : ''; 
                                                                    ?>
                                                                    data-sku="<?php echo esc_attr($model['sku']); ?>"
                                                                    data-product-type="<?php echo esc_attr($model['product_type']); ?>"
                                                                >
                                                                <div>
                                                                    <img class="swatch" src="<?php echo $model['url']; ?>" alt="<?php echo $model['title']; ?>"/>
                                                                </div>
                                                                <div class="wapf-swatch-label"><?php echo $model['title']; ?></div>
                                                            </label>
                                                        </div>
                                                        
                                                    <?php endforeach; ?>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="obj-top-colour wapf-field-container">
                                            <div class="wapf-field-label"><label><span>Top Colour</span></label></div>
                                            <div class="wapf-field-group">
                                                <div class="wapf-image-swatch-wrapper">
                                                <input type="hidden" class="wapf-tf-h" value="0" name="top_colour">
                                                    <?php foreach($filtered_colour_options as $colour_option) : ?>
                                                        <div class="wapf-swatch wapf-swatch--image apf-pick-box">
                                                            <label aria-label="<?php echo $colour_option['top']['name']; ?>">
                                                                <input 
                                                                    type="radio" 
                                                                    name="top_colour" 
                                                                    class="wapf-input"
                                                                    value="<?php echo esc_attr($colour_option['top']['name']); ?>" 
                                                                    <?php echo (self::$initial_state['top'] === $colour_option['top']['name']) ? 'checked' : ''; 
                                                                    ?>
                                                                    data-sample-id="<?php echo esc_attr($colour_option['top']['sample_id']); ?>"
                                                                >
                                                                <div>
                                                                    <img class="swatch" src="<?php echo $colour_option['top']['url']; ?>" alt="<?php echo $colour_option['top']['name']; ?>"/>
                                                                </div>
                                                                <div class="wapf-swatch-label"><?php echo $colour_option['top']['name']; ?></div>
                                                            </label>
                                                        </div>
                                                        
                                                    <?php endforeach; ?>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="obj-base wapf-field-container wapf-field-image-swatch field-35e4fc4 wapf-required" style="width:100%;" for="35e4fc4">
                                            <div class="wapf-field-label">
                                                <label><span>Base</span> <abbr class="required" title="required">*</abbr></label>
                                            </div>
                                            <div class="wapf-field-input">
                                                <div class="wapf-image-swatch-wrapper wapf-swatch-wrapper" style="--wapf-cols:auto-fill;--apf-col-width:68px">
                                                    
                                                    <input type="hidden" class="wapf-tf-h" value="0" name="base_colour">

                                                    <?php foreach(self::$product_data['master_values'][$product_type]['base'] as $base) : ?>

                                                        <div class="wapf-swatch wapf-swatch--image wapf-single-select apf-pick-box" style="<?php echo (in_array($base['name'], $bases_for_current_top)) ? 'display: inline;' : 'display: none;'; ?>">
                                                            <label aria-label="<?php echo esc_attr($base['name']); ?>">
                                                                <input
                                                                    type="radio"
                                                                    name="base_colour"
                                                                    class="wapf-input"
                                                                    value="<?php echo esc_attr($base['name']); ?>"
                                                                    <?php echo (self::$initial_state['base'] === $base['name']) ? 'checked' : ''; ?>
                                                                    data-sample-id="<?php echo esc_attr($base['sample_id'] ?? ''); ?>"
                                                                >
                                                                <div>
                                                                    <img class="swatch" src="<?php echo esc_url($base['url'] ?? ''); ?>" alt="<?php echo esc_attr($base['name']); ?>" />
                                                                </div>
                                                                <div class="wapf-swatch-label"><?php echo $base['name']; ?></div>
                                                            </label>
                                                        </div>

                                                    <?php endforeach; ?>
                                                    <!-- End dynamic swatches -->
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <?php if(array_key_exists('metal', self::$product_data['master_values'][$product_type])) : ?>
                                                <div class="obj-metal-edge-veneer wapf-field-container wapf-field-image-swatch field-6a9c491 wapf-required" style="width:100%;" for="6a9c491">
                                                    <div class="wapf-field-label">
                                                        <label><span>Metal Edge Veneer</span> <abbr class="required" title="required">*</abbr></label>
                                                    </div>
                                                    <div class="wapf-field-input">
                                                        <div class="wapf-image-swatch-wrapper wapf-swatch-wrapper" style="--wapf-cols:auto-fill;--apf-col-width:68px">
                                                            <input type="hidden" class="wapf-tf-h" value="0" name="metal_edge_veneer">

                                                                <?php foreach(self::$product_data['master_values'][$product_type]['metal'] as $metal) : ?>
                                
                                                                    <div class="wapf-swatch wapf-swatch--image wapf-single-select apf-pick-box" style="<?php echo (in_array($metal['slug'], $metals_for_current_top)) ? 'display: inline;' : 'display: none;'; ?>">
                                                                        <label aria-label="<?php echo esc_attr($metal['name']); ?>">
                                                                            <input
                                                                                type="radio"
                                                                                name="metal_edge_veneer"
                                                                                class="wapf-input"
                                                                                value="<?php echo esc_attr($metal['name']); ?>"
                                                                                <?php echo (self::$initial_state['metal'] === $metal['name']) ? 'checked' : ''; ?>
                                                                            >
                                                                            <div>
                                                                                <img class="swatch" src="<?php echo esc_url($metal['url'] ?? ''); ?>" alt="<?php echo esc_attr($metal['name']); ?>" />
                                                                            </div>
                                                                            <div class="wapf-swatch-label"><?php echo $metal['name']; ?></div>
                                                                        </label>
                                                                    </div>
                                
                                                                <?php endforeach; ?>
                                                                <!-- End dynamic swatches -->
                                                        </div>
                                                    </div>
                                                </div>
                                            <?php endif; ?>
                                            <div class="obj-model wapf-field-container wapf-field-select field-2e633bf wapf-required has-pricing" style="width:100%;" for="2e633bf">
                                                <div class="wapf-field-label">
                                                    <label for="wapf-4586-2e633bf"><span>Model</span> <abbr class="required" title="required">*</abbr></label>
                                                </div>
                                                <div class="wapf-field-input">
                                                    <select name="product-model-size" class="wapf-input">
                                                        <?php foreach(self::$initial_state['model_sizes'] as $model) : ?>
                                                            <?php
                                                                $inc_vat = wc_get_price_including_tax(wc_get_product(self::$initial_state['id']), array('price' => $model['price']));
                                                            ?>
                                                            <option 
                                                                value="<?php echo esc_attr($model['label']); ?>" 
                                                                data-label="<?php echo esc_attr($model['label']); ?>" 
                                                                data-wapf-price="<?php echo esc_attr($inc_vat); ?>" 
                                                                data-ex-vat="<?php echo esc_attr($model['price']); ?>" 
                                                                <?php echo $model['is_default'] ? 'selected' : ''; ?>>
                                                                <?php echo esc_html($model['label']); ?>
                                                                <?php
                                                                if ($model['price'] > 0) {
                                                                    echo '<span class="price-label">(+'. wc_price($inc_vat) . ')</span>';
                                                                }
                                                                ?>
                                                            </option>
                                                        <?php endforeach ?>
                                                    </select>
                                                </div>
                        
                                                <div class="wapf-field-description">
                                                    <span class="model-dims">
                                                        <?php foreach(self::$initial_state['model_sizes'] as $model) : ?>
                                                            <span class="model-dim model-<?php echo esc_html($model['label']); ?>"><?php echo esc_html($model['dims']); ?></span>
                                                        <?php endforeach; ?>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                        
                            <?php if (get_field('acf_3d_model_name')) : // if model exists show end of 3d viewer ?>
                
                            </div><!-- end config-selectors -->
                        </div><!-- end playground -->
                    <div id="configMask" class="config-mask"></div>
                </div><!-- end configurator -->	
            
            <?php endif;
            
            return ob_get_clean();
            
        }

    }