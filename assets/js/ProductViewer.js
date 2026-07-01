import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ShadowMapViewer } from 'three/addons/utils/ShadowMapViewer.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

export default class ProductViewer {

    constructor(containerSelector) {

        // Main container where the 3D scene will render
        this.container = document.querySelector(containerSelector);

        if (!this.container) {
            console.error(`[ProductRenders] Container not found for selector: ${containerSelector}`);
        }

        // Initialise 3d model state object
        this.modelState = {
            adjustment: '',
            textureName: 'default-model',
            queryString: '',
            cameraAnimated: false,
            shadowName: 'shadow-tt04.jpg'
        };

        // Viewer state for scene and loaded model
        this.viewer = {
            scene: null,
            loadedModel: null
        };

        // Runtime state for animation and interaction
        this.runtime = {
            isAnimating: false
        };

        // Default settings for the viewer
        this.defaults = {};

        // Adjust camera settings based on screen size
        this.setAdjustment();

        // Determine texture name from container attribute
        this.setTextureName();

        // Set shadow image based on model type
        this.setShadow();
        
        // Initialize 3D scene, camera, renderer, lights, controls, and ground
        this.initViewer();

        // Initialize event listeners (fullscreen, toggle button)
        this.addEventListeners();

        
    }

    // ===================== Model Functions ===================== //

    /**
     * Sets the texture name in state for the 3D model based on the container's item-name attribute.
     */
    setTextureName() {

        const textureName = this.container?.getAttribute('item-name');

        if (textureName) {
            this.modelState.textureName = textureName;
        } else {
            console.error(
                '[ProductRenders] textureName is missing or empty. Check that the container has the item-name attribute.'
            );
        }

    }

    /**
     * Sets the shadow image name in state based on the model type and adjusts camera settings for specific models.
     */
    setShadow() {

        // Array of model types that have specific shadow images
        const shadowsArr = [
            'tt02', 'tt03', 'tt12', 'tt04'
        ];

        // Check if texture name is in the shadows array and adjust camera accordingly
        shadowsArr.forEach(shadow => {

            if (this.modelState.textureName.includes(shadow)) {

                // Set the shadow image name in state
                this.modelState.shadowName = `shadow-${shadow}.jpg`;

                // Adjust camera settings based on screen size for tt02 shadow
                if(shadow === 'tt02') {
                    this.modelState.adjustment = (window.innerWidth < 768) ? 35 : 29;
                }

                // Exit loop once a match is found
                return; 
            }

        });

    }

    /**
     * Sets the camera adjustment value based on the current window width.
     */
    setAdjustment() {
        this.modelState.adjustment = window.innerWidth < 768 ? 50 : 40;
    }

    /**
     * Set product model based on the selected model ID, 
     * update shadow and load the corresponding 3D model.
     * @param {int} modelId 
     */
    setProductModel(modelId) {

        // Update the texture name in state based on the selected model ID
        this.modelState.textureName = modelId;
        
        // Update the shadow image in use based on the new model type
        this.setShadow();
        
        // Update shadow beneath the model
        this.loadGround();
        
        // Load the new 3D model based on the updated texture name and shadow
        this.loadModel();

    }

    // ===================== Fullscreen Functions ===================== //

    /**
     * Removes fullscreen-active class when exiting fullscreen
     * @returns {void}
     */
    onFullscreenChange = () => {
        const isFullscreen = !!document.fullscreenElement;
        if (!isFullscreen) {
            this.container.classList.remove('fullscreen-active');
        }
    }

