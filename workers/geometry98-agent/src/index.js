const SESSION_COOKIE = "__Host-g98_session";
const TX_COOKIE = "__Host-g98_oauth";
const SESSION_SECONDS = 8 * 60 * 60;
const TX_SECONDS = 5 * 60;
const MAX_BODY_BYTES = 12_000;
const CAP_DEFAULT_MICRO_USD = 5_000_000;
const SHAPES = new Set(["circle", "cube", "sphere"]);
const SAMPLING = new Set(["perimeter", "edges", "surface"]);
const GLYPHS = new Set(["dot", "circle"]);

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers }
  });
}
function b64u(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replaceAll("=", "").replaceAll("+", "-").replaceAll("/", "_");
}
function decodeB64u(s) {
  const normalized = s.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}
function encJson(value) {
  return b64u(new TextEncoder().encode(JSON.stringify(value)));
}
async function hmac(secret, value) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
}
async function signCookie(payload, secret) {
  const body = encJson(payload);
  return body + "." + b64u(await hmac(secret, body));
}
async function readSignedCookie(request, name, secret) {
  const cookies = request.headers.get("Cookie") || "";
  const found = cookies.split(";").map(x => x.trim()).find(x => x.startsWith(name + "="));
  if (!found) return null;
  const token = found.slice(name.length + 1);
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const actual = decodeB64u(parts[1]);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  if (!await crypto.subtle.verify("HMAC", key, actual, new TextEncoder().encode(parts[0]))) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(decodeB64u(parts[0])));
    if (!payload || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}
