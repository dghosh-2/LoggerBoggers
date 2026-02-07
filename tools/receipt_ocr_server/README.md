# Local Receipt OCR Server (OpenCV + Dedalus)

Runs receipt extraction locally:
1. Accept an uploaded receipt image
2. Preprocess with OpenCV (detect receipt contour + perspective warp when possible)
3. Send the processed image to Dedalus Chat Completions (vision) to extract structured JSON

## Setup

Create `tools/receipt_ocr_server/.env`:

```bash
DEDALUS_API_KEY="dsk-live-..."
DEDALUS_API_URL="https://api.dedaluslabs.ai"
DEDALUS_MODEL="openai/gpt-5-nano"
```

Install deps (Python 3.10+):

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r tools/receipt_ocr_server/requirements.txt
```

## Run

```bash
source .venv/bin/activate
uvicorn tools.receipt_ocr_server.server:app --reload --port 8787
```

## Use

```bash
curl -sS -X POST "http://127.0.0.1:8787/process" \
  -F "file=@/path/to/receipt.jpg" | jq .
```

Notes:
- If OpenCV cannot find a clear receipt contour, it falls back to the original image (still resizes).
- The JSON schema is intentionally aligned with your existing edge function extraction.

