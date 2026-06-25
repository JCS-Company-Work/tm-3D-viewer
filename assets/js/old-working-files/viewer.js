import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ShadowMapViewer } from 'three/addons/utils/ShadowMapViewer.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

class ProductRenders {

    constructor(containerSelector) {

        // Main container where the 3D scene will render
        this.container = document.querySelector(containerSelector);
        console.log('this.container', this.container);
        if (!this.container) {
            console.error(`[ProductRenders] Container not found for selector: ${containerSelector}`);
        }

        // Object to hold preloaded textures for materials
        this.queryString = '';
        
        // Track if camera animation has already run
        this.cameraAnimated = false;

        // Adjust camera settings based on screen size
        if (window.innerWidth < 768) {
            this.adjustment = 50;
        } else {
            this.adjustment = 40;
        }

        // Determine texture name from container attribute
        this.textureName = this.container ? this.container.getAttribute('item-name') : '';
        if (!this.textureName) {
            console.error('[ProductRenders] textureName is missing or empty. Check that the container has the item-name attribute.');
            this.textureName = 'default-model'; // fallback
        }

        // Assign shadow image and camera adjustment based on model type
        if (this.textureName.includes('tt02')) {
            this.shadowName = "shadow-tt02.jpg";
            this.adjustment = (window.innerWidth < 768) ? 35 : 29;
        } else if (this.textureName.includes('tt03')) {
            this.shadowName = "shadow-tt03.jpg";
        } else if (this.textureName.includes('tt12')) {
            this.shadowName = "shadow-tt12.jpg";
        } else {
            this.shadowName = "shadow-tt04.jpg";
        }

        // Core 3D properties
        this.loadedModel = null;
        this.scene = null;
        this.defaults = {};
        this.isAnimating = false;

        // Fullscreen toggle button
        this.toggleButton = document.querySelector('.obj3dviewer-toggle');

        // Bind event handler methods to maintain correct `this` context
        this.toggleHandler = this.toggleFullscreen.bind(this);
        this.fullscreenChangeHandler = this.onFullscreenChange.bind(this);

        // Initialize event listeners (fullscreen, toggle button)
        this.initEventListeners();
        
    }

    /**
     * Keep the URL in sync with current page selections before deferred 3D init.
     */
    syncInitialURLState() {
        const modelSelect = document.querySelector('.obj-model select');
        const selectedOption = modelSelect?.options?.[modelSelect.selectedIndex];

        const params = {
            colour: this.getSelectedSwatchName('.obj-top-colour'),
            metalcolour: this.getSelectedSwatchName('.obj-metal-edge-veneer'),
            secondcolour: this.getSelectedSwatchName('.obj-base'),
            model: selectedOption?.getAttribute('data-label')?.trim() || ''
        };

        const cleanedParams = Object.fromEntries(
            Object.entries(params).filter(([, value]) => Boolean(value))
        );

        if (Object.keys(cleanedParams).length) {
            this.updateURL(cleanedParams);
        }
    }

    setProductModel(modelId) {
        this.modelId = modelId;
        this.textureName = modelId;
        this.loadModel();
    }

    /**
     * Fades out loading screen when the 3D scene is ready
     * @returns {void}
     */
    fadeLoading() {
        const loadingScreen = document.getElementById('loading-screen');
        if (!loadingScreen) return;

        loadingScreen.classList.add('fade-out');
        loadingScreen.addEventListener('transitionend', function handler(e) {
            if (e.propertyName === 'opacity') {
                loadingScreen.remove();
            }
        });

        // Safety fallback in case transitionend doesn't fire
        setTimeout(() => {
            if (document.body.contains(loadingScreen)) {
                loadingScreen.remove();
            }
        }, 3000);
    }

