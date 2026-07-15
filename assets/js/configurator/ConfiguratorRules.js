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

        // Get the SKU and ID of the selected product
        const sku = document.getElementById('obj3dviewer').getAttribute('item-name') || '';
        const selectedProductId = document.querySelector('.obj-product-type input[type="radio"]:checked')?.id || '';

        // Determine base type - source of truth is the product's database category (category 199 = wood)
        let baseType = 'tile';  // default to tile
        
        // Priority 1: Get baseType from the PHP-provided initial_state via wp_localize_script (for initial page load)
        if (window.TM3DInitialState?.baseType && selectedProductId === window.TM3DInitialState?.id) {
            baseType = window.TM3DInitialState.baseType;
        } else if (window.TM3DPlugin?.data?.models) {
            // Priority 2: Look up the product in the models data by collection to find its baseType
            const models = window.TM3DPlugin.data.models;
            for (const collection in models) {
                if (models[collection] && models[collection][selectedProductId]) {
                    const model = models[collection][selectedProductId];
                    if (model.baseType) {
                        baseType = model.baseType;
                        break;
                    }
                }
            }
        }
        
        this.productData.baseType = baseType;

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

        // Note: setSelectedOptions() is called separately from the Configurator to control event timing

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

        // Collect inputs to check at the end (after state is populated)
        const inputsToCheck = [];

        // Loop over optionToClass and log key/class
        Object.entries(this.optionToClass).forEach(([key, className]) => {

            // Find swatches in DOM
            const swatchesGroup = document.querySelector(`.wapf-field-group .obj-${className}`);

            // Activate/deaviate metals UI group based on whether product has metals
            this.setMetalEdgeState(className, swatchesGroup);

            // If no swatches found for this group, skip to next iteration
            if(!swatchesGroup) {
                return;
            }

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

            // Extract the image file name from the selected option to use as the default option value
            // Add colour and file name to object of defaults to be sent in the custom event
            const swatchImage = selectedOption.querySelector('.swatch');
            const imgFileName = this.getImageFileName(swatchImage);

            const selectedLabel = selectedOption.querySelector('label')?.textContent?.trim();

            if (!imgFileName || !selectedLabel) {
                return;
            }

            // Build object with options for each layer - BEFORE checking the input
            this.state.selectedOptions[key] = {
                filename: imgFileName,
                swatchName: selectedLabel
            };

            // Add input to list for checking after all state is populated
            const selectedInput = selectedOption.querySelector('input');
            if (selectedInput) {
                inputsToCheck.push(selectedInput);
            }

        });

        // Also include the selected top colour as part of the defaults
        const topColour = this.productData.topColour;

        if (topColour) {
            // Extract the image file name from the selected top colour swatch to use as the default option value
            const topSwatchImage = document.querySelector(`.obj-top-colour input[type="radio"][value="${topColour}"]`)?.parentElement?.querySelector('.swatch');
            const topFileName = this.getImageFileName(topSwatchImage);

            if (topFileName) {
                // Add the selected top colour to the selectedOptions object
                this.state.selectedOptions.top = { 
                    filename: topFileName,
                    swatchName: topColour.trim()
                };
            }
        }

        // NOW check all the inputs after selectedOptions is fully populated
        inputsToCheck.forEach(input => {
            input.checked = true;
        });

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
            const bases = this.state.colourOptions?.[this.productData.type]?.colour_options?.[this.productData.formattedTopColour]?.[optionType]?.[this.productData.baseType] ?? [];
            return bases;

        } 

        // For other option types (e.g., 'metal'), return the available options for the selected top colour and product type
        const options = this.state.colourOptions?.[this.productData.type]?.colour_options?.[this.productData.formattedTopColour]?.[optionType] ?? [];
        return options;
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
        const found = Array.from(swatches).find(el => {

            // Skip swatches currently hidden by availability rules.
            if (el.style.display === 'none') {
                return false;
            }

            // Extract option name from label and compare with available options
            const label = el.querySelector('label')?.textContent?.toLowerCase().trim() || '';
            const isInList = availableList.includes(label);

            // Return true if this option is in the list of available options for the selected top colour
            return isInList;

        });
        
        return found;

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
            let available = [];
            if (optionType === 'base') {
                available = this.state.colourOptions?.[this.productData.type]?.colour_options?.[this.productData.formattedTopColour]?.base?.[this.productData.baseType] ?? [];
            } else if (optionType === 'metal') {
                available = this.state.colourOptions?.[this.productData.type]?.colour_options?.[this.productData.formattedTopColour]?.metal ?? [];
            }

            const normalizedAvailable = available
                .map(option => String(option).toLowerCase().trim());

            optionElements.forEach(el => {

                // Extract option name from label and compare with available options
                const label = el.querySelector('label').textContent.toLowerCase().trim();
                const shouldShow = normalizedAvailable.includes(label);

				// Show/hide options
                el.style.display = shouldShow ? 'inline' : 'none';
                
                // If hiding this option and it's currently checked, uncheck it to prevent stale selections
                if (!shouldShow) {
                    const input = el.querySelector('input[type="radio"]');
                    if (input?.checked) {
                        input.checked = false;
                    }
                }

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