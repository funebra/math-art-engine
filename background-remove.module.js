// background-remove.module.js
//
// Lightweight, pure-browser background remover.
// Strategy:
// 1. Draw the image to an off-screen canvas.
// 2. Sample the corner pixels to estimate the background color.
// 3. For each pixel, compare to bg color; if similar -> make transparent.
//
// Best for: objects on a fairly uniform background (white/gray/green/etc).

export const BackgroundRemove = {

    /**
     * Load an image from a File, Blob, or URL string.
     * Returns a Promise<HTMLImageElement>.
     */
    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";

            if (src instanceof File || src instanceof Blob) {
                const reader = new FileReader();
                reader.onload = e => {
                    img.onload = () => resolve(img);
                    img.onerror = reject;
                    img.src = e.target.result;
                };
                reader.onerror = reject;
                reader.readAsDataURL(src);
            } else if (typeof src === "string") {
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = src;
            } else {
                reject(new Error("Unsupported src type. Use File, Blob, or URL string."));
            }
        });
    },

    /**
     * Core function: remove background.
     *
     * @param {HTMLImageElement} img
     * @param {Object} [opts]
     * @param {number} [opts.sampleSize=10]   - how many pixels per corner to sample
     * @param {number} [opts.threshold=40]    - color-distance threshold; bigger = more aggressive
     * @param {boolean} [opts.softEdges=true] - soften alpha near threshold
     * @returns {HTMLCanvasElement} a canvas with transparent background
     */
    removeBackgroundFromImage(img, opts = {}) {
        const {
            sampleSize = 10,
            threshold = 40,
            softEdges = true
        } = opts;

        // Prepare canvas
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const w = canvas.width = img.naturalWidth || img.width;
        const h = canvas.height = img.naturalHeight || img.height;

        ctx.drawImage(img, 0, 0, w, h);

        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;

        // 1. Estimate background color by sampling corners
        const bgColor = this._estimateBackgroundColor(data, w, h, sampleSize);

        // 2. For each pixel, compare to bgColor and adjust alpha
        const thrSq = threshold * threshold;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const idx = (y * w + x) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                const a = data[idx + 3];

                // If already fully transparent, skip
                if (a === 0) continue;

                const distSq =
                    (r - bgColor.r) * (r - bgColor.r) +
                    (g - bgColor.g) * (g - bgColor.g) +
                    (b - bgColor.b) * (b - bgColor.b);

                if (distSq < thrSq) {
                    // background-ish → transparency
                    if (!softEdges) {
                        data[idx + 3] = 0;
                    } else {
                        // Soft edge: scale alpha depending on how close it is
                        const dist = Math.sqrt(distSq);
                        const factor = dist / threshold; // 0..1
                        data[idx + 3] = Math.round(a * factor);
                    }
                }
            }
        }

        ctx.putImageData(imageData, 0, 0);
        return canvas;
    },

    /**
     * Estimate background color by sampling small blocks from the four corners.
     * Returns {r,g,b}
     */
    _estimateBackgroundColor(data, w, h, sampleSize) {
        const samples = [];

        const pushBlock = (x0, y0) => {
            const xEnd = Math.min(x0 + sampleSize, w);
            const yEnd = Math.min(y0 + sampleSize, h);
            for (let y = y0; y < yEnd; y++) {
                for (let x = x0; x < xEnd; x++) {
                    const idx = (y * w + x) * 4;
                    const r = data[idx];
                    const g = data[idx + 1];
                    const b = data[idx + 2];
                    const a = data[idx + 3];
                    if (a > 0) {
                        samples.push({ r, g, b });
                    }
                }
            }
        };

        // 4 corners
        pushBlock(0, 0);                             // top-left
        pushBlock(w - sampleSize, 0);                // top-right
        pushBlock(0, h - sampleSize);                // bottom-left
        pushBlock(w - sampleSize, h - sampleSize);   // bottom-right

        if (samples.length === 0) {
            // fallback: default white-ish
            return { r: 255, g: 255, b: 255 };
        }

        let rSum = 0, gSum = 0, bSum = 0;
        for (const s of samples) {
            rSum += s.r;
            gSum += s.g;
            bSum += s.b;
        }

        const n = samples.length;
        return {
            r: Math.round(rSum / n),
            g: Math.round(gSum / n),
            b: Math.round(bSum / n)
        };
    }
};
