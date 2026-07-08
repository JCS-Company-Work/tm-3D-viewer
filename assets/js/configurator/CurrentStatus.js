import QRCode from '../qrcode/qrcode.min.js';

/**
 * CurrentStatus class manages the dynamic updates to the "Current Status" recap section of the product configurator.
 * It listens for changes in the model selection, swatch options, price updates. 
 * and updates the corresponding elements in the status recap to reflect the current configuration.
 */
export default class CurrentStatus {
    
    constructor(state) {

        // Store the reference to the ProductState instance
        this.state = state;

        // Model dropdown element
        this.modelSelect = document.querySelector('.obj-model select');

        // Variable to store current model
        this.modelClass = document.querySelector('.current-status-specification').getAttribute('data-current-model-size');
        
        // Initialize the class by setting up listeners and updating the status recap
        this.init();

    }

    init() {
        this.addModelListeners();
        this.updatePrice();
        this.determineModel();
        this.updateSpecText();
        this.updateDimensions();
        this.showHideFullSpec();
        this.createQR();
        this.chatOnWhatsApp();
        this.shareToWhatsapp();
    }

    /**
     * Add event listeners to model dropdown and swatch selections to trigger 
     * updates in the status recap when user changes options.
     * @returns {void}
     */
    addModelListeners() {

        // Model dropdown listener
        const modelSelect = document.querySelector('.obj-model select');

        // Update values on change
        modelSelect.addEventListener('change', () => {

            this.updatePrice();
            this.determineModel();
            this.updateSpecText();
            this.updateDimensions();
            this.createQR();

        })

    }

    /**
     * Determine and store the currently selected model label for status/spec updates.
     * @returns {void}
     */
    determineModel() {

        const selectedOption = this.modelSelect?.selectedOptions?.[0];

        if (!selectedOption) {
            return;
        }

        const selectedLabel =
            selectedOption.getAttribute('data-label') ||
            selectedOption.value ||
            '';

        if (!selectedLabel) {
            return;
        }

        this.modelClass = selectedLabel;

        const specContainer = document.querySelector('.current-status-specification');
        if (specContainer) {
            specContainer.setAttribute('data-current-model-size', selectedLabel);
        }

    }

    /**
     * Generate a QR code based on the current page URL (without tvembed parameter) and display it in the .qrcode element.
     * @returns {void}
     */
    createQR = () => {

        // Select QR code container from DOM
        const qrElement = document.querySelector(".qrcode");

        // Create a new QRCode instance with error correction level 'H'
        const qr = new QRCode(0, 'H');

        // Extract current url from form action
        const form = document.querySelector('form.cart');

        // Create a new URL object from the form's action attribute
        const url = new URL(form?.action);

        // Add all params from the current page's query string to the URL object
        const currentParams = new URLSearchParams(window.location.search);
        currentParams.forEach((value, key) => {
            url.searchParams.set(key, value);
        });

        // Remove the 'tvembed' parameter from the URL to ensure it's not included in the QR code
        url.searchParams.delete('tvembed');

        // Add the URL to the QR code and generate it
        qr.addData(url.toString());
        
        // Add the modified URL to the QR code and generate it
        qr.make();
        
        // Generate the QR code as an SVG and insert it into the .qrcode element
        qrElement.innerHTML = qr.createSvgTag({});

    }

    /**
     * Update the product price in the status recap based on the currently selected options.
     * @returns {void}
     */
    updatePrice() {

        // Inc-VAT cost to be displayed to user
        const statusPrice = document.querySelector(".status-price");

        // Get add to basket price element from DOM
        const addToBasketPrice = document.querySelector(".add-to-basket-price p");

        // Ex-VAT cost to be added to hidden input
        const configuredTotal = document.getElementById('configured-total');

        // Select currently active option el
        const selectedOption = this.modelSelect.selectedOptions[0];

        // Get base price (ex VAT)
        const basePrice = parseFloat(statusPrice.getAttribute("data-ex-vat-price-base") || "0");

        // Get model price (fallback to 0)
        const modelPrice = parseFloat(selectedOption.getAttribute("data-ex-vat") || "0");

        // Ex-VAT total
        const exVatTotal = basePrice + modelPrice;

        // Apply VAT to base as this is set ex VAT in the backend and add model price
        const displayPrice = exVatTotal * 1.2;

        // Update DOM elements
        configuredTotal.value = exVatTotal;
        addToBasketPrice.textContent = `£${displayPrice.toFixed(2)}`;

        // Display price to two decimal places
        statusPrice.textContent = `£${displayPrice.toFixed(2)}`;

    }