    /**
     * Handles fullscreen toggle
     * @returns {void}
     */
    toggleFullscreen = () => {
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

    // ===================== Fullscreen Functions ===================== //

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
    addEventListeners() {

        // Find the fullscreen toggle button in the DOM
        this.toggleButton = document.querySelector('.obj3dviewer-toggle');

        // Listen for window resize to adjust camera and renderer
        if (this.toggleButton) {
            this.toggleButton.addEventListener('click', this.toggleFullscreen);
            this.toggleButton.addEventListener('touchstart', this.toggleFullscreen);
        }

        // Listen for fullscreen changes to update UI state
        document.addEventListener('fullscreenchange', this.onFullscreenChange);
        document.addEventListener('webkitfullscreenchange', this.onFullscreenChange);
        document.addEventListener('msfullscreenchange', this.onFullscreenChange);

    }

    /**
     * Updates the selected colour options based on the event detail
     * @param {object} selectedOptions - The selected colour options from the event detail 
     * @returns {void}
     */
    updateColourOptions(selectedOptions, productId = null) {

        // Mapping of layer keys from event to our defaults structure
        const layerMap = {
            top: 'colour',
            metal: 'metalcolour',
            base: 'secondcolour',
            meshcolour: 'meshcolour',
            profilecolour: 'profilecolour',
            undercolour: 'undercolour'
        }

        // Build an update object based on the event details and our mapping
        const update = {};

        const urlParams = {};

        // Iterate over expected keys and map them to our defaults structure
        for (const [layer, data] of Object.entries(selectedOptions)) {

            // layer will be 'top', 'base', 'metal', etc.
            // data will be the object for that layer (e.g., { filename, swatchName })
            if (data && data.filename) {

                // Update the corresponding entry in the update object with the cleaned filename
                update[layerMap[layer]] = data.filename.replace(/\s+/g, '-').toLowerCase();

                // Build URL params
                urlParams[layerMap[layer]] = data.swatchName;

                // If base, also set secondcolourname as required by mtl.php for the base colour name to show in the UI
                if (layer === 'base' && data.swatchName) {
                    update['secondcolourname'] = data.swatchName;
                }

            } else {
                // These are the fallback values for layers that don't have swatches (mesh, profile, undercolour)
                // Colours are set on the fly in mtl.php
                update[layerMap[layer]] = data;
            }

        }

        // Defaults
        update.meshcolour = 'meshcolour';
        update.profilecolour = 'profilecolour';
        update.undercolour = 'undercolour';

        // Add the product id once
        if (productId) {
            update.id = productId;
            urlParams.id = productId;
        }

        // Build query string from the update object and update our defaults
        this.modelState.queryString = this.buildQueryString(update);

        // Reload the model to reflect the new colour options
        this.loadModel();

        // Return params for url update in the UI
        return urlParams;

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
     * Initializes 3D scene and camera
     * @returns {void}
     */
    initScene() {
        this.viewer.scene = new THREE.Scene();
        this.viewer.scene.background = new THREE.Color(0xf3f3f3);
        this.camera = new THREE.PerspectiveCamera(
            this.modelState.adjustment || 40,
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
        this.viewer.scene.add(new THREE.AmbientLight(0xffffff, 2));
        // Spotlights and directional lights for realistic shadows
        this.spotLight = new THREE.SpotLight(0xffffff, 250);
        this.spotLight.angle = Math.PI / 15;
        this.spotLight.penumbra = 0.4;
        this.spotLight.castShadow = true;
        this.spotLight.position.set(0, 25, 20);
        this.spotLight.shadow.camera.near = 8;
        this.spotLight.shadow.camera.far = 36;
        this.spotLight.shadow.mapSize.set(256, 256);
        this.viewer.scene.add(this.spotLight);
        this.viewer.scene.add(this.spotLight.target);
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
        this.viewer.scene.add(this.dirLight);
        this.viewer.scene.add(this.dirLight.target);
        this.dirLight.target.position.set(0, 11, 0);

        this.dirLight2 = new THREE.SpotLight(0xffffff, 100);
        this.dirLight2.position.set(-15, 8, 8);
        this.dirLight2.angle = Math.PI / 6;
        this.dirLight2.penumbra = 0.1;
        this.dirLight2.castShadow = true;
        this.viewer.scene.add(this.dirLight2);
        this.viewer.scene.add(this.dirLight2.target);
        this.dirLight2.target.position.set(0, 8, 0);

        this.dirLight3 = new THREE.SpotLight(0xffffff, 500);
        this.dirLight3.position.set(-10, 6, -15);
        this.dirLight3.angle = Math.PI / 4;
        this.dirLight3.penumbra = 0.5;
        this.dirLight3.castShadow = true;
        this.viewer.scene.add(this.dirLight3);
        this.viewer.scene.add(this.dirLight3.target);
        this.dirLight3.target.position.set(0, 10, 0);

        this.rectLight = new THREE.SpotLight(0xffffff, 1500);
        this.rectLight.position.set(-25, 29, -75);
        this.rectLight.lookAt(new THREE.Vector3(0, 12, 0));
        this.viewer.scene.add(this.rectLight);
        this.viewer.scene.add(this.rectLight.target);
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
        const url = texPath + this.modelState.shadowName;

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
        this.viewer.scene.add(ground);
    }

    /**
     * Loads the OBJ model and applies preloaded materials
     * @returns {void}
     */
    loadModel() {

        // Add base path constant from DOM 
        const base = TM3DPlugin?.url ? TM3DPlugin.url + 'assets/models' : '';

        if (!this.modelState.textureName || !this.viewer.scene) return;

        const mtlUrl = `${base}/mtl.php${this.modelState.queryString}`;
        const objUrl = `${base}/${this.modelState.textureName}-obj.php${this.modelState.queryString}`;

        const mtlLoader = new MTLLoader();
        const objLoader = new OBJLoader();

        mtlLoader.load(mtlUrl, (materials) => {

            materials.preload();

            objLoader.setMaterials(materials);

            objLoader.load(objUrl, (object) => {

                if (this.viewer.loadedModel) {
                    this.viewer.scene.remove(this.viewer.loadedModel);
                    this.viewer.loadedModel.traverse((child) => {
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

                this.viewer.scene.add(object);
                this.viewer.loadedModel = object;

                if (!this.modelState.cameraAnimated) {
                    gsap.to(this.camera.position, {
                        x: 0,
                        y: 14,
                        z: 30,
                        duration: 2.5,
                        ease: "back.inOut"
                    });
                    this.modelState.cameraAnimated = true;
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
        this.renderer.render(this.viewer.scene, this.camera);
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
    initViewer() {

        // Get initial layer values from DOM and URL params
        const initialValues = this.getInitialLayerValues();

        // Ensure first model load reflects URL/default layers even before swatch events fire
        this.modelState.queryString = this.buildQueryString(initialValues);

        // Determine texture path based on plugin URL or fallback to default path
        const texPath = TM3DPlugin?.url ? TM3DPlugin.url + 'assets/models/textures/' : '/wp-content/plugins/tm-three-viewer/assets/models/textures/';
        
        // Collect texture URLs from the layer keys only.
        // secondcolourname is metadata for the base layer name, not a texture file.
        const textureKeys = Object.keys(initialValues).filter(key => key !== 'secondcolourname');
        
        // Preload textures for the initial layer values
        const textureURLsByKey = {};
        textureKeys.forEach(key => {
            const imageName = initialValues?.[key];
            if (imageName) {
                textureURLsByKey[key] = texPath + imageName + '.jpg' + (TM3DPlugin?.version ? `?v=${TM3DPlugin.version}` : '');
            }
        });

        // Preload textures and initialize the scene once all textures are loaded
        this.preloadTextures(Object.values(textureURLsByKey))
            .then(texturesByUrl => {
                this.preloadedTextures = {};
                for (const [key, url] of Object.entries(textureURLsByKey)) {
                    this.preloadedTextures[key] = texturesByUrl[url];
                }
                // Initialize scene and related components once
                if (!this.viewer.scene) {
                    this.initScene();
                    this.initRenderer();
                    this.initLights();
                    this.initShadowMapViewers();
                    this.initControls();
                    this.loadGround();
                    window.addEventListener('resize', () => this.onResize());
                    if (!this.runtime.isAnimating) {
                        this.runtime.isAnimating = true;
                        this.animate();
                    }
                }
                this.loadModel();
                this.fadeLoading();
            })
            .catch(err => {
                console.warn('Failed to preload one or more images:', err);

                if (!this.viewer.scene) {
                    this.initScene();
                    this.initRenderer();
                    this.initLights();
                    this.initShadowMapViewers();
                    this.initControls();
                    this.loadGround();
                    window.addEventListener('resize', () => this.onResize());
                    if (!this.runtime.isAnimating) {
                        this.runtime.isAnimating = true;
                        this.animate();
                    }
                }
                this.loadModel();
                this.fadeLoading();
            });
    }

}