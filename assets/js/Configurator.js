import ConfiguratorState from './configurator/ConfiguratorState.js';
import ConfiguratorRules from './configurator/ConfiguratorRules.js';
import ConfiguratorUI from './configurator/ConfiguratorUI.js';
import CurrentStatus from './configurator/CurrentStatus.js';
import Viewer3D from './configurator/Viewer3D.js';
import SampleAddToCart from './ajax/ajax-add-sample-to-cart.js';
import ProductAddToCart from './ajax/ajax-add-product-to-cart.js';
import PDFGenerator from './pdf/BuildPDF.js';
import Gallery from './gallery/Gallery.js';

export default class Configurator {

    constructor() {

        // Init Configurator State, ConfiguratorRules, ConfiguratorUI, PDF and 3D Viewer instances
        this.state = new ConfiguratorState();
        this.rules = new ConfiguratorRules(this.state);
        this.ui = new ConfiguratorUI(this.state);
        this.currentStatus = new CurrentStatus(this.state);
        this.viewer = new Viewer3D('#obj3dviewer');
        this.sampleAddToCart = new SampleAddToCart();
        this.productAddToCart = new ProductAddToCart();
        this.pdfGenerator = new PDFGenerator();
        this.gallery = new Gallery();

        // Load colour options from global data if available
        this.state.colourOptions = window.TM3DPlugin?.data?.product_data || {};

        // Initialize the configurator
        this.init();

    }

    init() {
        this.ui.setConfigDrawerState();
        this.addSwatchListeners();
        this.addCollectionFilterListeners();
        this.updateModel();
        this.syncInitialURLState();
        this.initCreatedByUs();
    }

