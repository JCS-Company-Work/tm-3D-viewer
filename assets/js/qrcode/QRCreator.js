import QRCode from './qrcode.min.js';

export default class QRCreator {

    constructor() {

        // Create initial QR code on page load
        this.createQR();
        this.updateQRCode();

    }

    /**
     * Generate a QR code based on the current page URL (without tvembed parameter) and display it in the .qrcode element.
     * @returns {void}
     */
    createQR = () => {

        // Select QR code container from DOM
        const qrElement = document.querySelector(".qrcode");

        if (!qrElement) {
            return;
        }

        // Create a new QRCode instance with error correction level 'H'
        const qr = new QRCode(0, 'H');

        // Extract current url from form action
        const form = document.querySelector('form.cart');

        // Create a new URL object from the form's action attribute
        const url = new URL(form?.action);

        // Add all params from the current page's query string to the URL object
        const currentParams = new URLSearchParams(window.location.search);
        currentParams.forEach((value, key) => {
            url.searchParams.set(key, value);
        });

        // Remove the 'tvembed' parameter from the URL to ensure it's not included in the QR code
        url.searchParams.delete('tvembed');

        // Add the URL to the QR code and generate it
        qr.addData(url.toString());
        
        // Add the modified URL to the QR code and generate it
        qr.make();
        
        // Generate the QR code as an SVG and insert it into the .qrcode element
        qrElement.innerHTML = qr.createSvgTag({});

    }

    /**
     * Copy the generated QR code from the .qrcode element to the .status-qrcode element, 
     * and set up a MutationObserver to keep it in sync with any changes.
     * @returns {void}
     */
    updateQRCode = () => {
        
        const qrCode = document.querySelector(".qrcode");
        const qrEl = document.querySelector(".status-qrcode");

        if (!qrCode || !qrEl) return;

        // Initial copy
        this.copyQRCode(qrCode, qrEl);

        // Watch for subsequent changes
        if (!qrCode._observer) {
            const observer = new MutationObserver(() => {
                this.copyQRCode(qrCode, qrEl);
            });

            observer.observe(qrCode, {
                childList: true,
                subtree: true,
                attributes: true,
                characterData: true
            });

            qrCode._observer = observer; // prevent duplicates
        }
    }
}