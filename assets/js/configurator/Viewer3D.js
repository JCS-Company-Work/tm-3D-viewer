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

        // Track if this is the initial model load (for texture preload handling)
        this.isFirstLoad = true;

        // Track if viewer has been initialized (for lazy loading)
        this.isViewerInitialized = false;

        // Adjust camera settings based on screen size
        this.setAdjustment();

        // Determine texture name from container attribute
        this.setTextureName();

        // Set shadow image based on model type
        this.setShadow();

        // Initialize event listeners (fullscreen, toggle button)
        this.addEventListeners();

        // Defer 3D model initialization until container is in viewport
        this.deferInitViewerUntilInView();

        
    }

    // ===================== Initialisation ===================== //
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
     * Defers the 3D viewer initialization until the container element comes into view.
     * Uses IntersectionObserver to detect when the element is visible in the viewport.
     * @returns {void}
     */
    deferInitViewerUntilInView() {

        // Check if the container exists before setting up the observer
        if (!this.container) {
            console.warn('[ProductRenders] Cannot defer init - container not found');
            return;
        }

        // Create intersection observer to detect when element enters viewport
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    // Initialize viewer when element becomes visible
                    if (entry.isIntersecting && !this.isViewerInitialized) {
                        this.isViewerInitialized = true;
                        this.initViewer();
                        // Stop observing after initialization
                        observer.unobserve(this.container);
                    }
                });
            },
            {
                threshold: 0.01 // Trigger when 1% of element is visible
            }
        );

        // Start observing the container
        observer.observe(this.container);

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

        // Validate modelId is provided and non-null
        if (!modelId) {
            console.warn('[ProductViewer] setProductModel called with invalid modelId:', modelId);
            return;
        }

        // Update the texture name in state based on the selected model ID
        this.modelState.textureName = modelId;

        // Keep container metadata in sync because other modules derive state from item-name.
        this.container?.setAttribute('item-name', modelId);

        // Re-apply baseline camera adjustment for this viewport
        this.setAdjustment();
        
        // Update the shadow image in use based on the new model type
        this.setShadow();

        // Re-run the same first-load camera path for model switches
        if (this.camera) {
            this.camera.fov = this.modelState.adjustment || this.camera.fov;
            this.camera.position.set(25, 24, -25);
            this.camera.updateProjectionMatrix();
        }
        this.modelState.cameraAnimated = false;
        
        // Update shadow beneath the model
        this.loadGround();
        
        // Re-initialize controls to ensure proper interaction with the new model
        this.initControls();

        // Briefly show loading overlay while the new model is fetched and rendered
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = '';
            loadingScreen.classList.remove('fade-out');
        }

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



    /**
     * Updates the selected colour options based on the event detail
     * @param {object} selectedOptions - The selected colour options from the event detail 
     * @returns {void}
     */
    updateColourOptions(selectedOptions, productId = null) {

        // Params returned to URL sync logic in Configurator.js
        const urlParams = {};
        
        // Keep first-load and interactive updates on the same mapping logic.
        this.modelState.queryString = this.buildQueryStringFromSelectedOptions(selectedOptions, productId);

        if (productId) {
            urlParams.id = productId;
        }

        // Mapping of layer keys from event to URL keys.
        const layerMap = {
            top: 'colour',
            metal: 'veneer',
            base: 'secondcolour'
        };

        // Build URL-facing values from user-facing swatch names.
        Object.entries(selectedOptions || {}).forEach(([layer, data]) => {
            const urlKey = layerMap[layer];
            if (!urlKey || !data?.swatchName) {
                return;
            }
            urlParams[urlKey] = data.swatchName;
        });


        // Single orchestrated load: state complete, all parameters ready
        // Pass queryString to loadModel so it captures this specific state snapshot
        this.loadModel(this.modelState.textureName, this.modelState.queryString);

        // Return params for url update in the UI
        return urlParams;

    }

    /**
     * Build query string from selected options using the same logic for first load and swatch updates.
     * @param {object} selectedOptions
     * @param {string|number|null} productId
     * @returns {string}
     */
    buildQueryStringFromSelectedOptions(selectedOptions = {}, productId = null) {

        const layerMap = {
            top: 'colour',
            metal: 'metalcolour',
            base: 'secondcolour',
            meshcolour: 'meshcolour',
            profilecolour: 'profilecolour',
            undercolour: 'undercolour'
        };

        const update = {};

        // Normalize selected option payload into mtl.php/obj.php query params.
        for (const [layer, data] of Object.entries(selectedOptions)) {

            if (data && data.filename) {
                update[layerMap[layer]] = data.filename.replace(/\s+/g, '-').toLowerCase();

                if (layer === 'base') {
                    update.secondcolourname = data.swatchName;
                }
                continue;
            }

            update[layerMap[layer]] = data;
        }

        update.meshcolour = update.meshcolour || 'meshcolour';
        update.profilecolour = update.profilecolour || 'profilecolour';
        update.undercolour = update.undercolour || 'undercolour';

        if (productId) {
            update.id = productId;
        }

        return this.buildQueryString(update);

    }

    /**
     * Read currently selected top/base/metal options from the DOM.
     * @returns {object}
     */
    getSelectedOptionsFromDOM() {

        const groups = [
            { key: 'top', selector: '.obj-top-colour', prefix: 'swatch-' },
            { key: 'base', selector: '.obj-base', prefix: 'swatch-' },
            { key: 'metal', selector: '.obj-metal-edge-veneer', prefix: 'banding-' }
        ];

        const selectedOptions = {};

        // Read currently checked top/base/metal swatches from the DOM
        // and map them to the selectedOptions payload shape.
        groups.forEach(({ key, selector, prefix }) => {
            const filename = this.getSelectedSwatchFilename(selector, prefix);
            const swatchName = this.getSelectedSwatchName(selector);

            if (!filename || !swatchName) {
                return;
            }

            selectedOptions[key] = { filename, swatchName };
        });

        return selectedOptions;

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

    // ===================== 3d Viewer Functions ===================== //
    /**
     * Initializes the product configurator viewer, preloads textures, and sets up the scene
     */
    initViewer() {

        // Get initial layer values from DOM and URL params
        const initialValues = this.getInitialLayerValues();

        // Build selected options from current DOM so first load follows the same path as model/swatch updates.
        const selectedOptions = this.getSelectedOptionsFromDOM();
        const initialProductId = document.querySelector('.obj-product-type .wapf-input:checked')?.id || null;

        // Ensure first model load reflects URL/default layers even before swatch events fire
        this.modelState.queryString = Object.keys(selectedOptions).length
            ? this.buildQueryStringFromSelectedOptions(selectedOptions, initialProductId)
            : this.buildQueryString(initialValues);

        // Determine texture path based on plugin URL or fallback to default path
        const texPath = TM3DPlugin?.url ? TM3DPlugin.url + 'assets/models/textures/' : '/wp-content/plugins/tm-three-viewer/assets/models/textures/';
        
        // Collect texture URLs from keys that map to actual texture files.
        // secondcolourname is metadata for mtl.php.
        // meshcolour/profilecolour/undercolour are material tokens in mtl.php and are never texture files.
        const nonTextureKeys = new Set(['secondcolourname', 'meshcolour', 'profilecolour', 'undercolour']);
        const textureKeys = Object.keys(initialValues).filter(key => !nonTextureKeys.has(key));
        
        // Preload textures for the initial layer values
        const textureURLsByKey = {};
        textureKeys.forEach(key => {
            const imageName = initialValues?.[key];
            // Only add valid, non-empty image names to prevent loading null/undefined textures
            if (imageName && typeof imageName === 'string' && imageName.trim()) {
                textureURLsByKey[key] = texPath + imageName.trim() + '.jpg' + (TM3DPlugin?.version ? `?v=${TM3DPlugin.version}` : '');
            }
        });

        // Filter out any empty texture URLs before preloading
        const texturesToPreload = Object.values(textureURLsByKey).filter(url => url && url.length > 0);

        // Preload textures and initialize the scene once all textures are loaded
        this.preloadTextures(texturesToPreload)
            .then(texturesByUrl => {
                this.preloadedTextures = {};
                for (const [key, url] of Object.entries(textureURLsByKey)) {
                    if (texturesByUrl[url]) {
                        this.preloadedTextures[key] = texturesByUrl[url];
                    }
                }
                // Initialize scene and related components once
                if (!this.viewer.scene) {
                    this.createScene();
                }
                this.loadModel();
                this.fadeLoading();
            })
            .catch(err => {
                console.warn('Failed to preload one or more images:', err);

                if (!this.viewer.scene) {
                    this.createScene();
                }
                this.loadModel();
                this.fadeLoading();
            });
    }

    /**
     * Creates the 3D scene, renderer, lights, controls, and ground plane, and starts the animation loop.
     */
    createScene() {

        // Init scene
        this.initScene();
        
        // Init renderer
        this.initRenderer();
        
        // Init lights
        this.initLights();
        
        // Init shadow map viewers for debugging
        this.initShadowMapViewers();
        
        // Init controls
        this.initControls();

        // Load ground plane
        this.loadGround();

        // Handle window resize
        window.addEventListener('resize', () => this.onResize());
        if (!this.runtime.isAnimating) {
            this.runtime.isAnimating = true;
            this.animate();
        }
        
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

        // Create WebGL renderer with antialiasing and alpha transparency
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        
        // Limit pixel ratio for performance on high-DPI screens
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

        // Remove existing ground if present
        const texPath = '/wp-content/plugins/tm-three-viewer/assets/models/textures/';

        // Construct url path
        const url = texPath + this.modelState.shadowName;

        // Texture is preloaded, use it; otherwise, load it directly
        const texture = this.preloadedTextures && this.preloadedTextures['groundshadow']
            ? this.preloadedTextures['groundshadow']
            : new THREE.TextureLoader().load(url);

        // Set texture properties for proper display
        texture.center = new THREE.Vector2(0.5, 0.5);
        texture.rotation = - Math.PI / 4;
        texture.repeat.set(0.70, 0.70);

        // Geometry and material for the ground plane
        const geometry = new THREE.BoxGeometry(45, 0.75, 45);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            color: 0xf7f7f7,
            combine: 0
        });

        // Create the ground mesh, set its properties, and add it to the scene
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
    loadModel(textureName = null, queryString = null) {

        // Add base path constant from DOM 
        const base = TM3DPlugin?.url ? TM3DPlugin.url + 'assets/models' : '';

        // Use passed parameters (current state snapshot) or fall back to modelState
        // Passed parameters ensure async completion uses the state THIS call captured,
        // not whatever the shared modelState has become while we were loading
        const finalTextureName = textureName || this.modelState.textureName;
        const finalQueryString = queryString || this.modelState.queryString;

        // Ensure texture name and scene are available before proceeding
        if (!finalTextureName || !this.viewer.scene) {
            console.warn('[ProductViewer] Cannot load model - textureName:', finalTextureName, 'scene:', !!this.viewer.scene);
            return;
        }

        // Construct URLs for MTL and OBJ files using captured state
        const mtlUrl = `${base}/mtl.php${finalQueryString}`;
        const objUrl = `${base}/${finalTextureName}-obj.php${finalQueryString}`;

        // Load the MTL and OBJ files using Three.js loaders
        const mtlLoader = new MTLLoader();
        const objLoader = new OBJLoader();

        // Load materials from the MTL file
        mtlLoader.load(mtlUrl, (materials) => {

            // Preload materials to ensure textures are ready before loading the OBJ
            materials.preload();

            // Set the loaded materials to the OBJ loader
            objLoader.setMaterials(materials);

            // Load the OBJ model with the applied materials
            objLoader.load(objUrl, (object) => {

                // Remove the previously loaded model from the scene and dispose of its resources
                if (this.viewer.loadedModel) {

                    // Remove the old model from the scene
                    this.viewer.scene.remove(this.viewer.loadedModel);

                    // Dispose of geometries and materials to free up memory
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

                // Set the position and scale of the new model
                object.position.y = 4.5;
                object.scale.setScalar(0.1);

                // Traverse the model's hierarchy to apply shadows
                object.traverse(node => {
                    if (node.isMesh) {
                        node.castShadow = true;
                    }
                });

                // Mark first load as complete
                this.isFirstLoad = false;

                // Add the new model to the scene and update the reference
                this.viewer.scene.add(object);
                this.viewer.loadedModel = object;

                // Fade out loading screen now that model is loaded
                this.fadeLoading();

                // Animate camera to a new position if it hasn't been animated yet
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
    async preloadTextures(urls) {


        // Create a texture loader with cross-origin support
        const loader = new THREE.TextureLoader();
        
        // Set cross-origin to 'anonymous' to handle textures from different origins
        loader.setCrossOrigin('anonymous');

        // Create an array of promises for loading each texture
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

        // Wait for all texture promises to resolve and return an object mapping URLs to textures
        const results = await Promise.all(texturePromises);
        return results.reduce((acc, curr) => {
            acc[curr.url] = curr.texture;
            return acc;
        }, {});

    }

    /**
     * Normalises a swatch slug by converting it to lowercase, replacing spaces with hyphens, and adding a prefix if necessary
     * @param {string} value - The value to normalise
     * @param {string} prefix - The prefix to add if the slug doesn't already have one
     * @returns {string} - The normalised slug
     */
    normaliseSwatchSlug(value, prefix) {

        // Return an empty string if the value is falsy
        if (!value) return '';

        // Convert the value to lowercase, replace '+' with spaces, trim whitespace, 
        // replace non-alphanumeric characters with hyphens, and remove leading/trailing hyphens
        const slug = value
            .toLowerCase()
            .replace(/\+/g, ' ')
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

        // Return an empty string if the slug is empty
        if (!slug) return '';

        // If the slug already starts with 'swatch-' or 'banding-', return it as is
        if (slug.startsWith('swatch-') || slug.startsWith('banding-')) return slug;

        // Otherwise, prepend the specified prefix and return the normalised slug
        return `${prefix}${slug}`;

    }

    /**
     * Gets the name of the selected swatch in a given group
     * @param {string} groupSelector - The CSS selector for the swatch group
     * @returns {string} - The name of the selected swatch
     */
    getSelectedSwatchName(groupSelector) {

        // Find the checked input within the specified group
        const checkedInput = document.querySelector(`${groupSelector} .wapf-input:checked`);

        // If no checked input is found, return an empty string
        if (!checkedInput) return '';

        // Get the closest label element to the checked input
        const label = checkedInput.closest('label');
        
        // Determine the swatch name from the label's aria-label, input value, or text content
        const swatchName =
            label?.getAttribute('aria-label') ||
            checkedInput.value ||
            label?.textContent ||
            '';

        // Return the trimmed swatch name
        return swatchName.trim();

    }

    /**
     * Gets the image file name from a swatch image element
     * @param {HTMLImageElement} swatchImage - The swatch image element
     * @returns {string|null} - The image file name or null if not found
     */
    getImageFileName(swatchImage) {

        // Check if the swatch image element exists
        if (!swatchImage) return null;

        // Get the src attribute of the swatch image
        const imgSrc = swatchImage?.src;
        
        // Use regex to extract the swatch name from the image source URL
        const swatchName = imgSrc?.match(/uploads\/(.+?)-\d+x\d+\.jpg/);
        
        // Return the matched swatch name or null if not found
        return swatchName ? swatchName[1] : null;
    }

    /**
     * Gets the filename of the selected swatch in a given group
     * @param {string} groupSelector - The CSS selector for the swatch group
     * @param {string} prefix - The prefix to add if the slug doesn't already have one
     * @returns {string} - The filename of the selected swatch
     */
    getSelectedSwatchFilename(groupSelector, prefix = 'swatch-') {

        // Find the checked input within the specified group
        const checkedInput = document.querySelector(`${groupSelector} .wapf-input:checked`);
        
        // If no checked input is found, return an empty string
        if (!checkedInput) return '';

        // Find the swatch image element associated with the checked input
        const swatchEl = checkedInput.closest('.wapf-swatch')?.querySelector('.swatch');
        
        // Try to extract filename from image src (for WP attachments)
        let filename = this.getImageFileName(swatchEl);
        
        // Fallback: if image filename extraction fails, use input value or aria-label
        if (!filename) {
            const label = checkedInput.closest('label');
            filename = label?.getAttribute('aria-label') || checkedInput.value;
        }
        
        // Normalize the filename to ensure it has the correct prefix and format
        return this.normaliseSwatchSlug(filename, prefix);

    }

    /**
     * Gets the initial layer values for the product configurator
     * @returns {Object} - The initial layer values
     */
    getInitialLayerValues() {

        const initialValues = {
            colour: 'swatch-macchia-vecchia',
            metalcolour: 'banding-brushed-gold',
            secondcolour: 'swatch-macchia-vecchia',
            meshcolour: 'meshcolour',
            profilecolour: 'profilecolour',
            undercolour: 'undercolour'
        };

        // Check the DOM for selected swatches to set initial values
        const currentlySelected = {
            colour: this.getSelectedSwatchFilename('.obj-top-colour', 'swatch-'),
            metalcolour: this.getSelectedSwatchFilename('.obj-metal-edge-veneer', 'banding-'),
            secondcolour: this.getSelectedSwatchFilename('.obj-base', 'swatch-')
        };

        // Override with DOM values if present
        Object.entries(currentlySelected).forEach(([key, val]) => {
            if (val) initialValues[key] = val;
        });

        // If we have a base swatch name, set secondcolourname for mtl.php to use as the base layer name in the UI
        if (currentlySelected.secondcolour) {
            // Required by mtl.php/obj.php material naming for the base layer.
            initialValues.secondcolourname = currentlySelected.secondcolour.replace(/^swatch-/, '').replace(/-/g, ' ').split('-').join(' ');
        }

        // Check for any missing required values
        const missingKeys = Object.keys(initialValues).filter(key => !initialValues[key]);

        // If any required values are missing, pass keys to apply URL overrides to fill them
        if (missingKeys.length) {
            this.applyUrlOverrides(initialValues, missingKeys);
        }

        // Return the final initial values object
        return initialValues;

    }

    /**
     * Applies URL overrides to fill in missing values
     * @param {object} values - The current values object
     * @param {Array} missingKeys - The keys that are missing and need to be filled from the URL
     */
    applyUrlOverrides(values, missingKeys) {

        // Parse the current URL to extract query parameters
        const url = new URL(window.location.href);

        // Map URL parameters to the corresponding keys in the values object
        const urlMap = {
            colour: this.normaliseSwatchSlug(url.searchParams.get('colour'), 'swatch-'),
            metalcolour: this.normaliseSwatchSlug(url.searchParams.get('veneer'), 'banding-'),
            secondcolour: this.normaliseSwatchSlug(url.searchParams.get('base'), 'swatch-'),
            profilecolour: this.normaliseSwatchSlug(url.searchParams.get('profilecolour'), ''),
            undercolour: this.normaliseSwatchSlug(url.searchParams.get('undercolour'), ''),
            meshcolour: this.normaliseSwatchSlug(url.searchParams.get('meshcolour'), '')
        };

        // Iterate over the missing keys and fill them with values from the URL if available
        missingKeys.forEach(key => {
            if (urlMap[key]) {
                values[key] = urlMap[key];
            }
        });
    }

    // ===================== Utility Functions ===================== //
    /**
     * Fades out loading screen when the 3D scene is ready
     * @returns {void}
     */
    fadeLoading() {

        // Get the loading screen element from DOM
        const loadingScreen = document.getElementById('loading-screen');

        // If the loading screen element is not found, exit
        if (!loadingScreen) return;

        // Add fade-out class to trigger CSS animation
        loadingScreen.classList.add('fade-out');
        
        // Hide after fade animation completes (300ms should be enough for most transitions)
        setTimeout(() => {
            if (loadingScreen && document.body.contains(loadingScreen)) {
                loadingScreen.style.display = 'none';
            }
        }, 300);
    }
}