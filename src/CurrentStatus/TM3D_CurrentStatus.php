<?php

namespace TmThreeViewer\CurrentStatus;

use TmThreeViewer\Images\TM3D_Images;

class TM3D_CurrentStatus {

    /**
     * Render the current status markup as a string so it can be added to shortcode output.
     *
     * @param array $data The data to be used for rendering the current status.
     * @return string
     */
    public static function render_current_status($data): string {

        // Start output buffering to capture the HTML output
        ob_start();

        // Call the method to output the current status section
        self::add_current_status($data);

        // Call the method to output the add to basket section
        self::addToBasket($data);

        // Get the buffered output and return it as a string
        return ob_get_clean();

    }

    /**
     * Render the current status section on the product page, showing the selected options and a preview image
     * @param array $data should contain the initial state and selected options for the product.
     * @return void
     */
    public static function add_current_status($data) {

        ?>

            <div class="current-status-container">
                <div class="current-status">
                    <h3>Your Creation</h3>
                    <div class="current-status-wrapper">
                        <div class="qrcode"></div>
                        <div class="current-status-swatches">
                            <div class="status-price-container">
                                <p class="status-title bold"><?php echo $data['initial_state']['title'] ?? ''; ?></p> 
                                <p class="status-price" data-ex-vat-price-base="<?php echo $data['initial_state']['price'] ?? ''; ?>"></p>
                                <?php $top_colour = $data['initial_state']['top'] ?? ''; ?>

                                <?php if($top_colour) : ?>

                                    <p class="bold">Surface</p>
                                    <span class="obj-top-colour"><?php echo $top_colour; ?></span>

                                <?php endif; ?>

                                <?php $base_colour = $data['initial_state']['base'] ?? ''; ?>

                                <?php if($base_colour) : ?>

                                    <p class="bold">Base Finish</p>
                                    <span class="obj-base"><?php echo $base_colour; ?></span>

                                <?php endif; ?>

                                <?php $metal_colour = $data['initial_state']['metal'] ?? ''; ?>

                                <?php if($metal_colour) : ?>

                                    <p class="bold">Metal Edge</p>
                                    <span class="obj-metal-edge-veneer"><?php echo $metal_colour; ?></span>

                                <?php endif; ?>
                                <div class="status-seats"></div>
                            </div>
                            <input type="hidden" name="configured_total" id="configured-total" value="" />
                            <div class="status-layers">
                                <div class="status-layer-images">
                                    <div class="obj-top-colour status-layer">
                                        <div class="status-layer-img">
                                            <a href="<?php echo esc_url($data['initial_state']['swatch_urls']['top']); ?>"
                                                data-pswp-src="<?php echo esc_url($data['initial_state']['swatch_urls']['top']); ?>"
                                                data-pswp-width="700"
                                                data-pswp-height="1200"
                                                data-pswp-gallery="woocommerce-gallery">
                                                <img 
                                                loading="lazy" 
                                                decoding="async" 
                                                fetchpriority="low"
                                                width="150"
                                                height="150"
                                                src="<?php echo esc_url($data['initial_state']['swatch_urls']['top']); ?>"
                                                alt="Top Colour image swatch"
                                                >
                                            </a>
                                        </div>
                                        <p class="status-layer-title">Top Colour</p>
                                        <p class="status-layer-colour <?php echo implode('-', explode(' ', $top_colour)); ?>-finish"><?php echo $top_colour; ?></p>
                                    </div>

                                    <div class="obj-base status-layer">
                                        <div class="status-layer-img">
                                            <a href="<?php echo esc_url($data['initial_state']['swatch_urls']['base']); ?>"
                                                data-pswp-src="<?php echo esc_url($data['initial_state']['swatch_urls']['base']); ?>"
                                                data-pswp-width="700"
                                                data-pswp-height="1200"
                                                data-pswp-gallery="woocommerce-gallery">
                                                <img 
                                                    loading="lazy" 
                                                    decoding="async" 
                                                    fetchpriority="low"
                                                    width="150"
                                                    height="150"
                                                    src="<?php echo esc_url($data['initial_state']['swatch_urls']['base']); ?>"
                                                    alt="Base Colour image swatch"
                                                >
                                            </a>
                                        </div>
                                        <p class="status-layer-title">Base Colour</p>
                                        <p class="status-layer-colour <?php echo implode('-', explode(' ', $base_colour)); ?>-finish"><?php echo $base_colour; ?></p>
                                    </div>

                                    <?php if (!empty($data['selected']['metal']) && !empty($data['selected']['metal']['url'])): ?>
                                    <div class="obj-metal-edge-veneer status-layer">
                                        <div class="status-layer-img">
                                            <a href="<?php echo esc_url($data['selected']['metal']['url']); ?>"
                                                data-pswp-src="<?php echo esc_url($data['selected']['metal']['url']); ?>"
                                                data-pswp-width="886"
                                                data-pswp-height="187"
                                                data-pswp-gallery="woocommerce-gallery">
                                                <img 
                                                    loading="lazy" 
                                                    decoding="async" 
                                                    fetchpriority="low"
                                                    width="150"
                                                    height="150"
                                                    src="<?php echo esc_url($data['selected']['metal']['thumb_url']); ?>"
                                                    alt="Metal Edge Colour image swatch"
                                                >
                                            </a>
                                        </div>
                                        <p class="status-layer-title">Metal Edge</p>
                                        <p class="status-layer-colour <?php echo implode('-', explode(' ', $metal_colour)); ?>-finish"><?php echo $metal_colour; ?></p>
                                    </div>
                                    <?php endif; ?>
                                </div>
                            </div>
                            <div class="swatch-order-wrapper w-100">
                                <div class="swatch-order-button-wrapper">
                                    <a href="#" class="swatch-order-button">Order Swatches</a>
                                </div>
                                <div class="swatch-add-message"></div>
                            </div>
                        </div>
                        <div class="current-status-specification flow" data-current-model-size="<?php echo $data['initial_state']['model'] ? esc_attr($data['initial_state']['model']) : esc_attr($data['initial_state']['default_model_size']); ?>">
                            <?php self::get_full_tech_specifications($data); ?>
                            <div class="status-image h-100 w-100 flex-col-center">

                                <?php $images = TM3D_Images::getCompositeImages($data['initial_state']['id']); ?>
                                <?php if ($images): ?>
                                    <a href="<?php echo esc_url($images['1600'] ?? $images['700']); ?>"
                                        data-pswp-src="<?php echo esc_url($images['1600'] ?? $images['700']); ?>"
                                        data-pswp-width="1600"
                                        data-pswp-height="650"
                                        data-pswp-gallery="woocommerce-gallery">
                                        <img 
                                            src="<?php echo esc_url($images['700']); ?>" 
                                            alt="Configured Product image preview"
                                            loading="lazy" 
                                            decoding="async" 
                                            fetchpriority="low"
                                        >
                                    </a>
                                <?php endif; ?>

                            </div>
                            <div class="save-share-download-btns">
                                <div class="tm-compare-controls">
                                    <a 
                                        href="#" 
                                        class="save-share-download-btn tm-add-to-compare" 
                                        data-product-id="<?php echo esc_attr( get_the_ID() ); ?>" 
                                        role="button"
                                        aria-pressed="false"
                                        aria-busy="false"
                                    >Save Your Design</a>
                                    <div class="tm-compare-status" aria-live="polite" aria-atomic="true"></div>
                                </div>
                                <a href="/wishlist" class="save-share-download-btn">Saved Designs</a>
                                <a 
                                    href="#" 
                                    class="save-share-download-btn share-whatsapp-btn" 
                                    role="button" 
                                    aria-label="Share via WhatsApp">
                                    Share Via WhatsApp</a>
                                <div class="pdf-wrapper">
                                    <a 
                                    href="#" 
                                    id="make-pdf" 
                                    class="save-share-download-btn" 
                                    role="button"
                                    aria-busy="false"
                                    aria-label="Download PDF">
                                    Download PDF</a>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="swatch-price-note-wrapper">
                        <p class="swatch-price-note text-small text-center">You can order porcelain stoneware colour swatches and real wood samples for all our models. Porcelain swatches are £15 each, wood swatch samples are £10 each. The cost for these samples will be reimbursed against your table order. Click the Order Swatches button above to add your selected colours to your cart.</p>
                    </div>
                </div>
            </div>

        <?php

    }

