export default class Gallery {
    constructor(container) {
        this.container = container || null;
        this.initializedWrappers = new WeakSet();
        this.init();
    }

    init() {
        const wrappers = document.querySelectorAll('.current-status-wrapper');
        wrappers.forEach((wrapper) => this.initGallery(wrapper));

        if (wrappers.length) {
            return;
        }

        const observer = new MutationObserver(() => {
            document.querySelectorAll('.current-status-wrapper').forEach((wrapper) => {
                this.initGallery(wrapper);
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    async initGallery(currentStatusWrapper = null) {
        const wrapper = currentStatusWrapper || this.container;
        if (!wrapper) return;

        if (this.initializedWrappers.has(wrapper)) return;

        try {
            const { default: PhotoSwipe } = await import('./photoswipe/photoswipe.esm.min.js');
            const { default: PhotoSwipeLightbox } = await import('./photoswipe/photoswipe-lightbox.esm.min.js');

            const lightbox = new PhotoSwipeLightbox({
                gallery: wrapper,
                children: 'a[data-pswp-gallery="tm3d-status-gallery"], .status-image a, .status-layer-img a',
                pswpModule: () => PhotoSwipe,
            });

            lightbox.init();
            this.initializedWrappers.add(wrapper);
        } catch (err) {
            console.error('PhotoSwipe modules failed to load', err);
        }
    }
}