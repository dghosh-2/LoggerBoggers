type CropResult = {
    file: File;
    didCrop: boolean;
};

type Point = {
    x: number;
    y: number;
};

export type NormalizedPoint = {
    x: number;
    y: number;
};

export type NormalizedQuad = [NormalizedPoint, NormalizedPoint, NormalizedPoint, NormalizedPoint]; // tl, tr, br, bl

type Quad = [Point, Point, Point, Point]; // tl, tr, br, bl

type ComponentBox = {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    area: number;
    touchesEdge: boolean;
    score: number;
};

type DetectionResult = {
    box: ComponentBox;
    corners: Quad;
};

type WorkImage = {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
};

const MAX_ANALYSIS_SIDE = 720;
const MAX_WORK_SIDE = 2200;
const MAX_OUTPUT_SIDE = 2000;
const MIN_COMPONENT_AREA_RATIO = 0.08;
const MAX_COMPONENT_AREA_RATIO = 0.96;
const MIN_OUTPUT_SIDE = 120;

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}

function luminance(r: number, g: number, b: number) {
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function channelSpread(r: number, g: number, b: number) {
    return Math.max(r, g, b) - Math.min(r, g, b);
}

function distance(a: Point, b: Point) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
}

function polygonArea(points: Quad) {
    let area = 0;
    for (let i = 0; i < points.length; i += 1) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];
        area += p1.x * p2.y - p2.x * p1.y;
    }
    return Math.abs(area) * 0.5;
}

function normalizeQuadFromAnyPoints(points: Array<Point | NormalizedPoint>): Quad {
    if (points.length !== 4) {
        throw new Error('Expected exactly 4 points');
    }

    const mapped = points.map((p) => ({ x: p.x, y: p.y }));
    const sums = mapped.map((p) => p.x + p.y);
    const diffs = mapped.map((p) => p.x - p.y);

    const tl = mapped[sums.indexOf(Math.min(...sums))];
    const br = mapped[sums.indexOf(Math.max(...sums))];
    const tr = mapped[diffs.indexOf(Math.max(...diffs))];
    const bl = mapped[diffs.indexOf(Math.min(...diffs))];

    return [tl, tr, br, bl];
}

function isValidQuad(quad: Quad, width: number, height: number) {
    const minSpan = Math.max(14, Math.min(width, height) * 0.08);
    const wTop = distance(quad[0], quad[1]);
    const wBottom = distance(quad[3], quad[2]);
    const hLeft = distance(quad[0], quad[3]);
    const hRight = distance(quad[1], quad[2]);
    const area = polygonArea(quad);
    const minArea = width * height * 0.04;

    if (wTop < minSpan || wBottom < minSpan || hLeft < minSpan || hRight < minSpan) return false;
    if (area < minArea) return false;
    return true;
}

function boxToQuad(box: Omit<ComponentBox, 'score'>): Quad {
    return [
        { x: box.minX, y: box.minY },
        { x: box.maxX, y: box.minY },
        { x: box.maxX, y: box.maxY },
        { x: box.minX, y: box.maxY },
    ];
}

function expandQuad(quad: Quad, scale: number, width: number, height: number): Quad {
    const cx = (quad[0].x + quad[1].x + quad[2].x + quad[3].x) / 4;
    const cy = (quad[0].y + quad[1].y + quad[2].y + quad[3].y) / 4;
    return quad.map((p) => ({
        x: clamp(cx + (p.x - cx) * scale, 0, width - 1),
        y: clamp(cy + (p.y - cy) * scale, 0, height - 1),
    })) as Quad;
}

function getImageFromFile(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(image);
        };
        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Failed to load image'));
        };
        image.src = objectUrl;
    });
}

async function buildWorkImage(file: File): Promise<WorkImage | null> {
    const image = await getImageFromFile(file);
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    if (!sourceWidth || !sourceHeight) return null;

    const workScale = Math.min(1, MAX_WORK_SIDE / Math.max(sourceWidth, sourceHeight));
    const workWidth = Math.max(1, Math.round(sourceWidth * workScale));
    const workHeight = Math.max(1, Math.round(sourceHeight * workScale));

    const canvas = document.createElement('canvas');
    canvas.width = workWidth;
    canvas.height = workHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    ctx.drawImage(image, 0, 0, workWidth, workHeight);
    return { canvas, ctx, width: workWidth, height: workHeight };
}