    /**
     * Render add to basket section
     * @param array $data should contain the initial state and selected options for the product.
     * @return void
     */
    public static function addToBasket($data) {

        ?>
            <div id="product-add-to-cart-section" class="product-add-to-cart-wrapper">
                <div class="product-add-to-cart-content">
                    <div class="add-to-basket-price text-center"><p>£<?php echo number_format($data['initial_state']['price'], 2); ?></p></div>
                    <p class="text-small"><b>Handcrafted to your specification in 4-6 weeks</b></p>
                </div>
                <div class="product-add-to-cart-buttons">

            
                    <form class="cart" action="https://store.tailormade.uk/product/monarch-solid-curve-wood/" method="post" enctype="multipart/form-data">
                        <div class="add-to-cart-button-wrapper">
                            <div class="quantity">
                                <label class="screen-reader-text" for="quantity_6a47a70704569"><?php echo $data['initial_state']['title']; ?></label>
                                <input type="number" id="quantity_6a47a70704569" class="input-text qty text" name="quantity" value="1" aria-label="Product quantity" min="1" step="1" placeholder="" inputmode="numeric" autocomplete="off"><div class="quantity-nav"><div class="quantity-button quantity-up">+</div><div class="quantity-button quantity-down">-</div></div>
                            </div>

                            <button type="submit" name="add-to-cart" value="<?php echo $data['initial_state']['id']; ?>" class="single_add_to_cart_button button alt">Add to basket</button>

                            <input type="hidden" name="gtm4wp_product_data" value="{&quot;internal_id&quot;:<?php echo $data['initial_state']['id']; ?>,&quot;item_id&quot;:<?php echo $data['initial_state']['id']; ?>,&quot;item_name&quot;:&quot;<?php echo $data['initial_state']['title']; ?>&quot;,&quot;sku&quot;:&quot;<?php echo $data['initial_state']['sku']; ?>&quot;,&quot;price&quot;:<?php echo $data['initial_state']['price']; ?>,&quot;stocklevel&quot;:<?php echo $data['initial_state']['stocklevel']; ?>,&quot;stockstatus&quot;:&quot;<?php echo $data['initial_state']['stockstatus']; ?>&quot;,&quot;google_business_vertical&quot;:&quot;<?php echo $data['initial_state']['google_business_vertical']; ?>&quot;,&quot;item_category&quot;:&quot;<?php echo $data['initial_state']['item_category']; ?>&quot;,&quot;id&quot;:<?php echo $data['initial_state']['id']; ?>}">
                        </div>	
                    </form>

                        <div class="table-specialist-button">
                        <a href="#" class="tm-button button-reverse whatsapp-chat-btn">Talk To A Table Specialist</a>
                        <div class="whatsapp-wrapper">
                            <p class="text-small m-0 border-0">Not sure what finish will work best?</p>
                            <img src="/wp-content/uploads/Digital_Glyph_Black_RGB_2026.svg" class="whatsapp-logo" alt="Whatsapp logo">
                        </div>
                    </div>
                </div>
                <div class="add-to-cart-list-wrapper">
                    <ul class="add-to-cart-list list-none">
                        <li>
                            <i class="fa-light fa-check" aria-hidden="true"></i>
                            Made to order in the UK
                        </li>
                        <li>
                            <i class="fa-light fa-check" aria-hidden="true"></i>
                            Samples available
                        </li>
                        <li>
                            <i class="fa-light fa-check" aria-hidden="true"></i>
                            Design guidance included
                        </li>
                    </ul>
                </div>
            </div>
        <?php

    }

