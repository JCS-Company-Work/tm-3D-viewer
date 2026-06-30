import ProductState from './ProductState.js';

export default class ProductRules {

    constructor(state) {

        // Map option types to css classes
		this.optionToClass = {
			base: 'base',
			metal: 'metal-edge-veneer'
		};

        // Store reference to ProductState instance
        this.state = state;
    }

    // ===================== Option Logic & State Management ===================== //

    /**
     * Determine the default selections for base and edge groups based on 
     * the selected product type and top colour, and to update the available options in the UI accordingly.
     * @returns {string} The top colour to be used for the selected product type.
     */
    resetForProductType() {

        // Get product type from current selected product type
        const productType = document.querySelector('.obj-product-type input[type="radio"]:checked')?.getAttribute('data-product-type') || '';

        // Check if top colour is valid for the selected product type
        const topColour = document.querySelector('.obj-top-colour input[type="radio"]:checked')?.value || '';

        // Get available options for the selected product type and top colour
        const availableOptions = this.state.colourOptions?.[productType]?.colour_options || {};
        console.log('Available options for product type', productType, ':', availableOptions);
        // If top colour is multi-word, convert spaces to underscores to match keys in colourOptions
        const formattedTopColour = topColour.toLowerCase().trim().replace(/\s+/g, '_');

        // Check if the top colour is valid for the selected product type
        const isTopColourValid = availableOptions.hasOwnProperty(formattedTopColour);

        // If the top colour is valid, set the available options for base and edge groups
        if (isTopColourValid) {

            return topColour;
            
        } else {

            // Extract the first available top colour for the selected product type
            const firstAvailableColour =
                Object.values(availableOptions)[0]?.top?.name || '';

            // Find all inputs in this group
            const topColourInputs = document.querySelectorAll(
                '.obj-top-colour input[type="radio"]'
            );

            // Try to find a match
            const topColourInput = Array.from(topColourInputs)
                .find(input => input.value === firstAvailableColour);

            // If a match is found, check it and return the first available colour
            if (topColourInput) {
                topColourInput.checked = true;
                return firstAvailableColour;
            }

            // If no match is found, log a warning and return an empty string
            console.warn(`No matching input found for top colour "${firstAvailableColour}".`);
            return '';

        }
    }

    /**
     * Set available options for base and edge groups based on the selected top colour swatch.
     * The mapping of available options for each swatch is defined in the colourOptions object.
     * @param {string} topColour - The name of the selected top colour swatch 
     */
    setColourOptions = (topColour) => {

        // If top colour is multi-word, convert spaces to underscores to match keys in colourOptions
        const formattedTopColour = topColour.toLowerCase().trim().replace(/\s+/g, '_');

        // Set available bases and edges based on the swatch name
        this.state.availableOptions = this.getAvailableOptions(topColour);

		// Convert available options object to an array of [optionType, optionsArray] pairs for easier iteration
        const availableOptionsArr = Object.entries(this.state.availableOptions || {});

        // Loop over available options and update the UI accordingly (e.g., show/hide or enable/disable options)
        this.showHideOptions(availableOptionsArr);

        // Finalize selected options after availability has been applied in the UI
        this.setSelectedOptions();

    }

    /**
     * Get available options for a given top colour.
     * @param {string} topColour - The name of the selected top colour swatch.
     * @returns {Object} An object containing available options for the selected top colour.
     */
    getAvailableOptions(topColour) {

         // If top colour is multi-word, convert spaces to underscores to match keys in colourOptions
        const formattedTopColour = topColour.toLowerCase().trim().replace(/\s+/g, '_');

        // Get product type from current selected product type
        const productType = document.querySelector('.obj-product-type input[type="radio"]:checked')?.getAttribute('data-product-type') || '';

        // Return available options for the selected top colour and product type, or an empty object if not found
        return this.state.colourOptions?.[productType]?.colour_options?.[formattedTopColour] || {};

    }