    /**
     * Sets up event listeners for the swatch inputs, 
     * allowing the configurator to respond to user selections.
     * @returns {void}
     */
    addSwatchListeners = () => {

        // Get the wrapper for the swatch groups
        const groupWrapper = document.querySelector('.wapf-field-group');

        // If the wrapper doesn't exist, exit early
        if (!groupWrapper) {
            return;
        }

        // Listen for changes on the swatch inputs
        groupWrapper.addEventListener('change', (e) => {

            // Find the closest radio input within a swatch that triggered the change event
            const input = e.target.closest('.wapf-swatch input[type="radio"]');

            // If no input is found, exit early
            if (!input) return;

            // Find the closest group container for the input
            const group = input.closest('.obj-product-type, .obj-top-colour, .obj-base, .obj-metal-edge-veneer');

            // If no group is found, exit early
            if (!group) return;

            // Get the label and swatch name for the selected input
            const label = input.closest('label');
            const swatchName = label?.getAttribute('aria-label')?.trim() || '';

            // Handle the selection based on the group type
            if (group.matches('.obj-product-type')) {

                // Update the selected product type in the state
                const productType = input.getAttribute('data-product-type');
                const collection = input.closest('.collection-wrapper').getAttribute('data-collection');
                const id = input.id;

                // Rebuild created by us section to reflect the new product
                this.ui.buildCreatedByUs(input.id);

                // Rebuild the UI for the new product type
                this.ui.buildUI(input.id, productType, collection);

                // Update the viewer with the selected product model so downstream rules use the active SKU.
                const sku = input.dataset.sku;
                this.viewer.setProductModel(sku);

                // Sync rule context from the rebuilt DOM before resolving default options.
                this.rules.setProductData();

                // Reset the top colour selection for the new product type
                this.rules.resetForProductType(productType);

                // Sync again in case resetForProductType auto-selected a fallback top colour.
                this.rules.setProductData();
                
                // Update the available colour options based on the selected top colour
                this.rules.setColourOptions();

                // Update the current status layer with the selected product type
                this.currentStatus.updateStatusLayer(input);

                 // Schedule a single composite image update regardless of which layer changed
                this.currentStatus.scheduleCompositeUpdate();

                // Update QR code
                this.currentStatus.createQR();

                // Keep price block in sync with the newly selected product + default size.
                const selectedModel = window.TM3DPlugin?.data?.models?.[collection]?.[id] || {};
                const statusPrice = document.querySelector('.status-price');
                if (statusPrice && selectedModel?.price !== undefined) {
                    statusPrice.setAttribute('data-ex-vat-price-base', String(selectedModel.price));
                }
                this.currentStatus.updatePrice();
                this.currentStatus.determineModel();
                this.currentStatus.updateSpecText();
                this.currentStatus.updateDimensions();

                // Update the viewer with the selected product type
                const urlParams = this.viewer.updateColourOptions(this.state.selectedOptions, id);

                // Clear stale veneer from URL when current model has no metal selection.
                if (!this.state.selectedOptions?.metal) {
                    urlParams.veneer = '';
                }

                this.ui.updateURL(urlParams);

                return;
            }

            // Top Colour
            if (group.matches('.obj-top-colour')) {

                // Update globally stored product data
                this.rules.setProductData();

                // Update the colour options for the selected top colour
                this.rules.setColourOptions();

                // Update the current status layer with the selected product type
                this.currentStatus.updateStatusLayer(input);

                 // Schedule a single composite image update regardless of which layer changed
                this.currentStatus.scheduleCompositeUpdate();

                // Update QR code
                this.currentStatus.createQR();

                // Update the viewer with the selected top colour
                const urlParams = this.viewer.updateColourOptions(this.state.selectedOptions);

                // Clear stale veneer from URL when current top/model has no metal selection.
                if (!this.state.selectedOptions?.metal) {
                    urlParams.veneer = '';
                }

                this.ui.updateURL(urlParams);

                return;
            }

            // Base / Metal
            if (group.matches('.obj-base') || group.matches('.obj-metal-edge-veneer')) {

                // Update the selected options for base or metal
                this.rules.setSelectedOptions();

                // Update the current status layer with the selected options
                this.currentStatus.updateStatusLayer(input);

                // Schedule a single composite image update regardless of which layer changed
                this.currentStatus.scheduleCompositeUpdate();

                // Update QR code
                this.currentStatus.createQR();

                // Update the viewer with the selected options
                const urlParams = this.viewer.updateColourOptions(this.state.selectedOptions);

                // Clear stale veneer from URL when metal is not selected/available.
                if (!this.state.selectedOptions?.metal) {
                    urlParams.veneer = '';
                }

                this.ui.updateURL(urlParams);

                return;

            }

        });
    }

    /**
     * Add click listeners to collection filter buttons to 
     * show/hide swatches based on the selected collection.
     * @returns {void}  
     */
    addCollectionFilterListeners = () => {

        // Get the wrapper for the swatch groups
        const groupWrapper = document.querySelector('.wapf-field-group');

        // If the wrapper doesn't exist, exit early
        if (!groupWrapper) {
            return;
        }

        // Listen for clicks on the collection filter buttons
        groupWrapper.addEventListener('click', (e) => {

            // Find the closest collection filter button that was clicked
            const button = e.target.closest('.collection-filter');

            // If no button is found, exit early
            if (!button) {
                return;
            }

            // Show the products for the selected collection
            this.showCollection(button.dataset.collection);

        });

    }

    /**
     * Show the products in the selected collection and hide others.
     * @param {string} collection - The collection to show.
     */
    showCollection = (collection) => {

        const groupWrapper = document.querySelector('.wapf-field-group');

        groupWrapper.querySelectorAll('.collection-filter').forEach(button => {
            button.classList.toggle('active', button.dataset.collection === collection);
        });

        groupWrapper.querySelectorAll('.collection-wrapper').forEach(wrapper => {
            wrapper.classList.toggle('active', wrapper.dataset.collection === collection);
        });

    }

