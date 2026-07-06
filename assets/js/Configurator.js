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

                // Update globally stored product data
                this.rules.storeProductData();

                // Rebuild the UI for the new product type
                this.ui.buildUI(input.id, input.getAttribute('data-product-type'), input.closest('.collection-wrapper').getAttribute('data-collection'));

                // Reset the top colour selection for the new product type
                this.rules.resetForProductType();
                
                // Update the available colour options based on the selected top colour
                this.rules.setColourOptions();

                // Update the viewer with the selected product model
                const sku = input.dataset.sku;
                this.viewer.setProductModel(sku);

                // Update QR code
                this.currentStatus.createQR();

                // Update the viewer with the selected product type
                const id = input.id;
                const urlParams = this.viewer.updateColourOptions(this.state.selectedOptions, id);

                this.ui.updateURL(urlParams);

                return;
            }

            // Top Colour
            if (group.matches('.obj-top-colour')) {

                // Update globally stored product data
                this.rules.storeProductData();

                // Update the colour options for the top colour
                this.rules.setColourOptions(swatchName);

                // Update QR code
                this.currentStatus.createQR();

                // Update the viewer with the selected top colour
                const urlParams = this.viewer.updateColourOptions(this.state.selectedOptions);

                this.ui.updateURL(urlParams);

                return;
            }

            // Base / Metal
            if (group.matches('.obj-base') || group.matches('.obj-metal-edge-veneer')) {

                // Update the selected options for base or metal
                this.rules.setSelectedOptions();

                // Update QR code
                this.currentStatus.createQR();

                // Update the viewer with the selected options
                const urlParams = this.viewer.updateColourOptions(this.state.selectedOptions);

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

        // Prepare parameters for URL update
        const params = {
            id: initialState?.id || '',
            colour: initialState?.top || '',
            veneer: initialState?.veneer || '',
            secondcolour: initialState?.base || '',
            model: initialState?.default_model_size || ''
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
    
}

// Initialize the configurator and viewer when the DOM is fully loaded
window.addEventListener('DOMContentLoaded', () => {

    const configurator = new Configurator();
    //const viewer = configurator.viewer;  
    
});