function componentScore(box: Omit<ComponentBox, 'score'>, width: number, height: number) {
    const boxW = box.maxX - box.minX + 1;
    const boxH = box.maxY - box.minY + 1;
    const aspect = boxH / Math.max(1, boxW);
    const areaRatio = box.area / (width * height);

    const aspectWeight = aspect >= 1.05 && aspect <= 4.4 ? 1 : aspect >= 0.42 && aspect < 1.05 ? 0.78 : 0.42;
    const centerX = (box.minX + box.maxX) / 2;
    const centerY = (box.minY + box.maxY) / 2;
    const dx = Math.abs(centerX - width / 2) / (width / 2);
    const dy = Math.abs(centerY - height / 2) / (height / 2);
    const centerWeight = clamp(1 - (dx * 0.55 + dy * 0.75), 0.2, 1);
    const edgePenalty = box.touchesEdge ? 0.74 : 1;
    return areaRatio * aspectWeight * centerWeight * edgePenalty;
}

function findReceiptDetection(imageData: ImageData): DetectionResult | null {
    const { data, width, height } = imageData;
    const pixels = width * height;

    const lum = new Float32Array(pixels);
    let lumSum = 0;
    let spreadSum = 0;

    for (let i = 0, px = 0; i < data.length; i += 4, px += 1) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const l = luminance(r, g, b);
        lum[px] = l;
        lumSum += l;
        spreadSum += channelSpread(r, g, b);
    }

    const meanLum = lumSum / pixels;
    const meanSpread = spreadSum / pixels;
    const lumThreshold = clamp(meanLum + 14, 145, 236);
    const spreadThreshold = clamp(meanSpread * 1.2, 18, 62);

    const mask = new Uint8Array(pixels);
    for (let i = 0; i < pixels; i += 1) {
        const idx = i * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const isPaperLike = lum[i] >= lumThreshold && channelSpread(r, g, b) <= spreadThreshold;
        mask[i] = isPaperLike ? 1 : 0;
    }

    const filtered = new Uint8Array(pixels);
    for (let y = 1; y < height - 1; y += 1) {
        for (let x = 1; x < width - 1; x += 1) {
            let count = 0;
            for (let oy = -1; oy <= 1; oy += 1) {
                for (let ox = -1; ox <= 1; ox += 1) {
                    if (mask[(y + oy) * width + (x + ox)] === 1) count += 1;
                }
            }
            filtered[y * width + x] = count >= 5 ? 1 : 0;
        }
    }

    const visited = new Uint8Array(pixels);
    const queue = new Int32Array(pixels);
    const minArea = Math.floor(pixels * MIN_COMPONENT_AREA_RATIO);
    const maxArea = Math.floor(pixels * MAX_COMPONENT_AREA_RATIO);
    let best: DetectionResult | null = null;

    for (let start = 0; start < pixels; start += 1) {
        if (filtered[start] === 0 || visited[start] === 1) continue;

        let head = 0;
        let tail = 0;
        queue[tail++] = start;
        visited[start] = 1;

        let area = 0;
        let minX = width;
        let minY = height;
        let maxX = 0;
        let maxY = 0;
        let touchesEdge = false;

        let minSum = Number.POSITIVE_INFINITY;
        let maxSum = Number.NEGATIVE_INFINITY;
        let minDiff = Number.POSITIVE_INFINITY;
        let maxDiff = Number.NEGATIVE_INFINITY;

        let tl: Point = { x: 0, y: 0 };
        let tr: Point = { x: 0, y: 0 };
        let br: Point = { x: 0, y: 0 };
        let bl: Point = { x: 0, y: 0 };

        while (head < tail) {
            const current = queue[head++];
            const x = current % width;
            const y = (current / width) | 0;

            area += 1;
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
            if (x === 0 || y === 0 || x === width - 1 || y === height - 1) touchesEdge = true;

            const sum = x + y;
            const diff = x - y;
            if (sum < minSum) {
                minSum = sum;
                tl = { x, y };
            }
            if (sum > maxSum) {
                maxSum = sum;
                br = { x, y };
            }
            if (diff > maxDiff) {
                maxDiff = diff;
                tr = { x, y };
            }
            if (diff < minDiff) {
                minDiff = diff;
                bl = { x, y };
            }

            const neighbors = [current - 1, current + 1, current - width, current + width];
            for (let i = 0; i < neighbors.length; i += 1) {
                const next = neighbors[i];
                if (next < 0 || next >= pixels) continue;
                if (visited[next] === 1 || filtered[next] === 0) continue;

                const nx = next % width;
                const ny = (next / width) | 0;
                if (Math.abs(nx - x) + Math.abs(ny - y) !== 1) continue;

                visited[next] = 1;
                queue[tail++] = next;
            }
        }

        if (area < minArea || area > maxArea) continue;

        const boxWithoutScore = { minX, minY, maxX, maxY, area, touchesEdge };
        const score = componentScore(boxWithoutScore, width, height);
        const box: ComponentBox = { ...boxWithoutScore, score };
        const rawQuad: Quad = [tl, tr, br, bl];
        const corners = isValidQuad(rawQuad, width, height) ? rawQuad : boxToQuad(box);

        if (!best || score > best.box.score) {
            best = { box, corners };
        }
    }

    return best;
}

