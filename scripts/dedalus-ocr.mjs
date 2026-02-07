/**
 * Dedalus OCR (HTTP) example.
 *
 * Usage:
 *   DEDALUS_API_KEY=... node scripts/dedalus-ocr.mjs "https://arxiv.org/pdf/1706.03762"
 *
 * Env (optional):
 *   DEDALUS_API_URL=https://api.dedaluslabs.ai
 *   DEDALUS_OCR_MODEL=mistral-ocr-latest
 *   DEDALUS_AUTH_HEADER=bearer   # or: x-api-key
 */

const apiKey = process.env.DEDALUS_API_KEY;
if (!apiKey) {
  console.error("Missing env var: DEDALUS_API_KEY");
  process.exit(1);
}

const apiUrl = (process.env.DEDALUS_API_URL || "https://api.dedaluslabs.ai").replace(/\/+$/, "");
const ocrModel = process.env.DEDALUS_OCR_MODEL || "mistral-ocr-latest";
const authHeaderMode = (process.env.DEDALUS_AUTH_HEADER || "bearer").toLowerCase(); // bearer | x-api-key

const documentUrl = process.argv.slice(2).join(" ").trim();
if (!documentUrl) {
  console.error('Usage: node scripts/dedalus-ocr.mjs "https://example.com/file.pdf"');
  process.exit(1);
}

const headers = { "Content-Type": "application/json" };
if (authHeaderMode === "x-api-key") {
  headers["x-api-key"] = apiKey;
} else {
  headers["Authorization"] = `Bearer ${apiKey}`;
}

const body = {
  model: ocrModel,
  document: { type: "document_url", document_url: documentUrl },
};

const res = await fetch(`${apiUrl}/v1/ocr`, {
  method: "POST",
  headers,
  body: JSON.stringify(body),
});

const data = await res.json().catch(() => ({}));
if (!res.ok) {
  const msg = data?.error?.message || `Dedalus OCR failed (${res.status})`;
  console.error(msg);
  console.error(JSON.stringify(data, null, 2));
  process.exit(1);
}

const pages = Array.isArray(data?.pages) ? data.pages : [];
for (const page of pages) {
  const idx = page?.index ?? "?";
  const md = typeof page?.markdown === "string" ? page.markdown : "";
  console.log(`Page ${idx}:\n${md.slice(0, 200)}...\n`);
}