    /**
     * Sets up listeners for fullscreen toggle and changes
     * @returns {void}
     */
    initEventListeners() {

        // Listen for window resize to adjust camera and renderer
        if (this.toggleButton) {
            this.toggleButton.addEventListener('click', this.toggleHandler);
            this.toggleButton.addEventListener('touchstart', this.toggleHandler);
        }

        // Listen for fullscreen changes to update UI state
        document.addEventListener('fullscreenchange', this.fullscreenChangeHandler);
        document.addEventListener('webkitfullscreenchange', this.fullscreenChangeHandler);
        document.addEventListener('msfullscreenchange', this.fullscreenChangeHandler);

        // Listen for custom event when colour options change
        window.addEventListener('colourOptionsChanged', (e) => {
            this.updateColourOptions(e);
        });

    }

    /**
     * Update the model's colour options from colour default rules in colourOptions.js
     * Function triggered by the custom 'colourOptionsChanged' event dispatched from 
     * the colour options module when a swatch is clicked or on initial load
     * @param {object} e 
     * @returns {void}
     */
    updateColourOptions(e) {

        // Mapping of layer keys from event to our defaults structure
        const layerMap = {
            top: 'colour',
            metal: 'metalcolour',
            base: 'secondcolour',
            meshcolour: 'meshcolour',
            profilecolour: 'profilecolour',
            undercolour: 'undercolour'
        }

        // Extract the defaults object from the event details
        const layerValues = e.detail.defaults;

        // Build an update object based on the event details and our mapping
        const update = {};

        // Iterate over expected keys and map them to our defaults structure
        for (const [layer, data] of Object.entries(layerValues)) {

            // layer will be 'top', 'base', 'metal', etc.
            // data will be the object for that layer (e.g., { filename, swatchName })
            if (data && data.filename) {

                // Update the corresponding entry in the update object with the cleaned filename
                update[layerMap[layer]] = data.filename.replace(/\s+/g, '-').toLowerCase();
                this.updateURL({ [layerMap[layer]]: data.swatchName });

                // If base, also set secondcolourname as required by mtl.php for the base colour name to show in the UI
                if (layer === 'base' && data.swatchName) {
                    update['secondcolourname'] = data.swatchName;
                }
                
                update['meshcolour'] = 'meshcolour';
                update['profilecolour'] = 'profilecolour';
                update['undercolour'] = 'undercolour';

            } else {
                // These are the fallback values for layers that don't have swatches (mesh, profile, undercolour)
                // Colours are set on the fly in mtl.php
                update[layerMap[layer]] = data;
            }

        }

        // Build query string from the update object and update our defaults
        this.queryString = this.buildQueryString(update);

        // Reload the model to reflect the new colour options
        this.loadModel();

    }

    /**
     * Build a query string from the update object and current defaults
     * @param {object} update - The object containing updated key-value pairs
     * @returns {string} - The constructed query string
     */
    buildQueryString(update = {}) {

        // Update the defaults with the new values from the update object
        Object.assign(this.defaults, update);

        // Build query string parts from the updated defaults
        const queryParts = [];

        // Loop through the defaults and create query parameters for non-empty values
        for (const [key, value] of Object.entries(this.defaults)) {
            // Only include keys that have non-empty values
            if (value !== '') {
                // Encode both key and value to ensure special characters are handled correctly
                queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
            }
        }
        // Add plugin version for cache busting from data attribute
        const version = TM3DPlugin?.version || '1.0.0';
        queryParts.push(`fileversion=${encodeURIComponent(version)}`);

        // Join the query parts with '&' and prepend with '?' to form the full query string
        return '?' + queryParts.join('&');
    }

