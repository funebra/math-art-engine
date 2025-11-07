// funebra-aides.module.js — A.I.D.E.S (AI Descriptive & Interactive Display Enhancement System)
// ESM, no deps. Drop-in helper for self-describing UIs.
// © pLabs / Funebra. MIT-like prototype license.

const DEFAULTS = {
  mode: 'assistive',            // 'assistive' | 'auto' | 'dev' | 'silent'
  language: 'en',               // BCP-47 tag
  output: 'tooltip',            // 'tooltip' | 'voice' | 'both' | 'json' | 'silent'
  enableKeyboardHints: true,    // Alt+Shift+A toggle
  speakOn: 'first-hover',       // 'always' | 'first-hover' | 'focus-only' | 'never'
  tooltipDelayMs: 180,
  maxTextLen: 140,
  scanSelectors: [
    'button, [role="button"]',
    'a[href], [role="link"]',
    'input, select, textarea',
    '[role], [aria-label], [aria-labelledby]',
    '[data-aides], [data-tooltip], [title]',
    '[class*="btn"], [class*="icon"], [class*="tab"], [class*="slider"]'
  ],
  tooltipZ: 2147483000,
  observeMutations: true,
  funebraHints: true            // leverage Funebra naming if present
};

const AIDES_STYLE = `
.aides-tip{
  position:fixed;max-width:min(380px,80vw);padding:10px 12px;border-radius:12px;
  background:rgba(12,14,22,.96);color:#e7ecff;border:1px solid #293042;
  font:13px/1.5 system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;
  box-shadow:0 10px 30px rgba(0,0,0,.35);pointer-events:none;transform:translate(-50%,-120%);
  white-space:normal;word-wrap:break-word;z-index:2147483000
}
.aides-tip .aux{display:block;margin-top:6px;color:#9aa3b2;font-size:12px;opacity:.9}
.aides-focus-ring{outline:2px dashed #63f5cc;outline-offset:2px;border-radius:8px}
.aides-dev-panel{
  position:fixed;inset:auto 12px 12px auto;width:min(420px,90vw);max-height:60vh;overflow:auto;
  background:#0b0d12;border:1px solid #293042;border-radius:14px;padding:12px;z-index:2147483000;
  color:#e7ecff;font:12px/1.4 system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;display:none
}
.aides-dev-panel h3{margin:0 0 8px;font-size:13px}
.aides-dev-panel details{margin:6px 0}
.aides-dev-badge{
  position:fixed;inset:12px 12px auto auto;background:#111720;border:1px solid #293042;
  color:#e7ecff;border-radius:10px;padding:6px 10px;z-index:2147483000;cursor:pointer;
  font:12px/1 system-ui
}
`;

// Small utilities
const clamp = (n,min,max)=>Math.max(min,Math.min(max,n));
const isVisible = el => {
  const r = el.getBoundingClientRect();
  const style = getComputedStyle(el);
  return r.width>0 && r.height>0 && style.visibility!=='hidden' && style.display!=='none';
};
const normText = s => (s||'').replace(/\s+/g,' ').trim();
const cut = (s, n)=> s.length>n ? s.slice(0,n-1)+'…' : s;
const once = fn => { let ran=false; return (...a)=>{ if(!ran){ran=true; return fn(...a);} }; };

class Tooltip {
  constructor(z){ 
    this.el = document.createElement('div');
    this.el.className = 'aides-tip';
    this.el.style.zIndex = String(z);
    this._aux = document.createElement('span');
    this._aux.className = 'aux';
    this.el.appendChild(this._aux);
    document.body.appendChild(this.el);
    this.hide();
  }
  show(x,y, text, aux=''){
    this.el.style.display='block';
    this.el.firstChild.nodeType===3 ? (this.el.firstChild.nodeValue=text) : (this.el.childNodes[0]?.remove());
    const textNode = document.createTextNode(text);
    this.el.insertBefore(textNode, this._aux);
    this._aux.textContent = aux;
    const vw = Math.max(document.documentElement.clientWidth||0, window.innerWidth||0);
    const top = clamp(y-12, 12, window.innerHeight-12);
    const left = clamp(x, 12, vw-12);
    this.el.style.left = left+'px';
    this.el.style.top  = top+'px';
  }
  hide(){ this.el.style.display='none'; }
}

function say(text, lang){
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang || navigator.language || 'en';
  window.speechSynthesis.speak(u);
}

