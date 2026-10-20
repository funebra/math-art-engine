const PICKER_SCOPE = "https://www.googleapis.com/auth/photospicker.mediaitems.readonly";
const SESSION_TTL = 3300;
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const ALLOW_HEADERS = "Authorization, Content-Type, X-Funebra-Asset-Delete-Key";

function randomToken(bytes = 32) {
  const value = crypto.getRandomValues(new Uint8Array(bytes));
  return [...value].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(value) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...headers } });
}

function corsHeaders(request, env) {
  const allowed = new URL(env.FRONTEND_URL).origin;
  const origin = request.headers.get("Origin");
  if (origin && origin !== allowed) throw new Error("origin_not_allowed");
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": ALLOW_HEADERS,
    "Access-Control-Max-Age": "600",
    "Vary": "Origin",
  };
}

async function googleFetch(url, token, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers },
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`google_api_${response.status}:${detail.slice(0, 300)}`);
  }
  return response;
}

async function readToken(request, env) {
  const match = /^Bearer ([A-Za-z0-9]+)$/.exec(request.headers.get("Authorization") || "");
  if (!match) return null;
  const key = await sha256Hex(match[1]);
  const data = await env.TOKENS.get(key, "json");
  return data ? { key, data } : null;
}

function parsePollMs(value) {
  const match = /^(\d+(?:\.\d+)?)s$/.exec(value || "");
  return match ? Math.min(10000, Math.max(1000, Number(match[1]) * 1000)) : 2500;
}