    /**
     * Update the dimensions text in the status recap based on the currently selected model.
     * @returns {void}
     */
    updateDimensions() {

        // Select status price container from DOM
        const statusSpecs = document.querySelector(".status-specifications");

        // Find the active spec list item
        const activeLi = statusSpecs.querySelector('li.d-block');

        // Select the table size and seats elements within the active list item
        const tableSizeEl = activeLi ? activeLi.querySelector(".table-size") : null;
        
        // Select the seats element within the active list item
        const seatsEl = activeLi ? activeLi.querySelector(".table-seats") : null;

        // If either element is missing, exit the function
        if (!tableSizeEl || !seatsEl) return;

        // Construct the size string using the text content of the selected elements
        const statusSeats = document.querySelector(".status-seats");

        const sizeString = `<p class="bold text-center">Size:</p> ${tableSizeEl.textContent.trim()} - Seats ${seatsEl.textContent.trim()}`;

        // Update the status recap with the new size and seats information
        statusSeats.innerHTML = sizeString;

        // Update seating number in top product summarty section
        const seatsNumber = document.querySelector(".seats-number");
        if (seatsNumber) {
            seatsNumber.textContent = seatsEl.textContent.trim();
        }

    }

    /**
     * Update the specification text in the status recap based on the currently selected model.
     * @returns {void}
     */
    updateSpecText() {

        // Select specification texts from DOM
        const specTexts = document.querySelectorAll(".status-specifications > li");
    
        // Determine active spec text based on model class
        const activeSpecText = document.querySelector(`.status-specifications .model-${this.modelClass}`);

        // Hide all spec texts first
        specTexts.forEach(spec => {
                spec.classList.remove("d-block");
                spec.classList.add("d-none");
        });

        // Show only the active spec text
        if(activeSpecText) {
            activeSpecText.classList.remove("d-none");
            activeSpecText.classList.add("d-block");
        }

        // Update dimensions in status recap based on active spec text
        const dimensionsEl = activeSpecText ? activeSpecText.querySelector(".table-dimensions") : null;

        // Select dimensions container in status recap
        const statusDims = document.querySelector(".status-dimensions");

        // If both elements exist, update the dimensions text in the status recap
        if (dimensionsEl && statusDims) {
            statusDims.textContent = dimensionsEl.textContent.trim();
        }
    }

    /**
     * Show/hide the full technical specifications when the toggle link is clicked.
     * @returns {void}
     */
    showHideFullSpec() {

        // Select toggle link and specifications container from DOM
        const toggleLink = document.querySelector(".full-tech-specs-toggle");

        // Select specifications container from DOM
        const statusSpecs = document.querySelector(".status-specifications");

        // If either element is missing, exit the function
        if (!toggleLink || !statusSpecs) return;

        // Ensure fade class is present for animation
        statusSpecs.classList.add("fade");
        // If not hidden, ensure .show is present
        if (!statusSpecs.classList.contains("d-none")) {
            statusSpecs.classList.add("show");
        }

        // Add click event listener to toggle link
        toggleLink.addEventListener("click", (e) => {

            // Prevent default link behavior
            e.preventDefault();

            // Animate fade in/out
            if (statusSpecs.classList.contains("show")) {
                // Fade out
                statusSpecs.classList.remove("show");
                setTimeout(() => {
                    statusSpecs.classList.add("d-none");
                    // Update toggle link text based on visibility
                    toggleLink.textContent = "View Full Technical Specification";
                }, 400); // match CSS transition duration
            } else {
                // Show and fade in
                statusSpecs.classList.remove("d-none");
                setTimeout(() => {
                    statusSpecs.classList.add("show");
                }, 10); // allow reflow for transition
                // Update toggle link text based on visibility
                toggleLink.textContent = "Hide Full Technical Specification";
            }

        });

    }

    /**
     * Start WhatsApp chat
     * @returns 
     */
    chatOnWhatsApp() {

        // Select all WhatsApp chat buttons from the DOM
        const chatBtns = document.querySelectorAll('.whatsapp-chat-btn');

        // If no chat buttons are found, exit the function
        if (!chatBtns.length) return;

        chatBtns.forEach((chatBtn) => {

            // Add click event listener to the chat button
            chatBtn.addEventListener('click', (e) => {

                // Prevent default link behavior
                e.preventDefault();

                // Construct the message to be sent via WhatsApp
                const message = `Hi, I would like to talk to a table specialist about this dining table - ${window.location.href}`;

                // Encode the message and construct the WhatsApp link
                const whatsappLink = `https://wa.me/447782274315?text=${encodeURIComponent(message)}`;

                // Open the WhatsApp chat in a new tab
                window.open(whatsappLink, '_blank');

            });
        });
    }

