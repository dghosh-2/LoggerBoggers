import { NextResponse } from 'next/server';
import { FAST_PROMPT, ITEM_BBOX_PROMPT, OCR_SYSTEM_PROMPT, TEXT_ONLY_PROMPT } from '@/lib/receiptOcrPrompts';
import { getServiceSupabase } from '@/lib/serverSupabase';
import { getEnvFallback } from '@/lib/envFallback';

export const runtime = 'nodejs';

function toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const cleaned = value.replace(/[^0-9.-]/g, '');
        const num = Number.parseFloat(cleaned);
        return Number.isFinite(num) ? num : null;
    }
    return null;
}

function roundMoney(value: number) {
    return Number(value.toFixed(2));
}

function normalizeMatchText(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeOcrishMatchText(value: string) {
    // Heuristic: correct common OCR digit/letter confusions for matching only.
    return normalizeMatchText(value)
        .replace(/\b0\b/g, 'o')
        .replace(/0/g, 'o')
        .replace(/1/g, 'i')
        .replace(/3/g, 'e')
        .replace(/5/g, 's')
        .replace(/7/g, 't')
        .replace(/8/g, 'b')
        .replace(/9/g, 'g');
}

function scoreLineForItem(lineText: string, itemName: string, itemPrice: number | null) {
    const line = normalizeOcrishMatchText(lineText);
    const item = normalizeMatchText(itemName);
    if (!line || !item) return 0;

    let score = 0;
    if (line.includes(item)) score += 6;

    const itemTokens = item.split(' ').filter(Boolean);
    const lineTokens = new Set(line.split(' ').filter(Boolean));
    const overlap = itemTokens.filter((t) => lineTokens.has(t)).length;
    if (itemTokens.length) score += (overlap / itemTokens.length) * 4;

    if (itemPrice !== null) {
        const p2 = itemPrice.toFixed(2);
        const p1 = itemPrice.toFixed(1);
        const p0 = Math.round(itemPrice).toString();
        if (line.includes(p2) || line.includes(p1) || line.includes(p0)) score += 3;
    }

    return score;
}

function looksLikeSizeTokenAfterLeadingNumber(rest: string) {
    const r = rest.trim().toLowerCase();
    if (r.startsWith('%')) return true; // e.g. "2 % milk" => not qty
    return /^(pc|pcs|ct|count|oz|fl\s?oz|lb|lbs|g|kg|mg|ml|l|liter|litre|pack|pk|dozen|dz|rolls?|rl|roll|bottle|btl|cans?|can|gal|qt|pt|pt\.|qt\.|gal\.)\b/.test(r);
}

function inferQtyFromLine(lineText: string) {
    const line = lineText.trim();
    const match = line.match(/^(\d{1,3})\s*(?:x|X)?\s+(.+)$/);
    if (!match) return null;
    const qty = Number.parseInt(match[1], 10);
    const rest = match[2].trim();
    if (!Number.isFinite(qty) || qty <= 0) return null;
    if (looksLikeSizeTokenAfterLeadingNumber(rest)) return null;
    return qty;
}

function approxMoneyEqual(a: number, b: number, tolerance = 0.03) {
    return Math.abs(a - b) <= tolerance;
}

type QtyInference = {
    qty: number;
    unit: number | null;
    confidence: 'high' | 'medium' | 'low';
};

function inferQtyUnitFromLineDetail(lineText: string, itemPrice: number): QtyInference | null {
    const line = lineText.trim();
    if (!line) return null;

    // "2 Item Name 4.00 8.00"
    {
        const m = line.match(
            /^(\d{1,3})\s*(?:x|X)?\s+(.+?)\s+(-?\$?\s*\d+(?:,\d{3})*(?:\.\d{1,2}))\s+(-?\$?\s*\d+(?:,\d{3})*(?:\.\d{1,2}))\s*$/,
        );
        if (m) {
            const qty = Number.parseInt(m[1], 10);
            const rest = m[2].trim();
            const unit = toNumber(m[3]);
            const total = toNumber(m[4]);
            if (Number.isFinite(qty) && qty > 0 && unit && unit > 0 && total && total > 0) {
                if (!looksLikeSizeTokenAfterLeadingNumber(rest)) {
                    if (approxMoneyEqual(total, itemPrice, 0.06) && approxMoneyEqual(qty * unit, total, 0.08)) {
                        return { qty, unit: roundMoney(unit), confidence: 'high' };
                    }
                }
            }
        }
    }

    // "... 2 @ 4.00 ..." or "... 2 x 4.00 ..."
    {
        const m = line.match(/\b(\d{1,3})\s*(?:@|x|X)\s*(-?\$?\s*\d+(?:,\d{3})*(?:\.\d{1,2}))\b/);
        if (m) {
            const qty = Number.parseInt(m[1], 10);
            const unit = toNumber(m[2]);
            if (Number.isFinite(qty) && qty > 0 && unit && unit > 0) {
                const total = roundMoney(qty * unit);
                if (approxMoneyEqual(total, itemPrice, 0.08)) {
                    return { qty, unit: roundMoney(unit), confidence: 'high' };
                }
            }
        }
    }

    const qty = inferQtyFromLine(line);
    if (!qty) return null;
    return { qty, unit: qty > 0 ? roundMoney(itemPrice / qty) : null, confidence: 'medium' };
}

function normalizeOcrLines(raw: string) {
    return raw
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => l.replace(/^[-*]\s+/, '').trim());
}