    /**
     * Keep the URL in sync with current page selections before deferred 3D init.
     * @returns {void}
     */
    syncInitialURLState() {

        // Get initial state from window.TM3DPlugin.data
        const initialState = window.TM3DPlugin?.data?.initial_state || {};
        const modelSelect = document.querySelector('.obj-model select');
        const selectedModelOption = modelSelect?.options?.[modelSelect.selectedIndex];
        const selectedModelLabel =
            selectedModelOption?.getAttribute('data-label') ||
            selectedModelOption?.value ||
            '';

        // Prepare parameters for URL update
        const params = {
            id: initialState?.id || '',
            colour: initialState?.top || '',
            veneer: initialState?.veneer || '',
            secondcolour: initialState?.base || '',
            model: selectedModelLabel || initialState?.model || initialState?.default_model_size || ''
        };

        // Update the URL with the initial state parameters
        this.ui.updateURL(params);

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
            this.ui.updateURL({'model': label});

        });

    }

    /**
     * Initializes the "Created By Us" section, allowing users to select pre-configured options.
     * @returns {void}
     */
    initCreatedByUs() {

        // Attach one delegated listener so dynamically replaced cards keep working.
        const configsContainer = document.querySelector('.created-by-us-configurations');

        if (!configsContainer) {
            return;
        }

        configsContainer.addEventListener('click', (event) => {

                const config = event.target.closest('.created-by-us-configuration');

                if (!config || !configsContainer.contains(config)) {
                    return;
                }

                event.preventDefault();

                // Extract top, base, and metal values from the clicked configuration
                const top = (config.getAttribute('data-top') || '').trim();
                const base = (config.getAttribute('data-base') || '').trim();
                const metal = (config.getAttribute('data-metal') || '').trim();

                // Select the corresponding swatches in the UI based on the extracted values
                if (top) {
                    const topInput = document.querySelector(`.obj-top-colour input[type="radio"][value="${CSS.escape(top)}"]`);
                    if (topInput) {
                        topInput.checked = true;
                    }
                }

                // Update product data and colour options based on the selected top colour
                this.rules.setProductData();
                this.rules.setColourOptions();

                // Select the corresponding base and metal swatches in the UI based on the extracted values
                if (base) {
                    const baseInput = document.querySelector(`.obj-base input[type="radio"][value="${CSS.escape(base)}"]`);
                    if (baseInput) {
                        baseInput.checked = true;
                    }
                }

                // Select the corresponding metal swatch in the UI based on the extracted value
                if (metal) {
                    let metalInput = document.querySelector(`.obj-metal-edge-veneer input[type="radio"][value="${CSS.escape(metal)}"]`);

                    if (!metalInput) {
                        const normalizedMetal = metal.replace(/^banding[-_]/i, '');
                        metalInput = document.querySelector(`.obj-metal-edge-veneer input[type="radio"][value="${CSS.escape(normalizedMetal)}"]`);
                    }

                    if (metalInput) {
                        metalInput.checked = true;
                    }
                }

                // Update product data and selected options based on the chosen configuration
                this.rules.setProductData();
                this.rules.setSelectedOptions();

                // Update the current status layer and load/create a composite image update
                const statusInput = document.querySelector('.obj-top-colour input[type="radio"]:checked');
                this.currentStatus.updateStatusLayer(statusInput);
                this.currentStatus.scheduleCompositeUpdate();
                this.currentStatus.createQR();

                // Update the 3D viewer with the selected options
                const urlParams = this.viewer.updateColourOptions(this.state.selectedOptions);
                if (!this.state.selectedOptions?.metal) {
                    urlParams.veneer = '';
                }

                // Update the URL to reflect the selected configuration
                this.ui.updateURL(urlParams);

                const modelSection = document.getElementById('3d-model');
                if (modelSection) {
                    modelSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }

        });

    }
    
}

// Initialize the configurator and viewer when the DOM is fully loaded
window.addEventListener('DOMContentLoaded', () => {

    const configurator = new Configurator();
    //const viewer = configurator.viewer;  
    
});