    /**
     * Set the selected options for the product based on the currently checked swatches in the DOM. 
     * This function is used to determine the default selections for base and edge groups based on 
     * the selected top colour and to update the selectedOptions object with the current selections.
     */
    setSelectedOptions() {

        // Loop over optionToClass and log key/class
        Object.entries(this.optionToClass).forEach(([key, className]) => {

            // Find swatches in DOM
            const swatchesGroup = document.querySelector(`.wapf-field-group .obj-${className}`);

            // Activate/deaviate metals UI group based on whether product has metals
            this.setMetalEdgeState(className, swatchesGroup);

            // If no swatches found for this group, skip to next iteration
            if(!swatchesGroup) return;

            // If there are swatches find the currently checked option for this group
            const checkedSwatch = swatchesGroup.querySelector('input[type="radio"]:checked')?.closest('.wapf-swatch');

            // If no checked swatch is found, skip to next iteration
            if (!checkedSwatch) return;

            // If there is a checked option, extract the value and check if it's available for the selected top colour
            const input = checkedSwatch.querySelector('input');

            // If no input is found, skip to next iteration
            if (!input) return;

            // Extract the value of the checked option and format it for comparison
            const value = input.value.toLowerCase().trim();

            // Get product type from current selected product type
            const productType = document.querySelector('.obj-product-type input[type="radio"]:checked')?.getAttribute('data-product-type') || '';

            // Check if top colour is valid for the selected product type
            const topColour = document.querySelector('.obj-top-colour input[type="radio"]:checked')?.value || '';
            const formattedTopColour = topColour.toLowerCase().trim().replace(/\s+/g, '_');

            // Get the list of available options for the selected top colour and product type
            const availableList = this.state.colourOptions?.[productType]?.colour_options?.[formattedTopColour]?.[key] ?? [];

            // If there are no available options for this group, skip to next iteration
            if (availableList.length === 0) {
                return;
            }

            // Check if the currently checked option is in the list of available options
            const isAvailable = availableList.includes(value);

            // Set up selectedOption variable to hold final value
            let selectedOption;
            
            if(!isAvailable) {

                // If the current option is not available for the top colour, find the first available option and set selectedOption to that
                selectedOption = this.getFirstAvailableOption(swatchesGroup, availableList);

                // If no available options are found, log a warning and return early to avoid errors
                if (!selectedOption) {
                    console.warn(`No available options found for ${key} with the selected top colour.`);
                    return;
                }

                // Check the input inside the swatch to update the form state
                const input = selectedOption.querySelector('input');
                if (input) {
                    input.checked = true;
                }
                
            }

            // If the currently checked option is available, use it as the default selection
            if (isAvailable) {
                selectedOption = checkedSwatch;
            }

            // Extract the image file name from the selected option to use as the default option value
            // Add colour and file name to object of defaults to be sent in the custom event
            const swatchImage = selectedOption.querySelector('.swatch');
            const imgFileName = this.getImageFileName(swatchImage);
            const selectedLabel = selectedOption.querySelector('label')?.textContent?.trim();

            if (!imgFileName || !selectedLabel) {
                return;
            }

            // Build object with options for each layer
            this.state.selectedOptions[key] = {
                filename: imgFileName,
                swatchName: selectedLabel
            };

        });

        // Also include the selected top colour as part of the defaults sent in the custom event
        const topColour = document.querySelector('.obj-top-colour input[type="radio"]:checked');

        if (!topColour) return;

        // Extract the image file name from the selected top colour swatch to use as the default option value
        const topSwatchImage = topColour.parentElement?.querySelector('.swatch');
        const topFileName = this.getImageFileName(topSwatchImage);

        if (!topFileName) return;

        // Add the selected top colour to the selectedOptions object
        this.state.selectedOptions.top = { 
            filename: topFileName,
            swatchName: topColour.value.trim()
        };

    }

    /**
     * Set the state of the metal edge veneer option in the UI based on whether the current product type includes metals.
     * @param {string} className - The CSS class name of the option group (e.g., 'metal-edge-veneer').
     * @param {HTMLElement} swatchesGroup - DOM element containing the swatches for the current product type.
     */
    setMetalEdgeState(className, swatchesGroup) {

        // If current product includes metals activate the metal edge veneer option in the UI, otherwise deactivate it
        if(className === 'metal-edge-veneer') {

            const metalOption = document.getElementById('option-metal-edge-veneer');

            if(swatchesGroup && swatchesGroup.querySelectorAll('.wapf-swatch').length > 0) {
                metalOption.classList.remove('inactive');
            } else {
                metalOption.classList.add('inactive');
            }

        }

    }

    /**
     * Get the first available option from a list of swatches.
     * @param {NodeList} groupSwatches - The list of swatch elements.
     * @param {Array} availableList - The list of available option names.
     * @returns {HTMLElement|null} - The first available swatch element or null if none found.
     */
    getFirstAvailableOption = (groupSwatches, availableList) => {

        // Get swatch elements from group
        const swatches = groupSwatches.querySelectorAll('.wapf-swatch');

        // Find the first available option in the DOM and select it
        return Array.from(swatches).find(el => {

            // Extract option name from label and compare with available options
            const label = el.querySelector('label')?.textContent.toLowerCase().trim();

            // Return true if this option is in the list of available options for the selected top colour
            return availableList.includes(label);

        });

    }

    // ===================== UI Functions ===================== //

    /**
     * Show or hide options in the UI based on the available options for the selected top colour.
     * @param {Array} availableOptionsArr - An array of [optionType, optionsArray] pairs representing available options.
     */
    showHideOptions = (availableOptionsArr) => {

        // Loop over available options and update the UI accordingly (e.g., show/hide or enable/disable options)
        availableOptionsArr.forEach(([optionType, optionsArray]) => {

            // Map option type to corresponding layer class
            const layerType = this.optionToClass[optionType];

            // Find non-matching options in DOM and disable them
            const optionElements = document.querySelectorAll(`.obj-${layerType} .wapf-swatch`);

            optionElements.forEach(el => {

                // Extract option name from label and compare with available options
                const label = el.querySelector('label').textContent.toLowerCase().trim();

				// Show/hide options
                el.style.display = optionsArray.includes(label) ? 'inline' : 'none';

            });

        });
    }

    // ===================== Utility Functions ===================== //

    /**
     * @param {HTMLElement} swatchImage 
     * @returns {string|null} - The extracted image file name or null if not found
     */
    getImageFileName = (swatchImage) => {

        // Get the src of the image inside the option element
        const imgSrc = swatchImage?.src;

        // Extract swatch name from image URL using regex matches the part after "uploads/" and before "-{width}x{height}.jpg"
        const swatchName = imgSrc?.match(/uploads\/(.+?)-\d+x\d+\.jpg/);

        // If the regex matches, swatchName[1] will contain the swatch name, otherwise it will be null
        const result = swatchName ? swatchName[1] : null;

        //Return result
        return result;
    }

}