function inferAddressFromRawText(rawText: string, merchantName: string | null) {
    const rawLines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const merchantLower = (merchantName || '').toLowerCase();

    // Prefer lines that look like "123 Main St" + optional "City ST 12345".
    const streetLike = (line: string) => {
        const hasNumber = /\d/.test(line);
        const hasStreetToken = /\b(st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|way|hwy|highway|pl|place|ct|court|suite|ste|unit)\b/i.test(line);
        const looksLikePoBox = /\bp\.?\s*o\.?\s*box\b/i.test(line);
        return (hasNumber && hasStreetToken) || looksLikePoBox;
    };
    const cityStateZipLike = (line: string) =>
        /\b[A-Z]{2}\b.*\b\d{5}(?:-\d{4})?\b/.test(line) || /\b\d{5}(?:-\d{4})?\b/.test(line);

    const cleaned = rawLines
        .map((line) => line.replace(/^#+\s+/, '').trim())
        .filter((line) => {
            const lower = line.toLowerCase();
            if (!line) return false;
            if (merchantLower && (lower === merchantLower || lower.includes(merchantLower))) return false;
            if (/(tel|phone|fax|www\.|http|receipt|invoice|order|subtotal|total|tax|cashier|server|date)/i.test(line)) return false;
            if (/\b(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}\b/.test(line)) return false;
            if (/^[-_=*#.\s]{6,}$/.test(line) || /-{6,}/.test(line)) return false;
            return true;
        });

    const start = cleaned.findIndex(streetLike);
    if (start < 0) return null;

    const addr: string[] = [];
    for (let i = start; i < cleaned.length && addr.length < 3; i += 1) {
        const line = cleaned[i];
        if (!line) continue;
        addr.push(line.replace(/[,;]+$/g, '').trim());
        if (cityStateZipLike(line)) break;
    }

    if (!addr.length) return null;
    const first = addr[0];
    const rest = addr.slice(1).join(', ');
    return rest ? `${first}, ${rest}` : first;
}

function postProcessQuantities(extracted: any, fallbackRawText: string | null) {
    const rawText = (typeof extracted?.raw_text === 'string' ? extracted.raw_text : null) ?? fallbackRawText;
    if (!rawText) return extracted;

    const lines = normalizeOcrLines(rawText);
    const items = Array.isArray(extracted?.items) ? extracted.items : [];

    const normalizedItems = items.map((item: any) => {
        const name = typeof item?.name === 'string' ? item.name : null;
        const price = toNumber(item?.price);
        if (!name || !price || price <= 0) return item;

        const modelQty = toNumber(item?.quantity);
        const qtyAlready = modelQty !== null && Number.isFinite(modelQty) && modelQty > 0 ? Math.round(modelQty) : null;
        const modelUnit = toNumber(item?.unit_price);
        const unitAlready = modelUnit !== null && Number.isFinite(modelUnit) && modelUnit > 0 ? roundMoney(modelUnit) : null;

        if (qtyAlready !== null && (qtyAlready > 1 || unitAlready !== null)) {
            return { ...item, quantity: qtyAlready, unit_price: unitAlready };
        }

        const best = lines
            .map((line) => ({ line, score: scoreLineForItem(line, name, price) }))
            .sort((a, b) => b.score - a.score)[0];

        if (!best || best.score < 2.5) return { ...item, quantity: qtyAlready, unit_price: unitAlready };

        const inferred = inferQtyUnitFromLineDetail(best.line, price);
        if (!inferred) return { ...item, quantity: qtyAlready, unit_price: unitAlready };

        return { ...item, quantity: inferred.qty, unit_price: inferred.unit };
    });

    return {
        ...extracted,
        raw_text: typeof extracted?.raw_text === 'string' ? extracted.raw_text : rawText,
        items: normalizedItems,
    };
}

type OcrLine = {
    text: string;
    // Normalized [0..1] bbox in full-image coordinates.
    bbox: [number, number, number, number] | null;
};

function parseMoneyCandidates(lineText: string) {
    // Important: avoid treating plain integers like "19 22" as money candidates. That caused price-only
    // matching to snap to header/store-id-ish lines (e.g. matching 18.98 to "19" with a loose tolerance).
    //
    // Prefer amounts that look like currency: have a decimal part or an explicit `$` with decimals.
    const matches = lineText.match(/-?\$?\s*\d+(?:,\d{3})*(?:\.\d{1,2})/g) ?? [];
    const out: number[] = [];
    for (const m of matches) {
        const n = toNumber(m);
        if (n === null) continue;
        // Filter out obvious non-money numeric tokens (phone numbers, store ids).
        if (n <= 0 || n >= 500) continue;
        out.push(n);
    }
    return out;
}

function scoreLineForItemNameOnly(lineText: string, itemName: string) {
    const line = normalizeOcrishMatchText(lineText);
    const item = normalizeMatchText(itemName);
    if (!line || !item) return 0;

    let score = 0;
    if (line.includes(item)) score += 6;

    const itemTokens = item.split(' ').filter(Boolean);
    const lineTokens = new Set(line.split(' ').filter(Boolean));
    const overlap = itemTokens.filter((t) => lineTokens.has(t)).length;
    if (itemTokens.length) score += (overlap / itemTokens.length) * 4;

    return score;
}

function attachItemBboxesFromOcrLines(extracted: any, ocrLines: OcrLine[]) {
    if (!extracted || !Array.isArray(extracted?.items) || !ocrLines.length) return extracted;

    const lines = ocrLines
        .map((l) => {
            const bbox = l.bbox && isValidNormalizedBbox(l.bbox) ? l.bbox : null;
            const y = bbox ? (bbox[1] + bbox[3]) / 2 : null;
            const x = bbox ? (bbox[0] + bbox[2]) / 2 : null;
            return {
                text: l.text,
                bbox,
                y,
                x,
                money: parseMoneyCandidates(l.text),
            };
        })
        .filter((l) => typeof l.text === 'string' && l.text.trim().length && l.bbox && l.y !== null && l.x !== null)
        .sort((a, b) => (a.y! - b.y!) || (a.x! - b.x!));

    const unionBbox = (
        a: [number, number, number, number],
        b: [number, number, number, number],
    ): [number, number, number, number] => ([
        Math.min(a[0], b[0]),
        Math.min(a[1], b[1]),
        Math.max(a[2], b[2]),
        Math.max(a[3], b[3]),
    ]);

    const hasPriceMatch = (lineMoney: number[], price: number, tolerance: number) => (
        lineMoney.some((m) => approxMoneyEqual(m, price, tolerance))
    );

    // Greedy monotonic matching by Y to avoid jumping to random lines when names/prices are ambiguous.
    const used = new Set<number>();
    let prevY = -Infinity;

    const nextItems = extracted.items.map((item: any, itemIndex: number) => {
        const name = typeof item?.name === 'string' ? item.name : '';
        const price = toNumber(item?.price);
        if (!name || !price || price <= 0) return item;

        const expectedY = (itemIndex + 1) / (extracted.items.length + 1);

        const findBest = (requirePriceMatch: boolean) => {
            let bestScore = -Infinity;
            let bestLineIndex = -1;
            let bestBbox: [number, number, number, number] | null = null;
            let bestMatchedText: string | null = null;
            let bestUsedNeighbor: number | null = null;

            for (let i = 0; i < lines.length; i += 1) {
                if (used.has(i)) continue;
                const line = lines[i];
                if (line.y === null) continue;
                if (line.y < prevY - 0.012) continue;

                const directPriceMatch = hasPriceMatch(line.money, price, 0.05);
                let neighborIndex: number | null = null;
                let neighborText: string | null = null;
                let bboxForThis: [number, number, number, number] | null = line.bbox;
                let combinedPriceMatch = directPriceMatch;

                if (!directPriceMatch && requirePriceMatch) {
                    const candidates = [i - 1, i + 1];
                    for (const j of candidates) {
                        if (j < 0 || j >= lines.length) continue;
                        if (used.has(j)) continue;
                        const other = lines[j];
                        if (other.y === null || !other.bbox) continue;
                        // If OCR split a row into two lines (name and price), allow stitching them together.
                        if (Math.abs(other.y - line.y) > 0.02) continue;
                        if (!hasPriceMatch(other.money, price, 0.03)) continue;
                        neighborIndex = j;
                        neighborText = other.text;
                        bboxForThis = unionBbox(line.bbox!, other.bbox);
                        combinedPriceMatch = true;
                        break;
                    }
                }

                if (requirePriceMatch && !combinedPriceMatch) continue;

                const nameScore = scoreLineForItemNameOnly(line.text, name);
                if (nameScore < 1.4) continue;

                const yPenalty = Math.min(1, Math.abs(line.y - expectedY)) * 1.2;
                const score = nameScore + (combinedPriceMatch ? 6 : 0) - yPenalty;

                if (score > bestScore) {
                    bestScore = score;
                    bestLineIndex = i;
                    bestBbox = bboxForThis;
                    bestMatchedText = neighborText ? `${line.text} | ${neighborText}` : line.text;
                    bestUsedNeighbor = neighborIndex;
                }
            }

            return { bestScore, bestLineIndex, bestBbox, bestMatchedText, bestUsedNeighbor };
        };

        const findBestByPriceOnly = () => {
            let bestLineIndex = -1;
            let bestYDist = Infinity;
            for (let i = 0; i < lines.length; i += 1) {
                if (used.has(i)) continue;
                const line = lines[i];
                if (line.y === null) continue;
                if (line.y < prevY - 0.012) continue;
                // Price-only is risky; keep it strict and only allow currency-ish numbers (we parse only decimals).
                const ok = hasPriceMatch(line.money, price, 0.02);
                if (!ok) continue;
                const yDist = Math.abs(line.y - expectedY);
                if (yDist < bestYDist) {
                    bestYDist = yDist;
                    bestLineIndex = i;
                }
            }
            return { bestLineIndex, bestYDist };
        };

        // First try: require a price match to avoid snapping to headers/metadata.
        let { bestScore, bestLineIndex, bestBbox, bestMatchedText, bestUsedNeighbor } = findBest(true);
        let matchMode: 'name+price' | 'name-only' | 'price-only' = 'name+price';

        // If we couldn't find a name+price match (common when OCR misspells short item names),
        // fall back to the unique price line.
        if (bestLineIndex === -1) {
            const priceOnly = findBestByPriceOnly();
            if (priceOnly.bestLineIndex !== -1) {
                bestLineIndex = priceOnly.bestLineIndex;
                bestScore = 6 - Math.min(1, priceOnly.bestYDist) * 1.2;
                matchMode = 'price-only';
                bestBbox = lines[bestLineIndex]?.bbox ?? null;
                bestMatchedText = lines[bestLineIndex]?.text ?? null;
                bestUsedNeighbor = null;
            }
        }

        // Fallback: allow no price match only if name match is extremely strong.
        if (bestLineIndex === -1) {
            const fallback = findBest(false);
            bestScore = fallback.bestScore;
            bestLineIndex = fallback.bestLineIndex;
            bestBbox = fallback.bestBbox;
            bestMatchedText = fallback.bestMatchedText;
            bestUsedNeighbor = fallback.bestUsedNeighbor;
            matchMode = 'name-only';
        }

        if (bestLineIndex === -1 || bestScore < 2.5) return item;

        const picked = lines[bestLineIndex];
        const pickedBbox = bestBbox ?? picked?.bbox ?? null;
        if (!pickedBbox) return item;
        used.add(bestLineIndex);
        if (typeof bestUsedNeighbor === 'number' && bestUsedNeighbor >= 0) used.add(bestUsedNeighbor);
        prevY = picked.y ?? prevY;

        return {
            ...item,
            bbox: pickedBbox,
            bbox_confidence: 0.92,
            bbox_source: 'google_vision',
            bbox_debug: {
                matched_line: bestMatchedText ?? picked.text,
                score: Number(bestScore.toFixed(3)),
                mode: matchMode,
            },
        };
    });

    return { ...extracted, items: nextItems };
}

function extractFirstJsonObject(input: string): string | null {
    const start = input.indexOf('{');
    if (start < 0) return null;

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = start; i < input.length; i += 1) {
        const ch = input[i];

        if (inString) {
            if (escaped) {
                escaped = false;
                continue;
            }
            if (ch === '\\\\') {
                escaped = true;
                continue;
            }
            if (ch === '"') inString = false;
            continue;
        }

        if (ch === '"') {
            inString = true;
            continue;
        }

        if (ch === '{') depth += 1;
        if (ch === '}') depth -= 1;
        if (depth === 0) return input.slice(start, i + 1);
    }

    return null;
}

function parseJsonPayload(rawText: string) {
    const text = rawText.trim();
    if (!text) throw new Error('Model response was empty');
    try {
        return JSON.parse(text);
    } catch {
        const first = extractFirstJsonObject(text);
        if (!first) throw new Error('Model response did not contain valid JSON');
        return JSON.parse(first);
    }
}

function extractChatMessageText(chatRaw: any): string {
    const msg = chatRaw?.choices?.[0]?.message;
    const content = msg?.content;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
        return content
            .map((part: any) => {
                if (typeof part === 'string') return part;
                if (typeof part?.text === 'string') return part.text;
                if (typeof part?.content === 'string') return part.content;
                return '';
            })
            .filter((s) => s && s.trim())
            .join('\n');
    }
    if (content && typeof content === 'object') {
        if (typeof (content as any).text === 'string') return (content as any).text;
    }

    // Some providers return structured output via tool/function calls with empty `content`.
    const toolArgs = msg?.tool_calls?.[0]?.function?.arguments;
    if (typeof toolArgs === 'string' && toolArgs.trim()) return toolArgs;
    const functionArgs = msg?.function_call?.arguments;
    if (typeof functionArgs === 'string' && functionArgs.trim()) return functionArgs;

    return '';
}

async function buildDedalusHeaders(apiKey: string) {
    const authHeaderMode = ((await getEnvFallback('DEDALUS_AUTH_HEADER')) || 'bearer').toLowerCase(); // bearer | x-api-key
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authHeaderMode === 'x-api-key') {
        headers['x-api-key'] = apiKey;
    } else {
        headers.Authorization = `Bearer ${apiKey}`;
    }
    return headers;
}

async function callDedalusOcr(apiUrl: string, apiKey: string, imageUrl: string) {
    const response = await fetch(`${apiUrl}/v1/ocr`, {
        method: 'POST',
        headers: await buildDedalusHeaders(apiKey),
        body: JSON.stringify({
            model: 'mistral-ocr-latest',
            document: {
                type: 'document_url',
                document_url: imageUrl,
            },
        }),
    });

    const data = await response.json();
    if (!response.ok) {
        const msg = data?.error?.message ?? `Dedalus OCR failed with status ${response.status}`;
        throw new Error(msg);
    }

    const pages: Array<{ index?: number; markdown?: string }> = Array.isArray(data?.pages) ? data.pages : [];
    const markdown = pages
        .map((p) => (typeof p?.markdown === 'string' ? p.markdown : ''))
        .filter(Boolean)
        .join('\n\n');

    if (!markdown.trim()) throw new Error('Dedalus OCR returned empty text');
    return { markdown, raw: data };
}

async function callGoogleVisionOcr(apiKey: string, imageUrl: string) {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error(`Failed to fetch image for Google Vision OCR (${imgRes.status})`);
    const bytes = Buffer.from(await imgRes.arrayBuffer());
    const base64 = bytes.toString('base64');

    const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            requests: [
                {
                    image: { content: base64 },
                    features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
                },
            ],
        }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const msg = data?.error?.message ?? `Google Vision OCR failed with status ${res.status}`;
        throw new Error(msg);
    }

    const full = data?.responses?.[0]?.fullTextAnnotation ?? null;
    const text = typeof full?.text === 'string' ? full.text : '';

    const pages = Array.isArray(full?.pages) ? full.pages : [];
    const page0 = pages[0] ?? null;
    const pageW = Number(page0?.width ?? 0);
    const pageH = Number(page0?.height ?? 0);

    const lines: OcrLine[] = [];
    if (page0 && pageW > 0 && pageH > 0) {
        const blocks = Array.isArray(page0.blocks) ? page0.blocks : [];
        let curText = '';
        let curBox: { x0: number; y0: number; x1: number; y1: number } | null = null;

        const addWordBox = (wordBox: any) => {
            const vertices = Array.isArray(wordBox?.vertices) ? wordBox.vertices : [];
            const xs = vertices.map((v: any) => Number(v?.x ?? 0)).filter((n: number) => Number.isFinite(n));
            const ys = vertices.map((v: any) => Number(v?.y ?? 0)).filter((n: number) => Number.isFinite(n));
            if (!xs.length || !ys.length) return;
            const x0 = Math.max(0, Math.min(...xs));
            const y0 = Math.max(0, Math.min(...ys));
            const x1 = Math.min(pageW, Math.max(...xs));
            const y1 = Math.min(pageH, Math.max(...ys));
            if (!curBox) curBox = { x0, y0, x1, y1 };
            else {
                curBox.x0 = Math.min(curBox.x0, x0);
                curBox.y0 = Math.min(curBox.y0, y0);
                curBox.x1 = Math.max(curBox.x1, x1);
                curBox.y1 = Math.max(curBox.y1, y1);
            }
        };

        const flushLine = () => {
            const t = curText.trim();
            if (!t) {
                curText = '';
                curBox = null;
                return;
            }
            let bbox: [number, number, number, number] | null = null;
            if (curBox && curBox.x1 > curBox.x0 && curBox.y1 > curBox.y0) {
                bbox = [
                    curBox.x0 / pageW,
                    curBox.y0 / pageH,
                    curBox.x1 / pageW,
                    curBox.y1 / pageH,
                ].map((n) => Number(Number(n).toFixed(6))) as [number, number, number, number];
            }
            lines.push({ text: t, bbox: bbox && isValidNormalizedBbox(bbox) ? bbox : null });
            curText = '';
            curBox = null;
        };

        for (const block of blocks) {
            const paras = Array.isArray(block?.paragraphs) ? block.paragraphs : [];
            for (const para of paras) {
                const words = Array.isArray(para?.words) ? para.words : [];
                for (const word of words) {
                    const syms = Array.isArray(word?.symbols) ? word.symbols : [];
                    let wordText = '';
                    let endsLine = false;
                    for (const sym of syms) {
                        const ch = sym?.text;
                        if (typeof ch === 'string') wordText += ch;
                        const br = sym?.property?.detectedBreak?.type ?? null;
                        if (br === 'EOL_SURE_SPACE' || br === 'LINE_BREAK') endsLine = true;
                    }
                    if (!wordText) continue;
                    if (curText) curText += ' ';
                    curText += wordText;
                    addWordBox(word?.boundingBox);
                    if (endsLine) flushLine();
                }
                flushLine();
            }
            flushLine();
        }
    }

    // Fallback/alternative: build line boxes from `textAnnotations` tokens (often better at aligning columns,
    // and helps when the fullTextAnnotation break structure drops a row).
    const textAnnotations = Array.isArray(data?.responses?.[0]?.textAnnotations)
        ? data.responses[0].textAnnotations
        : [];
    if (textAnnotations.length > 1) {
        type Token = { text: string; x0: number; y0: number; x1: number; y1: number; cx: number; cy: number };
        const tokens: Token[] = [];

        let width = pageW;
        let height = pageH;

        // If page dims are missing, infer from token vertices.
        if (!(width > 0 && height > 0)) {
            let maxX = 0;
            let maxY = 0;
            for (const ann of textAnnotations.slice(1)) {
                const vertices = Array.isArray(ann?.boundingPoly?.vertices) ? ann.boundingPoly.vertices : [];
                for (const v of vertices) {
                    const x = Number(v?.x ?? 0);
                    const y = Number(v?.y ?? 0);
                    if (Number.isFinite(x)) maxX = Math.max(maxX, x);
                    if (Number.isFinite(y)) maxY = Math.max(maxY, y);
                }
            }
            width = maxX || 0;
            height = maxY || 0;
        }

        if (width > 0 && height > 0) {
            for (const ann of textAnnotations.slice(1)) {
                const t = typeof ann?.description === 'string' ? ann.description.trim() : '';
                if (!t) continue;
                const vertices = Array.isArray(ann?.boundingPoly?.vertices) ? ann.boundingPoly.vertices : [];
                const xs = vertices.map((v: any) => Number(v?.x ?? 0)).filter((n: number) => Number.isFinite(n));
                const ys = vertices.map((v: any) => Number(v?.y ?? 0)).filter((n: number) => Number.isFinite(n));
                if (!xs.length || !ys.length) continue;
                const x0 = Math.max(0, Math.min(...xs));
                const y0 = Math.max(0, Math.min(...ys));
                const x1 = Math.min(width, Math.max(...xs));
                const y1 = Math.min(height, Math.max(...ys));
                if (!(x1 > x0 && y1 > y0)) continue;
                tokens.push({ text: t, x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 });
            }
        }

	        if (tokens.length) {
	            tokens.sort((a, b) => (a.cy - b.cy) || (a.cx - b.cx));

	            // Estimate typical glyph height so grouping tolerances match the receipt's font size.
	            const tokenHeights = tokens
	                .map((t) => t.y1 - t.y0)
	                .filter((h) => Number.isFinite(h) && h > 0)
	                .sort((a, b) => a - b);
	            const medianH = tokenHeights.length
	                ? tokenHeights[Math.floor(tokenHeights.length / 2)]
	                : Math.max(8, height * 0.012);

	            // Drop unusually tall tokens (often diagonal watermark/artifacts) that blow up bboxes.
	            const maxTokenH = Math.max(medianH * 3.2, height * 0.06);
	            const filteredTokens = tokens.filter((t) => (t.y1 - t.y0) <= maxTokenH);

	            // Cluster into row groups by vertical center. Keep this tight to avoid collapsing
	            // multiple receipt rows into one group; we'll post-merge split columns afterwards.
	            const yTol = Math.max(4, Math.min(18, medianH * 0.85));
	            type LineGroup = { cy: number; y0: number; y1: number; tokens: Token[] };
	            const lineGroups: LineGroup[] = [];

	            for (const tok of filteredTokens) {
	                let bestIdx = -1;
	                let bestDy = Infinity;
	                for (let i = 0; i < lineGroups.length; i += 1) {
	                    const dy = Math.abs(tok.cy - lineGroups[i].cy);
	                    if (dy < bestDy) {
	                        bestDy = dy;
	                        bestIdx = i;
	                    }
	                }
	                if (bestIdx !== -1 && bestDy <= yTol) {
	                    const g = lineGroups[bestIdx];
	                    // Prevent "bridging" that collapses multiple rows into one bbox.
	                    const nextY0 = Math.min(g.y0, tok.y0);
	                    const nextY1 = Math.max(g.y1, tok.y1);
	                    const nextSpan = nextY1 - nextY0;
	                    const maxSpan = Math.max(medianH * 2.6, yTol * 2.8);
	                    if (nextSpan <= maxSpan) {
	                        g.tokens.push(tok);
	                        g.cy = (g.cy * (g.tokens.length - 1) + tok.cy) / g.tokens.length;
	                        g.y0 = nextY0;
	                        g.y1 = nextY1;
	                    } else {
	                        lineGroups.push({ cy: tok.cy, y0: tok.y0, y1: tok.y1, tokens: [tok] });
	                    }
	                } else {
	                    lineGroups.push({ cy: tok.cy, y0: tok.y0, y1: tok.y1, tokens: [tok] });
	                }
	            }

            // Post-merge adjacent groups that are extremely close in Y and look like split columns.
            lineGroups.sort((a, b) => a.cy - b.cy);
            const mergedGroups: Array<{ cy: number; tokens: Token[] }> = [];

	            const tokenLooksMoney = (t: string) => /\$?\d+(?:[.,]\d{2})/.test(t);
	            const tokenLooksWord = (t: string) => /[a-zA-Z]{3,}/.test(t);

            for (const g of lineGroups) {
                const last = mergedGroups[mergedGroups.length - 1];
                if (!last) {
                    mergedGroups.push(g);
                    continue;
	                }

	                const dy = Math.abs(g.cy - last.cy);
	                const mergeTol = Math.max(3, Math.min(14, medianH * 0.45));
	                if (dy > mergeTol) {
	                    mergedGroups.push(g);
	                    continue;
	                }

                const lastTokens = last.tokens;
                const gTokens = g.tokens;
                const lastX1 = Math.max(...lastTokens.map((t) => t.x1));
                const gX0 = Math.min(...gTokens.map((t) => t.x0));
                const lastY0 = Math.min(...lastTokens.map((t) => t.y0));
                const lastY1 = Math.max(...lastTokens.map((t) => t.y1));
                const gY0 = Math.min(...gTokens.map((t) => t.y0));
                const gY1 = Math.max(...gTokens.map((t) => t.y1));

                const verticalOverlap = Math.max(0, Math.min(lastY1, gY1) - Math.max(lastY0, gY0));
                const minHeight = Math.max(1, Math.min(lastY1 - lastY0, gY1 - gY0));
                const overlapRatio = verticalOverlap / minHeight;

                const lastHasMoney = lastTokens.some((t) => tokenLooksMoney(t.text));
                const gHasMoney = gTokens.some((t) => tokenLooksMoney(t.text));
                const lastHasWord = lastTokens.some((t) => tokenLooksWord(t.text));
                const gHasWord = gTokens.some((t) => tokenLooksWord(t.text));

                const columnSeparated = lastX1 < gX0;
                const looksLikeSplitColumns =
                    columnSeparated
                    && overlapRatio >= 0.5
                    && ((lastHasWord && gHasMoney) || (gHasWord && lastHasMoney));
                if (!looksLikeSplitColumns) {
                    mergedGroups.push(g);
                    continue;
                }

                // Merge into `last`.
                last.tokens.push(...g.tokens);
                last.cy = (last.cy + g.cy) / 2;
            }

            const annotationLines: OcrLine[] = mergedGroups
                .map((g) => {
                    g.tokens.sort((a, b) => a.x0 - b.x0);
                    const text = g.tokens.map((t) => t.text).join(' ');
                    const xs0 = g.tokens.map((t) => t.x0).sort((a, b) => a - b);
                    const ys0 = g.tokens.map((t) => t.y0).sort((a, b) => a - b);
                    const xs1 = g.tokens.map((t) => t.x1).sort((a, b) => a - b);
                    const ys1 = g.tokens.map((t) => t.y1).sort((a, b) => a - b);
                    const pick = (arr: number[], p: number) => arr[Math.max(0, Math.min(arr.length - 1, Math.floor((arr.length - 1) * p)))];

                    // Robust bounds: avoid a single outlier token (often watermark) blowing up the bbox.
                    const useTrim = g.tokens.length >= 6;
                    const x0 = useTrim ? pick(xs0, 0.02) : xs0[0];
                    const y0 = useTrim ? pick(ys0, 0.1) : ys0[0];
                    const x1 = useTrim ? pick(xs1, 0.98) : xs1[xs1.length - 1];
                    const y1 = useTrim ? pick(ys1, 0.9) : ys1[ys1.length - 1];
                    const bbox: [number, number, number, number] = [
                        Number((x0 / width).toFixed(6)),
                        Number((y0 / height).toFixed(6)),
                        Number((x1 / width).toFixed(6)),
                        Number((y1 / height).toFixed(6)),
                    ];
                    return { text, bbox: isValidNormalizedBbox(bbox) ? bbox : null };
                })
                .filter((l) => l.text && l.text.trim().length);

            // Always prefer annotation-derived lines when available: they carry real geometry and tend
            // to preserve receipt rows better than fullTextAnnotation line breaks.
            if (annotationLines.length) {
                lines.length = 0;
                lines.push(...annotationLines);
            }
        }
    }

    if (!text.trim()) throw new Error('Google Vision OCR returned empty text');
    return { text, lines, raw: data };
}

