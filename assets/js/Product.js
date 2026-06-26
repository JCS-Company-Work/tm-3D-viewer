import ProductState from './ProductState.js';
import ProductRules from './ProductRules.js';
import ProductViewer from './ProductViewer.js';

export default class Product {

    constructor() {

        this.state = new ProductState();
        this.rules = new ProductRules(this.state);

        this.viewer = new ProductViewer('#obj3dviewer');

        this.state.colourOptions = window.TM3DPlugin?.data?.product_data || {};
console.log('ProductState colourOptions:', this.state.colourOptions);
        this.init();
    }

    init() {
        this.setConfigDrawerState();
        this.addSwatchListeners();
        this.updateModel();
        this.syncInitialURLState();
        this.viewer.init();
    }

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

    addSwatchListeners = () => {

        const allInputs = document.querySelectorAll('.wapf-swatch input[type="radio"]');

        allInputs.forEach(input => {

            input.addEventListener('change', () => {

                const topGroup   = input.closest('.obj-top-colour');
                const baseGroup  = input.closest('.obj-base');
                const metalGroup = input.closest('.obj-metal-edge-veneer');
                const typeGroup  = input.closest('.obj-product-type');

                const label = input.closest('label');
                const swatchName = label?.getAttribute('aria-label')?.trim() || '';

                // Product Type
                if (typeGroup) {

                    // Get the SKU for the selected product type
                    const sku = input.getAttribute('data-sku');

                    // Reset rules first so old state doesn't leak
                    const topColour = this.rules.resetForProductType();

                    // Update the rules with the new selected top colour
                    this.rules.setColourOptions(topColour);

                    // Update the viewer with the new selected product type and top colour
                    this.viewer.setProductModel(sku);
                    return;
                }

                // Top Colour
                if (topGroup) {

                    // Update the rules with the new selected top colour
                    this.rules.setColourOptions(swatchName);

                    // Update the viewer with the new selected options
                    this.viewer.updateColourOptions(this.state.selectedOptions);
                    return;
                }

                // Base / Metal
                if (baseGroup || metalGroup) {

                    // Update the rules with the new selected base or metal colour
                    this.rules.setSelectedOptions();

                    // Update the viewer with the new selected options
                    this.viewer.updateColourOptions(this.state.selectedOptions);

                }

            });
        });
    }

    /**
     * Keep the URL in sync with current page selections before deferred 3D init.
     */
    syncInitialURLState() {

        // Get initial state from window.TM3DPlugin.data
        const initialState = window.TM3DPlugin?.data?.initial_state || {};

        const params = {
            id: initialState?.id || '',
            colour: initialState?.top || '',
            metalcolour: initialState?.metal || '',
            secondcolour: initialState?.base || '',
            model: initialState?.default_model_size || ''
        };

        this.updateURL(params);

    }

    /**
     * Sets event listeners for model select changes to update the URL dynamically
     * @returns {void}
     */
    updateModel() {

        // Get model select element from DOM
        const modelSelect = document.querySelector('.obj-model select');
        if (!modelSelect) return;

        // Listen for changes
        modelSelect.addEventListener('change', () => {

            // Extract selected model size
            const selectedOption = modelSelect.options[modelSelect.selectedIndex];
            const label = selectedOption.getAttribute('data-label');

            // Update URL with new model size
            this.updateURL({'model': label});

        });

    }

    /**
     * Updates the URL with the given parameters.
     * @param {object} params - The parameters to update in the URL.
     * @returns {void}
     */
    updateURL(params = {}) {

        // Mapping of parameter keys to URL query parameter names
        const map = {
            'id': 'id',
            'colour': 'colour',
            'metalcolour': 'veneer',
            'secondcolour': 'base',
            'model': 'model'
        };

        // Get current URL object
        const url = new URL(window.location.href);

        // Loop over params and update URL
        for (const [key, value] of Object.entries(params)) {
        //console.log(`Updating URL param: ${key} = ${value}`);
            if (value) {

                // Encode properly with %20
                const encodedValue = encodeURIComponent(value);

                // Add or update parameter manually
                url.searchParams.set(map[key], encodedValue);

            } else {

                url.searchParams.delete(map[key]);

            }

        }

        // Manually rebuild query string to prevent + for spaces
        let queryString = '';
        url.searchParams.forEach((val, key) => {
            queryString += `${key}=${val}&`;
        });

        // remove trailing &
        queryString = queryString.slice(0, -1); 

        // Build new URL
        const newUrl = `${url.origin}${url.pathname}${queryString ? '?' + queryString : ''}`;

        // Update browser URL without reload
        window.history.replaceState({}, '', newUrl);

    }
    
}

// init
window.addEventListener('DOMContentLoaded', () => {

    const product = new Product();
    const viewer = product.viewer;  

    viewer.init();
});