// Heuristic descriptor builder
function describeElement(el, opts){
  if (!el) return { text:'', aux:'', conf:0.0 };
  const tag = el.tagName?.toLowerCase() || '';
  const role = el.getAttribute?.('role') || '';
  const ariaLabel = el.getAttribute?.('aria-label') || '';
  const labelledby = el.getAttribute?.('aria-labelledby');
  let labelledbyText = '';
  if (labelledby){
    const labEl = document.getElementById(labelledby);
    labelledbyText = labEl ? labEl.textContent : '';
  }
  const dataAides = el.getAttribute?.('data-aides') || '';
  const dataTip = el.getAttribute?.('data-tooltip') || '';
  const title = el.getAttribute?.('title') || '';
  const placeholder = el.getAttribute?.('placeholder') || '';
  const value = (el.value && typeof el.value === 'string') ? el.value : '';
  const textContent = normText(el.textContent);

  // Funebra-specific hints
  const funebraName = opts.funebraHints ? (
    el.getAttribute?.('data-funebra-name') ||
    el.getAttribute?.('data-funebra-control') ||
    (el.id?.toLowerCase().includes('funebra') ? el.id : '')
  ) : '';

  const candidates = [
    dataAides, dataTip, ariaLabel, labelledbyText, title, placeholder, funebraName,
    (tag==='input'||tag==='textarea'||tag==='select') ? value : '',
    textContent
  ].map(normText).filter(Boolean);

  // Confidence heuristic
  let conf = 0;
  if (dataAides) conf += 0.45;
  if (ariaLabel || labelledbyText) conf += 0.25;
  if (title) conf += 0.15;
  if (funebraName) conf += 0.15;
  if (textContent) conf += 0.10;
  conf = clamp(conf, 0, 1);

  // Role phrasing
  let prefix = '';
  if (role) prefix = role;
  else if (tag==='button') prefix = 'button';
  else if (tag==='a') prefix = 'link';
  else if (tag==='input') prefix = (el.type||'input');
  else if (tag==='select') prefix = 'menu';
  else if (tag==='textarea') prefix = 'text field';
  else if (tag==='img') prefix = 'image';
  else if (tag==='label') prefix = 'label';

  const best = candidates[0] || '';
  let text = best;
  if (prefix && best && !best.toLowerCase().startsWith(prefix)) text = `${prefix}: ${best}`;
  if (!text) {
    // Fallback structural hint
    const cls = (el.className||'').toString().split(/\s+/).find(c => /btn|icon|tab|slider|ctrl/i.test(c)) || '';
    text = cls ? `${prefix||'control'}: ${cls.replace(/[-_]/g,' ')}` : (prefix||'control');
  }

  // Aux info
  const hasHotkey = el.getAttribute?.('accesskey');
  const aux = [
    role && `role=${role}`,
    hasHotkey && `hotkey ${hasHotkey}`,
    el.disabled ? 'disabled' : '',
    (tag==='input' && el.type) ? `type=${el.type}` : '',
  ].filter(Boolean).join(' · ');

  return { text: cut(text, opts.maxTextLen), aux, conf };
}

function buildSelectorList(list){ return Array.from(new Set(list)).join(','); }