    /**
     * Share the current product configuration to WhatsApp.
     * @returns 
     */
    shareToWhatsapp() {

        // Select the WhatsApp share button from the DOM
        const shareBtn = document.querySelector('.share-whatsapp-btn');

        // If the button doesn't exist, exit the function
        if (!shareBtn) return;

        // Add click event listener to the share button
        shareBtn.addEventListener('click', async (e) => {
            // Prevent default link behavior
            e.preventDefault();

            // Get the preview image filename (hash + optional suffix)
            let previewImg = document.querySelector('.status-image .preview-image');
            if (!previewImg) {
                // fallback to any img in .status-image
                previewImg = document.querySelector('.status-image img');
            }
            let filename = '';
            if (previewImg) {
                // Extract filename without extension
                filename = previewImg.src.split('/').pop().replace(/\.(jpg|png)$/i, '');
            }

            // Build the /share/{hash} URL for Open Graph preview
            const shareUrl = `${window.location.origin}/share/${filename}`;

            // Get product details for sharing
            const productTitle = document.querySelector('.product-title')?.textContent.trim() || 'My Table Design';
            const tableSize = document.querySelector('li.d-block .table-size')?.textContent.trim() || '';
            const seats = document.querySelector('li.d-block .table-seats')?.textContent.trim() || '';

            // WhatsApp prefers the preview link to be the first/only link
            let shareText = `${productTitle} - ${tableSize} Table - Seats ${seats}\n${window.location.href}`;

            // Encode the share text for a valid WhatsApp link
            const whatsappLink = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

            shareBtn.setAttribute('href', whatsappLink);
            window.open(whatsappLink, '_blank');
        });
    }

    // ===================== Image updates ===================== //

    /**
     * Update the status layer images based on the currently selected options for top, base and metal. 
     * If the change was triggered by a top colour selection, update all layers based on the new available options for base and edge. If the change was triggered by a base or edge selection, only update the corresponding layer.
     * @param {HTMLElement} checkedInput 
     */
    updateStatusLayer(checkedInput) {

        // Find swatch group to determine which layer to update
        const swatchGroup = checkedInput ? checkedInput.closest('[class*="obj-"]') : null;

        // Determine which status image to change based on the swatch group
        let objClass = null;
        if (swatchGroup) {
            objClass = Array.from(swatchGroup.classList).find(cls => cls.startsWith('obj-'));
        }

        // If top colour changed update all status layers based on selected options
        if (objClass === 'obj-top-colour' || objClass === 'obj-product-type') {

            // Get all checked inputs
            const checkedInputs = document.querySelectorAll('.obj-top-colour .wapf-input:checked, .obj-base .wapf-input:checked, .obj-metal-edge-veneer .wapf-input:checked');

            // Update each layer based on the checked inputs
            checkedInputs.forEach(input => {
                this.updateSingleLayer(input, input.closest('.obj-top-colour') ? 'obj-top-colour' : (input.closest('.obj-base') ? 'obj-base' : 'obj-metal-edge-veneer'));
            });

            // If no metal is selected in state for the current model/top combo, remove stale metal status layer.
            const hasSelectedMetal = !!this.state.selectedOptions?.metal;
            if (!hasSelectedMetal) {
                document.querySelector('.status-layer-images .obj-metal-edge-veneer')?.remove();
            }

        } else if (objClass) {

            // Update single layer based on the checked input in the base or metal groups
            this.updateSingleLayer(checkedInput, objClass);

        }
        
    }

    /**
     * Update single status layer image
     * @param {HTMLElement} checkedInput 
     * @param {string} objClass 
     */
    updateSingleLayer(checkedInput, objClass) {

        // Get new layer from DOM based on the checked input
        const newLayer = checkedInput ? checkedInput.parentElement.querySelector('.swatch') : null;

        // Get label text for the checked input to use as the layer name
        const layerName = checkedInput ? checkedInput.closest('.wapf-swatch').querySelector('label').textContent.trim() : null;

        const statusLayerContainer = document.querySelector('.status-layer-images');
        if (!statusLayerContainer) return;

        let statusEl = statusLayerContainer.querySelector(`.${objClass}`);

        // Create the status layer node on-demand (needed when moving from non-metal to metal models).
        if (!statusEl && checkedInput) {
            statusEl = this.createStatusLayer(statusLayerContainer, objClass, checkedInput);
        }

        if (!statusEl) return;

        const statusLink = statusEl ? statusEl.querySelector('a') : null;

        // Get status image element to update
        const statusImg = statusEl ? statusEl.querySelector('img') : null;

        // Get status image text element to update
        const statusImgText = statusEl ? statusEl.querySelector('.status-layer-colour') : null;

        // If there is a link element in the status image, update its data-pswp-src attribute for PhotoSwipe
        if (statusLink && newLayer) {
            statusLink.setAttribute('data-pswp-src', newLayer.src);
            statusLink.setAttribute('href', newLayer.src);
        }

        // Update status image src and alt attributes based on the new layer
        if (statusImg && newLayer) {

            // Update the status image source
            statusImg.src = newLayer.src;

            statusImg.setAttribute('data-pswp-src', newLayer.src);
            
            // Update the alt text of the status image
            statusImg.alt = layerName;

            // Update class names to reflect new selected layer
            statusImgText.className = `status-layer-colour ${layerName.toLowerCase().replace(/\s+/g, '-')}-finish`;
            
            // If there is a text element for the status image, update its text content with the layer name
            if (statusImgText) {
                statusImgText.textContent = layerName;
            }
        }

        // // Update product info text in status container
        // const statusPriceContainer = document.querySelector(`.status-price-container .${objClass}`);

        // statusPriceContainer.textContent = layerName;


    }

