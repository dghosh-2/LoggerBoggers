/**
 * Dedalus Chat Completions (HTTP) example.
 *
 * Usage:
 *   DEDALUS_API_KEY=... node scripts/dedalus-chat.mjs "Hello, how are you?"
 *
 * Env (optional):
 *   DEDALUS_API_URL=https://api.dedaluslabs.ai
 *   DEDALUS_MODEL=openai/gpt-4o
 *   DEDALUS_AUTH_HEADER=bearer   # or: x-api-key
 */

const apiKey = process.env.DEDALUS_API_KEY;
if (!apiKey) {
  console.error("Missing env var: DEDALUS_API_KEY");
  process.exit(1);
}

const apiUrl = (process.env.DEDALUS_API_URL || "https://api.dedaluslabs.ai").replace(/\/+$/, "");
const model = process.env.DEDALUS_MODEL || "openai/gpt-4o";
const authHeaderMode = (process.env.DEDALUS_AUTH_HEADER || "bearer").toLowerCase(); // bearer | x-api-key

const userText = process.argv.slice(2).join(" ").trim() || "Hello, how are you?";

const headers = { "Content-Type": "application/json" };
if (authHeaderMode === "x-api-key") {
  headers["x-api-key"] = apiKey;
} else {
  headers["Authorization"] = `Bearer ${apiKey}`;
}

// This payload is OpenAI-compatible and matches Dedalus docs.
const body = {
  model,
  messages: [{ role: "user", content: userText }],
  temperature: 0,
  // Prefer max_completion_tokens per docs; keep max_tokens unset.
  max_completion_tokens: 600,
  stream: false,
};

const res = await fetch(`${apiUrl}/v1/chat/completions`, {
  method: "POST",
  headers,
  body: JSON.stringify(body),
});

const data = await res.json().catch(() => ({}));
if (!res.ok) {
  const msg = data?.error?.message || `Dedalus chat failed (${res.status})`;
  console.error(msg);
  console.error(JSON.stringify(data, null, 2));
  process.exit(1);
}

// Print the assistant message content in a simple way.
const content = data?.choices?.[0]?.message?.content;
if (typeof content === "string" && content.trim()) {
  console.log(content);
} else {
  console.log(JSON.stringify(data, null, 2));
}

