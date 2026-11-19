/* Tráiler de evento - Alexander Ge Erre
   Plantilla "tráiler de película": presentación pausada con nombres y niebla, subida, golpe (drop),
   cortes rápidos al ritmo con cámara lenta (speed ramp), zoom crash, tirones de cámara, fugas de luz, glitch,
   y un cierre lento y romántico con tus datos. Los efectos y sonidos se combinan al azar en cada versión.
   El audio original de los clips NUNCA se usa: solo música + efectos creados aquí.
   Todo se procesa en tu computadora. */
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
var POOLS = {
  intro:  ['zoom', 'fuga'],
  build:  ['zoom', 'barrido', 'barridoV', 'golpe', 'glitch', 'fuga'],
  drop:   ['zoom', 'flash', 'glitch', 'franja', 'barrido', 'barridoV', 'golpe', 'crash', 'fuga'],
  rapido: ['zoom', 'flash', 'glitch', 'barrido', 'barridoV', 'golpe', 'crash'],
  calma:  ['fundido', 'fuga']
};

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
    var g = cx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(' + c.join(',') + ',' + clamp(.62 * a, 0, 1).toFixed(3) + ')'); g.addColorStop(1, 'rgba(' + c.join(',') + ',0)'); cx.fillStyle = g; cx.fillRect(0, 0, W, H);
  }
  cx.restore();
}
function trFlash(cx, W, H, A, B, q){
  var a = Math.sin(q * PI), src = q < .5 ? A : B;
  cx.save(); cx.filter = 'brightness(' + (1 + 1.5 * a).toFixed(2) + ') saturate(' + (1 + .5 * a).toFixed(2) + ')'; src(cx); cx.restore();
  fugaLuz(cx, W, H, a * 1.3, q, 7); cx.fillStyle = 'rgba(255,255,255,' + (Math.pow(a, 4) * .55).toFixed(3) + ')'; cx.fillRect(0, 0, W, H);
}
function trFuga(cx, W, H, A, B, q, sem){
  var a = Math.sin(q * PI); A(cx); cx.save(); cx.globalAlpha = ease(q); B(cx); cx.restore(); fugaLuz(cx, W, H, a, q, sem);
  cx.fillStyle = 'rgba(255,225,190,' + (a * .22).toFixed(3) + ')'; cx.fillRect(0, 0, W, H);
}
function trFundido(cx, W, H, A, B, q){ A(cx); cx.save(); cx.globalAlpha = ease(q); B(cx); cx.restore(); }
function trGlitch(cx, W, H, A, B, q, sem){
  var S = q < .5 ? A : B, a = Math.sin(q * PI), t = lienzo(W, H), tc = t.getContext('2d'); S(tc);
  var R = rng(sem * 7 + Math.floor(q * 12)), n = 18, sh = H / n, i; cx.fillStyle = '#000'; cx.fillRect(0, 0, W, H);
  for (i = 0; i < n; i++) { var dx = (R() - .5) * W * .5 * a * (R() > .4 ? 1 : .15); cx.drawImage(t, 0, i * sh, W, sh, dx, i * sh, W, sh); }
  cx.save(); cx.globalCompositeOperation = 'lighter';
  [['rgb(255,0,0)', -1], ['rgb(0,255,255)', 1]].forEach(function(c){ var o = lienzo(W, H), oc = o.getContext('2d'); oc.drawImage(t, 0, 0); oc.globalCompositeOperation = 'multiply'; oc.fillStyle = c[0]; oc.fillRect(0, 0, W, H); cx.globalAlpha = .55 * a; cx.drawImage(o, c[1] * W * .03 * a, 0); });
  cx.restore(); cx.fillStyle = 'rgba(0,0,0,.16)'; for (i = 0; i < H; i += 4) cx.fillRect(0, i, W, 1.5 * a);
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

/* ---------- Niebla y título ---------- */
function niebla(cx, W, H, t, fuerza){
  var i; cx.save();
  for (i = 0; i < 9; i++) {
    var x = W * (i / 8 + .06 * Math.sin(t * .7 + i * 2.1)), y = H * (.8 + .08 * Math.sin(t * .5 + i * 1.7)), r = W * (.38 + .1 * Math.sin(t * .4 + i));
    var g = cx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(255,255,255,' + (.7 * fuerza).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,255,255,0)'); cx.fillStyle = g; cx.fillRect(0, 0, W, H);
  }
  var g2 = cx.createLinearGradient(0, H * .58, 0, H); g2.addColorStop(0, 'rgba(255,255,255,0)'); g2.addColorStop(1, 'rgba(255,255,255,' + (.62 * fuerza).toFixed(3) + ')'); cx.fillStyle = g2; cx.fillRect(0, H * .58, W, H * .42);
  cx.restore();
}
function titulo(cx, W, H, txt, etq, col, p){
  if (!txt) return;
  var fs = Math.min(W * .5, H * .26); cx.save();
  cx.font = '900 ' + fs + 'px "Arial Black",Impact,sans-serif'; var mw = cx.measureText(txt).width; if (mw > W * .88) fs *= W * .88 / mw;
  cx.globalAlpha = clamp(p * 4, 0, 1) * cx.globalAlpha; cx.font = '900 ' + fs + 'px "Arial Black",Impact,sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
  var y = H * .5 + (1 - easeOut(p * 2)) * H * .03, g = cx.createLinearGradient(0, y - fs / 2, 0, y + fs / 2); g.addColorStop(0, col[0]); g.addColorStop(1, col[1]);
  cx.shadowColor = 'rgba(0,0,0,.28)'; cx.shadowBlur = W * .02; cx.fillStyle = g; cx.fillText(txt, W / 2, y); cx.shadowBlur = 0;
  if (etq) { cx.font = '600 ' + Math.round(fs * .13) + 'px Jost,Arial,sans-serif'; if ('letterSpacing' in cx) cx.letterSpacing = Math.round(fs * .05) + 'px'; cx.fillStyle = '#fff'; cx.shadowColor = 'rgba(0,0,0,.55)'; cx.shadowBlur = 8; cx.fillText(etq.toUpperCase(), W / 2, y - fs * .66); }
  cx.restore();
}
// forma aproximada del sujeto (cabeza y cuerpo) a partir de las caras, para que el nombre quede "detrás"
function mascaraSujeto(W, H, caras){
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
  var c = lienzo(W, H), x = c.getContext('2d'), g = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.max(W, H) * .75);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.34)'); x.fillStyle = g; x.fillRect(0, 0, W, H); return c;
}