const AIDES = (() => {
  let cfg = { ...DEFAULTS };
  let tip, styleTag, devPanel, devBadge;
  let enabled = true;
  let hoveredOnce = new WeakSet();
  let mo;

  function injectStyle(){
    if (styleTag) return;
    styleTag = document.createElement('style');
    styleTag.textContent = AIDES_STYLE.replace('2147483000', String(cfg.tooltipZ));
    document.head.appendChild(styleTag);
  }

  function ensureTip(){ if (!tip) tip = new Tooltip(cfg.tooltipZ); }

  function ensureDevUI(){
    if (devPanel) return;
    devPanel = document.createElement('div');
    devPanel.className = 'aides-dev-panel';
    devPanel.innerHTML = `<h3>A.I.D.E.S — Dev Map</h3><div class="body"></div>`;
    document.body.appendChild(devPanel);

    devBadge = document.createElement('button');
    devBadge.className = 'aides-dev-badge';
    devBadge.textContent = 'AIDES ▸';
    devBadge.onclick = () => {
      const show = devPanel.style.display !== 'block';
      devPanel.style.display = show ? 'block' : 'none';
      devBadge.textContent = show ? 'AIDES ▾' : 'AIDES ▸';
      if (show) refreshDevMap();
    };
    document.body.appendChild(devBadge);
  }

  function refreshDevMap(){
    if (!devPanel) return;
    const body = devPanel.querySelector('.body');
    const nodes = scan();
    body.innerHTML = '';
    nodes.slice(0, 400).forEach(n => {
      const d = describeElement(n, cfg);
      const det = document.createElement('details');
      const sum = document.createElement('summary');
      sum.textContent = `${d.text}  (conf ${Math.round(d.conf*100)}%)`;
      det.appendChild(sum);
      const pre = document.createElement('pre');
      pre.textContent = (n.outerHTML || '').toString().slice(0, 300).replace(/\s+/g,' ');
      det.appendChild(pre);
      body.appendChild(det);
    });
  }

  function scan(){
    const selector = buildSelectorList(cfg.scanSelectors);
    const els = Array.from(document.querySelectorAll(selector)).filter(isVisible);
    return els;
  }

  function onHover(e){
    if (!enabled || cfg.output==='silent') return;
    const el = e.target;
    if (!(el instanceof Element)) return;

    const { text, aux } = describeElement(el, cfg);
    if (!text) return;

    if (cfg.output==='tooltip' || cfg.output==='both'){
      ensureTip();
      const r = el.getBoundingClientRect();
      tip.show(r.left + r.width/2, r.top - 6 + window.scrollY, text, aux);
      el.classList.add('aides-focus-ring');
    }
    if ((cfg.output==='voice' || cfg.output==='both') && cfg.speakOn!=='never'){
      const firstOnly = cfg.speakOn==='first-hover';
      const shouldSpeak = (!firstOnly) || (firstOnly && !hoveredOnce.has(el));
      if (shouldSpeak){
        say(text, cfg.language);
        hoveredOnce.add(el);
      }
    }
  }

  function onOut(e){
    const el = e.target;
    if (tip) tip.hide();
    if (el?.classList) el.classList.remove('aides-focus-ring');
  }

  function onFocus(e){
    if (!enabled || cfg.output==='silent') return;
    const el = e.target;
    const { text, aux } = describeElement(el, cfg);
    if (!text) return;
    if (cfg.output==='tooltip' || cfg.output==='both'){
      ensureTip();
      const r = el.getBoundingClientRect();
      tip.show(r.left + r.width/2, r.top - 6 + window.scrollY, text, aux);
    }
    if ((cfg.output==='voice' || cfg.output==='both') && (cfg.speakOn==='focus-only' || cfg.speakOn==='always')){
      say(text, cfg.language);
    }
  }

  function onBlur(){ if (tip) tip.hide(); }

  const toggle = () => { enabled = !enabled; if (!enabled && tip) tip.hide(); return enabled; };

  function attach(){
    injectStyle();
    document.addEventListener('mouseover', onHover);
    document.addEventListener('mouseout', onOut);
    document.addEventListener('focusin', onFocus);
    document.addEventListener('focusout', onBlur);

    if (cfg.mode==='dev') ensureDevUI();
    if (cfg.observeMutations){
      mo = new MutationObserver(()=>{ if (cfg.mode==='dev' && devPanel?.style.display==='block') refreshDevMap(); });
      mo.observe(document.documentElement, {childList:true, subtree:true, attributes:true});
    }

    if (cfg.enableKeyboardHints){
      document.addEventListener('keydown', (e)=>{
        if (e.altKey && e.shiftKey && e.code==='KeyA'){
          const state = toggle();
          if (state && (cfg.mode==='dev')) ensureDevUI();
        }
      });
    }
  }

  // Public API
  return {
    init(options={}){
      cfg = { ...DEFAULTS, ...options };
      attach();
      return this;
    },
    describe(el){ return describeElement(el, cfg); },
    scan(){ return scan(); },
    exportJSON(){
      return scan().map(el => {
        const d = describeElement(el, cfg);
        return {
          selector: el.id ? `#${el.id}` : el.className ? `.${el.className.toString().split(/\s+/).join('.')}` : el.tagName?.toLowerCase(),
          text: d.text, aux: d.aux, conf: d.conf
        };
      });
    },
    toggle,
    setMode(mode){ cfg.mode = mode; if (mode==='dev') ensureDevUI(); },
    setOutput(o){ cfg.output = o; },
    setLanguage(lang){ cfg.language = lang; },
    destroy(){
      document.removeEventListener('mouseover', onHover);
      document.removeEventListener('mouseout', onOut);
      document.removeEventListener('focusin', onFocus);
      document.removeEventListener('focusout', onBlur);
      mo?.disconnect?.();
      tip?.el?.remove?.(); devPanel?.remove?.(); devBadge?.remove?.(); styleTag?.remove?.();
    }
  };
})();

export { AIDES as default };