    /**
     * Sets event listeners for color swatches to update the model dynamically
     * @returns {void}
     */
    attachSwatchListeners() {

        // Mapping of field labels to our query parameter keys
        const map = {
            'Top Colour': 'colour',
            'Metal Edge Veneer': 'metalcolour',
            'Base': 'secondcolour'
        };

        // Select all swatch group containers on the page
        const swatchGroups = document.querySelectorAll('.obj-base .wapf-image-swatch-wrapper, .obj-metal-edge-veneer .wapf-image-swatch-wrapper');

        // Loop through each swatch group
        swatchGroups.forEach(swatchGroup => {

            // Find all individual swatches inside this group
            const swatches = swatchGroup.querySelectorAll('.wapf-swatch');

            // Loop through each swatch inside the group
            swatches.forEach(swatch => {

                // Add a click event listener for when the user clicks on a swatch
                swatch.addEventListener('click', () => {

                    // Get the field label text related to this swatch group
                    const fieldLabel = swatchGroup.parentElement?.parentElement
                        ?.querySelector('.wapf-field-label label span')
                        ?.textContent;

                    // Extract swatch name from label    
                    const swatchName = swatch.querySelector('label').textContent;

                    // Get the image source URL from the clicked swatch
                    const imgSrc = swatch.querySelector('img')?.src;

                    // Extract a clean identifier from the image URL using a regex
                    // Matches the part after "uploads/" and before "-{width}x{height}.jpg"
                    const match = imgSrc?.match(/uploads\/(.+?)-\d+x\d+\.jpg/);
                    const result = match ? match[1] : null;

                    // If we have a valid result AND a corresponding map entry for the fieldLabel
                    if (result && map[fieldLabel]) {

                        // Build a query string from the mapped key and extracted result
                        // Example: { material: "calacatta-gold" }
                        this.queryString = this.buildQueryString({ [map[fieldLabel]]: result });

                        // Reload or update the model based on new swatch selection
                        this.loadModel();
                    }

                    // Update the URL in the browser to reflect selected swatches
                    this.updateURL({ [map[fieldLabel]]: swatchName });

                });
            });
        });
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

        const map = {
            'colour': 'colour',
            'metalcolour': 'veneer',
            'secondcolour': 'base',
            'model': 'model'
        };

        // Get current URL object
        const url = new URL(window.location.href);

        // Loop over params and update URL
        for (const [key, value] of Object.entries(params)) {

            if (value) {

                // Clean value: remove "swatch" or "banding"
                let cleanedValue = value.replace(/(swatch-|banding-)/gi, '').trim();

                if (cleanedValue) {
                    // Capitalize first letter of each word
                    cleanedValue = cleanedValue
                        .split(/[\s-]+/) // split by spaces or hyphens
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                        .join(' ');

                    // Encode properly with %20
                    const encodedValue = encodeURIComponent(cleanedValue);

                    // Add or update parameter manually
                    url.searchParams.set(map[key], encodedValue);

                } else {

                    url.searchParams.delete(map[key]);

                }

            } else {

                url.searchParams.delete(map[key]);

            }

        }

        // Manually rebuild query string to prevent + for spaces
        let queryString = '';
        url.searchParams.forEach((val, key) => {
            queryString += `${key}=${val}&`;
        });
        queryString = queryString.slice(0, -1); // remove trailing &

        // Build new URL
        const newUrl = `${url.origin}${url.pathname}${queryString ? '?' + queryString : ''}`;

        // Update browser URL without reload
        window.history.replaceState({}, '', newUrl);

        // Update QR code
        this.updateQRCode(new URLSearchParams(queryString));

    }

    /**
     * Update QR code with latest url post model change
     * @param {URLSearchParams} params - The URL search parameters to update the QR code with.
     * @returns {void}
     */
    updateQRCode(params) {

        const qrcodeEl = document.querySelector('.qrcode');
        if (!qrcodeEl) return;

        // Build full URL using current location
        const url = new URL(window.location.href);

        // Replace search params with the provided params (if passed)
        if (params instanceof URLSearchParams) {
            url.search = params.toString();
        }

        // Only keep allowed params
        const paramsToInclude = ['model', 'colour', 'veneer', 'base'];
        // Collect keys to delete to avoid mutation during iteration
        const keysToDelete = [];
        url.searchParams.forEach((value, key) => {
            if (!paramsToInclude.includes(key)) {
                keysToDelete.push(key);
            }
        });

        // Delete unwanted params
        keysToDelete.forEach(key => url.searchParams.delete(key));

        // Set title attribute for debugging or hover text
        qrcodeEl.setAttribute('title', url.toString());

        // Clear existing QR code
        qrcodeEl.innerHTML = '';

        // Generate QR code
        new QRCode(qrcodeEl, {
            text: url.toString(),
            width: 128,
            height: 128
        });
    }