/* ---------- Plan de tiempos ---------- */
function planear(o){
  var beat = 60 / o.bpm, N = o.clips.length, R = rng(o.semilla || 1), segs = [], t = 0, i;
  var nIntro = Math.min(N, o.nombre2 ? 2 : 1), nCalma = (N - nIntro) >= 5 ? ((N - nIntro) >= 9 ? 2 : 1) : 0, resto = N - nIntro - nCalma;
  var nBuild = resto >= 3 ? Math.max(1, Math.round(resto * .25)) : 0, nRapido = (resto - nBuild) >= 6 ? Math.round((resto - nBuild) * .4) : 0, nDrop = resto - nBuild - nRapido;
  for (i = 0; i < N; i++) {
    var sec = i < nIntro ? 'intro' : i < nIntro + nBuild ? 'build' : i < nIntro + nBuild + nDrop ? 'drop' : i < N - nCalma ? 'rapido' : 'calma';
    var b = sec === 'intro' ? 4 : sec === 'rapido' ? 1 : sec === 'calma' ? 6 : 2, c = o.clips[i], v = sec === 'calma' ? .55 : 1;
    var mx = Math.floor((c.dur - 0.05) / (beat * v)); if (mx < b) b = Math.max(1, mx);
    var dur = b * beat, ramp = false, S = dur * v;
    if (sec === 'drop' && R() < .38 && c.dur >= dur * G1 + .7) { ramp = true; S = dur * G1; }
    var avail = c.dur - S - 1.0, off = avail > 0 ? avail * .35 + .45 : 0; off = Math.min(off, Math.max(0, c.dur - S - .2));
    segs.push({ i: i, sec: sec, start: t, beats: b, dur: dur, off: off, vel: v, ramp: ramp,
      pulse: (sec === 'drop' || sec === 'rapido') && R() < .6, crash: false, leak: sec === 'drop' && R() < .22, fuegos: null });
    t += dur;
  }
  var idxDrop = nIntro + nBuild, firstRap = nIntro + nBuild + nDrop, idxCalma = N - nCalma;
  var tDrop = idxDrop < N ? segs[idxDrop].start : null;
  var trs = [], prev = '', recientes = [], tipo;
  for (i = 0; i < N - 1; i++) {
    var s2 = segs[i + 1], c2 = o.clips[i + 1];
    if (c2.ef && c2.ef !== 'auto' && TRANS[c2.ef]) tipo = c2.ef;
    else if (i + 1 === idxDrop && s2.sec !== 'calma') tipo = 'flash';
    else if (s2.sec === 'rapido' && segs[i].sec !== 'rapido') tipo = 'glitch';
    else if (s2.sec === 'calma') tipo = segs[i].sec === 'calma' ? 'fundido' : 'fuga';
    else {
      var pool = POOLS[s2.sec].filter(function(x){ return x !== prev && !(x === 'franja' && recientes.slice(-4).indexOf('franja') >= 0) && !(x === 'glitch' && recientes.slice(-2).indexOf('glitch') >= 0) && !(x === 'crash' && recientes.slice(-3).indexOf('crash') >= 0); });
      if (!pool.length) pool = ['zoom'];
      tipo = pool[Math.floor(R() * pool.length)];
    }
    prev = tipo; recientes.push(tipo);
    var d = Math.min(TRANS[tipo].d, segs[i].dur * .8, s2.dur * .8);
    if (tipo === 'crash' && (s2.sec === 'drop' || s2.sec === 'rapido')) s2.crash = true;
    trs.push({ t: s2.start, tipo: tipo, d: d, a: i, b: i + 1, sem: Math.floor(R() * 1000) });
  }
  var C = o.cierre ? Math.max(4, beat * 8) : 0, ultimaCalma = segs[N - 1].sec === 'calma';
  if (o.cierre) trs.push({ t: t, tipo: ultimaCalma ? 'fundido' : 'flash', d: ultimaCalma ? .9 : Math.min(.45, segs[N - 1].dur * .8), a: N - 1, b: -1, sem: 1 });
  var tRapido = firstRap < N && segs[firstRap].sec === 'rapido' ? segs[firstRap].start : null, tCalma = idxCalma < N ? segs[idxCalma].start : null;
  return { beat: beat, segs: segs, trs: trs, tDrop: tDrop, tRapido: tRapido, tCalma: tCalma, tCierre: t, C: C, total: t + C, nIntro: nIntro };
}

