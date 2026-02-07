'use client';

type PreprocessOptions = {
    maxLongEdge?: number;
    initialQuality?: number;
    maxBytes?: number;
};

type PreprocessResult = {
    file: File;
    width: number;
    height: number;
    quality: number;
};

const DEFAULT_MAX_LONG_EDGE = 2000;
const DEFAULT_INITIAL_QUALITY = 0.8;
const DEFAULT_MAX_BYTES = 3.5 * 1024 * 1024;
const MIN_QUALITY = 0.55;

function fileToImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const src = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(src);
            resolve(img);
        };
        img.onerror = () => {
            URL.revokeObjectURL(src);
            reject(new Error('Failed to load image for preprocessing'));
        };
        img.src = src;
    });
}

async function drawImageToCanvas(file: File, width: number, height: number): Promise<HTMLCanvasElement> {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not initialize canvas context');

    // createImageBitmap preserves EXIF orientation with imageOrientation: 'from-image' in modern browsers.
    if (typeof createImageBitmap === 'function') {
        try {
            const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' as any });
            ctx.drawImage(bitmap, 0, 0, width, height);
            bitmap.close();
            return canvas;
        } catch {
            // Fall back to HTMLImageElement path below.
        }
    }

    const image = await fileToImage(file);
    ctx.drawImage(image, 0, 0, width, height);
    return canvas;
}

function encodeCanvas(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    reject(new Error('Failed to encode image'));
                    return;
                }
                resolve(blob);
            },
            'image/jpeg',
            quality,
        );
    });
}

export async function preprocessReceiptImage(
    file: File,
    options: PreprocessOptions = {},
): Promise<PreprocessResult> {
    const maxLongEdge = options.maxLongEdge ?? DEFAULT_MAX_LONG_EDGE;
    const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
    let quality = options.initialQuality ?? DEFAULT_INITIAL_QUALITY;

    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' as any }).catch(() => null);
    const srcWidth = bitmap?.width ?? 0;
    const srcHeight = bitmap?.height ?? 0;
    if (bitmap) bitmap.close();

    let width = srcWidth || 0;
    let height = srcHeight || 0;

    if (!width || !height) {
        const img = await fileToImage(file);
        width = img.naturalWidth || img.width;
        height = img.naturalHeight || img.height;
    }

    const longEdge = Math.max(width, height);
    const scale = longEdge > maxLongEdge ? maxLongEdge / longEdge : 1;
    let targetWidth = Math.max(1, Math.round(width * scale));
    let targetHeight = Math.max(1, Math.round(height * scale));

    let canvas = await drawImageToCanvas(file, targetWidth, targetHeight);
    let blob = await encodeCanvas(canvas, quality);

    // If still too large, lower JPEG quality, then downscale progressively.
    while (blob.size > maxBytes && quality > MIN_QUALITY) {
        quality = Math.max(MIN_QUALITY, Number((quality - 0.07).toFixed(2)));
        blob = await encodeCanvas(canvas, quality);
    }

    let downscaleRounds = 0;
    while (blob.size > maxBytes && downscaleRounds < 3) {
        downscaleRounds += 1;
        targetWidth = Math.max(960, Math.round(targetWidth * 0.9));
        targetHeight = Math.max(960, Math.round(targetHeight * 0.9));
        canvas = await drawImageToCanvas(file, targetWidth, targetHeight);
        blob = await encodeCanvas(canvas, quality);
    }

    const base = file.name.replace(/\.[^.]+$/, '');
    const processed = new File([blob], `${base}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now(),
    });

    return {
        file: processed,
        width: targetWidth,
        height: targetHeight,
        quality,
    };
}