    /**
     * Initializes 3D scene and camera
     * @returns {void}
     */
    initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf3f3f3);
        this.camera = new THREE.PerspectiveCamera(
            this.adjustment || 40,
            this.container.clientWidth / this.container.clientHeight,
            1,
            100
        );
        this.camera.position.set(25, 24, -25);
    }

    /**
     * Creates WebGL renderer and attaches it to the container
     * @returns {void}
     */
    initRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        const maxPixelRatio = 1.5;
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);
    }

    /**
     * Adds lights to the scene
     * @returns {void}
     */
    initLights() {
        this.scene.add(new THREE.AmbientLight(0xffffff, 2));
        // Spotlights and directional lights for realistic shadows
        this.spotLight = new THREE.SpotLight(0xffffff, 250);
        this.spotLight.angle = Math.PI / 15;
        this.spotLight.penumbra = 0.4;
        this.spotLight.castShadow = true;
        this.spotLight.position.set(0, 25, 20);
        this.spotLight.shadow.camera.near = 8;
        this.spotLight.shadow.camera.far = 36;
        this.spotLight.shadow.mapSize.set(256, 256);
        this.scene.add(this.spotLight);
        this.scene.add(this.spotLight.target);
        this.spotLight.target.position.set(1, 0, -25);

        // Additional lights
        this.dirLight = new THREE.SpotLight(0xffffff, 5000);
        this.dirLight.position.set(35, 1, 22);
        this.dirLight.castShadow = true;
        this.dirLight.penumbra = 0.1;
        this.dirLight.angle = Math.PI / 12;
        this.dirLight.shadow.camera.near = 3;
        this.dirLight.shadow.camera.far = 100;
        this.dirLight.shadow.mapSize.set(512, 512);
        this.scene.add(this.dirLight);
        this.scene.add(this.dirLight.target);
        this.dirLight.target.position.set(0, 11, 0);

        this.dirLight2 = new THREE.SpotLight(0xffffff, 100);
        this.dirLight2.position.set(-15, 8, 8);
        this.dirLight2.angle = Math.PI / 6;
        this.dirLight2.penumbra = 0.1;
        this.dirLight2.castShadow = true;
        this.scene.add(this.dirLight2);
        this.scene.add(this.dirLight2.target);
        this.dirLight2.target.position.set(0, 8, 0);

        this.dirLight3 = new THREE.SpotLight(0xffffff, 500);
        this.dirLight3.position.set(-10, 6, -15);
        this.dirLight3.angle = Math.PI / 4;
        this.dirLight3.penumbra = 0.5;
        this.dirLight3.castShadow = true;
        this.scene.add(this.dirLight3);
        this.scene.add(this.dirLight3.target);
        this.dirLight3.target.position.set(0, 10, 0);

        this.rectLight = new THREE.SpotLight(0xffffff, 1500);
        this.rectLight.position.set(-25, 29, -75);
        this.rectLight.lookAt(new THREE.Vector3(0, 12, 0));
        this.scene.add(this.rectLight);
        this.scene.add(this.rectLight.target);
    }

    /**
     * Initializes shadow map debugging tools
     * @returns {void}
     */
    initShadowMapViewers() {
        this.dirLightShadowMapViewer = new ShadowMapViewer(this.dirLight);
        this.spotLightShadowMapViewer = new ShadowMapViewer(this.spotLight);
    }

    /**
     * Sets up OrbitControls for camera interaction and zoom toggling
     * @returns {void}
     */
    initControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.target.set(0, 5, 0);
        this.controls.minPolarAngle = 0;
        this.controls.maxPolarAngle = Math.PI / 2;
        this.controls.minDistance = 15;
        this.controls.maxDistance = 80;
        this.controls.enableZoom = false;
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.07;
        this.controls.rotateSpeed = 0.5;
        this.controls.update();

        this.zoomActivated = false;
        const canvas = this.renderer.domElement;

        // Prevent accidental zoom gestures initially
        this.blockZoom = (e) => { if (e.ctrlKey) e.preventDefault(); };
        this.blockGesture = (e) => e.preventDefault();
        this.blockTouchZoom = (e) => { if (e.touches && e.touches.length > 1) e.preventDefault(); };

        // Prevent double-tap zoom
        let lastTap = 0;
        this.blockDoubleTap = (e) => {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            if (tapLength < 350 && tapLength > 0) e.preventDefault();
            lastTap = currentTime;
        };

        // Attach event blocking initially
        canvas.addEventListener('wheel', this.blockZoom, { passive: false });
        canvas.addEventListener('gesturestart', this.blockGesture, { passive: false });
        canvas.addEventListener('touchmove', this.blockTouchZoom, { passive: false });
        canvas.addEventListener('touchstart', this.blockDoubleTap, { passive: false });

        // Enable zoom on first click/touch
        this.handleActivate = (e) => {

            if (!this.zoomActivated) {
                this.controls.enableZoom = true;
                this.zoomActivated = true;

                canvas.removeEventListener('wheel', this.blockZoom, { passive: false });
                canvas.removeEventListener('gesturestart', this.blockGesture, { passive: false });
                canvas.removeEventListener('touchmove', this.blockTouchZoom, { passive: false });
                canvas.removeEventListener('touchstart', this.blockDoubleTap, { passive: false });
                canvas.removeEventListener('click', this.handleActivate);
                canvas.removeEventListener('touchstart', this.handleActivate);
            }
        };

        canvas.addEventListener('click', this.handleActivate);
        canvas.addEventListener('touchstart', this.handleActivate);

        // Reset zoom when mouse leaves
        canvas.addEventListener('mouseleave', () => {
            this.controls.enableZoom = false;
            this.zoomActivated = false;
            canvas.addEventListener('wheel', this.blockZoom, { passive: false });
            canvas.addEventListener('gesturestart', this.blockGesture, { passive: false });
            canvas.addEventListener('touchmove', this.blockTouchZoom, { passive: false });
            canvas.addEventListener('touchstart', this.blockDoubleTap, { passive: false });
            canvas.addEventListener('click', this.handleActivate);
            canvas.addEventListener('touchstart', this.handleActivate);
        });
    }

    /**
     * Creates ground plane with shadow texture
     * @returns {void}
     */
    loadGround() {
        const texPath = '/wp-content/plugins/tm-three-viewer/assets/models/textures/';
        const url = texPath + this.shadowName;

        const texture = this.preloadedTextures && this.preloadedTextures['groundshadow']
            ? this.preloadedTextures['groundshadow']
            : new THREE.TextureLoader().load(url);

        texture.center = new THREE.Vector2(0.5, 0.5);
        texture.rotation = - Math.PI / 4;
        texture.repeat.set(0.70, 0.70);

        const geometry = new THREE.BoxGeometry(45, 0.75, 45);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            color: 0xf7f7f7,
            combine: 0
        });

        const ground = new THREE.Mesh(geometry, material);
        ground.receiveShadow = true;
        ground.position.set(0, 0, 0);
        ground.rotation.y = Math.PI / 4;
        this.scene.add(ground);
    }

    /**
     * Loads the OBJ model and applies preloaded materials
     * @returns {void}
     */
    loadModel() {

        // Add base path constant from DOM 
        const base = TM3DPlugin?.url ? TM3DPlugin.url + 'assets/models' : '';

        if (!this.textureName || !this.scene) return;

        const mtlUrl = `${base}/mtl.php${this.queryString}`;
        const objUrl = `${base}/${this.textureName}-obj.php${this.queryString}`;

        const mtlLoader = new MTLLoader();
        const objLoader = new OBJLoader();

        console.log('[ProductRenders] Loading MTL:', mtlUrl);
        console.log('[ProductRenders] Loading OBJ:', objUrl);

        mtlLoader.load(mtlUrl, (materials) => {

            materials.preload();

            objLoader.setMaterials(materials);

            objLoader.load(objUrl, (object) => {

                if (this.loadedModel) {
                    this.scene.remove(this.loadedModel);
                    this.loadedModel.traverse((child) => {
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(m => m.dispose());
                            } else {
                                child.material.dispose();
                            }
                        }
                    });
                }

                object.position.y = 4.5;
                object.scale.setScalar(0.1);

                object.traverse(node => {
                    if (node.isMesh) {
                        node.castShadow = true;

                        if (node.material?.name && this.preloadedTextures?.[node.material.name]) {
                            node.material.map = this.preloadedTextures[node.material.name];
                            node.material.needsUpdate = true;
                        }
                    }
                });

                this.scene.add(object);
                this.loadedModel = object;

                if (!this.cameraAnimated) {
                    gsap.to(this.camera.position, {
                        x: 0,
                        y: 14,
                        z: 30,
                        duration: 2.5,
                        ease: "back.inOut"
                    });
                    this.cameraAnimated = true;
                }

            });

        });

    }

    /**
     * Main render loop
     * @returns {void}
     */
    animate = () => {
        requestAnimationFrame(this.animate);
        if (this.controls) {
            this.controls.update();
        }
        this.renderer.render(this.scene, this.camera);
    };

    /**
     * Handles fullscreen toggle
     * @returns {void}
     */
    toggleFullscreen() {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const isFullscreen =
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.msFullscreenElement;

        if (isMobile) {
            this.container.classList.toggle('fullscreen-active');
        } else {
            if (!isFullscreen) {
                this.container.requestFullscreen().catch(() => {
                    this.container.classList.toggle('fullscreen-active');
                });
            } else {
                document.exitFullscreen();
            }
        }
    }

    /**
     * Removes fullscreen-active class when exiting fullscreen
     * @returns {void}
     */
    onFullscreenChange() {
        const isFullscreen = !!document.fullscreenElement;
        if (!isFullscreen) {
            this.container.classList.remove('fullscreen-active');
        }
    }

    /**
     * Updates renderer and camera when container size changes
     * @returns {void}
     */
    onResize() {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    /**
     * Preloads textures before initializing the scene
     * @param {string[]} urls - Array of texture URLs to preload
     * @returns {Promise<Object>} - A promise that resolves with an object mapping URLs to textures
     */
    preloadTextures(urls) {
        const loader = new THREE.TextureLoader();
        loader.setCrossOrigin('anonymous');
        const texturePromises = urls.map(url =>
            new Promise((resolve, reject) => {
                loader.load(
                    url,
                    texture => {
                        resolve({ url, texture });
                    },
                    undefined,
                    error => {
                        reject({ url, error });
                    }
                );
            })
        );
        return Promise.all(texturePromises).then(results => {
            return results.reduce((acc, curr) => {
                acc[curr.url] = curr.texture;
                return acc;
            }, {});
        });
    }

    /**
     * Normalises a swatch slug by converting it to lowercase, replacing spaces with hyphens, and adding a prefix if necessary
     * @param {string} value - The value to normalise
     * @param {string} prefix - The prefix to add if the slug doesn't already have one
     * @returns {string} - The normalised slug
     */
    normaliseSwatchSlug(value, prefix) {
        if (!value) return '';

        const slug = value
            .toLowerCase()
            .replace(/\+/g, ' ')
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

        if (!slug) return '';
        if (slug.startsWith('swatch-') || slug.startsWith('banding-')) return slug;
        return `${prefix}${slug}`;
    }

    /**
     * Gets the name of the selected swatch in a given group
     * @param {string} groupSelector - The CSS selector for the swatch group
     * @returns {string} - The name of the selected swatch
     */
    getSelectedSwatchName(groupSelector) {
        const checkedInput = document.querySelector(`${groupSelector} .wapf-input:checked`);
        if (!checkedInput) return '';

        const label = checkedInput.closest('label');
        const swatchName =
            label?.getAttribute('aria-label') ||
            checkedInput.value ||
            label?.textContent ||
            '';

        return swatchName.trim();
    }

    /**
     * Gets the image file name from a swatch image element
     * @param {HTMLImageElement} swatchImage - The swatch image element
     * @returns {string|null} - The image file name or null if not found
     */
    getImageFileName(swatchImage) {
        const imgSrc = swatchImage?.src;
        const swatchName = imgSrc?.match(/uploads\/(.+?)-\d+x\d+\.jpg/);
        return swatchName ? swatchName[1] : null;
    }

    /**
     * Gets the filename of the selected swatch in a given group
     * @param {string} groupSelector - The CSS selector for the swatch group
     * @param {string} prefix - The prefix to add if the slug doesn't already have one
     * @returns {string} - The filename of the selected swatch
     */
    getSelectedSwatchFilename(groupSelector, prefix = 'swatch-') {
        const checkedInput = document.querySelector(`${groupSelector} .wapf-input:checked`);
        if (!checkedInput) return '';

        const swatchEl = checkedInput.closest('.wapf-swatch')?.querySelector('.swatch');
        const filename = this.getImageFileName(swatchEl);
        return this.normaliseSwatchSlug(filename, prefix);
    }

    /**
     * Gets the initial layer values for the product configurator
     * @returns {Object} - The initial layer values
     */
    getInitialLayerValues() {

        // Defaut values object
        const initialValues = {
            colour: 'swatch-macchia-vecchia',
            metalcolour: 'banding-brushed-gold',
            secondcolour: 'swatch-macchia-vecchia'
        };

        // Check the DOM for selected swatches to set initial values, then override with URL params if present
        const topFromDom = this.getSelectedSwatchFilename('.obj-top-colour', 'swatch-');
        const metalFromDom = this.getSelectedSwatchFilename('.obj-metal-edge-veneer', 'banding-');
        const baseFromDomFilename = this.getSelectedSwatchFilename('.obj-base', 'swatch-');

        // If swatches are selected in the DOM, use those as initial values
        if (topFromDom) initialValues.colour = topFromDom;
        if (metalFromDom) initialValues.metalcolour = metalFromDom;
        if (baseFromDomFilename) initialValues.secondcolour = baseFromDomFilename;

        // Check URL params to override initial values if present
        const url = new URL(window.location.href);
        
        // Normalise URL params to match expected format
        const urlInitialValues = {
            colour: this.normaliseSwatchSlug(url.searchParams.get('colour'), 'swatch-'),
            metalcolour: this.normaliseSwatchSlug(url.searchParams.get('veneer'), 'banding-'),
            secondcolour: this.normaliseSwatchSlug(url.searchParams.get('base'), 'swatch-')
        };

        // Override initial values with URL params if they exist
        if (urlInitialValues.colour) initialValues.colour = urlInitialValues.colour;
        if (urlInitialValues.metalcolour) initialValues.metalcolour = urlInitialValues.metalcolour;
        if (urlInitialValues.secondcolour) initialValues.secondcolour = urlInitialValues.secondcolour;

        // Determine base layer name for mtl.php based on URL param or DOM selection, required by material naming in mtl.php/obj.php
        const baseFromUrl = decodeURIComponent(url.searchParams.get('base') || '')
            .replace(/\+/g, ' ')
            .trim();

        // If no base from URL, fallback to DOM selection for base swatch name
        const baseFromDom = this.getSelectedSwatchName('.obj-base');
        const baseSwatchName = baseFromUrl || baseFromDom;

        // If we have a base swatch name, set secondcolourname for mtl.php to use as the base layer name in the UI
        if (baseSwatchName) {
            // Required by mtl.php/obj.php material naming for the base layer.
            initialValues.secondcolourname = baseSwatchName;
        }

        // Return final values
        return initialValues;
        
    }

    /**
     * Initializes the product configurator viewer, preloads textures, and sets up the scene
     */
    init() {

        const initialValues = this.getInitialLayerValues();

        // Ensure first model load reflects URL/default layers even before swatch events fire
        this.queryString = this.buildQueryString(initialValues);

        const texPath = TM3DPlugin?.url ? TM3DPlugin.url + 'assets/models/textures/' : '/wp-content/plugins/tm-three-viewer/assets/models/textures/';
        console.log(texPath);
        
        const version = '?v=1';
        
        // Collect texture URLs from the layer keys only.
        // secondcolourname is metadata for the base layer name, not a texture file.
        const textureKeys = Object.keys(initialValues).filter(key => key !== 'secondcolourname');
        
        const textureURLsByKey = {};
        textureKeys.forEach(key => {
            const imageName = initialValues?.[key];
            if (imageName) {
                textureURLsByKey[key] = texPath + imageName + '.jpg' + version;
            }
        });

        this.preloadTextures(Object.values(textureURLsByKey))
            .then(texturesByUrl => {
                this.preloadedTextures = {};
                for (const [key, url] of Object.entries(textureURLsByKey)) {
                    this.preloadedTextures[key] = texturesByUrl[url];
                }
                // Initialize scene and related components once
                if (!this.scene) {
                    this.initScene();
                    this.initRenderer();
                    this.initLights();
                    this.initShadowMapViewers();
                    this.initControls();
                    this.loadGround();
                    window.addEventListener('resize', () => this.onResize());
                    if (!this.isAnimating) {
                        this.isAnimating = true;
                        this.animate();
                    }
                }
                this.loadModel();
                this.fadeLoading();
            })
            .catch(err => {
                console.warn('Failed to preload one or more images:', err);

                if (!this.scene) {
                    this.initScene();
                    this.initRenderer();
                    this.initLights();
                    this.initShadowMapViewers();
                    this.initControls();
                    this.loadGround();
                    window.addEventListener('resize', () => this.onResize());
                    if (!this.isAnimating) {
                        this.isAnimating = true;
                        this.animate();
                    }
                }
                this.loadModel();
                this.fadeLoading();
            });
    }

    /**
     * Add change event listeners to all swatch radio inputs (top, base, metal).
     * If input is in obj-top-colour, update options and images.
     * If input is in obj-base or obj-metal, only update images.
     */
    addSwatchListeners = (viewer) => {

        // Select all radio inputs in all swatch groups
        const allInputs = document.querySelectorAll('.wapf-swatch input[type="radio"]');

        allInputs.forEach(input => {

            input.addEventListener('change', () => {

                // Find which group this input belongs to
                const productType = input.closest('.obj-product-type');

                if(productType) {

                    viewer.setProductModel(input.getAttribute('data-sku'));

                }

            });
        });
    }
}

// Init class when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    
    const viewerEl = document.getElementById('obj3dviewer');
    if (!viewerEl) return;

    const viewer = new ProductRenders('#obj3dviewer');

    // URL hooks must bind immediately; only heavy 3D loading should be deferred.
    viewer.attachSwatchListeners();
    viewer.addSwatchListeners(viewer);
    viewer.updateModel();

    // Keep URL in sync on page load, even when 3D init is deferred.
    viewer.syncInitialURLState();

    // Init viewer
    viewer.init();

});