async function callDedalusChat(apiUrl: string, apiKey: string, body: any) {
    const response = await fetch(`${apiUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: await buildDedalusHeaders(apiKey),
        body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) {
        const msg = data?.error?.message ?? `Dedalus chat failed with status ${response.status}`;
        throw new Error(msg);
    }
    return data;
}

function isValidNormalizedBbox(bbox: any): bbox is [number, number, number, number] {
    if (!Array.isArray(bbox) || bbox.length !== 4) return false;
    const [x0, y0, x1, y1] = bbox.map((n) => Number(n));
    if (![x0, y0, x1, y1].every((n) => Number.isFinite(n))) return false;
    if (x0 < 0 || y0 < 0 || x1 > 1 || y1 > 1) return false;
    if (x0 >= x1 || y0 >= y1) return false;
    return true;
}

function bboxFromReceiptSpace(receiptBbox: [number, number, number, number], bboxReceipt: [number, number, number, number]) {
    const [rx0, ry0, rx1, ry1] = receiptBbox;
    const [bx0, by0, bx1, by1] = bboxReceipt;
    const rw = rx1 - rx0;
    const rh = ry1 - ry0;
    const x0 = rx0 + bx0 * rw;
    const y0 = ry0 + by0 * rh;
    const x1 = rx0 + bx1 * rw;
    const y1 = ry0 + by1 * rh;
    const out: [number, number, number, number] = [x0, y0, x1, y1];
    return isValidNormalizedBbox(out) ? out : null;
}

function mergeItemBboxes(extractedItems: any[], bboxPayload: any) {
    if (!Array.isArray(extractedItems) || !extractedItems.length) return extractedItems;
    const bboxItems = Array.isArray(bboxPayload?.items) ? bboxPayload.items : [];
    if (!Array.isArray(bboxItems) || !bboxItems.length) return extractedItems;

    const receiptBbox = bboxPayload?.receipt_bbox;
    const receiptBboxValid = isValidNormalizedBbox(receiptBbox);

    const byIndex = new Map<number, any>();
    for (const item of bboxItems) {
        const idx = Number(item?.line_index);
        if (!Number.isFinite(idx)) continue;
        const bboxImage = item?.bbox_image ?? null;
        const bboxReceipt = item?.bbox_receipt ?? null;

        let bbox: [number, number, number, number] | null = null;
        if (bboxImage !== null && isValidNormalizedBbox(bboxImage)) {
            bbox = bboxImage;
        } else if (receiptBboxValid && bboxReceipt !== null && isValidNormalizedBbox(bboxReceipt)) {
            bbox = bboxFromReceiptSpace(receiptBbox as [number, number, number, number], bboxReceipt);
        }

        byIndex.set(idx, { bbox, confidence: item?.confidence ?? null });
    }

    return extractedItems.map((item: any, i: number) => {
        const lineIndex = Number(item?.line_index ?? item?.lineIndex ?? i);
        const hit = byIndex.get(lineIndex);
        if (!hit) return item;
        // Only fill bbox if missing, to avoid clobbering any upstream geometry.
        if (item?.bbox != null) return item;
        return { ...item, bbox: hit.bbox, bbox_confidence: hit.confidence };
    });
}

async function inferItemBboxesViaVision(
    apiUrl: string,
    apiKey: string,
    imageUrl: string,
    items: any[],
    modelCandidates: string[],
) {
    const payload = {
        items: (Array.isArray(items) ? items : []).map((it: any, i: number) => ({
            line_index: it?.line_index ?? it?.lineIndex ?? i,
            name: it?.name ?? null,
            price: it?.price ?? null,
        })),
    };

    const envBboxModel = await getEnvFallback('DEDALUS_ITEM_BBOX_MODEL');
    const bboxModelCandidates = [
        (envBboxModel && envBboxModel.trim().length ? envBboxModel.trim() : null),
        // Default to a stronger vision model for localization.
        'openai/gpt-4o',
        'openai/gpt-4o-mini',
        ...modelCandidates,
    ].filter((m, idx, arr): m is string => Boolean(m && m.trim()) && arr.indexOf(m as string) === idx);

    let lastErr: Error | null = null;
    for (const candidateModel of bboxModelCandidates) {
        try {
            const chatRaw = await callDedalusChat(apiUrl, apiKey, {
                model: candidateModel,
                temperature: 0,
                max_completion_tokens: 1600,
                stream: false,
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: OCR_SYSTEM_PROMPT.replace('Never invent text, items, prices, dates, totals, or bounding boxes.', 'Never invent text, items, prices, dates, totals, or coordinates.') },
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: `${ITEM_BBOX_PROMPT}\n\nITEMS_JSON:\n${JSON.stringify(payload)}` },
                            { type: 'image_url', image_url: { url: imageUrl } },
                        ],
                    },
                ],
            });

            const text = extractChatMessageText(chatRaw);
            if (!text.trim()) throw new Error(`Dedalus bbox chat returned empty content. model=${candidateModel}`);
            const parsed = parseJsonPayload(text);
            return { payload: parsed, modelUsed: candidateModel };
        } catch (e: any) {
            lastErr = e instanceof Error ? e : new Error(String(e));
        }
    }
    throw lastErr ?? new Error('Dedalus bbox inference failed');
}

export async function POST(req: Request) {
    let receiptIdForFailure: string | null = null;
    try {
        let body: any;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }

        const { image_url, model, strategy, receipt_id } = body ?? {};
        receiptIdForFailure = typeof receipt_id === 'string' ? receipt_id : null;
        if (!image_url) return NextResponse.json({ error: 'image_url is required' }, { status: 400 });

        const apiKey = await getEnvFallback('DEDALUS_API_KEY');
        if (!apiKey) return NextResponse.json({ error: 'DEDALUS_API_KEY is not configured' }, { status: 500 });

        const apiUrl = ((await getEnvFallback('DEDALUS_API_URL')) || 'https://api.dedaluslabs.ai').replace(/\/+$/, '');
        const envModel = await getEnvFallback('DEDALUS_MODEL');
        const requestedModel = typeof model === 'string' && model.trim().length ? model.trim() : null;
        const modelCandidates = [
            requestedModel,
            envModel,
            'openai/gpt-4o-mini',
            'openai/gpt-4o',
        ].filter((m): m is string => Boolean(m && m.trim()));
        const chosenStrategy: 'ocr_then_chat' | 'vision' =
            strategy === 'vision' ? 'vision' : 'ocr_then_chat';

        let extracted: any;
        let usedStrategy: 'ocr_then_chat' | 'vision' = chosenStrategy;
        let ocrMarkdown: string | null = null;
        let ocrRaw: any = null;
        let chatRaw: any = null;
        let modelUsed: string | null = null;

        if (chosenStrategy === 'ocr_then_chat') {
            try {
                const ocr = await callDedalusOcr(apiUrl, apiKey, image_url);
                ocrMarkdown = ocr.markdown;
                ocrRaw = ocr.raw;

                let lastChatErr: Error | null = null;
                for (const candidateModel of modelCandidates) {
                    try {
                        chatRaw = await callDedalusChat(apiUrl, apiKey, {
                            model: candidateModel,
                            temperature: 0,
                            max_completion_tokens: 3200,
                            stream: false,
                            response_format: { type: 'json_object' },
                            messages: [
                                { role: 'system', content: OCR_SYSTEM_PROMPT },
                                {
                                    role: 'user',
                                    content: `${TEXT_ONLY_PROMPT}\n\nOCR_TEXT_MARKDOWN:\n${ocrMarkdown}`,
                                },
                            ],
                        });

                        const text = extractChatMessageText(chatRaw);
                        if (!text.trim()) {
                            const choice0 = chatRaw?.choices?.[0] ?? null;
                            throw new Error(
                                `Dedalus chat returned empty content. model=${candidateModel} keys=${Object.keys(chatRaw ?? {}).join(',')} choice0=${JSON.stringify(choice0)?.slice(0, 500)}`,
                            );
                        }
                        extracted = parseJsonPayload(text);
                        modelUsed = candidateModel;
                        break;
                    } catch (e: any) {
                        lastChatErr = e instanceof Error ? e : new Error(String(e));
                    }
                }

                if (!extracted) {
                    throw lastChatErr ?? new Error('Dedalus chat failed');
                }
            } catch (e) {
                // Fallback: vision-in-one-shot
                usedStrategy = 'vision';
            }
        }

        if (!extracted) {
            let lastChatErr: Error | null = null;
            for (const candidateModel of modelCandidates) {
                try {
                    chatRaw = await callDedalusChat(apiUrl, apiKey, {
                        model: candidateModel,
                        temperature: 0,
                        max_completion_tokens: 3200,
                        stream: false,
                        response_format: { type: 'json_object' },
                        messages: [
                            { role: 'system', content: OCR_SYSTEM_PROMPT },
                            {
                                role: 'user',
                                content: [
                                    { type: 'text', text: FAST_PROMPT },
                                    { type: 'image_url', image_url: { url: image_url } },
                                ],
                            },
                        ],
                    });
                    const text = extractChatMessageText(chatRaw);
                    if (!text.trim()) {
                        const choice0 = chatRaw?.choices?.[0] ?? null;
                        throw new Error(
                            `Dedalus chat returned empty content. model=${candidateModel} keys=${Object.keys(chatRaw ?? {}).join(',')} choice0=${JSON.stringify(choice0)?.slice(0, 500)}`,
                        );
                    }
                    extracted = parseJsonPayload(text);
                    modelUsed = candidateModel;
                    break;
                } catch (e: any) {
                    lastChatErr = e instanceof Error ? e : new Error(String(e));
                }
            }

            if (!extracted) {
                throw lastChatErr ?? new Error('Dedalus chat failed');
            }
        }

        extracted = postProcessQuantities(extracted, ocrMarkdown);

        // Ensure address is present when it is clearly visible in the OCR text.
        if (!extracted?.extractions) extracted.extractions = {};
        const merchantName = typeof extracted?.extractions?.merchant?.value === 'string'
            ? extracted.extractions.merchant.value
            : null;
        const existingAddress = extracted?.extractions?.address?.value ?? null;
        if (!existingAddress && (typeof extracted?.raw_text === 'string' || typeof ocrMarkdown === 'string')) {
            const addr = inferAddressFromRawText(
                (typeof extracted?.raw_text === 'string' ? extracted.raw_text : null) ?? (ocrMarkdown ?? ''),
                merchantName,
            );
            if (addr) {
                extracted.extractions.address = { value: addr, confidence: 0.7 };
            }
        }

        // Optional: Use Google Vision OCR to get tighter, more accurate geometry than LLM-inferred bboxes.
        // This does NOT replace the Dedalus extraction; it only attaches bboxes to already-extracted items.
        {
            const wantGoogleBboxes = ((await getEnvFallback('GOOGLE_VISION_BBOX')) || 'true').toLowerCase() !== 'false';
            const googleApiKey = await getEnvFallback('GOOGLE_VISION_API_KEY');
            const items = Array.isArray(extracted?.items) ? extracted.items : [];
            if (wantGoogleBboxes && googleApiKey && items.length && typeof image_url === 'string' && image_url.trim()) {
                try {
                    const google = await callGoogleVisionOcr(googleApiKey, image_url);
                    extracted = attachItemBboxesFromOcrLines(extracted, google.lines);
                    extracted.bbox_model_version = `google-vision-document_text_detection`;
                } catch {
                    // ignore (still allow pipeline to succeed)
                }
            }
        }

        // Best-effort: infer per-item bounding boxes via a small vision pass.
        // Dedalus OCR markdown does not reliably provide per-line geometry, so we ask the chat model
        // to locate the already-extracted items on the image.
        {
            const wantItemBboxes = ((await getEnvFallback('DEDALUS_ITEM_BBOX')) || 'true').toLowerCase() !== 'false';
            const items = Array.isArray(extracted?.items) ? extracted.items : [];
            const hasAnyBbox = items.some((it: any) => it?.bbox != null);
            if (wantItemBboxes && !hasAnyBbox && items.length && typeof image_url === 'string' && image_url.trim()) {
                try {
                    const bboxResult = await inferItemBboxesViaVision(apiUrl, apiKey, image_url, items, modelCandidates);
                    extracted.items = mergeItemBboxes(items, bboxResult.payload);
                    if (isValidNormalizedBbox(bboxResult.payload?.receipt_bbox)) {
                        extracted.receipt_bbox = bboxResult.payload.receipt_bbox;
                    }
                    extracted.bbox_model_version = `${bboxResult.modelUsed}-vision-bbox`;
                } catch {
                    // ignore bbox failures (the receipt pipeline should still succeed without geometry)
                }
            }
        }

        // Persist into Supabase (service role) if receipt_id is provided.
        // This mirrors the edge-function behavior at a high level: store raw OCR text and extracted JSON.
        let stored = false;
        let store_error: string | null = null;
        if (receipt_id) {
            try {
                const supabase = await getServiceSupabase();

                const merchant = extracted?.extractions?.merchant?.value ?? null;
                const date = extracted?.extractions?.date?.value ?? null;
                const total = extracted?.extractions?.total?.value ?? null;
                const subtotal = extracted?.extractions?.subtotal?.value ?? null;
                const tax = extracted?.extractions?.tax?.value ?? null;
                const currency = extracted?.extractions?.currency?.value ?? null;
                const summary = extracted?.summary ?? null;
                const raw_text = extracted?.raw_text ?? ocrMarkdown ?? null;

                const extraction_confidence_total = extracted?.extractions?.total?.confidence ?? null;

                // Update receipts core fields.
                await supabase
                    .from('receipts')
                    .update({
                        merchant_name: merchant,
                        transaction_date: date,
                        total_amount: total,
                        subtotal_amount: subtotal,
                        tax_amount: tax,
                        currency,
                        raw_text,
                        summary,
                        ocr_model_version: `${modelUsed ?? 'unknown'}-${usedStrategy}`,
                        extraction_confidence_total,
                        status: 'ready',
                    })
                    .eq('id', receipt_id);

                // Store extraction snapshot.
                await supabase.from('receipt_extractions').insert({
                    receipt_id,
                    extracted_json: { ...extracted, ocr_markdown: ocrMarkdown, strategy: usedStrategy },
                    raw_text,
                    summary,
                    extraction_confidence_total,
                    model_version: `${modelUsed ?? 'unknown'}-${usedStrategy}`,
                });

                // Store amount breakdown.
                const breakdown = extracted?.amount_breakdown ?? null;
                if (breakdown) {
                    await supabase.from('receipt_amount_breakdowns').upsert(
                        {
                            receipt_id,
                            subtotal: breakdown.subtotal ?? null,
                            tax: breakdown.tax ?? null,
                            discount: breakdown.discount ?? null,
                            tip: breakdown.tip ?? null,
                            fees: breakdown.fees ?? null,
                            updated_at: new Date().toISOString(),
                        },
                        { onConflict: 'receipt_id' },
                    );
                }

                // Replace receipt items (best-effort).
                const items = Array.isArray(extracted?.items) ? extracted.items : [];
                await supabase.from('receipt_items').delete().eq('receipt_id', receipt_id);
                if (items.length) {
                    await supabase.from('receipt_items').insert(
                        items.map((item: any, idx: number) => ({
                            receipt_id,
                            line_index: item?.line_index ?? idx,
                            item_name: item?.name ?? null,
                            item_amount: item?.price ?? null,
                            quantity: item?.quantity ?? null,
                            unit_price: item?.unit_price ?? null,
                            item_category: item?.category_prediction ?? item?.category ?? null,
                            bbox: item?.bbox ?? null,
                            confidence: item?.confidence ?? null,
                        })),
                    );
                }

                stored = true;
            } catch (e: any) {
                store_error = e?.message ?? String(e);
            }
        }

        return NextResponse.json({
            provider: 'dedalus',
            model: chatRaw?.model ?? modelUsed,
            strategy: usedStrategy,
            ocr_used: usedStrategy === 'ocr_then_chat',
            ocr_markdown: ocrMarkdown,
            extracted,
            stored,
            store_error,
            raw: { ocr: ocrRaw, chat: chatRaw },
        });
    } catch (error: any) {
        console.error('Receipt Extract API Error:', error);
        if (receiptIdForFailure) {
            try {
                const supabase = await getServiceSupabase();
                await supabase.from('receipts').update({ status: 'failed' }).eq('id', receiptIdForFailure);
            } catch {
                // ignore
            }
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