function redirect(url, cookieValues = [], extra = {}) {
  const headers = new Headers({ location: url, "cache-control": "no-store", ...extra });
  for (const value of cookieValues) headers.append("set-cookie", value);
  return new Response(null, { status: 302, headers });
}
function cookie(name, value, maxAge) {
  return name + "=" + value + "; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=" + maxAge;
}
function clearCookie(name) {
  return name + "=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0";
}
function cors(request, env) {
  const origin = request.headers.get("Origin");
  if (origin !== env.APP_ORIGIN) return {};
  return {
    "access-control-allow-origin": env.APP_ORIGIN,
    "access-control-allow-credentials": "true",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "vary": "Origin"
  };
}
function configError(env) {
  const required = ["OPENAI_OAUTH_CLIENT_ID", "SESSION_ENCRYPTION_SECRET", "OPENAI_API_KEY", "OPENAI_MODEL", "OPENAI_INPUT_MICRO_USD_PER_1M", "OPENAI_OUTPUT_MICRO_USD_PER_1M"];
  return required.filter(key => !env[key] || !String(env[key]).trim());
}
function issuer(env) {
  return (env.OPENAI_ISSUER || "https://auth.openai.com").replace(/\\/$/, "");
}
let discoveryCache = null;
async function discovery(env) {
  if (discoveryCache && discoveryCache.until > Date.now()) return discoveryCache.value;
  const response = await fetch(issuer(env) + "/.well-known/openid-configuration", { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error("OpenID provider discovery failed");
  const value = await response.json();
  if (value.issuer !== issuer(env) || !value.authorization_endpoint || !value.token_endpoint || !value.jwks_uri) throw new Error("Unexpected OpenID provider metadata");
  discoveryCache = { value, until: Date.now() + 10 * 60 * 1000 };
  return value;
}
function parseJwt(token) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Malformed ID token");
  return { head: JSON.parse(new TextDecoder().decode(decodeB64u(parts[0]))), claims: JSON.parse(new TextDecoder().decode(decodeB64u(parts[1]))), signingInput: parts[0] + "." + parts[1], signature: decodeB64u(parts[2]) };
}
let jwksCache = null;
async function getJwks(uri) {
  if (jwksCache && jwksCache.uri === uri && jwksCache.until > Date.now()) return jwksCache.value;
  const response = await fetch(uri, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error("OpenID signing keys unavailable");
  const value = await response.json();
  if (!Array.isArray(value.keys)) throw new Error("Invalid OpenID signing keys");
  jwksCache = { uri, value, until: Date.now() + 10 * 60 * 1000 };
  return value;
}
async function verifyIdToken(token, expectedNonce, env, metadata) {
  const { head, claims, signingInput, signature } = parseJwt(token);
  if (head.alg !== "RS256" || !head.kid) throw new Error("Unsupported ID token signature");
  const jwks = await getJwks(metadata.jwks_uri);
  const jwk = jwks.keys.find(k => k.kid === head.kid && k.kty === "RSA" && (!k.use || k.use === "sig"));
  if (!jwk) throw new Error("ID token key not found");
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  if (!await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature, new TextEncoder().encode(signingInput))) throw new Error("Invalid ID token signature");
  const now = Math.floor(Date.now() / 1000);
  const audOk = claims.aud === env.OPENAI_OAUTH_CLIENT_ID || (Array.isArray(claims.aud) && claims.aud.includes(env.OPENAI_OAUTH_CLIENT_ID));
  if (claims.iss !== issuer(env) || !audOk || (Array.isArray(claims.aud) && claims.aud.length > 1 && claims.azp !== env.OPENAI_OAUTH_CLIENT_ID) ||
      !claims.sub || !claims.exp || claims.exp <= now || claims.iat > now + 60 || claims.nonce !== expectedNonce) {
    throw new Error("ID token claims did not validate");
  }
  return claims;
}
function integer(value, fallback, min, max) {
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= min && n <= max ? n : fallback;
}
function validPlan(p) {
  if (!p || p.type !== "funebra.geometry98.artificial-value" || p.version !== 1 || p.intent !== "create" || !p.scene) return false;
  const s = p.scene, a = s.parameters, sample = s.sampling, style = s.style, motion = s.motion;
  if (!SHAPES.has(s.kind) || !a || !sample || !style || !motion) return false;
  if (![a.size, a.radius, a.centerX, a.centerY, a.centerZ].every(Number.isFinite) ||
      a.size < 10 || a.size > 240 || a.radius < 5 || a.radius > 120 ||
      Math.abs(a.centerX) > 800 || Math.abs(a.centerY) > 600 || Math.abs(a.centerZ) > 400) return false;
  if (!SAMPLING.has(sample.mode) || !Number.isInteger(sample.points) || sample.points < 8 || sample.points > 240) return false;
  if (!/^#[0-9a-fA-F]{6}$/.test(style.color) || !GLYPHS.has(style.glyph)) return false;
  if (typeof motion.enabled !== "boolean" || ![motion.rotateX, motion.rotateY, motion.rotateZ].every(Number.isFinite) ||
      [motion.rotateX, motion.rotateY, motion.rotateZ].some(v => Math.abs(v) > 0.05)) return false;
  return typeof p.explanation === "string" && p.explanation.length <= 240;
}
const SCHEMA = {
  type: "object", additionalProperties: false,
  properties: {
    type: { type: "string", enum: ["funebra.geometry98.artificial-value"] },
    version: { type: "integer", enum: [1] },
    intent: { type: "string", enum: ["create"] },
    scene: {
      type: "object", additionalProperties: false,
      properties: {
        kind: { type: "string", enum: ["circle", "cube", "sphere"] },
        parameters: {
          type: "object", additionalProperties: false,
          properties: {
            size: { type: "number", minimum: 10, maximum: 240 },
            radius: { type: "number", minimum: 5, maximum: 120 },
            centerX: { type: "number", minimum: -800, maximum: 800 },
            centerY: { type: "number", minimum: -600, maximum: 600 },
            centerZ: { type: "number", minimum: -400, maximum: 400 }
          },
          required: ["size", "radius", "centerX", "centerY", "centerZ"]
        },
        sampling: {
          type: "object", additionalProperties: false,
          properties: {
            mode: { type: "string", enum: ["perimeter", "edges", "surface"] },
            points: { type: "integer", minimum: 8, maximum: 240 }
          },
          required: ["mode", "points"]
        },
        style: {
          type: "object", additionalProperties: false,
          properties: { color: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" }, glyph: { type: "string", enum: ["dot", "circle"] } },
          required: ["color", "glyph"]
        },
        motion: {
          type: "object", additionalProperties: false,
          properties: {
            enabled: { type: "boolean" },
            rotateX: { type: "number", minimum: -0.05, maximum: 0.05 },
            rotateY: { type: "number", minimum: -0.05, maximum: 0.05 },
            rotateZ: { type: "number", minimum: -0.05, maximum: 0.05 }
          },
          required: ["enabled", "rotateX", "rotateY", "rotateZ"]
        }
      },
      required: ["kind", "parameters", "sampling", "style", "motion"]
    },
    explanation: { type: "string" }
  },
  required: ["type", "version", "intent", "scene", "explanation"]
};
async function sessionFor(request, env) {
  return readSignedCookie(request, SESSION_COOKIE, env.SESSION_ENCRYPTION_SECRET);
}
async function openAiResponse(prompt, env) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: "Bearer " + env.OPENAI_API_KEY, "content-type": "application/json" },
    body: JSON.stringify({
      model: env.OPENAI_MODEL,
      store: false,
      max_output_tokens: integer(env.MAX_OUTPUT_TOKENS, 500, 100, 800),
      input: [
        { role: "system", content: "Convert the user's request into one Geometry98 artificial.value scene plan. Use only circle, cube, or sphere. Return the exact schema. Do not return code, HTML, selectors, URLs, or instructions to execute code. Use center 400,300,0 by default, a restrained point count, green #00c853 by default, and motion only when requested." },
        { role: "user", content: prompt }
      ],
      text: { format: { type: "json_schema", name: "geometry98_scene_plan", strict: true, schema: SCHEMA } }
    })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error("Model request failed (" + response.status + ")");
  let text = "";
  for (const item of body.output || []) {
    if (item.type === "message") for (const part of item.content || []) if (part.type === "output_text") text += part.text || "";
  }
  if (!text) throw new Error("Model returned no scene plan");
  const plan = JSON.parse(text);
  if (!validPlan(plan)) throw new Error("Model scene plan failed validation");
  return { plan, usage: body.usage || null };
}
function costMicroUsd(tokens, rateMicroUsdPerMillion) {
  return Math.ceil(tokens * rateMicroUsdPerMillion / 1_000_000);
}
async function ledger(env, action, data) {
  const stub = env.USAGE_LEDGER.get(env.USAGE_LEDGER.idFromName("funebra-account"));
  return stub.fetch("https://usage/" + action, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
}
async function apiScene(request, env) {
  const session = await sessionFor(request, env);
  if (!session) return json({ error: "Sign in with ChatGPT to use Geometry98 AI." }, 401, cors(request, env));
  const missing = configError(env);
  if (missing.length) return json({ error: "AI service is not configured.", missing }, 503, cors(request, env));
  const ch = cors(request, env);
  let raw;
  try { raw = await request.text(); } catch { return json({ error: "Invalid request body." }, 400, ch); }
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return json({ error: "Request too large." }, 413, ch);
  let body;
  try { body = JSON.parse(raw); } catch { return json({ error: "Invalid JSON request." }, 400, ch); }
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const maxPrompt = integer(env.MAX_PROMPT_CHARS, 1200, 100, 2000);
  if (!prompt || prompt.length > maxPrompt) return json({ error: "Enter a prompt up to " + maxPrompt + " characters." }, 400, ch);
  const promptBytes = new TextEncoder().encode(prompt).length;
  const maxInput = integer(env.MAX_INPUT_BYTES, 8000, 1000, 20000);
  if (promptBytes > maxInput) return json({ error: "Prompt exceeds the configured byte limit." }, 413, ch);
  const inputRate = integer(env.OPENAI_INPUT_MICRO_USD_PER_1M, -1, 1, 1_000_000_000);
  const outputRate = integer(env.OPENAI_OUTPUT_MICRO_USD_PER_1M, -1, 1, 1_000_000_000);
  if (inputRate < 0 || outputRate < 0) return json({ error: "Model pricing is not configured." }, 503, ch);
  const maxOutput = integer(env.MAX_OUTPUT_TOKENS, 500, 100, 800);
  // Reserve using the full configured input byte ceiling plus max output tokens before calling the paid API.
  const reserve = costMicroUsd(maxInput + 5000, inputRate) + costMicroUsd(maxOutput, outputRate);
  const id = crypto.randomUUID();
  const cap = integer(env.MONTHLY_CAP_MICRO_USD, CAP_DEFAULT_MICRO_USD, 1000, CAP_DEFAULT_MICRO_USD);
  const limit = integer(env.MAX_REQUESTS_PER_MINUTE, 5, 1, 30);
  const identityHash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(session.sub));
  const userKey = b64u(new Uint8Array(identityHash));
  const reservation = await ledger(env, "reserve", { id, user: userKey, reserve, cap, limit });
  const reserved = await reservation.json();
  if (!reservation.ok) return json({ error: reserved.error || "Monthly AI budget limit reached.", usage: reserved }, 429, ch);
  try {
    const result = await openAiResponse(prompt, env);
    const usage = result.usage;
    const actual = usage && Number.isInteger(usage.input_tokens) && Number.isInteger(usage.output_tokens)
      ? costMicroUsd(usage.input_tokens, inputRate) + costMicroUsd(usage.output_tokens, outputRate)
      : reserve;
    const settled = await ledger(env, "settle", { id, actual });
    const meter = await settled.json();
    if (!settled.ok) return json({ error: "Usage could not be recorded; the AI result is withheld.", usage: meter }, 503, ch);
    return json({ artificial: result.plan, usage: meter }, 200, ch);
  } catch (error) {
    await ledger(env, "release", { id }).catch(() => {});
    return json({ error: error instanceof Error ? error.message : "AI request failed." }, 502, ch);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(request, env) });
    if (url.pathname === "/health" && request.method === "GET") {
      const missing = configError(env);
      return json({ ok: missing.length === 0, configured: missing.length === 0, missing });
    }
    if (url.pathname === "/auth/openai/start" && request.method === "GET") {
      if (!env.OPENAI_OAUTH_CLIENT_ID || !env.SESSION_ENCRYPTION_SECRET) return json({ error: "Authentication is not configured." }, 503);
      try {
        const meta = await discovery(env);
        const state = b64u(crypto.getRandomValues(new Uint8Array(24)));
        const nonce = b64u(crypto.getRandomValues(new Uint8Array(24)));
        const verifier = b64u(crypto.getRandomValues(new Uint8Array(32)));
        const challenge = b64u(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
        if (!env.WORKER_ORIGIN) throw new Error("WORKER_ORIGIN is not configured");
        const redirectUrl = env.WORKER_ORIGIN.replace(/\/$/, "") + "/auth/openai/callback";
        const tx = await signCookie({ state, nonce, verifier, redirect: redirectUrl, exp: Math.floor(Date.now() / 1000) + TX_SECONDS }, env.SESSION_ENCRYPTION_SECRET);
        const auth = new URL(meta.authorization_endpoint);
        auth.searchParams.set("client_id", env.OPENAI_OAUTH_CLIENT_ID);
        auth.searchParams.set("response_type", "code");
        auth.searchParams.set("redirect_uri", redirectUrl);
        auth.searchParams.set("scope", "openid profile email");
        auth.searchParams.set("state", state);
        auth.searchParams.set("nonce", nonce);
        auth.searchParams.set("code_challenge", challenge);
        auth.searchParams.set("code_challenge_method", "S256");
        return redirect(auth.toString(), [cookie(TX_COOKIE, tx, TX_SECONDS)]);
      } catch {
        return json({ error: "Could not start ChatGPT sign-in." }, 503);
      }
    }
    if (url.pathname === "/auth/openai/callback" && request.method === "GET") {
      const tx = await readSignedCookie(request, TX_COOKIE, env.SESSION_ENCRYPTION_SECRET);
      const state = url.searchParams.get("state");
      const code = url.searchParams.get("code");
      if (!tx || !state || state !== tx.state || !code) return new Response("Sign-in could not be verified. Close this page and retry.", { status: 400, headers: { "set-cookie": clearCookie(TX_COOKIE), "cache-control": "no-store" } });
      try {
        const meta = await discovery(env);
        const form = new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: tx.redirect, client_id: env.OPENAI_OAUTH_CLIENT_ID, code_verifier: tx.verifier });
        const tokenHeaders = { "content-type": "application/x-www-form-urlencoded", accept: "application/json" };
        if (env.OPENAI_OAUTH_CLIENT_SECRET) tokenHeaders.authorization = "Basic " + btoa(env.OPENAI_OAUTH_CLIENT_ID + ":" + env.OPENAI_OAUTH_CLIENT_SECRET);
        const tokenResponse = await fetch(meta.token_endpoint, { method: "POST", headers: tokenHeaders, body: form });
        const tokenBody = await tokenResponse.json();
        if (!tokenResponse.ok || !tokenBody.id_token) throw new Error("Token exchange failed");
        const claims = await verifyIdToken(tokenBody.id_token, tx.nonce, env, meta);
        const sessionToken = await signCookie({ sub: claims.sub, email: typeof claims.email === "string" ? claims.email : null, exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS }, env.SESSION_ENCRYPTION_SECRET);
        return redirect(env.APP_ORIGIN + "/engine/geometry98/?ai=connected", [cookie(SESSION_COOKIE, sessionToken, SESSION_SECONDS), clearCookie(TX_COOKIE)], { "referrer-policy": "no-referrer" });
      } catch {
        return new Response("ChatGPT sign-in failed validation. Please try again.", { status: 502, headers: { "set-cookie": clearCookie(TX_COOKIE), "cache-control": "no-store" } });
      }
    }
    if (url.pathname === "/api/auth/status" && request.method === "GET") {
      const session = await sessionFor(request, env);
      return json({ signedIn: !!session, email: session && session.email }, session ? 200 : 401, cors(request, env));
    }
    if (url.pathname === "/api/auth/logout" && request.method === "POST") {
      return json({ signedOut: true }, 200, { ...cors(request, env), "set-cookie": clearCookie(SESSION_COOKIE) });
    }
    if (url.pathname === "/api/geometry98/scene" && request.method === "POST") return apiScene(request, env);
    if (url.pathname === "/api/usage" && request.method === "GET") {
      if (!await sessionFor(request, env)) return json({ error: "Sign in required." }, 401, cors(request, env));
      const response = await ledger(env, "status", { cap: integer(env.MONTHLY_CAP_MICRO_USD, CAP_DEFAULT_MICRO_USD, 1000, CAP_DEFAULT_MICRO_USD) });
      return json(await response.json(), response.status, cors(request, env));
    }
    return json({ error: "Not found." }, 404);
  }
};

