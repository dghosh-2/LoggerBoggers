export const OCR_SYSTEM_PROMPT =
    'You are a strict receipt OCR system. Extract only text that is clearly visible on the receipt. Never invent text, items, prices, dates, totals, or bounding boxes.';

export const FAST_PROMPT = `Extract receipt OCR quickly for immediate UI rendering.
Rules:
- raw_text: include all visible text (reading order, newline separated). If very long, cap at ~250 lines.
- summary: 1-3 concise sentences.
- Capture merchant, address (street/city/state/zip), date, total, subtotal, tax, discount, tip, fees, currency when visible.
- address: store the merchant/store address lines if present; do NOT include phone numbers.
- Extract line items. Prefer items that look like purchases; exclude totals/tax/tip lines.
- items[].price is the LINE TOTAL (not the unit price).
- For each line item, also infer quantity and unit_price when possible:
  - quantity: how many units were purchased (integer). If not present/uncertain, return null (do NOT default to 1).
  - unit_price: per-unit price (number) such that quantity * unit_price ~= price (line total). If not present/uncertain, return null.
  - IMPORTANT: distinguish quantity vs size/count in the name. If the number is a size/count descriptor, keep it in the name.
    - "2 Chicken Breast  $8.00" -> quantity=2, unit_price=4.00, name="Chicken Breast", price=8.00
    - "20 pc Nuggets  $8.00" -> quantity=null, unit_price=null, name="20 pc Nuggets", price=8.00
    - "12pk Soda  $6.99" -> quantity=null, unit_price=null, name="12pk Soda", price=6.99
    - If you see an explicit quantity column (many lines start with a number), treat that leading number as quantity even if >= 10.
- Tip: if the receipt has "Suggested Additional Tip" section, ignore those suggested values; only extract the actual paid tip line if present.
- If uncertain, return null for that field.
- Return JSON only with this schema:
{
  "quality": { "blur": number, "glare": number, "readability": number, "is_low_quality": boolean },
  "raw_text": string,
  "summary": string,
  "extractions": {
    "merchant": { "value": string|null, "confidence": number },
    "address": { "value": string|null, "confidence": number },
    "date": { "value": string|null, "confidence": number },
    "total": { "value": number|null, "confidence": number },
    "subtotal": { "value": number|null, "confidence": number },
    "tax": { "value": number|null, "confidence": number },
    "discount": { "value": number|null, "confidence": number },
    "tip": { "value": number|null, "confidence": number },
    "fees": { "value": number|null, "confidence": number },
    "currency": { "value": string|null, "confidence": number }
  },
  "items": [
    { "name": string, "price": number, "quantity": number|null, "unit_price": number|null, "confidence": number, "category_prediction": "Groceries" | "Dining" | "Transport" | "Household" | "Health" | "Tech" | "Other" }
  ],
  "lines": []
}`;

export const TEXT_ONLY_PROMPT = `You are given OCR text (markdown) extracted from a receipt.
Task: Extract structured receipt fields and line items.

Rules:
- Use only the provided OCR text. Do NOT invent merchants, totals, dates, items, or prices.
- If a value is not clearly present, return null.
- For address, extract the merchant/store address lines if present; do NOT include phone numbers.
- Prefer the FINAL payable amount only for total (TOTAL / GRAND TOTAL / AMOUNT DUE / BALANCE DUE / AMOUNT PAID).
- Exclude totals/tax/tip lines from items.
- items[].price is the LINE TOTAL (not unit price).
- Infer quantity and unit_price only when clearly supported; otherwise null (do NOT default quantity to 1).
- Return JSON only with this schema:
{
  "quality": { "blur": number, "glare": number, "readability": number, "is_low_quality": boolean },
  "raw_text": string,
  "summary": string,
  "extractions": {
    "merchant": { "value": string|null, "confidence": number },
    "address": { "value": string|null, "confidence": number },
    "date": { "value": string|null, "confidence": number },
    "total": { "value": number|null, "confidence": number },
    "subtotal": { "value": number|null, "confidence": number },
    "tax": { "value": number|null, "confidence": number },
    "discount": { "value": number|null, "confidence": number },
    "tip": { "value": number|null, "confidence": number },
    "fees": { "value": number|null, "confidence": number },
    "currency": { "value": string|null, "confidence": number }
  },
  "items": [
    { "name": string, "price": number, "quantity": number|null, "unit_price": number|null, "confidence": number, "category_prediction": "Groceries" | "Dining" | "Transport" | "Household" | "Health" | "Tech" | "Other" }
  ],
  "lines": []
}`;

export const ITEM_BBOX_PROMPT = `You are given a receipt image and a list of extracted line items.
Task: Locate each item line on the receipt image and return a tight bounding box for the full line item text.

Rules:
- Use ONLY what you can see on the image. If you cannot confidently locate an item line, return bbox=null for that item.
- Do NOT guess approximate evenly-spaced boxes. If you are approximating, return bbox=null.
- Confidence must reflect visual certainty:
  - confidence >= 0.85 only if you can visually read the item name and line total in the boxed region.
  - confidence <= 0.5 if you are unsure or if multiple similar lines exist.
- First, find the receipt paper region in the photo. Return a tight receipt_bbox for the whole receipt.
- Output bbox coordinates as NORMALIZED floats in [0,1] relative to the full image:
  - bbox = [x0, y0, x1, y1] where (x0,y0) is top-left and (x1,y1) is bottom-right.
  - Ensure 0 <= x0 < x1 <= 1 and 0 <= y0 < y1 <= 1.
- Items may be on the same line as quantity, weight, or unit price; include the whole line item region.
- Prefer matching by the printed item name + the printed LINE TOTAL amount.
- Return JSON only with this schema:
{
  "receipt_bbox": [number, number, number, number] | null,
  "items": [
    {
      "line_index": number,
      "bbox_image": [number, number, number, number] | null,
      "bbox_receipt": [number, number, number, number] | null,
      "confidence": number
    }
  ]
}`;
