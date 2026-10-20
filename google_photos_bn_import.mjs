import { buildImageBNConfiguration } from "./google_photos_bn_core.mjs";

const API_KEY = "funebra.googlePhotos.apiBase";
const SESSION_KEY = "funebra.googlePhotos.session";
const NEXT_BN_KEY = "funebra.imagebn.nextIndex";
const ASSET_CONTROL_KEY = "funebra.googlePhotos.assetControls";
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

function readAssetControls() {
  try { return JSON.parse(localStorage.getItem(ASSET_CONTROL_KEY) || "[]"); }
  catch { return []; }
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
  const exportButton = el("button", { type: "button", text: "Export BN configurations" });
  exportButton.hidden = true;
  const connectButton = el("button", { type: "button", text: "Connect Google Photos" });
  const importButton = el("button", { type: "button", text: "Import selected photo" });
  const regenerateButton = el("button", { type: "button", text: "Create another BN configuration" });
  regenerateButton.hidden = true;
  const deleteButton = el("button", { type: "button", text: "Delete imported source image" });
  deleteButton.hidden = true;
  const consent = el("input", { type: "checkbox", "aria-label": "I agree to import the selected photo into Funebra's private asset storage" });
  consent.style.width = "auto";
  const disclosure = el("p", { style: { margin: "8px 0", color: "#e5e9ed" } });
  disclosure.append(document.createTextNode("Google will let you choose one photo. Funebra sends that photo to its private Cloudflare R2 storage to create pixel-based BN configurations. The original stays stored until you delete it below. No other library photos are accessed. "));
  disclosure.append(el("a", { href: "./google_photos_data_notice.html", target: "_blank", rel: "noopener", text: "Read the data notice and deletion steps" }));
  const consentLabel = el("label", { style: { display: "flex", gap: "7px", alignItems: "flex-start", color: "#fff" } }, [
    consent,
    el("span", { text: "I agree to import the photo I select and store it as described above." }),
  ]);
  const panel = el("section", { id: "funebraGooglePhotosBN", "aria-label": "Google Photos to BN import" }, [
    el("strong", { text: "Google Photos → ImageBN" }),
    el("label", { text: "Import service URL" }), apiInput,
    el("label", { text: "Sample stride (source pixels)" }), strideInput,
    el("label", { text: "Maximum points" }), maxInput,
    disclosure, consentLabel, connectButton, importButton, regenerateButton, deleteButton, exportButton, status,
  ]);
  document.head.append(style);
  document.body.append(panel);

  const getApi = () => {
    const value = apiInput.value.trim().replace(/\/+$/, "");
    if (!/^https:\/\//i.test(value)) throw new Error("Enter the HTTPS URL of the configured import service first.");
    localStorage.setItem(API_KEY, value);
    return value;
  };
  const savedControls = readAssetControls();
  let selectedAssetControl = savedControls.at(-1) || null;
  let importedBlob = null;
  let currentAsset = null;
  const configurations = [];
  if (selectedAssetControl) deleteButton.hidden = false;
  const setStatus = value => { status.textContent = value; };
  if (selectedAssetControl) setStatus(`Saved source asset available for deletion: ${selectedAssetControl.filename}.`);

  connectButton.addEventListener("click", () => {
    try {
      if (!consent.checked) throw new Error("Read the data notice and check consent before connecting Google Photos.");
      location.href = `${getApi()}/auth/start`;
    }
    catch (error) { setStatus(error.message); }
  });

  exportButton.addEventListener("click", () => {
    if (!configurations.length) return;
    const value = { format: "funebra-image-bn-config-bundle-v0.1", configurations };
    const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const link = el("a", { href, download: `funebra-image-bn-${currentAsset.assetId}.json` });
    link.click();
    URL.revokeObjectURL(href);
  });

  async function createConfiguration() {
    if (!currentAsset || !importedBlob) throw new Error("Import a photo first.");
    const bitmap = await createImageBitmap(importedBlob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width; canvas.height = bitmap.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(bitmap, 0, 0);
    bitmap.close?.();
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const startIndex = Math.max(DEFAULT_START, Number(localStorage.getItem(NEXT_BN_KEY) || DEFAULT_START));
    const configuration = buildImageBNConfiguration({
      asset: currentAsset,
      rgba: pixels,
      stride: Number(strideInput.value || 8),
      maxPoints: Number(maxInput.value || 5000),
      startIndex,
    });
    localStorage.setItem(NEXT_BN_KEY, String(configuration.nextBNIndex));
    configurations.push(configuration);
    window.FunebraImageBN = { asset: currentAsset, configuration, configurations: structuredClone(configurations) };
    exportButton.hidden = false;
    regenerateButton.hidden = false;
    setStatus(`Configuration ${configurations.length}: ${currentAsset.filename} (${currentAsset.width}×${currentAsset.height}).\n${configuration.points.length} points, ${configuration.points[0]?.bn || "no visible pixels"}…${configuration.points.at(-1)?.bn || ""}. Source-pixel coordinates.\nF-0011 RegistryBN and PlotBN were not modified.`);
  }

  regenerateButton.addEventListener("click", async () => {
    try { await createConfiguration(); }
    catch (error) { setStatus(`Configuration failed: ${error.message}`); }
  });

  deleteButton.addEventListener("click", async () => {
    const asset = window.FunebraImageBN?.asset || selectedAssetControl;
    if (!asset?.assetId || !asset?.deleteToken) return;
    if (!window.confirm(`Permanently delete the imported source image “${asset.filename}” from the Funebra asset store? The exported BN configuration will remain.`)) return;
    try {
      const api = getApi();
      await fetch(`${api}/api/assets/${encodeURIComponent(asset.assetId)}`, {
        method: "DELETE", headers: { "X-Funebra-Asset-Delete-Key": asset.deleteToken },
      }).then(async response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
      });
      const remaining = readAssetControls().filter(item => item.assetId !== asset.assetId);
      localStorage.setItem(ASSET_CONTROL_KEY, JSON.stringify(remaining));
      selectedAssetControl = remaining.at(-1) || null;
      if (window.FunebraImageBN?.asset?.assetId === asset.assetId) window.FunebraImageBN.assetDeleted = true;
      deleteButton.hidden = !selectedAssetControl;
      setStatus("The imported source image and its asset record were deleted. Your in-memory BN configuration remains available to export.");
    } catch (error) { setStatus(`Delete failed: ${error.message}`); }
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
      // Persist deletion control immediately so a later content-fetch or canvas failure
      // cannot leave the user without a way to remove the durable source asset.
      currentAsset = asset;
      const controls = readAssetControls().filter(item => item.assetId !== asset.assetId);
      controls.push({ assetId: asset.assetId, filename: asset.filename, deleteToken: asset.deleteToken });
      localStorage.setItem(ASSET_CONTROL_KEY, JSON.stringify(controls.slice(-20)));
      selectedAssetControl = controls.at(-1);
      deleteButton.hidden = false;

      const imageResponse = await fetch(`${api}${asset.contentPath}`, { headers: { Authorization: `Bearer ${auth.token}` } });
      if (!imageResponse.ok) throw new Error(`Could not read imported asset (HTTP ${imageResponse.status}).`);
      importedBlob = await imageResponse.blob();
      configurations.length = 0;
      await createConfiguration();
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
