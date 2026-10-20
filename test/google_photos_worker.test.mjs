import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import worker from "../services/google-photos-bn/src/index.mjs";

const origin = "https://funebra.github.io";
const sessionToken = "browsersessiontoken";
const tokenKey = value => createHash("sha256").update(value).digest("hex");

class MemoryKV {
  values = new Map();
  async get(key, type) {
    const value = this.values.get(key);
    if (value === undefined) return null;
    return type === "json" ? JSON.parse(value) : value;
  }
  async put(key, value) { this.values.set(key, value); }
  async delete(key) { this.values.delete(key); }
}

function makeEnv() {
  const TOKENS = new MemoryKV();
  const FLOWS = new MemoryKV();
  const PICKERS = new MemoryKV();
  const assets = new Map();
  const ASSETS = {
    async put(key, value) { assets.set(key, value); },
    async delete(key) { assets.delete(key); },
    async get(key) { return assets.has(key) ? { body: assets.get(key), httpMetadata: { contentType: "image/jpeg" } } : null; },
  };
  const env = { FRONTEND_URL: origin, TOKENS, FLOWS, PICKERS, ASSETS };
  return { env, assets };
}

async function authorize(env) {
  await env.TOKENS.put(tokenKey(sessionToken), JSON.stringify({
    accessToken: "google-access-token",
    expiresAt: Date.now() + 300000,
  }));
}

function apiRequest(path, { method = "GET", body, token = sessionToken } = {}) {
  const headers = { Origin: origin, Authorization: `Bearer ${token}` };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  return new Request(`https://worker.example${path}`, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body),
  });
}

test("Picker session creation asks Google to allow only one selected item", async () => {
  const { env } = makeEnv();
  await authorize(env);
  const originalFetch = globalThis.fetch;
  let requestedMaxItemCount;
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    if (url === "https://photospicker.googleapis.com/v1/sessions" && init.method === "POST") {
      requestedMaxItemCount = JSON.parse(init.body).pickingConfig.maxItemCount;
      return Response.json({
        id: "google-session-1",
        pickerUri: "https://photos.google.com/picker",
        pollingConfig: { pollInterval: "1s" },
      });
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };
  try {
    const response = await worker.fetch(apiRequest("/api/picker-sessions", { method: "POST", body: {} }), env);
    assert.equal(response.status, 201);
    assert.equal(requestedMaxItemCount, "1");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("oversized streamed image is rejected before it is stored", async () => {
  const { env, assets } = makeEnv();
  await authorize(env);
  await env.PICKERS.put("picker/picker-1", JSON.stringify({
    googleSessionId: "google-session-1",
    owner: tokenKey(sessionToken),
  }));
  const originalFetch = globalThis.fetch;
  let streamedBytes = 0;
  let cancelled = false;
  globalThis.fetch = async input => {
    const url = String(input);
    if (url.startsWith("https://photospicker.googleapis.com/v1/mediaItems?")) {
      return Response.json({ mediaItems: [{
        id: "picked-photo-1",
        type: "PHOTO",
        mediaFile: {
          baseUrl: "https://photos.example/image",
          filename: "large.jpg",
          mimeType: "image/jpeg",
          mediaFileMetadata: { width: "100", height: "100" },
        },
      }] });
    }
    if (url === "https://photos.example/image=d") {
      let chunks = 0;
      const body = new ReadableStream({
        pull(controller) {
          if (chunks === 26) { controller.close(); return; }
          const chunk = new Uint8Array(1024 * 1024);
          chunks += 1;
          streamedBytes += chunk.byteLength;
          controller.enqueue(chunk);
        },
        cancel() { cancelled = true; },
      });
      return new Response(body, { headers: { "Content-Type": "image/jpeg" } });
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };
  try {
    const response = await worker.fetch(apiRequest("/api/picker-sessions/picker-1/import", { method: "POST", body: {} }), env);
    assert.equal(response.status, 413);
    assert.equal((await response.json()).error, "image_exceeds_25_mib_limit");
    assert.ok(streamedBytes <= 26 * 1024 * 1024);
    assert.equal(cancelled, true);
    assert.equal(assets.size, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
