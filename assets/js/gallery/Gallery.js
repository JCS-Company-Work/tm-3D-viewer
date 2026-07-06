export default class Gallery {
    constructor(container) {
        this.container = container;
        this.lightbox = null;
    }

    async initGallery() {
        try {
            const { default: PhotoSwipe } = await import('./photoswipe/photoswipe.esm.min.js');
            const { default: PhotoSwipeLightbox } = await import('./photoswipe/photoswipe-lightbox.esm.min.js');

            this.lightbox = new PhotoSwipeLightbox({
                gallery: this.container,
                children: 'li > a',
                pswpModule: () => PhotoSwipe,
            });

            this.lightbox.init();
        } catch (err) {
            console.error('PhotoSwipe modules failed to load', err);
        }
    }

    /**
     * Creates a single PhotoSwipe gallery for all status images and layers.
     */
    async createStatusGallery() {
        if (!this.container) return;

        const statusLinks = this.container.querySelectorAll('.status-image a, .status-layer-img a');
        if (!statusLinks.length) return;

        try {
            const { default: PhotoSwipe } = await import('./photoswipe/photoswipe.esm.min.js');
            const { default: PhotoSwipeLightbox } = await import('./photoswipe/photoswipe-lightbox.esm.min.js');

            this.lightbox = new PhotoSwipeLightbox({
                gallery: this.container,
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

    init() {
        if (this.container?.matches('.current-status-wrapper')) {
            this.createStatusGallery();
            return;
        }

        this.initGallery();
    }
}

// Initialize all galleries on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.tm-gallery, .tm-gallery-grid, .current-status-wrapper').forEach(galleryEl => {
        const gallery = new Gallery(galleryEl);
        gallery.init();
    });
});