/* ---------- Detección simple de luces (para fuegos artificiales) ---------- */
async function buscarLuces(clips, P){
  var cv = lienzo(40, 72), cx = cv.getContext('2d', { willReadFrequently: true }), k, j, m;
  for (k = 0; k < P.segs.length; k++) {
    var s = P.segs[k], c = clips[k]; if (s.sec === 'calma') continue;
    var mejor = { f: 0, u: .3 };
    for (j = 0; j < 4; j++) {
      var u = .15 + j * .25, ts = clamp(s.off + u * s.dur * s.vel, 0, c.dur - .04);
      await irA(c.v, ts); cx.drawImage(c.v, 0, 0, 40, 72); var d = cx.getImageData(0, 0, 40, 72).data, suma = 0, br = 0, n = d.length / 4;
      for (m = 0; m < d.length; m += 4) { var L = .3 * d[m] + .59 * d[m + 1] + .11 * d[m + 2]; suma += L; if (L > 215) br++; }
      var media = suma / n, fr = br / n;
      if (media < 80 && fr > .006 && fr < .35 && fr > mejor.f) mejor = { f: fr, u: u };
    }
    s.fuegos = mejor.f > 0 ? mejor.u * s.dur : null;
  }
}

/* ---------- Escena ---------- */
async function crearEscena(o){
  var W = o.W, H = o.H, clips = o.clips, N = clips.length, P = planear(o), marco = {}, marcoB = {}, marcoF = {}, i;
  var COLS = [['#ff5fd6', '#a64bff'], ['#35c8ff', '#1769e0']], masc = {}, vig = vigneta(W, H), color = o.color !== false;
  try { await buscarLuces(clips, P); } catch (e) {}
  if (o.detectarCaras && o.textoAtras !== false) {
    for (i = 0; i < P.segs.length; i++) {
      var sg0 = P.segs[i]; if (sg0.sec !== 'intro' || !(i === 0 ? o.nombre1 : o.nombre2)) continue;
      try {
        var c0 = clips[i]; await irA(c0.v, sg0.off + sg0.dur * .4); var fc = lienzo(W, H); cubrir(fc.getContext('2d'), c0.v, c0.w, c0.h, W, H);
        var caras = await o.detectarCaras(fc, i); if (caras && caras.length) masc[i] = mascaraSujeto(W, H, caras);
      } catch (e) {}
    }
  }
  function segEn(t){ for (var k = P.segs.length - 1; k >= 0; k--) if (t >= P.segs[k].start - 1e-6) return k; return 0; }
  function srcT(k, t){
    var s = P.segs[k], u = t - s.start, c = clips[k];
    var r = s.ramp ? (u < 0 ? s.off + u * vel(0) : u > s.dur ? s.off + G1 * s.dur + (u - s.dur) * vel(1) : s.off + G(u / s.dur) * s.dur) : s.off + u * s.vel;
    return clamp(r, 0, Math.max(0, c.dur - 0.04));
  }
  function velAct(k, t){ var s = P.segs[k]; return s.ramp ? vel(clamp((t - s.start) / s.dur, 0, 1)) : s.vel; }
  function pintarSeg(cx, k, t){
    var s = P.segs[k], fr = marco[k], u = t - s.start, p = clamp(u / s.dur, 0, 1); cx.save(); cx.fillStyle = '#000'; cx.fillRect(0, 0, W, H);
    var z = (s.sec === 'intro' ? 1.03 + .09 * p : s.sec === 'calma' ? 1.0 + .06 * p : 1.02 + .07 * p), dx = 0, dy = 0;
    if (s.crash && u >= 0) { z *= 1 + .32 * Math.exp(-u / .09); if (u < .14) { dx = Math.sin(u * 140) * W * .012 * (1 - u / .14); dy = Math.cos(u * 120) * H * .008 * (1 - u / .14); } }
    if (s.pulse && u >= 0) z *= 1 + .022 * Math.exp(-(u % P.beat) / .11);
    var dibujar = function(c2){ c2.save(); c2.translate(W / 2 + dx, H / 2 + dy); c2.scale(z, z); c2.translate(-W / 2, -H / 2); if (fr) { if (color) c2.filter = 'saturate(1.14) contrast(1.06) brightness(1.01)'; c2.drawImage(fr, 0, 0); c2.filter = 'none'; if (marcoF[k] > .02 && marcoB[k]) { c2.globalAlpha = marcoF[k]; c2.drawImage(marcoB[k], 0, 0); c2.globalAlpha = 1; } } c2.restore(); };
    dibujar(cx);
    if (s.sec === 'intro') {
      var nm = k === 0 ? o.nombre1 : o.nombre2, et = k === 0 ? o.etq1 : o.etq2;
      if (nm) {
        var a = clamp((p - .02) / .12, 0, 1) * clamp((1 - p) / .15, 0, 1); cx.globalAlpha = a; titulo(cx, W, H, nm, et, COLS[k % 2], clamp(p / .35, 0, 1)); cx.globalAlpha = 1;
        if (masc[k] && a > 0) {
          var tm = lienzo(W, H), tx = tm.getContext('2d'); dibujar(tx); tx.globalCompositeOperation = 'destination-in';
          tx.save(); tx.translate(W / 2 + dx, H / 2 + dy); tx.scale(z, z); tx.translate(-W / 2, -H / 2); tx.drawImage(masc[k], 0, 0); tx.restore();
          cx.globalAlpha = a; cx.drawImage(tm, 0, 0); cx.globalAlpha = 1;
        }
      }
      niebla(cx, W, H, t, clamp(1.1 - p * .5, 0, 1) * (nm ? 1 : .5));
    }
    if (s.crash && u >= 0 && u < .16) { cx.fillStyle = 'rgba(255,255,255,' + (.35 * Math.exp(-u / .05)).toFixed(3) + ')'; cx.fillRect(0, 0, W, H); }
    if (s.leak && u >= 0 && u < .7) fugaLuz(cx, W, H, Math.sin(clamp(u / .7, 0, 1) * PI) * .9, u / .7, k + 11);
    if (s.sec === 'calma') { var g = cx.createRadialGradient(W * .8, H * .18, 0, W * .8, H * .18, Math.max(W, H) * .8); var ga = .16 + .05 * Math.sin(t * 1.3); g.addColorStop(0, 'rgba(255,196,140,' + ga.toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,170,120,0)'); cx.save(); cx.globalCompositeOperation = 'lighter'; cx.fillStyle = g; cx.fillRect(0, 0, W, H); cx.restore(); }
    if (color) cx.drawImage(vig, 0, 0);
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
  var esc = {
    W: W, H: H, duracion: P.total, N: N, plan: P, estilo: 'trailer',
    preparar: async function(t){
      var trc0 = o.cierre ? P.trs[P.trs.length - 1] : null;
      if (trc0 && t > P.tCierre + trc0.d / 2) return;
      var nec = {}, k = segEn(t), tr = null, j;
      for (j = 0; j < P.trs.length; j++) if (Math.abs(t - P.trs[j].t) <= P.trs[j].d / 2) { tr = P.trs[j]; break; }
      nec[k] = 1; if (tr) { if (tr.a >= 0) nec[tr.a] = 1; if (tr.b >= 0) nec[tr.b] = 1; }
      var ks = Object.keys(nec);
      for (j = 0; j < ks.length; j++) {
        var id = +ks[j], c = clips[id], ts = srcT(id, t), lento = velAct(id, t) < .62;
        var cvA = marco[id] || (marco[id] = lienzo(W, H));
        if (lento) {
          var ta = Math.floor(ts * FPSV) / FPSV, f = (ts - ta) * FPSV;
          await irA(c.v, ta); cubrir(cvA.getContext('2d'), c.v, c.w, c.h, W, H);
          if (f > .04 && ta + 1 / FPSV < c.dur - .03) { var cvB = marcoB[id] || (marcoB[id] = lienzo(W, H)); await irA(c.v, ta + 1 / FPSV); cubrir(cvB.getContext('2d'), c.v, c.w, c.h, W, H); marcoF[id] = f; } else marcoF[id] = 0;
        } else { await irA(c.v, ts); cubrir(cvA.getContext('2d'), c.v, c.w, c.h, W, H); marcoF[id] = 0; }
      }
      Object.keys(marco).forEach(function(id){ if (!(id in nec)) { delete marco[id]; delete marcoB[id]; delete marcoF[id]; } });
    },
    dibujar: function(cx, t){
      t = clamp(t, 0, P.total - 1e-6);
      var trc = o.cierre ? P.trs[P.trs.length - 1] : null, k2, tr = null, N1 = N - 1;
      if (trc && t >= P.tCierre - trc.d / 2) {
        if (t < P.tCierre + trc.d / 2) FN_TR[trc.tipo](cx, W, H, function(c2){ pintarSeg(c2, N1, t); }, function(c2){ pintarCierre(c2, 0); }, (t - (P.tCierre - trc.d / 2)) / trc.d, 1);
        else pintarCierre(cx, t - P.tCierre);
      } else {
        for (k2 = 0; k2 < P.trs.length; k2++) if (P.trs[k2].b >= 0 && Math.abs(t - P.trs[k2].t) <= P.trs[k2].d / 2) { tr = P.trs[k2]; break; }
        if (tr) FN_TR[tr.tipo](cx, W, H, function(c2){ pintarSeg(c2, tr.a, t); }, function(c2){ pintarSeg(c2, tr.b, t); }, (t - (tr.t - tr.d / 2)) / tr.d, tr.sem);
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

/* ---------- Sonido: SOLO música + efectos creados aquí (nunca el audio de los clips) ---------- */
async function mezclar(info, o){
  var dur = o.dur, OA = root.OfflineAudioContext || root.webkitOfflineAudioContext, ctx = new OA(2, Math.ceil(dur * SR), SR);
  var out = ctx.createGain(); out.gain.value = 1; var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -10; comp.ratio.value = 4; comp.attack.value = .003; comp.release.value = .2;
  var sh = ctx.createWaveShaper(), cu = new Float32Array(4096), q; for (q = 0; q < 4096; q++) { var xx = q / 2047.5 - 1; cu[q] = Math.tanh(xx * 1.2) / Math.tanh(1.2) * .97; } sh.curve = cu; sh.oversample = '2x'; var mg = ctx.createGain(); mg.gain.value = .8; out.connect(comp); comp.connect(mg); mg.connect(sh); sh.connect(ctx.destination);
  var P = o.plan, mv = o.volMusica, ev = o.volEfectos, R = rng(99), i;
  var nz = ctx.createBuffer(1, Math.ceil(SR * 3), SR), nd = nz.getChannelData(0); for (i = 0; i < nd.length; i++) nd[i] = R() * 2 - 1;
  /* música con su propia "curva de energía" */
  var ini = clamp(o.ini, 0, Math.max(0, info.dur - 1)), src = ctx.createBufferSource(); src.buffer = info.buf; var gm = ctx.createGain(); src.connect(gm); gm.connect(out);
  var fo = Math.min(1.6, dur / 3), nv = .72, pts = [[0, .0001], [.3, mv * nv]];
  function rl(t, def){ var r = Math.min(def, t - .6); return r >= 1 ? r : 0; }
  if (P.tDrop != null) { var td = P.tDrop, r1 = rl(td, 6); if (r1) pts.push([td - r1, mv * nv], [td - .16, mv * .84]); pts.push([td - .12, mv * .12], [td - .04, mv * .12], [td + .02, mv]); }
  if (P.tRapido != null) pts.push([P.tRapido - .14, mv], [P.tRapido - .08, mv * .45], [P.tRapido - .02, mv * .45], [P.tRapido + .03, mv]);
  if (P.tCalma != null) pts.push([P.tCalma - .2, mv], [P.tCalma + .8, mv * .78]);
  if (o.cierre) pts.push([P.tCierre + .3, mv * .6]);
  pts.push([Math.max(.5, dur - fo), mv * .6], [dur, .0001]);
  pts.sort(function(a, b){ return a[0] - b[0]; });
  gm.gain.setValueAtTime(.0001, 0); for (i = 1; i < pts.length; i++) gm.gain.linearRampToValueAtTime(Math.max(.0001, pts[i][1]), Math.max(pts[i - 1][0] + .001, pts[i][0]));
  src.start(0, ini, Math.min(dur, info.dur - ini));
  if (!o.efectos) return ctx.startRendering();
  function ruido(t0, d, tipo, f0, f1, qq, g0, gpico, gfin){
    if (t0 < 0) { d += t0; t0 = 0; } if (d <= .005) return;
    var s = ctx.createBufferSource(); s.buffer = nz; var f = ctx.createBiquadFilter(); f.type = tipo; f.Q.value = qq;
    f.frequency.setValueAtTime(f0, t0); f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + d);
    var g = ctx.createGain(); g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(.0002, gpico * ev), t0 + d * g0); g.gain.exponentialRampToValueAtTime(.0001, t0 + d + (gfin || .1));
    s.connect(f); f.connect(g); g.connect(out); s.start(t0, R() * 1.2, d + (gfin || .1) + .05);
  }
  function tono(t0, d, tipo, f0, f1, gpico, ataque){
    if (t0 < 0) return; var os = ctx.createOscillator(); os.type = tipo; os.frequency.setValueAtTime(f0, t0); os.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + d);
    var g = ctx.createGain(), at = ataque || .012; g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(.0002, gpico * ev), t0 + at); g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
    os.connect(g); g.connect(out); os.start(t0); os.stop(t0 + d + .05);
  }
  function golpeGrave(t0, fz){ tono(t0, .34 + .1 * fz, 'sine', 105, 40, .75 * fz); ruido(t0, .05, 'lowpass', 900, 300, .7, .2, .35 * fz, .12); }
  function riser(t1, len, fz, f0, f1){
    var tr0 = t1 - len; if (tr0 < 0) { len += tr0; tr0 = 0; } if (len < .5) return;
    ruido(tr0, len - .14, 'bandpass', f0, f1, 2.2, .96, .55 * fz, .05);
    var os = ctx.createOscillator(); os.type = 'sawtooth'; os.frequency.setValueAtTime(f0 * .45, tr0); os.frequency.exponentialRampToValueAtTime(f1 * .16, t1 - .14);
    var g = ctx.createGain(); g.gain.setValueAtTime(.0001, tr0); g.gain.exponentialRampToValueAtTime(.13 * fz * ev, t1 - .16); g.gain.exponentialRampToValueAtTime(.0001, t1 - .1);
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400; os.connect(lp); lp.connect(g); g.connect(out); os.start(tr0); os.stop(t1);
  }
  function fuegos(t0){
    tono(t0 - .5, .5, 'sine', 700, 2400, .12, .3); tono(t0, 1.0, 'sine', 70, 28, .9); ruido(t0, .25, 'lowpass', 4000, 300, .6, .05, .6, .5);
    for (var k = 0; k < 30; k++) { var tt = t0 + .12 + Math.pow(R(), 1.6) * 1.0; ruido(tt, .01 + R() * .02, 'highpass', 2500 + R() * 3500, 9000, 1.5, .4, .25 * (1 - (tt - t0) / 1.4), .01); }
  }
  /* risers (subidas) antes de cada cambio de ritmo y golpes graves en los cortes principales */
  if (P.tDrop != null) {
    var td2 = P.tDrop, r2 = rl(td2, 6); if (r2) riser(td2 - .02, r2, 1, 350, 9500);
    tono(td2, 1.3, 'sine', 82, 30, 1.15); tono(td2, .5, 'triangle', 160, 50, .45);
    ruido(td2, .35, 'lowpass', 5000, 250, .6, .04, .9, .9); ruido(td2 + .02, 1.5, 'lowpass', 1400, 200, .5, .02, .28, 1.2); ruido(td2, .12, 'highpass', 6000, 9000, .6, .1, .35, .5);
  }
  if (P.tRapido != null) { var r3 = rl(P.tRapido, 2.4); if (r3) riser(P.tRapido - .02, r3, .75, 300, 8000); tono(P.tRapido, .9, 'sine', 90, 32, .95); ruido(P.tRapido, .3, 'lowpass', 4500, 250, .6, .04, .7, .6); ruido(P.tRapido, .1, 'highpass', 6000, 9000, .6, .1, .3, .4); }
  if (P.tCalma != null) {
    var r4 = rl(P.tCalma, 2.2); if (r4) riser(P.tCalma - .02, r4, .4, 250, 3500);
    [659, 988, 1568].forEach(function(f, j){ tono(P.tCalma + .1 + j * .22, 1.6, 'sine', f, f * .998, .07, .06); });
    tono(P.tCalma, 1.2, 'sine', 70, 38, .45, .05);
  }
  /* sonido por transición */
  P.trs.forEach(function(tr){
    var t = tr.t, d = tr.d, fx = TRANS[tr.tipo].sfx;
    if (fx === 'zoom') { ruido(t - d * .8, d * .95, 'bandpass', 280, 6500, 1.0, .85, .75, .12); golpeGrave(t, .6); }
    else if (fx === 'flash') { ruido(t - d * 1.1, d * 1.1, 'highpass', 2500, 12000, .8, .9, .6, .45); tono(t, .7, 'sine', 1760, 1740, .09); tono(t, .55, 'sine', 2637, 2620, .06); golpeGrave(t, .8); }
    else if (fx === 'glitch') { for (var k = 0; k < 7; k++) { var tt = t - d / 2 + R() * d; tono(tt, .015 + R() * .03, 'square', 250 + R() * 3500, 150 + R() * 2500, .12); ruido(tt, .02 + R() * .03, 'highpass', 1500 + R() * 4000, 6000, 2, .5, .22, .01); } golpeGrave(t, .35); }
    else if (fx === 'franja') { ruido(t - d / 2, .012, 'highpass', 2500, 5000, 1, .5, .6, .02); tono(t - d / 2, .09, 'sine', 240, 150, .4); ruido(t - d / 2, d * .5, 'bandpass', 500, 3000, 1.2, .8, .25, .05); ruido(t + d / 2 - .02, .012, 'highpass', 2500, 5000, 1, .5, .6, .02); tono(t + d / 2 - .02, .09, 'sine', 200, 120, .4); golpeGrave(t, .45); }
    else if (fx === 'barrido') { ruido(t - d * .85, d * 1.0, 'bandpass', 500, 4200, 1.4, .8, .8, .08); golpeGrave(t, .45); }
    else if (fx === 'golpe') { golpeGrave(t, 1); ruido(t - .07, .09, 'bandpass', 800, 3500, 1, .7, .5, .06); }
    else if (fx === 'crash') { tono(t, .8, 'sine', 95, 30, 1.0); ruido(t - .1, .12, 'bandpass', 1500, 9000, 1.1, .8, .8, .06); ruido(t, .5, 'lowpass', 6000, 300, .5, .03, .75, .3); ruido(t - .02, .08, 'highpass', 5000, 10000, 1, .3, .5, .2); }
    else if (fx === 'fuga') { ruido(t - d * .8, d * 1.1, 'bandpass', 400, 2600, .9, .7, .35, .35); ruido(t - d * .5, d, 'highpass', 3500, 9000, .8, .8, .22, .4); tono(t, .9, 'sine', 1319, 1310, .05, .08); golpeGrave(t, .3); }
    else if (fx === 'suave') { ruido(t - d * .5, d * 1.2, 'bandpass', 300, 1800, .8, .8, .16, .4); [523, 659, 784].forEach(function(f){ tono(t - .1, 1.6, 'sine', f, f * .999, .04, .35); }); }
  });
  /* cámara lenta (speed ramp): sonido de "frenazo" justo cuando se frena el clip + fuegos artificiales si hay luces */
  P.segs.forEach(function(s){
    if (s.ramp) { var tm = s.start + s.dur * .52; tono(tm - .04, .5, 'sine', 1400, 150, .22, .02); golpeGrave(tm, .55); ruido(tm - .2, .22, 'bandpass', 4000, 600, 1.2, .8, .3, .2); }
    if (s.fuegos != null) fuegos(s.start + s.fuegos);
  });
  if (o.cierre) { ruido(P.tCierre + .1, 1.2, 'highpass', 3500, 11000, .8, .4, .22, .8); tono(P.tCierre + .1, 1.4, 'sine', 1319, 1310, .06); }
  return ctx.startRendering();
}

root.Trailer = { crearEscena: crearEscena, planear: planear, mezclar: mezclar, detectarDrop: detectarDrop, TRANS: TRANS, abrirClip: null };
})(typeof window !== 'undefined' ? window : this);
