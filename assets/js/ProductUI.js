export default class ProductUI {

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
     * Rebuild UI after product model change to correctly reflect available options for the selected product type.
     * @param {string} id - The ID of the selected product type.
     * @param {string} productType - The type of the selected product.
     * @param {string} collection - The collection to which the product belongs.
     */
    buildUI(id, productType, collection) {

        // Groups to iterate over for building swatches
        const groups = {

            top: 'top-colour',
            base: 'base',
			metal: 'metal-edge-veneer'

        }

        Object.entries(groups).forEach(([key, group]) => {
            
            // Get the currently selected option for the group
            const selected = document.querySelector(`.obj-${group} input[type="radio"]:checked`);

                // Get the data object for the current group and product type
                const dataObj = this.getUIData(group, productType);

                // Build the HTML for the swatches based on the group and data object
                if(dataObj && typeof dataObj === 'object') {

                    // Build the HTML for the swatches based on the group and data object
                    const groupContainer = document.querySelector(`.obj-${group} .wapf-image-swatch-wrapper`);

                    if(groupContainer) {

                        let html = '';

                        // Iterate over the data object to create swatch HTML
                        for (const item of Object.values(dataObj)) {

                            // Destructure name, id, and url based on the group type
                            const { name, id, url } = group === 'top-colour' ? item?.top || {} : item || {};

                            // Verify data exists before appending HTML
                            if (id) {
                                html += `
                                    <div class="wapf-swatch wapf-swatch--image apf-pick-box">
                                        <label aria-label="${name}">
                                            <input
                                                type="radio"
                                                id="${id}"
                                                name="${group.replace('-', '_')}"
                                                class="wapf-input"
                                                value="${name}"
                                                ${selected && selected.value === name ? 'checked' : ''}
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

                        groupContainer.innerHTML = html;

                    } else {
                        console.warn(`Container for group "${group}" not found.`);
                    }

                }
                
        });

        // Update models for the selected product type
        this.updateModels(id, collection);

    }

    /**
     * Extract correct data for current group and product type from state.colourOptions
     * @param {string} group 
     * @param {string} productType 
     * @returns {object}
     */
    getUIData(group, productType) {

        if(group === 'top-colour') {

            return this.state.colourOptions[productType]?.colour_options || {};

        } else if(group === 'base') {

            return this.state.colourOptions.master_values[productType]?.base || {};

        } else if(group === 'metal-edge-veneer') {

            return this.state.colourOptions.master_values[productType]?.metal || {}

        };

    }

    /**
     * Update the model select element with available models for the selected product type and collection.
     * @param {string} id 
     * @param {string} collection 
     * @returns {void}
     */
    updateModels(id, collection) {

        // Get the model data for the selected product type and collection
        const model = window.TM3DPlugin?.data?.models?.[collection]?.[id] || {};
         
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

            // Set class based on whether the size is the default model size
            size.is_default ? option.classList.add('selected') : option.classList.remove('selected');

            // Append the option to the model select element
            modelSelectEl.appendChild(option);

        });

    }

}