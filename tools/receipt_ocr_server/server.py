from __future__ import annotations

import os
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from .dedalus_client import DedalusConfig, extract_receipt_json
from .opencv_preprocess import preprocess_receipt_image


load_dotenv()

OCR_SYSTEM_PROMPT = (
    "You are a strict receipt OCR system. Extract only text that is clearly visible on the receipt. "
    "Never invent text, items, prices, dates, totals, or bounding boxes."
)

# Kept close to the existing edge-function fast schema so your frontend stays compatible.
FAST_PROMPT = """Extract receipt OCR quickly for immediate UI rendering.
Rules:
- raw_text: include all visible text (reading order, newline separated). If very long, cap at ~250 lines.
- summary: 1-3 concise sentences.
- Capture merchant, date, total, subtotal, tax, discount, tip, fees, currency when visible.
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
}
"""


def _get_cfg() -> DedalusConfig:
    key = os.environ.get("DEDALUS_API_KEY")
    if not key:
        raise RuntimeError("Missing DEDALUS_API_KEY")
    return DedalusConfig(
        api_key=key,
        api_url=os.environ.get("DEDALUS_API_URL", "https://api.dedaluslabs.ai"),
        model=os.environ.get("DEDALUS_MODEL", "openai/gpt-5-nano"),
    )


app = FastAPI(title="LoggerBoggers Receipt OCR (Local)", version="0.1.0")


@app.get("/health")
def health() -> dict[str, Any]:
    return {"ok": True}


@app.post("/process")
async def process(file: UploadFile = File(...)) -> JSONResponse:
    try:
        raw = await file.read()
        if not raw:
            raise HTTPException(status_code=400, detail="Empty upload")

        pre = preprocess_receipt_image(raw, max_long_edge=2000, output_format="jpeg", jpeg_quality=85)

        cfg = _get_cfg()
        extracted = await extract_receipt_json(
            cfg,
            image_bytes=pre.image_bytes,
            image_mime=pre.mime,
            system_prompt=OCR_SYSTEM_PROMPT,
            user_prompt=FAST_PROMPT,
        )

        return JSONResponse(
            {
                "provider": "dedalus",
                "model": cfg.model,
                "opencv": {"did_warp": pre.did_warp, "width": pre.width, "height": pre.height},
                "extracted": extracted,
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

