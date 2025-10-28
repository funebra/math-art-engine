// funebra-gprs.js — Minimal client SDK for Funebra GPRS (Global Position Radar System)
// ESM module — import in browsers with <script type="module"> or from other ES modules.
// Provides: init, configure, subscribe, emit (local), emitRemote (POST), connectSSE, connectWS, disconnect,
//           startMock, stopMock, state access via GPRS._state
// No rendering here — purely data plumbing so you can reuse it across apps.

/** @typedef {Object} FGPPIn
 *  @property {number} lat - Latitude in degrees (-90 .. 90)
 *  @property {number} lon - Longitude in degrees (-180 .. 180)
 *  @property {number} [val=1.0] - Strength/weight of the event
 *  @property {string|string[]} [tag] - Tag(s) associated with the event
 *  @property {number|string|Date} [t] - Timestamp (ms epoch, ISO string, Date). If omitted, Date.now()
 *  @property {any} [p] - Optional payload/body
 */

/** @typedef {Object} FGPP
 *  @property {string} id
 *  @property {number} t
 *  @property {number} lat
 *  @property {number} lon
 *  @property {number} val
 *  @property {string[]} tag
 *  @property {any} p
 *  @property {string} u   - anonymized user id (local only)
 *  @property {string} app - app name
 *  @property {number} ver - schema version (1)
 */

const VERSION = '0.1.0';

// Small helpers
const _randId = (p='fgpp_') => p + Math.random().toString(36).slice(2);
const _anon = () => {
  const d = new Date();
  const salt = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
  const r = (self.crypto || window.crypto).getRandomValues(new Uint32Array(2));
  return `anon:${(r[0]^r[1]).toString(36)}:${btoa(salt).slice(0,6)}`;
};
const _toMs = (t) => t instanceof Date ? +t : (typeof t === 'string' ? Date.parse(t) : (typeof t === 'number' ? t : Date.now()));
const _asArray = (v) => Array.isArray(v) ? v : (v == null ? [] : [String(v)]);

// Internal mutable state
const _state = {
  app: 'funebra-web',
  uid: _anon(),
  total: 0,
  postUrl: '',
  streamUrl: '',
  token: '',       // used as Authorization header AND/OR as query param for SSE/WS
  live: null       // EventSource or WebSocket
};

/** Normalize various JSON shapes into an FGPP event
 * @param {FGPPIn|any} ev
 * @returns {FGPP}
 */
function _normalize(ev) {
  const lat = Number(ev.lat);
  const lon = Number(ev.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error('FGPP lat/lon must be numbers');
  }
  const t = _toMs(ev.t ?? ev.time ?? Date.now());
  const val = ev.val !== undefined ? Number(ev.val) : 1.0;
  const tag = _asArray(ev.tag);
  return {
    id: ev.id || _randId(),
    t,
    lat,
    lon,
    val: Number.isFinite(val) ? val : 1.0,
    tag,
    p: ev.p ?? null,
    u: _state.uid,
    app: _state.app,
    ver: 1
  };
}

// Subscribers
const _subs = new Set();
const _emitLocal = (fgpp) => { for (const fn of _subs) try { fn(fgpp); } catch (e) { console.warn('GPRS subscriber error', e); } };

// Public API
export const GPRS = {
  version: VERSION,
  /** Change app name, endpoints, or token */
  configure({ app, postUrl, streamUrl, token } = {}) {
    if (app !== undefined) _state.app = app;
    if (postUrl !== undefined) _state.postUrl = postUrl;
    if (streamUrl !== undefined) _state.streamUrl = streamUrl;
    if (token !== undefined) _state.token = token;
    return { ..._state };
  },
  /** Initialize once (alias of configure for ergonomics) */
  init(opts = {}) { return this.configure(opts); },

  /** Subscribe to local FGPP stream. Returns an unsubscribe function. */
  subscribe(_filter, cb) { _subs.add(cb); return () => _subs.delete(cb); },

  /** Emit a local event (does not POST). Returns normalized FGPP. */
  emit(payload) {
    const fgpp = _normalize(payload);
    _state.total++; _emitLocal(fgpp);
    return fgpp;
  },

  /** Emit to your server (JSON POST). Also echoes locally so the UI is instant. */
  async emitRemote(payload) {
    const fgpp = _normalize(payload);
    if (!_state.postUrl) { console.warn('GPRS.emitRemote: no postUrl configured, using local emit'); return this.emit(fgpp); }
    const hasQuery = _state.postUrl.includes('?');
    const url = _state.token
      ? `${_state.postUrl}${hasQuery ? '&' : '?'}token=${encodeURIComponent(_state.token)}`
      : _state.postUrl;
    const headers = { 'content-type': 'application/json' };
    if (_state.token) headers['authorization'] = `Bearer ${_state.token}`;
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(fgpp) });
    if (!res.ok) {
      const text = await res.text().catch(()=> '');
      console.warn('GPRS.emitRemote failed', res.status, text);
      // still emit locally so the user sees feedback
      _emitLocal(fgpp);
      return null;
    }
    _emitLocal(fgpp);
    return await res.json().catch(()=> fgpp);
  },

  /** Connect to Server-Sent Events (SSE). Messages must be JSON per line/chunk. */
  connectSSE(url) {
    this.disconnect();
    const full = _state.token ? `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(_state.token)}` : url;
    const es = new EventSource(full);
    _state.live = es;
    es.onmessage = (ev) => { try { const obj = JSON.parse(ev.data); _emitLocal(_normalize(obj)); } catch (e) { console.warn('GPRS SSE parse error', e); } };
    es.onerror = (err) => { console.warn('GPRS SSE error', err); };
    return es;
  },

  /** Connect to WebSocket stream. Each message should be a JSON string representing one FGPP-like object. */
  connectWS(url) {
    this.disconnect();
    const full = _state.token ? `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(_state.token)}` : url;
    const ws = new WebSocket(full);
    _state.live = ws;
    ws.onmessage = (ev) => { try { const obj = JSON.parse(ev.data); _emitLocal(_normalize(obj)); } catch (e) { console.warn('GPRS WS parse error', e); } };
    ws.onerror = (err) => { console.warn('GPRS WS error', err); };
    return ws;
  },

  /** Disconnect any live SSE/WS connection */
  disconnect() { try { _state.live?.close?.(); } catch {} _state.live = null; },

  /** Synthetic generator for demos — emits city jittered coordinates every 250ms */
  startMock() {
    if (this._mockTimer) return;
    const cities = [
      [55.6761,12.5683], [40.7128,-74.0060], [35.6762,139.6503], [51.5074,-0.1278],
      [-33.8688,151.2093], [1.3521,103.8198], [48.8566,2.3522], [37.5665,126.9780],
      [52.5200,13.4050], [6.5244,3.3792], [-1.2921,36.8219], [-23.5505,-46.6333]
    ];
    const jitter = (v, m=0.06)=> v + (Math.random()-0.5)*m;
    this._mockTimer = setInterval(() => {
      const pick = Math.random() < 0.85 ? cities[(Math.random()*cities.length)|0] : [(Math.random()*180-90), (Math.random()*360-180)];
      const lat = jitter(pick[0]); const lon = jitter(pick[1]);
      this.emit({ lat, lon, tag:['star'], val: Math.random()*0.9 + 0.1 });
    }, 250);
  },
  stopMock() { clearInterval(this._mockTimer); this._mockTimer = null; },

  /** Read-only snapshot of state */
  get _state() { return _state; }
};

export default GPRS;