function solveLinearSystem(a: number[][], b: number[]) {
    const n = a.length;
    const mat = a.map((row, i) => [...row, b[i]]);

    for (let col = 0; col < n; col += 1) {
        let pivot = col;
        for (let row = col + 1; row < n; row += 1) {
            if (Math.abs(mat[row][col]) > Math.abs(mat[pivot][col])) {
                pivot = row;
            }
        }

        if (Math.abs(mat[pivot][col]) < 1e-10) return null;

        if (pivot !== col) {
            const tmp = mat[col];
            mat[col] = mat[pivot];
            mat[pivot] = tmp;
        }

        const pivotVal = mat[col][col];
        for (let j = col; j <= n; j += 1) {
            mat[col][j] /= pivotVal;
        }

        for (let row = 0; row < n; row += 1) {
            if (row === col) continue;
            const factor = mat[row][col];
            if (factor === 0) continue;
            for (let j = col; j <= n; j += 1) {
                mat[row][j] -= factor * mat[col][j];
            }
        }
    }

    return mat.map((row) => row[n]);
}

function computeProjectiveTransform(from: Quad, to: Quad) {
    const a: number[][] = [];
    const b: number[] = [];

    for (let i = 0; i < 4; i += 1) {
        const x = from[i].x;
        const y = from[i].y;
        const u = to[i].x;
        const v = to[i].y;

        a.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
        b.push(u);
        a.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
        b.push(v);
    }

    const solved = solveLinearSystem(a, b);
    if (!solved) return null;

    return {
        h11: solved[0],
        h12: solved[1],
        h13: solved[2],
        h21: solved[3],
        h22: solved[4],
        h23: solved[5],
        h31: solved[6],
        h32: solved[7],
    };
}

