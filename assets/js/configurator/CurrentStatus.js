import QRCode from '../qrcode/qrcode.min.js';

/**
 * CurrentStatus class manages the dynamic updates to the "Current Status" recap section of the product configurator.
 * It listens for changes in the model selection, swatch options, price updates. 
 * and updates the corresponding elements in the status recap to reflect the current configuration.
 */
export default class CurrentStatus {
    
    constructor() {

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
}
