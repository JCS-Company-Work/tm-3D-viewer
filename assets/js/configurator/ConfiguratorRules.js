export default class ConfiguratorRules {

    constructor(state) {

        // Map option types to css classes
		this.optionToClass = {
			base: 'base',
			metal: 'metal-edge-veneer'
		};

        // Store reference to ProductState instance
        this.state = state;

        // Initialize product type
        this.productData = {};

        // Store product data based on the selected product in the 3D viewer
        this.setProductData();
    }

    setProductData() {

        // Check if top colour is valid for the selected product type
        this.productData.topColour = document.querySelector('.obj-top-colour input[type="radio"]:checked')?.value || '';

        // If top colour is multi-word, convert spaces to underscores to match keys in colourOptions
        this.productData.formattedTopColour = this.productData.topColour.toLowerCase().trim().replace(/\s+/g, '_');

        // Get product type from current selected product type and set globally available
        this.productData.type = document.querySelector('.obj-product-type input[type="radio"]:checked')?.getAttribute('data-product-type') || '';

        // Get the SKU of the selected product from the 3D viewer element
        const sku = document.getElementById('obj3dviewer').getAttribute('item-name') || '';

        // Determine the base type based on whether the SKU includes 'wood' or not
        this.productData.baseType = sku.includes('wood') ? 'wood' : 'tile';

    }

    // ===================== Option Logic & State Management ===================== //

    /**
     * Determine the default selections for base and edge groups based on 
     * the selected product type and top colour, and to update the available options in the UI accordingly.
     * @param {string} productType - The selected product type.
     */
    resetForProductType(productType) {

        // Refresh product data after UI/model changes so option resolution uses current values.
        this.setProductData();

        // Get available options for the selected product type and top colour
        const availableOptions = this.state.colourOptions?.[productType]?.colour_options || {};

        // Check if the top colour is valid for the selected product type
        const isTopColourValid = availableOptions.hasOwnProperty(this.productData.formattedTopColour);

        // If the top colour is not valid, set the available options for base and edge groups
        if (!isTopColourValid) {

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
                this.productData.topColour = firstAvailableColour;
                this.productData.formattedTopColour = firstAvailableColour.toLowerCase().trim().replace(/\s+/g, '_');
            }

        } 

        // Set available bases and edges based on the swatch name
        this.state.availableOptions = this.getAvailableOptions(productType, this.productData.formattedTopColour);

    }

    /**
     * Set available options for base and edge groups based on the selected top colour swatch.
     * The mapping of available options for each swatch is defined in the colourOptions object.
     */
    setColourOptions = () => {

        // Keep available options in sync with the latest selected top colour.
        const rawAvailableOptions = this.getAvailableOptions(
            this.productData.type,
            this.productData.formattedTopColour
        );

        // Normalize structure so downstream UI logic always evaluates base and metal groups.
        this.state.availableOptions = {
            base: rawAvailableOptions?.base ?? { tile: [], wood: [] },
            metal: rawAvailableOptions?.metal ?? []
        };

        // Loop over available options and update the UI accordingly (e.g., show/hide or enable/disable options)
        this.showHideOptions();

        // Finalize selected options after availability has been applied in the UI
        this.setSelectedOptions();

    }

    /**
     * Get available options for a given top colour.
     * @returns {Object} An object containing available options for the selected top colour.
     */
    getAvailableOptions(productType, formattedTopColour) {

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

            // Normalize available option names for robust comparisons.
            const availableList = this.availableList(key, className)
                .map(option => String(option).toLowerCase().trim());

            // Set up selectedOption variable to hold final value
            let selectedOption = checkedSwatch || null;

            // If nothing is checked yet, pick the first available option.
            if (!selectedOption) {
                selectedOption = this.getFirstAvailableOption(swatchesGroup, availableList);
            } else {
                // If there is a checked option, verify it is valid for the selected top colour.
                const input = selectedOption.querySelector('input');
                const value = input?.value?.toLowerCase().trim() || '';

                if (!availableList.includes(value)) {
                    selectedOption = this.getFirstAvailableOption(swatchesGroup, availableList);
                }
            }

            // If no available options are found, skip to next iteration.
            if (!selectedOption) {
                return;
            }

            // Check the input inside the swatch to update the form state.
            const selectedInput = selectedOption.querySelector('input');
            if (selectedInput) {
                selectedInput.checked = true;
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

        // Also include the selected top colour as part of the defaults
        const topColour = this.productData.topColour;

        if (!topColour) return;

        // Extract the image file name from the selected top colour swatch to use as the default option value
        const topSwatchImage = document.querySelector(`.obj-top-colour input[type="radio"][value="${topColour}"]`)?.parentElement?.querySelector('.swatch');
        const topFileName = this.getImageFileName(topSwatchImage);

        if (!topFileName) return;

        // Add the selected top colour to the selectedOptions object
        this.state.selectedOptions.top = { 
            filename: topFileName,
            swatchName: topColour.trim()
        };

    }

    /**
     * 
     * @param {string} optionType - The type of option (e.g., 'base', 'top-colour').
     * @param {string} className - The CSS class name of the option group.
     * @returns {Array} - The list of available options for the given option type and class name.
     */
    availableList(optionType, className) {

        // If the option type is 'base', determine the base type (wood or tile) based on the SKU of the selected product
        if(className === 'base') {

            // Get the list of available options for the selected top colour and product type
            return this.state.colourOptions?.[this.productData.type]?.colour_options?.[this.productData.formattedTopColour]?.[optionType]?.[this.productData.baseType] ?? [];

        } 

        // For other option types (e.g., 'metal'), return the available options for the selected top colour and product type
        return this.state.colourOptions?.[this.productData.type]?.colour_options?.[this.productData.formattedTopColour]?.[optionType] ?? [];
    }

    /**
     * Set the state of the metal edge veneer option in the UI based on whether the current product type includes metals.
     * @param {string} className - The CSS class name of the option group (e.g., 'metal-edge-veneer').
     * @param {HTMLElement} swatchesGroup - DOM element containing the swatches for the current product type.
     */
    setMetalEdgeState(className, swatchesGroup) {

        // Only apply for metals
        if(className !== 'metal-edge-veneer') return;

        const metalOption = document.getElementById('option-metal-edge-veneer');

        const hasVisibleMetalSwatches = !!swatchesGroup &&
            Array.from(swatchesGroup.querySelectorAll('.wapf-swatch'))
                .some(el => el.style.display !== 'none');

        if(hasVisibleMetalSwatches) {
            metalOption.classList.remove('inactive');
        } else {
            metalOption.classList.add('inactive');

            // Clear any stale metal selection from form state.
            swatchesGroup?.querySelectorAll('input[type="radio"]').forEach(input => {
                input.checked = false;
            });

            // Clear stale metal layer from selected options so viewer/URL do not carry veneer forward.
            delete this.state.selectedOptions.metal;

            // Remove any veneer value from the URL if the metal edge veneer option is deactivated
            this.removeParamFromURL('veneer');

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

            // Skip swatches currently hidden by availability rules.
            if (el.style.display === 'none') {
                return false;
            }

            // Extract option name from label and compare with available options
            const label = el.querySelector('label')?.textContent?.toLowerCase().trim() || '';

            // Return true if this option is in the list of available options for the selected top colour
            return availableList.includes(label);

        });

    }

    // ===================== UI Functions ===================== //

    /**
     * Show or hide options in the UI based on the available options for the selected top colour.
     */
    showHideOptions = () => {

		// Convert available options object to an array of [optionType, optionsArray] pairs for easier iteration
        const availableOptionsArr = Object.entries(this.state.availableOptions || {});

        // Loop over available options and update the UI accordingly (e.g., show/hide or enable/disable options)
        availableOptionsArr.forEach(([optionType, optionsArray]) => {

            // Map option type to corresponding layer class
            const layerType = this.optionToClass[optionType];

            // Ignore option groups that do not map to a swatch layer (e.g. top).
            if (!layerType) {
                return;
            }

            // Find non-matching options in DOM and disable them
            const optionElements = document.querySelectorAll(`.obj-${layerType} .wapf-swatch`);

            // Base options are grouped into tile/wood, so flatten them for comparison
            const available =
                optionType === 'base'
                    ? [
                        ...(Array.isArray(optionsArray?.tile) ? optionsArray.tile : []),
                        ...(Array.isArray(optionsArray?.wood) ? optionsArray.wood : [])
                    ]
                    : (Array.isArray(optionsArray) ? optionsArray : []);

            const normalizedAvailable = available
                .map(option => String(option).toLowerCase().trim());

            optionElements.forEach(el => {

                // Extract option name from label and compare with available options
                const label = el.querySelector('label').textContent.toLowerCase().trim();

				// Show/hide options
                el.style.display = normalizedAvailable.includes(label) ? 'inline' : 'none';

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

        if (!imgSrc) {
            return null;
        }

        // Parse the URL path and extract the last filename segment.
        const pathname = imgSrc.split('?')[0];
        const rawFileName = pathname.substring(pathname.lastIndexOf('/') + 1);

        if (!rawFileName) {
            return null;
        }

        // Remove extension and optional WordPress resize suffix (e.g. -150x150).
        const withoutExt = rawFileName.replace(/\.[a-z0-9]+$/i, '');
        const normalized = withoutExt.replace(/-\d+x\d+$/i, '');

        if (normalized) {
            return normalized;
        }

        // Extract swatch name from image URL using regex matches the part after "uploads/" and before "-{width}x{height}.jpg"
        const swatchName = imgSrc?.match(/uploads\/(.+?)-\d+x\d+\.jpg/);

        // If the regex matches, swatchName[1] will contain the swatch name, otherwise it will be null
        const result = swatchName ? swatchName[1] : null;

        //Return result
        return result;
    }

    /**
     * Remove a specific query parameter from the URL without reloading the page.
     * @param {string} param - The name of the query parameter to remove.
     */
    removeParamFromURL = (param) => {

        // Remove a specific query parameter from the URL without reloading the page
        const urlParams = new URLSearchParams(window.location.search);
        
        // If the parameter exists, delete it and update the URL
        if(urlParams.has(param)) {

            // Remove the parameter from the URL
            urlParams.delete(param);
            
            // Update the URL without reloading the page
            const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
            
            // Use history.replaceState to update the URL without reloading the page
            window.history.replaceState({}, '', newUrl);

        }
    }

}