function warpPerspective(source: ImageData, srcQuad: Quad, outputWidth: number, outputHeight: number) {
    const dstQuad: Quad = [
        { x: 0, y: 0 },
        { x: outputWidth - 1, y: 0 },
        { x: outputWidth - 1, y: outputHeight - 1 },
        { x: 0, y: outputHeight - 1 },
    ];

    const transform = computeProjectiveTransform(dstQuad, srcQuad);
    if (!transform) return null;

    const sw = source.width;
    const sh = source.height;
    const src = source.data;
    const out = new Uint8ClampedArray(outputWidth * outputHeight * 4);

    for (let y = 0; y < outputHeight; y += 1) {
        for (let x = 0; x < outputWidth; x += 1) {
            const den = transform.h31 * x + transform.h32 * y + 1;
            if (Math.abs(den) < 1e-8) continue;

            const sx = (transform.h11 * x + transform.h12 * y + transform.h13) / den;
            const sy = (transform.h21 * x + transform.h22 * y + transform.h23) / den;

            const outIdx = (y * outputWidth + x) * 4;
            if (sx < 0 || sy < 0 || sx >= sw - 1 || sy >= sh - 1) {
                out[outIdx] = 255;
                out[outIdx + 1] = 255;
                out[outIdx + 2] = 255;
                out[outIdx + 3] = 255;
                continue;
            }

            const x0 = Math.floor(sx);
            const y0 = Math.floor(sy);
            const x1 = Math.min(x0 + 1, sw - 1);
            const y1 = Math.min(y0 + 1, sh - 1);
            const dx = sx - x0;
            const dy = sy - y0;

            const i00 = (y0 * sw + x0) * 4;
            const i10 = (y0 * sw + x1) * 4;
            const i01 = (y1 * sw + x0) * 4;
            const i11 = (y1 * sw + x1) * 4;

            for (let c = 0; c < 3; c += 1) {
                const v00 = src[i00 + c];
                const v10 = src[i10 + c];
                const v01 = src[i01 + c];
                const v11 = src[i11 + c];
                const top = v00 + (v10 - v00) * dx;
                const bottom = v01 + (v11 - v01) * dx;
                out[outIdx + c] = Math.round(top + (bottom - top) * dy);
            }

            out[outIdx + 3] = 255;
        }
    }

    return new ImageData(out, outputWidth, outputHeight);
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string) {
    return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('Failed to encode image'));
                return;
            }
            resolve(blob);
        }, type, 0.92);
    });
}

function quadToNormalized(quad: Quad, width: number, height: number): NormalizedQuad {
    return quad.map((p) => ({
        x: clamp(p.x / Math.max(width, 1), 0, 1),
        y: clamp(p.y / Math.max(height, 1), 0, 1),
    })) as NormalizedQuad;
}

function normalizedToQuad(normalized: NormalizedQuad, width: number, height: number): Quad {
    return normalized.map((p) => ({
        x: clamp(p.x, 0, 1) * (width - 1),
        y: clamp(p.y, 0, 1) * (height - 1),
    })) as Quad;
}

function buildFileFromCanvas(canvas: HTMLCanvasElement, sourceFile: File): Promise<File> {
    const outType = sourceFile.type === 'image/png' ? 'image/png' : 'image/jpeg';
    return canvasToBlob(canvas, outType).then((blob) => {
        const ext = outType === 'image/png' ? '.png' : '.jpg';
        const baseName = sourceFile.name.replace(/\.[^.]+$/, '');
        return new File([blob], `${baseName}-scan${ext}`, {
            type: outType,
            lastModified: Date.now(),
        });
    });
}

export async function detectReceiptCorners(file: File): Promise<NormalizedQuad | null> {
    if (!file.type.startsWith('image/')) return null;
    const work = await buildWorkImage(file);
    if (!work) return null;

    const analysisScale = Math.min(1, MAX_ANALYSIS_SIDE / Math.max(work.width, work.height));
    const analysisWidth = Math.max(1, Math.round(work.width * analysisScale));
    const analysisHeight = Math.max(1, Math.round(work.height * analysisScale));

    const analysisCanvas = document.createElement('canvas');
    analysisCanvas.width = analysisWidth;
    analysisCanvas.height = analysisHeight;
    const analysisCtx = analysisCanvas.getContext('2d', { willReadFrequently: true });
    if (!analysisCtx) return null;

    analysisCtx.drawImage(work.canvas, 0, 0, analysisWidth, analysisHeight);
    const analysisData = analysisCtx.getImageData(0, 0, analysisWidth, analysisHeight);
    const detection = findReceiptDetection(analysisData);
    if (!detection) return null;

    const ratioX = work.width / analysisWidth;
    const ratioY = work.height / analysisHeight;
    const workQuad = detection.corners.map((p) => ({
        x: p.x * ratioX,
        y: p.y * ratioY,
    })) as Quad;

    const expanded = expandQuad(workQuad, 1.03, work.width, work.height);
    return quadToNormalized(expanded, work.width, work.height);
}

