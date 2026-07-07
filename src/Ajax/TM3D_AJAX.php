<?php

    namespace TmThreeViewer\Ajax;

    class TM3D_Ajax {

        public static function init() {

            // AJAX handler for adding configured product to cart
            add_action('wp_ajax_tm_add_to_cart', [__CLASS__, 'ajax_add_product_to_cart']);
            add_action('wp_ajax_nopriv_tm_add_to_cart', [__CLASS__, 'ajax_add_product_to_cart']);

            // Add swatch to cart
            add_action('wp_ajax_add_swatch_to_cart', [__CLASS__, 'ajax_add_swatch_to_cart']);
            add_action('wp_ajax_nopriv_add_swatch_to_cart', [__CLASS__, 'ajax_add_swatch_to_cart']);

            add_filter('woocommerce_get_item_data', [__CLASS__, 'tm_add_swatch_note_to_cart_item'], 10, 2);
            add_action('woocommerce_checkout_create_order_line_item', [__CLASS__, 'tm_add_swatch_note_to_order_item'], 10, 3);

        }

        /**
         * Add product to cart via AJAX (includes swatches on their single product page)
         */
        public static function ajax_add_product_to_cart() {

            // Validate product ID and quantity
            $product_id = isset($_POST['product_id']) ? absint($_POST['product_id']) : 0;
            $quantity   = isset($_POST['quantity']) ? wc_stock_amount($_POST['quantity']) : 1;

            // If product doesn't exist or isn't published, return error
            if (!$product_id || 'publish' !== get_post_status($product_id)) {
                wp_send_json_error([
                    'error'       => true,
                    'product_url' => get_permalink($product_id),
                    'message'     => 'Invalid product.'
                ]);
            }

            // Get the product object
            $product = wc_get_product($product_id);

            // If product is variable or grouped, return error (this handler is for simple products only)
            if ($product->is_type('variable') || $product->is_type('grouped')) {
                wp_send_json_error([
                    'error'       => true,
                    'product_url' => get_permalink($product_id),
                    'message'     => 'Unsupported product type.'
                ]);
            }

            // Collect custom fields
            $cart_item_data = [];

            $fields = [
                'top_colour'           => 'sanitize_text_field',
                'base'                 => 'sanitize_text_field',
                'model'                => 'sanitize_text_field',
                'img_url'              => 'esc_url_raw',
                'metal_edge_veneer'    => 'sanitize_text_field',
                'metal-edge-checkbox'  => 'sanitize_text_field',
                'product_url'          => 'esc_url_raw',
            ];
            
            // Add cost reimbursement note if this is a swatch
            if (has_term('swatch', 'product_cat', $product_id)) {	
                $fields['note'] = 'sanitize_text_field';
            }
            
            // Map POST keys to custom internal keys if needed
            $key_map = [
                'img_url'              => 'custom_image',
                'metal-edge-checkbox'  => 'metal_edge_checkbox',
                'product_url'          => 'custom_product_url',
            ];

            foreach ($fields as $key => $sanitizer) {
                if (!empty($_POST[$key])) {

                    // Use the mapped key if it exists; otherwise use the original key
                    $normalized_key = $key_map[$key] ?? $key;

                    // Sanitize and assign the value to the cart item data array
                    // The sanitizer function (e.g., sanitize_text_field or esc_url_raw) is called dynamically
                    $cart_item_data[$normalized_key] = $sanitizer($_POST[$key]);
                }
            }
            
            // Add product to cart
            $added = WC()->cart->add_to_cart($product_id, $quantity, 0, [], $cart_item_data);

            if (!$added) {
                wp_send_json_error([
                    'error'       => true,
                    'product_url' => get_permalink($product_id),
                    'message'     => 'Could not add product to cart.'
                ]);
            }

            // Update mini cart HTML after addition
            ob_start();
            woocommerce_mini_cart();
            $mini_cart = ob_get_clean();

            $cart_count = WC()->cart->get_cart_contents_count();

            $fragments = [
                'div.widget_shopping_cart_content' => '<div class="widget_shopping_cart_content">' . $mini_cart . '</div>',
                'span.header-items-count'          => '<span class="header-items-count">' . $cart_count . '</span>',
            ];

            wp_send_json_success([
                'message'   => 'Product added to cart!',
                'fragments' => $fragments,
                'cart_hash' => WC()->cart->get_cart_hash(),
            ]);
            exit;
        }

        /**
         * AJAX handler to add swatch product to cart
         */
        public static function ajax_add_swatch_to_cart() {

            // Validate product IDs
            $product_ids = json_decode(stripslashes($_POST['product_ids']));

            // Ensure we have an array of valid product IDs
            if ( ! $product_ids || ! is_array($product_ids) || array_filter($product_ids, 'is_nan') ) {
                wp_send_json_error( ['message' => 'Invalid product.'] );
                exit;
            }

            // Add product with hardcoded note
            $cart_item_data = [
                'swatch_note' => 'Refunded with furniture purchase'
            ];

            // If a metal edge veneer checkbox value is sent, include it in the cart item data
            if (isset($_POST['metal-edge-checkbox'])) {
                $cart_item_data['metal_edge_checkbox'] = sanitize_text_field($_POST['metal-edge-checkbox']);
            }

            // Add each selected swatch to cart
            foreach ($product_ids as $product_id) {
                
                $added = WC()->cart->add_to_cart($product_id, 1, 0, [], $cart_item_data);
    
                // If any addition fails, return an error response
                if ( ! $added ) {
                    wp_send_json_error( ['message' => 'Could not add product to cart.'] );
                    exit;
                }

            }

            // Mini cart HTML
            ob_start();
            woocommerce_mini_cart();
            $mini_cart = ob_get_clean();

            wp_send_json_success([
                'message'   => count($product_ids) > 1 ? count($product_ids) . ' Swatches added to cart!' : 'Swatch added to cart!',
                'fragments' => [
                    'div.widget_shopping_cart_content' => '<div class="widget_shopping_cart_content">' . $mini_cart . '</div>',
                    'span.header-items-count'          => '<span class="header-items-count">' . WC()->cart->get_cart_contents_count() . '</span>'
                ],
                'cart_hash' => WC()->cart->get_cart_hash(),
            ]);
            exit;
        }

        /**
         * Show note in cart & checkout
         *
         * @param array $item_data
         * @param array $cart_item
         * @return array
         */
        public static function tm_add_swatch_note_to_cart_item($item_data, $cart_item) {
            if (isset($cart_item['swatch_note'])) {
                $item_data[] = [
                    'name'  => 'Note',
                    'value' => esc_html($cart_item['swatch_note'])
                ];
            }
            return $item_data;
        }

        /**
         * Save note to order
         *
         * @param \WC_Order_Item_Product $item
         * @param string $cart_item_key
         * @param array $values
         * @return void
         */
        public static function tm_add_swatch_note_to_order_item($item, $cart_item_key, $values) {
            if (isset($values['swatch_note'])) {
                $item->add_meta_data('Note', $values['swatch_note']);
            }
        }
    }