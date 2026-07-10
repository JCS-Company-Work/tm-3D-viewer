export default class BuildPDF {

    constructor() {

        // Class property to hold model size
        this.currentModel = null;

        // Initialize an empty array to hold PDF elements
        this.elsToAdd = [];

        // Attach click handler for PDF generation
        this.generatePDF();

    }

    /**
     * Resolve PDF config with optional runtime overrides.
     * Example override in console:
     * window.TMPC_PDF_CONFIG = {
     *   apiUrl: 'http://localhost:4001/generate-pdf',
     *   stylesheetUrl: 'http://localhost:4001/static/pdf-styles.css'
     * };
     */
    getPDFConfig() {
        const runtime = window.TMPC_PDF_CONFIG || {};

        return {
            apiUrl: runtime.apiUrl || 'http://localhost:4002/generate-pdf',
            stylesheetUrl: runtime.stylesheetUrl || 'http://localhost:4002/static/pdf-styles.css',
            fontCssUrl: runtime.fontCssUrl || 'https://fast.fonts.net/cssapi/939a4cc7-4305-49d3-9eb7-d6746fdc66d3.css',
        };
    }

    /**
     * Method to create layout to be turned into PDF, send to Puppeteer and trigger download on success
     */
    generatePDF = () => {
    
        const pdfButton = document.getElementById("make-pdf");
        if (!pdfButton) return;

        pdfButton.addEventListener("click", async (event) => {
            event.preventDefault();
            pdfButton.classList.add('button-spinner');

            // Resolve latest SKU at click-time so PDF name/banner matches current selection.
            const sku = this.getSKU();

            const pdfConfig = this.getPDFConfig();

            this.getCurrentModel();
            const productPage = document.querySelector(".current-status");
            if (!productPage) {
                pdfButton.classList.remove('button-spinner');
                return;
            }

            const pdfName = sku || 'Product';
            let pdfWrapper;

            try {

                // Clone the entire product page
                pdfWrapper = this.buildPDF(productPage.cloneNode(true), sku);

                // Append PDF wrapper to bottom of the page for Puppeteer to render
                pdfWrapper.style.position = 'relative';
                pdfWrapper.style.width = '100%';
                pdfWrapper.style.height = '100%';   // full PDF height
                pdfWrapper.style.background = '#fff';
                pdfWrapper.style.visibility = 'visible';

                document.body.appendChild(pdfWrapper);

                // Wait for layout/paint
                await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

                // Construct HTML for Puppeteer
                const html = `
                        <html>
                            <head>
                                <meta charset="UTF-8">
                                <link rel="stylesheet" href="${pdfConfig.fontCssUrl}">
                                <link rel="stylesheet" href="${pdfConfig.stylesheetUrl}">
                            </head>
                            <body>${pdfWrapper.outerHTML}</body>
                        </html>
                    `;

                // Send to Puppeteer server
                const response = await fetch(pdfConfig.apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ html, pdfName })
                });

                if (!response.ok) throw new Error(`PDF request failed: ${response.status}`);
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${pdfName}.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);

            } catch (err) {
                console.error('PDF generation failed:', err);
            } finally {
                pdfButton.classList.remove('button-spinner');
                if (document.body.contains(pdfWrapper)) pdfWrapper.remove();
            }
        });
    };

    /** Method to find current model from content-area div */
    getCurrentModel() {

        // Select content area div
        const contentArea = document.querySelector('.content-area');

        // Loop over classes and find our model- class
        const modelClass = Array.from(contentArea.classList).find(cls => cls.startsWith('model-'));

        if (modelClass) {

            // Set currentModel property with current value
            this.currentModel = modelClass;

        }

    }

    /**
     * Save SKU value globally
     */
    getSKU() {

        const skuElement = document.querySelector('[item-name]');

        if (!skuElement) {
            return '';
        }

        return skuElement.getAttribute('item-name')?.trim() || '';

    }

    /**
     * Build and return the wrapper containing all content for the PDF
     */
    buildPDF = (productPage, sku = '') => {
        // Reset the array for a fresh build
        this.elsToAdd = [];

        // Remove any previously generated wrapper
        const existingPDF = document.querySelector('.pdf-class');
        if (existingPDF) existingPDF.remove();

        // Create the wrapper element
        const pdfWrapper = document.createElement('div');
        pdfWrapper.classList.add('pdf-class', 'flow');

        // Gather all data once for both banner/content sections
        const pdfData = this.getPdfData(productPage, sku);

        // Add sections to the PDF
        this.addBanner(pdfData.qrCode, sku);
        this.addProductData(pdfData);
        this.addContactDetails();

        // Append all collected elements to the wrapper
        this.elsToAdd.forEach(el => pdfWrapper.appendChild(el));

        return pdfWrapper;
    };

    addProductData(pdfData) {

        const productColumn = this.buildProductColumn(pdfData);
        this.elsToAdd.push(productColumn);

    }

    getPdfData(productPage, sku = '') {

        // Get product title
        const productTitle = productPage.querySelector('.status-title')?.innerText.trim() || '';

        // Get product price
        const productPrice = productPage.querySelector('.status-price')?.innerText.trim() || '';

        // Add configured price text to price value if it exists
        const configuredPrice = productPrice ? `CONFIGURED PRICE: ${productPrice}` : productPrice;

        // Resolve QR code from cloned status markup first, then live DOM as fallback.
        const qrCode = this.findQrSource(productPage);

        // Get product image
        const productImage = productPage.querySelector('.status-image img')?.src || '';
        
        // Get current spec text
        const specTextBlock = productPage.querySelector('.status-specifications .d-block') || '';

        // Clean spec text by replacing <br> with newlines and removing any other HTML tags
        let specText = specTextBlock.innerHTML
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .trim();

        // Replace top size heading (e.g. "300cm Table:") with SKU heading for PDF output.
        if (sku) {
            specText = specText.replace(/^\s*\d{3,4}cm\s+Table:\s*/i, `SKU: ${sku}\n`);
        }

        // Get visible swatches only (exclude hidden layers such as metal when not active).
        const swatches = Array.from(productPage.querySelectorAll('.status-layer-img img')).filter((swatch) => {
            const layerEl = swatch.closest('.status-layer');
            if (!layerEl) return false;

            if (
                layerEl.classList.contains('d-none') ||
                layerEl.hasAttribute('hidden') ||
                layerEl.style.display === 'none'
            ) {
                return false;
            }

            const hiddenParent = layerEl.closest('.d-none, [hidden], [style*="display:none"]');
            return !hiddenParent || hiddenParent === layerEl;
        });

        const swatchData = swatches.map((swatch, index) => {
            const layerEl = swatch.closest('.status-layer');
            const fallbackLabel = swatch.getAttribute('alt') || swatch.getAttribute('title') || `Layer ${index + 1}`;

            const swatchLabel = layerEl?.querySelector('.status-layer-title')?.innerText.trim() || fallbackLabel;
            const swatchValue = layerEl?.querySelector('.status-layer-colour')?.innerText.trim() || '';

            return {
                src: swatch.src,
                label: swatchLabel,
                value: swatchValue
            };
        });

        if (!productTitle) console.log('[BuildPDF] Missing product title: .product-title');
        if (!qrCode) console.log('[BuildPDF] Missing QR code: .qrcode');
        if (!configuredPrice) console.log('[BuildPDF] Missing product price: .status-price');
        if (!productImage) console.log('[BuildPDF] Missing product image: .status-image img');
        if (!specText) console.log('[BuildPDF] Missing spec text: .status-specifications .d-block');
        if (!swatchData.length) console.log('[BuildPDF] No swatches found: .status-layer-img img');

        return {
            productTitle,
            qrCode,
            productPrice: configuredPrice,
            productImage,
            specText,
            swatches: swatchData
        };

    }

    /**
     * Find a usable QR source element from the provided root, with fallback to the live DOM.
     */
    findQrSource(root) {
        const selector = '.status-qrcode, .qrcode, #qrcode, .status-qr, .status-qr img';
        return root?.querySelector(selector) || document.querySelector(selector);
    }

    /**
     * Convert QR source markup into a stable <img> for PDF rendering.
     */
    buildQrImageNode(qrSource) {
        if (!qrSource) return null;

        let src = '';

        // Direct image source.
        if (qrSource.tagName === 'IMG') {
            src = qrSource.getAttribute('src') || '';
        }

        // Canvas-generated QR source.
        if (!src && qrSource.tagName === 'CANVAS') {
            src = qrSource.toDataURL('image/png');
        }

        // Inline SVG QR source.
        if (!src && qrSource.tagName === 'SVG') {
            const svgMarkup = new XMLSerializer().serializeToString(qrSource);
            src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;
        }

        // Container element holding img/canvas/svg.
        if (!src) {
            const nestedImg = qrSource.querySelector('img');
            const nestedCanvas = qrSource.querySelector('canvas');
            const nestedSvg = qrSource.querySelector('svg');

            if (nestedImg) {
                src = nestedImg.getAttribute('src') || '';
            } else if (nestedCanvas) {
                src = nestedCanvas.toDataURL('image/png');
            } else if (nestedSvg) {
                const svgMarkup = new XMLSerializer().serializeToString(nestedSvg);
                src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;
            }
        }

        if (!src) return null;

        const qrImg = document.createElement('img');
        qrImg.classList.add('pdf-qr-code');
        qrImg.src = src;
        qrImg.alt = 'QR code';

        return qrImg;
    }

    buildProductColumn(pdfData) {

        const column = document.createElement('section');
        column.classList.add('pdf-product-column');

        if (pdfData.productTitle) {
            const title = document.createElement('h1');
            title.classList.add('pdf-product-title');
            title.textContent = pdfData.productTitle;
            column.appendChild(title);
        }

        if (pdfData.productPrice) {
            const price = document.createElement('p');
            price.classList.add('pdf-product-price');
            price.textContent = pdfData.productPrice;
            column.appendChild(price);
        }

        if (pdfData.productImage) {
            const image = document.createElement('img');
            image.classList.add('pdf-product-image');
            image.src = pdfData.productImage;
            image.alt = pdfData.productTitle || 'Configured product image';
            column.appendChild(image);
        }

        if (pdfData.specText) {
            const specHeading = document.createElement('p');
            specHeading.classList.add('pdf-product-spec-title');
            specHeading.textContent = 'Specification:';

            const spec = document.createElement('p');
            spec.classList.add('pdf-product-spec');
            spec.textContent = pdfData.specText;

            column.appendChild(specHeading);
            column.appendChild(spec);
        }

        if (pdfData.swatches.length) {
            const swatchList = document.createElement('div');
            swatchList.classList.add('pdf-swatch-list');

            pdfData.swatches.forEach((swatch) => {
                const swatchRow = document.createElement('div');
                swatchRow.classList.add('pdf-swatch-row');

                const swatchImg = document.createElement('img');
                swatchImg.classList.add('pdf-swatch-image');
                swatchImg.src = swatch.src;
                swatchImg.alt = swatch.label;

                const swatchText = document.createElement('div');
                swatchText.classList.add('pdf-swatch-text');

                const swatchLabel = document.createElement('span');
                swatchLabel.classList.add('pdf-swatch-name');
                swatchLabel.textContent = swatch.label;

                const swatchValue = document.createElement('span');
                swatchValue.classList.add('pdf-swatch-value');
                swatchValue.textContent = swatch.value;

                swatchText.appendChild(swatchLabel);
                if (swatch.value) {
                    swatchText.appendChild(swatchValue);
                }

                swatchRow.appendChild(swatchImg);
                swatchRow.appendChild(swatchText);
                swatchList.appendChild(swatchRow);
            });

            column.appendChild(swatchList);
        }

        return column;

    }
    
     /**
     * Add TailorMade Banner
     */
    addBanner = (qrCodeEl = null, sku = '') => {

        // Wrapper so QR can be overlaid on the banner image
        const bannerWrapper = document.createElement('div');
        bannerWrapper.classList.add('pdf-banner-wrap');

        // Create banner image element
        const banner = document.createElement('img');

        // Uploads folder path
        const uploads = 'https://store.tailormade.uk/wp-content/uploads/';

        // Object containing banner images
        const bannerMap = {
            'tt02': 'tt02-pdf-banner.jpg',
            'tt04': 'tt04-pdf-banner.jpg',
            'tt12': 'tt12-pdf-banner.jpg',
        };

        // Find a key that exists in the SKU
        const match = Object.keys(bannerMap).find(key => sku.includes(key));

        // Default to tt03 if no match
        const bannerMatch = bannerMap[match] || 'tt03-pdf-banner.jpg';

        // Set banner src string
        banner.src = uploads + bannerMatch

        // Add pdf-class to banner image element
        banner.classList.add('pdf-banner');

        // Add banner to wrapper first
        bannerWrapper.appendChild(banner);

        // Add QR overlay (position via CSS)
        if (qrCodeEl) {
            const qrOverlay = document.createElement('div');
            qrOverlay.classList.add('pdf-banner-qr');

            const qrNode = this.buildQrImageNode(qrCodeEl);
            if (qrNode) {
                qrOverlay.appendChild(qrNode);
            }
            bannerWrapper.appendChild(qrOverlay);
        }

        // Add banner image to els to be included in PDF
        this.elsToAdd.push(bannerWrapper);

    };

    /**
     * Method to add contact details in footer area
     */
    addContactDetails() {

        // Select email element from DOM
        const salesEmail = document.querySelector('.sales-email');

        // Select telephone number from DOM
        const telNo = document.querySelector('.tel-no');

        // Select address from DOM
        const factoryAddress = document.querySelector('.factory-address').innerText;

        // Extract and clean text
        const salesEmailText = salesEmail?.innerText.trim() || '';
        const telNoText = telNo?.innerText.trim() || '';
        const oneLineAddress = factoryAddress
        .replace(/\s*\n\s*/g, ' ')
        .replace(/\s+/g, ' ')
        .trim() || '';

        // Join with pipes
        const combinedString = [salesEmailText, telNoText, oneLineAddress].join(' | ');

        // Wrap in a <p> node
        const contactNode = document.createElement('p');
        contactNode.classList.add('pdf-footer');
        contactNode.textContent = combinedString;

        // Add to final array
        this.elsToAdd.push(contactNode);

    }

}