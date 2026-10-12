// <vs-chip-outline> — native Web Component. ZERO dependencies. Copy this one
// file, then use <vs-chip-outline label="Chip" selectable> anywhere: React,
// Svelte, Vue, vanilla. Standard customElements API — no framework, no runtime.
//
// Standalone variant of VsChip. Unique effect: conic BORDER spinning around
// the chip (marching outline), active on hover and when selected. Pure CSS
// (@property + conic-gradient mask), no JS-driven animation. Tokens with
// fallbacks; reduced-motion aware.
//
// Renders as a <button> when selectable, otherwise behaves like a plain
// <span> (interactive semantics stripped in #sync) — mirrors the SFC's
// :is(selectable ? 'button' : 'span').

const HTMLElement = globalThis.HTMLElement ?? class {}; // SSR: no DOM on the server

// A property set before this element was defined — by Vue, Svelte or React
// before the script ran, or by any code that got to the element first — lands
// as an own property that hides the class setter, and the component never sees
// it. Each connect hands such properties back to the setter.
const vsUpgradeProps = (el, keys) => {
  for (const k of keys) {
    if (!Object.prototype.hasOwnProperty.call(el, k)) continue;
    const v = el[k];
    delete el[k];
    el[k] = v;
  }
};

// CSS ported verbatim from VsChipOutline.vue (scoped `.vco`).
const CSS = `
  :host { display: inline-flex; }
  :host([hidden]) { display: none; }

  .vco {
    --h: var(--ctrl-h-md, 28px);
    --px: 11px;
    --fs: var(--ctrl-fs-md, 13px);
    --gap: 6px;
    --rr: var(--ctrl-r-pill, 999px);
    --bw: 1px;
    --accent: var(--ui-accent, #ededed);
    --ring: var(--inp-ring, var(--ui-ring, 255 255 255));
    --solid-fg: var(--badge-solid-fg, #0b0b0b);

    position: relative;
    isolation: isolate;
    display: inline-flex;
    align-items: center;
    gap: var(--gap);
    height: var(--h);
    padding: 0 var(--px);
    border: none;
    border-radius: var(--rr);
    font: inherit;
    font-size: var(--fs);
    font-weight: 500;
    line-height: 1;
    white-space: nowrap;
    user-select: none;
    color: var(--inp-text, #ededed);
    /* LINE-ONLY chip: the conic ring IS the surface — no fill behind it */
    background: transparent;
    transition: color 200ms ease, background-color 200ms ease;
  }
  .vco.is-clickable { cursor: pointer; }
  :host([data-scheme=light]) .vco__ring { --vco-lo: .11; }

  /* animated conic border via mask. Two layers in one ring: a quiet hairline
     everywhere (--vco-base) plus two bright arcs (--vco-arc) that orbit. */
  .vco__ring {
    --vco-base: rgb(var(--ring) / var(--vco-lo, .14));
    --vco-arc: rgb(var(--ring) / var(--vco-lo, .14));
    position: absolute;
    inset: 0;
    z-index: 0;
    border-radius: inherit;
    padding: var(--bw);
    background: conic-gradient(
      from var(--vco-ang),
      var(--vco-base) 0deg,
      var(--vco-arc) 50deg,
      var(--vco-base) 110deg,
      var(--vco-base) 180deg,
      var(--vco-arc) 230deg,
      var(--vco-base) 290deg,
      var(--vco-base) 360deg
    );
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    mask-composite: exclude;
    pointer-events: none;
    transition: --vco-arc 260ms ease, --vco-base 260ms ease, inset 260ms cubic-bezier(.22,1,.36,1), opacity 220ms ease;
    animation: vco-spin 2.4s linear infinite paused;
  }
  /* soft (default): hairline at rest, the arcs light up and orbit on hover */
  .vco.is-clickable:hover:not(.is-disabled) .vco__ring,
  .vco.is-demo .vco__ring { --vco-base: rgb(var(--ring) / 0.2); --vco-arc: var(--accent); animation-play-state: running; }
  /* selected = stronger line, faster orbit, ink takes the accent — still no fill */
  .vco.is-selected .vco__ring { --vco-base: rgb(var(--ring) / 0.32); --vco-arc: var(--accent); animation-duration: 1.6s; animation-play-state: running; }
  .vco.is-selected { --bw: 1.5px; color: var(--accent); }

  @keyframes vco-spin {
    to { --vco-ang: 360deg; }
  }

  /* variants */
  /* outline: the arcs are always there (resting, still), they spin on hover */
  .vco--v-outline .vco__ring { --vco-base: rgb(var(--ring) / 0.2); --vco-arc: rgb(var(--ring) / 0.6); }
  /* solid: FILL-ONLY body. The ring steps 3px OUT and orbits around the pill
     (a separate halo line with a gap), so fill and line never share an edge */
  .vco--v-solid { background: var(--accent); color: var(--solid-fg); }
  .vco--v-solid .vco__ring { opacity: 0; inset: 0; }
  .vco--v-solid.is-clickable:hover:not(.is-disabled) .vco__ring,
  .vco--v-solid.is-demo .vco__ring,
  .vco--v-solid.is-selected .vco__ring { opacity: 1; inset: -4px; border-radius: calc(var(--rr) + 4px); }
  .vco--v-solid.is-selected { color: var(--solid-fg); }

  /* sizes */
  .vco--sm { --h: var(--ctrl-h-sm, 24px); --px: 9px; --fs: var(--ctrl-fs-sm, 12px); --gap: 5px; }
  .vco--lg { --h: var(--ctrl-h-lg, 32px); --px: 14px; --fs: var(--ctrl-fs-lg, 14px); --gap: 7px; }

  /* radii */
  .vco--r-subtle { --rr: var(--ctrl-r-sm, 7px); }
  .vco--r-rounded { --rr: var(--ctrl-r-md, 10px); }
  .vco--r-pill { --rr: var(--ctrl-r-pill, 999px); }

  .vco:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

  .vco__dot { position: relative; z-index: 1; width: 7px; height: 7px; border-radius: 999px; background: var(--accent); flex: 0 0 auto; }
  .vco.is-selected .vco__dot { background: currentColor; }
  .vco__avatar { position: relative; z-index: 1; display: inline-flex; margin-left: -3px; }
  .vco__avatar ::slotted(img), .vco__avatar ::slotted(*) { width: 1.45em; height: 1.45em; border-radius: 999px; object-fit: cover; }
  .vco__check { position: relative; z-index: 1; flex: 0 0 auto; margin-left: -1px; width: 1em; height: 1em; }
  .vco__close svg { width: 1em; height: 1em; }
  .vco__label { position: relative; z-index: 1; }

  .vco__close {
    position: relative;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.25em;
    height: 1.25em;
    margin-right: -3px;
    padding: 0;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: inherit;
    font-size: inherit;
    cursor: pointer;
    opacity: 0.7;
    transition: opacity 160ms ease, background-color 160ms ease;
  }
  .vco__close:hover:not(:disabled) { opacity: 1; background: rgb(var(--ring) / 0.25); }
  .vco__close:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }

  /* tones */
  .vco--t-danger { --accent: #ff6369; --ui-accent-fg: #fff; --ring: 255 99 105; --solid-fg: #160405; }
  .vco--t-warn { --accent: #ffb224; --ui-accent-fg: #160f02; --ring: 255 178 36; --solid-fg: #160f02; }
  .vco--t-success { --accent: #4cc38a; --ui-accent-fg: #fff; --ring: 76 195 138; --solid-fg: #04120b; }

  .vco.is-disabled { opacity: 0.5; cursor: not-allowed; }
  .vco.is-disabled .vco__close { cursor: not-allowed; }

  @media (prefers-reduced-motion: reduce) {
    .vco, .vco__close { transition: none; }
    .vco__ring { animation: none; transition: none; }
  }
`;

