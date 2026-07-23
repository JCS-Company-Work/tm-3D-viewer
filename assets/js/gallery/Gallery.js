export default class Gallery {

    constructor(container) {
        this.container = container || null;
        this.initializedWrappers = new WeakSet();
        this.init();
    }

    /**
     * 
     * @returns {void}
     */
    init() {

        // Get current status wrapper from DOM
        const wrappers = document.querySelectorAll('.current-status-wrapper');
        
        // Initialize galleries for any existing current-status-wrapper elements
        wrappers.forEach((wrapper) => this.initGallery(wrapper));

        //If no wrapper exit early
        if (wrappers.length) {
            return;
        }

        // Observe for new current-status-wrapper elements being added to the DOM
        const observer = new MutationObserver(() => {

            // Initialize galleries for any new current-status-wrapper elements
            document.querySelectorAll('.current-status-wrapper').forEach((wrapper) => {
                this.initGallery(wrapper);
            });
        });

        // Start observing the document body for added nodes
        observer.observe(document.body, { childList: true, subtree: true });
    }

    /**
     * Initialize a gallery for the given current status wrapper.
     * @param {HTMLElement|null} currentStatusWrapper 
     * @returns {Promise<void>}
     */
    async initGallery(currentStatusWrapper = null) {

        // Use the provided wrapper or fall back to the container
        const wrapper = currentStatusWrapper || this.container;
        
        // Exit early if no wrapper is found
        if (!wrapper) return;

        // Exit early if this wrapper has already been initialized
        if (this.initializedWrappers.has(wrapper)) return;

        // Only include valid gallery images, filter out metal edge if hidden in DOM
        const statusLinks = [...wrapper.querySelectorAll(
            'a[data-pswp-gallery="tm3d-status-gallery"], .status-image a, .status-layer-img a'
        )].filter(link => {

            // Find closest status layer ancestor to the link
            const layer = link.closest('.status-layer');

            // Ignore hidden layers
            if (layer && layer.classList.contains('d-none')) {
                return false;
            }

            // Ignore empty images
            const img = link.querySelector('img');
            if (img && !img.getAttribute('src')) {
                return false;
            }

            // Ignore empty PhotoSwipe sources
            if (!link.dataset.pswpSrc) {
                return false;
            }

            return true;
        });

        // Exit early if no valid status links are found
        if (!statusLinks.length) return;

        // Give PhotoSwipe a selector for the filtered items
        statusLinks.forEach(link => link.classList.add('pswp-gallery-item'));

        try {
            const { default: PhotoSwipe } = await import('./photoswipe/photoswipe.esm.min.js');
            const { default: PhotoSwipeLightbox } = await import('./photoswipe/photoswipe-lightbox.esm.min.js');

            const lightbox = new PhotoSwipeLightbox({
                gallery: wrapper,
                children: '.pswp-gallery-item',
                pswpModule: () => PhotoSwipe,
            });

            lightbox.init();
            this.initializedWrappers.add(wrapper);
        } catch (err) {
            console.error('PhotoSwipe modules failed to load', err);
        }
    }
}