import { buildImageBNConfiguration } from "./google_photos_bn_core.mjs";

const API_KEY = "funebra.googlePhotos.apiBase";
const SESSION_KEY = "funebra.googlePhotos.session";
const NEXT_BN_KEY = "funebra.imagebn.nextIndex";
const DEFAULT_START = 9; // F-0011 owns bn0…bn8; ImageBN stays a separate registry.

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "text") node.textContent = value;
    else if (key === "style") Object.assign(node.style, value);
    else node.setAttribute(key, value);
  }
  for (const child of children) node.append(child);
  return node;
}

function readSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); }
  catch { return null; }
}

function clearHandoffFromUrl() {
  const hash = new URLSearchParams(location.hash.slice(1));
  const code = hash.get("google_photos_handoff");
  if (code) history.replaceState(null, "", location.pathname + location.search);
  return code;
}

async function jsonRequest(url, { token, ...options } = {}) {
  const headers = new Headers(options.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(url, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
  return body;
}

async function exchangeHandoff(apiBase, handoff) {
  const result = await jsonRequest(`${apiBase}/api/auth/exchange`, {
    method: "POST", body: JSON.stringify({ handoffCode: handoff }),
  });
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token: result.sessionToken, expiresAt: result.expiresAt }));
}

function buildPanel() {
  if (document.getElementById("funebraGooglePhotosBN")) return;
  const style = el("style", { text: `
    #funebraGooglePhotosBN{position:fixed;left:10px;bottom:12px;z-index:100000;background:#101820ee;color:#f4f7fa;
      width:min(390px,calc(100vw - 24px));padding:12px;border:1px solid #527080;border-radius:10px;
      box-shadow:0 4px 20px #0005;font:13px/1.4 system-ui,Arial}
    #funebraGooglePhotosBN label{display:block;margin:6px 0 3px;color:#c5d9e6}
    #funebraGooglePhotosBN input{box-sizing:border-box;width:100%;padding:6px;border-radius:5px;border:1px solid #748b97}
    #funebraGooglePhotosBN button{margin:8px 6px 0 0;padding:7px 10px;border:0;border-radius:5px;cursor:pointer}
    #funebraGooglePhotosBN [data-status]{min-height:2.6em;margin-top:8px;white-space:pre-wrap;color:#d7f0d2}
  ` });
  const apiInput = el("input", { type: "url", placeholder: "https://your-worker.example" });
  apiInput.value = localStorage.getItem(API_KEY) || "";
  const strideInput = el("input", { type: "number", min: "1", step: "1", value: "8", "aria-label": "Sampling stride in source pixels" });
  const maxInput = el("input", { type: "number", min: "1", max: "20000", step: "100", value: "5000", "aria-label": "Maximum BN points" });
  const status = el("div", { "data-status": "" });
  const exportButton = el("button", { type: "button", text: "Export BN configuration" });
  exportButton.hidden = true;
  const connectButton = el("button", { type: "button", text: "Connect Google Photos" });
  const importButton = el("button", { type: "button", text: "Import selected photo" });
  const panel = el("section", { id: "funebraGooglePhotosBN", "aria-label": "Google Photos to BN import" }, [
    el("strong", { text: "Google Photos → ImageBN" }),
    el("label", { text: "Import service URL" }), apiInput,
    el("label", { text: "Sample stride (source pixels)" }), strideInput,
    el("label", { text: "Maximum points" }), maxInput,
    connectButton, importButton, exportButton, status,
  ]);
  document.head.append(style);
  document.body.append(panel);

  const getApi = () => {
    const value = apiInput.value.trim().replace(/\/+$/, "");
    if (!/^https:\/\//i.test(value)) throw new Error("Enter the HTTPS URL of the configured import service first.");
    localStorage.setItem(API_KEY, value);
    return value;
  };
  const setStatus = value => { status.textContent = value; };

  connectButton.addEventListener("click", () => {
    try { location.href = `${getApi()}/auth/start`; }
    catch (error) { setStatus(error.message); }
  });

  exportButton.addEventListener("click", () => {
    const value = window.FunebraImageBN?.configuration;
    if (!value) return;
    const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const link = el("a", { href, download: `funebra-image-bn-${value.configurationId}.json` });
    link.click();
    URL.revokeObjectURL(href);
  });

  importButton.addEventListener("click", async () => {
    const popup = window.open("about:blank", "funebraGooglePhotosPicker");
    try {
      const api = getApi();
      const auth = readSession();
      if (!auth?.token || auth.expiresAt <= Date.now()) throw new Error("Connect Google Photos again; the temporary session has expired.");
      setStatus("Creating a user-selected photo session…");
      const picker = await jsonRequest(`${api}/api/picker-sessions`, { method: "POST", token: auth.token, body: "{}" });
      if (popup) popup.location.href = picker.pickerUri;
      else window.open(picker.pickerUri, "_blank", "noopener");

      let complete = false;
      const deadline = Date.now() + 10 * 60 * 1000;
      while (!complete && Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, Math.max(1000, picker.pollIntervalMs || 2500)));
        const state = await jsonRequest(`${api}/api/picker-sessions/${encodeURIComponent(picker.sessionId)}`, { token: auth.token });
        complete = state.mediaItemsSet === true;
        setStatus(complete ? "Photo selected. Importing durable asset…" : "Waiting for your selection in Google Photos…");
      }
      if (!complete) throw new Error("Picker session timed out; try again.");

      const asset = await jsonRequest(`${api}/api/picker-sessions/${encodeURIComponent(picker.sessionId)}/import`, {
        method: "POST", token: auth.token, body: "{}",
      });
      const imageResponse = await fetch(`${api}${asset.contentPath}`, { headers: { Authorization: `Bearer ${auth.token}` } });
      if (!imageResponse.ok) throw new Error(`Could not read imported asset (HTTP ${imageResponse.status}).`);
      const blob = await imageResponse.blob();
      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width; canvas.height = bitmap.height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.drawImage(bitmap, 0, 0);
      bitmap.close?.();
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      const startIndex = Math.max(DEFAULT_START, Number(localStorage.getItem(NEXT_BN_KEY) || DEFAULT_START));
      const configuration = buildImageBNConfiguration({
        asset, rgba: pixels,
        stride: Number(strideInput.value || 8),
        maxPoints: Number(maxInput.value || 5000),
        startIndex,
      });
      localStorage.setItem(NEXT_BN_KEY, String(configuration.nextBNIndex));
      window.FunebraImageBN = { asset, configuration };
      exportButton.hidden = false;
      setStatus(`Imported ${asset.filename} (${asset.width}×${asset.height}).\n${configuration.points.length} points, ${configuration.points[0]?.bn || "no visible pixels"}…${configuration.points.at(-1)?.bn || ""}. Source pixels retained as coordinates.\nF-0011 RegistryBN and PlotBN were not modified.`);
    } catch (error) {
      popup?.close();
      setStatus(`Import failed: ${error.message}`);
    }
  });

  return { setStatus, getApi };
}

async function init() {
  if (!document.body) return;
  const ui = buildPanel();
  const handoff = clearHandoffFromUrl();
  if (handoff) {
    try { await exchangeHandoff(ui.getApi(), handoff); ui.setStatus("Google Photos connected for this browser session."); }
    catch (error) { ui.setStatus(`Connection failed: ${error.message}`); }
  }
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
else init();
