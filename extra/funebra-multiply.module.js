// funebra-multiply.module.js
//
// A tidy ES-module version of your demonstrator.
// - No eval, no layout magic numbers
// - Handles general 0..99 pairs for the base-100 complement method
// - Falls back to long multiplication narration when the base-100 trick isn't ideal
// - Narration in sw-TZ / en-US / da-DK (browser voices permitting)

export class FunebraMultiply {
  constructor(ui) {
    this.ui = ui;
    this.timer = null;
    this.interval = 4200;
    this.lang = 'sw-TZ';
    this.steps = [];
    this.stepIndex = 0;
    this.voicing = false;
  }

  setInterval(ms) { this.interval = Math.max(800, ms|0); }
  setLang(lang) { this.lang = lang; }

  reset() {
    this.pause();
    this.steps = [];
    this.stepIndex = 0;
    this.ui.kpi.textContent = '';
    this.ui.stream.innerHTML = '';
    this.ui.ytWrap.style.display = 'none';
    this.renderStatic(
      Number(this.ui.n1.value || 0),
      Number(this.ui.n2.value || 0)
    );
  }

  pause() {
    this.voicing = false;
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    window.speechSynthesis?.cancel?.();
  }

  start(n1, n2, opts={}) {
    if (opts.lang) this.lang = opts.lang;
    if (opts.interval) this.setInterval(opts.interval);

    this.pause();
    this.prepare(n1, n2);
    this.voicing = true;
    this.stepIndex = 0;
    this._tick();
  }

  step() {
    if (!this.steps.length) this.prepare(Number(this.ui.n1.value||0), Number(this.ui.n2.value||0));
    if (this.stepIndex >= this.steps.length) return;
    const s = this.steps[this.stepIndex++];
    this._applyStep(s, true);
  }

  _tick() {
    if (!this.voicing) return;
    if (this.stepIndex >= this.steps.length) { this.voicing = false; return; }
    const s = this.steps[this.stepIndex++];
    this._applyStep(s, true);
    this.timer = setTimeout(() => this._tick(), this.interval);
  }

