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
     * @param {string} productType 
     */
    buildUI(productType) {

        // Groups to iterate over for building swatches
        const groups = {

            top: 'top-colour',
            base: 'base',
			metal: 'metal-edge-veneer'

        }
console.table(this.state);
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

}