// @property is ignored inside a shadow root, so the angle/colours the ring
// animates are registered on the document once — without this the conic
// ring never actually spins (an unregistered custom property only flips).
for (const [name, syntax, initialValue] of [['--vco-ang', '<angle>', '0deg'], ['--vco-base', '<color>', 'transparent'], ['--vco-arc', '<color>', 'transparent']]) {
  try { globalThis.CSS?.registerProperty?.({ name, syntax, inherits: false, initialValue }); } catch { /* already registered */ }
}

// ── theme: data-scheme on the host so light can drop shadows/halos ───────────
const _schemeHosts = new Set();
let _schemeMo = null;
function _schemeOf(host) {
  const scope = host.closest?.('[data-theme-scope]');
  return (scope && scope.getAttribute('data-theme-scope')) || document.documentElement.getAttribute('data-theme') || 'dark';
}
function watchScheme(host) {
  host.setAttribute('data-scheme', _schemeOf(host) === 'light' ? 'light' : 'dark');
  _schemeHosts.add(host);
  if (!_schemeMo && globalThis.MutationObserver) {
    _schemeMo = new MutationObserver(() => { for (const h of _schemeHosts) h.setAttribute('data-scheme', _schemeOf(h) === 'light' ? 'light' : 'dark'); });
    _schemeMo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }
  return () => _schemeHosts.delete(host);
}