  speak(text) {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = this.lang;
      window.speechSynthesis?.speak(u);
    } catch { /* ignore */ }
  }

  // Compute + build steps
  prepare(n1, n2) {
    this.steps = [];
    const clean = (n) => Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
    n1 = clean(n1); n2 = clean(n2);
    const result = n1 * n2;

    // Base-100 complements (works best when both <100)
    const useBase100 = n1 <= 99 && n2 <= 99;
    let steps = [];

    if (useBase100) {
      const a = 100 - n1; // complement of n1
      const b = 100 - n2; // complement of n2
      const sumComp = a + b;       // e.g., 37 + 63 = 100
      const dc = 100 - sumComp;    // left part
      const g = a * b;             // right part
      const right = String(g).padStart(2, '0'); // 2 digits for base-100

      // narrative chunks (math view)
      const f1 = [
        `<span class="c-green">${n1}</span> × <span class="c-blue">${n2}</span>`,
        `<span>100 − <span class="c-green">${n1}</span> = <span class="c-green">${a}</span></span>`,
        `<span>100 − <span class="c-blue">${n2}</span> = <span class="c-blue">${b}</span></span>`,
        `<span class="c-green">${a}</span> + <span class="c-blue">${b}</span> = <span class="c-yellow">${sumComp}</span>`,
        `<span>100 − <span class="c-yellow">${sumComp}</span> = <span class="c-pink">${dc}</span></span>`
      ];

      // split digits (tens/ones) for your original “6×3” flavor if a,b < 100
      const [aT, aU] = [Math.floor(a/10), a%10];
      const [bT, bU] = [Math.floor(b/10), b%10];
      const f2 = [
        `<span class="c-blue">${b}</span> × <span class="c-green">${a}</span>`,
        `<span><span class="c-green">${aT}</span> × <u class="c-blue">${bU}</u> = <span class="c-yellow">${aT*bU}</span></span>`,
        `<span class="c-yellow">${aT*bU}</span> × 100 = <span class="c-pink">${(aT*bU)*100}</span>`,
        `<span><span class="c-green">${aU}</span> × <u class="c-blue">${bT}</u> = <span class="c-pink">${aU*bT}</span></span>`,
        `<span><span class="c-green">${aU}</span> × <u class="c-blue">${bU}</u> = <span class="c-yellow">${aU*bU}</span></span>`,
        `<span class="c-yellow">${aU*bU}</span> + <span class="c-yellow">${aT*bT}</span> × 10 = <span class="c-pink">${(aU*bU + aT*bT)*10}</span>`
      ];

      const combo = (aT*bU)*100 + (aU*bT) + ((aU*bU + aT*bT)*10);
      const f3 = [
        `<span class="c-pink">${(aT*bU)*100}</span> + <span class="c-pink">${aU*bT}</span> + <span class="c-pink">${(aU*bU + aT*bT)*10}</span> = <span class="c-pink">${combo}</span>`,
        `<span class="c-pink">${dc}00</span> + <span class="c-pink">${right}</span> = <span class="c-pink">${dc*100 + g}</span>`
      ];

      // stream narration (Sw/En/Da auto text)
      const narrator = this._narrationBase100(n1, n2, a, b, sumComp, dc, g);

      steps = [
        { kind: 'renderF1', html: f1.join('<br>'), hero: `${n1} × ${n2}` , say: narrator[0] },
        { kind: 'renderF2', html: f2.join('<br>'), say: narrator[1] },
        { kind: 'renderF3', html: f3.join('<br>'), say: narrator[2] },
        { kind: 'kpi', value: `${result.toLocaleString()}`, say: narrator[3], celebrate: true }
      ];
    } else {
      // General fallback: short long-multiplication narration
      const parts = this._longMultiply(n1, n2);
      const f1 = [
        `<span class="c-green">${n1}</span> × <span class="c-blue">${n2}</span>`,
        `<span class="c-yellow">General method</span> (not base-100 friendly).`
      ];
      const f2 = parts.lines.map(l => `<span>${l}</span>`);
      const f3 = [`<span>Sum = <span class="c-pink">${result.toLocaleString()}</span></span>`];

      const narrator = this._narrationLong(n1, n2, parts, result);

      steps = [
        { kind: 'renderF1', html: f1.join('<br>'), hero: `${n1} × ${n2}`, say: narrator[0] },
        { kind: 'renderF2', html: f2.join('<br>'), say: narrator[1] },
        { kind: 'renderF3', html: f3.join('<br>'), say: narrator[2] },
        { kind: 'kpi', value: `${result.toLocaleString()}`, say: narrator[3], celebrate: true }
      ];
    }

    this.steps = steps;
    this.renderStatic(n1, n2);
  }

  renderStatic(n1, n2) {
    // Header hero text mirrors left operand (like your original)
    this.ui.heroText.innerHTML = `<span class="c-green">${n1}</span>`;
    // Clear panels until steps play
    this.ui.sum1.innerHTML = '';
    this.ui.sum2.innerHTML = '';
    this.ui.sum3.innerHTML = '';
    this.ui.kpi.textContent = '';
    this.ui.stream.innerHTML = `<span class="c-yellow">Ready:</span> <span class="mono">${n1} × ${n2}</span>`;
  }

  _applyStep(step, speak=true) {
    if (step.kind === 'renderF1') {
      this.ui.sum1.innerHTML = step.html;
      if (step.hero) this.ui.heroText.textContent = step.hero;
    }
    if (step.kind === 'renderF2') {
      this.ui.sum2.innerHTML = step.html;
    }
    if (step.kind === 'renderF3') {
      this.ui.sum3.innerHTML = step.html;
    }
    if (step.kind === 'kpi') {
      this.ui.kpi.textContent = step.value;
      if (step.celebrate) {
        this.ui.ytWrap.style.display = 'block'; // show the embedded video for the “finale”
      }
    }
    // stream area: append line
    const line = document.createElement('div');
    line.textContent = this._stripHtmlForStream(step);
    this.ui.stream.appendChild(line);
    this.ui.stream.scrollTop = this.ui.stream.scrollHeight;

    if (speak && step.say) this.speak(step.say);
  }

  _stripHtmlForStream(step) {
    const tmp = document.createElement('div');
    tmp.innerHTML = (step.html || step.value || '');
    const text = tmp.textContent || '';
    if (step.kind === 'kpi' && step.value) return `= ${step.value}`;
    return text.replace(/\s+/g, ' ').trim();
    // (keeps the stream readable; narration uses dedicated phrases)
  }

  _narrationBase100(n1, n2, a, b, sumComp, dc, g) {
    const right = String(g).padStart(2, '0');
    const locale = this.lang.slice(0,2);

    const lines = {
      sw: [
        `${n1} mara ${n2}. Tunatumia mbinu ya kamilisho la 100.`,
        `Kamilisho: 100 − ${n1} = ${a}, 100 − ${n2} = ${b}. Jumla ${a} + ${b} = ${sumComp}, hivyo upande wa kushoto ni ${dc}.`,
        `Upande wa kulia ni ${a} × ${b} = ${g} (andika kama ${right}).`,
        `Jibu: ${dc}00 + ${right} = ${dc*100 + g}.`
      ],
      en: [
        `${n1} times ${n2}. Using the base-100 complement trick.`,
        `Complements: 100 minus ${n1} is ${a}, 100 minus ${n2} is ${b}. Sum ${a} plus ${b} is ${sumComp}, so the left part is ${dc}.`,
        `Right part is ${a} times ${b} equals ${g} (write as ${right}).`,
        `Final: ${dc}00 plus ${right} equals ${dc*100 + g}.`
      ],
      da: [
        `${n1} gange ${n2}. Vi bruger 100-komplement metoden.`,
        `Komplementer: 100 minus ${n1} er ${a}, 100 minus ${n2} er ${b}. Summen ${a} + ${b} = ${sumComp}, så venstre del er ${dc}.`,
        `Højre del er ${a} × ${b} = ${g} (skriv som ${right}).`,
        `Svar: ${dc}00 + ${right} = ${dc*100 + g}.`
      ],
    };

    if (locale === 'sw') return lines.sw;
    if (locale === 'da') return lines.da;
    return lines.en;
  }

  _longMultiply(n1, n2) {
    // produce classic partial products lines
    const s1 = String(n1), s2 = String(n2);
    const rows = [];
    let shift = 0;
    for (let i=s2.length-1; i>=0; i--) {
      const digit = Number(s2[i]);
      const prod = n1 * digit;
      rows.push(`${n1} × ${digit}${shift ? ` × 10^${shift}` : ''} = ${ (prod * (10**shift)).toLocaleString() }`);
      shift++;
    }
    return { lines: rows.reverse() };
  }

}