export async function flattenReceiptFromCorners(
    file: File,
    normalizedCorners: NormalizedQuad
): Promise<File | null> {
    if (!file.type.startsWith('image/')) return null;
    const work = await buildWorkImage(file);
    if (!work) return null;

    const normalizedOrdered = normalizeQuadFromAnyPoints(normalizedCorners);
    let srcQuad = normalizedToQuad(
        normalizedOrdered.map((p) => ({
            x: clamp(p.x, 0, 1),
            y: clamp(p.y, 0, 1),
        })) as NormalizedQuad,
        work.width,
        work.height
    );

    if (!isValidQuad(srcQuad, work.width, work.height)) {
        return null;
    }

    srcQuad = expandQuad(srcQuad, 1.01, work.width, work.height);

    const topWidth = distance(srcQuad[0], srcQuad[1]);
    const bottomWidth = distance(srcQuad[3], srcQuad[2]);
    const leftHeight = distance(srcQuad[0], srcQuad[3]);
    const rightHeight = distance(srcQuad[1], srcQuad[2]);

    let outputWidth = Math.round(Math.max(topWidth, bottomWidth));
    let outputHeight = Math.round(Math.max(leftHeight, rightHeight));

    if (outputWidth < MIN_OUTPUT_SIDE || outputHeight < MIN_OUTPUT_SIDE) {
        return null;
    }

    if (outputWidth > MAX_OUTPUT_SIDE || outputHeight > MAX_OUTPUT_SIDE) {
        const scale = Math.min(MAX_OUTPUT_SIDE / outputWidth, MAX_OUTPUT_SIDE / outputHeight);
        outputWidth = Math.max(1, Math.round(outputWidth * scale));
        outputHeight = Math.max(1, Math.round(outputHeight * scale));
    }

    const sourceData = work.ctx.getImageData(0, 0, work.width, work.height);
    const warped = warpPerspective(sourceData, srcQuad, outputWidth, outputHeight);
    const outputCanvas = document.createElement('canvas');

    if (warped) {
        outputCanvas.width = warped.width;
        outputCanvas.height = warped.height;
        const outCtx = outputCanvas.getContext('2d');
        if (!outCtx) return null;
        outCtx.putImageData(warped, 0, 0);
    } else {
        const minX = Math.floor(Math.min(srcQuad[0].x, srcQuad[1].x, srcQuad[2].x, srcQuad[3].x));
        const minY = Math.floor(Math.min(srcQuad[0].y, srcQuad[1].y, srcQuad[2].y, srcQuad[3].y));
        const maxX = Math.ceil(Math.max(srcQuad[0].x, srcQuad[1].x, srcQuad[2].x, srcQuad[3].x));
        const maxY = Math.ceil(Math.max(srcQuad[0].y, srcQuad[1].y, srcQuad[2].y, srcQuad[3].y));

        const cropX = clamp(minX, 0, work.width - 1);
        const cropY = clamp(minY, 0, work.height - 1);
        const cropW = clamp(maxX - cropX, 1, work.width - cropX);
        const cropH = clamp(maxY - cropY, 1, work.height - cropY);
        if (cropW < MIN_OUTPUT_SIDE || cropH < MIN_OUTPUT_SIDE) return null;

        outputCanvas.width = cropW;
        outputCanvas.height = cropH;
        const outCtx = outputCanvas.getContext('2d');
        if (!outCtx) return null;
        outCtx.drawImage(work.canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    }

    return buildFileFromCanvas(outputCanvas, file);
}

export async function autoCropReceiptFile(file: File): Promise<CropResult> {
    if (!file.type.startsWith('image/')) {
        return { file, didCrop: false };
    }

    const corners = await detectReceiptCorners(file);
    if (!corners) {
        return { file, didCrop: false };
    }

    const flattened = await flattenReceiptFromCorners(file, corners);
    if (!flattened) {
        return { file, didCrop: false };
    }

    return { file: flattened, didCrop: true };
}
