/* Tráiler de evento - Alexander Ge Erre
   Curva de 3 actos: (1) presentación pausada con nombres, (2) ráfaga de cortes rápidos al ritmo, (3) cierre lento y emotivo + tarjeta.
   Efectos (cámara lenta, zoom crash, tirones de cámara, fugas de luz, glitch) y sonidos creados por código, combinados al azar con una semilla.
   El audio original de los clips NUNCA se usa. Todo se procesa en tu computadora. */
(function(root){
'use strict';
var PI = Math.PI, SR = 48000, FPSV = 30;

function clamp(x, a, b){ return Math.max(a, Math.min(b, x)); }
function ease(p){ p = clamp(p, 0, 1); return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
function easeOut(p){ p = clamp(p, 0, 1); return 1 - Math.pow(1 - p, 3); }
function smooth(a, b, x){ var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
function lienzo(w, h){ var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
function rng(s){ var x = (s >>> 0) || 1; return function(){ x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 4294967296; }; }
function cubrir(cx, src, sw, sh, W, H){ var k = Math.max(W / sw, H / sh), w = sw * k, h = sh * k; cx.drawImage(src, (W - w) / 2, (H - h) / 2, w, h); }
function irA(v, t){
  return new Promise(function(ok){
    t = clamp(t, 0, Math.max(0, (v.duration || 0) - 0.02));
    if (Math.abs(v.currentTime - t) < 0.0005 && v.readyState >= 2) return ok();
    var fin = false, h = function(){ if (fin) return; fin = true; v.removeEventListener('seeked', h); clearTimeout(tm); ok(); };
    var tm = setTimeout(h, 5000);
    v.addEventListener('seeked', h); v.currentTime = t;
  });
}

/* ---------- Cámara lenta (speed ramp): rápido y luego frena de golpe ---------- */
function vel(p){ return 0.38 + (2.5 - 0.38) * (1 - smooth(0.46, 0.58, p)); }
var TABLA = (function(){ var t = [0], n = 200, i, a = 0; for (i = 1; i <= n; i++) { a += vel((i - .5) / n) / n; t.push(a); } return t; })();
function G(p){ p = clamp(p, 0, 1) * 200; var i = Math.floor(p), f = p - i; return i >= 200 ? TABLA[200] : TABLA[i] + (TABLA[i + 1] - TABLA[i]) * f; }
var G1 = TABLA[200];

/* ---------- Transiciones ---------- */
var TRANS = {
  corte:    { n: 'Corte directo',              d: 0,    sfx: 'corte' },
  zoom:     { n: 'Zoom con desenfoque',        d: 0.42, sfx: 'zoom' },
  flash:    { n: 'Destello de luz',            d: 0.36, sfx: 'flash' },
  glitch:   { n: 'Glitch',                     d: 0.30, sfx: 'glitch' },
  franja:   { n: 'Franja blanca',              d: 0.80, sfx: 'franja' },
  barrido:  { n: 'Tirón de cámara (lado)',     d: 0.34, sfx: 'barrido' },
  barridoV: { n: 'Tirón de cámara (vertical)', d: 0.34, sfx: 'barrido' },
  golpe:    { n: 'Golpe de zoom',              d: 0.24, sfx: 'golpe' },
  crash:    { n: 'Zoom crash',                 d: 0.20, sfx: 'crash' },
  fuga:     { n: 'Fuga de luz cálida',         d: 0.55, sfx: 'fuga' },
  fundido:  { n: 'Fundido suave',              d: 0.90, sfx: 'suave' }
};
var POOL_RAPIDO = ['flash', 'glitch', 'barrido', 'barridoV', 'golpe', 'crash', 'zoom', 'franja'];

function radial(cx, W, H, A, s, K){
  var t = lienzo(W, H), i; A(t.getContext('2d')); cx.fillStyle = '#000'; cx.fillRect(0, 0, W, H);
  for (i = 0; i < K; i++) { var sk = 1 + (s - 1) * (i / (K - 1)); cx.save(); cx.globalAlpha = 1 / (i + 1); cx.translate(W / 2, H / 2); cx.scale(sk, sk); cx.translate(-W / 2, -H / 2); cx.drawImage(t, 0, 0); cx.restore(); }
}
function trZoom(cx, W, H, A, B, q){
  var src = q < .5 ? A : B, s = q < .5 ? 1 + ease(q * 2) * 0.75 : 1 + (1 - ease((q - .5) * 2)) * 0.75;
  radial(cx, W, H, src, s, 9); var a = Math.sin(q * PI); cx.fillStyle = 'rgba(255,255,255,' + (0.16 * a).toFixed(3) + ')'; cx.fillRect(0, 0, W, H);
}
function fugaLuz(cx, W, H, a, p, sem){
  var R = rng(sem * 3 + 5), cols = [[255, 140, 40], [255, 85, 120], [255, 215, 120]], i;
  cx.save(); cx.globalCompositeOperation = 'lighter';
  for (i = 0; i < 3; i++) {
    var x = W * (-.1 + 1.2 * clamp(p + (R() - .5) * .5, 0, 1)), y = H * (.15 + R() * .7), r = Math.max(W, H) * (.45 + R() * .35), c = cols[i];
    var g = cx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(' + c.join(',') + ',' + clamp(.42 * a, 0, 1).toFixed(3) + ')'); g.addColorStop(1, 'rgba(' + c.join(',') + ',0)'); cx.fillStyle = g; cx.fillRect(0, 0, W, H);
  }
  cx.restore();
}
function trFlash(cx, W, H, A, B, q){
  var a = Math.sin(q * PI), src = q < .5 ? A : B;
  cx.save(); cx.filter = 'brightness(' + (1 + .7 * a).toFixed(2) + ') saturate(' + (1 + .35 * a).toFixed(2) + ')'; src(cx); cx.restore();
  fugaLuz(cx, W, H, a * .8, q, 7); cx.fillStyle = 'rgba(255,240,215,' + (Math.pow(a, 4) * .22).toFixed(3) + ')'; cx.fillRect(0, 0, W, H);
}
function trFuga(cx, W, H, A, B, q, sem){
  var a = Math.sin(q * PI); A(cx); cx.save(); cx.globalAlpha = ease(q); B(cx); cx.restore(); fugaLuz(cx, W, H, a, q, sem);
  cx.fillStyle = 'rgba(255,225,190,' + (a * .22).toFixed(3) + ')'; cx.fillRect(0, 0, W, H);
}
function trFundido(cx, W, H, A, B, q){ A(cx); cx.save(); cx.globalAlpha = ease(q); B(cx); cx.restore(); }
function glitchSobre(cx, W, H, t, a, sem){
  var R = rng(sem), n = 18, sh = H / n, i; cx.fillStyle = '#000'; cx.fillRect(0, 0, W, H);
  for (i = 0; i < n; i++) { var dx = (R() - .5) * W * .5 * a * (R() > .4 ? 1 : .15); cx.drawImage(t, 0, i * sh, W, sh, dx, i * sh, W, sh); }
  cx.save(); cx.globalCompositeOperation = 'lighter';
  [['rgb(255,0,0)', -1], ['rgb(0,255,255)', 1]].forEach(function(c){ var o = lienzo(W, H), oc = o.getContext('2d'); oc.drawImage(t, 0, 0); oc.globalCompositeOperation = 'multiply'; oc.fillStyle = c[0]; oc.fillRect(0, 0, W, H); cx.globalAlpha = .55 * a; cx.drawImage(o, c[1] * W * .03 * a, 0); });
  cx.restore(); cx.fillStyle = 'rgba(0,0,0,.16)'; for (i = 0; i < H; i += 4) cx.fillRect(0, i, W, 1.5 * a);
}
function trGlitch(cx, W, H, A, B, q, sem){
  var S = q < .5 ? A : B, t = lienzo(W, H); S(t.getContext('2d')); glitchSobre(cx, W, H, t, Math.sin(q * PI), sem * 7 + Math.floor(q * 12));
}
function trFranja(cx, W, H, A, B, q){
  cx.fillStyle = '#fff'; cx.fillRect(0, 0, W, H);
  var e = q < .5 ? 1 - ease(q * 2) : ease((q - .5) * 2), h = Math.max(H * .04, H * e), src = q < .5 ? A : B, y = (H - h) / 2;
  cx.save(); cx.beginPath(); cx.rect(0, y, W, h); cx.clip(); src(cx); cx.restore();
  cx.fillStyle = 'rgba(255,255,255,' + (Math.max(0, 1 - e) * .25).toFixed(3) + ')'; cx.fillRect(0, y, W, h);
}
function whip(cx, W, H, A, B, q, sem, vertical){
  var dir = (sem % 2) ? 1 : -1, ta = lienzo(W, H), tb = lienzo(W, H); A(ta.getContext('2d')); B(tb.getContext('2d'));
  var e = ease(q), K = 12, j, D = vertical ? H : W, bl = Math.sin(q * PI) * D * .2;
  cx.fillStyle = '#000'; cx.fillRect(0, 0, W, H);
  var pos = function(o){ return vertical ? [0, o] : [o, 0]; };
  for (j = 0; j < K; j++) { var f = j / (K - 1) - .5, pp = pos(dir * (-e * D * .95) + f * bl); cx.globalAlpha = 1 / (j + 1); cx.drawImage(ta, pp[0], pp[1]); }
  for (j = 0; j < K; j++) { var f2 = j / (K - 1) - .5, p2 = pos(dir * ((1 - e) * D * .95) + f2 * bl); cx.globalAlpha = (j === 0 ? 1 : 1 / (j + 1)) * clamp(q * 3, 0, 1); cx.drawImage(tb, p2[0], p2[1]); }
  cx.globalAlpha = 1;
}
function trBarrido(cx, W, H, A, B, q, sem){ whip(cx, W, H, A, B, q, sem, false); }
function trBarridoV(cx, W, H, A, B, q, sem){ whip(cx, W, H, A, B, q, sem, true); }
function trGolpe(cx, W, H, A, B, q){
  var src = q < .5 ? A : B, a = Math.sin(q * PI), s = 1 + .22 * a, t = lienzo(W, H); src(t.getContext('2d'));
  cx.fillStyle = '#000'; cx.fillRect(0, 0, W, H);
  for (var i = 0; i < 5; i++) { var sk = 1 + (s - 1) * (i / 4); cx.save(); cx.globalAlpha = 1 / (i + 1); cx.translate(W / 2 + (a * W * .012) * (i % 2 ? 1 : -1), H / 2); cx.scale(sk, sk); cx.translate(-W / 2, -H / 2); cx.drawImage(t, 0, 0); cx.restore(); }
  cx.fillStyle = 'rgba(255,255,255,' + (.2 * a).toFixed(3) + ')'; cx.fillRect(0, 0, W, H);
}
function trCrash(cx, W, H, A, B, q){
  var src, s;
  if (q < .5) { src = A; s = 1 + easeOut(q * 2) * 1.1; radial(cx, W, H, src, s, 7); }
  else { src = B; s = 1 + (1 - easeOut((q - .5) * 2)) * .45; radial(cx, W, H, src, s, 5); }
  var a = Math.exp(-Math.abs(q - .5) * 7); cx.fillStyle = 'rgba(255,255,255,' + (.38 * a).toFixed(3) + ')'; cx.fillRect(0, 0, W, H);
  cx.save(); cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = .35 * a; var o = lienzo(W, H), oc = o.getContext('2d'); src(oc); oc.globalCompositeOperation = 'multiply'; oc.fillStyle = 'rgb(255,0,60)'; oc.fillRect(0, 0, W, H); cx.drawImage(o, -W * .012, 0); cx.restore();
}
var FN_TR = { zoom: trZoom, flash: trFlash, glitch: trGlitch, franja: trFranja, barrido: trBarrido, barridoV: trBarridoV, golpe: trGolpe, crash: trCrash, fuga: trFuga, fundido: trFundido };

/* ---------- Niebla, título, sujeto ---------- */
function niebla(cx, W, H, t, fuerza){
  var i; cx.save();
  for (i = 0; i < 9; i++) {
    var x = W * (i / 8 + .06 * Math.sin(t * .7 + i * 2.1)), y = H * (.8 + .08 * Math.sin(t * .5 + i * 1.7)), r = W * (.38 + .1 * Math.sin(t * .4 + i));
    var g = cx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(255,255,255,' + (.7 * fuerza).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,255,255,0)'); cx.fillStyle = g; cx.fillRect(0, 0, W, H);
  }
  var g2 = cx.createLinearGradient(0, H * .58, 0, H); g2.addColorStop(0, 'rgba(255,255,255,0)'); g2.addColorStop(1, 'rgba(255,255,255,' + (.62 * fuerza).toFixed(3) + ')'); cx.fillStyle = g2; cx.fillRect(0, H * .58, W, H * .42);
  cx.restore();
}
var FPESO = '900', FUENTE = '"Arial Black",Impact,sans-serif', FILTRO = 'saturate(1.35) contrast(1.15) brightness(.97)', TINTE = 'rgba(255,160,80,.32)';
var ANIM = 'sube';
function titulo(cx, W, H, txt, etq, col, p){
  if (!txt) return;
  var fs = Math.min(W * .5, H * .26); cx.save();
  cx.font = FPESO + ' ' + fs + 'px ' + FUENTE; var mw = cx.measureText(txt).width; if (mw > W * .88) fs *= W * .88 / mw;
  cx.font = FPESO + ' ' + fs + 'px ' + FUENTE; cx.textAlign = 'center'; cx.textBaseline = 'middle';
  var e = easeOut(clamp(p * 2, 0, 1)), x = W / 2, y = H * .5, esc = 1, al = clamp(p * 4, 0, 1) * cx.globalAlpha;
  if (ANIM === 'sube') y += (1 - e) * H * .03;
  else if (ANIM === 'escala') esc = 1.35 - .35 * e;
  else if (ANIM === 'desliza') x += (1 - e) * W * -.12;
  else if (ANIM === 'difumina') cx.filter = 'blur(' + ((1 - e) * W * .02).toFixed(1) + 'px)';
  else if (ANIM === 'revela') { cx.beginPath(); cx.rect(0, 0, W * clamp(p * 2.2, 0, 1), H); cx.clip(); al = Math.max(al, .001) * (p > 0 ? 1 : 0); }
  cx.globalAlpha = al; var g = cx.createLinearGradient(0, y - fs / 2, 0, y + fs / 2); g.addColorStop(0, col[0]); g.addColorStop(1, col[1]);
  cx.translate(x, y); cx.scale(esc, esc); cx.translate(-x, -y);
  cx.shadowColor = 'rgba(0,0,0,.35)'; cx.shadowBlur = W * .02; cx.fillStyle = g; cx.fillText(txt, x, y); cx.shadowBlur = 0;
  if (etq) { cx.font = '600 ' + Math.round(fs * .13) + 'px Jost,Arial,sans-serif'; if ('letterSpacing' in cx) cx.letterSpacing = Math.round(fs * .05) + 'px'; cx.fillStyle = '#fff'; cx.shadowColor = 'rgba(0,0,0,.55)'; cx.shadowBlur = 8; cx.fillText(etq.toUpperCase(), x, y - fs * .66); }
  cx.restore();
}
// Respaldo si no carga el modelo de recorte: forma aproximada de cabeza y cuerpo con las caras (máscara con transparencia)
function mascaraCaras(W, H, caras){
  var m = lienzo(W, H), x = m.getContext('2d'), md = Math.max.apply(null, caras.map(function(c){ return c.w; }));
  x.filter = 'blur(' + Math.max(3, Math.round(md * .07)) + 'px)'; x.fillStyle = '#fff';
  caras.forEach(function(c){
    var cx0 = c.x + c.w / 2, cy0 = c.y + c.h / 2;
    x.beginPath(); x.ellipse(cx0, cy0 - c.h * .05, c.w * .66, c.h * .82, 0, 0, 7); x.fill();
    x.beginPath(); x.moveTo(cx0 - c.w * .5, c.y + c.h * .95); x.lineTo(cx0 + c.w * .5, c.y + c.h * .95); x.lineTo(cx0 + c.w * 1.9, H + 4); x.lineTo(cx0 - c.w * 1.9, H + 4); x.closePath(); x.fill();
  });
  return m;
}
function vigneta(W, H){
  var c = lienzo(W, H), x = c.getContext('2d'), g = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .32, W / 2, H / 2, Math.max(W, H) * .72);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.42)'); x.fillStyle = g; x.fillRect(0, 0, W, H); return c;
}
function microGlitch(cx, W, H, a, sem){
  var t = lienzo(W, H); t.getContext('2d').drawImage(cx.canvas, 0, 0);
  var R = rng(sem), n = 12, sh = H / n, i;
  for (i = 0; i < n; i++) { if (R() < .45) continue; var dx = (R() - .5) * W * .16 * a; cx.drawImage(t, 0, i * sh, W, sh, dx, i * sh, W, sh); }
  cx.save(); cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = .4 * a; var o = lienzo(W, H), oc = o.getContext('2d'); oc.drawImage(t, 0, 0); oc.globalCompositeOperation = 'multiply'; oc.fillStyle = 'rgb(255,0,40)'; oc.fillRect(0, 0, W, H); cx.drawImage(o, -W * .015 * a, 0);
  oc.globalCompositeOperation = 'source-over'; oc.drawImage(t, 0, 0); oc.globalCompositeOperation = 'multiply'; oc.fillStyle = 'rgb(0,255,255)'; oc.fillRect(0, 0, W, H); cx.drawImage(o, W * .015 * a, 0); cx.restore();
}

/* ---------- Plan de 3 actos ---------- */
// Acto 1 (15 %): clips de 2-3 s en cámara lenta con los nombres. Acto 2 (45 %): ráfaga de cortes de 0.25-0.35 s.
// Acto 3 (40 %): clips largos en cámara lenta + tarjeta final de 4 s. Sirve con cualquier número de clips (reutiliza fragmentos distintos).
function planear1(o){
  var beat = 60 / o.bpm, N = Math.max(1, o.clips.length), R = rng(o.semilla || 1), T = Math.max(10, o.total || 45), C = o.cierre ? 4 : 0, i, j;
  var k1 = Math.max(1, Math.round(3.2 / beat)); while (k1 * beat > 4.2 && k1 > 1) k1--; while (k1 * beat < 2.4) k1++;
  var d1 = k1 * beat, n1 = Math.max(o.nombre2 ? 2 : 1, Math.round(.15 * T / d1));
  var rt = (o.perfil && o.perfil.ritmo) || { lo: .8, hi: 2, largo: 3, pL: .12, rafaga: 1 }, n;
  var qd = beat > .62 ? beat / 2 : beat, u = beat / 2 >= .35 ? beat / 2 : beat, n2 = 0, EN = o.energia || null, fd = Math.max(.8, Math.min(1.4, .7 + T / 60 * .6));
  var k3 = Math.max(2, Math.round(4.5 / beat)); while (k3 * beat > 6) k3--; var d3 = k3 * beat, n3 = Math.max(1, Math.round((.40 * T - C) / d3));
  var segs = [], t = 0, ci, agotado = false, prevCi = -1;
  function C_(k){ return o.clips[((k % N) + N) % N]; }
  // Aprovechamiento total: cada clip se parte en bloques de ~2-3 s; todos van a una cola mezclada y cada trozo se usa una sola vez.
  var blocks = [], cola = [];
  o.clips.forEach(function(c, k){ var nb = Math.max(1, Math.round(c.dur / 3.8)), L = (c.dur - .1) / nb; for (var q = 0; q < nb; q++) blocks.push({ k: k, a: .04 + q * L, b: .04 + (q + 1) * L, cur: .04 + q * L }); });
  function mezclarCola(){
    var arr = blocks.map(function(x){ x.cur = x.a; return x; });
    for (var q = arr.length - 1; q > 0; q--) { var r = Math.floor(R() * (q + 1)), tm = arr[q]; arr[q] = arr[r]; arr[r] = tm; }
    // evita el mismo clip dos veces seguidas
    for (q = 1; q < arr.length; q++) if (arr[q].k === arr[q - 1].k) { for (var w = q + 1; w < arr.length; w++) if (arr[w].k !== arr[q - 1].k && (w + 1 >= arr.length || arr[w].k !== arr[q + 1 < arr.length ? q + 1 : q].k || true)) { var x2 = arr[q]; arr[q] = arr[w]; arr[w] = x2; break; } }
    cola = arr;
  }
  mezclarCola();
  function tomar(S){
    if (!cola.length) { agotado = true; mezclarCola(); }
    var q, idx = -1, mx = -1, mi = -1;
    for (q = 0; q < cola.length; q++) { var bl = cola[q], rem = bl.b - bl.cur; if (rem >= S + .02 && (bl.k !== prevCi || cola.length < 2)) { idx = q; break; } if (rem > mx) { mx = rem; mi = q; } }
    if (idx < 0) { for (q = 0; q < cola.length; q++) if (cola[q].b - cola[q].cur >= S + .02) { idx = q; break; } }
    return idx < 0 ? { i: mi, corto: true } : { i: idx, corto: false };
  }
  function nuevo(sec, ci2, dur, v, ramp, extra){
    var S = ramp ? dur * G1 : dur * v, tk = tomar(S), bl = cola[tk.i], rem = bl.b - bl.cur;
    if (tk.corto) { ramp = false; v = Math.max(.2, (rem - .02) / dur); S = dur * v; }
    var s = { i: segs.length, sec: sec, ci: bl.k, start: t, dur: dur, off: bl.cur, vel: v, ramp: ramp,
      z0: 1, z1: 1.08, fx: .5, fy: .5, pulse: false, crash: false, leak: false, glitch: false, fuegos: null };
    for (var kk in (extra || {})) s[kk] = extra[kk];
    bl.cur += S + .01; prevCi = bl.k; cola.splice(tk.i, 1); if (bl.b - bl.cur >= .4) cola.push(bl);
    segs.push(s); t += dur; return s;
  }
  // Acto 1
  for (i = 0; i < n1; i++) nuevo('intro', i, d1, .5, false, { z0: 1.03, z1: 1.12 });
  var tAct2 = t;
  // Acto 2 (estilo plantilla): tomas de 0.8-2.5 s sobre el pulso, alguna larga en cámara lenta y 1-2 ráfagas cortas
  var D2 = .45 * T, burstAt = [], nbur = Math.min(rt.rafaga || 0, T < 45 ? 1 : 2), acc = 0, bi = 0;
  for (j = 0; j < nbur; j++) burstAt.push(D2 * (nbur === 1 ? .58 : .3 + .42 * j) + (R() - .5) * .06 * D2);
  while (acc < D2 - .35) {
    if (bi < burstAt.length && acc >= burstAt[bi] && (!EN || EN(t) > .6 || acc > burstAt[bi] + D2 * .25)) {
      var nb2 = 4 + Math.floor(R() * 3); bi++;
      for (j = 0; j < nb2; j++) { nuevo('rapido', 0, u, 1, false, { z0: 1.02 + R() * .1, z1: 1.08 + R() * .1, fx: .3 + R() * .4, fy: .3 + R() * .4, pulse: true, burst: true, glitch: j === 0 && R() < .3 }); n2++; }
      acc += nb2 * u; continue;
    }
    var en = EN ? EN(t) : .5, tg = R() < (rt.pL || .1) ? rt.largo + R() * .8 : Math.max(.95, fd * (rt.lo + (rt.hi - rt.lo) * Math.pow(R(), 1.2) * (EN ? 1.15 - en : 1))), len = Math.max(1, Math.round(tg / qd)) * qd, larga = len >= rt.largo - .15;
    if (acc + len > D2 + 1.2) len = Math.max(qd, Math.round((D2 - acc) / qd) * qd);
    var z0 = 1.02 + R() * .08;
    nuevo('rapido', 0, len, larga ? .6 : 1, !larga && len < 1.3 && R() < .22, { z0: z0, z1: z0 + .04 + R() * .08, fx: .3 + R() * .4, fy: .3 + R() * .4, pulse: R() < .25, crash: R() < .08, leak: R() < ((o.perfil && o.perfil.leaks) || .08), glitch: R() < .06 });
    n2++; acc += len;
  }
  var tAct3 = t;
  // Acto 3: los últimos clips (en orden), cámara lenta
  for (i = 0; i < n3; i++) nuevo('calma', N - n3 + i, d3, .5, false, { z0: 1, z1: 1.07 });
  // Pulsos reales: cada corte se pega al pulso más cercano de la canción
  if (o.pulsos && o.pulsos.length > 3) {
    var pl = [], prevT = 0; o.pulsos.forEach(function(x, q2){ pl.push(x); if (q2 + 1 < o.pulsos.length) pl.push((x + o.pulsos[q2 + 1]) / 2); });
    for (i = 1; i < segs.length; i++) {
      var tb = segs[i].start, bp = tb, bd = 1e9;
      for (j = 0; j < pl.length; j++) { var dd = Math.abs(pl[j] - tb); if (dd < bd) { bd = dd; bp = pl[j]; } }
      if (bd > beat * .3) bp = tb;
      if (bp < prevT + .4) { var bq = pl.find(function(x){ return x >= prevT + .4; }); bp = bq != null ? bq : prevT + .4; }
      var sg = segs[i - 1], d0 = sg.dur, nd = bp - sg.start;
      if (nd > .3) { if (!sg.ramp) sg.vel *= d0 / nd; sg.dur = nd; segs[i].start = bp; }
      prevT = segs[i].start;
    }
    var ult = segs[segs.length - 1], tot0 = t; ult.dur = Math.max(.3, tot0 - ult.start);
    tAct2 = segs.find(function(q){ return q.sec === 'rapido'; }) ? segs.find(function(q){ return q.sec === 'rapido'; }).start : tAct2;
    var s3 = segs.find(function(q){ return q.sec === 'calma'; }); if (s3) tAct3 = s3.start;
  }
  // Transiciones
  var trs = [], prev = '', rec = [], tipo, d, hayPrev = false;
  for (i = 0; i < segs.length - 1; i++) {
    var a = segs[i], b = segs[i + 1], dm = Math.min(a.dur, b.dur);
    if (a.sec === 'intro' && b.sec === 'intro') tipo = R() < .5 ? 'zoom' : 'fuga';
    else if (a.sec === 'intro' && b.sec === 'rapido') tipo = ['flash', 'crash', 'glitch', 'flash'][Math.floor(R() * 4)];
    else if (a.sec === 'rapido' && b.sec === 'rapido') {
      if (a.burst && b.burst) tipo = 'corte';
      else if (!a.burst && b.burst) tipo = ['crash', 'golpe', 'flash'][Math.floor(R() * 3)];
      else if (a.burst && !b.burst) tipo = 'flash';
      else if (hayPrev || R() < .38 || (o.esFuerte && !o.esFuerte(b.start))) tipo = 'corte';
      else { var pool = (((o.perfil && o.perfil.pool) || POOL_RAPIDO).filter(function(x){ return x !== 'fundido' && x !== 'fuga'; })).filter(function(x){ return x !== prev && !(x === 'franja') && !(x === 'glitch' && rec.slice(-4).indexOf('glitch') >= 0) && !(x === 'crash' && rec.slice(-4).indexOf('crash') >= 0); }); tipo = pool[Math.floor(R() * pool.length)]; }
    }
    else if (a.sec === 'rapido' && b.sec === 'calma') tipo = R() < .6 ? 'fuga' : 'fundido';
    else tipo = 'fundido';
    d = tipo === 'corte' ? 0 : Math.min(TRANS[tipo].d, dm * (b.sec === 'rapido' && a.sec === 'rapido' ? .5 : .8));
    if (o.pulsos && d > 0 && a.sec === 'rapido' && b.sec === 'rapido') d = Math.min(d, Math.max(.12, beat * .55));
    hayPrev = tipo !== 'corte'; if (tipo !== 'corte') { prev = tipo; rec.push(tipo); }
    if (tipo === 'crash' && b.sec === 'rapido') b.crash = true;
    trs.push({ t: b.start, tipo: tipo, d: d, a: i, b: i + 1, sem: Math.floor(R() * 1000), mayor: i + 1 === segs.findIndex(function(s){ return s.sec === 'rapido'; }) || i + 1 === segs.findIndex(function(s){ return s.sec === 'calma'; }) || tipo === 'flash' || tipo === 'crash' || tipo === 'golpe' });
  }
  var tCierre = t, ult = segs[segs.length - 1];
  if (o.cierre) trs.push({ t: t, tipo: 'fundido', d: .9, a: segs.length - 1, b: -1, sem: 1, mayor: false });
  void ult;
  return { agotado: agotado, beat: beat, u: u, segs: segs, trs: trs, tAct2: tAct2, tAct3: tAct3, tDrop: tAct2, tCalma: tAct3, tCierre: tCierre, C: C, total: t + C, nIntro: n1, nRapido: n2, nCalma: n3, d1: d1 };
}

function planear(o){
  var T0 = Math.max(10, o.total || 45), T = T0, P, q, o2 = {};
  for (var k in o) o2[k] = o[k];
  for (q = 0; q < 8; q++) { o2.total = T; P = planear1(o2); if (!P.agotado || T <= 10) break; T = Math.max(10, T * .88); }
  P.pedido = T0; P.aviso = '';
  var usable = Math.round(P.total);
  if (P.agotado) P.aviso = 'Con el material subido no alcanza ni para ' + Math.round(T) + ' s sin repetir. Se repiten algunos trozos; agrega más clips para evitarlo.';
  else if (T < T0 - .5) P.aviso = 'Con el material subido el máximo sin repetir es de ' + usable + ' s (pediste ' + Math.round(T0) + ' s). Se ajustó la duración.';
  return P;
}

/* ---------- Detección simple de luces (para fuegos artificiales), una vez por clip ---------- */
async function buscarLuces(clips){
  var cv = lienzo(40, 72), cx = cv.getContext('2d', { willReadFrequently: true }), k, j, m;
  for (k = 0; k < clips.length; k++) {
    var c = clips[k]; if (c.luz !== undefined) continue; c.luz = null; var mejor = { f: 0, t: 0 };
    for (j = 0; j < 4; j++) {
      var ts = clamp(c.dur * (.15 + j * .22), 0, c.dur - .04);
      await irA(c.v, ts); cx.drawImage(c.v, 0, 0, 40, 72); var d = cx.getImageData(0, 0, 40, 72).data, suma = 0, br = 0, n = d.length / 4;
      for (m = 0; m < d.length; m += 4) { var L = .3 * d[m] + .59 * d[m + 1] + .11 * d[m + 2]; suma += L; if (L > 215) br++; }
      var media = suma / n, fr = br / n;
      if (media < 80 && fr > .006 && fr < .35 && fr > mejor.f) mejor = { f: fr, t: ts };
    }
    if (mejor.f > 0) c.luz = mejor.t;
  }
}

/* ---------- Escena ---------- */
async function crearEscena(o){
  var pf = o.perfil || {}, RT = rng((o.semilla || 1) * 13 + 7), fu = pf.fuentes && pf.fuentes[Math.floor(RT() * pf.fuentes.length)]; FUENTE = fu ? fu.f : (pf.fuente || '"Arial Black",Impact,sans-serif'); FPESO = fu ? fu.w : (pf.peso || '900'); ANIM = ['sube', 'escala', 'desliza', 'difumina', 'revela'][Math.floor(RT() * 5)]; FILTRO = pf.filtro || 'saturate(1.35) contrast(1.15) brightness(.97)'; TINTE = pf.tinte || 'rgba(255,160,80,.32)';
  var W = o.W, H = o.H, clips = o.clips, P = planear(o), N = P.segs.length, marco = {}, marcoB = {}, marcoF = {}, maskSeg = {}, marcoP = {}, marcoB2 = {}, i;
  // Lector de cuadros: busca (seek) solo al empezar un clip y después lee los cuadros seguidos reproduciendo el clip rápido
  // (mucho más veloz que buscar cuadro por cuadro). Guarda unos pocos cuadros para la cámara lenta.
  var RVFC = typeof HTMLVideoElement !== 'undefined' && 'requestVideoFrameCallback' in HTMLVideoElement.prototype && o.lectorRapido === true;
  function lector(c){
    var key = W + 'x' + H, r = c._rd;
    if (r && r.key === key) return r;
    if (r) soltar(r);
    r = c._rd = { key: key, c: c, buf: [], pool: [], playing: false, last: -1, esperando: [], uso: 0 };
    return r;
  }
  function soltar(r){ try { r.c.v.pause(); } catch (e) {} r.playing = false; r.buf = []; r.pool = []; r.esperando.forEach(function(f){ f(); }); r.esperando = []; }
  function reciclar(r, hasta){ while (r.buf.length > 1 && r.buf[1].mt <= hasta) r.pool.push(r.buf.shift().cv); }
  function capturar(r){
    var v = r.c.v;
    var cb = function(now, meta){
      if (!r.playing) return;
      var cv = r.pool.pop() || lienzo(W, H); cubrir(cv.getContext('2d'), v, r.c.w, r.c.h, W, H);
      r.buf.push({ mt: meta.mediaTime, cv: cv }); r.last = meta.mediaTime;
      var ws = r.esperando; r.esperando = []; ws.forEach(function(f){ f(); });
      if (r.buf.length > 14) { r.playing = false; try { v.pause(); } catch (e) {} return; }
      v.requestVideoFrameCallback(cb);
    };
    v.requestVideoFrameCallback(cb);
  }
  function arrancar(r){ if (r.playing) return; r.playing = true; var v = r.c.v; v.playbackRate = r.rate || 1.6; capturar(r); var pr = v.play(); if (pr && pr.catch) pr.catch(function(){ r.playing = false; }); }
  function esperar(r){ return new Promise(function(ok){ var fin = false, h = function(){ if (fin) return; fin = true; ok(); }; r.esperando.push(h); setTimeout(h, 700); }); }
  async function dame(c, ts, t){
    ts = clamp(ts, 0, Math.max(0, c.dur - .04));
    if (!RVFC) {
      // memoria de 4 cuadros por clip: la cámara lenta usa cada cuadro dos veces y así se lee una sola vez
      var key = W + 'x' + H, fc = (c._fc && c._fc.key === key) ? c._fc : (c._fc = { key: key, m: {}, ord: [] }), idx = Math.round(ts * FPSV);
      if (fc.m[idx]) return fc.m[idx];
      var cvm; if (fc.ord.length >= 4) { var viejo = fc.ord.shift(); cvm = fc.m[viejo]; delete fc.m[viejo]; } else cvm = lienzo(W, H);
      await irA(c.v, idx / FPSV); cubrir(cvm.getContext('2d'), c.v, c.w, c.h, W, H); fc.m[idx] = cvm; fc.ord.push(idx); return cvm;
    }
    var r = lector(c); r.uso = t;
    if (r.pt != null && t > r.pt && t - r.pt < .25 && ts >= r.ps) { var rate = clamp((ts - r.ps) / (t - r.pt) * 1.6, .5, 4); if (!r.rate || Math.abs(rate - r.rate) > .15 * r.rate) { r.rate = rate; if (r.playing) { try { c.v.playbackRate = rate; } catch (e) {} } } }
    if (r.pt == null || t !== r.pt) { r.pt = t; r.ps = ts; }
    for (var vuelta = 0; vuelta < 40; vuelta++) {
      var i, k = -1; for (i = 0; i < r.buf.length; i++) { if (r.buf[i].mt <= ts + .002) k = i; else break; }
      if (k >= 0 && (k < r.buf.length - 1 || c.v.ended)) { reciclar(r, ts + .002); return r.buf[0].mt <= ts + .002 && r.buf.length > 1 && r.buf[1].mt <= ts + .002 ? r.buf[1].cv : r.buf[0].cv; }
      if (r.playing && r.buf.length && ts >= r.last - .001 && ts - r.last < 1.5 && !c.v.ended) { await esperar(r); continue; }
      if (!r.playing && r.buf.length && ts >= r.last - .001 && ts - r.last < 1.5 && !c.v.ended && k >= 0) { arrancar(r); await esperar(r); continue; }
      // empezar de nuevo desde este punto: una sola búsqueda
      r.playing = false; try { c.v.pause(); } catch (e) {} r.buf.forEach(function(q2){ r.pool.push(q2.cv); }); r.buf = [];
      await irA(c.v, ts); var cv0 = r.pool.pop() || lienzo(W, H); cubrir(cv0.getContext('2d'), c.v, c.w, c.h, W, H); r.buf.push({ mt: ts - .0005, cv: cv0 }); r.last = ts - .0005;
      arrancar(r); await esperar(r);
    }
    return r.buf.length ? r.buf[r.buf.length - 1].cv : lienzo(W, H);
  }
  function liberarInactivos(t, enUso){
    clips.forEach(function(c, ci){ var r = c._rd; if (!r || r.key !== W + 'x' + H) return; if (enUso[ci]) return; if (t < r.uso || t - r.uso > 1.2) soltar(r); else if (r.playing && r.buf.length > 4) { r.playing = false; try { c.v.pause(); } catch (e) {} } });
  }
  var COLS = (function(){ var cl = pf.cols; if (!cl) return [['#ff5fd6', '#a64bff'], ['#35c8ff', '#1769e0']]; var a0 = Math.floor(RT() * cl.length); return [cl[a0], cl[(a0 + 1 + Math.floor(RT() * (cl.length - 1))) % cl.length]]; })(), masc = {}, vig = vigneta(W, H), color = o.color !== false;
  try { await buscarLuces(clips); } catch (e) {}
  P.segs.forEach(function(s){ var c = clips[s.ci]; if (c.luz != null && s.sec !== 'rapido' || (c.luz != null && s.dur >= .5)) { var span = s.ramp ? s.dur * G1 : s.dur * s.vel; if (c.luz >= s.off && c.luz <= s.off + span) s.fuegos = clamp((c.luz - s.off) / Math.max(.01, span), 0, 1) * s.dur; } });
  // evitar fuegos demasiado seguidos
  var ult = -9; P.segs.forEach(function(s){ if (s.fuegos != null) { if (s.start + s.fuegos - ult < 1.4) s.fuegos = null; else ult = s.start + s.fuegos; } });
  var usaSeg = false;
  if (o.cargarSegmentador && (o.nombre1 || o.nombre2) && o.textoAtras !== false) { try { usaSeg = !!(await o.cargarSegmentador()); } catch (e) { usaSeg = false; } }
  if (!usaSeg && o.detectarCaras && o.textoAtras !== false) {
    for (i = 0; i < P.segs.length; i++) {
      var sg0 = P.segs[i]; if (sg0.sec !== 'intro' || !(i === 0 ? o.nombre1 : o.nombre2)) continue;
      try {
        var c0 = clips[sg0.ci]; await irA(c0.v, sg0.off + sg0.dur * sg0.vel * .4); var fc = lienzo(W, H); cubrir(fc.getContext('2d'), c0.v, c0.w, c0.h, W, H);
        var caras = await o.detectarCaras(fc, i); if (caras && caras.length) masc[i] = mascaraCaras(W, H, caras);
      } catch (e) {}
    }
  }
  function segEn(t){ for (var k = N - 1; k >= 0; k--) if (t >= P.segs[k].start - 1e-6) return k; return 0; }
  function srcT(k, t){
    var s = P.segs[k], u = t - s.start, c = clips[s.ci];
    var r = s.ramp ? (u < 0 ? s.off + u * vel(0) : u > s.dur ? s.off + G1 * s.dur + (u - s.dur) * vel(1) : s.off + G(u / s.dur) * s.dur) : s.off + u * s.vel;
    return clamp(r, 0, Math.max(0, c.dur - 0.04));
  }
  function velAct(k, t){ var s = P.segs[k]; return s.ramp ? vel(clamp((t - s.start) / s.dur, 0, 1)) : s.vel; }
  function pintarSeg(cx, k, t){
    var s = P.segs[k], fr = marco[k], u = t - s.start, p = clamp(u / s.dur, 0, 1); cx.save(); cx.fillStyle = '#000'; cx.fillRect(0, 0, W, H);
    var z = s.z0 + (s.z1 - s.z0) * p, dx = 0, dy = 0;
    if (s.crash && u >= 0) { z *= 1 + .32 * Math.exp(-u / .09); if (u < .14) { dx = Math.sin(u * 140) * W * .012 * (1 - u / .14); dy = Math.cos(u * 120) * H * .008 * (1 - u / .14); } }
    if (s.pulse && u >= 0) z *= 1 + .022 * Math.exp(-(u % P.beat) / .11);
    var FX = W * s.fx, FY = H * s.fy;
    var xf = function(c2){ c2.translate(FX + dx, FY + dy); c2.scale(z, z); c2.translate(-FX, -FY); };
    var dibujar = function(c2){ c2.save(); xf(c2); if (fr) { if (color) c2.filter = FILTRO; c2.drawImage(fr, 0, 0); c2.filter = 'none'; if (marcoF[k] > .02 && marcoB[k]) { c2.globalAlpha = marcoF[k]; if (color) c2.filter = FILTRO; c2.drawImage(marcoB[k], 0, 0); c2.filter = 'none'; c2.globalAlpha = 1; } } c2.restore(); };
    // Capa 1: video de fondo (con color vibrante y tinte cálido en las altas luces)
    dibujar(cx);
    if (color) { cx.save(); cx.globalCompositeOperation = 'soft-light'; cx.fillStyle = TINTE; cx.fillRect(0, 0, W, H); cx.restore(); }
    if (s.sec === 'intro') {
      var nm = k === 0 ? o.nombre1 : o.nombre2, et = k === 0 ? o.etq1 : o.etq2;
      if (nm) {
        var a = clamp((p - .02) / .12, 0, 1) * clamp((1 - p) / .15, 0, 1);
        // Capa 2: texto grande
        cx.globalAlpha = a; titulo(cx, W, H, nm, et, COLS[k % 2], clamp(p / .35, 0, 1)); cx.globalAlpha = 1;
        // Capa 3: sujeto recortado (por delante del texto; sin niebla)
        var mk = maskSeg[k] || masc[k];
        if (mk && a > 0) {
          var tm = lienzo(W, H), tx = tm.getContext('2d');
          tx.save(); xf(tx); tx.filter = 'blur(' + Math.max(1, Math.round(W / 400)) + 'px)'; tx.drawImage(mk, 0, 0); tx.filter = 'none'; tx.restore();
          tx.globalCompositeOperation = 'source-in'; dibujar(tx);
          cx.globalAlpha = a; cx.drawImage(tm, 0, 0); cx.globalAlpha = 1;
        }
      }
    }
    if (s.crash && u >= 0 && u < .16) { cx.fillStyle = 'rgba(255,255,255,' + (.35 * Math.exp(-u / .05)).toFixed(3) + ')'; cx.fillRect(0, 0, W, H); }
    if (s.leak && u >= 0 && u < .7) fugaLuz(cx, W, H, Math.sin(clamp(u / .7, 0, 1) * PI) * .9, u / .7, k + 11);
    if (s.sec === 'calma') { var g = cx.createRadialGradient(W * .8, H * .18, 0, W * .8, H * .18, Math.max(W, H) * .8); var ga = .16 + .05 * Math.sin(t * 1.3); g.addColorStop(0, 'rgba(255,196,140,' + ga.toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,170,120,0)'); cx.save(); cx.globalCompositeOperation = 'lighter'; cx.fillStyle = g; cx.fillRect(0, 0, W, H); cx.restore(); }
    if (color) cx.drawImage(vig, 0, 0);
    if (s.glitch && u >= 0 && u < .1) microGlitch(cx, W, H, 1 - u / .1, k * 13 + 3);
    cx.restore();
  }
  function pintarCierre(cx, tc){
    var m = o.marca || {}, g = cx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1d1610'); g.addColorStop(1, '#0b0806'); cx.fillStyle = g; cx.fillRect(0, 0, W, H);
    var gl = cx.createRadialGradient(W / 2, H * .42, 0, W / 2, H * .42, W * .8); gl.addColorStop(0, 'rgba(184,148,106,.18)'); gl.addColorStop(1, 'rgba(184,148,106,0)'); cx.fillStyle = gl; cx.fillRect(0, 0, W, H);
    var a1 = easeOut(clamp((tc - .15) / .9, 0, 1)); cx.save(); cx.textAlign = 'center'; cx.fillStyle = '#e9dcc4';
    if (m.logo) { var lw = W * .5, lh = lw * (m.logo.height / m.logo.width); cx.globalAlpha = a1; cx.drawImage(m.logo, (W - lw) / 2, H * .3 - lh / 2 + (1 - a1) * 20, lw, lh); }
    else { cx.globalAlpha = a1; cx.font = '500 ' + Math.round(W * .095) + 'px "Cormorant Garamond",Georgia,serif'; cx.fillText(m.nombre || '', W / 2, H * .31 + (1 - a1) * 20); }
    cx.globalAlpha = a1; cx.font = '400 ' + Math.round(W * .028) + 'px Jost,Arial,sans-serif'; if ('letterSpacing' in cx) cx.letterSpacing = Math.round(W * .008) + 'px'; cx.fillText((m.sub || 'FOTOGRAFÍA Y VIDEO').toUpperCase(), W / 2, H * .43);
    cx.strokeStyle = 'rgba(233,220,196,.5)'; cx.lineWidth = 1; cx.beginPath(); cx.moveTo(W * .44, H * .465); cx.lineTo(W * .56, H * .465); cx.stroke();
    (m.lineas || []).forEach(function(l, j){ var a = easeOut(clamp((tc - 1.0 - j * .25) / .6, 0, 1)); cx.globalAlpha = a; cx.font = '400 ' + Math.round(W * .02) + 'px Jost,Arial,sans-serif'; cx.fillStyle = 'rgba(233,220,196,.6)'; cx.fillText(l[0].toUpperCase(), W / 2, H * (.53 + j * .075)); cx.font = '500 ' + Math.round(W * .037) + 'px Jost,Arial,sans-serif'; cx.fillStyle = '#f3ead8'; cx.fillText(l[1], W / 2, H * (.53 + j * .075 + .035)); });
    cx.restore();
  }
  function trActiva(t){ for (var j = 0; j < P.trs.length; j++) { var tr = P.trs[j]; if (tr.d > 0 && Math.abs(t - tr.t) <= tr.d / 2) return tr; } return null; }
  var esc = {
    W: W, H: H, duracion: P.total, N: N, plan: P, estilo: 'trailer', usaSegmentacion: usaSeg,
    preparar: async function(t){
      var trc0 = o.cierre ? P.trs[P.trs.length - 1] : null;
      if (trc0 && t > P.tCierre + trc0.d / 2) return;
      var nec = {}, k = segEn(t), tr = trActiva(t), j;
      nec[k] = 1; if (tr) { if (tr.a >= 0) nec[tr.a] = 1; if (tr.b >= 0) nec[tr.b] = 1; }
      // Adelanto: empieza a buscar el cuadro del siguiente clip mientras se prepara este (ahorra la espera en cada corte)
      var kn = segEn(t + .15), trn = trActiva(t + .12), pre = {};
      if (kn !== k && !nec[kn]) pre[kn] = P.segs[kn].start; if (trn) { if (trn.b >= 0 && !nec[trn.b]) pre[trn.b] = trn.b === kn ? P.segs[kn].start : P.segs[trn.b].start; }
      var enUso = {}; Object.keys(nec).forEach(function(q2){ enUso[P.segs[+q2].ci] = 1; });
      Object.keys(pre).forEach(function(id){ var sg = P.segs[+id], cc = clips[sg.ci]; if (enUso[sg.ci]) return; var tt = srcT(+id, Math.max(pre[id], sg.start)); if (Math.abs(cc.v.currentTime - tt) > .02) { try { cc.v.currentTime = clamp(tt, 0, Math.max(0, cc.dur - .03)); } catch (e) {} } });
      var ks = Object.keys(nec), porClip = {};
      ks.forEach(function(q2){ var cc2 = P.segs[+q2].ci; porClip[cc2] = (porClip[cc2] || 0) + 1; });
      for (j = 0; j < ks.length; j++) {
        var id = +ks[j], s = P.segs[id], c = clips[s.ci], ts = srcT(id, t), lento = velAct(id, t) < .62;
        if (porClip[s.ci] > 1) {
          // dos escenas del mismo clip a la vez: se lee con búsqueda directa
          var cvA = marcoP[id] || (marcoP[id] = lienzo(W, H)); await irA(c.v, ts); cubrir(cvA.getContext('2d'), c.v, c.w, c.h, W, H); marco[id] = cvA; marcoF[id] = 0;
        } else if (lento) {
          var ta = Math.floor(ts * FPSV + 1e-6) / FPSV, f = (ts - ta) * FPSV;
          marco[id] = await dame(c, ta, t);
          if (f > .04 && ta + 1 / FPSV < c.dur - .03) { var cB = await dame(c, ta + 1 / FPSV, t), cvB = cB; if (RVFC) { cvB = marcoB2[id] || (marcoB2[id] = lienzo(W, H)); cvB.getContext('2d').drawImage(cB, 0, 0); } marcoB[id] = cvB; marcoF[id] = f; } else marcoF[id] = 0;
        } else {
          marco[id] = await dame(c, ts, t); marcoF[id] = 0;
        }
        if (usaSeg && s.sec === 'intro' && (id === 0 ? o.nombre1 : o.nombre2)) {
          try { var mk = await o.segmentar(marco[id]); if (mk) { var mc = maskSeg[id] || (maskSeg[id] = lienzo(W, H)); var mx = mc.getContext('2d'); mx.clearRect(0, 0, W, H); mx.drawImage(mk, 0, 0, W, H); } } catch (e) {}
        }
      }
      Object.keys(marco).forEach(function(id){ if (!(id in nec)) { delete marco[id]; delete marcoB[id]; delete marcoF[id]; delete maskSeg[id]; delete marcoP[id]; delete marcoB2[id]; } });
      liberarInactivos(t, enUso);
    },
    dibujar: function(cx, t){
      t = clamp(t, 0, P.total - 1e-6);
      var trc = o.cierre ? P.trs[P.trs.length - 1] : null, tr = null, N1 = N - 1;
      if (trc && t >= P.tCierre - trc.d / 2) {
        if (t < P.tCierre + trc.d / 2) FN_TR.fundido(cx, W, H, function(c2){ pintarSeg(c2, N1, t); }, function(c2){ pintarCierre(c2, 0); }, (t - (P.tCierre - trc.d / 2)) / trc.d, 1);
        else pintarCierre(cx, t - P.tCierre);
      } else {
        tr = trActiva(t);
        if (tr && tr.b >= 0) FN_TR[tr.tipo](cx, W, H, function(c2){ pintarSeg(c2, tr.a, t); }, function(c2){ pintarSeg(c2, tr.b, t); }, (t - (tr.t - tr.d / 2)) / tr.d, tr.sem);
        else pintarSeg(cx, segEn(t), t);
      }
      var ini = clamp(1 - t / .3, 0, 1); if (ini > 0) { cx.fillStyle = 'rgba(0,0,0,' + ini.toFixed(3) + ')'; cx.fillRect(0, 0, W, H); }
      var fin = P.total - t; if (fin < .7) { cx.fillStyle = 'rgba(0,0,0,' + clamp(1 - fin / .7, 0, 1).toFixed(3) + ')'; cx.fillRect(0, 0, W, H); }
    }
  };
  return esc;
}

/* ---------- Detectar el "golpe" de la canción ---------- */
function detectarDrop(buf, minT){
  var d = buf.getChannelData(0), sr = buf.sampleRate, paso = Math.floor(sr * .25), n = Math.floor(d.length / paso), e = [], i, j;
  for (i = 0; i < n; i++) { var s = 0; for (j = 0; j < paso; j += 8) { var x = d[i * paso + j]; s += x * x; } e.push(Math.sqrt(s / (paso / 8))); }
  var w = 8, mejor = { t: null, r: 0 };
  for (i = w; i < n - w; i++) {
    var a = 0, b = 0; for (j = 1; j <= w; j++) { a += e[i - j]; b += e[i + j - 1]; } a /= w; b /= w;
    var tt = i * .25; if (tt < minT) continue;
    var r = (b + 1e-4) / (a + 1e-4); if (r > mejor.r && b > 0.02) mejor = { t: tt, r: r };
  }
  return mejor.r > 1.5 ? mejor : null;
}

/* ---------- Sonido: SOLO música + efectos creados aquí (nunca el audio de los clips). Sin canción: solo efectos. ---------- */
function cargarInstrumentos(b){ return root.Musica ? root.Musica.cargarInstrumentos(b) : Promise.resolve(null); }
function componer(){ return root.Musica.componer.apply(null, arguments); }

/* ---------- Perfiles de evento (Guatemala) ---------- */
var PERFILES = {
  boda: { ritmo: { lo: 1.1, hi: 2.6, largo: 3.6, pL: .18, rafaga: 1 }, fuentes: [{ f: '"Great Vibes",cursive', w: '400' }, { f: '"Playfair Display",Georgia,serif', w: '700' }, { f: '"Cormorant Garamond",Georgia,serif', w: '700' }, { f: '"Parisienne",cursive', w: '400' }, { f: '"Cinzel",Georgia,serif', w: '600' }], cols: [['#fff4dc', '#e8b96a'], ['#ffffff', '#f1d6c4'], ['#f9d9e5', '#d98aa8'], ['#f6e7c1', '#c9a24b']], n: 'Boda', bpm: 85, fuente: '"Cormorant Garamond",Georgia,serif', peso: '700', filtro: 'saturate(1.2) contrast(1.1) brightness(1.0) sepia(.12)', tinte: 'rgba(255,190,110,.34)',
    pool: ['fuga', 'fundido', 'flash', 'zoom', 'barrido'], sfx: ['riser', 'swish', 'hit', 'sparkle'], leaks: .16, nombres2: true, musica: { escala: 'mayor', a1: 'piano', a2: 'piano', a3: 'piano', cuerdas: 1, bajo: 'sub', perc: 'suave', hit: 'bombo' } },
  quince: { ritmo: { lo: .6, hi: 1.5, largo: 2.4, pL: .12, rafaga: 2 }, fuentes: [{ f: '"Bebas Neue",Impact,sans-serif', w: '400' }, { f: '"Pacifico",cursive', w: '400' }, { f: '"Abril Fatface",serif', w: '400' }, { f: '"Righteous",Arial,sans-serif', w: '400' }, { f: '"Montserrat",Arial,sans-serif', w: '900' }], cols: [['#ff6ec7', '#9b5cff'], ['#7df9ff', '#3b82f6'], ['#ffd34d', '#ff5d8f'], ['#ffffff', '#ff8ad8']], n: 'Quinceaños', bpm: 120, fuente: '"Arial Black",Impact,sans-serif', peso: '900', filtro: 'saturate(1.5) contrast(1.22) brightness(1.0)', tinte: 'rgba(255,120,190,.26)',
    pool: ['flash', 'crash', 'glitch', 'barrido', 'barridoV', 'golpe', 'zoom'], sfx: ['whip', 'sparkle', 'hit', 'swish'], leaks: .1, musica: { escala: 'pent', a1: 'arpa', a2: 'pluck', a3: 'campana', cuerdas: 0, bajo: 'synth', perc: 'baile', hit: 'crash' } },
  revelacion: { ritmo: { lo: .9, hi: 2.1, largo: 3, pL: .15, rafaga: 1 }, fuentes: [{ f: '"Fredoka",Arial,sans-serif', w: '600' }, { f: '"Pacifico",cursive', w: '400' }, { f: '"Quicksand",Arial,sans-serif', w: '700' }, { f: '"Lobster",cursive', w: '400' }], cols: [['#ffb6d9', '#8ecbff'], ['#ffffff', '#ffc6e0'], ['#bfe6ff', '#ff9ecb']], n: 'Revelación de género', bpm: 90, fuente: '"Arial Black",Impact,sans-serif', peso: '900', filtro: 'saturate(1.3) contrast(1.1) brightness(1.04)', tinte: 'rgba(255,190,220,.22)',
    pool: ['flash', 'zoom', 'barrido', 'fuga', 'golpe'], sfx: ['sparkle', 'swish', 'whip', 'hit'], leaks: .1, revelacion: true, musica: { escala: 'mayor', a1: 'cajita', a2: 'piano', a3: 'cajita', cuerdas: 1, bajo: 'sub', perc: 'suave', hit: 'bombo' } },
  baby: { ritmo: { lo: .9, hi: 2.3, largo: 3.2, pL: .16, rafaga: 0 }, fuentes: [{ f: '"Fredoka",Arial,sans-serif', w: '600' }, { f: '"Quicksand",Arial,sans-serif', w: '700' }, { f: '"Sacramento",cursive', w: '400' }, { f: '"Dancing Script",cursive', w: '700' }], cols: [['#ffd1dc', '#b5e3ff'], ['#fff3b0', '#ffc8dd'], ['#ffffff', '#c9e8d8']], n: 'Baby Shower', bpm: 95, fuente: '"Jost",Arial,sans-serif', peso: '700', filtro: 'saturate(1.05) contrast(.98) brightness(1.08)', tinte: 'rgba(255,215,230,.28)',
    pool: ['fundido', 'fuga', 'zoom', 'flash', 'barrido'], sfx: ['sparkle', 'swish', 'hit'], leaks: .1, musica: { escala: 'pent', a1: 'piano', a2: 'marimba', a3: 'piano', cuerdas: 0, bajo: 'sub', perc: 'suave', hit: 'suave' } },
  bautizo: { ritmo: { lo: 1.3, hi: 3, largo: 4, pL: .2, rafaga: 0 }, fuentes: [{ f: '"Cormorant Garamond",Georgia,serif', w: '600' }, { f: '"Playfair Display",Georgia,serif', w: '400' }, { f: '"Great Vibes",cursive', w: '400' }, { f: '"Cinzel",Georgia,serif', w: '500' }], cols: [['#ffffff', '#e9e4d6'], ['#fff8e1', '#d6e6f5'], ['#ffffff', '#f3e3c3']], n: 'Bautizo / Primera Comunión', bpm: 80, fuente: '"Cormorant Garamond",Georgia,serif', peso: '600', filtro: 'saturate(.98) contrast(1.02) brightness(1.1)', tinte: 'rgba(255,250,235,.3)',
    pool: ['fundido', 'flash', 'fuga', 'zoom'], sfx: ['sparkle', 'swish', 'hit'], leaks: .2, flashBlanco: true, musica: { escala: 'mayor', a1: 'piano', a2: 'piano', a3: 'piano', cuerdas: 0, pad: 1, bajo: 'sub', perc: 'ninguna', hit: 'suave' } },
  graduacion: { ritmo: { lo: .6, hi: 1.5, largo: 2.6, pL: .12, rafaga: 2 }, fuentes: [{ f: '"Anton",Impact,sans-serif', w: '400' }, { f: '"Bebas Neue",Impact,sans-serif', w: '400' }, { f: '"Oswald",Arial,sans-serif', w: '700' }, { f: '"Archivo Black",Arial,sans-serif', w: '400' }, { f: '"Alfa Slab One",serif', w: '400' }], cols: [['#ffd36b', '#ff8a00'], ['#ffffff', '#9ec5ff'], ['#f5f5f5', '#aab3c2'], ['#ffe27a', '#d4a017']], n: 'Graduación', bpm: 110, fuente: '"Arial Black",Impact,sans-serif', peso: '900', filtro: 'saturate(1.25) contrast(1.3) brightness(.95)', tinte: 'rgba(255,170,80,.22)',
    pool: ['barrido', 'barridoV', 'golpe', 'crash', 'glitch', 'flash', 'zoom'], sfx: ['whip', 'hit', 'riser', 'swish'], leaks: .06, musica: { escala: 'menor', a1: 'pad', a2: 'pluck', a3: 'piano', cuerdas: 1, bajo: 'synth', perc: 'epica', hit: 'taiko' } },
  otro: { ritmo: { lo: .8, hi: 2, largo: 3, pL: .1, rafaga: 1 }, fuentes: [{ f: '"Montserrat",Arial,sans-serif', w: '800' }, { f: '"Poppins",Arial,sans-serif', w: '700' }, { f: '"Bebas Neue",Impact,sans-serif', w: '400' }, { f: '"Space Grotesk",Arial,sans-serif', w: '700' }, { f: '"Archivo Black",Arial,sans-serif', w: '400' }, { f: '"Playfair Display",serif', w: '700' }], cols: [['#ffffff', '#cfd8e3'], ['#ffe27a', '#ffb703'], ['#ffffff', '#ff9bb0'], ['#e8f1ff', '#8fb8ff']], n: 'Otro (detrás de cámaras, promoción)', bpm: 100, fuente: '"Montserrat",Arial,sans-serif', peso: '800', filtro: 'saturate(1.12) contrast(1.12)', tinte: 'rgba(255,255,255,0)',
    pool: ['barrido', 'zoom', 'flash', 'golpe', 'glitch', 'crash'], sfx: ['whip', 'hit', 'swish'], leaks: .05, musica: { escala: 'mayor', a1: 'pad', a2: 'pluck', a3: 'piano', cuerdas: 0, bajo: 'synth', perc: 'suave', hit: 'taiko' } },
};

async function mezclar(info, o){
  var INSTS = (o.perfil && o.musicaAuto !== false && !(info && info.buf) && o.instrumentos !== false) ? await cargarInstrumentos(o.instBase) : null;
  var dur = o.dur, OA = root.OfflineAudioContext || root.webkitOfflineAudioContext, ctx = new OA(2, Math.ceil(dur * SR), SR);
  var out = ctx.createGain(); out.gain.value = 1; var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -10; comp.ratio.value = 4; comp.attack.value = .003; comp.release.value = .2;
  var sh = ctx.createWaveShaper(), cu = new Float32Array(4096), q; for (q = 0; q < 4096; q++) { var xx = q / 2047.5 - 1; cu[q] = Math.tanh(xx * 1.2) / Math.tanh(1.2) * .97; } sh.curve = cu; sh.oversample = '2x'; var mg = ctx.createGain(); mg.gain.value = .8; out.connect(comp); comp.connect(mg); mg.connect(sh); sh.connect(ctx.destination);
  var P = o.plan, mv = o.volMusica, ev = o.volEfectos, R = rng(99), i;
  // ruido blanco y ruido rosa
  var nz = ctx.createBuffer(1, Math.ceil(SR * 3), SR), nd = nz.getChannelData(0); for (i = 0; i < nd.length; i++) nd[i] = R() * 2 - 1;
  var pk = ctx.createBuffer(1, Math.ceil(SR * 3), SR), pd = pk.getChannelData(0), b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (i = 0; i < pd.length; i++) { var wn = R() * 2 - 1; b0 = .99886 * b0 + wn * .0555179; b1 = .99332 * b1 + wn * .0750759; b2 = .969 * b2 + wn * .153852; b3 = .8665 * b3 + wn * .3104856; b4 = .55 * b4 + wn * .5329522; b5 = -.7616 * b5 - wn * .016898; pd[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + wn * .5362) * .11; b6 = wn * .115926; }
  /* música con su propia curva de energía */
  if (info && info.buf) {
    var ini = clamp(o.ini, 0, Math.max(0, info.dur - 1)), src = ctx.createBufferSource(); src.buffer = info.buf; var gm = ctx.createGain(); src.connect(gm); gm.connect(out);
    var fo = Math.min(1.6, dur / 3), nv = .72, pts = [[0, .0001], [.3, mv * nv]];
    var td = P.tAct2, r1 = Math.min(1.5, td - .5);
    pts.push([td - r1, mv * nv], [td - .16, mv * .84], [td - .12, mv * .12], [td - .04, mv * .12], [td + .02, mv]);
    pts.push([P.tAct3 - .2, mv], [P.tAct3 + .8, mv * .78]);
    if (o.cierre) pts.push([P.tCierre + .3, mv * .6]);
    pts.push([Math.max(.5, dur - fo), mv * .6], [dur, .0001]);
    pts.sort(function(a, b){ return a[0] - b[0]; });
    gm.gain.setValueAtTime(.0001, 0); for (i = 1; i < pts.length; i++) gm.gain.linearRampToValueAtTime(Math.max(.0001, pts[i][1]), Math.max(pts[i - 1][0] + .001, pts[i][0]));
    src.start(0, ini, Math.min(dur, info.dur - ini));
  }
  else if (o.perfil && o.musicaAuto !== false) {
    var gmA = ctx.createGain(); gmA.gain.setValueAtTime(.0001, 0); gmA.gain.linearRampToValueAtTime(1, .35); gmA.gain.setValueAtTime(1, Math.max(.5, dur - 1.8)); gmA.gain.linearRampToValueAtTime(.0001, dur); gmA.connect(out);
    var RM = rng((o.semilla || 1) * 7 + 3), pk2 = ctx.createBuffer(1, SR * 2, SR), dd2 = pk2.getChannelData(0); for (i = 0; i < dd2.length; i++) dd2[i] = RM() * 2 - 1;
    componer(ctx, gmA, P, o.perfil, dur, mv, RM, pk2, INSTS);
  }
  if (!o.efectos) return ctx.startRendering();
  function ruido(t0, d, tipo, f0, f1, qq, g0, gpico, gfin, rosa){
    if (t0 < 0) { d += t0; t0 = 0; } if (d <= .005) return;
    var s = ctx.createBufferSource(); s.buffer = rosa ? pk : nz; var f = ctx.createBiquadFilter(); f.type = tipo; f.Q.value = qq;
    f.frequency.setValueAtTime(f0, t0); f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + d);
    var g = ctx.createGain(); g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(.0002, gpico * ev), t0 + d * g0); g.gain.exponentialRampToValueAtTime(.0001, t0 + d + (gfin || .1));
    s.connect(f); f.connect(g); g.connect(out); s.start(t0, R() * 1.2, d + (gfin || .1) + .05);
  }
  function tono(t0, d, tipo, f0, f1, gpico, ataque){
    if (t0 < 0) return; var os = ctx.createOscillator(); os.type = tipo; os.frequency.setValueAtTime(f0, t0); os.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + d);
    var g = ctx.createGain(), at = ataque || .012; g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(.0002, gpico * ev), t0 + at); g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
    os.connect(g); g.connect(out); os.start(t0); os.stop(t0 + d + .05);
  }
  // Bass hit: seno que cae de 150 Hz a 40 Hz exactamente en el corte
  function golpeGrave(t0, fz){ tono(t0, .34 + .1 * fz, 'sine', 150, 40, .8 * fz, .006); ruido(t0, .05, 'lowpass', 900, 300, .7, .2, .35 * fz, .12); }
  // Riser: barrido ascendente de 100 Hz a 2000 Hz con ruido filtrado
  function riser(t1, len, fz){
    var tr0 = t1 - len; if (tr0 < 0) { len += tr0; tr0 = 0; } if (len < .4) return;
    ruido(tr0, len - .06, 'bandpass', 100, 2000, 2.2, .96, .6 * fz, .05);
    var os = ctx.createOscillator(); os.type = 'sawtooth'; os.frequency.setValueAtTime(100, tr0); os.frequency.exponentialRampToValueAtTime(2000, t1 - .06);
    var g = ctx.createGain(); g.gain.setValueAtTime(.0001, tr0); g.gain.exponentialRampToValueAtTime(.14 * fz * ev, t1 - .08); g.gain.exponentialRampToValueAtTime(.0001, t1 - .02);
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600; os.connect(lp); lp.connect(g); g.connect(out); os.start(tr0); os.stop(t1);
  }
  // Whoosh: ruido rosa/blanco con filtro paso-banda de barrido rápido
  function whoosh(t1, d, fz){
    ruido(t1 - d, d * 1.05, 'bandpass', 350, 6500, 1.3, .8, .75 * fz, .1, true); ruido(t1 - d * .9, d, 'bandpass', 600, 4200, 1.1, .8, .35 * fz, .08, false);
  }
  function fuegos(t0){
    tono(t0 - .5, .5, 'sine', 700, 2400, .12, .3); tono(t0, 1.0, 'sine', 70, 28, .9); ruido(t0, .25, 'lowpass', 4000, 300, .6, .05, .6, .5);
    for (var k = 0; k < 30; k++) { var tt = t0 + .12 + Math.pow(R(), 1.6) * 1.0; ruido(tt, .01 + R() * .02, 'highpass', 2500 + R() * 3500, 9000, 1.5, .4, .25 * (1 - (tt - t0) / 1.4), .01); }
  }
  // SFX variados (se alternan al azar en cada transición)
  function whipWhoosh(t, d, fz){ whoosh(t, d, fz); golpeGrave(t, .35 * fz); }
  function swishAir(t, d, fz){ ruido(Math.max(0, t - d * 1.1), d * 1.3, 'bandpass', 1800, 9000, .9, .7, .5 * fz, .15, true); }
  function cinematicHit(t, fz){ tono(t, 1.1, 'sine', 120, 34, .95 * fz, .005); ruido(t, .5, 'lowpass', 5000, 200, .6, .03, .7 * fz, .6); ruido(t, .1, 'highpass', 6000, 10000, .6, .1, .3 * fz, .3); }
  function magicSparkle(t, fz){ for (var q2 = 0; q2 < 9; q2++) { var f0 = [1568, 1976, 2349, 2637, 3136, 3951][Math.floor(R() * 6)]; tono(t + q2 * .045 + R() * .02, .5 + R() * .4, 'sine', f0, f0 * .998, .06 * fz, .004); } ruido(t, .5, 'highpass', 6000, 12000, .7, .2, .12 * fz, .4, true); }
  function heartbeat(t0, t1, b0, b1){ var tt = t0, per = 60 / b0; while (tt < t1) { var pr = (tt - t0) / Math.max(.1, t1 - t0), bb = b0 + (b1 - b0) * pr; per = 60 / bb; var gz = .6 + .5 * pr; tono(tt, .2, 'sine', 90, 45, gz, .004); tono(tt + per * .22, .17, 'sine', 80, 40, gz * .7, .004); tt += per; } }
  function riserTension(t1, len, fz){ riser(t1, len, fz); ruido(Math.max(0, t1 - len), len, 'highpass', 1500, 9000, .5, .95, .1 * fz, .1, true); }
  function confeti(t){ cinematicHit(t, .9); magicSparkle(t + .02, 1.2); for (var q3 = 0; q3 < 40; q3++) ruido(t + .05 + Math.pow(R(), 1.5) * 1.2, .012 + R() * .02, 'highpass', 2500 + R() * 4000, 9000, 1.5, .4, .2, .01); }
  var ultSfx = '', pfx = (o.perfil && o.perfil.sfx) || ['whip', 'swish', 'hit', 'sparkle'];
  function variar(t, d, fx){
    var op = pfx.filter(function(x){ return x !== ultSfx; }); var nm = op[Math.floor(R() * op.length)]; ultSfx = nm; d = Math.max(.2, d);
    if (nm === 'whip') whipWhoosh(t, d * .95, 1); else if (nm === 'swish') { swishAir(t, d, 1); golpeGrave(t, .3); }
    else if (nm === 'hit') { cinematicHit(t, .8); whoosh(t, d * .4, .4); } else if (nm === 'sparkle') { magicSparkle(t, 1); whoosh(t, d * .6, .4); }
    else riserTension(t + .02, Math.min(1.2, d * 3), .6), cinematicHit(t + .02, .6);
    return nm;
  }
  /* Riser 1.5 s antes de la ráfaga + golpe grande en el primer corte */
  var ta2 = P.tAct2; riser(ta2 - .02, 1.5, 1);
  if (o.perfil && o.perfil.revelacion) { heartbeat(Math.max(.3, ta2 - 3.6), ta2 - .08, 70, 190); riserTension(ta2 - .02, Math.min(3, ta2 - .3), .9); confeti(ta2); }
  tono(ta2, 1.3, 'sine', 150, 38, 1.15, .006); tono(ta2, .5, 'triangle', 160, 50, .45);
  ruido(ta2, .35, 'lowpass', 5000, 250, .6, .04, .9, .9); ruido(ta2 + .02, 1.5, 'lowpass', 1400, 200, .5, .02, .28, 1.2); ruido(ta2, .12, 'highpass', 6000, 9000, .6, .1, .35, .5);
  /* Riser suave y acordes antes del cierre lento */
  var tc3 = P.tAct3; riser(tc3 - .02, 1.5, .45); tono(tc3, 1.2, 'sine', 150, 40, .5, .02);
  [659, 988, 1568].forEach(function(f, j){ tono(tc3 + .1 + j * .22, 1.6, 'sine', f, f * .998, .07, .06); });
  /* Un sonido en cada corte: golpe grave en los principales, golpecito en los demás; whoosh en las transiciones con movimiento */
  P.trs.forEach(function(tr){
    var t = tr.t, d = tr.d, fx = TRANS[tr.tipo].sfx;
    if (fx === 'corte') { if (tr.mayor) golpeGrave(t, .8); else { ruido(t - .004, .02, 'highpass', 3500, 9000, 1, .4, .22, .02); tono(t, .12, 'sine', 150, 50, .22, .004); } return; }
    if (fx === 'zoom' || fx === 'barrido' || fx === 'golpe') { variar(t, d, fx); }
    else if (fx === 'flash') { ruido(t - d * 1.1, d * 1.1, 'highpass', 2500, 12000, .8, .9, .6, .45, true); tono(t, .7, 'sine', 1760, 1740, .09); tono(t, .55, 'sine', 2637, 2620, .06); golpeGrave(t, .9); }
    else if (fx === 'glitch') { for (var k = 0; k < 7; k++) { var tt = t - d / 2 + R() * d; tono(tt, .015 + R() * .03, 'square', 250 + R() * 3500, 150 + R() * 2500, .12); ruido(tt, .02 + R() * .03, 'highpass', 1500 + R() * 4000, 6000, 2, .5, .22, .01); } golpeGrave(t, .5); }
    else if (fx === 'franja') { ruido(t - d / 2, .012, 'highpass', 2500, 5000, 1, .5, .6, .02); tono(t - d / 2, .09, 'sine', 240, 150, .4); whoosh(t, d * .5, .5); ruido(t + d / 2 - .02, .012, 'highpass', 2500, 5000, 1, .5, .6, .02); tono(t + d / 2 - .02, .09, 'sine', 200, 120, .4); golpeGrave(t, .6); }
    else if (fx === 'crash') { tono(t, .8, 'sine', 150, 32, 1.0, .006); ruido(t - .1, .12, 'bandpass', 1500, 9000, 1.1, .8, .8, .06); ruido(t, .5, 'lowpass', 6000, 300, .5, .03, .75, .3); ruido(t - .02, .08, 'highpass', 5000, 10000, 1, .3, .5, .2); }
    else if (fx === 'fuga') { whoosh(t, d * 1.0, .5); ruido(t - d * .5, d, 'highpass', 3500, 9000, .8, .8, .22, .4); tono(t, .9, 'sine', 1319, 1310, .05, .08); golpeGrave(t, .4); }
    else if (fx === 'suave') { ruido(t - d * .5, d * 1.2, 'bandpass', 300, 1800, .8, .8, .16, .4, true); [523, 659, 784].forEach(function(f){ tono(t - .1, 1.6, 'sine', f, f * .999, .04, .35); }); }
  });
  /* cámara lenta (frenazo) y fuegos artificiales cuando hay luces en la escena */
  P.segs.forEach(function(s){
    if (s.ramp) { var tm = s.start + s.dur * .52; tono(tm - .04, Math.min(.5, s.dur * .8), 'sine', 1400, 150, .2, .02); ruido(tm - .08, .1, 'bandpass', 4000, 600, 1.2, .8, .22, .08); }
    if (s.fuegos != null) fuegos(s.start + s.fuegos);
  });
  if (o.cierre) { ruido(P.tCierre + .1, 1.2, 'highpass', 3500, 11000, .8, .4, .22, .8); tono(P.tCierre + .1, 1.4, 'sine', 1319, 1310, .06); }
  return ctx.startRendering();
}

root.Trailer = { cargarInstrumentos: cargarInstrumentos, PERFILES: PERFILES, crearEscena: crearEscena, planear: planear, mezclar: mezclar, detectarDrop: detectarDrop, TRANS: TRANS, abrirClip: null };
})(typeof window !== 'undefined' ? window : this);