async function authStart(request, env) {
  const state = randomToken();
  await env.FLOWS.put(`state:${state}`, "1", { expirationTtl: 600 });
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: PICKER_SCOPE,
    state,
    access_type: "online",
    include_granted_scopes: "true",
  });
  return new Response(null, {
    status: 302,
    headers: {
      Location: `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
      "Set-Cookie": `gp_oauth_state=${state}; Max-Age=600; Path=/oauth/callback; Secure; HttpOnly; SameSite=Lax`,
      "Cache-Control": "no-store",
    },
  });
}

async function oauthCallback(request, env) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const cookieState = (request.headers.get("Cookie") || "").split(";").map(part => part.trim()).find(part => part.startsWith("gp_oauth_state="))?.slice("gp_oauth_state=".length);
  const clearStateCookie = "gp_oauth_state=; Max-Age=0; Path=/oauth/callback; Secure; HttpOnly; SameSite=Lax";
  if (!state || !code || state !== cookieState || !(await env.FLOWS.get(`state:${state}`))) {
    return new Response("Invalid or expired OAuth state.", { status: 400, headers: { "Set-Cookie": clearStateCookie, "Cache-Control": "no-store" } });
  }
  await env.FLOWS.delete(`state:${state}`);

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });
  const tokenData = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !tokenData.access_token) return new Response("Google authorization exchange failed.", { status: 502, headers: { "Set-Cookie": clearStateCookie } });
  if (!(tokenData.scope || "").split(" ").includes(PICKER_SCOPE)) return new Response("Google Photos Picker scope was not granted.", { status: 403, headers: { "Set-Cookie": clearStateCookie } });

  const sessionToken = randomToken();
  const tokenKey = await sha256Hex(sessionToken);
  const ttl = Math.max(60, Math.min(SESSION_TTL, Number(tokenData.expires_in) - 60 || SESSION_TTL));
  const expiresAt = Date.now() + ttl * 1000;
  await env.TOKENS.put(tokenKey, JSON.stringify({ accessToken: tokenData.access_token, expiresAt }), { expirationTtl: ttl });
  const handoffCode = randomToken(24);
  await env.FLOWS.put(`handoff:${handoffCode}`, JSON.stringify({ sessionToken, expiresAt }), { expirationTtl: 90 });
  const destination = new URL(env.FRONTEND_URL);
  destination.hash = new URLSearchParams({ google_photos_handoff: handoffCode }).toString();
  return new Response(null, { status: 302, headers: { Location: destination.toString(), "Set-Cookie": clearStateCookie, "Cache-Control": "no-store" } });
}

async function exchangeHandoff(request, env, cors) {
  const { handoffCode } = await request.json();
  if (typeof handoffCode !== "string" || !/^[a-f0-9]{48}$/.test(handoffCode)) return json({ error: "invalid_handoff" }, 400, cors);
  const key = `handoff:${handoffCode}`;
  const handoffData = await env.FLOWS.get(key, "json");
  if (!handoffData?.sessionToken) return json({ error: "handoff_expired" }, 401, cors);
  await env.FLOWS.delete(key);
  return json(handoffData, 200, cors);
}

async function createPickerSession(auth, env, cors) {
  const response = await googleFetch("https://photospicker.googleapis.com/v1/sessions", auth.data.accessToken, {
    method: "POST", body: "{}",
  });
  const session = await response.json();
  const sessionId = crypto.randomUUID();
  await env.PICKERS.put(`picker:${sessionId}`, JSON.stringify({ googleSessionId: session.id, owner: auth.key }), { expirationTtl: 900 });
  return json({ sessionId, pickerUri: session.pickerUri, pollIntervalMs: parsePollMs(session.pollingConfig?.pollInterval) }, 201, cors);
}

async function pickerStatus(auth, env, sessionId, cors) {
  const record = await env.PICKERS.get(`picker:${sessionId}`, "json");
  if (!record || record.owner !== auth.key) return json({ error: "picker_session_not_found" }, 404, cors);
  const response = await googleFetch(`https://photospicker.googleapis.com/v1/sessions/${encodeURIComponent(record.googleSessionId)}`, auth.data.accessToken);
  const result = await response.json();
  return json({ mediaItemsSet: result.mediaItemsSet === true }, 200, cors);
}

async function importPhoto(auth, env, sessionId, cors) {
  const pickerKey = `picker:${sessionId}`;
  const picker = await env.PICKERS.get(pickerKey, "json");
  if (!picker || picker.owner !== auth.key) return json({ error: "picker_session_not_found" }, 404, cors);
  const listUrl = new URL("https://photospicker.googleapis.com/v1/mediaItems");
  listUrl.searchParams.set("sessionId", picker.googleSessionId);
  const listResponse = await googleFetch(listUrl, auth.data.accessToken);
  const listData = await listResponse.json();
  if (listData.nextPageToken) return json({ error: "select_one_photo_per_import" }, 400, cors);
  const items = listData.mediaItems || [];
  if (items.length !== 1 || items[0].type !== "PHOTO") return json({ error: "select_exactly_one_photo" }, 400, cors);
  const picked = items[0];
  const media = picked.mediaFile || {};
  if (!media.baseUrl) return json({ error: "photo_has_no_download_url" }, 502, cors);
  const contentUrl = media.baseUrl.endsWith("=") ? `${media.baseUrl}d` : `${media.baseUrl}=d`;
  const imageResponse = await googleFetch(contentUrl, auth.data.accessToken);
  const contentType = imageResponse.headers.get("Content-Type") || media.mimeType || "application/octet-stream";
  if (!contentType.startsWith("image/")) return json({ error: "selected_item_is_not_an_image" }, 415, cors);
  const bytes = await imageResponse.arrayBuffer();
  if (bytes.byteLength > MAX_IMAGE_BYTES) return json({ error: "image_exceeds_25_mib_limit" }, 413, cors);

  const assetId = crypto.randomUUID();
  const contentHash = `sha256:${await sha256Hex(bytes)}`;
  const importedAt = new Date().toISOString();
  const deleteToken = randomToken();
  const dimensions = media.mediaFileMetadata || {};
  const asset = {
    assetId,
    filename: media.filename || `google-photos-${assetId}`,
    width: Number(dimensions.width),
    height: Number(dimensions.height),
    contentHash,
    importedAt,
    provenance: { source: "google-photos-picker", pickerMediaItemId: picked.id, sessionId: picker.googleSessionId },
    contentPath: `/api/assets/${assetId}/content`,
    ownerTokenKey: auth.key,
    deleteTokenHash: await sha256Hex(deleteToken),
    storageKey: `assets/${assetId}/source`,
  };
  if (!Number.isInteger(asset.width) || !Number.isInteger(asset.height) || asset.width < 1 || asset.height < 1) {
    return json({ error: "photo_dimensions_missing" }, 502, cors);
  }

  await env.ASSETS.put(asset.storageKey, bytes, {
    httpMetadata: { contentType },
    customMetadata: { assetId, contentHash, filename: asset.filename, width: String(asset.width), height: String(asset.height) },
  });
  await env.FLOWS.put(`asset:${assetId}`, JSON.stringify(asset));
  try {
    await googleFetch(`https://photospicker.googleapis.com/v1/sessions/${encodeURIComponent(picker.googleSessionId)}`, auth.data.accessToken, { method: "DELETE" });
  } finally {
    await env.PICKERS.delete(pickerKey);
  }
  const { ownerTokenKey, deleteTokenHash, storageKey, ...publicAsset } = asset;
  publicAsset.deleteToken = deleteToken;
  return json(publicAsset, 201, cors);
}

async function assetRoute(request, auth, env, assetId, action, cors) {
  const asset = await env.FLOWS.get(`asset:${assetId}`, "json");
  if (!asset) return json({ error: "asset_not_found" }, 404, cors);
  if (request.method === "DELETE" && action === "") {
    const providedKey = request.headers.get("X-Funebra-Asset-Delete-Key") || "";
    const keyMatches = providedKey && (await sha256Hex(providedKey)) === asset.deleteTokenHash;
    const sessionMatches = auth?.key === asset.ownerTokenKey;
    if (!keyMatches && !sessionMatches) return json({ error: "asset_delete_not_authorized" }, 403, cors);
    await env.ASSETS.delete(asset.storageKey);
    await env.FLOWS.delete(`asset:${assetId}`);
    return new Response(null, { status: 204, headers: cors });
  }
  if (!auth || asset.ownerTokenKey !== auth.key) return json({ error: "asset_not_found" }, 404, cors);
  if (action === "content" && request.method === "GET") {
    const object = await env.ASSETS.get(asset.storageKey);
    if (!object) return json({ error: "asset_bytes_missing" }, 404, cors);
    const headers = new Headers(cors);
    headers.set("Content-Type", object.httpMetadata?.contentType || "application/octet-stream");
    headers.set("Cache-Control", "private, max-age=300, no-store");
    headers.set("X-Content-SHA256", asset.contentHash);
    return new Response(object.body, { headers });
  }
  if (action === "" && request.method === "GET") {
    const { ownerTokenKey, storageKey, ...publicAsset } = asset;
    return json(publicAsset, 200, cors);
  }
  return json({ error: "not_found" }, 404, cors);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/health" && request.method === "GET") return json({ ok: true, service: "funebra-google-photos-bn" });
    if (url.pathname === "/auth/start" && request.method === "GET") return authStart(request, env);
    if (url.pathname === "/oauth/callback" && request.method === "GET") return oauthCallback(request, env);

    let cors;
    try { cors = corsHeaders(request, env); }
    catch { return json({ error: "origin_not_allowed" }, 403); }
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    try {
      if (url.pathname === "/api/auth/exchange" && request.method === "POST") return await exchangeHandoff(request, env, cors);
      const assetMatch = /^\/api\/assets\/([0-9a-f-]+)(\/content)?$/.exec(url.pathname);
      if (assetMatch && request.method === "DELETE") return await assetRoute(request, null, env, assetMatch[1], assetMatch[2] ? "content" : "", cors);
      const auth = await readToken(request, env);
      if (!auth) return json({ error: "session_required" }, 401, cors);
      if (url.pathname === "/api/picker-sessions" && request.method === "POST") return await createPickerSession(auth, env, cors);
      const pickerMatch = /^\/api\/picker-sessions\/([0-9a-f-]+)(\/import)?$/.exec(url.pathname);
      if (pickerMatch && !pickerMatch[2] && request.method === "GET") return await pickerStatus(auth, env, pickerMatch[1], cors);
      if (pickerMatch && pickerMatch[2] && request.method === "POST") return await importPhoto(auth, env, pickerMatch[1], cors);
      if (assetMatch) return await assetRoute(request, auth, env, assetMatch[1], assetMatch[2] ? "content" : "", cors);
      return json({ error: "not_found" }, 404, cors);
    } catch (error) {
      const message = String(error?.message || "internal_error");
      const status = message === "origin_not_allowed" ? 403 : 502;
      return json({ error: message.startsWith("google_api_") ? "google_photos_request_failed" : message }, status, cors);
    }
  },
};
