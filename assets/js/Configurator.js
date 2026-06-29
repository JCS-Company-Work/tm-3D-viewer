import ProductState from './ProductState.js';
import ProductRules from './ProductRules.js';
import ProductViewer from './ProductViewer.js';

export default class Configurator {

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

        const groupWrapper = document.querySelector('.wapf-field-group');

        if (!groupWrapper) {
            return;
        }

        groupWrapper.addEventListener('change', (e) => {

            // Find the closest radio input within a swatch that triggered the change event
            const input = e.target.closest('.wapf-swatch input[type="radio"]');

            // If no input is found, exit early
            if (!input) {
                return;
            }

            // Find the closest group container for the input
            const group = input.closest(
                '.obj-product-type, .obj-top-colour, .obj-base, .obj-metal-edge-veneer'
            );

            // If no group is found, exit early
            if (!group) {
                return;
            }

            // Get the label and swatch name for the selected input
            const label = input.closest('label');
            const swatchName = label?.getAttribute('aria-label')?.trim() || '';

            // Product Type
            if (group.matches('.obj-product-type')) {

                // Reset the top colour selection for the new product type
                const topColour = this.rules.resetForProductType();

                // Build and update the top colour swatches based on the selected product type
                this.buildTopColoursHtml(input.getAttribute('data-product-type'), topColour);

                // Update the available colour options based on the selected top colour
                this.rules.setColourOptions(topColour);

                // Update the viewer with the selected product model
                const sku = input.dataset.sku;
                this.viewer.setProductModel(sku);

                // Update the viewer with the selected product type
                const id = input.id;
                this.viewer.updateColourOptions(this.state.selectedOptions, id);

                return;
            }

            // Top Colour
            if (group.matches('.obj-top-colour')) {

                this.rules.setColourOptions(swatchName);

                this.viewer.updateColourOptions(this.state.selectedOptions);

                return;
            }

            // Base / Metal
            if (
                group.matches('.obj-base') ||
                group.matches('.obj-metal-edge-veneer')
            ) {

                this.rules.setSelectedOptions();

                this.viewer.updateColourOptions(this.state.selectedOptions);
            }

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

    buildTopColoursHtml(productType, selectedTopColour) {

        // Save selected product type options
        const materialsObj = this.state.colourOptions[productType]?.colour_options || {};

        // Get the container for top colours
        const topColoursContainer = document.querySelector('.obj-top-colour .wapf-image-swatch-wrapper');

        // Ensure data exists and is a valid object
        if (!materialsObj || typeof materialsObj !== 'object') {
            console.warn('No valid colour options found for product type:', productType);
            return '';
        }

        // Initialize HTML string
        let html = '';

        // Iterate over each material in the colour options
        for (const material of Object.values(materialsObj)) {
            
            // Destructure name, id, and url from the material's top property
            const { name, id, url } = material?.top || {};
            
            // Verify data exists before appending HTML
            if (id) {
                html += `
                    <div class="wapf-swatch wapf-swatch--image apf-pick-box">
                        <label aria-label="${name}">
                            <input
                                type="radio"
                                name="top_colour"
                                class="wapf-input"
                                value="${name}"
                                ${selectedTopColour === name ? 'checked' : ''}
                                data-sample-id="${id}"
                            >

                            <div>
                                <img
                                    class="swatch"
                                    src="${url}"
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

        // Update the inner HTML of the top colours container
        topColoursContainer.innerHTML = html;

    }
    
}

// Initialize the configurator and viewer when the DOM is fully loaded
window.addEventListener('DOMContentLoaded', () => {

    const configurator = new Configurator();
    const viewer = configurator.viewer;  

    viewer.init();
});