export class UsageLedger {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.sql = ctx.storage.sql;
    this.sql.exec("CREATE TABLE IF NOT EXISTS month_usage (month TEXT PRIMARY KEY, settled INTEGER NOT NULL DEFAULT 0, reserved INTEGER NOT NULL DEFAULT 0)");
    this.sql.exec("CREATE TABLE IF NOT EXISTS reservations (id TEXT PRIMARY KEY, month TEXT NOT NULL, amount INTEGER NOT NULL, created_at INTEGER NOT NULL)");
    this.sql.exec("CREATE TABLE IF NOT EXISTS rate_buckets (user_key TEXT NOT NULL, minute INTEGER NOT NULL, count INTEGER NOT NULL, PRIMARY KEY(user_key, minute))");
  }
  async fetch(request) {
    const action = new URL(request.url).pathname.slice(1);
    const data = await request.json();
    const month = new Date().toISOString().slice(0, 7);
    // Reclaim abandoned pre-call reservations after an interrupted request.
    this.ctx.storage.transactionSync(() => {
      const cutoff = Date.now() - 60 * 60 * 1000;
      this.sql.exec("DELETE FROM reservations WHERE created_at < ?", cutoff);
      this.sql.exec("UPDATE month_usage SET reserved=COALESCE((SELECT SUM(amount) FROM reservations WHERE reservations.month=month_usage.month),0)");
    });
    if (action === "reserve") {
      let result = { ok: false, error: "Monthly AI budget limit reached." };
      this.ctx.storage.transactionSync(() => {
        const prior = this.sql.exec("SELECT id FROM reservations WHERE id = ?", data.id).toArray();
        if (prior.length) { result = { ok: false, error: "Duplicate reservation." }; return; }
        const bucket = Math.floor(Date.now() / 60000);
        const userKey = data.user;
        const rateRows = this.sql.exec("SELECT count FROM rate_buckets WHERE user_key = ? AND minute = ?", userKey, bucket).toArray();
        const count = rateRows.length ? rateRows[0].count : 0;
        if (count >= data.limit) { result = { ok: false, error: "Request rate limit reached." }; return; }
        this.sql.exec("INSERT INTO rate_buckets(user_key, minute, count) VALUES(?, ?, 1) ON CONFLICT(user_key, minute) DO UPDATE SET count=count+1", userKey, bucket);
        this.sql.exec("DELETE FROM rate_buckets WHERE minute < ?", bucket - 2);
        this.sql.exec("INSERT INTO month_usage(month, settled, reserved) VALUES(?, 0, 0) ON CONFLICT(month) DO NOTHING", month);
        const usage = this.sql.exec("SELECT settled, reserved FROM month_usage WHERE month = ?", month).toArray()[0];
        if (usage.settled + usage.reserved + data.reserve > data.cap) return;
        this.sql.exec("INSERT INTO reservations(id, month, amount, created_at) VALUES(?, ?, ?, ?)", data.id, month, data.reserve, Date.now());
        this.sql.exec("UPDATE month_usage SET reserved = reserved + ? WHERE month = ?", data.reserve, month);
        result = { ok: true, month, settledMicroUsd: usage.settled, reservedMicroUsd: usage.reserved + data.reserve, capMicroUsd: data.cap };
      });
      return Response.json(result, { status: result.ok ? 200 : 429 });
    }
    if (action === "settle") {
      let result = { ok: false, error: "Reservation missing." };
      this.ctx.storage.transactionSync(() => {
        const rows = this.sql.exec("SELECT month, amount FROM reservations WHERE id = ?", data.id).toArray();
        if (!rows.length) return;
        const row = rows[0], actual = Math.max(0, Math.floor(data.actual));
        this.sql.exec("UPDATE month_usage SET reserved=MAX(0,reserved-?), settled=settled+? WHERE month=?", row.amount, actual, row.month);
        this.sql.exec("DELETE FROM reservations WHERE id=?", data.id);
        const usage = this.sql.exec("SELECT settled, reserved FROM month_usage WHERE month=?", row.month).toArray()[0];
        result = { ok: true, month: row.month, settledMicroUsd: usage.settled, reservedMicroUsd: usage.reserved, capMicroUsd: Number(data.cap || CAP_DEFAULT_MICRO_USD), remainingMicroUsd: Math.max(0, Number(data.cap || CAP_DEFAULT_MICRO_USD) - usage.settled - usage.reserved) };
      });
      return Response.json(result, { status: result.ok ? 200 : 404 });
    }
    if (action === "release") {
      this.ctx.storage.transactionSync(() => {
        const rows = this.sql.exec("SELECT month, amount FROM reservations WHERE id = ?", data.id).toArray();
        if (!rows.length) return;
        this.sql.exec("UPDATE month_usage SET reserved=MAX(0,reserved-?) WHERE month=?", rows[0].amount, rows[0].month);
        this.sql.exec("DELETE FROM reservations WHERE id=?", data.id);
      });
      return Response.json({ ok: true });
    }
    if (action === "status") {
      const rows = this.sql.exec("SELECT settled, reserved FROM month_usage WHERE month = ?", month).toArray();
      const usage = rows[0] || { settled: 0, reserved: 0 };
      const cap = Number(data.cap || CAP_DEFAULT_MICRO_USD);
      return Response.json({ month, settledMicroUsd: usage.settled, reservedMicroUsd: usage.reserved, capMicroUsd: cap, remainingMicroUsd: Math.max(0, cap - usage.settled - usage.reserved) });
    }
    return json({ error: "Not found." }, 404);
  }
}