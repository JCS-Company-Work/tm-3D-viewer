export default class ConfiguratorUI {

    constructor(state) {

        // Store the reference to the ProductState instance
        this.state = state;

    }

    /**
     * Sets up event listeners for the configuration drawer, 
     * allowing it to open and close based on user interactions.
     * @returns {void}
     */
    setConfigDrawerState = () => {

        const configWrapper = document.querySelector('#configurator');
        const configCloseButton = document.getElementById('configCloseButton');
        const configMask = document.getElementById('configMask');

        const optionSelectors = [
            '#option-product-type',
            '#option-top-colour',
            '#option-metal-edge-veneer',
            '#option-base',
            '#option-model'
        ];

        optionSelectors.forEach(sel => {
            document.querySelector(sel)?.addEventListener('click', function () {
                configWrapper.classList.value =
                    `configurator config-open ${this.id} last-opened-${this.id}`;

                configCloseButton?.focus();
            });
        });

        [configCloseButton, configMask].forEach(el => {
            el?.addEventListener('click', () => {
                configWrapper.classList.remove('config-open');
            });
        });
    }

    /**
     * Builds the "Created By Us" section of the UI by fetching data from the API and updating the DOM.
     * @param {string} id - The ID of the product for which to fetch "Created By Us" configurations.
     * @returns {void}
     */
    buildCreatedByUs(id) {

        // Get created by us HTML from API
        const createdByUsContainer = document.querySelector('.created-by-us-configurations');
        if (!createdByUsContainer) {
            console.warn('Created by us container not found.');
            return;
        }

        const previousHTML = createdByUsContainer.innerHTML;
        createdByUsContainer.setAttribute('aria-busy', 'true');
        createdByUsContainer.classList.add('button-spinner');

        const currentCards = Array.from(createdByUsContainer.querySelectorAll('.created-by-us-configuration'));
        const currentCardHeights = currentCards.map(card => card.offsetHeight).filter(Boolean);
        const currentContainerHeight = createdByUsContainer.offsetHeight;

        if (currentCardHeights.length) {
            createdByUsContainer.style.setProperty('--tm3d-card-min-height', `${Math.max(...currentCardHeights)}px`);
        }

        if (currentContainerHeight) {
            createdByUsContainer.style.minHeight = `${currentContainerHeight}px`;
        }

        this.setCreatedByUsCardsLoading(createdByUsContainer, true);

        fetch(`${window.location.origin}/wp-json/tm3d/v1/created-by-us`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to fetch Created By Us: ${response.status}`);
                }

                return response.json();
            })
            .then(payload => {
                const html = typeof payload === 'string' ? payload : (payload?.html || '');

                // API returns full section markup; only replace card items in the current container.
                const temp = document.createElement('div');
                temp.innerHTML = html;

                const nextContainer = temp.querySelector('.created-by-us-configurations');
                createdByUsContainer.innerHTML = nextContainer ? nextContainer.innerHTML : html;
                this.watchCreatedByUsCardImages(createdByUsContainer);
            })
            .catch(error => {
                createdByUsContainer.innerHTML = previousHTML;
                this.setCreatedByUsCardsLoading(createdByUsContainer, false);
                createdByUsContainer.classList.remove('button-spinner');
                createdByUsContainer.removeAttribute('aria-busy');
                createdByUsContainer.style.removeProperty('min-height');
                createdByUsContainer.style.removeProperty('--tm3d-card-min-height');
                console.error('Error fetching created by us HTML:', error);
            });

    }

    /**
     * Toggle loading state for all Created By Us cards in a container.
     * @param {HTMLElement} container
     * @param {boolean} isLoading
     * @returns {void}
     */
    setCreatedByUsCardsLoading(container, isLoading) {

        const cards = container.querySelectorAll('.created-by-us-configuration');

        cards.forEach(card => {
            card.classList.toggle('button-spinner', isLoading);
            card.setAttribute('aria-busy', isLoading ? 'true' : 'false');
            card.style.pointerEvents = isLoading ? 'none' : '';
        });

    }

    /**
     * Keep per-card spinner active until each Created By Us image has loaded.
     * @param {HTMLElement} container
     * @returns {void}
     */
    watchCreatedByUsCardImages(container) {

        const cards = Array.from(container.querySelectorAll('.created-by-us-configuration'));

        if (!cards.length) {
            container.classList.remove('button-spinner');
            container.removeAttribute('aria-busy');
            container.style.removeProperty('min-height');
            container.style.removeProperty('--tm3d-card-min-height');
            return;
        }

        let pendingCount = 0;

        cards.forEach(card => {
            const img = card.querySelector('img');

            if (!img || img.complete) {
                card.classList.remove('button-spinner');
                card.setAttribute('aria-busy', 'false');
                card.style.pointerEvents = '';
                return;
            }

            pendingCount += 1;
            card.classList.add('button-spinner');
            card.setAttribute('aria-busy', 'true');
            card.style.pointerEvents = 'none';

            const onImageDone = () => {
                card.classList.remove('button-spinner');
                card.setAttribute('aria-busy', 'false');
                card.style.pointerEvents = '';
                pendingCount -= 1;

                if (pendingCount <= 0) {
                    container.classList.remove('button-spinner');
                    container.removeAttribute('aria-busy');
                    container.style.removeProperty('min-height');
                    container.style.removeProperty('--tm3d-card-min-height');
                }
            };

            img.addEventListener('load', onImageDone, { once: true });
            img.addEventListener('error', onImageDone, { once: true });
        });

        if (pendingCount <= 0) {
            container.classList.remove('button-spinner');
            container.removeAttribute('aria-busy');
            container.style.removeProperty('min-height');
            container.style.removeProperty('--tm3d-card-min-height');
            return;
        }

        setTimeout(() => {
            this.setCreatedByUsCardsLoading(container, false);
            container.classList.remove('button-spinner');
            container.removeAttribute('aria-busy');
            container.style.removeProperty('min-height');
            container.style.removeProperty('--tm3d-card-min-height');
        }, 2000);

    }

    /**
     * Rebuild UI after product model change to correctly reflect available options for the selected product type.
     * @param {string} id - The ID of the selected product type.
     * @param {string} productType - The type of the selected product.
     * @param {string} collection - The collection to which the product belongs.
     */
    buildUI(id, productType, collection) {

        // Groups to iterate over for building swatches
        const groups = ['top-colour', 'base', 'metal-edge-veneer'];

        // Check if this product uses horizontal bases (in category 239)
        const isHorizontalBasesProduct = this.isHorizontalBasesProduct(id);

        groups.forEach(group => {

            // Get the currently selected option for the group
            const selected = document.querySelector(`.obj-${group} input[type="radio"]:checked`);

                // Normalize source data so every group can use the same destructuring shape.
                const swatchItems = this.getSwatchItems(group, productType, id);

                // Build the HTML for the swatches based on the group and data object
                if(swatchItems.length) {

                    // Build the HTML for the swatches based on the group and data object
                    const groupContainer = document.querySelector(`.obj-${group} .wapf-image-swatch-wrapper`);

                    if(groupContainer) {

                        let html = '';

                        // Iterate over the data object to create swatch HTML
                        for (const item of swatchItems) {
                            // Destructure a consistent item shape across groups.
                            const { name, id, sample_id, url, horizontal_url, horizontal_id } = item;
                            const sampleId = sample_id || '';

                            // For base swatches on horizontal products, use horizontal versions if available
                            let displayUrl = url;
                            let displayId = id;
                            
                            if (group === 'base' && isHorizontalBasesProduct && horizontal_url) {
                                displayUrl = horizontal_url;
                                displayId = horizontal_id || id;
                            }

                            // Verify all required data exists before appending HTML (skip invalid items)
                            if (displayId && name && displayUrl) {
                                html += `
                                    <div class="wapf-swatch wapf-swatch--image apf-pick-box">
                                        <label aria-label="${name}">
                                            <input
                                                type="radio"
                                                id="${displayId}"
                                                name="${group.replace('-', '_')}"
                                                class="wapf-input"
                                                value="${name}"
                                                data-sample-id="${sampleId}"
                                                ${selected && selected.value === name ? 'checked' : ''}
                                            >

                                            <div>
                                                <img
                                                    class="swatch"
                                                    src="${displayUrl}"
                                                    alt="${name}"
                                                >
                                            </div>

                                            <div class="wapf-swatch-label">
                                                ${name}
                                            </div>
                                        </label>
                                    </div>`;
                            }
                        }

                        groupContainer.innerHTML = html;

                        // Apply horizontal bases styling if this is a horizontal bases product and group is base
                        if (group === 'base' && isHorizontalBasesProduct) {
                            groupContainer.classList.add('horizontal-bases-layout');
                        } else if (group === 'base') {

                            groupContainer.classList.remove('horizontal-bases-layout');
                        }

                    } else {
                        console.warn(`Container for group "${group}" not found.`);
                    }

                }
                
        });

        // Update models for the selected product type
        this.updateModels(id, collection);

    }

    /**
     * Normalize source swatch data into a flat array for consistent rendering.
     * @param {string} group
     * @param {string} productType
     * @param {string} productId - The WooCommerce product ID (used to determine data source for bases)
     * @returns {Array}
     */
    getSwatchItems(group, productType, productId) {

        const dataObj = this.getUIData(group, productType, productId);

        if (!dataObj || typeof dataObj !== 'object') {
            return [];
        }

        if (group === 'top-colour') {
            return Object.values(dataObj)
                .map(item => item?.top)
                .filter(Boolean);
        }

        if (group === 'base') {

            // Check if this is a nested master_values structure (wood/tile) or flat structure
            console.log(`[getSwatchItems base] dataObj keys: ${Object.keys(dataObj).join(', ')}`);
            console.log(`[getSwatchItems base] dataObj:`, dataObj);
            
            if (dataObj['wood'] || dataObj['tile']) {
                // Nested structure: merge wood and tile base options into a single array for rendering
                const woodBases = Object.values(dataObj?.['wood'] || {}).filter(Boolean);
                const tileBases = Object.values(dataObj?.['tile'] || {}).filter(Boolean);
                console.log(`[getSwatchItems base] wood: ${woodBases.length}, tile: ${tileBases.length}`, woodBases, tileBases);
                const result = [...woodBases, ...tileBases];
                console.log(`[getSwatchItems base] returning: ${result.length} items`, result);
                return result;
            } else {
                // Flat structure: return all items as-is (already includes horizontal_url/horizontal_id where applicable)
                const result = Object.values(dataObj).filter(Boolean);
                console.log(`[getSwatchItems base] flat structure: ${result.length} items`, result);
                return result;
            }
        }

        if (group === 'metal-edge-veneer') {
            return Object.values(dataObj || {}).filter(Boolean);
        }

        return Object.values(dataObj || {}).filter(Boolean);
    }

    /**
     * Extract correct data for current group and product type from state.colourOptions
     * @param {string} group 
     * @param {string} productType 
     * @param {string} productId - The WooCommerce product ID (used to check horizontal bases flag for base group)
     * @returns {object}
     */
    getUIData(group, productType, productId) {

        if(group === 'top-colour') {

            return this.state.colourOptions[productType]?.colour_options || {};

        } else if(group === 'base') {

            // For base swatches, return master_values which contains all bases
            const baseData = this.state.colourOptions.master_values[productType]?.base || {};

            // Mirror PHP logic: if this is a horizontal product, apply horizontal URLs
            if (this.isHorizontalBasesProduct(productId)) {
                const horizontalBases = window.TM3DPlugin?.data?.product_data?.horizontal_bases || {};
                
                // Iterate through base data and apply horizontal URLs where available
                // Handle both nested (wood/tile) and flat structures
                Object.keys(baseData).forEach(baseKey => {
                    if (baseKey === 'wood' || baseKey === 'tile') {
                        // Nested structure: iterate through items within wood/tile
                        Object.keys(baseData[baseKey]).forEach(baseName => {
                            if (horizontalBases[baseName]) {
                                baseData[baseKey][baseName].url = horizontalBases[baseName].url;
                            }
                        });
                    } else {
                        // Flat structure: apply directly
                        if (horizontalBases[baseKey]) {
                            baseData[baseKey].url = horizontalBases[baseKey].url;
                        }
                    }
                });
            }

            return baseData;

        } else if(group === 'metal-edge-veneer') {

            return this.state.colourOptions.master_values[productType]?.metal || {}

        };

    }

    /**
     * Check if a product is in the horizontal bases category (239) and is tile-based.
     * Only tile-based products in cat 239 display bases horizontally.
     * @param {string} productId - The WooCommerce product ID
     * @returns {boolean} True if product is in horizontal bases category AND is tile-based
     */
    isHorizontalBasesProduct(productId) {

        // Check if product is in the models data with use_horizontal_bases flag
        if (productId && window.TM3DPlugin?.data?.models) {
            const models = window.TM3DPlugin.data.models;
            
            // Search through all collections for this product
            for (const collection in models) {
                if (models[collection] && models[collection][productId]) {
                    const product = models[collection][productId];
                    // Return true only if product is in cat 239 AND is tile-based (not wood)
                    return product.use_horizontal_bases === true && product.baseType !== 'wood';
                }
            }
        }

        // Fallback: check if product_data has use_horizontal_bases flag set and baseType is tile
        // This is set by getProductModels() for the initial product
        if (this.state.colourOptions?.use_horizontal_bases && this.state.colourOptions?.baseType !== 'wood') {
            return true;
        }

        return false;
    }

    /**
     * Update the model select element with available models for the selected product type and collection.
     * @param {string} id 
     * @param {string} collection 
     * @returns {void}
     */
    updateModels(id, collection) {

        // Get the model data for the selected product type and collection
        const modelsByCollection = window.TM3DPlugin?.data?.models || {};
        let model = modelsByCollection?.[collection]?.[id] || null;

        // Fallback: resolve by product id across all collections when collection context mismatches.
        if (!model) {
            for (const models of Object.values(modelsByCollection)) {
                if (models && Object.prototype.hasOwnProperty.call(models, id)) {
                    model = models[id];
                    break;
                }
            }
        }

        model = model || {};
         
        const modelSelectEl = document.querySelector('.obj-model select');

        if (!modelSelectEl) {
            console.warn('Model select element not found.');
            return;
        }

        // Clear existing options
        modelSelectEl.innerHTML = '';

        // Populate the model select element with new options
        model?.model_sizes?.forEach(size => {

            // Calculate price including VAT
            const priceInclVat = size.price * 1.2;

            // Create a new option element for the model size
            const option = document.createElement('option');

            // Set the option's value, text content, and data attributes
            option.value = size.label;
            option.textContent = size.label;
            option.dataset.label = size.label;
            option.dataset.wapfPrice = priceInclVat;
            option.dataset.exVat = size.price;

            // If the size has a price greater than 0, append a span element to display the price
            if(size.price > 0) {

                // Create a span element to display the price including VAT
                const span = document.createElement('span');
                
                // Add a class for styling the price label
                span.classList.add('price-label');
                span.textContent = ` (+£${priceInclVat.toFixed(2)})`;
                
                // Append the span to the option element
                option.appendChild(span);

            }

            // Set default selection
            if(size.is_default) {
                option.selected = true;
            }

            // Append the option to the model select element
            modelSelectEl.appendChild(option);

        });

        // Add base model size to url
        const defaultModelSize = model?.model_sizes?.find(size => size.is_default)?.label || '';
        this.updateURL({ model: defaultModelSize });

    }

    /**
     * Updates the URL with the given parameters.
     * @param {object} params - The parameters to update in the URL.
     * @returns {void}
     */
    updateURL(params = {}, productUrl = '') {

        // Mapping of parameter keys to URL query parameter names
        const map = {
            'id': 'id',
            'colour': 'colour',
            'veneer': 'veneer',
            'secondcolour': 'base',
            'model': 'model'
        };

        // Keep the visible browser URL on the current page.
        const browserUrl = new URL(window.location.href);

        const cartForm = document.querySelector('form.cart');

        // Use the product permalink only for basket/share/pdf flows.
        const actionBaseUrl = productUrl || cartForm?.getAttribute('data-product-url') || cartForm?.action || window.location.href;
        const actionUrl = new URL(actionBaseUrl);

        // Loop over params and update URL
        for (const [key, value] of Object.entries(params)) {

            if (value) {
                // Add or update parameter manually
                browserUrl.searchParams.set(map[key], value);
                actionUrl.searchParams.set(map[key], value);

            } else {

                // Remove parameter if value is empty
                browserUrl.searchParams.delete(map[key]);
                actionUrl.searchParams.delete(map[key]);

            }

        }

        // Manually rebuild query string to prevent + for spaces
        const buildUrlString = (url) => {
            let queryString = '';
            url.searchParams.forEach((val, key) => {
                queryString += `${key}=${encodeURIComponent(val)}&`;
            });

            queryString = queryString.slice(0, -1);

            return `${url.origin}${url.pathname}${queryString ? '?' + queryString : ''}`;
        };

        const newBrowserUrl = buildUrlString(browserUrl);
        const newActionUrl = buildUrlString(actionUrl);

        // Update browser URL without reload
        window.history.replaceState({}, '', newBrowserUrl);

        if (cartForm) {
            cartForm.action = newActionUrl;

            if (productUrl) {
                cartForm.setAttribute('data-product-url', productUrl);
            }
        }

    }

}