// ── demo loop for the catalog card: plays steps while visible, hands the chip
// back (onHold) the moment a real pointer/focus lands on it, never runs on the
// server. It only paints look-alike states — no attribute, no event. ─────────
class ChipDemo {
  #host; #steps; #onHold; #i = 0; #t = 0; #io = null; #vis = true; #held = false; #on = false;
  constructor(host, steps, onHold) { this.#host = host; this.#steps = steps; this.#onHold = onHold; }
  #enter = () => { this.#held = true; clearTimeout(this.#t); this.#onHold?.(); };
  #leave = () => { this.#held = false; this.#arm(900); };
  start() {
    if (this.#on) return; this.#on = true; this.#i = 0;
    this.#host.addEventListener('pointerenter', this.#enter);
    this.#host.addEventListener('pointerleave', this.#leave);
    this.#host.addEventListener('focusin', this.#enter);
    this.#host.addEventListener('focusout', this.#leave);
    if (globalThis.IntersectionObserver) {
      this.#io = new IntersectionObserver((es) => { this.#vis = es[0]?.isIntersecting ?? true; if (this.#vis) this.#arm(400); else clearTimeout(this.#t); });
      this.#io.observe(this.#host);
    }
    this.#arm(600);
  }
  stop() {
    if (!this.#on) return; this.#on = false; clearTimeout(this.#t);
    this.#io?.disconnect(); this.#io = null;
    this.#host.removeEventListener('pointerenter', this.#enter);
    this.#host.removeEventListener('pointerleave', this.#leave);
    this.#host.removeEventListener('focusin', this.#enter);
    this.#host.removeEventListener('focusout', this.#leave);
    this.#onHold?.();
  }
  #arm(ms) {
    clearTimeout(this.#t);
    if (!this.#on || this.#held || !this.#vis) return;
    this.#t = setTimeout(() => {
      if (!this.#on || this.#held) return;
      const [fn, wait] = this.#steps[this.#i % this.#steps.length];
      this.#i++;
      try { fn(); } catch { /* demo must never throw into the page */ }
      this.#arm(wait);
    }, ms);
  }
}

const SVGNS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs) {
  const el = document.createElementNS(SVGNS, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

// check-mark icon (shown when selected)
function buildCheckIcon() {
  const svg = svgEl('svg', { class: 'vco__check', viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': 'true' });
  svg.append(
    svgEl('path', { d: 'M12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22Z', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
    svgEl('path', { d: 'M7.75 11.9999L10.58 14.8299L16.25 9.16992', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
  );
  return svg;
}

// close (x) icon for the removable button
function buildCloseIcon() {
  const svg = svgEl('svg', { viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': 'true' });
  svg.append(
    svgEl('path', { d: 'M6 6L18 18', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
    svgEl('path', { d: 'M18 6L6 18', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
  );
  return svg;
}

// `color` — repaints the component's BASE color (white ink on dark, black on
// light) with any CSS color, by overriding the design tokens it reads on the
// host. Semantic tones are untouched: a tone class declares --accent on the
// element itself, which beats these inherited host tokens.
let vsBrandProbe;
function vsBrandRgb(value) {
  vsBrandProbe ||= document.createElement('canvas').getContext('2d');
  if (!vsBrandProbe) return null;
  vsBrandProbe.fillStyle = '#000';
  vsBrandProbe.fillStyle = value; // any CSS color → normalized #rrggbb / rgba()
  const s = vsBrandProbe.fillStyle;
  if (s.charAt(0) === '#') return [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
  const m = s.match(/[\d.]+/g);
  return m && m.length >= 3 ? [+m[0], +m[1], +m[2]] : null;
}
const VS_BRAND_TOKENS = ['--ui-accent', '--inp-accent', '--btn-primary-bg', '--card-ink', '--ui-ring', '--inp-ring', '--fx-tint', '--ring', '--rip', '--ui-accent-fg', '--badge-solid-fg', '--btn-primary-fg', '--accent-fg', '--btn-primary-rip', '--btn-primary-glow', '--btn-primary-bg-hover', '--vs-color', '--vs-color-rgb', '--vs-color-fg'];
function vsApplyColor(host, value) {
  const rgb = value ? vsBrandRgb(String(value).trim()) : null;
  if (!rgb) { for (const t of VS_BRAND_TOKENS) host.style.removeProperty(t); return; }
  // relative luminance → the ink that stays legible ON the new fill
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const lum = 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
  const light = lum > 0.45;
  const fill = `rgb(${rgb[0]} ${rgb[1]} ${rgb[2]})`;
  const hover = rgb.map((c) => Math.round(light ? c * 0.92 : c + (255 - c) * 0.16));
  const set = (t, v) => host.style.setProperty(t, v);
  for (const t of ['--ui-accent', '--inp-accent', '--btn-primary-bg', '--card-ink']) set(t, fill);
  set('--btn-primary-bg-hover', `rgb(${hover[0]} ${hover[1]} ${hover[2]})`);
  for (const t of ['--ui-ring', '--inp-ring', '--fx-tint', '--ring', '--rip']) set(t, rgb.join(' '));
  for (const t of ['--ui-accent-fg', '--badge-solid-fg', '--btn-primary-fg', '--accent-fg']) set(t, light ? '#0b0b0b' : '#ffffff');
  for (const t of ['--btn-primary-rip', '--btn-primary-glow']) set(t, light ? '0 0 0' : '255 255 255');
  // opt-in handle: only exists while `color` is set, so a component can wire
  // its own base colour with var(--vs-color, <its default>) and stay untouched otherwise
  set('--vs-color', fill);
  set('--vs-color-rgb', rgb.join(' '));
  set('--vs-color-fg', light ? '#0b0b0b' : '#ffffff');
}

class VsChipOutline extends HTMLElement {
  static observedAttributes = ['label', 'variant', 'size', 'radius', 'tone',
    'selectable', 'model-value', 'dot', 'removable', 'disabled', 'color', 'demo'];

  #root; #chip; #ring; #avatarSlot; #dotEl; #checkEl; #labelWrap; #labelSlot; #closeBtn;
  #onClick; #onCloseClick;
  #unscheme = null;
  #demo = null; #demoPhase = 0; // 0 rest · 1 hover look · 2 selected look

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = CSS;

    // Built once as a <button>; when not selectable we strip interactive
    // semantics in #sync() (no type/disabled/tabindex/role) so it behaves
    // visually and semantically like the SFC's plain <span>.
    const chip = document.createElement('button');
    chip.className = 'vco';
    this.#chip = chip;

    // animated conic-border ring
    const ring = document.createElement('span');
    ring.className = 'vco__ring';
    ring.setAttribute('aria-hidden', 'true');
    this.#ring = ring;

    // avatar slot (named) — shown only when it has assigned nodes
    const avatarSlot = document.createElement('span');
    avatarSlot.className = 'vco__avatar';
    const namedSlot = document.createElement('slot');
    namedSlot.setAttribute('name', 'avatar');
    avatarSlot.append(namedSlot);
    this.#avatarSlot = avatarSlot;

    // dot (shown when no avatar content and dot=true)
    const dotEl = document.createElement('span');
    dotEl.className = 'vco__dot';
    dotEl.setAttribute('aria-hidden', 'true');
    this.#dotEl = dotEl;

    // check icon (shown when selected)
    this.#checkEl = buildCheckIcon();

    // label: default slot with attribute-driven fallback text
    const labelWrap = document.createElement('span');
    labelWrap.className = 'vco__label';
    const labelSlot = document.createElement('slot');
    const fallback = document.createElement('span');
    labelSlot.append(fallback);
    labelWrap.append(labelSlot);
    this.#labelWrap = labelWrap;
    this.#labelSlot = fallback;

    // removable close button
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'vco__close';
    closeBtn.append(buildCloseIcon());
    this.#closeBtn = closeBtn;

    chip.append(ring, avatarSlot, dotEl, this.#checkEl, labelWrap, closeBtn);
    this.#root.append(style, chip);

    // detect avatar slot content to prefer avatar over dot, mirroring $slots.avatar
    namedSlot.addEventListener('slotchange', () => this.#sync());

    this.#onClick = () => this.#onChipClick();
    this.#onCloseClick = (e) => this.#onRemove(e);
  }

  connectedCallback() {
    vsUpgradeProps(this, ['modelValue', 'selectable', 'disabled']);

    vsApplyColor(this, this.getAttribute('color'));
    this.#chip.addEventListener('click', this.#onClick);
    this.#closeBtn.addEventListener('click', this.#onCloseClick);
    this.#unscheme = watchScheme(this);
    this.#sync();
    this.#syncDemo();
  }

  disconnectedCallback() {
    this.#chip.removeEventListener('click', this.#onClick);
    this.#closeBtn.removeEventListener('click', this.#onCloseClick);
    this.#demo?.stop();
    this.#unscheme?.();
  }

  #setPhase(n) { if (this.#demoPhase !== n) { this.#demoPhase = n; this.#sync(); } }
  #syncDemo() {
    if (!this.hasAttribute('demo') || !this.isConnected) { this.#demo?.stop(); return; }
    this.#demo ||= new ChipDemo(this, [
      [() => this.#setPhase(1), 2200], // arcs light up and orbit
      [() => this.#setPhase(2), 2400], // selected: check + stronger line
      [() => this.#setPhase(0), 1300], // back to the quiet hairline
    ], () => this.#setPhase(0));
    this.#demo.start();
  }

  attributeChangedCallback(name) {
    vsApplyColor(this, this.getAttribute('color'));
    if (!this.#chip) return;
    if (name === 'demo') this.#syncDemo();
    this.#sync();
  }

  // reflected boolean/primitive props for ergonomic JS access
  get modelValue() { return this.hasAttribute('model-value'); }
  set modelValue(v) { v ? this.setAttribute('model-value', '') : this.removeAttribute('model-value'); }
  get selectable() { return this.hasAttribute('selectable'); }
  set selectable(v) { v ? this.setAttribute('selectable', '') : this.removeAttribute('selectable'); }
  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(v) { v ? this.setAttribute('disabled', '') : this.removeAttribute('disabled'); }

  #onChipClick() {
    const disabled = this.hasAttribute('disabled');
    const selectable = this.hasAttribute('selectable');
    if (disabled || !selectable) return;
    const next = !this.hasAttribute('model-value');
    if (next) this.setAttribute('model-value', ''); else this.removeAttribute('model-value');
    this.dispatchEvent(new CustomEvent('update:modelValue', { bubbles: true, composed: true, detail: next }));
    this.dispatchEvent(new CustomEvent('select', { bubbles: true, composed: true, detail: next }));
  }

  #onRemove(e) {
    if (this.hasAttribute('disabled')) return;
    e.stopPropagation();
    this.dispatchEvent(new CustomEvent('remove', { bubbles: true, composed: true }));
  }

  #sync() {
    const a = (n, d) => this.getAttribute(n) ?? d;
    const disabled = this.hasAttribute('disabled');
    const selectable = this.hasAttribute('selectable');
    const dot = this.hasAttribute('dot');
    const removable = this.hasAttribute('removable');
    const selected = selectable && this.hasAttribute('model-value');
    // the demo paints look-alike states only; aria-pressed keeps the real one
    const shownSel = selected || (this.#demoPhase === 2 && !disabled);
    const label = a('label', 'Chip');

    const hasAvatar = this.querySelector('[slot="avatar"]') != null;

    this.#chip.className = [
      'vco',
      `vco--${a('size', 'md')}`,
      `vco--v-${a('variant', 'soft')}`,
      `vco--r-${a('radius', 'pill')}`,
      `vco--t-${a('tone', 'default')}`,
      disabled ? 'is-disabled' : '',
      shownSel ? 'is-selected' : '',
      this.#demoPhase === 1 && !disabled ? 'is-demo' : '',
      selectable ? 'is-clickable' : '',
    ].filter(Boolean).join(' ');

    // <button> semantics only apply when selectable (mirrors SFC's :is(button|span))
    if (selectable) {
      this.#chip.type = 'button';
      this.#chip.disabled = disabled;
      this.#chip.setAttribute('aria-pressed', String(selected));
      this.#chip.removeAttribute('tabindex');
    } else {
      this.#chip.removeAttribute('type');
      this.#chip.disabled = false;
      this.#chip.removeAttribute('aria-pressed');
      this.#chip.setAttribute('tabindex', '-1');
    }

    this.#avatarSlot.style.display = hasAvatar ? '' : 'none';
    this.#dotEl.style.display = !hasAvatar && dot ? '' : 'none';
    this.#checkEl.style.display = shownSel ? '' : 'none';

    this.#labelSlot.textContent = label;

    this.#closeBtn.style.display = removable ? '' : 'none';
    this.#closeBtn.disabled = disabled;
    this.#closeBtn.setAttribute('aria-label', `Remove ${label}`);
  }
}

if (globalThis.customElements && !customElements.get('vs-chip-outline')) customElements.define('vs-chip-outline', VsChipOutline);
