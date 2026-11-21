(() => {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const DAY = 1440;          // minutes in a day
  const STEP = 5;            // snap to 5 minutes
  const C = 210;             // dial centre (viewBox is 420 x 420)
  const R = 166;             // radius of the sleep band's centre line
  const FACE = 128;          // radius of the inner clock face
  const CAP = 22;            // half-width of the band / handle radius
  const KEY = 'sleep-ring:v1';

  const $ = (id) => document.getElementById(id);
  const svg = $('dial');
  const mod = (a, n = DAY) => ((a % n) + n) % n;
  const pad = (n) => String(n).padStart(2, '0');

  /* ---------- state ---------- */
  const defaults = { bed: 23 * 60, wake: 7 * 60 + 15, goal: 8, alarm: false };
  const state = { ...defaults, ...load() };

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (!s || typeof s !== 'object') return {};
      const out = {};
      const min = (v) => Number.isFinite(v) ? mod(Math.round(v / STEP) * STEP) : null;
      const bed = min(s.bed), wake = min(s.wake);
      if (bed !== null && wake !== null && bed !== wake) { out.bed = bed; out.wake = wake; }
      if (Number.isFinite(s.goal) && s.goal >= 4 && s.goal <= 12) out.goal = s.goal;
      if (typeof s.alarm === 'boolean') out.alarm = s.alarm;
      return out;
    } catch { return {}; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage unavailable */ }
  }

  const duration = () => mod(state.wake - state.bed);

  /* ---------- formatting ---------- */
  function fmtTime(m) {
    const h = Math.floor(m / 60) % 24, mm = m % 60;
    return `${h % 12 || 12}:${pad(mm)} ${h >= 12 ? 'PM' : 'AM'}`;
  }
  function fmtDur(m) {
    const h = Math.floor(m / 60), mm = m % 60;
    if (!h) return `${mm} min`;
    return mm ? `${h} hr ${mm} min` : `${h} hr`;
  }

  /* ---------- svg helpers ---------- */
  function el(name, attrs = {}, parent) {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  const pt = (min, r) => {
    const a = (min / DAY) * Math.PI * 2;
    return [C + r * Math.sin(a), C - r * Math.cos(a)];
  };
  function arcPath(r, startMin, durMin) {
    const [sx, sy] = pt(startMin, r);
    const [ex, ey] = pt(startMin + durMin, r);
    return `M${sx.toFixed(2)} ${sy.toFixed(2)}A${r} ${r} 0 ${durMin > DAY / 2 ? 1 : 0} 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`;
  }

  /* ---------- build the dial ---------- */
  el('circle', { class: 'track', cx: C, cy: C, r: R }, svg);
  const arcBody = el('path', { class: 'arc-body', 'data-drag': 'arc' }, svg);
  const arcTicks = el('path', { class: 'arc-ticks' }, svg);
  el('circle', { class: 'face', cx: C, cy: C, r: FACE }, svg);

  // minute ticks (every 15 min, bolder each hour)
  for (let m = 0; m < DAY; m += 15) {
    const hour = m % 60 === 0;
    const [x1, y1] = pt(m, hour ? 112 : 116);
    const [x2, y2] = pt(m, 121);
    el('line', { class: 'tick' + (hour ? ' hour' : ''), x1, y1, x2, y2 }, svg);
  }

  // labels every 2 hours: 12AM at the top, clockwise
  for (let h = 0; h < 24; h += 2) {
    const [x, y] = pt(h * 60, 93);
    const major = h % 6 === 0;
    const t = el('text', { class: 'lbl' + (major ? ' major' : ''), x, y }, svg);
    const n12 = h % 12 || 12;
    t.appendChild(document.createTextNode(String(n12)));
    if (major) {
      const ap = el('tspan', { class: 'ap' }, t);
      ap.textContent = h < 12 ? 'AM' : 'PM';
    }
  }

  // moon at 12AM, sun at 12PM
  const moon = el('g', { transform: `translate(${C} ${C - 64})` }, svg);
  el('path', { class: 'moon', d: 'M4 -10 A10 10 0 1 0 10 4 A8 8 0 0 1 4 -10Z' }, moon);
  const sun = el('g', { transform: `translate(${C} ${C + 64})` }, svg);
  el('circle', { class: 'sun-core', r: 5.5 }, sun);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    el('line', { class: 'sun-ray', x1: Math.sin(a) * 8.5, y1: -Math.cos(a) * 8.5, x2: Math.sin(a) * 11.5, y2: -Math.cos(a) * 11.5 }, sun);
  }

  // handles
  function makeHandle(kind, label, drawIcon) {
    const g = el('g', { class: 'handle', 'data-drag': kind, tabindex: 0, role: 'slider', 'aria-label': label, 'aria-valuemin': 0, 'aria-valuemax': DAY - STEP }, svg);
    el('circle', { class: 'cap', r: CAP }, g);
    el('circle', { class: 'hit', r: CAP + 8 }, g);
    drawIcon(el('g', { class: 'icon' }, g));
    return g;
  }
  const bedHandle = makeHandle('bed', 'Bedtime', (p) => {
    const g = el('g', { class: 'ico-fill' }, p);
    el('rect', { x: -11, y: -7, width: 3, height: 15, rx: 1.2 }, g);
    el('rect', { x: -11, y: 1.5, width: 22, height: 3.5, rx: 1 }, g);
    el('rect', { x: -6, y: -3.5, width: 6, height: 4, rx: 2 }, g);
    el('rect', { x: 2, y: -3.5, width: 9, height: 4, rx: 1.2 }, g);
  });
  const wakeHandle = makeHandle('wake', 'Wake up time', (p) => {
    const g = el('g', { class: 'ico-stroke' }, p);
    el('circle', { cx: 0, cy: 1, r: 7 }, g);
    el('path', { d: 'M0 -2.2 V1.2 L2.6 2.8' }, g);
    el('path', { d: 'M-10 -3 L-7 -7.5 M10 -3 L7 -7.5' }, g);
  });

  /* ---------- render ---------- */
  function render() {
    const d = duration();

    arcBody.setAttribute('d', arcPath(R, state.bed, d));
    const tickPad = 36; // keep ticks clear of the rounded handle caps
    if (d > tickPad * 2 + 10) {
      arcTicks.setAttribute('d', arcPath(R, state.bed + tickPad, d - tickPad * 2));
      arcTicks.style.display = '';
    } else {
      arcTicks.style.display = 'none';
    }

    const [bx, by] = pt(state.bed, R);
    const [wx, wy] = pt(state.wake, R);
    bedHandle.setAttribute('transform', `translate(${bx.toFixed(2)} ${by.toFixed(2)})`);
    wakeHandle.setAttribute('transform', `translate(${wx.toFixed(2)} ${wy.toFixed(2)})`);
    bedHandle.setAttribute('aria-valuenow', state.bed);
    bedHandle.setAttribute('aria-valuetext', fmtTime(state.bed));
    wakeHandle.setAttribute('aria-valuenow', state.wake);
    wakeHandle.setAttribute('aria-valuetext', fmtTime(state.wake));

    // header
    $('bedTime').textContent = fmtTime(state.bed);
    $('wakeTime').textContent = fmtTime(state.wake);
    const bedHour = state.bed / 60;
    $('bedDay').textContent = bedHour >= 18 || bedHour < 5 ? 'Tonight' : 'Today';
    $('wakeDay').textContent = state.wake < state.bed ? 'Tomorrow' : 'Same day';
    const alarmBtn = $('alarmToggle');
    alarmBtn.setAttribute('aria-pressed', String(state.alarm));
    $('alarmLabel').textContent = state.alarm ? 'WAKE UP - ALARM ON' : 'WAKE UP - NO ALARM';

    // summary
    const goalMin = Math.round(state.goal * 60);
    const short = goalMin - d;
    $('duration').textContent = fmtDur(d);
    const verdict = $('verdict');
    verdict.textContent = short <= 0
      ? 'This schedule meets your sleep goal.'
      : `This schedule is ${fmtDur(short)} short of your sleep goal.`;
    verdict.classList.toggle('short', short > 0);

    const ratio = d / goalMin;
    const bar = $('bar');
    bar.style.width = Math.min(ratio, 1) * 100 + '%';
    bar.classList.toggle('short', short > 0);
    $('pct').textContent = Math.round(ratio * 100) + '%';
    $('cycles').textContent = String(Math.round((d / 90) * 10) / 10);

    $('goal').value = state.goal;
    $('goalOut').textContent = fmtDur(goalMin);
  }

  /* ---------- pointer dragging ---------- */
  let drag = null;

  function pointerMinutes(e) {
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 420 - C;
    const y = ((e.clientY - rect.top) / rect.height) * 420 - C;
    const m = mod((Math.atan2(x, -y) / (Math.PI * 2)) * DAY);
    return mod(Math.round(m / STEP) * STEP);
  }

  svg.addEventListener('pointerdown', (e) => {
    const target = e.target.closest('[data-drag]');
    if (!target) return;
    e.preventDefault();
    const kind = target.getAttribute('data-drag');
    drag = { kind, node: target, grab: kind === 'arc' ? mod(pointerMinutes(e) - state.bed) : 0 };
    target.classList.add('dragging');
    if (kind !== 'arc') target.focus({ preventScroll: true });
    svg.setPointerCapture(e.pointerId);
  });

  svg.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const m = pointerMinutes(e);
    if (drag.kind === 'bed') {
      if (m !== state.wake) state.bed = m;
    } else if (drag.kind === 'wake') {
      if (m !== state.bed) state.wake = m;
    } else {
      const d = duration();
      state.bed = mod(m - drag.grab);
      state.wake = mod(state.bed + d);
    }
    render();
  });

  function endDrag(e) {
    if (!drag) return;
    drag.node.classList.remove('dragging');
    drag = null;
    if (svg.hasPointerCapture?.(e.pointerId)) svg.releasePointerCapture(e.pointerId);
    save();
  }
  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);

  /* ---------- keyboard ---------- */
  svg.addEventListener('keydown', (e) => {
    const h = e.target.closest?.('.handle');
    if (!h) return;
    const delta = { ArrowRight: STEP, ArrowUp: STEP, ArrowLeft: -STEP, ArrowDown: -STEP, PageUp: 60, PageDown: -60 }[e.key];
    if (!delta) return;
    e.preventDefault();
    const kind = h.getAttribute('data-drag');
    const other = kind === 'bed' ? state.wake : state.bed;
    let next = mod(state[kind] + delta);
    if (next === other) next = mod(next + Math.sign(delta) * STEP); // never let the handles overlap
    state[kind] = next;
    render();
    save();
  });

  /* ---------- other controls ---------- */
  $('goal').addEventListener('input', (e) => {
    state.goal = Number(e.target.value);
    render();
    save();
  });
  $('alarmToggle').addEventListener('click', () => {
    state.alarm = !state.alarm;
    render();
    save();
  });

  render();
})();
