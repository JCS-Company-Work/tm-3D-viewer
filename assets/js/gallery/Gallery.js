export default class Gallery {
    constructor(container) {

        // Initialize the gallery
        this.createStatusGallery();
    }

    /**
     * Creates a single PhotoSwipe gallery for all status images and layers.
     */
    async createStatusGallery() {
        
        const currentStatusWrapper = document.querySelector('.current-status-wrapper');
        if (!currentStatusWrapper) return;

        const statusLinks = currentStatusWrapper.querySelectorAll('.status-image a, .status-layer-img a');
        if (!statusLinks.length) return;

        try {
            const { default: PhotoSwipe } = await import('./photoswipe/photoswipe.esm.min.js');
            const { default: PhotoSwipeLightbox } = await import('./photoswipe/photoswipe-lightbox.esm.min.js');

            this.lightbox = new PhotoSwipeLightbox({
                gallery: currentStatusWrapper,
                children: '.status-image a, .status-layer-img a',
                pswpModule: () => PhotoSwipe,
                arrowPrev: true,
                arrowNext: true,
            });

            this.lightbox.init();
        } catch (err) {
            console.error('PhotoSwipe modules failed to load', err);
        }
    }
}