    /**
     * Fetch technical specification data for product from WooCommerce
     *
     * @return void
     */
    public static function get_full_tech_specifications($data) {

        $product = wc_get_product( $data['initial_state']['id'] );
        $specifications = $product ? $product->get_attribute( 'specifications' ) : '';
        $dimensions = '';
        $full_spec_html = '';

        if ( $specifications ) {

            // Split on each occurrence of '###cm Table:'
            $specs = preg_split('/(?=\d{3,4}cm Table:)/', $specifications, -1, PREG_SPLIT_NO_EMPTY);

            $full_spec_html .= '<ul class="status-specifications d-none list-none">';
            
            foreach ( $specs as $spec ) {
            
                $size_class = '';
                $spec = trim($spec);
                $spec_html = preg_replace('/\s*\|\s*|\r?\n/', '<br>', $spec);
                $spec_html = preg_replace('/(<br>\s*)([^<]+)(?=<br>|$)/', '$1<span class="table-dimensions">$2</span>', $spec_html, 1);

                // Save the first dimensions line, e.g. "250cm L x 120cm W x 77cm H".
                if ( '' === $dimensions && preg_match('/(\d{3,4}\s*cm\s*L\s*x\s*\d{2,4}\s*cm\s*W\s*x\s*\d{2,4}\s*cm\s*H)/i', $spec, $dimension_match) ) {
                    $dimensions = trim($dimension_match[1]);
                }

                // Wrap only the size (e.g., 250cm) in span, not the word 'Table:'
                if (preg_match('/^(\d{3,4})cm Table:/', $spec, $matches)) {
                    $size_class = 'model-' . $matches[1] . 'cm';
                    $spec_html = preg_replace('/^((\d{3,4})cm) Table:/', '<span class="table-size">$2cm</span> Table:', $spec_html, 1);
                }
                // Wrap seats in span, in-place
                $spec_html = preg_replace('/(Seats:\s*)([\d\s\-–]+\d)/', '$1<span class="table-seats">$2</span>', $spec_html, 1);

                $full_spec_html .= '<li' . ($size_class ? ' class="' . esc_attr($size_class) . '"' : '') . '>' . $spec_html . '</li>';
            }

            $full_spec_html .= '</ul>';

        } else {

            $full_spec_html = '<p>No technical specifications available.</p>';
            
        } ?>

        <div class="status-dimensions-container text-center">
            <p><b>Product Specification</b></p> 
            <p class="status-dimensions"><?php echo esc_html($dimensions); ?></p>
        </div>
        <div class="full-tech-specifications flex-col-center">
            <a href="#" class="full-tech-specs-toggle text-underline">View Full Technical Specification</a>
            <?php echo $full_spec_html ?? ''; ?>
        </div>

        <?php

    }
}