    /**
     * Create a status layer node for a swatch group when it does not exist in the DOM.
     * @param {HTMLElement} container
     * @param {string} objClass
     * @param {HTMLElement} checkedInput
     * @returns {HTMLElement|null}
     */
    createStatusLayer(container, objClass, checkedInput) {

        const swatchImage = checkedInput.closest('.wapf-swatch')?.querySelector('.swatch');
        const layerName = checkedInput.closest('label')?.getAttribute('aria-label') || checkedInput.value || '';

        if (!swatchImage || !layerName) {
            return null;
        }

        const titleMap = {
            'obj-top-colour': 'Top Colour',
            'obj-base': 'Base Colour',
            'obj-metal-edge-veneer': 'Metal Edge'
        };

        const layer = document.createElement('div');
        layer.className = `${objClass} status-layer`;
        layer.innerHTML = `
            <div class="status-layer-img">
                <a href="${swatchImage.src}" data-pswp-src="${swatchImage.src}" data-pswp-width="700" data-pswp-height="1200" data-pswp-gallery="tm3d-status-gallery">
                    <img loading="lazy" decoding="async" fetchpriority="low" width="150" height="150" src="${swatchImage.src}" alt="${layerName}">
                </a>
            </div>
            <p class="status-layer-title">${titleMap[objClass] || 'Layer'}</p>
            <p class="status-layer-colour ${layerName.toLowerCase().replace(/\s+/g, '-')}-finish">${layerName}</p>
        `;

        container.appendChild(layer);
        return layer;
    }

    /**
     * Schedule a single call to updateCompositeImages, debounced so multiple
     * rapid changes (e.g. from a "created by us" click) only trigger one update.
     */
    scheduleCompositeUpdate = () => {
        clearTimeout(this._compositeUpdateTimer);
        this._compositeUpdateTimer = setTimeout(() => {
            this.updateCompositeImages();
        }, 100);
    }

    /**
     * Update status and gallery composite images based on the default selections for the selected top colour
     * @returns {void}
     */
    updateCompositeImages() {

        // Select the image element within the status container
        const statusImgEl = document.querySelector(".status-image");
        
        // Select the image element within the gallery composite container
        const statusImg = statusImgEl ? statusImgEl.querySelector("img") : null;
        
        // Select the link element within the status container for PhotoSwipe
        const statusLink = statusImgEl ? statusImgEl.querySelector('a') : null;

        // If image elements missing, exit the function
        if (!statusImg /* || !galleryCompositeImg */) return;

        // Resolve product id from the currently selected product first.
        const productID =
            document.querySelector('.obj-product-type .wapf-input:checked')?.id ||
            window.TM3DPlugin?.product_id ||
            window.TM3DPlugin?.data?.initial_state?.id ||
            '';

        if (!productID) {
            return;
        }

        // Build payload with selected options for top, base and metal (if metal exists)
        const topSwatch = this.state.selectedOptions?.top?.swatchName;
        const baseSwatch = this.state.selectedOptions?.base?.swatchName;

        // Top and base are required for the composite endpoint.
        if (!topSwatch || !baseSwatch) {
            return;
        }

        const payload = {
            top: topSwatch,
            base: baseSwatch,
        }

        // If metal set add to payload
        if(this.state.selectedOptions.metal) {
            payload.metal = this.state.selectedOptions.metal.swatchName;
        }
        
        // Trigger image update
        fetch('/wp-json/tm3d/v1/update-product-images/', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                product_id: Number(productID),
                selectedLayers: payload
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Composite request failed with status ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (!data?.success) {
                console.warn('Composite update failed:', data?.message || 'Unknown error');
                return;
            }

            // Update status and gallery images in one block
            if (data.images) {
                if (data.images['700'] && statusImg) {
                    statusImg.src = data.images['700'];
                    if (statusLink) {
                        statusLink.setAttribute('data-pswp-src', data.images['1600']);
                        statusLink.setAttribute('href', data.images['1600']);
                    }
                }
            }
        })
        .catch(error => {
            console.error('Error fetching image:', error);
        });
    }
}
