<?php

namespace TmThreeViewer\CurrentStatus;

use TmThreeViewer\Images\TM3D_Images;
use TmThreeViewer\Data\TM3D_Data;

class TM3D_CurrentStatus {

    /**
     * Render the current status markup as a string so it can be added to shortcode output.
     *
     * @return string
     */
    public static function render_current_status(): string {

        // Start output buffering to capture the HTML output
        ob_start();

        // Call the method to output the current status section
        self::add_current_status();

        // Get the buffered output and return it as a string
        return ob_get_clean();

    }

    /**
     * Render the current status section on the product page, showing the selected options and a preview image
     *
     * @return void
     */
    public static function add_current_status() {

        $product_data = TM3D_Data::getProductData();

        ?>

            <div class="current-status-container">
                <div class="current-status">
                    <h3>Your Creation</h3>
                    <div class="current-status-wrapper">
                        <div class="qrcode"></div>
                        <div class="current-status-swatches">
                            <div class="status-price-container">
                                <p class="status-title bold"><?php echo get_the_title(); ?></p> 
                                <p class="status-price" data-ex-vat-price-base="<?php echo $product_data['selected']['price'] ?? ''; ?>"></p>
                                <?php $top_colour = $product_data['selected']['top']['name'] ?? ''; ?>

                                <?php if($top_colour) : ?>

                                    <p class="bold">Surface</p>
                                    <span class="obj-top-colour"><?php echo $top_colour; ?></span>

                                <?php endif; ?>

                                <?php $base_colour = $product_data['selected']['base']['name'] ?? ''; ?>

                                <?php if($base_colour) : ?>

                                    <p class="bold">Base Finish</p>
                                    <span class="obj-base"><?php echo $base_colour; ?></span>

                                <?php endif; ?>

                                <?php $metal_colour = $product_data['selected']['metal']['name'] ?? ''; ?>

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
                                            <a href="<?php echo esc_url($product_data['selected']['top']['url']); ?>"
                                                data-pswp-src="<?php echo esc_url($product_data['selected']['top']['url']); ?>"
                                                data-pswp-width="700"
                                                data-pswp-height="1200"
                                                data-pswp-gallery="woocommerce-gallery">
                                                <img 
                                                loading="lazy" 
                                                decoding="async" 
                                                fetchpriority="low"
                                                width="150"
                                                height="150"
                                                src="<?php echo esc_url($product_data['selected']['top']['thumb_url']); ?>"
                                                alt="Top Colour image swatch"
                                                >
                                            </a>
                                        </div>
                                        <p class="status-layer-title">Top Colour</p>
                                        <p class="status-layer-colour <?php echo implode('-', explode(' ', $top_colour)); ?>-finish"><?php echo $top_colour; ?></p>
                                    </div>

                                    <div class="obj-base status-layer">
                                        <div class="status-layer-img">
                                            <a href="<?php echo esc_url($product_data['selected']['base']['url']); ?>"
                                                data-pswp-src="<?php echo esc_url($product_data['selected']['base']['url']); ?>"
                                                data-pswp-width="700"
                                                data-pswp-height="1200"
                                                data-pswp-gallery="woocommerce-gallery">
                                                <img 
                                                    loading="lazy" 
                                                    decoding="async" 
                                                    fetchpriority="low"
                                                    width="150"
                                                    height="150"
                                                    src="<?php echo esc_url($product_data['selected']['base']['thumb_url']); ?>"
                                                    alt="Base Colour image swatch"
                                                >
                                            </a>
                                        </div>
                                        <p class="status-layer-title">Base Colour</p>
                                        <p class="status-layer-colour <?php echo implode('-', explode(' ', $base_colour)); ?>-finish"><?php echo $base_colour; ?></p>
                                    </div>

                                    <?php if (!empty($product_data['selected']['metal']) && !empty($product_data['selected']['metal']['url'])): ?>
                                    <div class="obj-metal-edge-veneer status-layer">
                                        <div class="status-layer-img">
                                            <a href="<?php echo esc_url($product_data['selected']['metal']['url']); ?>"
                                                data-pswp-src="<?php echo esc_url($product_data['selected']['metal']['url']); ?>"
                                                data-pswp-width="886"
                                                data-pswp-height="187"
                                                data-pswp-gallery="woocommerce-gallery">
                                                <img 
                                                    loading="lazy" 
                                                    decoding="async" 
                                                    fetchpriority="low"
                                                    width="150"
                                                    height="150"
                                                    src="<?php echo esc_url($product_data['selected']['metal']['thumb_url']); ?>"
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
                        <div class="current-status-specification flow">
                            <?php //self::get_full_tech_specifications(); ?>
                            <div class="status-image h-100 w-100 flex-col-center">

                                <?php $images = TM3D_Images::getCompositeImages(); ?>
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
     * Fetch technical specification data for product from WooCommerce
     *
     * @return void
     */
    public static function get_full_tech_specifications() {

        $product = wc_get_product( get_the_ID() );
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