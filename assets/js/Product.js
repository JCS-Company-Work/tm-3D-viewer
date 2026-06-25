import ProductState from './ProductState.js';
import ProductRules from './ProductRules.js';
import ProductViewer from './ProductViewer.js';

export default class Product {

    constructor() {

        this.state = new ProductState();
        this.rules = new ProductRules(this.state);

        this.viewer = new ProductViewer('#obj3dviewer');

        this.state.colourOptions = window.TM3DPlugin?.colourOptions || {};
console.log('ProductState colourOptions:', this.state.colourOptions);
        this.init();
    }

    init() {
        this.setConfigDrawerState();
        this.addSwatchListeners();
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

                // -------------------------
                // PRODUCT TYPE (MODEL SWITCH)
                // -------------------------
                if (typeGroup) {

                    const sku = input.getAttribute('data-sku');

                    // IMPORTANT: reset rules first so old state doesn't leak
                    this.rules.resetForProductType?.(sku);

                    this.viewer.setProductModel(sku);

                    this.viewer.updateFromState(this.rules.state);
                    return;
                }

                // TOP COLOUR
                if (topGroup) {

                    this.rules.setColourOptions(swatchName);
                    this.rules.setSelectedOptions();
                    this.rules.setDefaults();
                    this.viewer.updateFromState(this.rules.state);
                    return;
                }

                // BASE / METAL
                if (baseGroup || metalGroup) {

                    this.rules.setSelectedOptions();
                    this.rules.setDefaults();
                    this.viewer.updateFromState(this.rules.state);
                }
            });
        });
    }
}

// init
window.addEventListener('DOMContentLoaded', () => {

    const product = new Product();
    const viewer = product.viewer;

    viewer.init();
});